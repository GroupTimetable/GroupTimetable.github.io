const daysOfWeek = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье"
];

const daysOfWeekLower = daysOfWeek.map(a => a.toLowerCase())
const daysOfWeekShortened = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const daysOfWeekShortenedLower = daysOfWeekShortened.map(it => it.toLowerCase())
const mergeLeading = 0.2, mergeSpace = 0.1;

function findColumnBounds(cont, itemBs, itemI) {
    const item = cont[itemI];
    const bs = itemBs[itemI];
    const itemCenter = 0.5 * (bs.l + bs.r)

    const items = new Set();
    const is = { l: bs.l, r: bs.r, t: bs.t, b: bs.b };

    let totalHeight = item.height;
    let totalCount = 0;
    let curAdded;

    const addItems = (nI) => {
        const nItem = cont[nI];
        if(nItem.str.trim() == '') return;
        if(items.has(nI)) return;
        const ns = itemBs[nI];

        const h = (totalHeight + nItem.height) / (totalCount+1);
        const lea = h * mergeLeading;
        if(!intersects(ns.b, ns.t, is.b - lea, is.t + lea)) return true;

        curAdded++;
        totalHeight = totalHeight + nItem.height;
        totalCount++;
        items.add(nI)
        is.l = Math.min(is.l, ns.l)
        is.b = Math.min(is.b, ns.b)
        is.r = Math.max(is.r, ns.r)
        is.t = Math.max(is.t, ns.t)
    };

    let curI = itemI;
    do { //add all items in row
        curAdded = 0;
        curI--;
        for(; curI >= 0; curI--) if(addItems(curI)) break;
        curI++;
        for(; curI < cont.length; curI++) if(addItems(curI)) break;
    } while(curAdded !== 0);

    const itemsArr = Array.from(items);
    itemsArr.sort((a, b) => {
        const ba = itemBs[a];
        const bb = itemBs[b];
        const ac = (ba.l + ba.r) * 0.5;
        const bc = (bb.l + bb.r) * 0.5;
        return ac - bc;
    })

    if(typeof __schedule_debug_names != 'undefined' && __schedule_debug_names) console.log(itemsArr.map(it => '"' + cont[it].str + '"') + ',')

    const spaces = []
    {
        const firstBs = itemBs[itemsArr[0]]
        let colL = firstBs.l, colR = firstBs.r;
        let colXTotal = (colL + colR) * 0.5;
        let colCount = 1;
        let prevColCenter = undefined;

        for(let i = 1;; i++) {
            let bs, center;
            if(i < itemsArr.length) {
                bs = itemBs[itemsArr[i]]
                center = (bs.l + bs.r) * 0.5;
                if(intersects(bs.l, bs.r, colL, colR)) {
                    colXTotal += center;
                    colCount++;
                    colL = Math.min(colL, bs.l)
                    colR = Math.max(colR, bs.r)
                    continue;
                }
            }

            const curColCenter = colXTotal / colCount;
            if(prevColCenter != undefined) spaces.push(Math.abs(curColCenter - prevColCenter));

            if(i >= itemsArr.length) break;
            prevColCenter = curColCenter;
            colXTotal = center;
            colCount = 1;
            colL = bs.l;
            colR = bs.r;
        }
    }

    const err = item.height * 0.05;
    let avg = 0;
    for(let i = 0; i < spaces.length; i++) avg += spaces[i];
    avg /= spaces.length;
    while(spaces.length > 1) {
        let maxI = 0, maxDiff = Math.abs(spaces[0] - avg)
        for(let i = 1; i < spaces.length; i++) {
            const diff = Math.abs(spaces[i] - avg);
            if(!(diff <= maxDiff)) {
                maxDiff = diff;
                maxI = i;
            }
        }
        if(maxDiff < err) break;
        spaces.splice(maxI, 1)

        avg = 0;
        for(let i = 0; i < spaces.length; i++) avg += spaces[i];
        avg /= spaces.length;
    }

    if(avg != undefined) return { l: itemCenter - avg*0.5, r: itemCenter + avg*0.5, t: bs.t, b: bs.b };
    else throw "Невозможно определить вертикальные границы расписания, [имя группы] = " + itemI + "/" + cont.length;
}

function parseTime(str) {
    if(str.length < 4) return;
    const d = ':'.charCodeAt(0);

    let i = 0;
    let hour = 0;
    for(; i < 2; i++) {
        const ch = str.charCodeAt(i);
        if(ch === d) break;
        else if(ch < '0'.charCodeAt(0) || ch > '9'.charCodeAt(0)) return;
        else hour = hour*10 + (ch - '0'.charCodeAt(0));
    }
    if(str.charCodeAt(i) !== d) return;
    i++;

    let j = 0;
    let minute = 0;
    for(; i < str.length; i++, j++) {
        const ch = str.charCodeAt(i);
        if(ch < '0'.charCodeAt(0) || ch > '9'.charCodeAt(0)) return;
        else minute = minute*10 + (ch - '0'.charCodeAt(0));
    }
    if(j !== 2) return;

    return hour * 60 + minute;
}

function calcItemBounds(item) {
    const h = 1;
    const w = item.width / item.height;

    const op = [[0,0], [0,h], [w,0], [w,h]]
    const a = item.transform[0], b = item.transform[1], c = item.transform[2], d = item.transform[3]

    const min = Number.MIN_VALUE, max = Number.MAX_VALUE;
    const bs = { l: max, b: max, r: min, t: min }
    for(let i = 0; i < 4; i++) {
        const x = op[i][0]
        const y = op[i][1]

        const xp = a*x + b*y;
        const yp = c*x + d*y;

        bs.l = Math.min(bs.l, xp)
        bs.b = Math.min(bs.b, yp)
        bs.r = Math.max(bs.r, xp)
        bs.t = Math.max(bs.t, yp)
    }

    bs.l += item.transform[4]
    bs.r += item.transform[4]
    bs.t += item.transform[5]
    bs.b += item.transform[5]

    return bs
}


function findDaysOfWeekHours(cont, itemBs) {
    const dow = Array(daysOfWeek.length);
    let hoursR = -Infinity;
    const hours = [];
    for(let i = 0; i < cont.length; i++) {
        const str = cont[i].str.toLowerCase();
        for(let j = 0; j < daysOfWeek.length; j++) {
            if(str !== daysOfWeekLower[j]) continue;
            if(dow[j] != undefined) throw ["День недели " + j + " обнаружен дважды", "[дубликат] = " + i + "/" + cont.length];

            dow[j] = i;
            break;
        }

        if(i + 1 < cont.length) {
            const h = parseTime(cont[i].str);
            if(h != undefined) {
                for(let j = 1; j < 3; j++) {
                    let h2 = parseTime(cont[i+j].str);
                    if(h2 != undefined) {
                        hours.push({ first: i, last: i+j, sTime: h, eTime: h2 });
                        hoursR = Math.max(hoursR, itemBs[i].r, itemBs[i+j].r);
                        break
                    }
                }
            }
        }
    }

    if(hours < 2) throw "В рассписании найдено меньше двух пар";

    let hoursT, hoursHeight;
    {
        const b00 = itemBs[hours[0].first]
        const b01 = itemBs[hours[0].last]
        const b10 = itemBs[hours[1].first]
        const b11 = itemBs[hours[1].last]

        const c0 = 0.5 * (Math.min(b00.b, b01.b) + Math.max(b00.t, b01.t)) //center of the 1st hours label
        const c1 = 0.5 * (Math.min(b10.b, b11.b) + Math.max(b10.t, b11.t)) // --- 2nd ---

        hoursHeight = Math.abs(c1 - c0);
        hoursT = c0 + hoursHeight * 0.5;
    }

    const days = Array(dow.length);
    let hourI = 0;
    for(let d = 0; d < dow.length; d++) {
        if(dow[d] == undefined) continue;
        const dayHours = [];
        days[d] = dayHours;

        let nextDayStart = cont.length;
        for(let j = d+1; j < dow.length; j++) if(dow[j] != undefined) {
            nextdayStart = dow[j].i;
            break;
        }

        let prevTime;
        while(hourI < hours.length && hours[hourI].last <= nextDayStart && (prevTime == undefined || hours[hourI].sTime > prevTime)) {
            prevTime = hours[hourI].eTime;
            dayHours.push(hours[hourI]);
            hourI++;
        }
    }

    return { days, hoursC: hourI, hoursR, hoursT, hoursHeight };
}

/*[a1; a2] & (b1, b2)*/
function intersects(a1, a2, b1, b2) {
    return a2 > b1 && a1 < b2;
}

function findDates(cont, bounds, colBounds) {
    const datesRegex = /(^|.*?\s)(\d\d)\.(\d\d)\.(\d\d\d\d)(\s.*?\s|\s)(\d\d)\.(\d\d)\.(\d\d\d\d)(\s|$)/

    for(let i = 0; i < cont.length; i++) {
        const item = cont[i]
        const bs = bounds[i]
        if(bs.t > colBounds.t) continue;
        if(!intersects(bs.l, bs.r, colBounds.l, colBounds.r)) continue;
        const gs =  item.str.match(datesRegex)
        if(gs) return [
            new Date(gs[4], gs[3] - 1, gs[2]),
            new Date(gs[8], gs[7] - 1, gs[6]),
        ];
    }
}

function makeSchedule(cont, pageView, groupNameI, bigFieldsInclude) {
    if(cont.length < 1) throw 'Unreachable'

    const itemBs = Array(cont.length);
    for(let i = 0; i < itemBs.length; i++) itemBs[i] = calcItemBounds(cont[i]);

    const pageR = Math.max(pageView[0], pageView[2])
    const colBounds = findColumnBounds(cont, itemBs, groupNameI);
    const { days, hoursC, hoursR, hoursT, hoursHeight } = findDaysOfWeekHours(cont, itemBs);
    const dates = findDates(cont, itemBs, colBounds)
    const colWidth = colBounds.r - colBounds.l;

    const errX = colWidth * 0.02;
    const curColI = Math.max(0, Math.floor((colBounds.l - hoursR + errX) / colWidth));
    const colC = curColI + 1 + Math.max(0, Math.floor((pageR - colBounds.r + errX) / colWidth));
    const tableL = colBounds.l - curColI * colWidth, tableR = tableL + colC * colWidth;
    const tableT = hoursT, tableB = tableT - hoursC * hoursHeight;
    const colFactor = 1 / colWidth, rowFactor = 1 / hoursHeight;

    const bigFields_ = [];
    const table = Array(colC * hoursC);
    const rowDayHour = (() => { const a = Array(hoursC); a.length = 0; return a; })();
    const schedule = Array(days.length);
    for(let i = 0; i < table.length; i++) table[i] = Array(4);

    for(let dayI = 0; dayI < days.length; dayI++) {
        const day = days[dayI];
        if(day == undefined) continue;
        schedule[dayI] = Array(day.length);
        for(let l = 0; l < day.length; l++) rowDayHour.push([dayI, l])
    }

    const addToCell = (cell, subs, result, ifError) => {
        for(let i = 0; i < subs.length; i++) {
            if(!subs[i]) continue;
            if(cell[i] != undefined) { console.error('cell already filled!', ifError, i); continue; }
            cell[i] = result;
        }
    };
    const joinItems = (itemsIs) => {
        let result = '' + cont[itemsIs[0]].str;
        for(let i = 1; i < itemsIs.length; i++) result += ' ' + cont[itemsIs[i]].str;
        return result;
    };

    const writeGroup = (group) => {
        const cx = 0.5 * (group.l + group.r);
        const cy = 0.5 * (group.t + group.b);
        const x = Math.floor((cx - tableL) * colFactor);
        const y = Math.floor((tableT - cy) * rowFactor);
        if(!(x >= 0 && x < colC && y >= 0 && y < hoursC)) return;

        const cellL = tableL + x * colWidth;
        const cellR = cellL + colWidth;
        const cellCX = tableL + x * colWidth + colWidth * 0.5;
        const cellCY = tableT - (y * hoursHeight + hoursHeight * 0.5);

        const descender = group.lineHeight * 0.2; //for some reason text coordinates start at baseline, but height is line height, and it overlaps at the bottom :/
        // ^ 0.1 doesn't work. obviously.
        //is top half, is bottom half ...
        const t = group.t - descender > cellCY, b = group.b < cellCY;
        if(group.l < cellL || group.r > cellR) {
            group.t = t; group.b = b;
            group.x = x; group.y = y;
            bigFields_.push(group);
        }
        else {
            const l = group.l < cellCX, r = group.r > cellCX;
            const inCurCol = intersects(group.l, group.r, colBounds.l, colBounds.r);
            const result = inCurCol ? joinItems(group.items) : true/*debug: group.items[0]. We don't need text bc it won't be used, just use nonnul*/;
            const subs = [t && l, t && r, b && l, b && r]
            addToCell(table[y * colC + x], subs, result, [x, y])
        }
    };

    //separate text into groups
    let lastGroup = undefined;
    for(let i = 0; i < cont.length; i++) {
        const item = cont[i];
        if(item.str.trim() === '') continue;
        const bounds = itemBs[i]
        const bi = bounds.b, ti = bounds.t;
        const li = bounds.l, ri = bounds.r;
        const cxi = 0.5 * (li + ri), cyi = 0.5 * (ti + bi);
        if(!(tableL <= cxi && cxi <= tableR && tableB <= cyi && cyi <= tableT)) continue;

        let appendToGroup = lastGroup !== undefined
        if(appendToGroup) {
            const h = Math.min(item.height, lastGroup.lineHeight)
            const lea = h * mergeLeading;
            appendToGroup = Math.abs(item.height - lastGroup.lineHeight) < h * 0.1
                && intersects(li, ri, lastGroup.l, lastGroup.r) && intersects(bi, ti, lastGroup.b - lea, lastGroup.t + lea);
        }

        if(appendToGroup) {
            lastGroup.items.push(i);
            lastGroup.l = Math.min(lastGroup.l, li)
            lastGroup.r = Math.max(lastGroup.r, ri)
            lastGroup.b = Math.min(lastGroup.b, bi)
            lastGroup.t = Math.max(lastGroup.t, ti)
        }
        else {
            if(lastGroup !== undefined) writeGroup(lastGroup);
            lastGroup = { items: [i], l: li, r: ri, t: ti, b: bi, lineHeight: cont[i].height };
        }
    }
    if(lastGroup !== undefined) writeGroup(lastGroup);

    //fix big fields
    const bigFieldsCands = [];
    for(let i = 0; i < bigFields_.length; i++) {
        const f = bigFields_[i];
        const inCurCol = intersects(f.l, f.r, colBounds.l, colBounds.r);
        if(inCurCol || bigFieldsInclude.includes(i)) {
            const cell = table[f.y*colC + curColI]
            //note: make big fields take all horisontal space if allowed
            const lt = f.t && cell[0] == undefined, lb = f.b && cell[2] == undefined;
            const rt = f.t && cell[1] == undefined, rb = f.b && cell[3] == undefined;
            addToCell(cell, [lt, rt, lb, rb], joinItems(f.items), [f.x, f.y]);
        }
        else {
            const leftSide = curColI > f.x;
            const dir = leftSide ? 1 : -1;
            let empty = true;
            let __i = 0;
            for(let x = f.x + dir; (curColI - x)*dir > 0; x += dir) {
                if(__i++ > 100) { //I don't trust this code to terminate in every case
                    console.error('error in loop!')
                    break
                }
                const cell = table[f.y*colC + x];
                for(let i = 0; f.t && empty && i < 2; i++) empty = cell[i] == undefined;
                for(let i = 2; f.b && empty && i < 4; i++) empty = cell[i] == undefined;
                if(!empty) break
            }
            if(empty) bigFieldsCands.push(i); //table cell may be occupied later by other big fields
        }
    }

    const bigFields = [];
    for(let i = 0; i < bigFieldsCands.length; i++) {
        const fI = bigFieldsCands[i];
        const f = bigFields_[fI];
        const cell = table[f.y*colC + curColI];
        const leftSide = curColI > f.x;
        const hOff = leftSide ? 0 : 1;
        if((!f.t || cell[0 + hOff] == undefined) && (!f.b || cell[2 + hOff] == undefined)) {
            const dayHour = rowDayHour[f.y]
            bigFields.push([dayHour[0], days[dayHour[0]][dayHour[1]].sTime, f.t, f.b, fI])
        }
    }

    //remove trailing empty lessons
    //? if day is completely empty => set to undefined ?
    for(let i = rowDayHour.length-1; i >= 0; i--) {
        const [dayI, lessonI] = rowDayHour[i];
        const day = schedule[dayI];

        const cell = table[i*colC + curColI];
        let empty = day.length === lessonI+1;
        for(let i = 0; empty && i < cell.length; i++) empty = cell[i] == undefined;

        if(!empty) {
            for(let i = 0; i < cell.length; i++) cell[i] ??= '';
            const lesson = days[dayI][lessonI];
            day[lessonI] = { sTime: lesson.sTime, eTime: lesson.eTime, lessons: cell };
        }
        else day.pop()
    }

    return [schedule, dates, bigFields];
}

function checkValid(...params) {
    for(let i = 0; i < params.length; i++) {
        const p = params[i]
        if(p != undefined && !(p > 0 && p < Infinity)) return false
    }
    return true
}


function drawTextCentered(text, renderer, fontHeight, center, precompWidths = undefined) {
    const fontSize = fontHeight * renderer.sizeFac
    let widths = precompWidths
    if(widths === undefined) {
        widths = Array(text.length)
        for(let i = 0; i < text.length; i++) {
            const textWidth = renderer.widthOfTextAtSize(text[i], fontSize)
            widths[i] = textWidth;
        }
    }

    const offY = center.y + fontHeight*text.length * 0.5;

    for(let i = 0; i < text.length; i++) {
        renderer.drawText(text[i], {
            x: center.x - widths[i] * 0.5,
            y: offY - i*fontHeight - fontHeight,
            size: fontSize,
            font: renderer.font,
            color: PDFLib.rgb(0, 0, 0),
        });
    }
}

const textBreak = new (function() {
    function arr(len) { const a = new Array(len); a.length = 0; return a }

    const count = 6
    const tried = arr(count)
    const objs = [
        { width: 0, height: 0, fontSize: 0, texts: arr(4), lineWidths: arr(4) },
        { width: 0, height: 0, fontSize: 0, texts: arr(4), lineWidths: arr(4) },
    ]

    let bestI, lastI

    this.reset = function() {
        tried.length = 0
        bestI = true
        lastI = !bestI
        for(let i = 0; i < objs.length; i++) {
            const o = objs[i]
            o.lineWidths.length = o.texts.length = o.width = o.height = o.fontSize = 0
        }
    }
    this.haveTried = function (divs) { return tried.includes(divs) }
    this.remeasure = function(strOrig, divs, renderer, bounds) {
        let prevSpace = true //trimStart
        let str = ''
        for(let i = 0; i < strOrig.length; i++) {
            if(prevSpace & (prevSpace = strOrig[i] === ' ')) continue;
            else str += strOrig[i]
        }
        str = str.trimEnd()

        tried.push(divs)


        const tmpI = !bestI
        const tmp = objs[+tmpI]
        tmp.lineWidths.length = tmp.texts.length = tmp.width = tmp.height = tmp.fontSize = 0
        /*break text*/ {
            const maxOffset = Math.max(1, Math.log(str.length+1)) * Math.sqrt(str.length)
            const lineLen =  Math.floor(str.length / divs)

            let prev = 0, startFrom = 0
            for(let i = 0; i < divs-1; i++) {
                const base = lineLen * (i+1)

                startFrom = Math.max(startFrom, base - maxOffset)

                let foundPos
                for(let cur = base; cur >= startFrom; cur--) if(str[cur] === ' ') {
                    foundPos = cur;
                    break;
                }

                for(startFrom = Math.max(startFrom, base+1);
                    startFrom <= Math.min(str.length-1, base + maxOffset)
                        && !(startFrom - base >= base - foundPos);
                    startFrom++
                ) if(str[startFrom] === ' ') {
                    foundPos = startFrom++;
                    break;
                }

                if(foundPos) {
                    tmp.texts.push(str.substring(prev, foundPos));
                    prev = foundPos+1;
                }
            }

            tmp.texts.push(str.substring(prev));
        }

        /*calc sizes*/ {
            const fontHeight = 10
            const fontSize = fontHeight * renderer.sizeFac

            // TODO: change font sizes to font heights
            tmp.lineWidths.length = tmp.texts.length
            let maxWidth = 0
            for(let i = 0; i < tmp.texts.length; i++) {
                const textWidth = renderer.widthOfTextAtSize(tmp.texts[i], fontSize)
                tmp.lineWidths[i] = textWidth
                maxWidth = Math.max(maxWidth, textWidth);
            }
            const scaledHeight = Math.min(bounds.h / tmp.texts.length, fontHeight * bounds.w / maxWidth);

            const coeff = scaledHeight / fontHeight
            for(let i = 0; i < tmp.lineWidths.length; i++) tmp.lineWidths[i] *= coeff
            tmp.width = maxWidth * coeff;
            tmp.height = tmp.texts.length * scaledHeight
            tmp.fontSize = scaledHeight * renderer.sizeFac;

            lastI = tmpI
            if(tmp.fontSize > objs[+bestI].fontSize) bestI = tmpI
        }
    }

    Object.defineProperty(this, 'best', { get: () => objs[+bestI] });
    Object.defineProperty(this, 'last', { get: () => objs[+lastI] });
})()

function fitTextBreakLines(str, renderer, size) {
    textBreak.reset()

    textBreak.remeasure(str, 1, renderer, size)

    for(let j = 0; j < 3; j++) {
        /*maximize text width*/ {
            const el = textBreak.last
            const scaledHeight = el.height * size.w / el.width;
            const divs = Math.max(1, Math.round(el.texts.length * Math.sqrt(size.h / scaledHeight)));
            if(textBreak.haveTried(divs)) break;
            else textBreak.remeasure(str, divs, renderer, size)
        }

        /*maximize text height*/ {
            const el = textBreak.last
            const scaledWidth = el.width * size.h / el.height;
            const divs = Math.max(1, Math.round(el.texts.length * Math.sqrt(scaledWidth / size.w)));
            if(textBreak.haveTried(divs)) break;
            else textBreak.remeasure(str, divs, renderer, size)
        }
    }

    const el = textBreak.best
    return [el.texts, el.fontSize, el.lineWidths]
}

function drawLessonText(lesson, secondWeek, renderer, coord, blockSize, borderWidth) {
    if(secondWeek && lesson.trim() !== '') renderer.drawRectangle({
        x: coord.x,
        y: coord.y,
        width: blockSize.w,
        height: -blockSize.h,
        color: PDFLib.rgb(1, 1, 0),
    })
    if(lesson.trim() !== '') {
        const t = lesson;
        const innerSize = { w: blockSize.w * 0.95, h: blockSize.h * 0.9 }
        const [text, fontSize, widths] = fitTextBreakLines(t, renderer, innerSize)

        drawTextCentered(
            text, renderer, fontSize / renderer.sizeFac,
            { x: coord.x + blockSize.w*0.5, y: coord.y - blockSize.h*0.5 },
            widths
        );
    }

    renderer.drawRectangle({
        x: coord.x,
        y: coord.y,
        width: blockSize.w,
        height: -blockSize.h,
        borderColor: PDFLib.rgb(0, 0, 0),
        borderWidth: borderWidth,
    })
}

function minuteOfDayToString(it) {
    return Math.floor(it/60) + ":" + (it%60).toString().padStart(2, '0')
}

function drawTime(lesson, renderer, coord, blockSize, borderWidth) {
    const innerSize = { w: blockSize.w*0.8, h: blockSize.h*0.9 }

    const texts = [
        minuteOfDayToString(lesson.sTime),
        "–",
        minuteOfDayToString(lesson.eTime)
    ];
    const textHeight = innerSize.w
    const fontSize = textHeight * renderer.sizeFac
    const widths = []
    let largestWidth = 0
    for(let i = 0; i < texts.length; i++) {
        const textWidth = renderer.widthOfTextAtSize(texts[i], fontSize)
        widths.push(textWidth)
        if(textWidth > largestWidth) largestWidth = textWidth;
    }

    const scaledHeight = Math.min(textHeight * innerSize.w / largestWidth, innerSize.h / texts.length);

    const coeff = scaledHeight / textHeight;
    for(let i = 0; i < widths.length; i++) widths[i] *= coeff

    drawTextCentered(
        texts, renderer, scaledHeight,
        { x: coord.x + blockSize.w*0.5, y: coord.y - blockSize.h*0.5 },
        widths
    );

    renderer.drawRectangle({
        x: coord.x,
        y: coord.y,
        width: blockSize.w,
        height: -blockSize.h,
        borderColor: PDFLib.rgb(0, 0, 0),
        borderWidth: borderWidth,
    })
}


function drawLessons(lesson, renderer, coord, size, borderWidth) {
    const eqh1 = lesson.lessons[0] === lesson.lessons[1];
    const eqh2 = lesson.lessons[2] === lesson.lessons[3];
    const eqv1 = lesson.lessons[0] === lesson.lessons[2];
    const eqv2 = lesson.lessons[1] === lesson.lessons[3];

    const points = [
        { x: coord.x             , y: coord.y              },
        { x: coord.x + size.w*0.5, y: coord.y              },
        { x: coord.x             , y: coord.y - size.h*0.5 },
        { x: coord.x + size.w*0.5, y: coord.y - size.h*0.5 },
    ];

    const sizes = [
        { w: size.w*0.5, h: size.h*0.5 },
        { w: size.w    , h: size.h*0.5 },
        { w: size.w*0.5, h: size.h     },
        { w: size.w    , h: size.h     }
    ];

    const drawLessons = Array(4)
    if(eqh1 && eqh2 && eqv1 && eqv2) drawLessonText(lesson.lessons[0], false, renderer, points[0], sizes[3], borderWidth)
    else if(eqh1 || eqh2) {
        if(eqh1) drawLessonText(lesson.lessons[0], false, renderer, points[0], sizes[1], borderWidth)
        else drawLessons[0] = drawLessons[1] = true

        if(eqh2) drawLessonText(lesson.lessons[2], true, renderer, points[2], sizes[1], borderWidth)
        else drawLessons[2] = drawLessons[3] = true
    }
    else if(eqv1 || eqv2) {
        if(eqv1) drawLessonText(lesson.lessons[0], false, renderer, points[0], sizes[2], borderWidth)
        else drawLessons[0] = drawLessons[2] = true

        if(eqv2) drawLessonText(lesson.lessons[1], false, renderer, points[1], sizes[2], borderWidth)
        else drawLessons[1] = drawLessons[3] = true
    }
    else drawLessons.fill(true)

    if(drawLessons[0]) drawLessonText(lesson.lessons[0], false, renderer, points[0], sizes[0], borderWidth)
    if(drawLessons[1]) drawLessonText(lesson.lessons[1], false, renderer, points[1], sizes[0], borderWidth)
    if(drawLessons[2]) drawLessonText(lesson.lessons[2], true, renderer, points[2], sizes[0], borderWidth)
    if(drawLessons[3]) drawLessonText(lesson.lessons[3], true, renderer, points[3], sizes[0], borderWidth)
}

function drawLesson(lesson, renderer, coord, size, timeWidth, borderWidth) {
    drawTime(lesson, renderer, coord, { w: timeWidth, h: size.h }, borderWidth)
    drawLessons(lesson, renderer, { x: coord.x + timeWidth, y: coord.y }, { w: size.w - timeWidth, h: size.h }, borderWidth)
}

var deg90; // filled out by whoever uses schedule.js

function drawTextWidthinBounds(text, renderer, coord, size, params) {
    params ??= {}
    const padding = params.padding ?? 0.05
    const innerFactor = 1 - 2*padding

    const calcParams = (maxWidth, maxHeight) => {
        const offWidth = maxWidth * innerFactor
        const offHeight = maxHeight * innerFactor
        const textHeight = offHeight;
        const largestWidth = renderer.widthOfTextAtSize(text, textHeight * renderer.sizeFac);
        const scaledHeight = Math.min(textHeight * offWidth / largestWidth, offHeight);
        const scaledWidth = largestWidth * scaledHeight / offHeight;
        const newSize = scaledHeight * renderer.sizeFac

        const offsetHeight = (offHeight + maxHeight) * 0.5;
        if(params.alignLeft) {
            const offsetWidth = 0;
            return [offsetWidth, offsetHeight, scaledWidth, scaledHeight, newSize]
        }
        else if(params.alignRight) {
            const offsetWidth = maxWidth * (1 - padding) - scaledWidth
            return [offsetWidth, offsetHeight, scaledWidth, scaledHeight, newSize]
        }
        else {
            const offsetWidth = (maxWidth - scaledWidth) * 0.5
            return [offsetWidth, offsetHeight, scaledWidth, scaledHeight, newSize]
        }
    };
    const [offsetWidth, offsetHeight, tw, th, fontSize] = params.rotated ? calcParams(size.h, size.w) : calcParams(size.w, size.h)
    const x = coord.x + (params.rotated ? offsetHeight : offsetWidth)
    const y = coord.y + (params.rotated ? -size.h + offsetWidth : -offsetHeight)

    if(params.backgroundColor) renderer.drawRectangle({
        x, y,
        width: params.rotated ? -th : tw,
        height: params.rotated ? tw : th,
        color: params.backgroundColor
    })

    renderer.drawText(text, {
        x, y,
        size: fontSize,
        font: renderer.font,
        color: PDFLib.rgb(0, 0, 0),
        rotate: params.rotated ? deg90 : undefined
    });

    if(!params.noBorder) renderer.drawRectangle({
        x: coord.x,
        y: coord.y,
        width: size.w,
        height: -size.h,
        borderColor: PDFLib.rgb(0, 0, 0),
        borderWidth: params.borderWidth ?? (() => { console.error('no border width!'); return 0 })(),
    })
}

function drawDay(
    renderer,
    day, dayI,
    outerCoord, groupSize,
    borderWidth,  innerBorderWidth, drawBorder, dowOnTop
) {
    const borderOffset = (drawBorder
        ? Math.max(0, borderWidth - innerBorderWidth)
        : borderWidth + innerBorderWidth) -1/*? border is drawn 1px less than it should ?*/;
    let x = outerCoord.x + borderOffset * 0.5;
    let y = outerCoord.y - borderOffset * 0.5;
    let w = groupSize.w - borderOffset;
    const rowsCount = day.length + (dowOnTop ? 1 : 0);
    const fullH = groupSize.h * rowsCount - borderOffset;
    const h = groupSize.h - borderOffset / rowsCount;
    const addColWidth = w*0.1

    const text = daysOfWeek[dayI]
    if(dowOnTop) {
        const size = { w, h }
        drawTextWidthinBounds(text, renderer, { x, y }, size, { borderWidth: innerBorderWidth })
        y -= size.h
    }
    else {
        const size = { w: addColWidth, h : fullH }
        drawTextWidthinBounds(text, renderer, { x, y }, size, { rotated: true, borderWidth: innerBorderWidth })
        x += size.w
        w -= addColWidth
    }

    const size = { w, h }
    for(let i = 0; i < day.length; i++) {
        drawLesson(day[i], renderer, { x: x, y: y - i*h }, size, addColWidth, innerBorderWidth);
    }

    if(drawBorder) renderer.drawRectangle({
        x: outerCoord.x,
        y: outerCoord.y,
        width: groupSize.w,
        height: -groupSize.h * rowsCount,
        borderColor: PDFLib.rgb(0, 0, 0),
        borderWidth: borderWidth,
    })
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

async function getDocument() {
    const pdfDoc = await PDFLib.PDFDocument.create() /*
        we can't reuse the document and glyph cache because of
        library issue: https://github.com/Hopding/pdf-lib/issues/1492
    */
    pdfDoc.registerFontkit(window.fontkit)
    const font = await pdfDoc.embedFont(await fontPromise, {subset:true});
    return [pdfDoc, font]
}


//border factor is used inaccurately, but the difference should not be that big
async function scheduleToPDF(renderer, schedule, origPattern, rowRatio, borderFactor, drawBorder, dowOnTop) {
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
            if(!day || !day.length) continue;

            curRows += day.length;
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
    const signFirst  = heightIfSignFirst < heightIfSignLast;
    const pageSize = [colWidth * renderPattern.length, pageHeight]
    const groupSize = { w: colWidth, h: colWidth * rowRatio };

    const ch = (num) => !(num >= 1 && num < Infinity)
    if(!(maxRows > 0) || ch(pageSize[0]) || ch(pageSize[1])) {
        console.error('TODO')
        return;
        //const [pdfDoc, font] = await getDocument()
        //const page = pdfDoc.addPage([1, 1])
        //return { doc: await pdfDoc.save(), w: 1, h: 1 } //no signature
    }

    await renderer.init(pageSize)
    //const [pdfDoc, font] = await getDocument()
    //const page = pdfDoc.addPage(pageSize)

    for(let i = 0; i < renderPattern.length; i++) {
        let curY = pageSize[1];

        for(let j = 0; j < renderPattern[i].length; j++) {
            const index = renderPattern[i][j];
            if(index == undefined || schedule[index] == undefined) continue;
            drawDay(
                renderer,
                schedule[index], index,
                { x: i*groupSize.w, y: curY }, groupSize,
                borderWidth, innerBorderWidth, drawBorder, dowOnTop
            );
            curY = curY - groupSize.h * (schedule[index].length + (dowOnTop ? 1 : 0));
        }
    }

    const signX = signFirst ? signaturePadding : pageSize[0] - colWidth*0.8 - signaturePadding;
    const alignRight = !signFirst;
    const alignLeft = signFirst;

    drawTextWidthinBounds(
        'vanaigr.github.io', renderer,
        { x: signX, y: signatureHeight + signaturePadding },
        { w: colWidth*0.8, h: signatureHeight },
        { alignRight, alignLeft, noBorder: true, padding: 0, backgroundColor: PDFLib.rgb(1, 1, 1) }
    )
}

function readScheduleScheme(str) {
    const texts = str.split('\n')

    const scheme = []

    for(let i = 0; i < texts.length; i++) {
        const line = texts[i].trimEnd();
        if(line.length === 0) continue;
        const count = Math.floor((line.length+1)/3);
        if(count*3-1 !== line.length) throw ['Неправильная строка расположения дней: `' + line + '`', '[строка] = ' + i + '/' + texts.length];

        for(let j = 0; j < count; j++) {
            const sp = j*3;
            const p = line.substring(sp, sp+2).toLowerCase();
            if(p.trim() === '') continue;

            const k = daysOfWeekShortenedLower.indexOf(p);
            if(k === -1) throw ['Неправильный день недели `' + p + '`  в строке: `' + line + '` на ' + (sp+1) + ':' +  i];
            else {
                while(scheme.length <= j) scheme.push([])
                scheme[j].push(k)
            }
        }
    }

    return scheme;
}
