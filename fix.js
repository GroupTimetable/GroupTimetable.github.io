let origSchedule;

let daysScheme = [[0, 1, 2], [3, 4]]

{
    const prmstr = window.location.search.split("=");
    const sid = prmstr[1];
    const args = JSON5.parse(sessionStorage.getItem(sid));
    sessionStorage.removeItem(sid);
    origSchedule = args.schedule
}

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';

function lessonToSimple(lesson, indent) {
    let result = ''

    const ll = lesson.lessons

    const h1 = ll[0] === ll[1]
    const h2 = ll[2] === ll[3]
    const v1 = ll[0] === ll[2]
    const v2 = ll[1] === ll[3]

    function a(key, value) { result = result + '\n' + ' '.repeat(indent+4) + '"' + key + '": "' + value + '",'; }

    if(h1 && h2 && v1 && v2) {
        if(ll[0].trim() !== '') a('все', ll[0])
    }
    else {
        if(ll[0].trim() !== '') {
            if(h1) a('обе - ч', ll[0])
            else if(!h2 && v1) a('1 - обе', ll[0])
            else a('1 - ч', ll[0])
        }
        
        if(ll[1].trim() !== '') {
            if(h1); 
            else if(!h2 && v2) a('обе - 2', ll[1])
            else a('2 - ч', ll[1])
        }
        
        if(ll[2].trim() !== '') {
            if(h2) a('обе - з', ll[2])
            else if(v2) a('2 - обе', ll[2])
            else a('1 - з', ll[2])
        }
        
        if(ll[3].trim() !== '') {
            if(h2);
            else if(v2);
            else a('2 - з', ll[3])
        }
    }

    if(result.length === 0) return '{},'

    result = '{' + result.substring(0, result.length-1);
    result += '\n' + ' '.repeat(indent) + '},'
    return result;
}
function dayToSimple(day, indent) {
    let result = ''

    for(let i = 0; day && i < day.length; i++) {
        const l = day[i];
        result += '\n' + ' '.repeat(indent+4) + '"' + minuteOfDayToString(l.sTime) + '-' + minuteOfDayToString(l.eTime) + '": '
            + lessonToSimple(l, indent+4)
    }

    if(result.length === 0) return '{},'

    result = '{' + result.substring(0, result.length-1)
    result += '\n' + ' '.repeat(indent) + '},'
    return result;
}
function scheduleToSimple(schedule) {
    let result = '';

    for(let i = 0; i < 7; i++) {
        result += '"' + daysOfWeek[i] + '": ' + dayToSimple(schedule[i], 0) + '\n'
    }

    result = result.substring(0, result.length-2)

    return result;
}

document.getElementById('reset').addEventListener('click', function() {
    document.getElementById('edit-input').value = scheduleToSimple(origSchedule)
})

document.getElementById('edit-input').value = scheduleToSimple(origSchedule)

document.getElementById('create').addEventListener('click', async function() {
    try{ await processEdit() }
    catch(e) {
        let str = ''
        if(Array.isArray(e)) {
            for(let i = 0; i < e.length; i++) {
                if(i !== 0) str += ', '
                str += e[i]
            }
        }
        else str += e

        const st = document.getElementById('status')
        st.style.color = 'red'
        st.innerHTML = '' + e
        return;
    }

    const st = document.getElementById('status')
    st.style.color = ''
    st.innerHTML = 'Готово'
})

async function processEdit() {
    const text = '{' + document.getElementById('edit-input').value + '}'
    let si
    try { si = JSON5.parse(text); } 
    catch(e) {
        throw ['Не удалось прочитать изменения', e]
    }

    const schedule = new Array(7)

    for(let i = 0; i < daysOfWeek.length; i++) {
        const day = si[daysOfWeek[i]]
        if(day == undefined) continue;

        try{

        const sDay = []
        for(const time in day) {
            const split = time.indexOf('-')
            const sTime = parseTime(time.substring(0, split))
            const eTime = parseTime(time.substring(split+1))

            if(sTime == undefined || eTime == undefined) {
                throw ['Неправильный формат времени: ' + time]
            }

            const ls = new Array(4)
            ls.fill('')
            for(const type in day[time]) {
                const l = day[time][type]

                const s = type.substring(0,1)
                const f = type.substring(type.length-1).toLowerCase()
                const g1 = s === '1'
                const g2 = s === '2'
                const w1 = f === 'ч'
                const w2 = f === 'з'

                if(g1 && w1) ls[0] = l 
                else if(g2 && w1) ls[1] = l 
                else if(g1 && w2) ls[2] = l 
                else if(g2 && w2) ls[3] = l 
                else if(g1) ls[0] = ls[2] = l
                else if(g2) ls[1] = ls[3] = l
                else if(w1) ls[0] = ls[1] = l
                else if(w2) ls[2] = ls[3] = l
                else ls.fill(l)
            }

            sDay.push({ sTime, eTime, lessons: ls })
        }

        sDay.sort((a, b) => a.sTime - b.sTime)

        if(sDay.length !== 0) schedule[i] = sDay

        }
        catch(e) {
            const add = '[номер дня] = ' + i + '/' + daysOfWeek.length
            if(Array.isArray(e)) { e.push(add); throw e }
            else throw [e, add]
        }
    }

    const pdf = await scheduleToPDF(schedule, daysScheme, 1000)

    const width = 250
    const element = createOutputElement()
    element.image.src = URL.createObjectURL(await renderPDF(copy(pdf), width))

    const outs = document.getElementById('outputs')
    outs.appendChild(element.element)

    element.viewPDF.addEventListener('click', function() {
        var fileURL = window.URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
        let tab = window.open();
        tab.location.href = fileURL;
    })
    element.del.addEventListener('click', function() {
        outs.removeChild(element.element)
    })
    element.downloadImg.addEventListener('click', async function() {
        const blob = await renderPDF(copy(pdf), 1000)
        download(blob, outFilename + '.png')
    })
    element.edit.addEventListener('click', function() {
        var parms = JSON.stringify({ schedule: schedule });
        var storageId = "parms" + String(Date.now());
        sessionStorage.setItem(storageId, parms);
        window.open("./fix.html" + "?sid=" + storageId);
    })
}

//https://stackoverflow.com/a/22114687/18704284
function copy(src) {
    var dst = new ArrayBuffer(src.byteLength);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
}
