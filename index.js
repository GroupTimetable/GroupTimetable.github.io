const groupInput = $('#group-input') 
const startButton = $('.start-button')
const groupBar = $('.group-bar')
const moveWithBorder = $('.move-with-border')
const progressBar = $('.progress-bar')
const statusEl = $('#status')
const warningEl = $('#warning')
const filenameElement = $('#filename')
const outputs = $('#outputs')
const innerTextHack = document.getElementById('inner-text-hack')

const stagesC = 4;
let currentFileContent;
let currentFi;
let currentPending, processing;
let currentStage;

function clearPrompt() {
    groupInput.val('')
}

let scheduleLayoutEl
{
const settingsEl = document.querySelector('.generation-settings')
const genPopupEl = insertPopup(settingsEl)
const genPopupId = registerPopup(genPopupEl)

popupAddHoverClick(genPopupId, settingsEl.firstElementChild, (pressed) => settingsEl.setAttribute('data-pressed', pressed))

genPopupEl.popup.appendChild($('<div style="margin-bottom: 0.3rem">Расположение дней:</div>').get()[0])
scheduleLayoutEl = genPopupEl.popup.appendChild($(`<div contentEditable="true" style="width: 100%; border: none; outline: none; border-bottom: 1px solid white; min-height: 1rem; display: inline-block; font-family: monospace; font-size: 1.0rem"></div>`).get()[0])
scheduleLayoutEl.innerHTML = 'Пн Чт<br\>Вт Пт<br\>Ср Сб'
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
    setStatus('')
    if(!currentPending) return;

    if(currentFileContent == undefined) {
        setStatus('Для продолжения требуется файл расписания')
        return
    }
    const name = groupInput.val().toString().trim()
    if(name == '') {
        setStatus('Для продолжения введите имя группы и нажмите <span style="color: rgb(124 10 144)">Enter</span>')
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


function resizeProgressBar(immediately) {
    const w = groupBar.width()
    const b = groupBar.height() * 0.5 

    moveWithBorder.css({ 'margin-left': b, 'margin-right': b })

    let newW;
    if(currentStage === -1) newW = 0;
    else if(currentStage+1 === stagesC) newW = w;
    else newW = (currentStage+1) / stagesC * (w - 2*b) + b;
    if(immediately) progressBar.css('transition', 'width: 0ms')
    progressBar.css('width', newW + 'px').css('transition', '')
}
new ResizeObserver(() => resizeProgressBar(true)).observe(groupBar.get()[0])
function resetStage() {
    currentStage = -1
    resizeProgressBar(false)
    setStatus('')
}
function nextStage(msg, warning) {
    currentStage++;
    if(currentStage >= stagesC) {
        console.log("change stagesC! (" + currentStage + ")")
    }
    progressBar.css('background-color', '')
    resizeProgressBar(false)
    setStatus(msg, warning)
}
function setError(msg) {
    if(currentStage == -1) currentStage = stagesC-1
    progressBar.css('background-color', '#f15642')
    resizeProgressBar(false)
    statusEl.html("Ошибка: " + msg).css('color', '#f15642').css({opacity:1})
    warningEl.text('').css({opacity:0})
}
function setStatus(msg, warning) {
    if(!msg || msg.trim() === '') statusEl.text('\u200c').css({opacity:0})
    else statusEl.html(msg).css('color', '#202020').css({opacity:1})
    if(!warning || warning.trim() === '') warningEl.text('').css({opacity:0})
    else warningEl.html(warning).css({opacity:1})
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
        setError("Не удалось получить файлы. Попробуйте перетащить их ещё раз");
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
                setStatus("Файл загружен")
                $(document.body).attr('data-fileLoaded', '')

                checkShouldProcess()
                return
            }
        }

        if(i < list.length) continue

        setError(errorReason)
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
    resetStage()
    setStatus("Начинаем обработку")

    const contents = copy(currentFileContent)
    const name = groupInput.val().toString().trim()

    const nameFixed = nameFixup(name)

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
                nextStage("Достаём расписание из файла")
                const [schedule, bigFields] = makeSchedule(cont, vBounds, boundsH);
                nextStage("Создаём PDF файл расписания")
                const doc = await scheduleToPDF(schedule, scheme, 1000)

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


                nextStage("Создаём предпросмотр")
                const outFilename = currentFilename + '_' + name; //I hope the browser will fix the name if it contains chars unsuitable for file name
                const img = await renderPDF(copy(doc), 250)
                createAndInitOutputElement(scheme, schedule, doc, img, outputs.get()[0], outFilename)

                nextStage("Готово", warningText)
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
    throw ["Имя группы не найдено", "количество страниц = " + orig.numPages];
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

        setError(str)
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

