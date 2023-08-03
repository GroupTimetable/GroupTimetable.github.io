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

function findItemBoundsH(cont, itemI) {
    const item = cont[itemI];
    const itemCenter = Math.abs(cont[itemI].transform[4] + cont[itemI].width/2);
    
    let neighbour;
    const offsets = [-1, 1, -2, 2, -3, 3]
    for(let i = 0; i < offsets.length; i++) {
        const neigI = itemI + offsets[i]
        if(cont[neigI] && cont[neigI].str == ' ') {
            neighbour = neigI + (i % 2 === 0 ? -1 : 1);
            break
        }
    }

    if(!neighbour) throw ["Невозможно определить вертикальные границы расписания", " [имя группы] = " + itemI + "/" + cont.length];

    const spacing = Math.abs(itemCenter - (cont[neighbour].transform[4] + cont[neighbour].width/2));

    const itemS = itemCenter - spacing/2;
    const itemE = itemCenter + spacing/2;

    return { lef: itemS, rig: itemE };
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

function bounds(item) {
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


function findDaysOfWeekHoursBoundsV(cont) {
    const dow = Array(daysOfWeek.length);
    const hours = [];
    let curStart = 0;
    for(let i = 0; i < cont.length; i++) {
        const str = cont[i].str.toLowerCase();
        for(let j = 0; j < daysOfWeek.length; j++) {
            if(str !== daysOfWeekLower[j]) continue;
            if(dow[j] != undefined) throw ["День недели " + j + " обнаружен дважды", "[дубликат] = " + i + "/" + cont.length];

            dow[j] = { si: curStart, i: i };
            curStart = i+1;
            break;
        }

        if(i + 1 < cont.length) {
            const h = parseTime(cont[i].str);
            if(h != undefined) {
                for(let j = 1; j < 3; j++) {
                    let h2 = parseTime(cont[i+j].str);
                    if(h2 != undefined) hours.push({ i: i, sTime: h, eTime: h2, items: [cont[i], cont[i+j]] });
                }
            }
        }
    }

    if(hours < 2) throw "В рассписании найдено меньше двух пар";

    let hoursSpacing2; //height between hours labels / 2
    {
        const b00 = bounds(hours[0].items[0])
        const b01 = bounds(hours[0].items[1])
        const b10 = bounds(hours[1].items[0])
        const b11 = bounds(hours[1].items[1])

        const c0 = 0.5 * (Math.min(b00.b, b01.b) + Math.max(b00.t, b01.t)) //center of the 1st hours label
        const c1 = 0.5 * (Math.min(b10.b, b11.b) + Math.max(b10.t, b11.t)) // --- 2nd ---

        hoursSpacing2 = Math.abs(c1 - c0) * 0.5;

        hours[0].top = c0 + hoursSpacing2
        hours[0].bot = c0 - hoursSpacing2
        hours[1].top = c1 + hoursSpacing2
        hours[1].bot = c1 - hoursSpacing2
    }

    for(let i = 2; i < hours.length; i++) {
        const b0 = bounds(hours[i].items[0]);
        const b1 = bounds(hours[i].items[1]);
        const c = 0.5 * (Math.min(b0.b, b1.b) + Math.max(b0.t, b1.t))
        hours[i].top = c + hoursSpacing2
        hours[i].bot = c - hoursSpacing2
    }

    const info = Array(dow.length); //starting and ending indices for the days of week
    let newHourI = 0;
    for(let d = 0; d < dow.length; d++) {
        if(dow[d] == undefined) continue;
        const it = {};
        info[d] = it;

        const si = dow[d].si;
        let ei;
        for(let j = d+1; j < dow.length; j++) if(dow[j] != undefined) {
            ei = dow[j].i - 1;
            break;
        }
        if(ei == undefined) ei = cont.length-1;

        it.si = si;
        it.ei = ei;
        it.hours = [];

        let prevTime;
        let i = newHourI;
        while(i < hours.length && hours[i].i <= si) i++; 
        while(i < hours.length && hours[i].i <= ei && (prevTime == undefined || hours[i].sTime > prevTime)) {
            prevTime = hours[i].eTime;
            it.hours.push(hours[i]);
            i++;
        }
        newHourI = i;
    }

    return info;
}

/*[a1; a2] & (b1, b2)*/
function intersects(a1, a2, b1, b2) {
    return a2 > b1 && a1 < b2;
}


function shouldMergeLessons2(l1, l2, isVertical) {
    if(l1.length === 0 || l2.length === 0) return false;

    let max1;
    for(let i = 0; i < l1.length; i++) {
        const bs = bounds(l1[i]) 
        const p = isVertical ? bs.t : bs.r;
        if(max1 == undefined || p > max1) max1 = p;
    }

    let min2;
    for(let i = 0; i < l2.length; i++) {
        const bs = bounds(l2[i]) 
        const p = isVertical ? bs.b : bs.l;
        if(min2 == undefined || p < min2) min2 = p;
    }

    let sh;
    if(isVertical) sh = (min2 - max1) < l1[0].height * 0.2; // leading
    else sh = (min2 - max1) < l1[0].height * 0.1; //space

    return sh;
}

function mergeLessons(lessons, shouldMerge) {
    const h1 = shouldMerge[0] || shouldMergeLessons2(lessons[0], lessons[1], false);
    const h2 = shouldMerge[1] || shouldMergeLessons2(lessons[2], lessons[3], false);
    const v1 = shouldMerge[2] || shouldMergeLessons2(lessons[2], lessons[0], true );
    const v2 = shouldMerge[3] || shouldMergeLessons2(lessons[3], lessons[1], true );

    if(h1 && h2 && v1 && v2) {
        const e = lessons[0].concat(lessons[1]).concat(lessons[2]).concat(lessons[3]);
        lessons.fill(e);
    }
    else if(h1 || h2) {
        if(h1) {
            const e = lessons[0].concat(lessons[1]);
            lessons[0] = e;
            lessons[1] = e;
        }
        if(h2) {
            const e = lessons[2].concat(lessons[3]);
            lessons[2] = e;
            lessons[3] = e;
        }
    }
    else if(v1 || v2) {
        if(v1) {
            const e = lessons[0].concat(lessons[2]);
            lessons[0] = e;
            lessons[2] = e;
        }
        if(v2) {
            const e = lessons[1].concat(lessons[3]);
            lessons[1] = e;
            lessons[3] = e;
        }
    }

    const done = new Map()

    for(let i = 0; i < 4; i++) {
        const a = lessons[i];
        const cached = done.get(a)
        if(cached != undefined) {
            lessons[i] = cached
        }
        else if(a.length == 0) {
            done.set(a, lessons[i] = "");
        }
        else {
            a.sort(function(a, b) { // a - b
                const xa = a.transform[4],
                    ya = a.transform[5],
                    xb = b.transform[4],
                    yb = b.transform[5];

                const dy = ya - yb
                if(Math.abs(dy) < 0.01 * Math.min(a.height, b.height)) return xa - xb
                else return -dy //in pdf y is flipped
            })

            let res = "" + a[0].str;
            let prevR = bounds(a[0]).r;
            for(let j = 1; j < a.length; j++) {
                const bs = bounds(a[j])
                const curL = bs.l;
                const curR = bs.r;
                res = res + " " + a[j].str;
                prevR = curR;
            }
            done.set(a, lessons[i] = res);
        }
    }
}


function makeSchedule(cont, vBounds, hBounds) {
    const schedule = Array(vBounds.length);
    const bigFields = []

    const la = hBounds.lef, ra = hBounds.rig;
    const ma = (la + ra) * 0.5;

    for(let dayI = 0; dayI < vBounds.length; dayI++) {
        if(vBounds[dayI] == undefined) continue;
        const day = vBounds[dayI];

        const curS = Array(day.hours.length);
        schedule[dayI] = curS;
        for(let i = 0; i < day.hours.length; i++) curS[i] = { sTime: day.hours[i].sTime, eTime: day.hours[i].eTime, lessons: [[], [], [], []], shouldMerge: [false, false, false, false] };

        for(let j = day.si; j <= day.ei; j++) {
            const item = cont[j];
            item.index = j;
            if(item.str.trim() === '') continue;
            const ibounds = bounds(item)
            const bi = ibounds.b, ti = ibounds.t; 
            const li = ibounds.l, ri = ibounds.r;
            
            const itemC = (bi + ti) * 0.5;
            const itemM = (li + ri) * 0.5;
            for(let i = 0; i < day.hours.length; i++) {
                const ba = day.hours[i].bot, ta = day.hours[i].top;
                const ca = (ba + ta) * 0.5;

                const il = intersects(li, ri, la, ma);
                const ir = intersects(li, ri, ma, ra);
                if(!il && !ir) continue;
                const ib = intersects(bi, ti, ba, ca);
                const it = intersects(bi, ti, ca, ta);
                if(!it && !ib) continue;

                let addBigField = item.width > hBounds.rig - hBounds.lef
                const bigField = { day: dayI, hours: i }
                if(addBigField && bigFields.length !== 0) {
                    const otherField = bigFields[bigFields.length-1]
                    if(otherField.day == bigField.day && otherField.hours == bigField.hours) {
                        addBigField = false
                    }
                }

                if(addBigField) bigFields.push(bigField)

                const shouldL = itemM < ma;
                const shouldB = itemC < ca;

                if(il && ir && it && ib) curS[i].shouldMerge.fill(true);
                else {
                    if(il && ir) curS[i].shouldMerge[shouldB ? 1 : 0] = true;
                    if(it && ib) curS[i].shouldMerge[shouldL ? 2 : 3] = true;
                }

                const c = curS[i].lessons;
                const s = item;
                if(!shouldB &&  shouldL) c[0].push(s);
                if(!shouldB && !shouldL) c[1].push(s);
                if( shouldB &&  shouldL) c[2].push(s);
                if( shouldB && !shouldL) c[3].push(s);

                break;
            }
        }


        let empty = true;
        for(let i = curS.length-1; i >= 0; i--) {
            const l = curS[i];
            for(let j = 0; j < 4 && empty; j++) empty = empty && l.lessons[j].length == 0;
            if(empty) curS.pop();
            else {
                mergeLessons(l.lessons, l.shouldMerge);
                l.shouldMerge = undefined;
            }
        }
    }

    return [schedule, bigFields]
}


function calcSize(schedule, renderPattern, width, rowRatio/*height/width*/) {
    let maxLessonsInCol = 1;
    for(let i = 0; i < renderPattern.length; i++) {
        let maxCount = 0;
        for(let j = 0; j < renderPattern[i].length; j++) {
            const index = renderPattern[i][j];
            if(index === -1) continue;
            const day = schedule[index];
            if(day == undefined) continue;
            maxCount += day.length;
        }
        if(maxCount > maxLessonsInCol) maxLessonsInCol = maxCount;
    }

    const height = width / renderPattern.length * maxLessonsInCol * rowRatio;
    const groupSize = { h: height / maxLessonsInCol, w: width / renderPattern.length };

    return [height, groupSize];
}

function drawTextCentered(text, page, font, fontSize, center, precompWidths = undefined) {
    const lineHeight = font.heightAtSize(fontSize);
    let widths = precompWidths
    if(widths === undefined) {
        widths = Array(text.length)
        for(let i = 0; i < text.length; i++) {
            const textWidth = font.widthOfTextAtSize(text[i], fontSize)
            widths[i] = textWidth;
        }
    }
    
    const d = font.embedder.__descenderAtHeight(fontSize);
    const offY = center.y - d + lineHeight*text.length * 0.5;

    for(let i = 0; i < text.length; i++) {
        page.drawText(text[i], {
            x: center.x - widths[i] * 0.5,
            y: offY - i*lineHeight - lineHeight,
            size: fontSize,
            font: font,
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
    this.remeasure = function(str, divs, font, bounds) {
        tried.push(divs)

        const tmpI = !bestI
        const tmp = objs[+tmpI]
        tmp.lineWidths.length = tmp.texts.length = tmp.width = tmp.height = tmp.fontSize = 0
        /*break text*/ {
            const offsets = [0, -1, 1, 2, -2, 3, -3, 4, -4, 5, -5]
            const lineLen =  Math.floor(str.length / divs)

            let prev = 0
            for(let i = 0; i < divs-1; i++) {
                const base = lineLen * (i+1)
                for(let j = 0; j < offsets.length; j++) {
                    const cur = base + offsets[j]
                    //no bounds checking and break bc we alternate indices
                    if(str[cur] !== ' ') continue;

                    tmp.texts.push(str.substring(prev, cur));
                    prev = cur+1;
                    break;
                }
            }
            tmp.texts.push(str.substring(prev));
        }

        /*calc sizes*/ {
            const fontSize = 10

            tmp.lineWidths.length = tmp.texts.length
            let maxWidth = 0
            for(let i = 0; i < tmp.texts.length; i++) {
                const textWidth = font.widthOfTextAtSize(tmp.texts[i], fontSize)
                tmp.lineWidths[i] = textWidth
                maxWidth = Math.max(maxWidth, textWidth);
            }
            const scaledHeight = Math.min(bounds.h / tmp.texts.length, font.heightAtSize(fontSize) * bounds.w / maxWidth);
            tmp.fontSize = font.sizeAtHeight(scaledHeight);

            const coeff = tmp.fontSize / fontSize
            for(let i = 0; i < tmp.lineWidths.length; i++) tmp.lineWidths[i] *= coeff
            tmp.width = maxWidth * coeff;
            tmp.height = tmp.texts.length * scaledHeight

            lastI = tmpI
            if(tmp.fontSize > objs[+bestI].fontSize) bestI = tmpI
        }
    }

    Object.defineProperty(this, 'best', { get: () => objs[+bestI] });
    Object.defineProperty(this, 'last', { get: () => objs[+lastI] });
})()

function fitTextBreakLines(str, font, size) {
    textBreak.reset()

    textBreak.remeasure(str, 1, font, size)

    for(let j = 0; j < 3; j++) {
        /*maximize text width*/ {
            const el = textBreak.last
            const scaledHeight = el.height * size.w / el.width;
            const fontSize = font.sizeAtHeight(scaledHeight);
            const divs = Math.max(1, Math.round(el.texts.length * Math.sqrt(size.h / scaledHeight)));
            if(textBreak.haveTried(divs)) break;
            else textBreak.remeasure(str, divs, font, size)
        }

        /*maximize text height*/ {
            const el = textBreak.last
            const scaledWidth = el.width * size.h / el.height;
            const divs = Math.max(1, Math.round(el.texts.length * Math.sqrt(scaledWidth / size.w)));
            const fontSize = font.sizeAtHeight(size.h / divs);
            if(textBreak.haveTried(divs)) break;
            else textBreak.remeasure(str, divs, font, size)
        }
    }

    const el = textBreak.best
    return [el.texts, el.fontSize, el.lineWidths]
}

function drawLessonText(lesson, secondWeek, page, font, coord, blockSize) {
    if(secondWeek && lesson.trim() !== '') page.drawRectangle({
        x: coord.x,
        y: coord.y,
        width: blockSize.w,
        height: -blockSize.h,
        borderColor: PDFLib.rgb(0, 0, 0),
        color: PDFLib.rgb(1, 1, 0),
        borderWidth: 2,
    })
    if(lesson.trim() !== '') {
        const t = lesson;
        const innerSize = { w: blockSize.w * 0.95, h: blockSize.h * 0.9 }
        const [text, fontSize, widths] = fitTextBreakLines(t, font, innerSize)

        drawTextCentered(
            text, page, font, fontSize, 
            { x: coord.x + blockSize.w*0.5, y: coord.y - blockSize.h*0.5 },
            widths
        );
    }

    page.drawRectangle({
        x: coord.x,
        y: coord.y,
        width: blockSize.w,
        height: -blockSize.h,
        borderColor: PDFLib.rgb(0, 0, 0),
        borderWidth: 2,
    })
}

function minuteOfDayToString(it) {
    return Math.floor(it/60) + ":" + (it%60).toString().padStart(2, '0')
}

function drawTime(lesson, page, font, coord, blockSize) {
    const innerSize = { w: blockSize.w*0.8, h: blockSize.h*0.9 }

    const texts = [
        minuteOfDayToString(lesson.sTime),
        "–",
        minuteOfDayToString(lesson.eTime)
    ];
    const textHeight = innerSize.w
    let fontSize = font.sizeAtHeight(textHeight);
    const widths = []
    let largestWidth = 0
    for(let i = 0; i < texts.length; i++) {
        const textWidth = font.widthOfTextAtSize(texts[i], fontSize)
        widths.push(textWidth)
        if(textWidth > largestWidth) largestWidth = textWidth;
    }

    const scaledHeight = Math.min(textHeight * innerSize.w / largestWidth, innerSize.h / texts.length);
    fontSize = font.sizeAtHeight(scaledHeight);

    const coeff = scaledHeight / textHeight;
    for(let i = 0; i < widths.length; i++) widths[i] *= coeff

    drawTextCentered(
        texts, page, font, fontSize, 
        { x: coord.x + blockSize.w*0.5, y: coord.y - blockSize.h*0.5 },
        widths
    );

    page.drawRectangle({
        x: coord.x,
        y: coord.y,
        width: blockSize.w,
        height: -blockSize.h,
        borderColor: PDFLib.rgb(0, 0, 0),
        borderWidth: 2,
    })
}


function drawLessons(lesson, page, font, coord, size) {
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

    if(eqh1 && eqh2 && eqv1 && eqv2) {
        drawLessonText(lesson.lessons[0], false, page, font, points[0], sizes[3])
    }
    else if(eqh1 || eqh2) {
        if(eqh1) drawLessonText(lesson.lessons[0], false, page, font, points[0], sizes[1])
        if(eqh2) drawLessonText(lesson.lessons[2], true, page, font, points[2], sizes[1])
    }
    else if(eqv1 || eqv2) {
        if(eqv1) drawLessonText(lesson.lessons[0], false, page, font, points[0], sizes[2])
        if(eqv2) drawLessonText(lesson.lessons[1], false, page, font, points[1], sizes[2])
    }
    else;

    if(!eqh1 && !eqv1) drawLessonText(lesson.lessons[0], false, page, font, points[0], sizes[0])
    if(!eqh1 && !eqv2) drawLessonText(lesson.lessons[1], false, page, font, points[1], sizes[0])
    if(!eqh2 && !eqv1) drawLessonText(lesson.lessons[2], true, page, font, points[2], sizes[0])
    if(!eqh2 && !eqv2) drawLessonText(lesson.lessons[3], true, page, font, points[3], sizes[0])
}
function drawLesson(lesson, page, font, coord, size, timeWidth) {
    drawTime(lesson, page, font, coord, { w: timeWidth, h: size.h })
    drawLessons(lesson, page, font, { x: coord.x + timeWidth, y: coord.y }, { w: size.w - timeWidth, h: size.h })
}

function drawDayOfWeek(dayI, page, font, coord, size) {
    let fontSize = font.sizeAtHeight(size.w * 0.9);
    const text = daysOfWeek[dayI]
    const largestWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize)
    const scaledHeight = Math.min(textHeight * 0.9 * size.h / largestWidth, size.w*0.95);
    const scaledWidth = largestWidth * scaledHeight / textHeight;
    fontSize = font.sizeAtHeight(scaledHeight);

    const d = font.embedder.__descenderAtHeight(fontSize);
    const offX = coord.x + d + textHeight + (size.w - textHeight) * 0.5;

    page.drawText(text, {
        x: offX,
        y: coord.y - size.h*0.5 - scaledWidth*0.5,
        size: fontSize,
        font: font,
        color: PDFLib.rgb(0, 0, 0),
        rotate: PDFLib.degrees(90)
    });
}

function drawDay(day, dayI, page, font, coord, groupSize) {
    const dayOfWeekWidth = groupSize.w*0.1;
    const size = { w: groupSize.w - dayOfWeekWidth, h: groupSize.h };
    const x = coord.x + dayOfWeekWidth;

    drawDayOfWeek(dayI, page, font, coord, { w: dayOfWeekWidth, h : groupSize.h*day.length })

    for(let i = 0; i < day.length; i++) {
        drawLesson(day[i], page, font, { x: x, y: coord.y - i*groupSize.h }, size, groupSize.w*0.1);
    }

    page.drawRectangle({
        x: coord.x,
        y: coord.y,
        width: groupSize.w,
        height: -groupSize.h * day.length,
        borderColor: PDFLib.rgb(0, 0, 0),
        borderWidth: 3,
    })
}

async function renderPDF(doc, width, type = 'image/png', quality = 1) {
    const pdfTask = pdfjsLib.getDocument(doc); try {
    const pdf = await pdfTask.promise
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: width / page.getViewport({scale:1}).width })

    const canvas = new OffscreenCanvas(
        Math.floor(viewport.width),
        Math.floor(viewport.height)
    )
    const context = canvas.getContext("2d");

    const renderContext = {
        canvasContext: context,
        transform: null, viewport,
    };
    
    await page.render(renderContext).promise;

    return await canvas.convertToBlob({ type, quality });
    } finally { await pdfTask.destroy() }
}

const url = 'times_new_roman.ttf' //local server required
const fontBytes = fetch(url).then(res => res.arrayBuffer()); 

async function getDocument() {
    const pdfDoc = await PDFLib.PDFDocument.create() /*
        we can't reuse the document and glyph cache because of 
        library issue: https://github.com/Hopding/pdf-lib/issues/1492
    */
    pdfDoc.registerFontkit(window.fontkit)

    const font = await pdfDoc.embedFont(await fontBytes, {subset:true});

    font.embedder.__descenderAtHeight = function(size, options) {
        if (options === void 0) { options = {}; }
        var _a = options.descender, descender = _a === void 0 ? true : _a;
        var _b = this.font, ascent = _b.ascent, descent = _b.descent, bbox = _b.bbox;
        var yTop = (ascent || bbox.maxY) * this.scale;
        var yBottom = (descent || bbox.minY) * this.scale;
        var height = yTop - yBottom;
        if (!descender)
            height -= Math.abs(descent) || 0;
        return yBottom/1000 * size;
    }

    return [pdfDoc, font]
}

async function scheduleToPDF(schedule, renderPattern, width, rowRatio) {
    const [height, groupSize] = calcSize(schedule, renderPattern, width, rowRatio);

    const [pdfDoc, font] = await getDocument()
    const page = pdfDoc.addPage([width, height])

    for(let i = 0; i < renderPattern.length; i++) {
        let curY = height;
    
        for(let j = 0; j < renderPattern[i].length; j++) { 
            const index = renderPattern[i][j];
            if(index == undefined || schedule[index] == undefined) continue;
            drawDay(schedule[index], index, page, font, { x: i*groupSize.w, y: curY }, groupSize);
            curY = curY - schedule[index].length * groupSize.h;
        }
    }

    return pdfDoc.save();
}

function readScheduleScheme(text) {
    const dowa = daysOfWeekShortenedLower
    text = text.split('\n')

    const scheme = []
    function appS(row, col, day) {
        if(col >= scheme.length) {
            for(let i = 0; i <= col - scheme.length; i++) scheme.push([])
        }
        const c = scheme[col]

        if(row >= c.length) {
            for(let i = 0; i <= row - c.length; i++) c.push([])
        }

        c[row] = day
    }

    for(let i = 0; i < text.length; i++) {
        const line = text[i].trim()
        const count = Math.floor(line.length+1)/3
        if(count*3-1 !== line.length) throw ['Неправильная строка расположения дней: `' + line + '`', '[строка] = ' + i + '/' + text.length]

        for(let j = 0; j < count; j++) {
            const sp = j*3;
            const p = line.substring(sp, sp+2).toLowerCase()

            if(p.trim() === '');
            else {
                let found = false;
                for(let k = 0; k < dowa.length; k++) {
                    if(dowa[k] === p) {
                        found = true;
                        appS(i, j, k)
                        break
                    }
                }
                if(!found) throw ['Неправильный день недели `' + p + '`  в строке: `' + line + '` на ' + (sp+1) + ':' +  i]
            }
        }
    }

    return scheme
}
