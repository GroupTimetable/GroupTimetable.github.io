import { Renderer } from './renderer'

function arr<T>(len: number) {
    const a = new Array<T>(len);
    a.length = 0;
    return a
}

export type Params = {
    str: string
    renderer: Renderer
    width: number
    height: number
}

class TextBreak {
    // tmp storage
    objs = [
        {
            width: 0,
            height: 0,
            fontSize: 0,
            texts: arr<string>(4),
            lineWidths: arr<number>(4),
        },
        {
            width: 0,
            height: 0,
            fontSize: 0,
            texts: arr<string>(4),
            lineWidths: arr<number>(4),
        },
    ]

    tried: number[] // number of lines
    str: string
    renderer: Renderer
    width: number
    height: number
    bestI: number
    lastI: number

    constructor(params: Params) {
        this.str = params.str
        this.renderer = params.renderer
        this.width = params.width
        this.height = params.height
        this.tried = []

        // using height instead of size to ignore line height spacing
        const textWidth = this.renderer.textWidth(this.str);
        const scaledSize = Math.min(this.width / textWidth, this.height);

        const tmp = this.objs[0];
        tmp.texts.length = 0;
        tmp.texts[0] = this.str;
        tmp.lineWidths.length = 1;
        tmp.lineWidths[0] = textWidth * scaledSize;
        tmp.width = textWidth * scaledSize;
        tmp.height = scaledSize * this.renderer.fontHeightFac;
        tmp.fontSize = scaledSize;

        this.bestI = 0
        this.lastI = 0
        this.tried.push(1);
    }

    remeasure(targetLines: number) {
        if(this.tried.includes(targetLines)) return true;

        const tmpI = 1 - this.bestI;
        const tmp = this.objs[tmpI];
        /*break text*/ {
            tmp.texts.length = 0;
            const maxOffset = Math.max(1, Math.log(this.str.length+1)) * Math.sqrt(this.str.length);
            const lineLen =  Math.floor(this.str.length / targetLines);

            let prev = 0, startFrom = 0;
            for(let i = 0; i < targetLines-1; i++) {
                const base = lineLen * (i+1);

                startFrom = Math.max(startFrom, base - maxOffset);

                let foundPos = NaN;
                for(let cur = base; cur >= startFrom; cur--) {
                    if(this.str[cur] === ' ') {
                        foundPos = cur;
                        break;
                    }
                }

                for(startFrom = Math.max(startFrom, base+1);
                    startFrom <= Math.min(this.str.length-1, base + maxOffset)
                        && !(startFrom - base >= base - foundPos);
                    startFrom++
                ) {
                    if(this.str[startFrom] === ' ') {
                        foundPos = startFrom++;
                        break;
                    }
                }

                if(foundPos) {
                    tmp.texts.push(this.str.substring(prev, foundPos));
                    prev = foundPos+1;
                }
            }

            tmp.texts.push(this.str.substring(prev));
        }

        const actualLines = tmp.texts.length;
        if(actualLines != targetLines) {
            if(this.tried.includes(actualLines)) return true;
            this.tried.push(actualLines);
        }
        this.tried.push(targetLines);

        /*calc sizes*/ {
            tmp.lineWidths.length = actualLines;

            let maxWidth = 0;
            for(let i = 0; i < actualLines; i++) {
                tmp.lineWidths[i] = this.renderer.textWidth(tmp.texts[i]);
                maxWidth = Math.max(maxWidth, tmp.lineWidths[i]);
            }
            const scaledSize = Math.min(
                this.width / maxWidth,
                this.height / ((actualLines-1) * this.renderer.fontHeightFac + 1)
            );

            for(let i = 0; i < tmp.lineWidths.length; i++) {
                tmp.lineWidths[i] *= scaledSize;
            }
            tmp.width = maxWidth * scaledSize;
            tmp.height = (actualLines-1) * this.renderer.fontHeightFac * scaledSize + scaledSize;
            tmp.fontSize = scaledSize;

            this.lastI = tmpI;
            if(tmp.fontSize > this.objs[this.bestI].fontSize) this.bestI = tmpI;
        }

        return false;
    }

    get best() {
        return this.objs[this.bestI]
    }
    get last() {
        return this.objs[this.lastI]
    }
}

export function optimizeLineBreaks(params: Params) {
    const textBreak = new TextBreak(params)

    for(let j = 0; j < 3; j++) {
        /*maximize text width*/ {
            const el = textBreak.last;
            const scaledHeight = el.height * params.width / el.width;
            const lines = Math.max(1, Math.round(el.texts.length * Math.sqrt(params.height / scaledHeight)));
            if(textBreak.remeasure(lines)) break;
        }

        /*maximize text height*/ {
            const el = textBreak.last;
            const scaledWidth = el.width * params.height / el.height;
            const lines = Math.max(1, Math.round(el.texts.length * Math.sqrt(scaledWidth / params.width)));
            if(textBreak.remeasure(lines)) break;
        }
    }

    return textBreak.best
}
