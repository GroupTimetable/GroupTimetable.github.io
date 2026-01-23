import { Renderer } from './renderer'
import { GroupSchedule } from './process'
import { optimizeLineBreaks } from './textBreak'

export type EditParams = {
    rowRatio: number
    borderFactor: number
    drawBorder: boolean
    dowOnTop: boolean
}

//border factor is used inaccurately, but the difference should not be that big
export async function renderSchedule(
    renderer: Renderer,
    schedule: GroupSchedule,
    origPattern: number[][],
    editParams: EditParams
) {
    const { rowRatio, borderFactor, drawBorder, dowOnTop } = editParams

    const colWidth = 500
    const renderPattern = []

    const rowHeight = colWidth * rowRatio;
    const borderWidth = colWidth * borderFactor;
    const innerBorderWidth = colWidth * 2/500;

    const signatureHeight = 40, signaturePadding = 4;
    const signatureHeightFull = borderWidth*0.5 + signatureHeight + signaturePadding*2;

    let maxRows = 0;
    let firstRows = Infinity, lastRows = 0;
    for(let i = 0; i < origPattern.length; i++) {
        const newCol = []
        let curRows = 0;
        for(let j = 0; j < origPattern[i].length; j++) {
            const index = origPattern[i][j];
            if(index === -1) continue;
            const day = schedule[index];
            if(!day || !day.rows.length) continue;

            curRows += day.rows.length;
            newCol.push(index)
        }
        if(curRows > 0) {
            if(dowOnTop) curRows += newCol.length;

            lastRows = curRows;
            if(firstRows === Infinity) firstRows = curRows;
            if(curRows > maxRows) maxRows = curRows;
            renderPattern.push(newCol)
        }
    }

    const rowMaxHeight = maxRows * rowHeight;
    const heightIfSignFirst = Math.max(rowMaxHeight, firstRows * rowHeight + signatureHeightFull);
    const heightIfSignLast  = Math.max(rowMaxHeight, lastRows  * rowHeight + signatureHeightFull);

    const pageHeight = Math.min(heightIfSignFirst, heightIfSignLast);
    const pageWidth = colWidth * renderPattern.length;
    const signFirst  = heightIfSignFirst < heightIfSignLast;
    const groupSize = { w: colWidth, h: colWidth * rowRatio };

    const ch = (num: number) => !(num >= 1 && num < Infinity)
    if(!(maxRows > 0) || ch(pageWidth) || ch(pageHeight)) {
        await renderer.emptyInit();
        return;
    }

    await renderer.init(pageWidth, pageHeight)

    const dowArray: ({ text: string } & Rect)[] = []
    const timeArr: ({ text: string } & Rect)[] = []
    const yellowArr: Rect[] = []
    const lessonsArr: ({ text: string } & Rect)[] = []
    const innerBorderOffset = (drawBorder
        ? Math.max(0, borderWidth - innerBorderWidth)
        : borderWidth + innerBorderWidth); // for both sides
    const startW = groupSize.w - innerBorderOffset;
    const dowColWidth = startW * 0.1;
    const timeColWidth = dowColWidth;

    renderer.setupRect(innerBorderWidth)
    for(let i = 0; i < renderPattern.length; i++) {
        const startX = i * groupSize.w + innerBorderOffset*0.5;
        let startY = innerBorderOffset*0.5;

        for(let j = 0; j < renderPattern[i].length; j++) {
            const index = renderPattern[i][j];
            if(index == undefined || schedule[index] == undefined) continue;
            const day = schedule[index];
            const rowsCount = day.rows.length + (dowOnTop ? 1 : 0);

            let x = startX;
            let y = startY;
            let w = startW;
            const h = groupSize.h - innerBorderOffset / rowsCount;
            const dayH = rowsCount * groupSize.h;

            const dowText = day.day
            if(dowOnTop) {
                dowArray.push({ text: dowText, x, y, w, h })
                renderer.drawRect(x, y, w, h)
                y += h;
            }
            else {
                dowArray.push({ text: dowText, x, y, w: dowColWidth, h: dayH - innerBorderOffset })
                renderer.drawRect(x, y, dowColWidth, dayH)
                x += dowColWidth;
                w -= dowColWidth;
            }

            const lessonW = w - timeColWidth;
            for(let i = 0; i < day.rows.length; i++) {
                const lesson = day.rows[i]
                const ly = y + i*h;
                renderer.drawRect(x, ly, timeColWidth, h)
                timeArr.push({ text: lesson.timeSlot, x, y: ly, w: timeColWidth, h })
                drawLessons(lessonsArr, yellowArr, renderer, lesson.names, x + timeColWidth, ly, lessonW, h)
            }

            startY += dayH;
        }
    }
    renderer.finalizeRects()

    renderer.setupRect(innerBorderWidth, 'yellow');
    for(let i = 0; i < yellowArr.length; i++) {
        const it = yellowArr[i];
        renderer.drawRect(it.x, it.y, it.w, it.h);
    }
    renderer.finalizeRects();

    if (drawBorder) {
        renderer.setupRect(borderWidth)
        for(let i = 0; i < renderPattern.length; i++) {
            const x = i * groupSize.w;
            let curY = 0;

            for(let j = 0; j < renderPattern[i].length; j++) {
                const index = renderPattern[i][j];
                if(index == undefined || schedule[index] == undefined) continue;
                const day = schedule[index];
                const rowsCount = day.rows.length + (dowOnTop ? 1 : 0);
                const height = rowsCount * groupSize.h;
                renderer.drawRect(x, curY, groupSize.w, height)
                curY = curY + height;
            }
        }
        renderer.finalizeRects()
    }

    const signText = 'groupTimeTable.github.io';
    var signX, signY, signFontSize;
    /*calc signature size*/ {
        const maxWidth = colWidth*0.8;
        const maxHeight = signatureHeight;

        const width = renderer.textWidth(signText);
        const scaledSize = Math.min(maxWidth / width, maxHeight);

        const signWidth = width * scaledSize;
        const signHeight = scaledSize;

        const y = pageHeight - signaturePadding;
        let x;
        if(signFirst) x = signaturePadding;
        else x = pageWidth - signWidth - signaturePadding;

        renderer.setupRect(0, 'white');
        renderer.drawRect(x, y, signWidth, -signHeight);
        renderer.finalizeRects();

        signX = x;
        signY = y;
        signFontSize = scaledSize;
    }

    const widths: number[] = [];

    renderer.setupText(!dowOnTop);
    for(let i = 0; i < dowArray.length; i ++) {
        const it = dowArray[i];
        const t = it.text;
        const cx = it.x + it.w*0.5;
        const cy = it.y + it.h*0.5;

        let ww, hh;
        if(dowOnTop) { ww = it.w * 0.95; hh = it.h * 0.95; }
        else { ww = it.h * 0.95; hh = it.w * 0.95; }
        const size = calcFontSizeForBoundsSingle(
            renderer, t,
            ww - innerBorderWidth,
            hh - innerBorderWidth,
            widths
        );

        renderer.setFontSize(size);
        if(dowOnTop) renderer.drawText(t, cx - widths[0]*0.5, cy + size*0.5);
        else renderer.drawText(t, cx + size*0.5, cy + widths[0]*0.5);

    }
    renderer.finalizeTexts();

    renderer.setupText(true);
    for(let i = 0; i < timeArr.length; i++) {
        const it = timeArr[i];
        const t = it.text;
        const size = calcFontSizeForBoundsSingle(
            renderer,
            t,
            (it.h - innerBorderWidth) * 0.9,
            (it.w - innerBorderWidth) * 0.9,
            widths
        );
        renderer.setFontSize(size);
        renderer.drawText(
            t,
            it.x + it.w*0.5 + size*0.5,
            it.y + it.h*0.5 + widths[0]*0.5
        )
        //drawTextCentered(renderer, t, size, it.x + it.w*0.5, , widths);
    }
    renderer.finalizeTexts();

    renderer.setupText(false);
    for(let i = 0; i < lessonsArr.length; i++) {
        const { text, x, y, w, h } = lessonsArr[i];

        const width = (w - innerBorderWidth) * 0.95
        const height = (h - innerBorderWidth) * 0.95;

        const res = optimizeLineBreaks({ width, height, renderer, str: text })

        drawTextCentered(renderer, res.texts, res.fontSize, x + w*0.5, y + h*0.5, res.lineWidths);
    }

    renderer.setFontSize(signFontSize);
    renderer.drawText(signText, signX, signY);

    renderer.finalizeTexts();
}

function drawLessons(
    textArr: ({ text: string } & Rect)[],
    yellowArr: Rect[],
    renderer: Renderer,
    names: string[],
    x: number,
    y: number,
    w: number,
    h: number,
) {
    const w2 = w*0.5;
    const h2 = h*0.5;
    const x2 = x + w2;
    const y2 = y + h2;

    const ll = names;
    const eqh1 = ll[0] === ll[1];
    const eqh2 = ll[2] === ll[3];
    const eqv1 = ll[0] === ll[2];
    const eqv2 = ll[1] === ll[3];

    let drawIndividual = 0
    if(eqh1 && eqh2 && eqv1 && eqv2) {
        drawLesson(textArr, yellowArr, renderer, ll[0], false, x, y, w, h);
        drawIndividual = 0;
    }
    else if(eqh1 || eqh2) {
        if(eqh1) drawLesson(textArr, yellowArr, renderer, ll[0], false, x, y, w, h2);
        else drawIndividual = (1 | 2);

        if(eqh2) drawLesson(textArr, yellowArr, renderer, ll[2], true, x, y + h2, w, h2);
        else drawIndividual = (4 | 8);
    }
    else if(eqv1 || eqv2) {
        if(eqv1) drawLesson(textArr, yellowArr, renderer, ll[0], false, x, y, w2, h);
        else drawIndividual = (1 | 4);

        if(eqv2) drawLesson(textArr, yellowArr, renderer, ll[1], false, x + w2, y, w2, h);
        else drawIndividual = (2 | 8);
    }
    else drawIndividual = (1 | 2 | 4 | 8);

    if((drawIndividual & 1) != 0) drawLesson(textArr, yellowArr, renderer, ll[0], false, x, y, w2, h2);
    if((drawIndividual & 2) != 0) drawLesson(textArr, yellowArr, renderer, ll[1], false, x2, y, w2, h2);
    if((drawIndividual & 4) != 0) drawLesson(textArr, yellowArr, renderer, ll[2], true, x, y2, w2, h2);
    if((drawIndividual & 8) != 0) drawLesson(textArr, yellowArr, renderer, ll[3], true, x2, y2, w2, h2);
}

type Rect = { x: number, y: number, w: number, h: number }

function drawLesson(
    textArr: ({ text: string } & Rect)[],
    yellowArr: Rect[],
    renderer: Renderer,
    lesson: string,
    secondWeek: boolean,
    x: number,
    y: number,
    w: number,
    h: number,
) {
    let drawYellow;
    if (lesson.trim() !== '') {
        drawYellow = secondWeek;
        textArr.push({ text: lesson, x, y, w, h });
    }
    if(drawYellow) yellowArr.push({ x, y, w, h });
    else renderer.drawRect(x, y, w, h);
}

function drawTextCentered(
    renderer: Renderer,
    texts: string[],
    fontSize: number,
    cx: number,
    cy: number,
    widths: number[]
) {
    const lineHeight = fontSize * renderer.fontHeightFac;
    const height = fontSize + lineHeight * (texts.length-1);
    const offY = cy - height*0.5 + fontSize;

    renderer.setFontSize(fontSize);
    for(let i = 0; i < texts.length; i++) {
        renderer.drawText(texts[i], cx - widths[i]*0.5, offY + i*lineHeight);
    }
}

function calcFontSizeForBounds(
    renderer: Renderer,
    texts: string[],
    w: number,
    h: number,
    widths: number[], /*out*/
) {
    widths.length = 0;

    let largestWidth = 0;
    for(let i = 0; i < texts.length; i++) {
        const textWidth = renderer.textWidth(texts[i]);
        widths.push(textWidth);
        if(textWidth > largestWidth) largestWidth = textWidth;
    }

    const scaledSize = Math.min(
        w / largestWidth,
        h / ((texts.length-1) * renderer.fontHeightFac + 1)
    );
    for(let i = 0; i < widths.length; i++) widths[i] *= scaledSize;

    return scaledSize;
}

function calcFontSizeForBoundsSingle(
    renderer: Renderer,
    text: string,
    w: number,
    h: number,
    widths: number[], /*out*/
) {
    const textWidth = renderer.textWidth(text);
    // note: line height is font size if only 1 line
    const scaledSize = Math.min(w / textWidth, h);
    widths.length = 0;
    widths[0] = textWidth * scaledSize;
    return scaledSize;
}
