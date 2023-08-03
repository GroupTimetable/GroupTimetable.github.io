const groupInput = $('#group-input') 
const startButton = $('.start-button')
const groupBar = $('.group-bar')
const moveWithBorder = $('.move-with-border')
const progressBar = $('.progress-bar')
const statusEl = $('#status')
const warningEl = $('#warning')
const filenameElement = $('#filename')
const outputs = $('#outputs')

/*HTML does not have any way to make resizable multiline prompt
the only other option, namely contentEditable=true, has a number of fields for reading text, none of which work:
  textContent - ignores line breaks,
  innerText - doesn't read when the element is hidden (nice)  https://stackoverflow.com/a/43740154/18704284
  innerHTML - returns <br> and $nbsp; and God knows what else

  the idea behind this div is simple, we will use visible element + innerText, and I hope it won't break bc of height 0*/
const innerTextHack = hiddenElement.appendChild(document.createElement('div'))

let currentFileContent;
let currentFi;
let currentPending, processing;

let prevProgress
let curStatus = {};

function clearPrompt() {
    groupInput.val('')
}

let scheduleLayoutEl
let heightEl
{
    const settingsEl = document.querySelector('.generation-settings')
    const genPopupEl = insertPopup(settingsEl)
    const genPopupId = registerPopup(genPopupEl)

    const genPopupHTML = htmlToElement(`<div>
        <div style="margin-bottom: 0.3rem">Расположение дней:</div>
        <div class="days-scheme" contentEditable="true" style="border:none;outline:none; border-bottom: 1px solid white; 
            white-space: nowrap;
            width: 100%; min-height: 1rem; display: inline-block; font-family: monospace; font-size: 1.0rem"></div>
        <div style="margin-top: 0.6rem; display: flex; align-items: baseline">
            <div style="text-align: right; flex-grow: 1">Высота&nbsp;строки:&nbsp;</div>
            <input class="height-input" type="number" style="
                text-align: right; font-size: 1rem; color: white;
                border-bottom: 0.1rem solid white"
                max="6" min="0"/>
            <div>%</div>
        </div>
    </div>`)

    popupAddHoverClick(genPopupId, settingsEl.firstElementChild, (pressed) => settingsEl.setAttribute('data-pressed', pressed))

    genPopupEl.popup.appendChild(genPopupHTML)
    scheduleLayoutEl = genPopupHTML.querySelector('.days-scheme') 
    scheduleLayoutEl.innerHTML = 'Пн Чт<br\>Вт Пт<br\>Ср Сб'
    heightEl = genPopupHTML.querySelector('.height-input')
    heightEl.value = (1/5.2 * 100).toFixed(2)
}

function hideOverlay() {
    $('#drop-zone').css('visibility', 'hidden').css('opacity', '0') 
}

function showOverlay() {
    $("#drop-zone").css('visibility', '').css('opacity', '1')
}

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

$(window).on("dragover", function (e) {
    e.preventDefault();
});

function checkShouldProcess() {
    if(processing) return;
    if(!currentPending) return;

    resetStage()
    if(currentFileContent == undefined) {
        updInfo({ msg: 'Для продолжения требуется файл расписания', type: 'pending' })
        return
    }
    const name = groupInput.val().toString().trim()
    if(name == '') {
        updInfo({
            msg: 'Для продолжения введите имя группы и нажмите <span style="color: rgb(124 10 144)">Enter</span>', 
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
    currentPending = newValue;
    if(!currentPending && curStatus.level === 'info'
        && (curStatus.type == undefined || curStatus.type === 'pending')
    ) updInfo({ msg: '', type: 'pending' })
    if(currentPending) startButton.attr('data-pending', '')
    else startButton.removeAttr('data-pending')
    checkShouldProcess()
}

groupInput.on('blur', function(e) {
    if(processing) return
    checkShouldProcess() 
})
groupInput.on('keypress', function(e) {
    if(processing) return
    if (e.key === "Enter") updatePending(true)
})
startButton.on('click', function() {
    if(processing) return;
    updatePending(!currentPending)
})


function resizeProgressBar(progress, immediately) {
    const w = groupBar.width()
    const b = groupBar.height() * 0.5 

    if(progress < 0 || progress > 1) {
        console.error('progress out of bounds', progress)
        progress = Math.min(Math.max(progress, 0), 1)
    }

    moveWithBorder.css({ 'margin-left': b, 'margin-right': b })

    let newW;
    if(progress === undefined) newW = 0;
    else if(progress === 1) newW = w;
    else newW = progress * (w - 2*b) + b;
    //https://stackoverflow.com/a/21594219/18704284
    progressBar.attr('data-transition', !immediately)
    progressBar.css('width', newW + 'px')
}
new ResizeObserver(() => resizeProgressBar(curStatus.progress, true)).observe(groupBar.get()[0])
function resetStage() {
    curStatus = { level: 'info' }
    updStatus()
}

function updStatus() { try {
    const s = curStatus

    if(s.level === 'error') {
        progressBar.css('background-color', '#f15642')
        if(prevProgress !== s.progress) resizeProgressBar(s.progress)

        statusEl.html("Ошибка: " + s.msg).css('color', '#f15642').css({opacity:1})
    }
    else if(s.level === 'info') {
        progressBar.css('background-color', '')
        if(prevProgress !== s.progress) resizeProgressBar(s.progress)

        if(!s.msg || s.msg.trim() === '') statusEl.text('\u200c').css({opacity:0})
        else statusEl.html(s.msg).css('color', '#202020').css({opacity:1})
    }
    else throw "Неизвестный уровень статуса: `" + s.level + "`"

    if(!s.warning || s.warning.trim() === '') warningEl.text('').css({opacity:0})
    else warningEl.html(s.warning).css({opacity:1})

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

$('.file-picker').on('click', function() {
    pickFile(e => loadFromListFiles(e.target.files))
})
window.addEventListener('drop', function(ev) { 
    ev.preventDefault();
    hideOverlay()
    loadFromListFiles(ev.dataTransfer.files)
})
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
                filenameElement.text('Файл' + (list.length === 1 ? '' : ' №' + (i+1)) + ': ' + file.name).css({opacity:1})
                updInfo({ msg: 'Файл загружен', type: 'fieldUpdate' })
                $(document.body).attr('data-fileLoaded', '')

                checkShouldProcess()
                return
            }
        }

        if(i < list.length) continue

        updError({ msg: errorReason, type: 'fieldUpdate', progress: undefined })
        return
    }

}

//pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';
const workerUrl = URL.createObjectURL(new Blob(
    ['importScripts("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.js")'],
    { type: 'text/javascript' }
))
pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(workerUrl);
URL.revokeObjectURL(workerUrl)

resetStage()
updatePending(true)

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

function readElementText(element) {
    innerTextHack.innerHTML = element.innerHTML
    return innerTextHack.innerText
}

async function processPDF0() {
    const stagesC = 4
    let stage = 0
    const ns = () => { return ++stage / (stagesC+1) }
    updInfo({ msg: 'Начинаем обработку', type: 'processing', progress: ns() })

    const contents = copy(currentFileContent)
    const name = groupInput.val().toString().trim()
    const nameFixed = nameFixup(name)
    const rowRatio = Number.parseFloat(heightEl.value) / 100
    if(!(rowRatio < 1000 && rowRatio > 0.001)) throw ['Неправильное значение высоты строки', heightEl.value]
    const scheme = readScheduleScheme(readElementText(scheduleLayoutEl))

    const origTask = pdfjsLib.getDocument({ data: contents }); try {
    let orig
    try { orig = await origTask.promise }
    catch (e) { throw ["Документ не распознан как PDF", e] }

    for(let j = 0; j < orig.numPages; j++) {
        try {
            const page = await orig.getPage(j + 1);
            const cont = (await page.getTextContent()).items;

            for(let i = 0; i < cont.length; i++) {
                if(nameFixup(cont[i].str) === nameFixed) try {

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

                const boundsH = findItemBoundsH(cont, i);
                const vBounds = findDaysOfWeekHoursBoundsV(cont);
                updInfo({ msg: 'Достаём расписание из файла', type: 'processing', progress: ns() })
                const [schedule, bigFields] = makeSchedule(cont, vBounds, boundsH);
                updInfo({ msg: 'Создаём PDF файл расписания', type: 'processing', progress: ns() })
                const doc = await scheduleToPDF(schedule, scheme, 1000, rowRatio)

                let warningText = ''
                if(bigFields.length !== 0) {
                    warningText += "Внимание, обнаружены большие поля названий уроков (" 
                    for(let i = 0; i < bigFields.length; i++) {
                        const f = bigFields[i]
                        const d = schedule[f.day]
                        const h = d[f.hours]
                        warningText += daysOfWeek[f.day] + '-' + minuteOfDayToString(h.sTime) +  '; '
                    }
                    warningText = warningText.substring(0, warningText.length-2)
                    warningText += "). Проверьте полученное расписание на их корркетность"
                }


                updInfo({ msg: 'Создаём предпросмотр', type: 'processing', progress: ns() })
                const outFilename = currentFilename + '_' + name; //I hope the browser will fix the name if it contains chars unsuitable for file name
                const img = await renderPDF(copy(doc), 250)
                createAndInitOutputElement(scheme, schedule, doc, img, outputs.get()[0], outFilename)

                updInfo({ msg: 'Готово', warning: warningText, type: 'processing', progress: ns() })
                return
            }
            catch(e) {
                const add = "[название группы] = " + i + '/' + cont.length
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
    throw ["Имя группы не найдено `" + name + "`", "количество страниц = " + orig.numPages];
    } finally { await origTask.destroy() }
}

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
    $(f).on('change', callback)
    document.body.appendChild(f);
    f.click();
    setTimeout(function() {
        document.body.removeChild(f);
    }, 0);
}

