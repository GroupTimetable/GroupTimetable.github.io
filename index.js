const loadFontkit  = files[0][0];
const loadPdfjs    = files[1][0];
const loadPdflibJs = files[2][0];
const loadSchedule = files[3][0];
const loadCommon   = files[4][0];
const loadElements = files[5][0];
const loadPopups   = files[6][0];
const loadDatabase = files[7][0];
//const loadIndex    = files[8][0]; 
const loadDom = domPromise;

loadPdfjs.then(arr => {
    pdfjsLib.GlobalWorkerOptions.workerPort = pdfjsWorker;
});

let isDomLoaded;
loadDom.then(_ => isDomLoaded = true);
function assertDomLoaded() { if(!isDomLoaded) throw 'Страница не была загружена до конца'; }

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
    dom.fileInfoEl = qs('file-info')
    dom.filenameEl = qs('filename')
    dom.fileTypeEl = qs('file-type')
    dom.deleteFile = qs('delete-file')
    dom.outputsEl = qs('outputs')
    dom.dataAccept = qs('data-acc')
    dom.dataDecline = qs('data-dec')
    dom.dataUsageOpen = qs('open-data-usage')
    dom.dropZoneEl = qs('drop-zone')
})

Promise.all([loadDom, loadDatabase]).then(_ => {
    let messageInteracted;
    try { messageInteracted = localStorage.getItem('index__userdata_interacted') } catch(e) { console.error(e) }

    function updateInteracted() {
        messageInteracted = true;
        try { localStorage.setItem('index__userdata_interacted', true) } catch(e) { console.error(e) }
    }

    function updateVisibility(open, accepted) {
        dataAccept.setAttribute('data-visible', open && accepted)
        dataDecline.setAttribute('data-visible', open && !accepted)
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

addEventListener("unhandledrejection", (event) => {
    const res = '' + event.reason;
    loadDatabase.then(() => { updateUserdataF('regGeneralError')('$rej$' + res) });
});

addEventListener('error', (event) => {
    const res = '' + event.error;
    loadDatabase.then(() => { updateUserdataF('regGeneralError')('$err$' + res) });
});


let lastFileDataUrl;
let currentFilename, currentFileContent;
let processing;

let prevProgress
let curStatus = {};

const genSettings = {}
const createGenSettings = Promise.all([loadDom, loadCommon ]).then(_ => {
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
                    padding: 0; padding-right: 0.1em; width: 6ch;">
                %
            </span>

            <span style="text-align: right; margin-top: 0.9em;">Граница&nbsp;дней:</span>
            <span class="no-select" style="display: flex; margin-top: 0.6em;">
                &nbsp;<div class="border-color" style="cursor: pointer; border-bottom: 0.1rem solid var(--primary-contrast-color);"></div>
             </span>

            <span style="text-align: right; margin-top: 0.6em;">Размер:</span>
            <span style="display: flex;align-items: baseline;margin-top: 0.9em;">
                &nbsp;
                <input class="border-input" type="number" style="
                    text-align: right; font-size: 1em; color: white;
                    border-bottom: 0.1rem solid white;
                    padding: 0; padding-right: 0.1em; width: 6ch;">
                ‰
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
    genSettings.borderTypeEl = genPopupHTML.querySelector('.border-color')
    genSettings.dowPositionEl = genPopupHTML.querySelector('.dow-position')

    const savedSettings = [
        [(1/5.2 * 100).toFixed(2), '10', true, false],
        [(1/5.2 * 100).toFixed(2), '20', false, true],
    ]
    let curSettings = 0;

    function updBorderCol(value) { 
        genSettings.drawBorder = value
        genSettings.borderTypeEl.innerText = value ? 'заливка' : 'отступ'
    }
    function updDowOnTop(value) {
        genSettings.dowOnTop = value
        genSettings.dowPositionEl.innerText = value ? 'сверху' : 'сбоку'
    }
    function updHeight(value) { genSettings.heightEl.value = value; }
    function updBorderSize(value) { genSettings.borderSizeEl.value = value; }
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

    addClick(genSettings.borderTypeEl, () => { updBorderCol(!genSettings.drawBorder) })
    addClick(genSettings.dowPositionEl, () => { updDowOnTop(!genSettings.dowOnTop) })
    addClick(genPopupHTML.querySelector('.gen-settings-prev'), () => { updSettings(curSettings-1) })
    addClick(genPopupHTML.querySelector('.gen-settings-next'), () => { updSettings(curSettings+1) })

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
    assertDomLoaded()
    dom.dropZoneEl.style.visibility = 'hidden'
    dom.dropZoneEl.style.opacity = 0
}

function showOverlay() {
    assertDomLoaded()
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

    window.addEventListener("dragover", function (e) { e.preventDefault(); });

    window.addEventListener('drop', function(ev) { 
        ev.preventDefault();
        hideOverlay()
        loadFromListFiles(ev.dataTransfer.files)
    })
}

function checkShouldProcess() {
    if(processing) return;

    const name = dom.groupInputEl.value.trim()
    if(name == '') {
        updError({ msg: 'Для продолжения требуется имя группы', progress: 1 })
        return
    }
    dom.startButtonEl.setAttribute('data-pending'/*rename to data-processing, since this name is outdated*/, '')
    processing = true;

    const startTime = performance.now()
    processPDF()
        .catch(e => printScheduleError(e))
        .finally(() => {
            const endTime = performance.now()
            console.log(`call took ${endTime - startTime} milliseconds`)
            dom.startButtonEl.removeAttribute('data-pending')
            processing = false;
        })
}

loadDom.then(_ => { updInfo({ msg: 'Вы можете создать изображение или календарь занятий своей группы из общего расписания' }) })

Promise.all([loadDom, loadCommon]).then(_ => {
    dom.groupInputEl.addEventListener('keydown', e => {
        if (e.key === "Enter") checkShouldProcess()
    })
    dom.groupInputEl.addEventListener('input', e => {
        if(dom.groupInputEl.value.trim() !== '') document.body.setAttribute('data-group-name-added', '');
    })
    addClick(dom.startButtonEl, _ => {
        checkShouldProcess()
    })

    new ResizeObserver(() => resizeProgressBar(curStatus.progress, true)).observe(dom.groupBarEl)

    addClick(document.querySelector('#file-picker'), function() {
        const f = document.createElement('input');
        f.style.display = 'none';
        f.type = 'file';
        f.name = 'file';
        f.addEventListener('change', e => loadFromListFiles(e.target.files))
        document.body.appendChild(f);
        f.click();
        setTimeout(() => document.body.removeChild(f), 0);
    })
})

function resizeProgressBar(progress, immediately) {
    assertDomLoaded()
    const w = dom.groupBarEl.offsetWidth
    const b = dom.groupBarEl.offsetHeight * 0.5 

    let newW;
    if(progress === undefined) newW = 0;
    else {
        progress = Math.min(Math.max(progress, 0), 1)
        if(!(progress >= 0 && progress <= 1)) {
            console.error('progress out of bounds', progress)
            progress = 0;
        }

        if(progress === 1) newW = w;
        else newW = progress * (w - 2*b) + b;
    }

    dom.moveWithBorderEls.forEach(it => it.style.marginRight = it.style.marginLeft = b + 'px')

    //https://stackoverflow.com/a/21594219/18704284
    dom.progressBarEl.setAttribute('data-transition', !immediately)
    dom.progressBarEl.style.width = newW + 'px'
}

let prevTime = performance.now()
function updStatus() { try {
    assertDomLoaded()
    const s = curStatus
    if(false) {
        const now = performance.now()
        console.log('time:', (now - prevTime).toFixed(3))
        prevTime = now;
        try { throw s.msg } catch(e) { console.error(e) }
    }

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

function updError(statusParams) {
    statusParams.level = 'error'
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
    if(list.length === 0) { //if you drop files fast enough sometimes files list would be empty
        if(!processing) updError({ msg: 'Не удалось получить файлы. Попробуйте ещё раз', progress: 1 });
        return
    }

    let res;
    for(let i = 1; i < list.length; i++) {
        const file = list[i];
        const ext = file.name.endsWith('.pdf')
        if(!ext) continue;
        res = { filename: file.name, ext, content: await file.arrayBuffer(), type: file.type };
    }
    if(res == undefined) {
        const file = list[0];
        res = { filename: file.name, ext: file.name.endsWith('.pdf'), content: await file.arrayBuffer(), type: file.type };
    }

    if(res.content.length === 0) { //no idea why this happens
        if(!processing) updError({ msg: 'Получен пустой файл', progress: 1 })
        return;
    }

    currentFilename = res.ext ? res.filename.substring(0, res.filename.length - 4) : res.filename;
    currentFileContent = res.content;

    const fileDataUrl = lastFileDataUrl;
    lastFileDataUrl = URL.createObjectURL(new Blob([currentFileContent], { type: res.type }));
    updateFilenameDisplay('Файл' + (list.length === 1 ? '' : ' №' + (i+1)) + ': ', res.filename, lastFileDataUrl);
    URL.revokeObjectURL(fileDataUrl);

    if(!processing) {
        const name = dom.groupInputEl.value.trim()
        if(name == '') updInfo({ msg: 'Введите имя группы (ИМгр-123, имгр123 и т.п.)' })
        else updInfo({ msg: 'Файл загружен' })
    }
}

loadDom.then(() => {
    dom.deleteFile.addEventListener('click', () => {
        updateFilenameDisplay();
        currentFileContent = undefined;
        currentFilename = undefined;
    })
})

function updateFilenameDisplay(fileType, filename, href) {
    if(filename == undefined) {
        dom.fileInfoEl.setAttribute('data-visible', false);
    }
    else {
        dom.fileInfoEl.setAttribute('data-visible', true);
        dom.fileTypeEl.innerText = fileType;
        dom.filenameEl.innerText = filename;
        dom.filenameEl.href = href;
        dom.deleteFile.style.pointer = '';
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
        const day = f[0], hour = f[1], ch = f[2], z = f[3], index = f[4];
        if(!days.has(day)) continue
        warningText += '; ' + daysOfWeekShortened[day] + '-' + minuteOfDayToString(hour)
            + '-' + (ch ? 'ч' : '') + (z ? 'з' : '') + '(' + index + ')';
        prevDay = day;
    }

    if(warningText === '') return ''
    else return "Возможно пропущены уроки: " + warningText.substring(2)
        + ". Чтобы добавить их в расписание, допишите $<i>индекс_из_скобок</i> к имени группы, напр. ИМгр-123 $0 $2 $39."
        + " Также вы можете отредактировать расписание вручную, нажав на кнопку с карандашом на изображении"
        + " или <a href='./help-page.html' target='blank' class='link'>написать сюда</a>.";
}

window.updateUserdataF ??= () => () => { console.error('No function defined') }

function __stop() {
    __debug_start = false;
    __debug_mode = undefined;
}

let __debug_start, __debug_mode;
let __debug_schedule_parsing_results, __last_expected; //console.log(JSON.stringify());
Object.defineProperty(window, '__schedule_debug_names', { get() { return __debug_mode === 2; } });
let __debug_warningOn = [];

function __start(mode, folder, ...args) {
    if(__debug_start) {
        console.error('Cannot run more than one test at a time! (call __stop())')
        return
    }
    const modes = { 'groups': 1, 'schedule_names': 2 };

    __stop();
    __debug_start = true;
    __debug_mode = modes[mode] ?? 0;
    const testFolder = (folder == undefined || folder.trim() == '') ? undefined : 'test' + folder + '/'

    let goupNames, checkExpected;
    if(__debug_mode === 1) {
        groupNames = args[0]
    }
    else if(__debug_mode === 2) return Promise.resolve();
    else {
        checkExpected = (args[0] == undefined || !!args[0])
        groupNames = args[1]
    }

    return loadDom.then(async () => {
        async function readFile0(filename) {
            if(testFolder == undefined) return Promise.reject('test folder not given');
            const result = await fetch(testFolder + filename)
            if(!result.ok) throw '(custom error meaasge) File ' + filename + ' not loaded';
            return await result.arrayBuffer()
        };
        const readJson0 = (filename) => readFile0(filename).then(it => JSON.parse(new TextDecoder('utf-8').decode(it)))
        const wrap = (func) => func.catch(err => { console.error('file not loaded:', err); return undefined })
        const readFile = (filename) => wrap(readFile0(filename))
        const readJson = (filename) => wrap(readJson0(filename))

        if(__debug_mode === 0) {
            const contP = readFile('file.pdf')
            const expectedP = readJson('expected.txt')

            groupNames ??= await readJson('names.txt')
            await contP.then(it => { if(it != undefined) {
                currentFileContent = it
                updateFilenameDisplay('Test folder: ', testFolder);
            } })
            let expected = checkExpected ? await expectedP : undefined;
            if(expected != undefined) __last_expected = expected

            const differences = []

            if(groupNames == undefined) throw 'No group names provided'
            if(currentFileContent == undefined) throw 'No pdf provided'

            __debug_schedule_parsing_results = {};

            console.log('started' + (expected != undefined ? ' with expected/actual checks' : ''))
            for(let i = 0; i < groupNames.length; i++) {
                if(!__debug_start) break;
                dom.groupInputEl.value = groupNames[i]
                try { await processPDF(); } catch(e) { printScheduleError(e); break; }
                if(!__debug_start) break;
                if(expected != undefined) {
                    const ex = expected[groupNames[i]]
                    if(!ex) console.warn('Name', ex, 'not found in expected!')
                    else if(JSON.stringify(__debug_schedule_parsing_results[groupNames[i]]) !== JSON.stringify(ex)) {
                        differences.push(groupNames[i])
                        console.error('!')
                    }
                }
            }

            console.log('warning on:', '[' + __debug_warningOn.map(it => '"'+it[0]+'"') + ']', structuredClone(__debug_warningOn));
            __debug_warningOn.length = 0;

            if(differences.length !== 0) {
                console.error('results differ for: ')
                console.error('[' + differences.map(it => '"'+it+'"') + ']')
            }
            else if(expected != undefined) console.log('expected results matched')
        }
        else if(__debug_mode === 1) {
            const contP = readFile('file.pdf')
            await contP.then(it => { if(it != undefined) {
                currentFileContent = it
                updateFilenameDisplay('Test folder: ', testFolder);
            } })

            if(groupNames == undefined) throw 'No group names provided'
            if(currentFileContent == undefined) throw 'No pdf provided'

            for(let i = 0; i < groupNames.length; i++) {
                if(!__debug_start) break;
                dom.groupInputEl.value = groupNames[i]
                try { await processPDF(); } catch(e) { printScheduleError(e); break; }
            }
        }
    }).finally(() => {
        const n2 = testFolder == undefined ? '' : ' for ' + testFolder;
        if(__debug_start) {
            updInfo({ msg: 'Everything done' + n2, progress: 1 })
            console.log('done' + n2)
        }
        else {
            updInfo({ msg: 'Stopped' + n2, progress: 1 })
            console.log('done, stopped' + n2)
        }
        __stop();
    })
}

async function loadFileFromDatabase(groupName) {
    let dbInfo;
    try { dbInfo = await findGroupInfo(groupName); }
    catch(e) {
        if(e == 1) e = 'Группа `' + groupName + '` не найдена в базе, проверьте правильность написания или попробуйте загрузить файл своего института';
        else if(e == 2) e = 'Институт группы `' + groupName + '` не найден в базе (внутренняя ошибка)';

        updateUserdataF('regGeneralError')('' + e) 
        throw e;
    }

    updateFilenameDisplay('Ссылка: ', dbInfo.name, dbInfo.url);

    const url = `https://api.allorigins.win/raw?url=` + encodeURIComponent(`https://corsproxy.io/?` + dbInfo.url)
    const result = await fetch(url).catch(error => { 
        throw 'Не удалось загрузить файл группы `' + groupName + '` института `' + dbInfo.name + '` по ссылке `' + url + '`: `' + error + '`';
    });
    if(!result.ok) throw 'Не удалось загрузить файл группы `' + groupName + '` института `' + dbInfo.name + '` по ссылке `' + url + '`, статус: ' + result.status;

    const buf = await result.arrayBuffer();

    currentFilename = dbInfo.name;
    currentFileContent = buf;
}

async function processPDF() {
    const loadFile = currentFileContent == undefined; 

    const stagesC = 4 + (loadFile ? 1 : 0);
    let stage = 0;
    const ns = () => { return ++stage / (stagesC+1) }

    updInfo({ msg: 'Ожидаем зависимости', progress: 0 })
    const dependencies = [
        loadSchedule, loadCommon, loadElements, loadPopups, createGenSettings, 
        loadPdfjs, loadPdflibJs, loadFontkit
    ];
    if(loadFile) dependencies.push(loadDatabase);
    await Promise.all(dependencies).catch(e => { throw "не удалось загрузить зависомость " + e + ". Попробуйте перезагрузить страницу" })

    updInfo({ msg: 'Начинаем обработку', progress: ns() });
    const nameS = dom.groupInputEl.value.trim().split('$');
    const name = nameS[0];
    const indices = Array(nameS.length - 1);
    for(let i = 1; i < nameS.length; i++) indices[i-1] = Number.parseInt(nameS[i]);
    const nameFixed = nameFixup(name);
    const rowRatio = Number(genSettings.heightEl.value) / 100;
    const borderFactor = Number(genSettings.borderSizeEl.value) / 1000;
    if(!(rowRatio < 1000 && rowRatio > 0.001)) throw ['неправильное значение высоты строки', genSettings.heightEl.value];
    if(!(borderFactor < 1000 && borderFactor >= 0)) throw ['неправильное значение ширины границы', genSettings.borderSizeEl.value];
    const drawBorder = genSettings.drawBorder;
    const dowOnTop = genSettings.dowOnTop;
    const scheme = readScheduleScheme(readElementText(genSettings.scheduleLayoutEl));

    if(loadFile) {
        updInfo({ msg: 'Загружаем файл расписания (долго!)', progress: ns() });
        await loadFileFromDatabase(nameFixed);
    }

    const filename = currentFilename;

    let userdata;
    try { try { userdata = ['' + filename, '' + name] } catch(e) { console.log(e) } } catch(e) {}

    const origTask = pdfjsLib.getDocument({ data: copy(currentFileContent) });
    const origDestructor = [call1(origTask.destroy.bind(origTask))]
    const destroyOrig = () => Promise.all(origDestructor.map(it => it()))
    try {
        let orig
        try { orig = await origTask.promise }
        catch (e) { throw ["Документ не распознан как PDF", e] }

        origDestructor.push(call1(orig.cleanup.bind(orig))) //do I even need this?

        let closestName = undefined, closestN = Infinity;
        const minBound = Math.min(nameFixed.length*0.5, nameFixed.length - 4)
        const maxBound = Math.max(nameFixed.length*2, nameFixed.length + 4)

        for(let j = 0; j < orig.numPages; j++) try {
            const page = await orig.getPage(j+1);
            const cont = (await page.getTextContent()).items;
            const contLength = cont.length

            for(let i = 0; i < contLength; i++) try {
                const oname = nameFixup(cont[i].str)
                if(oname.length < minBound || oname.length > maxBound) continue;
                const n = levenshteinDistance(nameFixed, oname);
                if(n > 0) {
                    if(n < closestN) { closestName = cont[i].str; closestN = n; }
                    continue
                }

                updInfo({ msg: 'Достаём расписание из файла', progress: ns() })
                const [schedule, dates, bigFields] = makeSchedule(cont, page.view, i, indices);
                const warningText = makeWarningText(schedule, scheme, bigFields)
                if(__debug_start && __debug_mode === 0) { __debug_schedule_parsing_results[name] = schedule; if(bigFields.length != 0) __debug_warningOn.push([name, warningText]); return }
                destroyOrig()
                updInfo({ msg: 'Создаём PDF файл расписания', progress: ns() })
                const [width, doc] = await scheduleToPDF(schedule, scheme, rowRatio, borderFactor, drawBorder, dowOnTop)
                await destroyOrig() //https://github.com/mozilla/pdf.js/issues/16777
                updInfo({ msg: 'Создаём предпросмотр', progress: ns() })
                const outFilename = filename + '_' + name; //I hope the browser will fix the name if it contains chars unsuitable for file name
                await createAndInitOutputElement(
                    doc, dom.outputsEl, outFilename, width,
                    { rowRatio, scheme, schedule, drawBorder, dowOnTop, borderFactor, dates },
                    userdata
                )

                updInfo({ msg: 'Готово', warning: warningText, progress: ns() })
                updateUserdataF('regDocumentCreated')(...userdata) 
                return
            }
            catch(e) {
                const add = "[название группы] = " + i + '/' + contLength
                if(Array.isArray(e)) { e.push(add); throw e }
                else throw [e, add] 
            }
        }
        catch(e) {
            const add = "[страница] = " + j + '/' + orig.numPages
            if(Array.isArray(e)) { e.push(add); throw e }
            else throw [e, add] 

        }

        let cloS = ''
        if(closestName != undefined) cloS = ", возможно вы имели в виду `" + closestName + "`"
        throw ["имя `" + name + "` не найдено" + cloS, "количество страниц = " + orig.numPages];
    } catch(e) {
        updateUserdataF('regDocumentError')(...userdata, e) 
        throw e
    } finally { await destroyOrig() }
}

/*
{
    var viewport = page.getViewport({ scale: 1 });
    console.log(viewport)
    var canvas = document.getElementById('the-canvas');
    var context = canvas.getContext('2d');

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height =  Math.floor(viewport.height) + "px";

    var renderContext = { canvasContext: context, viewport };
    await page.render(renderContext).promise
}
*/

function printScheduleError(e) {
    let str = ''
    if(Array.isArray(e)) {
        console.error('ERROR')
        for(let i = 0; i < e.length; i++) {
            if(i !== 0) str += ', '
            str += e[i]
        }
        console.error(e)
        console.error('RORRE')
    }
    else {
        str += e
        console.error(e)
    }

    updError({ msg: str, progress: curStatus.progress })
}

function levenshteinDistance(str1, str2) {
    const [s1, s2] = str1.length < str2.length ? [str1, str2] : [str2, str1];
    if(s1.length === 0) return s2.length;

    const len = s1.length;
    const row = Array(len);
    {
        const c2 = s2[0];
        let lef = 1;
        for(let i = 0; i < len; i++) {
            const c1 = s1[i];
            const top = i+1, toplef = i;
            lef = row[i] = (c1 === c2 ? toplef : Math.min(top, toplef, lef) + 1);
        }
    }
    for(let j = 1; j < s2.length-1; j++) {
        let lef = j + 1, toplef = j;
        const c2 = s2[j];
        for(let i = 0; i < len; i++) {
            const c1 = s1[i];
            const top = row[i];
            lef = row[i] = (c1 === c2 ? toplef : Math.min(top, toplef, lef) + 1);
            toplef = top;
        }
    }
    {
        let lef = s2.length, toplef = s2.length-1;
        const c2 = s2[s2.length-1];
        for(let i = 0; i < len; i++) {
            const c1 = s1[i];
            const top = row[i];
            lef = (c1 === c2 ? toplef : Math.min(top, toplef, lef) + 1);
            toplef = top;
        }
        return lef;
    }
}
