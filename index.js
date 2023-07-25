const groupInput = $('#group-input') 
const startButton = $('.start-button')
const groupBar = $('.group-bar')
const moveWithBorder = $('.move-with-border')
const progressBar = $('.progress-bar')
const statuses = $('#statuses')
const filenameElement = $('#filename')
const outputs = $('#outputs')

const stagesC = 4;
let currentFileContent;
let currentFi;
let currentPending, processing;
let currentStage;

function clearPrompt() {
    groupInput.val('')
}

const settingsEl = document.querySelector('.generation-settings')
const genPopupEl = insertPopup(settingsEl)
const genPopupId = registerPopup(genPopupEl)
let keepGenPopupOpen = false
addOwner('hover', genPopupId)
addOwner('click', genPopupId)
let genPopupKeepOpened = false
settingsEl.firstElementChild.addEventListener('click', () => {
    keepGenPopupOpen = !keepGenPopupOpen;
    if(keepGenPopupOpen) updatePopup('click', genPopupId, stateShown)
    else updatePopup('click', genPopupId, stateHidden)
    settingsEl.setAttribute('data-pressed', keepGenPopupOpen)
})
$(settingsEl.firstElementChild).on('mouseenter', () => {
    updatePopupAfterMs('hover', genPopupId, stateShown, 300)
}).on('mouseleave', () => {
    updatePopupAfterMs('hover', genPopupId, stateHidden, 500)
})


genPopupEl.popup.appendChild($('<div style="margin-bottom: 0.3rem">Расположение дней:</div>').get()[0])
const scheduleLayoutEl = genPopupEl.popup.appendChild($(`<div contentEditable="true" style="width: 100%; border: none; outline: none; border-bottom: 1px solid white; min-height: 1rem; display: inline-block; font-family: monospace; font-size: 1.0rem"></div>`).get()[0])
scheduleLayoutEl.innerHTML = 'Пн Чт<br\>Вт Пт<br\>Ср Сб'/*
    textContent - ignores line breaks,
    innerText - doesn't read when the element is hidden (nice)  https://stackoverflow.com/a/43740154/18704284
*/

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
        setStatus('Для продолжения требуется имя группы, нажмите Enter для продолжения')
        return
    }

    processing = true;

    processPDF().then(() => { updatePending(false); processing = false; })
}

function updatePending(newValue) {
    currentPending = newValue;
    if(currentPending) startButton.attr('data-pending', '')
    else startButton.removeAttr('data-pending')
    checkShouldProcess()
}

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
function nextStage(msg) {
    currentStage++;
    if(currentStage >= stagesC) {
        console.log("change stagesC! (" + currentStage + ")")
    }
    progressBar.css('background-color', '')
    resizeProgressBar(false)
    statuses.text(msg).css('color', '#202020').css({opacity:1})
}
function stageError(msg) {
    if(currentStage == -1) currentStage = stagesC-1
    progressBar.css('background-color', '#f15642')
    resizeProgressBar(false)
    statuses.text("Ошибка: " + msg).css('color', '#f15642').css({opacity:1})
}
function setStatus(msg) {
    if(!msg || msg.trim() === '') statuses.text('\u200c').css({opacity:0})
    else statuses.text(msg).css('color', '#202020').css({opacity:1})
}

$('.file-picker').on('click', function() {
    pickFile(function(e) {
        console.log(e)
        loadFromListFiles(e.target.files)
    })
})
window.addEventListener('drop', function(ev) { 
    ev.preventDefault();
    hideOverlay()

    const list = ev.dataTransfer.files;
    if(list.length !== 0) {
        loadFromListFiles(list)
    }
    else {
        //if you drop files fast enough sometimes files list would be empty
        stageError("Не удалось получить файлы. Попробуйте перетащить их ещё раз");
    }
})

async function loadFromListFiles(list) {
    resetStage()

    for(let i = 0; i < list.length; i++) {
        const file = list[i]
        const ext = file.name.endsWith('.pdf')
        if(ext || i === list.length-1) {
            currentFilename = file.name;
            if(ext) currentFilename = currentFilename.substring(0, currentFilename.length-4)
            currentFileContent = await file.arrayBuffer()

            filenameElement.text('Файл' + (list.length === 1 ? '' : ' №' + (i+1)) + ': ' + file.name).css({opacity:1})
            setStatus("Файл загружен")

            checkShouldProcess()
            return
        }
    }

    stageError('неправильное расширение файла')
}

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';
resetStage()
updatePending(true)

async function processPDF0(name, contents, width) {
    setStatus("Начинаем обработку")

    const nameLower = name.toLowerCase()

    const scheme = readScheduleScheme(scheduleLayoutEl.innerHTML.replace(/<\s*[bB][rR]\s*\/?>/g, '\n'))

    let pdf
    try { pdf = await pdfjsLib.getDocument({ data: contents }).promise }
    catch (e) { throw ["Документ не распознан как PDF", e] }

    for(let j = 0; j < pdf.numPages; j++) {
        try {
        const page = await pdf.getPage(j + 1);
        const cont = (await page.getTextContent()).items;

        for(let i = 0; i < cont.length; i++) {
            if(cont[i].str.toLowerCase() === nameLower) try {

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
                const schedule = makeSchedule(cont, vBounds, boundsH);
                nextStage("Создаём PDF файл расписания")
                const doc = await scheduleToPDF(schedule, scheme, 1000)
                nextStage("Создаём предпросмотр")
                const outputElement = createOutputElement()
                outputElement.image.src = URL.createObjectURL(await renderPDF(copy(doc), width))
                nextStage("Готово")
                return [outputElement, doc, schedule, scheme];
            }
            catch(e) {
                const add = "[название группы] = " + i + '/' + cont.length
                if(Array.isArray(e)) { e.push(add); throw e }
                else throw [e, add] 
            }
        }
        } catch(e) {
            const add = "[страница] = " + j + '/' + pdf.numPages
            if(Array.isArray(e)) { e.push(add); throw e }
            else throw [e, add] 

        }
    }
    throw ["Имя группы не найдено", "количество страниц = " + pdf.numPages];
}

async function processPDF() {
    try {
        const name = groupInput.val().toString().trim()
        const width = 250

        resetStage()
        //TypeError: Cannot perform Construct on a detached ArrayBuffer
        //index.js:198 DOMException: Failed to execute 'postMessage' on 'Worker': ArrayBuffer at index 0 is already detached.
        const [element, pdf, schedule, scheme] = await processPDF0(name, copy(currentFileContent), width, nextStage)
        outputs.get()[0].appendChild(element.element)

        const outFilename = currentFilename + '_' + name;

        $(element.name).text(outFilename)
        $(element.viewPDF).on('click', function() {
            var fileURL = window.URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
            let tab = window.open();
            tab.location.href = fileURL;
        })
        $(element.del).on('click', function() {
            outputs.get()[0].removeChild(element.element)
        })
        $(element.downloadImg).on('click', async function() {
            const blob = await renderPDF(copy(pdf), 1000)
            download(blob, outFilename + '.png')
        })
        $(element.edit).on('click', function() {
            var parms = JSON.stringify({ schedule: schedule, scheme: scheme });
            var storageId = "parms" + String(Date.now());
            sessionStorage.setItem(storageId, parms);
            window.open("./fix.html" + "?sid=" + storageId);
        })
    }
    catch(e) {
        let str = ''
        if(Array.isArray(e)) {
            for(let i = 0; i < e.length; i++) {
                if(i !== 0) str += ', '
                str += e[i]
            }
        }
        else str += e

        console.error(e)
        stageError(str)
    }
}

function download(file, filename) {
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
        url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
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

//https://stackoverflow.com/a/22114687/18704284
function copy(src) {
    var dst = new ArrayBuffer(src.byteLength);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
}
