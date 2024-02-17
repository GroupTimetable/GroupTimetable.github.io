// expects fontPromise

async function getDocument() {
    const pdfDoc = await PDFLib.PDFDocument.create() /*
        we can't reuse the document and glyph cache because of
        library issue: https://github.com/Hopding/pdf-lib/issues/1492
    */
    pdfDoc.registerFontkit(window.fontkit)
    const font = await pdfDoc.embedFont(await fontPromise, {subset:true});
    return [pdfDoc, font]
}

function createOffscreenCanvas(width, height) {
    //this is certainly my job to check all of this
    if (window.OffscreenCanvas !== undefined) {
        const c = new window.OffscreenCanvas(width, height);
        return [c, c.convertToBlob.bind(c)];
    }
    else {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        return [c, (function(options) {
            return new Promise((res, rej) => {
                this.toBlob((blob) => {
                    if(blob === null) rej('cannot create blob from canvas');
                    else res(blob);
                }, options?.type, options?.quality);
            })
        }).bind(c)];
    }
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
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true })
    await canvasFontP
    context.font = '1px RenderFont'
    return context
})()

function createCanvasRenderer() { return {
    width: undefined,
    height: undefined,

    fontSizeFac: undefined,
    fontHeightFac: undefined,

    canvas: undefined,
    context: undefined,
    textContext: undefined,

    rotated: undefined,
    borderWidth: undefined,
    fillRect: undefined,

    async emptyInit() {
        this.width = 1
        this.height = 1
        this.canvas = createOffscreenCanvas(1, 1)

    },
    async init(width, height) {
        this.width = width
        this.height = height

        this.canvas = createOffscreenCanvas(width, height)
        this.context = this.canvas[0].getContext("2d", { alpha: false, desynchronized: true });

        this.context.strokeStyle = '#000';
        this.context.textBaseline = 'bottom';
        this.fontSizeFac = fontSizeFac;
        this.fontHeightFac = 1 / fontSizeFac;

        // as if this is not a common operation
        this.context.fillStyle = 'white';
        this.context.fillRect(0, 0, width, height);

        this.textContext = await textContextP;
        await canvasFontP;
    },

    setupRect(borderWidth, fillYellow, fillWhite) {
        this.borderWidth = borderWidth
        this.fillRect = fillYellow || fillWhite

        if(fillYellow) this.context.fillStyle = '#ffff00'
        else if(fillWhite) this.context.fillStyle = '#fff'
        this.context.lineWidth = borderWidth
    },
    drawRect(x, y, width, height) {
        this.context.rect(x, y, width, height)
    },
    finalizeRects() {
        if(this.fillRect) this.context.fill();
        if(this.borderWidth > 0) this.context.stroke();
        this.context.beginPath()
    },
    setupText(rotated) {
        if(rotated) this.context.setTransform(0, -1, 1, 0, 0, 0);
        this.rotated = rotated;
        this.context.fillStyle = '#000';
    },
    setFontSize(size) {
        this.context.font = size + 'px RenderFont';
    },
    drawText(text, x, y) {
        if(this.rotated) {
            this.context.fillText(text, -y, x);
        } else {
            this.context.fillText(text, x, y);
        }
    },
    finalizeTexts() {
        if(this.rotated) this.context.resetTransform();
    },
    textWidth(text) { // at font size 1
        return this.textContext.measureText(text).width
    },
} }

class PDFRenderer {
    constructor() {
        this.width = undefined;
        this.height = undefined;

        this.fontSizeFac = undefined;
        this.fontHeightFac = undefined;

        this.pdfDoc = undefined;
        this.font = undefined;
        this.page = undefined;

        this.tmpParams = {};
    }

    async emptyInit() {
        this.pdfDoc = await PDFLib.PDFDocument.create()
        this.page = pdfDoc.addPage([1, 1])
    }

    async init(w, h) {
        this.width = w;
        this.height = h;
        const res = await getDocument();
        this.pdfDoc = res[0];
        const font = this.font = res[1];
        this.page = this.pdfDoc.addPage([w, h]);

        this.fontSizeFac = fontSizeFac;
        this.fontHeightFac = 1 / fontSizeFac;
    }

    setupRect(borderWidth, fillYellow, fillWhite) {
        const p = this.tmpParams;

        if (borderWidth > 0) {
            p.borderColor = PDFLib.rgb(0, 0, 0);
            p.borderWidth = borderWidth;
        }

        if(fillYellow) p.color = PDFLib.rgb(1, 1, 0);
        else if(fillWhite) p.color = PDFLib.rgb(1, 1, 1);
    }
    drawRect(x, y, w, h) {
        const ph = this.height;
        const p = this.tmpParams;

        p.x = x;
        p.y = ph - y;
        p.width = w;
        p.height = -h;

        try { this.page.drawRectangle(p); }
        catch(e) { console.error(e); }
    }
    finalizeRects() {
        const p = this.tmpParams;
        p.borderColor = undefined;
        p.borderWidth = undefined;
        p.color = undefined;
        p.width = undefined;
        p.height = undefined;
    }
    setupText(rotated) {
        const p = this.tmpParams;
        if(rotated) p.rotate = PDFLib.degrees(90);
        else p.rotate = undefined;
        p.font = this.font;
        p.color = PDFLib.rgb(0, 0, 0);
    }
    setFontSize(size) {
        this.tmpParams.size = size;
    }
    drawText(text, x, y) {
        const ph = this.height;
        const p = this.tmpParams;

        p.x = x;
        p.y = ph - y;
        if(p.rotate != undefined) { p.x += fontDescenderFac * p.size; }
        else { p.y -= fontDescenderFac * p.size; }

        try { this.page.drawText(text, p); }
        catch(e) { console.error(e); }
    }
    finalizeTexts() {
        const p = this.tmpParams;
        p.font = undefined;
        p.color = undefined;
        p.size = undefined;
        p.rotate = undefined;
    }
    textWidth(text) {
        throw "Not implemented"; // can be done but it is not used anyway
    }
}

function createRecorderRenderer(innerRenderer) { return {
    commands: [],
    innerRenderer,

    width: undefined,
    height: undefined,

    fontSizeFac: undefined,
    fontHeightFac: undefined,

    async emptyInit() {
        this.commands.push({ command: -1 });
        await this.innerRenderer.emptyInit();
    },
    async init(w, h) {
        this.commands.push({ command: 0, w, h });
        await this.innerRenderer.init(w, h);
        this.width = w;
        this.height = h;
        this.fontSizeFac = this.innerRenderer.fontSizeFac;
        this.fontHeightFac = this.innerRenderer.fontHeightFac;
    },

    setupRect(borderWidth, fillYellow, fillWhite) {
        this.commands.push({ command: 1, borderWidth, fillYellow, fillWhite });
        this.innerRenderer.setupRect(borderWidth, fillYellow, fillWhite);
    },
    drawRect(x, y, w, h) {
        this.commands.push({ command: 2, x, y, w, h });
        this.innerRenderer.drawRect(x, y, w, h);
    },
    finalizeRects() {
        this.commands.push({ command: 3 });
        this.innerRenderer.finalizeRects();
    },
    setupText(rotated) {
        this.commands.push({ command: 4, rotated });
        this.innerRenderer.setupText(rotated);
    },
    setFontSize(size) {
        this.commands.push({ command: 5, size });
        this.innerRenderer.setFontSize(size);
    },
    drawText(text, x, y) {
        this.commands.push({ command: 6, text, x, y });
        this.innerRenderer.drawText(text, x, y);
    },
    finalizeTexts() {
        this.commands.push({ command: 7 });
        this.innerRenderer.finalizeTexts();
    },
    textWidth(text) {
        return this.innerRenderer.textWidth(text);
    },
} }

async function playbackRenderRecording(commands, renderer) {
    const count = commands.length;
    if(count <= 0) return;

    const f = commands[0];
    if(f.command == -1) {
        await renderer.emptyInit();
    }
    else if(f.command == 0) {
        await renderer.init(f.w, f.h);
    }
    else throw "Unreachable init: " + JSON.stringify(f);

    for(var i = 1; i < count; i++) {
        const c = commands[i];
        switch(c.command) {
               case 1: { renderer.setupRect(c.borderWidth, c.fillYellow, c.fillWhite); }
        break; case 2: { renderer.drawRect(c.x, c.y, c.w, c.h); }
        break; case 3: { renderer.finalizeRects(); }
        break; case 4: { renderer.setupText(c.rotated); }
        break; case 5: { renderer.setFontSize(c.size); }
        break; case 6: { renderer.drawText(c.text, c.x, c.y); }
        break; case 7: { renderer.finalizeTexts(); }
        break; default: throw "Unreachable: " + JSON.stringify(c);
        }
    }
}

function createScalingRenderer(targetWidth, innerRenderer) { return {
    innerRenderer,
    targetWidth,
    scalingFactor: undefined,

    width: undefined,
    height: undefined,

    fontSizeFac: undefined,
    fontHeightFac: undefined,

    async emptyInit() {
        await this.innerRenderer.emptyInit();
    },
    async init(w, h) {
        scalingFactor = targetWidth / w;
        // TODO: clamp
        await this.innerRenderer.init(targetWidth, Math.floor(h * scalingFactor));

        this.width = w;
        this.height = h;
        this.fontSizeFac = this.innerRenderer.fontSizeFac;
        this.fontHeightFac = this.innerRenderer.fontHeightFac;
    },

    setupRect(borderWidth, fillYellow, fillWhite) {
        this.innerRenderer.setupRect(borderWidth * scalingFactor, fillYellow, fillWhite);
    },
    drawRect(x, y, w, h) {
        this.innerRenderer.drawRect(
            x * scalingFactor, y * scalingFactor,
            w * scalingFactor, h * scalingFactor
        );
    },
    finalizeRects() {
        this.innerRenderer.finalizeRects();
    },
    setupText(rotated) {
        this.innerRenderer.setupText(rotated);
    },
    setFontSize(size) {
        this.innerRenderer.setFontSize(size * scalingFactor);
    },
    drawText(text, x, y) {
        this.innerRenderer.drawText(text, x * scalingFactor, y * scalingFactor);
    },
    finalizeTexts() {
        this.innerRenderer.finalizeTexts();
    },
    textWidth(text) {
        return this.innerRenderer.textWidth(text);
    },
} }
