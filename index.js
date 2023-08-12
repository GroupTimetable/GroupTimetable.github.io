const dom = {}
loadDom.then(_ => {
    const qs = document.getElementById.bind(document)

    dom.groupInputEl = qs('group-input') 
    dom.startButtonEl = qs('start-button')
    dom.groupBarEl = qs('group-bar')
    dom.moveWithBorderEls = document.body.querySelectorAll('.move-with-border')
    dom.progressBarEl = qs('progress-bar')
    dom.statusEl = qs('status')
    dom.warningEl = qs('warning')
    dom.filenameEl = qs('filename')
    dom.outputsEl = qs('outputs')
    dom.dataAccept = qs('data-acc')
    dom.dataDecline = qs('data-dec')
    dom.dataUsageOpen = qs('open-data-usage')
    dom.dropZoneEl = qs('drop-zone')
})

Promise.all([loadDom, loadUserdata]).then(_ => {
    let messageInteracted;
    try { messageInteracted = localStorage.getItem('index__userdata_interacted') } catch(e) { console.error(e) }

    function updateInteracted() {
        messageInteracted = true;
        try { localStorage.setItem('index__userdata_interacted', true) } catch(e) { console.error(e) }
    }

    function updateVisibility(open, accepted) {
        dataAccept  .setAttribute('data-visible', open && accepted)
        dataDecline .setAttribute('data-visible', open && !accepted)
        dataUsageOpen.setAttribute('data-visible', !open)
        dataUsageOpen.setAttribute('data-usage-accepted', accepted)
    }

    function updateUserdataElements(open, accepted) {
        dataAccept.setAttribute('data-transition', '')
        dataDecline.setAttribute('data-transition', '')
        dataUsageOpen.setAttribute('data-transition', '')
        updateVisibility(open, accepted)
    }


    const { dataAccept, dataDecline, dataUsageOpen } = dom

    dataAccept.querySelector('.close-button').addEventListener('click', _ => {
        updateUserdataElements(false, getUserdataAllowed())
        updateInteracted()
    })
    dataDecline.querySelector('.close-button').addEventListener('click', _ => {
        updateUserdataElements(false, getUserdataAllowed())
        updateInteracted()
    })

    dataUsageOpen.addEventListener('click', _ => {
        updateUserdataElements(true, getUserdataAllowed())
        updateInteracted()
    })

    dataAccept.querySelector('span').addEventListener('click', _ => {
        window.setUserdataAllowed(false)
        updateUserdataElements(false, false)
        updateInteracted()
    })
    dataDecline.querySelector('span').addEventListener('click', _ => {
        window.setUserdataAllowed(true)
        updateUserdataElements(false, true)
        updateInteracted()
    })

    if(!messageInteracted) updateVisibility(true, getUserdataAllowed())
    else updateVisibility(false, getUserdataAllowed())
})

/*HTML does not have any way to make resizable multiline prompt
the only other option, namely contentEditable=true, has a number of fields for reading text, none of which work:
  textContent - ignores line breaks,
  innerText - doesn't read when the element is hidden (nice)  https://stackoverflow.com/a/43740154/18704284
  innerHTML - returns <br> and $nbsp; and God knows what else

  the idea behind this div is simple, we will use visible element + innerText, and I hope it won't break bc of height 0*/
let innerTextHack
Promise.all([loadDom, loadCommon]).then(_ => {
    innerTextHack = document.body.appendChild(htmlToElement(`<div style="position: absolute; width: 0px; height: 0px; top: 0; left: 0; transform: scale(0);"></div>`))
})

let currentFilename, currentFileContent;
let currentPending, processing;

let prevProgress
let curStatus = {};

const genSettings = {}
const createGenSettings = Promise.all([loadDom, loadCommon, loadPopups]).then(_ => {
    const genPopupHTML = htmlToElement(`
<div>
    <div style="margin-bottom: 0.6rem;">Расположение дней:</div>
    <div class="days-scheme" contenteditable="true" style="border:none;outline:none; border-bottom: 1px solid white;
        white-space: nowrap; width: 100%; min-height: 1rem; display: inline-block; font-family: monospace; font-size: 1.0rem">
        пн чт<br>вт пт<br>ср сб
    </div>

    <div style="display: flex; margin-top: 0.9em; gap: 0.2em;">
        <div class="gen-settings-switch gen-settings-prev no-select">
            <div><svg xmlns="http://www.w3.org/2000/svg" viewBox="-.2 -.2 1.4 1.4"><path d="M0 .75L.5 .25L1 0.75"></path></svg></div>
        </div>

        <div style="display: grid; grid-template-columns: auto auto">
            <span style="text-align: right;">Высота&nbsp;строки:</span>
            <span style="display: flex;align-items: baseline;">
                &nbsp;
                <input class="height-input" type="number" style="
                    text-align: right; font-size: 1rem;
                    color: white; border-bottom: 0.1rem solid white;
                    padding: 0; padding-right: 0.1em;" max="6" min="0">
                %
            </span>

            <span style="text-align: right; margin-top: 0.9em;">Граница&nbsp;дней:</span>
            <span style="display: flex;align-items: baseline;margin-top: 0.9em;">
                &nbsp;
                <input class="border-input" type="number" style="
                    text-align: right; font-size: 1em; color: white;
                    border-bottom: 0.1rem solid white;
                    padding: 0; padding-right: 0.1em;
                    " max="6" min="0">
                ‰
            </span>

            <span style="text-align: right; margin-top: 0.6em;">Цвет:</span>
            <span class="no-select" style="display: flex; margin-top: 0.6em;">
                &nbsp;<div class="border-color" style="cursor: pointer; border-bottom: 0.1rem solid var(--primary-contrast-color);"></div>
             </span>

            <span style="text-align: right; margin-top: 0.9em">Расположение дней недели:</span>
            <span class="no-select" style="display: flex;align-items: end;margin-top: 0.9em;">
                &nbsp;<div class="dow-position" style="cursor: pointer; border-bottom: 0.1rem solid var(--primary-contrast-color);"></div>
            </span>
       </div>

        <div class="gen-settings-switch gen-settings-next no-select">
            <div><svg xmlns="http://www.w3.org/2000/svg" viewBox="-.2 -.2 1.4 1.4"><path d="M0 .75L.5 .25L1 0.75"></path></svg></div>
        </div>
</div>
    `)

    genSettings.popupEl = genPopupHTML
    genSettings.scheduleLayoutEl = genPopupHTML.querySelector('.days-scheme') 
    genSettings.heightEl = genPopupHTML.querySelector('.height-input')
    genSettings.borderSizeEl = genPopupHTML.querySelector('.border-input')
    genSettings.borderColorEl = genPopupHTML.querySelector('.border-color')
    genSettings.dowPositionEl = genPopupHTML.querySelector('.dow-position')

    const savedSettings = [
        [(1/5.2 * 100).toFixed(2),  '8', true, false],
        [(1/5.2 * 100).toFixed(2), '20', false, true],
    ]
    let curSettings = 0;

    function updBorderCol(value) { 
        genSettings.drawBorder = value
        genSettings.borderColorEl.innerText = value ? 'чёрный' : 'никакой'
    }
    function updDowOnTop(value) {
        genSettings.dowOnTop = value
        genSettings.dowPositionEl.innerText = value ? 'сверху' : 'сбоку'
    }
    function updHeight(value) {
        genSettings.heightEl.value = value
    }
    function updBorderSize(value) {
        genSettings.borderSizeEl.value = value
    }
    function setFromSettings() {
        const s = savedSettings[curSettings]
        updHeight(s[0])
        updBorderSize(s[1])
        updBorderCol(s[2])
        updDowOnTop(s[3])
    }
    function updSettings(newSettings) {
        const s = savedSettings[curSettings]
        s[0] = genSettings.heightEl.value
        s[1] = genSettings.borderSizeEl.value
        s[2] = genSettings.drawBorder
        s[3] = genSettings.dowOnTop
        if(newSettings === -1) curSettings = savedSettings.length - 1
        else if(newSettings === savedSettings.length) curSettings = 0
        else curSettings = newSettings
        setFromSettings()
    }

    genSettings.borderColorEl.addEventListener('click', () => {
        updBorderCol(!genSettings.drawBorder)
    })
    genSettings.dowPositionEl.addEventListener('click', () => {
        updDowOnTop(!genSettings.dowOnTop)
    })
    genPopupHTML.querySelector('.gen-settings-prev').addEventListener('click', () => {
        updSettings(curSettings-1)
    })
    genPopupHTML.querySelector('.gen-settings-next').addEventListener('click', () => {
        updSettings(curSettings+1)
    })

    setFromSettings()
})

Promise.all([loadDom, loadElements, loadPopups, createGenSettings]).then(_ => {
    const settingsEl = document.querySelector('#generation-settings')
    const genPopupEl = insertPopup(settingsEl)
    const genPopupId = registerPopup(genPopupEl)
    genPopupEl.popup.appendChild(genSettings.popupEl)
    popupAddHoverClick(genPopupId, settingsEl.firstElementChild, (pressed) => settingsEl.setAttribute('data-pressed', pressed))
})

function hideOverlay() {
    assertDep('dom')
    dom.dropZoneEl.style.visibility = 'hidden'
    dom.dropZoneEl.style.opacity = 0
}

function showOverlay() {
    assertDep('dom')
    dom.dropZoneEl.style.visibility = ''
    dom.dropZoneEl.style.opacity = 1
}

/*drag and drop*/ {
    let lastTarget
    window.addEventListener("dragenter", function(event) {
        event.preventDefault()
        lastTarget = event.target
        showOverlay()
    })

    window.addEventListener('dragleave', function(event) {
        event.preventDefault()
        if(event.target === lastTarget || event.target === document) hideOverlay()
    })

    window.addEventListener("dragover", function (e) {
        e.preventDefault();
    });

    window.addEventListener('drop', function(ev) { 
        ev.preventDefault();
        hideOverlay()
        loadFromListFiles(ev.dataTransfer.files)
    })
}

function checkShouldProcess() {
    if(processing) return;
    if(!currentPending) return;

    resetStage()
    if(currentFileContent == undefined) {
        updInfo({ msg: 'Для продолжения требуется файл расписания', type: 'pending' })
        return
    }
    const name = dom.groupInputEl.value.trim()
    if(name == '') {
        updInfo({
            msg: 'Для продолжения введите имя группы (имгр123 и т.п.) и нажмите <span style="color: var(--hint-color)">Enter</span>', 
            type: 'pending'
        })
        return
    }

    processing = true;

    var startTime = performance.now()
    processPDF().finally(() => {
        var endTime = performance.now()
        console.log(`call took ${endTime - startTime} milliseconds`)
        updatePending(false);
        processing = false;
    })
}

function updatePending(newValue) {
    assertDep('dom')
    currentPending = newValue;
    if(!currentPending && curStatus.level === 'info'
        && (curStatus.type == undefined || curStatus.type === 'pending')
    ) updInfo({ msg: '', type: 'pending' })
    if(currentPending) dom.startButtonEl.setAttribute('data-pending', '')
    else dom.startButtonEl.removeAttribute('data-pending')
    checkShouldProcess()
}

loadDom.then(_ => {
    dom.groupInputEl.addEventListener('blur', e => {
        if(processing) return
        checkShouldProcess() 
    })
    dom.groupInputEl.addEventListener('keypress', e => {
        if(processing) return
        if (e.key === "Enter") updatePending(true)
    })
    dom.startButtonEl.addEventListener('click', _ => {
        if(processing) return;
        updatePending(!currentPending)
    })

    new ResizeObserver(() => resizeProgressBar(curStatus.progress, true)).observe(dom.groupBarEl)

    document.querySelector('#file-picker').addEventListener('click', function() {
        pickFile(e => loadFromListFiles(e.target.files))
    })

    resetStage()
    updatePending(true)
})

function resizeProgressBar(progress, immediately) {
    assertDep('dom')
    const w = dom.groupBarEl.offsetWidth
    const b = dom.groupBarEl.offsetHeight * 0.5 

    if(progress < 0 || progress > 1) {
        console.error('progress out of bounds', progress)
        progress = Math.min(Math.max(progress, 0), 1)
    }

    dom.moveWithBorderEls.forEach(it => it.style.marginRight = it.style.marginLeft = b + 'px')

    let newW;
    if(progress === undefined) newW = 0;
    else if(progress === 1) newW = w;
    else newW = progress * (w - 2*b) + b;
    //https://stackoverflow.com/a/21594219/18704284
    dom.progressBarEl.setAttribute('data-transition', !immediately)
    dom.progressBarEl.style.width = newW + 'px'
}

function resetStage() {
    curStatus = { level: 'info' }
    updStatus()
}

function updStatus() { try {
    assertDep('dom')
    const s = curStatus

    const { progressBarEl, statusEl, warningEl } = dom

    if(s.level === 'error') {
        progressBarEl.style.backgroundColor = 'var(--error-color)'
        if(prevProgress !== s.progress) resizeProgressBar(s.progress)

        statusEl.innerHTML = "Ошибка: " + s.msg
        statusEl.style.color = 'var(--error-color)'
        statusEl.style.opacity = 1
    }
    else if(s.level === 'info') {
        progressBarEl.style.backgroundColor = 'var(--primary-color)'
        if(prevProgress !== s.progress) resizeProgressBar(s.progress)

        if(!s.msg || s.msg.trim() === '') { 
            statusEl.innerHTML = '\u200c'
            statusEl.style.opacity = 0
        }
        else {
            statusEl.innerHTML = s.msg
            statusEl.style.color = 'var(--text-color)'
            statusEl.style.opacity = 1
        }
    }
    else throw "Неизвестный уровень статуса: `" + s.level + "`"

    if(!s.warning || s.warning.trim() === '') {
        warningEl.innerHTML = ''
        warningEl.style.display = 'none'
    }
    else {
        warningEl.style.display = ''
        warningEl.innerHTML = s.warning
        warningEl.style.opacity = 1
    }

} finally { prevProgress = curStatus.progress } }

function updIfndef(obj, prop, value) {
    if(!obj.hasOwnProperty(prop)) obj[prop] = value
}
function updError(statusParams) {
    statusParams.level = 'error'
    updIfndef(statusParams, 'progress', curStatus.progress)
    curStatus = statusParams
    updStatus()
}

function updInfo(statusParams) {
    statusParams.level = 'info'
    curStatus = statusParams
    updStatus()
}

function nameFixup(name) {
    const alphanumeric = /[\p{L})\p{N}]/u

    let newName = ''
    for(let i = 0; i < name.length; i++) {
        let a = name[i]
        if(alphanumeric.test(a)) newName += a.toLowerCase()
    }
    if(newName.length === 0) return name
    else return newName;
}

async function loadFromListFiles(list) {
    if(list.length === 0) {
        //if you drop files fast enough sometimes files list would be empty
        updError({ msg: 'Не удалось получить файлы. Попробуйте перетащить их ещё раз', type: 'fieldUpdate', progress: undefined });
        return
    } 

    resetStage()

    for(let i = 0;; i++) {
        let errorReason = 'неправильное расширение файла'

        const file = list[i]
        const ext = file.name.endsWith('.pdf')
        if(ext || i === list.length-1) {
            currentFilename = file.name;
            if(ext) currentFilename = currentFilename.substring(0, currentFilename.length-4)
            currentFileContent = await file.arrayBuffer()

            if(currentFileContent.length === 0) {
                currentFileContent = undefined
                //no idea why this happens
                errorReason = 'Получен пустой файл'
            }
            else {
                dom.filenameEl.innerText = 'Файл' + (list.length === 1 ? '' : ' №' + (i+1)) + ': ' + file.name
                dom.filenameEl.style.opacity = 1
                updInfo({ msg: 'Файл загружен', type: 'fieldUpdate' })
                document.body.setAttribute('data-fileLoaded', '')

                checkShouldProcess()
                return
            }
        }

        if(i < list.length) continue

        updError({ msg: errorReason, type: 'fieldUpdate', progress: undefined })
        return
    }
}

function readElementText(element) {
    innerTextHack.innerHTML = element.innerHTML
    return innerTextHack.innerText
}

function makeWarningText(schedule, scheme, bigFields) {
    if(!bigFields.length) return ''

    const days = new Set()
    for(let i = 0; i < scheme.length; i++) for(let j = 0; j < scheme[i].length; j++) days.add(scheme[i][j])

    let prevDay
    let warningText = ''
    for(let i = 0; i < bigFields.length; i++) {
        const f = bigFields[i]
        if(!days.has(f.day)) continue
        if(prevDay === f.day) warningText += ', ' + minuteOfDayToString(schedule[f.day][f.hours].sTime)
        else warningText += '; ' + daysOfWeekShortened[f.day] + ' ' + minuteOfDayToString(schedule[f.day][f.hours].sTime)
        prevDay = f.day
    }

    if(warningText === '') return ''
    else return "Внимание, обнаружены большие поля названий уроков (" + warningText.substring(2) + "). Проверьте полученное расписание на их корркетность."
        + "вы можете изменить расписание самостоятельно или <a href='./help-page.html' target='blank' class='link'>написать сюда</a>."
}

function updateUserdataF2(...params) {
    if(!depStatus['userdata']) {
        console.error('Dependency not loaded')
        return () => {}
    }
    else return updateUserdataF(...params)
}


async function processPDF0() {
    const stagesC = 4
    let stage = 0
    const ns = () => { return ++stage / (stagesC+1) }

    updInfo({ msg: 'Ожидаем зависимости', type: 'processing', progress: 0 })
    await Promise.all([
        loadSchedule, loadCommon, loadElements, loadPopups, createGenSettings, 
        loadPdfjs, loadPdflibJs, loadFontkit
    ]).catch(e => { throw "не удалось загрузить зависомость " + e + ". Попробуйте перезагрузить страницу" })

    updInfo({ msg: 'Начинаем обработку', type: 'processing', progress: ns() })

    const contents = copy(currentFileContent)
    const name = dom.groupInputEl.value.trim()
    const nameFixed = nameFixup(name)
    const rowRatio = Number(genSettings.heightEl.value) / 100
    const borderFactor = Number(genSettings.borderSizeEl.value) / 1000
    if(!(rowRatio < 1000 && rowRatio > 0.001)) throw ['неправильное значение высоты строки', genSettings.heightEl.value]
    if(!(borderFactor < 1000 && borderFactor >= 0)) throw ['неправильное значение ширины границы', genSettings.borderSizeEl.value]
    const drawBorder = genSettings.drawBorder
    const dowOnTop = genSettings.dowOnTop
    const scheme = readScheduleScheme(readElementText(genSettings.scheduleLayoutEl))

    let userdata;
    try { try { userdata = ['' + currentFilename, '' + name] } catch(e) { console.log(e) } } catch(e) {}

    const origTask = pdfjsLib.getDocument({ data: contents });
    const origDestructor = [call1(origTask.destroy.bind(origTask))]
    const destroyOrig = () => Promise.all(origDestructor.map(it => it()))
    try {
    let orig
    try { orig = await origTask.promise }
    catch (e) { throw ["Документ не распознан как PDF", e] }

    origDestructor.push(call1(orig.cleanup.bind(orig))) //do I even need this?

    for(let j = 0; j < orig.numPages; j++) {
        try {
            const page = await orig.getPage(j + 1);
            const cont = (await page.getTextContent()).items;
            const contLength = cont.length

            for(let i = 0; i < cont.length; i++) {
                if(nameFixup(cont[i].str) === nameFixed) try {

                const boundsH = findItemBoundsH(cont, i);
                const vBounds = findDaysOfWeekHoursBoundsV(cont);
                updInfo({ msg: 'Достаём расписание из файла', type: 'processing', progress: ns() })
                const dates = findDates(cont, boundsH)
                const [schedule, bigFields] = makeSchedule(cont, vBounds, boundsH);
                destroyOrig()
                updInfo({ msg: 'Создаём PDF файл расписания', type: 'processing', progress: ns() })
                const [width, doc] = await scheduleToPDF(schedule, scheme, rowRatio, borderFactor, drawBorder, dowOnTop)
                const warningText = makeWarningText(schedule, scheme, bigFields)
                await destroyOrig() //https://github.com/mozilla/pdf.js/issues/16777
                updInfo({ msg: 'Создаём предпросмотр', type: 'processing', progress: ns() })
                const outFilename = currentFilename + '_' + name; //I hope the browser will fix the name if it contains chars unsuitable for file name
                await createAndInitOutputElement(
                    doc, dom.outputsEl, 
                    outFilename, width,
                    { rowRatio, scheme, schedule, drawBorder, dowOnTop, borderFactor, dates },
                    userdata
                )

                updInfo({ msg: 'Готово', warning: warningText, type: 'processing', progress: ns() })
                updateUserdataF2('regDocumentCreated')(...userdata) 
                return
            }
            catch(e) {
                const add = "[название группы] = " + i + '/' + contLength
                if(Array.isArray(e)) { e.push(add); throw e }
                else throw [e, add] 
            }
        }
        } catch(e) {
            const add = "[страница] = " + j + '/' + orig.numPages
            if(Array.isArray(e)) { e.push(add); throw e }
            else throw [e, add] 

        }
    }
    throw ["имя группы не найдено `" + name + "`", "количество страниц = " + orig.numPages];
    } catch(e) {
        updateUserdataF2('regDocumentError')(...userdata, e) 
        throw e
    } finally { 
        await destroyOrig() 
    }
}

/*
if(false) {
    var viewport = page.getViewport({ scale: 1, });
    // Support HiDPI-screens.
    var outputScale = window.devicePixelRatio || 1;

    var canvas = document.getElementById('the-canvas');
    var context = canvas.getContext('2d');

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height =  Math.floor(viewport.height) + "px";

    var transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0]
        : null;

    var renderContext = {
        canvasContext: context,
        transform: transform,
        viewport: viewport
    };
    await page.render(renderContext).promise
}
*/

function processPDF() {
     return processPDF0().catch(e => {
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
            str += e
            console.error(e)
        }

        updError({ msg: str, type: 'processing' })
    })
}

function pickFile(callback) {
    var f = document.createElement('input');
    f.style.display='none';
    f.type='file';
    f.name='file';
    f.addEventListener('change', callback)
    document.body.appendChild(f);
    f.click();
    setTimeout(function() {
        document.body.removeChild(f);
    }, 0);
}
