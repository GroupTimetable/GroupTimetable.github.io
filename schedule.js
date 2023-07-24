const daysOfWeek = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье"
]; 

function findItemBoundsH(cont, itemI) {
    const item = cont[itemI];
    const itemCenter = Math.abs(cont[itemI].transform[4] + cont[itemI].width/2);
    
    let neighbour;
    if(itemI-2 >= 0 && cont[itemI-1].str == ' ') neighbour = itemI-2;
    else if(itemI+2 < cont.length && cont[itemI+1].str == ' ') neighbour = itemI+2;
    else throw ["Невозможно определить вертикальные границы расписания", " [имя группы] = " + itemI + "/" + cont.length];

    const spacing = itemCenter - (cont[neighbour].transform[4] + cont[neighbour].width/2);

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

function topof(item) {
    return item.transform[5] + item.height;
}
function botof(item) {
    return item.transform[5];
}
function lefof(item) {
    return item.transform[4];
}
function rigof(item) {
    return item.transform[4] + item.width;
}

function findDaysOfWeekHoursBoundsV(cont) {
    const dow = Array(daysOfWeek.length);
    const hours = [];
    let curStart = 0;
    for(let i = 0; i < cont.length; i++) {
        for(let j = 0; j < daysOfWeek.length; j++) {
            if(cont[i].str !== daysOfWeek[j]) continue;
            if(dow[j] != undefined) throw ["День недели " + j + " обнаружен дважды", "[дубликат] = " + i + "/" + cont.length];

            dow[j] = { si: curStart, i: i };
            curStart = i+1;
            break;
        }

        if(i + 2 < cont.length) {
            const h = parseTime(cont[i].str);
            if(h != undefined) {
                const h2 = parseTime(cont[i+2].str);
                if(h2 != undefined) hours.push({ i: i, sTime: h, eTime: h2, items: [cont[i], cont[i+2]] });
            }
        }
    }

    for(let i = 0; i < hours.length; i++) {
        hours[i].top = topof(hours[i].items[0]);
        hours[i].bot = botof(hours[i].items[1]);
    }

    if(hours < 2) throw "В рассписании найдено меньше двух пар";
    let hoursSpacing = Math.abs(hours[0].top + hours[0].bot - hours[1].top - hours[1].bot) * 0.5;

    const info = Array(dow.length);
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
        const p = isVertical ? topof(l1[i]) : rigof(l1[i]);
        if(max1 == undefined || p > max1) max1 = p;
    }

    let min2;
    for(let i = 0; i < l2.length; i++) {
        const p = isVertical ? botof(l2[i]) : lefof(l2[i]);
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

    if((h1 || h2) && (v1 || v2)) {
        const e = lessons[0].concat(lessons[1]).concat(lessons[2]).concat(lessons[3]);
        lessons.fill(e);
    }
    else {
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
            let prevR = rigof(a[0]);
            for(let j = 1; j < a.length; j++) {
                const curL = lefof(a[j]);
                const curR = rigof(a[j]);
                res = res + " " + a[j].str;
                prevR = curR;
            }
            done.set(a, lessons[i] = res);
        }
    }
}


function makeSchedule(cont, vBounds, hBounds) {
    const schedule = Array(vBounds.length);

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
            const bi = botof(item), ti = topof(item); 
            const li = lefof(item), ri = rigof(item);
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

                const shouldL = itemM < ma;
                const shouldB = itemC < ca;

                if(il && ir && it && ib) curS[i].shouldMerge.fill(true);
                else {
                    if(il && ir) curS[i].shouldMerge[shouldB ? 1 : 0] = true;
                    if(it && ib) curS[i].shouldMerge[shouldL ? 2 : 3] = true;
                }

                const c = curS[i].lessons;
                const s = item;
                if(it && il && !shouldB &&  shouldL) c[0].push(s);
                if(it && ir && !shouldB && !shouldL) c[1].push(s);
                if(ib && il &&  shouldB &&  shouldL) c[2].push(s);
                if(ib && ir &&  shouldB && !shouldL) c[3].push(s);

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

    return schedule;
}


function calcSize(schedule, renderPattern, width) {
    let maxLessonsInCol;
    for(let i = 0; i < renderPattern.length; i++) {
        let maxCount = 0;
        for(let j = 0; j < renderPattern[i].length; j++) {
            const index = renderPattern[i][j];
            if(index === -1) continue;
            const day = schedule[index];
            maxCount += day.length;
        }
        if(maxLessonsInCol == undefined || maxCount > maxLessonsInCol) maxLessonsInCol = maxCount;
    }

    const height = width / renderPattern.length * maxLessonsInCol*(1 / 5.2);
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

function measureTexts(text, font, fontSize) {
    const widths = []

    let largestWidth;
    for(let i = 0; i < text.length; i++) {
        const textWidth = font.widthOfTextAtSize(text[i], fontSize)
        widths.push(textWidth)
        if(largestWidth == undefined || textWidth > largestWidth) {
            largestWidth = textWidth;
        }
    }
    const textHeight = font.heightAtSize(fontSize)

    return [largestWidth, textHeight * text.length, widths]
}

function divideTextEvenly(str, divs) {
    const out = []

    let prev = 0
    for(let i = 0; i < divs-1; i++) {
        const orig = Math.floor(str.length / divs * (i+1))
        for(let j = 0; j < 20; j++) {
            const cur = orig + Math.floor((j % 2 == 0) ? j*0.5 : -j*0.5)

            if(cur > prev && str[cur] === ' ') {
                out.push(str.substring(prev, cur));
                prev = cur+1;
                break;
            }
        }
    }

    out.push(str.substring(prev));

    return out
}

function fitTextBreakLines(str, font, size, iters = 5) {
    const tries = []
    const haveTried = function(divs) {
        for(let i = 0; i < tries.length; i++) if(tries[i].text.length === divs) return true;
        return false
    }
    const remeasure = function(text, fontSize) {
        const [tWidth, tHeight, widths] = measureTexts(text, font, fontSize)
        tries.push({ text: text, width: tWidth, height: tHeight, lineWidths: widths, fontSize: fontSize })
    }

    remeasure([str], font.sizeAtHeight(size.h))

    let fontSize = font.sizeAtHeight(size.h);
    for(let j = 0; j < iters; j++) {
        {
            const el = tries[tries.length-1]
            const scaledHeight = el.height * size.w / el.width;
            const nextLines = el.text.length * Math.sqrt(size.h / scaledHeight)
            const divs = Math.round(nextLines);
            const fontSize = font.sizeAtHeight(scaledHeight);
            if(haveTried(divs)) break;
            else {
                const text = divideTextEvenly(str, divs)
                remeasure(text, fontSize)
            }
            //console.log("a", structuredClone(text), nextLines, divs)
        }

        {
            const el = tries[tries.length-1]
            const scaledWidth = el.width * size.h / el.height;
            const nextLines = el.text.length * Math.sqrt(scaledWidth / size.w)
            const divs = Math.round(el.text.length * Math.sqrt(scaledWidth / size.w));
            fontSize = font.sizeAtHeight(size.h / divs);
            if(haveTried(divs)) break;
            else {
                const text = divideTextEvenly(str, divs)
                remeasure(text, fontSize)
            }

            //console.log("b", structuredClone(text), nextLines, divs)
        }
    }

    let maxSize, maxI
    for(let i = 0; i < tries.length; i++) {
        const tri = tries[i];

        const lineHeight = font.heightAtSize(tri.fontSize)
        const [tWidth, tHeight] = [Math.max(...tri.lineWidths), lineHeight*tri.text.length] 

        let scaledHeight = tri.height * size.w / tri.width;
        if(scaledHeight > size.h) scaledHeight = size.h;
        scaledHeight = scaledHeight / tri.text.length

        tri.actualFontSize = font.sizeAtHeight(scaledHeight);

        if(maxSize == undefined || tri.actualFontSize > maxSize) {
            maxSize = tri.actualFontSize
            maxI = i

            const coeff = tri.actualFontSize / tri.fontSize
            for(let i = 0; i < tri.lineWidths.length; i++) tri.lineWidths[i] *= coeff
        }
    }

    const el = tries[maxI]
    return [el.text, el.actualFontSize, el.lineWidths]
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

function drawTime(lesson, page, font, coord, blockSize) {
    const innerSize = { w: blockSize.w*0.8, h: blockSize.h*0.9 }

    const text = [
        Math.floor(lesson.sTime/60) + ":" + (lesson.sTime%60).toString().padStart(2, '0'),
        "–",
        Math.floor(lesson.eTime/60) + ":" + (lesson.eTime%60).toString().padStart(2, '0')
    ];
    let fontSize = font.sizeAtHeight(innerSize.w);
    const widths = []
    let largestWidth;
    for(let i = 0; i < text.length; i++) {
        const textWidth = font.widthOfTextAtSize(text[i], fontSize)
        widths.push(textWidth)
        if(largestWidth == undefined || textWidth > largestWidth) {
            largestWidth = textWidth;
        }
    }
    const textHeight = font.heightAtSize(fontSize)

    const scaledHeight = Math.min(textHeight * innerSize.w / largestWidth, innerSize.h);
    fontSize = font.sizeAtHeight(scaledHeight);

    const coeff = scaledHeight / textHeight;
    for(let i = 0; i < widths.length; i++) widths[i] *= coeff

    drawTextCentered(
        text, page, font, fontSize, 
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

    if((eqh1 || eqh2) && (eqv1 || eqv2)) {
        drawLessonText(lesson.lessons[0], false, page, font, points[0], sizes[3])
    }
    else {
        if(eqh1) drawLessonText(lesson.lessons[0], false, page, font, points[0], sizes[1])
        if(eqh2) drawLessonText(lesson.lessons[2], true, page, font, points[2], sizes[1])
        if(eqv1) drawLessonText(lesson.lessons[0], false, page, font, points[0], sizes[2])
        if(eqv2) drawLessonText(lesson.lessons[1], page, font, points[1], sizes[2])

        if(!eqh1 && !eqv1) drawLessonText(lesson.lessons[0], false, page, font, points[0], sizes[0])
        if(!eqh1 && !eqv2) drawLessonText(lesson.lessons[1], false, page, font, points[1], sizes[0])
        if(!eqh2 && !eqv1) drawLessonText(lesson.lessons[2], true, page, font, points[2], sizes[0])
        if(!eqh2 && !eqv2) drawLessonText(lesson.lessons[3], true, page, font, points[3], sizes[0])
    }
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

let fontkitV =  window.fontkit;

async function scheduleToPDF(schedule, renderPattern, width) {
    const [height, groupSize] = calcSize(schedule, renderPattern, width);

    const pdfDoc = await PDFLib.PDFDocument.create();
    pdfDoc.registerFontkit(fontkitV);
    const page = pdfDoc.addPage([width, height]);

    const url = 'https://fonts.cdnfonts.com/s/57197/times.woff' //cors ocrs ocrs cors cors cors cors cors cors cors cors cors ./font.ttf cors cors cors cors cors cors cors
    const fontBytes = await fetch(url).then(res => res.arrayBuffer()); 
    const font = await pdfDoc.embedFont(fontBytes, {subset:true});

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

    for(let i = 0; i < renderPattern.length; i++) {
        let curY = height;
    
        for(let j = 0; j < renderPattern[i].length; j++) { 
            const index = renderPattern[i][j];
            drawDay(schedule[index], index, page, font, { x: i*groupSize.w, y: curY }, groupSize);
            curY = curY - schedule[index].length * groupSize.h;
        }
    }

    return pdfDoc.save();
}
