import * as pdfjs from 'pdfjs-dist'

export type PageParser = {
    error: string
    pages: number
    getPage: (index: number) => Promise<PageData>
    aquire: () => void
    release: () => void
}

export type TextItem = Extract<Awaited<ReturnType<pdfjs.PDFPageProxy['getTextContent']>>['items'][number], { str: string }>

export type PageData = {
    page: pdfjs.PDFPageProxy
    text: TextItem[]
}

export async function makePageParser(contentOrig: ArrayBuffer): Promise<PageParser> {
    const controller = new AbortController()

    try {
        const content = new ArrayBuffer(contentOrig.byteLength);
        new Uint8Array(content).set(new Uint8Array(contentOrig));
        const task = pdfjs.getDocument(content) // consumes it or something?

        let doc: pdfjs.PDFDocumentProxy
        try {
            doc = await task.promise
        }
        catch(error) {
            console.error(error)
            controller.abort()
            return {
                error: 'Файл не является PDF',
                pages: 0,
                getPage: () => { throw new Error() },
                aquire: () => {},
                release: () => {},
            }
        }
        controller.signal.onabort = () => doc.destroy()

        const pages: (Promise<PageData> | undefined)[] = []
        for(let i = 0; i < doc.numPages; i++) {
            pages.push(undefined)
        }
        const getPage = async(index: number) => {
            if(pages[index] === undefined) {
                pages[index] = (async() => {
                    const page = await doc.getPage(1 + index)
                    const text = await page.getTextContent()
                    return {
                        page,
                        text: text.items.filter(it => 'str' in it),
                    }
                })()
            }
            return await pages[index]
        }

        let started = false

        ;(async() => {
            for(let i = 0; i < Math.min(doc.numPages, 20); i++) {
                if(started) break
                if(controller.signal.aborted) break
                await getPage(i)
            }
        })()

        let refcount = 1
        return {
            error: '',
            pages: doc.numPages,
            getPage: (i) => {
                started = true
                return getPage(i)
            },
            aquire: () => refcount++,
            release: () => {
                if(refcount > 0) {
                    refcount--
                    if(refcount === 0) {
                        controller.abort()
                    }
                }
            }
        }
    }
    catch(error) {
        controller.abort()
        console.error(error)
        return {
            error: 'Неизвестная ошибка',
            pages: 0,
            getPage: () => { throw new Error() },
            aquire: () => {},
            release: () => {},
        }
    }
}

export function onAbort(it: AbortController | AbortSignal, cb: () => void) {
    if(it instanceof AbortController) {
        it = it.signal
    }
    if(it.aborted) {
        ;(async() => {
            await Promise.resolve()
            cb()
        })
    }
    it.onabort = () => { cb() }
}
