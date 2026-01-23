import R from 'react'
import * as RD from 'react-dom/client'
import * as Z from 'zustand'
import * as pdfjs from 'pdfjs-dist'
import * as Process from './process.ts'
import * as U from './util.ts'
import * as Renderer from './renderer.ts'
import * as Renderschedule from './renderSchedule.ts'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('./worker.js', import.meta.url).toString()

const nbsp = '\u00A0';

type FileInfo = {
    controller: AbortController
    fileName: string | undefined
    pageParser: U.PageParser | undefined
}

type State = {
    fileInfo: FileInfo | undefined

    groupName: string
    status: string
    progress: number
}

const store = Z.create<State>(() => {
    return {
        fileInfo: undefined,
        pageParser: undefined,
        groupName: '',
        status: '',
        progress: 0,
    }
})

export default function Root() {
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

    const {
        fileInfo,
        groupName,
        status,
        progress,
    } = store(it => it)

    const canStart = fileInfo?.pageParser !== undefined
        && fileInfo?.fileName !== undefined
        && groupName !== ''

    return <div className='flex-1 flex flex-col bg-slate-100'>
        <div className='flex-1 flex items-end justify-center'>
            <label className='text-center text-3xl cursor-pointer'>
                Нажмите здесь чтобы загрузить файл расписания
                <input
                    className='hidden'
                    type='file'
                    onChange={async(ev) => {
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


                    // TODO remove
                        localStorage.setItem(
                            'file',
                            JSON.stringify([...new Uint8Array(content)])
                        )



                        if(content.byteLength === 0) {
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
                        store.setState({
                            fileInfo,
                            progress: 0,
                            status: 'Введите имя группы (ИМгр-123, имгр123 и т.п.)',
                        })
                    }}
                />
            </label>
        </div>

        <div className='flex flex-col items-center m-4'>
            <div className='flex flex-col'>
                <div className='mb-1'>{fileInfo?.fileName ?? nbsp}</div>
                <div className='flex w-120 max-w-full rounded-full relative border border-stone-500 shadow-md'>
                    <input
                        className='min-w-0 flex-1 h-12 p-4 rounded-full pl-5'
                        placeholder='Название группы'
                        type='text'
                        value={groupName}
                        onChange={ev => {
                            store.setState({ groupName: ev.target.value })
                        }}
                    />
                    <button
                        type='button'
                        disabled={!canStart}
                        className={'flex ' + (canStart ? 'cursor-pointer' : '')}
                        onClick={() => {
                            if(!canStart) return

                            Process.process(
                                fileInfo.pageParser!,
                                groupName,
                                new AbortController()
                            ).then(console.log)
                        }}
                    >
                        <Arrow enabled={canStart}/>
                    </button>
                    <div className='absolute pointer-events-none inset-0 rounded-full overflow-hidden'>
                        <div
                            className='absolute left-0 bottom-0 h-1 bg-primary transition-[width] duration-300 rounded-full'
                            style={{
                                width: (progress * 100) + '%',
                            }}
                        />
                    </div>
                </div>
                <div className='mt-1'>{status || nbsp}</div>
            </div>
        </div>

        <div className='flex-1'>
        </div>
    </div>
}

function Arrow({ enabled }: { enabled: boolean }) {
    return <svg
        className={'h-12 p-3.5 pr-4 ' + (enabled ? 'fill-primary' : 'fill-gray-500')}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-1 0 24 24"
    >
        <polygon points="7.293 4.707 14.586 12 7.293 19.293 8.707 20.707 17.414 12 8.707 3.293 7.293 4.707"></polygon>
    </svg>
}
