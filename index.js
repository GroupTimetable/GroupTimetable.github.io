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

$(window).on("dragstart dragend dragover drag", function (e) {
    e.preventDefault();
});

function checkShouldProcess() {
    if(processing) return;
    setStatus('')
    if(!currentPending) return;

    const name = groupInput.val().toString().trim()
    if(name == '') {
        setStatus('Для продолжения требуется имя группы')
        return
    }
    if(currentFileContent == undefined) {
        setStatus('Для продолжения требуется файл расписания')
        return
    }

    processing = true;

    processPDF().then(() => { updatePending(false); processing = false; })
}

function updatePending(newValue) {
    currentPending = newValue;
    if(currentPending) startButton.attr('pending', '')
    else startButton.removeAttr('pending')
    checkShouldProcess()
}

groupInput.on('change', function() {
    if(processing) return;
    updatePending(true)
}).on('keypress', function(e) {
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
    statuses.text('\u200c')
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
    statuses.text(msg).css('color', '#202020').css({opacity:1})
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

    let list
    if(ev.dataTransfer.items) {
        list = []
        const list0 = ev.dataTransfer.items;
        for(let i = 0; i < list0.length; i++) {
            if(list0[i].kind === 'file') list.push(list0[i].getAsFile())
        }
    }
    else list = ev.dataTransfer.files;

    loadFromListFiles(list)
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

function createOutputElement() {
    const el = $(`
<div class="output-cont">
<span style="display: block" class="name"></span>
<div class="output">
    <img class="preview"></img>
    <div class="out-overlay">
        <div class="out-header">
            <div class="icons">
                <svg class="view-pdf" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
                     viewBox="0 0 512 512"  xml:space="preserve" transform="matrix(-1,0,0,1,0,0)">
                <g>
                    <path d="M449.803,62.197C408.443,20.807,353.85-0.037,299.646-0.006C245.428-0.037,190.85,20.807,149.49,62.197
                        C108.1,103.557,87.24,158.15,87.303,212.338c-0.047,37.859,10.359,75.766,30.547,109.359L15.021,424.525
                        c-20.016,20.016-20.016,52.453,0,72.469c20,20.016,52.453,20.016,72.453,0L190.318,394.15
                        c33.578,20.203,71.5,30.594,109.328,30.547c54.203,0.047,108.797-20.797,150.156-62.188
                        c41.375-41.359,62.234-95.938,62.188-150.172C512.053,158.15,491.178,103.557,449.803,62.197z M391.818,304.541
                        c-25.547,25.531-58.672,38.125-92.172,38.188c-33.5-0.063-66.609-12.656-92.188-38.188c-25.531-25.578-38.125-58.688-38.188-92.203
                        c0.063-33.484,12.656-66.609,38.188-92.172c25.578-25.531,58.688-38.125,92.188-38.188c33.5,0.063,66.625,12.656,92.188,38.188
                        c25.531,25.563,38.125,58.688,38.188,92.172C429.959,245.854,417.365,278.963,391.818,304.541z"/>
                </g>
                </svg>

                <svg class="settings" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <defs>
                        <mask id="hole">
                            <rect width="100%" height="100%" fill="white"/>
                            <circle cx="12" cy="12" r="5.5" fill="black"/>
                        </mask>
                    </defs>
                    <path mask="url(#hole)" d="M13.85 22.25h-3.7c-.74 0-1.36-.54-1.45-1.27l-.27-1.89c-.27-.14-.53-.29-.79-.46l-1.8.72c-.7.26-1.47-.03-1.81-.65L2.2 15.53c-.35-.66-.2-1.44.36-1.88l1.53-1.19c-.01-.15-.02-.3-.02-.46 0-.15.01-.31.02-.46l-1.52-1.19c-.59-.45-.74-1.26-.37-1.88l1.85-3.19c.34-.62 1.11-.9 1.79-.63l1.81.73c.26-.17.52-.32.78-.46l.27-1.91c.09-.7.71-1.25 1.44-1.25h3.7c.74 0 1.36.54 1.45 1.27l.27 1.89c.27.14.53.29.79.46l1.8-.72c.71-.26 1.48.03 1.82.65l1.84 3.18c.36.66.2 1.44-.36 1.88l-1.52 1.19c.01.15.02.3.02.46s-.01.31-.02.46l1.52 1.19c.56.45.72 1.23.37 1.86l-1.86 3.22c-.34.62-1.11.9-1.8.63l-1.8-.72c-.26.17-.52.32-.78.46l-.27 1.91c-.1.68-.72 1.22-1.46 1.22z"></path></svg> 
                   
                <span style="flex: 1 1 0px"></span>

                <svg class="delete" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                </svg>
            </div>
        </div>
        <div class="download-img" style="flex: 1 1 0px; background-color: #ffffff80; display: flex; justify-content: center; align-items: center">
            <svg style="width: 50%; height: 50%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path id="Vector" d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12" stroke="#202020" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </div>
    </div>
</div>
</div>
    `);
    return { 
        element: el.get()[0], 
        name: el.find('.name').get()[0], 
        image: el.find('img').get()[0],
        viewPDF: el.find('.view-pdf').get()[0],
        del: el.find('.delete').get()[0],
        downloadImg: el.find('.download-img').get()[0],
    };
}

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';
resetStage()
updatePending(true)

let daysScheme = [[0, 1, 2], [3, 4]]

let iota = 2000;
const incorrectGroupName = iota++;
const incorrectFile = iota++;
const noGroupWithName = iota++;

async function renderPDF(doc, width) {
    const pdf = await pdfjsLib.getDocument(doc).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: width / page.getViewport({scale:1}).width })

    const canvas = new OffscreenCanvas(
        Math.floor(viewport.width),
        Math.floor(viewport.height)
    )
    const context = canvas.getContext("2d");

    const renderContext = {
        canvasContext: context,
        transform: null, viewport,
    };
    
    await page.render(renderContext).promise;

    return await canvas.convertToBlob();
}

async function processPDF0(name, contents, width, stage) {
    let pdf
    try { pdf = await pdfjsLib.getDocument({ data: contents }).promise }
    catch (e) { throw [incorrectFile, e] }

    for(let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const cont = (await page.getTextContent()).items;

        for(let i = 0; i < cont.length; i++) {
            if(cont[i].str === name) {
                const boundsH = findItemBoundsH(cont, i);
                const vBounds = findDaysOfWeekHoursBoundsV(cont);
                stage("Достаём расписание из файла")
                const schedule = makeSchedule(cont, vBounds, boundsH);
                stage("Создаём PDF файл расписания")
                const doc = await scheduleToPDF(schedule, daysScheme, 1000)
                stage("Создаём предпросмотр")
                const outputElement = createOutputElement()
                outputElement.image.src = URL.createObjectURL(await renderPDF(copy(doc), width))
                stage("Готово")
                return [outputElement, doc];
            }
        }

        throw [noGroupWithName];
    }
}

async function processPDF() {
    try {
        const name = groupInput.val().toString().trim()
        const width = 250

        resetStage()
        //TypeError: Cannot perform Construct on a detached ArrayBuffer
        //index.js:198 DOMException: Failed to execute 'postMessage' on 'Worker': ArrayBuffer at index 0 is already detached.
        const [element, pdf] = await processPDF0(name, copy(currentFileContent), width, nextStage)
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
    }
    catch(e) {
        if((typeof e[0]) === 'number') {
            console.error(e[1])
            stageError(e)
            stageError('Ошибка ' + (typeof e) + '(' + e + ')')
        }
        else {
            console.error(e)
            stageError('неизвестная ошибка ' + (typeof e) + '(' + e + ')')
        }
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
