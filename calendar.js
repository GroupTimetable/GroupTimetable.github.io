const warningText = document.querySelector('.warning-text');

const params = (_ => { 
    try {
        const prmstr = window.location.search.split("=");
        const sid = prmstr[1];
        if(sid) {
            const p = JSON.parse(sessionStorage.getItem(sid));
            if(p != undefined) return p
        }
        throw 'Не удалось получить расписание для редактирования'
    }
    catch(e) {
        console.error(e)
        warningText.style = 'color: var(--error-color);';
        warningText.innerText = e.toString()
    }
}
)()

const firstWeekEl = document.querySelector('#first-week')
const startDateEl = document.querySelector('#start-date')
const lastDateEl = document.querySelector('#end-date')

startDateEl.value = dateToStr(new Date(params.dates[0]))
lastDateEl.value = dateToStr(new Date(params.dates[1]))

document.querySelector('#file1').addEventListener('click', () => {
    saveDoc(true, '_1группа')
})

document.querySelector('#file2').addEventListener('click', () => {
    saveDoc(false,  '_2группа')
})

function dateToStr(date) {
    return date.getUTCDate().toString().padStart(2, '0')
        + '.' + (date.getUTCMonth()+1).toString().padStart(2, '0')
        + '.' + date.getUTCFullYear().toString().padStart(4, '0')
}

function parseDate(str) {
    const dateRegex = /^(\d\d)\.(\d\d)\.(\d\d\d\d)$/
    const r = str.match(dateRegex)
    if(!r) return
    const d = r[1], m = r[2], y = r[3];
    
    const date = new Date(y, m-1, d)
    if(date instanceof Date && isFinite(date)) return date;
}

function saveDoc(firstGroup, filename) {
    try {
        const d1 = parseDate(startDateEl.value)
        const d2 = parseDate(lastDateEl.value)

        if(d1 == undefined || d2 == undefined) {
            warningText.style = 'color: var(--error-color);';
            warningText.innerText = "Ошибка, неправильный формат даты"
            return
        }

        const [str, warn] = scheduleToICS(params.schedule, params.dates, params.scheme, !firstWeekEl.checked, firstGroup)
        if(warn) {
            warningText.style = 'color: var(--hint-color);';
            warningText.innerText = "Внимание: в расписании обнаружены пары, длящиеся не весь семестр, но в "
                + "экспортированном расписании они будут длиться столько же, сколько и все остальные пары."
        }
        const arr = new TextEncoder('utf-8').encode(str)
        const blob = new Blob([arr], { type: 'text/calendar' })

        download(blob, params.filename + filename)

        try { try {
            updateUserdataF('regDocumentUsed')(...params.userdata, 'cld')
        } catch(e) { console.error(e) } } catch(e) {}
    }
    catch(e) {
        try { try {
             updateUserdataF('regDocumentUseError')(...params.userdata, 'cld')
        } catch(e) { console.error(e) } } catch(e) {}
        warningText.style = 'color: var(--error-color);';
        warningText.innerText = 'Ошибка: ' + e;
        console.error(e)
    }
}


function dateToICS(date, absolute) {
    return date.getUTCFullYear().toString().padStart(4, '0') + (date.getUTCMonth()+1).toString().padStart(2, '0')
        + date.getUTCDate().toString().padStart(2, '0') + 'T' + date.getUTCHours().toString().padStart(2, '0')
        + date.getUTCMinutes().toString().padStart(2, '0') + date.getUTCSeconds().toString().padStart(2, '0')
        + (absolute ? 'Z' : '')
}

function scheduleToICS(schedule, dates, scheme, firstWeekIsFirst/*first calendar week = first schedule week*/, isFirstGroup) {
    const warnRegex = /\d+?\sнед..*?\d+?/

    let warn = false
    const lessonOff = isFirstGroup ? 0 : 1;
    let ics = ''

    function line(str) {
        //TODO: 75 bytes limit to be standard-compliant
        ics += str + '\r\n'
    }

    line('BEGIN:VCALENDAR')
    line('VERSION:2.0')
    line('PRODID:-//Bob//vanaigr.github.io//EN')
    line('CALSCALE:GREGORIAN')
    line('METHOD:PUBLISH')
    //some of these will hopefully work
    line('X-WR-TIMEZONE:/Europe/Moscow')
    line('X-LIC-LOCATION:/Europe/Moscow')
    line('TZID:/Europe/Moscow')

    const now = dateToICS(new Date(), true)

    const until0 = new Date(dates[1])
    until0.setHours(23)
    until0.setMinutes(59)
    until0.setSeconds(59)
    const until = dateToICS(until0)

    const dow0 = 'MOTUWETHFRSASU' 
    const startDOW = new Date(dates[0]).getUTCDay()

    function addLesson(startMins, endMins, dayOfWeek, interval, firstWeek, uid, summary) {
        if(!warn && summary.match(warnRegex)) warn = true;
        const start = new Date(dates[0]) 
        const currentDay = start.getUTCDay();
        const distance = (dayOfWeek+1 + 7 - currentDay) % 7;
        start.setUTCDate(start.getUTCDate() + distance);

        const onNextCalendarWeek = start.getUTCDay() < startDOW;
        const onFirstScheduleWeek = onNextCalendarWeek ^ firstWeekIsFirst;
        if(firstWeek != undefined && onFirstScheduleWeek ^ firstWeek) start.setUTCDate(start.getUTCDate() + 7)

        const end = new Date(start)
        start.setUTCHours(0, startMins)
        end.setUTCHours(0, endMins)

        const dow = dow0.substring(dayOfWeek*2).substring(0, 2)

        line('BEGIN:VEVENT')
        line('DTSTART;TZID=/Europe/Moscow:' + dateToICS(start))
        line('DTEND;TZID=/Europe/Moscow:' + dateToICS(end))
        //UNTIL is not correct bc there is no? way to specify timezone for it
        line(`RRULE:FREQ=WEEKLY;WKST=SU;UNTIL=${until};INTERVAL=${interval};BYDAY=${dow}`)
        line('CREATED:' + now)
        line('DTSTAMP:' + now)
        line('UID:' + uid + '@vanaigr.github.io') 
        line('SEQUENCE:0')
        line('STATUS:CONFIRMED')
        line('SUMMARY:' + summary)
        line('END:VEVENT')
    }

    const prevDayI = []

    for(let i = 0; i < scheme.length; i++) for(let j = 0; j < scheme[i].length; j++) {
        const dayI = scheme[i][j];
        const day = schedule[dayI];

        if(prevDayI.includes(dayI)) continue;
        prevDayI.push(dayI)

        for(let j = 0; day && j < day.length; j++) {
            const lesson = day[j]
            const l1 = lesson.lessons[lessonOff]
            const l2 = lesson.lessons[lessonOff + 2]
            if(l1 === l2 && l1.trim() !== '') addLesson(
                lesson.sTime, lesson.eTime, 
                dayI, 1, undefined, 'D'+dayI+'L'+j+'G'+(isFirstGroup ? 1 : 2)+'T'+0,
                l1
            )
            else {
                if(l1.trim() !== '') addLesson(
                    lesson.sTime, lesson.eTime, 
                    dayI, 2, true, 'D'+dayI+'L'+j+'G'+(isFirstGroup ? 1 : 2)+'T'+1,
                    l1
                )
                if(l2.trim() !== '') addLesson(
                    lesson.sTime, lesson.eTime, 
                    dayI, 2, false, 'D'+dayI+'L'+j+'G'+(isFirstGroup ? 1 : 2)+'T'+2,
                    l2
                )
            }
        }
    }

    line('END:VCALENDAR')

    return [ics, warn]
}
