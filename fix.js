let orig/*
    rowRatio, scheme, schedule, drawBorder, dowOnTop, dates,
    userdata, defaultWidth, borderFactor, filename
*/ = (_ => {
    try {
        const prmstr = window.location.search.split("=");
        const sid = prmstr[1];
        if(sid) {
            const p = JSON.parse(sessionStorage.getItem(sid));
            if(p == undefined) throw 'Не удалось получить расписание для редактирования'
            return p
        }
    }
    catch(e) {
        const st = document.getElementById('status')
        st.style.color = 'var(--error-color)'
        st.innerHTML = '' + e
        st.style.animation = 'none'
        st.offsetHeight
        st.style.animation = ''
    }

    return {
        schedule: [
            [
                {sTime: 510, eTime: 600, lessons: ['Общая пара', 'Общая пара', 'Общая пара', 'Общая пара', ]},
                {sTime: 620, eTime: 710, lessons: ['Пара 1 группы', 'Пара 2 группы', 'Пара 1 группы', 'Пара 2 группы']},
                {sTime: 730, eTime: 820, lessons: ['', '', '', '']},
                {sTime: 840, eTime: 930, lessons: ['Пара числителя', 'Пара числителя', 'Пара знаменателя', 'Пара знаменателя']},
                {sTime: 950, eTime: 1040, lessons: ['Числитель 1 группы', 'Числитель 2 группы', 'Знаменатель 1 группы', 'Знаменатель 2 группы']}
            ],
            [],[],
            [
                {sTime: 620, eTime: 710, lessons: ['', '', '', '']},
                {sTime: 730, eTime: 820, lessons: ['Числитель 1 группы', '', '', 'Знаменатель 2 группы']},
                {sTime: 840, eTime: 930, lessons: ['', '', '', '']}
            ],
            [],[],[]
        ],
        scheme: [[0, 1, 2], [3, 4, 5]],
        rowRatio: 0.19,
        userdata: ['new document', 'no group'],
        drawBorder: true,
        borderFactor: 0.01,
        dowOnTop: false,
        defaultWidth: 1000,
    }
})()

//pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';
pdfjsLib.GlobalWorkerOptions.workerPort = pdfjsWorker;

let collapsed = false;
const collapseContent = document.querySelector('#collapse-content')
const collapseButton = document.querySelector('#collapse-button')
addClick(collapseButton, _ => {
    collapsed = !collapsed;

    collapseButton.setAttribute('data-collapsed', collapsed)
    if(collapsed) {
        collapseContent.style.display = 'none';
    }
    else {
        collapseContent.style.display = '';
    }
})

function lessonToSimple(lesson, indent) {
    let result = ''

    const ll = lesson.lessons

    const h1 = ll[0] === ll[1]
    const h2 = ll[2] === ll[3]
    const v1 = ll[0] === ll[2]
    const v2 = ll[1] === ll[3]

    function a(key, index) {
        const value = ll[index]
        if(value.trim() === '') return
        result = result + '\n' + ' '.repeat(indent+4) + '"' + key + '": "' + value + '",';
    }

    const added = Array(4)
    if(h1 && h2 && v1 && v2) {
        a('все', 0)
    }
    else if(h1 || h2) {
        if(h1) a('обе - ч', 0)
        else added[0] = added[1] = true
        if(h2) a('обе - з', 2)
        else added[2] = added[3] = true
    }
    else if(v1 || v2) {
        if(v1) a('1 - обе', 0)
        else added[0] = added[2] = true
        if(v2) a('2 - обе', 1)
        else added[1] = added[3] = true
    }
    else added.fill(true)

    if(added[0]) a('1 - ч', 0)
    if(added[1]) a('2 - ч', 1)
    if(added[2]) a('1 - з', 2)
    if(added[3]) a('2 - з', 3)

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

    try {
        const d1 = new Date(orig.dates[0]), d2 = new Date(orig.dates[1]);
        let ds = '';

        function format(d) {
            return d.getUTCDate().toString().padStart(2, '0') + '.'
                + (d.getUTCMonth() + 1 + '').padStart(2, '0') + '.' + d.getUTCFullYear().toString().padStart(4, '0')
        }

        ds += '"Дата начала": "' + format(d1) + '",\n'
        ds += '"Дата конца": "' + format(d2) + '",\n'

        result += ds
    }
    catch(e) {
        console.error(e)
        result += '"Дата начала": "???",\n'
        result += '"Дата конца": "???",\n'
    }

    result += '"Граница дней заливкой": "' + (orig.drawBorder ? 'да' : 'нет') + '",\n'
    result += '"Дни недели наверху": "' + (orig.dowOnTop ? 'да' : 'нет') + '",\n'
    result += '"Размер границы дней": "' + (orig.borderFactor*1000) + '",\n'
    result += '"% высоты строки": "' + (orig.rowRatio*100) + '",\n'
    result += '"Расположение дней": [';
    for(let j = 0;; j++) {
        let line = ''
        for(let i = 0; i < orig.scheme.length; i++) {
            if(i !== 0) line += ' '
            if(orig.scheme[i][j] == undefined) line += '  '
            else line += daysOfWeekShortened[orig.scheme[i][j]]
        }
        if(line.trim() === '') break
        result += '\n' + ' '.repeat(4) + '"' + line + '",'
    }
    if(result.endsWith(',')) result = result.substring(0, result.length-1)
    result += '\n],\n'


    for(let i = 0; i < 7; i++) {
        result += '"' + daysOfWeek[i] + '": ' + dayToSimple(schedule[i], 0) + '\n'
    }

    result = result.substring(0, result.length-2)

    return result;
}

window.updateUserdataF ??= () => () => { console.error('no function defined') }

addClick(document.getElementById('reset'), function() {
    document.getElementById('edit-input').value = scheduleToSimple(orig.schedule)
})

document.getElementById('edit-input').value = scheduleToSimple(orig.schedule)

addClick(document.getElementById('create'), async function() {
    try{ await processEdit() }
    catch(e) {
        let str = ''
        if(Array.isArray(e)) {
            console.error('ERROR')
            for(let i = 0; i < e.length; i++) {
                console.error(e[i])
                if(i !== 0) str += ', '
                str += e[i]
            }
            console.error('RORRE')
        }
        else {
            console.error(e)
            str += e
        }

        const st = document.getElementById('status')
        st.style.color = 'var(--error-color)'
        st.innerHTML = str
        st.style.animation = 'none'
        st.offsetHeight
        st.style.animation = ''
        return;
    }

    const st = document.getElementById('status')
    st.style.color = ''
    st.innerHTML = 'Готово'
    st.style.animation = 'none'
    st.offsetHeight
    st.style.animation = ''
})

async function jsonToSchedule(si) {
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

    return schedule;
}

async function processEdit() {
    const text = '{' + document.getElementById('edit-input').value + '}'
    let si
    try { si = JSON5.parse(text); }
    catch(e) {
        throw ['Не удалось прочитать изменения', e]
    }

    const rowRatioS = si['% высоты строки']
    const rowRatio = Number(rowRatioS) / 100
    if(!(rowRatio < 1000 && rowRatio > 0.001)) throw 'неправильное значение % высоты строки: `' + rowRatioS + '`'
    const drawBorder = (si["Граница дней заливкой"] || '').trim().toLowerCase() !== 'нет'
    const dowOnTop = (si["Дни недели наверху"] || '').trim().toLowerCase() === 'да'
    const borderFactorS = si["Размер границы дней"]
    const borderFactor = Number(borderFactorS) / 1000
    if(!(borderFactor < 1000 && borderFactor >= 0)) throw 'неправильное значение размера границы: `' + borderFactorS + '`'
    const startDate = parseDate(si["Дата начала"])
    const endDate   = parseDate(si["Дата конца"])

    const schemeSA = si['Расположение дней']
    let schemeS = ''
    for(let i = 0; i < schemeSA.length; i++) {
        schemeS += schemeSA[i] + '\n';
    }
    schemeS.substring(0, schemeS.length-1)

    const scheme = readScheduleScheme(schemeS)

    let schedule;

    const schedule0 = si['__schedule'];
    if(schedule0 != undefined) schedule = schedule0
    else schedule = await jsonToSchedule(si)

    const params = structuredClone(orig)
    if(startDate != undefined) params.dates[0] = startDate
    if(endDate != undefined) params.dates[1] = endDate

    const renderer = createRecorderRenderer(createCanvasRenderer());
    const editParams = { rowRatio, borderFactor, drawBorder, dowOnTop }
    await renderSchedule(renderer, schedule, scheme, editParams)
    const commands = renderer.commands;
    const defaultImgP = renderer.innerRenderer.canvas[1]();

    try { updateUserdataF('regDocumentEdited')(...params.userdata) } catch(e) {}
    const outs = document.getElementById('outputs')

    await createAndInitOutputElement(
        renderer.width, renderer.height,
        defaultImgP, commands,
        outs, { hideName: 1, nameS: orig.filename },
        params, params.userdata,
    );
}

