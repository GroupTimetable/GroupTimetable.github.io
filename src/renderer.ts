export type Renderer = {
    emptyInit: () => Promise<void>
    init: (width: number, height: number) => Promise<void>

    setupRect: (borderWidth: number, fill?: 'yellow' | 'white') => void
    drawRect: (x: number, y: number, w: number, h: number) => void
    finalizeRects: () => void

    setupText: (rotated: boolean) => void
    setFontSize: (num: number) => void
    drawText: (text: string, x: number, y: number) => void
    finalizeTexts: () => void

    fontHeightFac: number
    textWidth: (text: string) => number
}

// Magic numbers. Ouput looks best with these values.
// Both should've beed derived from PDFLib embedFont():
//   fontSizeFac is font.sizeAtHeight(1);
//   fontDescenderFac is (1 / 1000) * font.embedder.scale * font.embedder.font.descent;
// But the result looks completely wrong.
const fontSizeFac = 0.9;
const fontDescenderFac = -0.27; // of font size
// Also, pdf-lib js has a bug at
// https://github.com/Hopding/pdf-lib/blob/93dd36e85aa659a3bca09867d2d8fac172501fbe/src/core/embedders/CustomFontEmbedder.ts#L95
// descender should be multiplied by this.scale

const fontPromise = fetch(new URL('./font/CharisSIL.ttf', import.meta.url))
    .then(res => res.arrayBuffer(), () => { throw 'не удалось загрузить шрифт'; });
const canvasFontP = fontPromise.then(async(font) => {
    const cFont = new FontFace("RenderFont", font)
    await cFont.load()
    document.fonts.add(cFont)
    return cFont
})
const textContextP = (async() => {
    // we need an entire canvas just to measure text...
    const data = createOffscreenCanvas(1, 1)
    const canvas = data[0]
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true })!
    await canvasFontP
    context.font = '1px RenderFont'
    return context
})()

export class CanvasRenderer implements Renderer {
    width: number
    height: number

    fontSizeFac: number
    fontHeightFac: number

    canvas: [HTMLCanvasElement | OffscreenCanvas, (a?: ImageEncodeOptions) => Promise<Blob>]
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
    textContext:  CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

    rotated: boolean
    borderWidth: number
    fillRect: boolean

    constructor() {
        this.width = this.height = this.fontSizeFac = this.fontHeightFac = this.canvas = this.context = this.textContext = this.rotated = this.borderWidth = this.fillRect = undefined as any
    }

    async emptyInit() {
        this.width = 1
        this.height = 1
        this.canvas = createOffscreenCanvas(1, 1)
    }

    async init(width: number, height: number) {
        this.width = width
        this.height = height

        this.canvas = createOffscreenCanvas(width, height)
        this.context = this.canvas[0].getContext("2d", { alpha: false, desynchronized: true })!

        this.context.strokeStyle = '#000';
        this.context.textBaseline = 'bottom';
        this.fontSizeFac = fontSizeFac;
        this.fontHeightFac = 1 / fontSizeFac;

        // as if this is not a common operation
        this.context.fillStyle = 'white';
        this.context.fillRect(0, 0, width, height);

        this.textContext = await textContextP;
        await canvasFontP;
    }

    setupRect(borderWidth: number, fill?: 'yellow' | 'white') {
        this.borderWidth = borderWidth
        this.fillRect = fill !== undefined

        if(fill === 'yellow') this.context.fillStyle = '#ffff00'
        else if(fill === 'white') this.context.fillStyle = '#fff'
        this.context.lineWidth = borderWidth
    }

    drawRect(x: number, y: number, width: number, height: number) {
        this.context.rect(x, y, width, height)
    }
    finalizeRects() {
        if(this.fillRect) this.context.fill();
        if(this.borderWidth > 0) this.context.stroke();
        this.context.beginPath()
    }
    setupText(rotated: boolean) {
        if(rotated) this.context.setTransform(0, -1, 1, 0, 0, 0);
        this.rotated = rotated;
        this.context.fillStyle = '#000';
    }
    setFontSize(size: number) {
        this.context.font = size + 'px RenderFont';
    }
    drawText(text: string, x: number, y: number) {
        if(this.rotated) {
            this.context.fillText(text, -y, x);
        } else {
            this.context.fillText(text, x, y);
        }
    }
    finalizeTexts() {
        if(this.rotated) this.context.resetTransform();
    }
    textWidth(text: string) { // at font size 1
        return this.textContext.measureText(text).width
    }
}

function createOffscreenCanvas(width: number, height: number): [
    HTMLCanvasElement | OffscreenCanvas,
    save: (options?: ImageEncodeOptions) => Promise<Blob>
] {
    //this is certainly my job to check all of this
    if (window.OffscreenCanvas !== undefined) {
        const c = new window.OffscreenCanvas(width, height);
        return [c, c.convertToBlob.bind(c)];
    }
    else {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        return [c, (function(this: HTMLCanvasElement, options?: ImageEncodeOptions) {
            return new Promise<Blob>((res, rej) => {
                this.toBlob((blob) => {
                    if(blob === null) rej('cannot create blob from canvas');
                    else res(blob);
                }, options?.type, options?.quality);
            })
        }).bind(c)];
    }
}

