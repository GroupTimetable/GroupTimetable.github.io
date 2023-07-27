let origSchedule;
let origScheme;

{
    const prmstr = window.location.search.split("=");
    const sid = prmstr[1];
    if(sid) {
        const args = JSON5.parse(sessionStorage.getItem(sid));
        sessionStorage.removeItem(sid);
        origSchedule = args.schedule
        origScheme = args.scheme
    }
    else {
        origSchedule = [
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
        ]
        origScheme = [[0, 1, 2], [3, 4, 5]]
    }
}

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';

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

    if(h1 && h2 && v1 && v2) {
        a('все', 0)
    }
    else if(h1 || h2) {
        if(h1) a('обе - ч', 0)
        if(h2) a('обе - з', 2)
    }
    else if(v1 || v2) {
        if(v1) a('1 - обе', 0)
        if(v2) a('2 - обе', 1)
    }
    else;

    if(!h1 && !v1) a('1 - ч', 0)
    if(!h1 && !v2) a('2 - ч', 1)
    if(!h2 && !v1) a('1 - з', 2)
    if(!h2 && !v2) a('2 - з', 3)

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

    result += '"Расположение дней": [';
    for(let j = 0;; j++) {
        let line = ''
        for(let i = 0; i < origScheme.length; i++) {
            if(i !== 0) line += ' '
            if(origScheme[i][j] == undefined) line += '  '
            else line += daysOfWeekShortened[origScheme[i][j]]
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

document.getElementById('reset').addEventListener('click', function() {
    document.getElementById('edit-input').value = scheduleToSimple(origSchedule)
})

document.getElementById('edit-input').value = scheduleToSimple(origSchedule)

document.getElementById('create').addEventListener('click', async function() {
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

    const schemeSA = si['Расположение дней'] 
    let schemeS = ''
    for(let i = 0; i < schemeSA.length; i++) {
        schemeS += schemeSA[i] + '\n';
    }
    schemeS.substring(0, schemeS.length-1)

    const scheme = readScheduleScheme(schemeS) 

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

    const pdf = await scheduleToPDF(schedule, scheme, 1000)
    const outs = document.getElementById('outputs')
    const img = await renderPDF(copy(pdf), 250)
    createAndInitOutputElement(scheme, schedule, pdf, img, outs, '') 
}

