import R from 'react'
import * as RD from 'react-dom/client'
import * as Z from 'zustand'
import * as pdfjs from 'pdfjs-dist'
import * as Process from './process.ts'
import * as U from './util.ts'
import * as Renderer from './renderer.ts'
import * as Renderschedule from './renderSchedule.ts'
// @ts-ignore
import PdfjsWorkerUrl from './worker.js?worker&url'
import send from './database.ts'

pdfjs.GlobalWorkerOptions.workerSrc = PdfjsWorkerUrl

const nbsp = '\u00A0';

type FileInfo = {
    controller: AbortController
    fileName: string | undefined
    pageParser: U.PageParser | undefined
}

type State = {
    fileInfo: FileInfo | undefined
    images: { url: string, name: string }[]

    groupName: string
    status: string
    progress: number
}

const store = Z.create<State>(() => {
    return {
        fileInfo: undefined,
        pageParser: undefined,
        images: [],
        groupName: localStorage.getItem('index__last_group_name') ?? '',
        status: 'ВНИМАНИЕ: Университет изменил формат расписания, поэтому сайт пришлось переписать. '
            + 'Если вы заметили ошибку в получившемся расписании или хотите скачать расписание как календарь и т.п., пожалуйста напишите мне: https://vk.ru/club221983441',
        progress: 0,
    }
})

export default function Root() {

    /*
    const content = new Uint8Array(JSON.parse(localStorage.getItem('file')!)).buffer
    const [blob, setBlob] = R.useState<Blob | undefined>()
    ;(async() => {
        if(blob !== undefined) return
        const groupSchedule = await Process.process(
            await U.makePageParser(content),
            'ИПсп-125',
            new AbortController
        )

        const renderer = new Renderer.CanvasRenderer()
        await Renderschedule.renderSchedule(renderer, groupSchedule, [[0, 1, 2], [3, 4]], {
            rowRatio: 1/5.2,
            borderFactor: 0.01,
            drawBorder: true,
            dowOnTop: false,
        })
        setBlob(await renderer.canvas[1]())
        console.log('done')
    })()

    return <div>
        {blob && <img src={URL.createObjectURL(blob)} width={600}/>}
    </div>
    */

    const downloadRef = R.useRef<HTMLAnchorElement | null>(null)
    const {
        fileInfo,
        groupName,
        images,
        status,
        progress,
    } = store(it => it)

    const canStart = fileInfo?.pageParser !== undefined
        && fileInfo?.fileName !== undefined
        && groupName !== ''

    return <div className='flex-1 flex flex-col bg-gray-100 overflow-y-auto'>
        <div className='flex-1 flex items-end justify-center'>
            <label className='text-center text-3xl cursor-pointer text-hint'>
                Нажмите здесь чтобы загрузить файл расписания
                <input
                    className='hidden'
                    type='file'
                    onChange={async(ev) => {
                        try {
                            store.getState().fileInfo?.controller.abort()
                            let fileInfo: FileInfo = {
                                controller: new AbortController(),
                                fileName: undefined,
                                pageParser: undefined,
                            }
                            store.setState({ fileInfo })

                            const files = [...ev.target.files ?? []]

                            const file = files.find(it => it.name.endsWith('.pdf')) ?? files.at(0)
                            if(file === undefined) {
                                if(fileInfo.controller.signal.aborted) return

                                send('regGeneralError')('No file 1')
                                store.setState({
                                    progress: 0,
                                    status: 'Не удалось получить файл. Попробуйте ещё раз',
                                })
                                return
                            }

                            fileInfo = { ...fileInfo, fileName: file.name }
                            store.setState({ fileInfo })

                            const content = await file.arrayBuffer()
                            if(fileInfo.controller.signal.aborted) return

                        /*
                        // TODO remove
                            localStorage.setItem(
                                'file',
                                JSON.stringify([...new Uint8Array(content)])
                            )
                            */

                            if(content.byteLength === 0) {
                                send('regGeneralError')('No file 2')
                                store.setState({
                                    progress: 0,
                                    status: 'Не удалось получить файл. Попробуйте ещё раз',
                                })
                                return
                            }

                            const pageParser = await U.makePageParser(content)
                            U.onAbort(fileInfo.controller, () => pageParser.release())
                            if(fileInfo.controller.signal.aborted) return

                            fileInfo = { ...fileInfo, pageParser }
                            send('regMessage')('File loaded')
                            store.setState({
                                fileInfo,
                                progress: 0,
                                status: 'Файл загружен',
                                //status: 'Введите имя группы (ИМгр-123, имгр123 и т.п.)',
                            })
                        }
                        catch(error) {
                            send('regGeneralError')('' + error)
                            store.setState({
                                fileInfo,
                                progress: 1,
                                status: 'Ошибка',
                            })

                        }
                    }}
                />
            </label>
        </div>

        <div className='flex flex-col items-center mx-4 mt-4'>
            <div className='flex flex-col max-w-full'>
                <div className='mb-1'>{fileInfo?.fileName ?? nbsp}</div>
                <form className='flex w-120 max-w-full rounded-full relative shadow-lg bg-white max-w-full'>
                    <input
                        className='min-w-0 flex-1 h-12 p-4 rounded-full pl-5'
                        placeholder='Название группы'
                        type='text'
                        value={groupName}
                        onChange={ev => {
                            store.setState({ groupName: ev.target.value })
                            localStorage.setItem('index__last_group_name', ev.target.value)
                        }}
                    />
                    <button
                        type='submit'
                        className={'w-12 h-12 p-1 flex'}
                        onClick={async(ev) => {
                            ev.preventDefault()

                            if(fileInfo === undefined) {
                                store.setState({ progress: 1, status: 'Ошибка: Файл не загружен' })
                                return
                            }
                            if(fileInfo?.pageParser === undefined) {
                                store.setState({ progress: 1, status: 'Ошибка: Файл не PDF' })
                                return
                            }
                            if(!groupName) {
                                store.setState({ progress: 1, status: 'Ошибка: нет имени группы' })
                                return
                            }

                            send('regMessage')('Gen started')
                            try {
                                const schedule = await Process.process(
                                    fileInfo.pageParser!,
                                    groupName,
                                    new AbortController()
                                )
                                fileInfo.pageParser!.release()
                                store.setState({ progress: 0.4 })

                                const renderer = new Renderer.CanvasRenderer()
                                await Renderschedule.renderSchedule(renderer, schedule, [[0, 1, 2], [3, 4]], {
                                    rowRatio: 1/5.2,
                                    borderFactor: 0.01,
                                    drawBorder: true,
                                    dowOnTop: false,
                                })

                                store.setState({ progress: 0.8 })

                                const blob = await renderer.canvas[1]()

                                send('regDocumentCreated')(fileInfo.fileName ?? '', groupName)
                                store.setState({
                                    status: 'Готово. Нажми на изображение чтобы открыть',
                                    progress: 1,
                                    images: [
                                        ...store.getState().images,
                                        {
                                            url: URL.createObjectURL(blob),
                                            name: groupName + '-' + fileInfo.fileName!.replace(/\.pdf$/, '') + '.png',
                                        },
                                    ],
                                })
                            }
                            catch(error) {
                                send('regGeneralError')('' + error)
                                store.setState({ status: '' + error, progress: 1 })
                            }
                        }}
                    >
                        <div className={'flex-1 p-2.5 flex rounded-full transition-color duration-200 ' + (canStart ? 'cursor-pointer' : '')}>
                            <Arrow enabled={canStart}/>
                        </div>
                    </button>
                    <div className='absolute pointer-events-none inset-0 rounded-full overflow-hidden'>
                        <div
                            className='absolute left-0 bottom-0 h-1 bg-primary transition-[width] duration-300 rounded-full'
                            style={{
                                width: (progress * 100) + '%',
                            }}
                        />
                    </div>
                </form>
            </div>
        </div>

        <div className='flex-1 flex flex-col p-4 pt-2'>
            <div className='mb-2 w-120 max-w-full self-center'>{status || nbsp}</div>

            <div className='self-center grow flex-0 flex flex-wrap gap-6'>
                {images.map(it => {
                    return <div className='flex flex-col'>
                        <div className='min-h-0 max-h-full truncate'>{it.name}</div>
                        <a
                            type='button'
                            target='_blank'
                            className='max-w-60 max-h-70 flex items-center justify-center cursor-pointer'
                            href={it.url}
                            onClick={() => {
                                send('regDocumentUsed')(it.name, groupName, 'img')
                            }}
                        >
                            <img
                                src={it.url}
                                className='max-w-full max-h-full bg-white shadow-md'
                            />
                        </a>
                    </div>
                })}
            </div>
            <div className='self-center flex flex-center'>
                <a className='py-2 px-4' href="https://vk.ru/club221983441" target="_blank">VK</a>
                <a className='py-2 px-4' href="https://github.com/GroupTimetable/GroupTimetable.github.io" target="_blank">GitHub</a>
            </div>
        </div>
        <a ref={downloadRef} className='hidden'/>
    </div>
}

function Arrow({ enabled }: { enabled: boolean }) {
    return <svg
        className={'w-full h-full transition-color duration-200 stroke-1 ' + (enabled ? 'fill-primary stroke-primary' : 'fill-gray-500 stroke-gray-500')}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-1 0 24 24"
    >
        <polygon points="7.293 4.707 14.586 12 7.293 19.293 8.707 20.707 17.414 12 8.707 3.293 7.293 4.707"></polygon>
    </svg>
}
