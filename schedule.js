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


function findGroupNames(items, itemBounds, startItemI) {
    const bs = itemBounds[startItemI];

    const namesSet = new Set();
    const is = { l: bs.l, r: bs.r, t: bs.t, b: bs.b };

    let totalHeight = bs.t - bs.b;
    let totalCount = 0;
    let curAdded;

    const addItems = (nI) => {
        const nItem = items[nI];
        if(nItem.str.trim() == '') return;
        if(namesSet.has(nI)) return;
        const ns = itemBounds[nI];

        const h = (totalHeight + nItem.height) / (totalCount+1);
        const lea = h * mergeLeading;
        if(!intersects(ns.b, ns.t, is.b - lea, is.t + lea)) return true;

        curAdded++;
        totalHeight = totalHeight + nItem.height;
        totalCount++;
        namesSet.add(nI)
        is.l = Math.min(is.l, ns.l)
        is.b = Math.min(is.b, ns.b)
        is.r = Math.max(is.r, ns.r)
        is.t = Math.max(is.t, ns.t)
    };

    let curI = startItemI;
    do { //add all items in row
        curAdded = 0;
        curI--;
        for(; curI >= 0; curI--) if(addItems(curI)) break;
        curI++;
        for(; curI < items.length; curI++) if(addItems(curI)) break;
    } while(curAdded !== 0);

    const itemsArr = Array.from(namesSet);
    itemsArr.sort((a, b) => {
        const aBs = itemBounds[a];
        const bBs = itemBounds[b];
        const aCenter = (aBs.l + aBs.r) * 0.5;
        const bCenter = (bBs.l + bBs.r) * 0.5;
        return aCenter - bCenter;
    })

    return itemsArr
}

function findColumnBounds(cont, itemBs, itemI) {
    const item = cont[itemI];
    const bs = itemBs[itemI];
    const itemCenter = 0.5 * (bs.l + bs.r)

    const itemsArr = findGroupNames(cont, itemBs, itemI)

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

function bigCheckEmpty(curCol, otherCol, leftSide, f, yOff, table) {
    var minCol, maxCol
    if(leftSide) {
        minCol = otherCol
        maxCol = curCol - 1
    }
    else {
        minCol = curCol + 1
        maxCol = otherCol
    }

    for(let x = minCol; x <= maxCol; x++) {
        const cell = table[yOff + x];
        // Bug: big fields currently don't check each other
        for(let i = 0; f.t && i < 2; i++) if(cell[i] !== undefined) return false
        for(let i = 2; f.b && i < 4; i++) if(cell[i] !== undefined) return false
    }

    {
        const cell = table[yOff + curCol];
        if(leftSide) {
            if(f.t) if(cell[0] !== undefined) return false
            if(f.b) if(cell[2] !== undefined) return false
        }
        else {
            if(f.t) if(cell[1] !== undefined) return false
            if(f.b) if(cell[3] !== undefined) return false
        }
    }

    return true
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
    const colC = Math.max(0, Math.floor((pageR - hoursR + errX) / colWidth));
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

            const fieldCenter = (f.l + f.r) * 0.5;
            // inclusive opposite column
            const otherBound = 2*fieldCenter - colBounds.r;
            const otherColF = (otherBound - hoursR) / colWidth;
            const otherCol = Math.round(otherColF);
            const otherBoundValid = Math.abs(otherCol - otherColF) <= errX
                && otherCol >= 0 && otherCol < colC;

            if(otherBoundValid) {
                const empty = bigCheckEmpty(
                    curColI, otherCol, leftSide,
                    f, f.y*colC, table,
                );
                // Note: table cell may be occupied later by other big fields
                if(empty) bigFieldsCands.push(i);
            }

            //console.log(
            //    "where:", f.y,
            //    ",other bound:", otherCol, otherBoundValid,
            //    ",empty:", empty
            //);

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

function drawTextCentered(renderer, texts, fontSize, cx, cy, widths) {
    const lineHeight = fontSize * renderer.fontHeightFac;
    const height = fontSize + lineHeight * (texts.length-1);
    const offY = cy - height*0.5 + fontSize;

    renderer.setFontSize(fontSize);
    for(let i = 0; i < texts.length; i++) {
        renderer.drawText(texts[i], cx - widths[i]*0.5, offY + i*lineHeight);
    }
}

const textBreak = new (function() {
    function arr(len) { const a = new Array(len); a.length = 0; return a }

    const tried = [];
    const objs = [
        { width: 0, height: 0, fontSize: 0, texts: arr(4), lineWidths: arr(4) },
        { width: 0, height: 0, fontSize: 0, texts: arr(4), lineWidths: arr(4) },
    ];

    let str, renderer, width, height;
    let bestI, lastI;

    this.init = function(string, rend, w, h) {
        str = string.trim();
        renderer = rend;
        width = w;
        height = h;

        // using height instead of size to ignore line height spacing
        const textWidth = renderer.textWidth(str);
        const scaledSize = Math.min(width / textWidth, h);

        const tmp = objs[0];
        tmp.texts.length = 0;
        tmp.texts[0] = str;
        tmp.lineWidths.length = 1;
        tmp.lineWidths[0] = textWidth * scaledSize;
        tmp.width = textWidth * scaledSize;
        tmp.height = scaledSize * renderer.fontHeightFac;
        tmp.fontSize = scaledSize;

        lastI = bestI = 0;

        tried.length = 0;
        tried.push(1);
    }

    this.remeasure = function(targetLines) {
        if(tried.includes(targetLines)) return true;

        const tmpI = 1 - bestI;
        const tmp = objs[tmpI];
        /*break text*/ {
            tmp.texts.length = 0;
            const maxOffset = Math.max(1, Math.log(str.length+1)) * Math.sqrt(str.length);
            const lineLen =  Math.floor(str.length / targetLines);

            let prev = 0, startFrom = 0;
            for(let i = 0; i < targetLines-1; i++) {
                const base = lineLen * (i+1);

                startFrom = Math.max(startFrom, base - maxOffset);

                let foundPos;
                for(let cur = base; cur >= startFrom; cur--) {
                    if(str[cur] === ' ') {
                        foundPos = cur;
                        break;
                    }
                }

                for(startFrom = Math.max(startFrom, base+1);
                    startFrom <= Math.min(str.length-1, base + maxOffset)
                        && !(startFrom - base >= base - foundPos);
                    startFrom++
                ) {
                    if(str[startFrom] === ' ') {
                        foundPos = startFrom++;
                        break;
                    }
                }

                if(foundPos) {
                    tmp.texts.push(str.substring(prev, foundPos));
                    prev = foundPos+1;
                }
            }

            tmp.texts.push(str.substring(prev));
        }

        const actualLines = tmp.texts.length;
        if(actualLines != targetLines) {
            if(tried.includes(actualLines)) return true;
            tried.push(actualLines);
        }
        tried.push(targetLines);

        /*calc sizes*/ {
            tmp.lineWidths.length = actualLines;

            let maxWidth = 0;
            for(let i = 0; i < actualLines; i++) {
                tmp.lineWidths[i] = renderer.textWidth(tmp.texts[i]);
                maxWidth = Math.max(maxWidth, tmp.lineWidths[i]);
            }
            const scaledSize = Math.min(
                width / maxWidth,
                height / ((actualLines-1) * renderer.fontHeightFac + 1)
            );

            for(let i = 0; i < tmp.lineWidths.length; i++) {
                tmp.lineWidths[i] *= scaledSize;
            }
            tmp.width = maxWidth * scaledSize;
            tmp.height = (actualLines-1) * renderer.fontHeightFac * scaledSize + scaledSize;
            tmp.fontSize = scaledSize;

            lastI = tmpI;
            if(tmp.fontSize > objs[bestI].fontSize) bestI = tmpI;
        }

        return false;
    }

    Object.defineProperty(this, 'best', { get: () => objs[+bestI] });
    Object.defineProperty(this, 'last', { get: () => objs[+lastI] });
})()

function minuteOfDayToString(it) {
    return Math.floor(it/60) + ":" + (it%60).toString().padStart(2, '0')
}

function getLessonTimeTexts(lesson) {
    return [minuteOfDayToString(lesson.sTime), "–", minuteOfDayToString(lesson.eTime)]
}

function calcFontSizeForBoundsSingle(renderer, text, w, h, widths/*out*/) {
    const textWidth = renderer.textWidth(text);
    // note: line height is font size if only 1 line
    const scaledSize = Math.min(w / textWidth, h);
    widths.length = 0;
    widths[0] = textWidth * scaledSize;
    return scaledSize;
}

function calcFontSizeForBounds(renderer, texts, w, h, widths/*out*/) {
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

function drawLesson(textArr, yellowArr, renderer, lesson, secondWeek, x, y, w, h) {
    let drawYellow;
    if (lesson.trim() !== '') {
        drawYellow = secondWeek;
        textArr.push({ text: lesson, x, y, w, h });
    }
    if(drawYellow) yellowArr.push({ x, y, w, h });
    else renderer.drawRect(x, y, w, h);
}

function drawLessons(textArr, yellowArr, renderer, lesson, x, y, w, h) {
    const w2 = w*0.5;
    const h2 = h*0.5;
    const x2 = x + w2;
    const y2 = y + h2;

    const ll = lesson.lessons;
    const eqh1 = ll[0] === ll[1];
    const eqh2 = ll[2] === ll[3];
    const eqv1 = ll[0] === ll[2];
    const eqv2 = ll[1] === ll[3];

    let drawIndividual;
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

//border factor is used inaccurately, but the difference should not be that big
async function renderSchedule(renderer, schedule, origPattern, editParams) {
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
    const pageWidth = colWidth * renderPattern.length;
    const signFirst  = heightIfSignFirst < heightIfSignLast;
    const groupSize = { w: colWidth, h: colWidth * rowRatio };

    const ch = (num) => !(num >= 1 && num < Infinity)
    if(!(maxRows > 0) || ch(pageWidth) || ch(pageHeight)) {
        await renderer.emptyInit();
        return;
    }

    await renderer.init(pageWidth, pageHeight)

    const dowArray = []
    const timeArr = []
    const yellowArr = []
    const lessonsArr = []
    const innerBorderOffset = (drawBorder
        ? Math.max(0, borderWidth - innerBorderWidth)
        : borderWidth + innerBorderWidth); // for both sides
    const startW = groupSize.w - innerBorderOffset;
    const dowColWidth = startW * 0.1;
    const timeColWidth = dowColWidth;

    renderer.setupRect(innerBorderWidth, false)
    for(let i = 0; i < renderPattern.length; i++) {
        const startX = i * groupSize.w + innerBorderOffset*0.5;
        let startY = innerBorderOffset*0.5;

        for(let j = 0; j < renderPattern[i].length; j++) {
            const index = renderPattern[i][j];
            if(index == undefined || schedule[index] == undefined) continue;
            const day = schedule[index];
            const rowsCount = day.length + (dowOnTop ? 1 : 0);

            let x = startX;
            let y = startY;
            let w = startW;
            const h = groupSize.h - innerBorderOffset / rowsCount;
            const dayH = rowsCount * groupSize.h;

            const dowText = daysOfWeek[index]
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
            for(let i = 0; i < day.length; i++) {
                const lesson = day[i]
                const ly = y + i*h;
                renderer.drawRect(x, ly, timeColWidth, h)
                const texts = getLessonTimeTexts(lesson)
                timeArr.push({ texts, x, y: ly, w: timeColWidth, h })
                drawLessons(lessonsArr, yellowArr, renderer, lesson, x + timeColWidth, ly, lessonW, h)
            }

            startY += dayH;
        }
    }
    renderer.finalizeRects()

    renderer.setupRect(innerBorderWidth, true);
    for(let i = 0; i < yellowArr.length; i++) {
        const it = yellowArr[i];
        renderer.drawRect(it.x, it.y, it.w, it.h);
    }
    renderer.finalizeRects();

    if (drawBorder) {
        renderer.setupRect(borderWidth, false)
        for(let i = 0; i < renderPattern.length; i++) {
            const x = i * groupSize.w;
            let curY = 0;

            for(let j = 0; j < renderPattern[i].length; j++) {
                const index = renderPattern[i][j];
                if(index == undefined || schedule[index] == undefined) continue;
                const day = schedule[index];
                const rowsCount = day.length + (dowOnTop ? 1 : 0);
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

        renderer.setupRect(0, false, true);
        renderer.drawRect(x, y, signWidth, -signHeight);
        renderer.finalizeRects();

        signX = x;
        signY = y;
        signFontSize = scaledSize;
    }

    const widths = [];

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

    renderer.setupText(false);

    for(let i = 0; i < timeArr.length; i++) {
        const it = timeArr[i];
        const t = it.texts;
        const size = calcFontSizeForBounds(
            renderer,
            t,
            (it.w - innerBorderWidth) * 0.9,
            (it.h - innerBorderWidth) * 0.9,
            widths
        );
        drawTextCentered(renderer, t, size, it.x + it.w*0.5, it.y + it.h*0.5, widths);
    }

    for(let i = 0; i < lessonsArr.length; i++) {
        const { text, x, y, w, h } = lessonsArr[i];

        const width = (w - innerBorderWidth) * 0.95, height = (h - innerBorderWidth) * 0.95;
        textBreak.init(text, renderer, width, height)

        for(let j = 0; j < 3; j++) {
            /*maximize text width*/ {
                const el = textBreak.last;
                const scaledHeight = el.height * width / el.width;
                const lines = Math.max(1, Math.round(el.texts.length * Math.sqrt(height / scaledHeight)));
                if(textBreak.remeasure(lines)) break;
            }

            /*maximize text height*/ {
                const el = textBreak.last;
                const scaledWidth = el.width * height / el.height;
                const lines = Math.max(1, Math.round(el.texts.length * Math.sqrt(scaledWidth / width)));
                if(textBreak.remeasure(lines)) break;
            }
        }

        const res = textBreak.best;
        drawTextCentered(renderer, res.texts, res.fontSize, x + w*0.5, y + h*0.5, res.lineWidths);
    }

    renderer.setFontSize(signFontSize);
    renderer.drawText(signText, signX, signY);

    renderer.finalizeTexts();
}
