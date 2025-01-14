const loadPdfjs    = wrapDep(files[0][0]);
const loadFontkit  = wrapDep(files[1][0]);
const loadPdflibJs = wrapDep(files[2][0]);
const loadSchedule = wrapDep(files[3][0]);
const loadCommon   = wrapDep(files[4][0]);
const loadElements = wrapDep(files[5][0]);
const loadPopups   = wrapDep(files[6][0]);
const loadDatabase = wrapDep(files[7][0]);
const loadRender   = wrapDep(files[9][0]);
const loadDom = domPromise;

function wrapDep(promise) {
    return promise.catch((e) => { throw "не удалось загрузить зависомость `" + e + "`. Попробуйте перезагрузить страницу" })
}

loadPdflibJs.then(arr => {
    deg90 = PDFLib.degrees(90)
})

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
    dom.fileIsPdfEl = qs('is-pdf')
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

    let currentOpen = !messageInteracted;

    function updateVisibility(open, accepted) {
        currentOpen = open;
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

    onUserDataUpdated(() => {
        updateUserdataElements(currentOpen, getUserdataAllowed())
    })

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

    updateVisibility(currentOpen, getUserdataAllowed())
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

let handling = false
addEventListener("unhandledrejection", (event) => {
    try{ if(handling) return } catch(e) { return } // or completely hang the browser
    handling = true
    const res = '' + event.reason;
    loadDatabase.then(() => { updateUserdataF('regGeneralError')('$rej$' + res) })
        .then(() => { handling = false }) // not finally
});

addEventListener('error', (event) => {
    try{ if(handling) return } catch(e) { return } // or completely hang the browser
    handling = true
    const res = '' + event.error;
    loadDatabase.then(() => { updateUserdataF('regGeneralError')('$err$' + res) })
        .then(() => { handling = false })
});


let lastFileDataUrl;
let currentFilename, currentDocumentData;
let processing;

let prevProgress
let curStatus = {}

const genSettings = {}
const createGenSettings = wrapDep(Promise.all([loadDom, loadCommon]).then(_ => {
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
}).catch((e) => { throw 'настройки' }))

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

    let userdata = [];
    try { try { userdata = ['' + currentFilename, '' + dom.groupInputEl.value.trim()] } catch(e) { console.error(e) } } catch(e) {}

    var nameS
    try { nameS = dom.groupInputEl.value.trim().split('$'); }
    catch(e) {
        updateUserdataF('regDocumentError')(...userdata, e)
        printScheduleError(e)
        return;
    }

    const name = nameS[0].trim();
    if(name == '') {
        updError({ msg: 'Для продолжения требуется имя группы', progress: 1 })
        return
    }

    try { localStorage.setItem('index__last_group_name', name) }
    catch(e) { console.error(e) }

    var indices
    var i = 0
    try {
        indices = Array(nameS.length - 1);
        for(i = 1; i < nameS.length; i++) indices[i-1] = Number.parseInt(nameS[i]);
    }
    catch(e) {
        if(i == 0) e = ['Не удалось создать массив индексов пропущенных уроков', e]
        else e = ['Индекс пропущенного урока ' + i + ' не является числом', e]
        updateUserdataF('regDocumentError')(...userdata, e)
        printScheduleError(e)
        return;
    }

    if(currentDocumentData == undefined) {
        updError({ msg: 'Для продолжения требуется файл расписания', progress: 1 })
        return
    }

    dom.startButtonEl.setAttribute('data-pending'/*rename to data-processing, since this name is outdated*/, '')
    processing = true;

    const startTime = performance.now()
    processPDF(userdata, name, indices)
        .catch(e => {
            updateUserdataF('regDocumentError')(...userdata, e)
            printScheduleError(e)
        }) // same in loadFromListFiles()
        .finally(() => {
            const endTime = performance.now()
            console.log(`call took ${endTime - startTime} milliseconds`)
            dom.startButtonEl.removeAttribute('data-pending')
            processing = false;
        })
}

loadDom.then(_ => {
    if(curStatus.level == null) {
        updSpecial({ msg: `
<p>
        Вы можете создать
        <span style="color: var(--primary-color);">изображение</span>,
        <span style="color: var(--primary-color);">календарь</span><svg viewBox="0 0 24 24" style="margin-left: 0.1em;vertical-align: middle;height: 1rem;stroke: var(--primary-color);fill: none;stroke-width: 3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M3 10H21M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"></path></svg>
        и <span style="color: var(--primary-color);">PDF-файл</span><svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 2100 2100" stroke-width="150" style=" margin-left: 0.1rem; height: 1rem; vertical-align: middle; fill: var(--primary-color); stroke: var(--primary-color); stroke-width: 150; "><path d="M1251.654 0c44.499 0 88.207 18.07 119.718 49.581l329.223 329.224c31.963 31.962 49.581 74.54 49.581 119.717V1920H169V0Zm-66.183 112.941H281.94V1807.06h1355.294V564.706H1185.47V112.94Zm112.94 23.379v315.445h315.445L1298.412 136.32Z"></path> <path d="M900.497 677.67c26.767 0 50.372 12.65 67.991 37.835 41.901 59.068 38.965 121.976 23.492 206.682-5.308 29.14.113 58.617 16.263 83.125 22.814 34.786 55.68 82.673 87.981 123.219 23.718 29.93 60.198 45.854 97.13 40.885 23.718-3.276 52.292-5.986 81.656-5.986 131.012 0 121.186 46.757 133.045 89.675 6.55 25.976 3.275 48.678-10.165 65.506-16.715 22.701-51.162 34.447-101.534 34.447-55.793 0-74.202-9.487-122.767-24.96-27.445-8.81-55.906-10.617-83.69-3.275-55.453 14.456-146.936 36.48-223.284 46.983-40.772 5.647-77.816 26.654-102.438 60.875-55.454 76.8-106.842 148.518-188.273 148.518-21.007 0-40.32-7.567-56.244-22.701-23.492-23.492-33.544-49.581-28.574-79.85 13.778-92.95 128.075-144.79 196.066-182.625 16.037-8.923 28.687-22.589 36.592-39.53l107.86-233.223c7.68-16.377 10.051-34.56 7.228-52.518-12.537-79.059-31.06-211.99 18.748-272.075 10.955-13.44 26.09-21.007 42.917-21.007Zm20.556 339.953c-43.257 126.607-119.718 264.282-129.996 280.32 92.273-43.37 275.916-65.28 275.916-65.28-92.386-88.998-145.92-215.04-145.92-215.04Z"></path></svg>
        занятий своей группы из общего расписания
<p>
<p>
        <span style="color: var(--error-color); font-weight: 900; font-size: 1.1em">НОВОЕ: </span>
        теперь можно создать расписание экзаменационной сессии:
        <a class="link" href="/exams/">grouptimetable.github.io/exams/</a>
</p>
        `})
    }

    new ResizeObserver(() => resizeProgressBar(curStatus.progress, true)).observe(dom.groupBarEl)

    try {
        const lastName = localStorage.getItem('index__last_group_name')
        if(lastName != undefined) dom.groupInputEl.value = lastName
    }
    catch(e) { console.error(e) }

    const inputCharRegex = /[\p{L}0-9\-]/u
    document.body.addEventListener('keydown', function(event) {
        if (document.activeElement != document.body) return;
        if (
            event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey
            && inputCharRegex.test(event.key)
        ) {
            const inputField = dom.groupInputEl
            inputField.focus();
            inputField.value += event.key;
            event.preventDefault();
        }
        else if (event.keyCode == 13) {
            checkShouldProcess()
        }
    });
})

Promise.all([loadDom, loadCommon]).then(_ => {
    dom.groupInputEl.addEventListener('keyup', e => {
        if (e.keyCode == 13) {
          dom.groupInputEl.blur()
          checkShouldProcess()
        }
    })
    addClick(dom.startButtonEl, _ => {
        checkShouldProcess()
    })

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

    try {
        const el = document.getElementById('very-special')
        el.remove()
    }
    catch(err) {}

    if(s.level === 'special') {
        progressBarEl.style.backgroundColor = 'var(--error-color)'
        if(prevProgress !== s.progress) resizeProgressBar(s.progress)

        const specc = document.createElement('div')
        specc.setAttribute('id', 'very-special')
        specc.innerHTML = s.msg
        specc.style.color = 'var(--text-color)'
        specc.style.opacity = 1

        statusEl.insertAdjacentElement('afterend', specc)
        statusEl.innerHTML = ''
        statusEl.style.opacity = 0
    }
    else if(s.level === 'error') {
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

function updSpecial(statusParams) {
    statusParams.level = 'special'
    curStatus = statusParams
    updStatus()
}

const nonAlphaNumeric = /[^\p{L})\p{N}]/gu
function nameFixup(name) {
    var newName = name.replace(nonAlphaNumeric, '').toLowerCase();
    if(newName.length === 0) return name.trim()
    else return newName;
}

const english = /[abcehkmoptxy]/g
const original = 'abcehkmoptxy'
const replaced = 'абсенкмортху'

function nameFixupEvenMore(name) {
    var newName = name.replace(nonAlphaNumeric, '')
        .toLowerCase()
        .replace(english, (m) => replaced[original.indexOf(m)])

    return newName;
}

const pdfMagicNumbers = [0x25, 0x50, 0x44, 0x46]; // %PDF
function isPDF(arrayBuffer) {
    try {
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < pdfMagicNumbers.length; i++) {
            if (uint8Array[i] !== pdfMagicNumbers[i]) return false;
        }
        return true;
    }
    catch(e) {
        console.error(e)
        return false;
    }
}

async function updateCurrentDocument(fileContent, filename) {
    // first update interface, only then decode some pages ahead of time
    const prevDocumentData = currentDocumentData
    const thisDocumentData = (async() => {
        if (prevDocumentData) try {
            await (await prevDocumentData).task.destroy();
        } catch(e) { console.error(e) }

        await loadPdfjs

        const origTask = pdfjsLib.getDocument({ data: copy(fileContent) });
        let orig
        try { orig = await origTask.promise }
        catch (e) { throw ["Документ не распознан как PDF", e] }

        const pageCount = Math.min(orig.numPages, 20)
        const pages = new Array(pageCount)

        // process pages in this order:
        // get1, items1,  get3, items3 ...
        //    get2,  items2, get4,  items4 ...
        var fp = Promise.resolve();
        var sp = Promise.resolve();

        let i = 0;
        while(true) {
            const pageI = i + 1;

            if(!(i < pageCount)) break;
            fp = Promise.allSettled([fp]).then(async() => await orig.getPage(pageI));

            const second = i+1 < pageCount;
            if(second) sp = Promise.allSettled([sp]).then(async() => await orig.getPage(pageI+1));

            pages[i] = fp = fp.then(async(page) => {
                const r = { page, text: (await page.getTextContent()).items };
                return r;
            });
            if(!second) break;

            pages[i+1] = sp = sp.then(async(page) => {
                const r = { page, text: (await page.getTextContent()).items };
                return r;
            });
            if(!(i + 2 < pageCount)) break;

            i += 2;
        }

        const pagesObj = {
            get: async(i) => {
                const pageDataP = pages[i];
                if (pageDataP != undefined) return await pageDataP;

                const page = await orig.getPage(i + 1);
                const text = (await page.getTextContent()).items;
                const pageData = { page, text }
                pages[i] = pageData
                return pageData
            },
        }
        const result = { task: origTask, taskPromise: orig, pages: pagesObj }
        return result
    })()

    currentDocumentData = thisDocumentData;
    currentFilename = filename;

    thisDocumentData.catch((err) => {
        if (currentDocumentData != thisDocumentData) return;
        if (processing) return; // if processing, then the error would be updated by the processing function
        updateUserdataF('regDocumentError')(filename, 'no group', err)
        printScheduleError(err)
    })
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


    const filename = '' + (res.ext ? res.filename.substring(0, res.filename.length - 4) : res.filename);
    const fileContent = res.content;

    const fileDataUrl = lastFileDataUrl;
    lastFileDataUrl = URL.createObjectURL(new Blob([fileContent], { type: res.type }));
    updateFilenameDisplay('Файл' + (list.length === 1 ? '' : ' №' + (i+1)) + ': ', res.filename, lastFileDataUrl);
    URL.revokeObjectURL(fileDataUrl);

    dom.fileIsPdfEl.style.visibility = isPDF(fileContent) ? 'hidden' : ''

    if(!processing) {
        const name = dom.groupInputEl.value.trim()
        if(name == '') {
            updInfo({ msg: 'Введите имя группы (ИМгр-123, имгр123 и т.п.)' })
            try {
                dom.groupInputEl.focus({ preventScroll: true })
            }
            catch(e) { console.log(e) }
        }
        else updInfo({ msg: 'Файл загружен' })
    }

    updateCurrentDocument(fileContent, filename)
}

function updateFilenameDisplay(fileType, filename, href) {
    if(filename == undefined) {
        dom.fileInfoEl.setAttribute('data-visible', false);
    }
    else {
        dom.fileInfoEl.setAttribute('data-visible', true);
        dom.fileTypeEl.innerText = fileType;
        dom.filenameEl.innerText = filename;
        dom.filenameEl.href = href;
    }
}

function readElementText(element) {
    innerTextHack.innerHTML = element.innerHTML
    return innerTextHack.innerText
}

function warningNames(bigFields, days) {
    let prevDay
    let warningText = ''
    for(let i = 0; i < bigFields.length; i++) {
        const f = bigFields[i]
        const day = f[0], hour = f[1], ch = f[2], z = f[3], index = f[4];
        if(days && !days.has(day)) continue
        warningText += '; ' + daysOfWeekShortened[day] + '-' + minuteOfDayToString(hour)
            + '-' + (ch ? 'ч' : '') + (z ? 'з' : '') + ' ($' + index + ')';
        prevDay = day;
    }
    return warningText
}

function makeWarningText(schedule, scheme, bigFields) {
    if(!bigFields.length) return ''

    const days = new Set()
    for(let i = 0; i < scheme.length; i++) for(let j = 0; j < scheme[i].length; j++) days.add(scheme[i][j])

    const warningText = warningNames(bigFields, days)

    if(warningText === '') return ''
    else return "Возможно пропущены уроки: " + warningText.substring(2)
        + ". Чтобы добавить их в расписание, допишите текст в скобках к имени группы, напр. ИМгр-123 $0 $2 $39."
        + " Также вы можете отредактировать расписание вручную, нажав на кнопку с карандашом на изображении"
        + " или <a href='./help-page.html' target='blank' class='link'>написать сюда</a>.";
}

window.updateUserdataF ??= () => () => { console.error('No function defined') }

function __load_test() { import('./test.js'); }

const loadDependencies = Promise.all([
    loadRender, loadSchedule, loadCommon, loadElements,
    loadPopups, createGenSettings,
    loadPdfjs, loadPdflibJs, loadFontkit,
])

loadDependencies.catch(async(e) => {
    await loadDom
    updateUserdataF('regDocumentError')('global', 'global', e)
    printScheduleError(e)
})

function getEditParams() {
    const rowRatio = Number(genSettings.heightEl.value) / 100;
    const borderFactor = Number(genSettings.borderSizeEl.value) / 1000;
    if(!(rowRatio < 1000 && rowRatio > 0.001)) throw ['неправильное значение высоты строки', genSettings.heightEl.value];
    if(!(borderFactor < 1000 && borderFactor >= 0)) throw ['неправильное значение ширины границы', genSettings.borderSizeEl.value];
    const drawBorder = genSettings.drawBorder;
    const dowOnTop = genSettings.dowOnTop;
    const scheme = readScheduleScheme(readElementText(genSettings.scheduleLayoutEl));

    return { rowRatio, scheme, drawBorder, dowOnTop, borderFactor };
}

async function findName(docData, pageCount, nameFixed) {
    var errorCount = 0
    for(pageI = 0; pageI < pageCount; pageI++) try {
        const pageData = await docData.pages.get(pageI);
        const cont = pageData.text;

        const contLength = cont.length;
        for(contI = 0; contI < contLength; contI++) try {
            if(nameFixed == nameFixup(cont[contI].str)) {
                return { pageData, pageI, itemI: contI, errorCount }
            }
        } catch(e) { errorCount++; console.error(e); }
    } catch(e) { errorCount++; console.error(e); }
}

async function processPDF(userdata, name, indices) {
    updInfo({ msg: 'Ожидаем зависимости', progress: 0 })

    const filename = currentFilename;
    const outFilename = filename + '_' + name; //I hope the browser will fix the name if it contains chars unsuitable for file name
    const editParams = getEditParams();
    editParams.filename = outFilename;

    await loadDependencies

    updInfo({ msg: 'Начинаем обработку', progress: 0.1 });

    const nameFixed = nameFixup(name);

    const docData = await currentDocumentData
    try { orig = await docData.taskPromise }
    catch (e) { throw ["Документ не распознан как PDF", e] }

    const itemInfo = await findName(docData, orig.numPages, nameFixed);

    var errorCount = 0
    if(itemInfo) try {
        const page = itemInfo.pageData.page
        const cont = itemInfo.pageData.text
        const contI = itemInfo.itemI
        errorCount += itemInfo.errorCount

        updInfo({ msg: 'Достаём расписание из файла', progress: 0.2 })
        const [schedule, dates, bigFields] = makeSchedule(cont, page.view, contI, indices);
        const warningText = makeWarningText(schedule, editParams.scheme, bigFields);
        updInfo({ msg: 'Создаём изображение расписания', progress: 0.3 })

        const renderer = createRecorderRenderer(createCanvasRenderer());
        await renderSchedule(renderer, schedule, editParams.scheme, editParams);
        const commands = renderer.commands;
        const defaultImgP = renderer.innerRenderer.canvas[1]();

        updInfo({ msg: 'Создаём предпросмотр', progress: 0.4 });
        editParams.schedule = schedule
        editParams.dates = dates
        editParams.userdata = userdata

        await createAndInitOutputElement(
            renderer.width, renderer.height,
            defaultImgP, commands,
            dom.outputsEl, outFilename,
            editParams, userdata,
        );

        updInfo({ msg: 'Готово. Пожалуйста, поделитесь сайтом с друзьями ❤️', warning: warningText, progress: 1.0 });
        updateUserdataF('regDocumentCreated')(...userdata);
        return;
    }
    catch(e) {
        const cont = itemInfo.pageData.text
        const pageI = itemInfo.pageI
        const contI = itemInfo.itemI

        if(!Array.isArray(e)) e = [e];
        e.push("номер страницы: " + (pageI+1) + '/' + orig.numPages);
        e.push("[название группы] = " + contI + '/' + cont.length);
        throw e;
    }
    // If no name found, seach closest one

    // если название группы контрактников, сохраняем место неконтрактной группы
    const contractRegex = (/^(\p{L}+)к[2-9](\p{N}*)$/u)
    const isContract = contractRegex.test(nameFixed)
    const nameFixed2 = nameFixupEvenMore(name)
    const regularName = !isContract ? undefined : nameFixed2.replace(contractRegex, '$11$2') // $1 1 $2 без к и первая цифра - 1
    const minBound = Math.max(Math.min(nameFixed2.length*0.5, nameFixed2.length - 4), 1)
    const maxBound = Math.max(nameFixed2.length*2, nameFixed2.length + 4, 1)
    var closestName = undefined, closestN = Infinity, closestNamePage = undefined;
    var lettersIssue = false


    for(let j = 0; j < orig.numPages; j++) try {
        const pageData = await docData.pages.get(j);
        const cont = pageData.text;

        const contLength = cont.length;
        for(let i = 0; i < contLength; i++) try {
            const oname = nameFixupEvenMore(cont[i].str)
            if(oname == nameFixed2) {
                lettersIssue = true
                closestName = cont[i].str
                closestNamePage = j
                closestN = 0
                break
            }
            if (oname == regularName) {
                closestName = cont[i].str;
                closestNamePage = j;
                closestN = 0;
                break
            }

            if(oname.length < minBound || oname.length > maxBound) continue;
            const n = levenshteinDistance(nameFixed2, oname);
            if(n < closestN) {
                closestName = cont[i].str;
                closestNamePage = j;
                closestN = n;
            }
        } catch(e) { console.error(e) }

        if(closestN == 0) break
    } catch(e) { console.error(e) }

    let msg = "имя `" + name + "` не найдено";
    if(closestName != undefined) {
        msg += ", возможно вы имели в виду `" + closestName
            + "`"
            + (lettersIssue ? " (другая кириллица/латиница)" : "")
            + " на странице " + (closestNamePage + 1);
    }
    msg += ", страниц: " + orig.numPages;
    if(errorCount != 0) {
        msg += ", ошибок при работе: " + errorCount;
    }
    throw msg;
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

    updError({ msg: str, progress: curStatus.progress })
}

const valuesRow = new Array();
function levenshteinDistance(str1, str2) {
    var s1, s2;
    if(str1.length < str2.length) { s1 = str1; s2 = str2; }
    else { s1 = str2; s2 = str1; }
    if(s1.length === 0) return s2.length;

    const len = s1.length;
    const row = valuesRow;
    row.length = 0;
    row.length = len;
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
