//https://stackoverflow.com/a/35385518/18704284
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function createOutputElement() {
    const el = htmlToElement(`
<div class="output-cont" style="display: flex; align-items: center; flex-direction: column;">
<span style="display: block" class="name"></span>
<div class="output">
    <img style="display: block"></img>
    <div class="out-overlay">
        <div class="out-header">
            <div class="icons">
                <div class="settings" title="Настройки изображения">
                    <svg style="width: inherit; height: inherit;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M13.85 22.25h-3.7c-.74 0-1.36-.54-1.45-1.27l-.27-1.89c-.27-.14-.53-.29-.79-.46l-1.8.72c-.7.26-1.47-.03-1.81-.65L2.2 15.53c-.35-.66-.2-1.44.36-1.88l1.53-1.19c-.01-.15-.02-.3-.02-.46 0-.15.01-.31.02-.46l-1.52-1.19c-.59-.45-.74-1.26-.37-1.88l1.85-3.19c.34-.62 1.11-.9 1.79-.63l1.81.73c.26-.17.52-.32.78-.46l.27-1.91c.09-.7.71-1.25 1.44-1.25h3.7c.74 0 1.36.54 1.45 1.27l.27 1.89c.27.14.53.29.79.46l1.8-.72c.71-.26 1.48.03 1.82.65l1.84 3.18c.36.66.2 1.44-.36 1.88l-1.52 1.19c.01.15.02.3.02.46s-.01.31-.02.46l1.52 1.19c.56.45.72 1.23.37 1.86l-1.86 3.22c-.34.62-1.11.9-1.8.63l-1.8-.72c-.26.17-.52.32-.78.46l-.27 1.91c-.1.68-.72 1.22-1.46 1.22zM6.5 12a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0" fill-rule="evenodd"/>
                    </svg>
                </div>

                <svg class="view-pdf" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
                     viewBox="0 0 512 512"  xml:space="preserve" transform="matrix(-1,0,0,1,0,0)">
                    <title>Открыть файл в новой вкладке</title>
                    <path d="M449.803,62.197C408.443,20.807,353.85-0.037,299.646-0.006C245.428-0.037,190.85,20.807,149.49,62.197
                        C108.1,103.557,87.24,158.15,87.303,212.338c-0.047,37.859,10.359,75.766,30.547,109.359L15.021,424.525
                        c-20.016,20.016-20.016,52.453,0,72.469c20,20.016,52.453,20.016,72.453,0L190.318,394.15
                        c33.578,20.203,71.5,30.594,109.328,30.547c54.203,0.047,108.797-20.797,150.156-62.188
                        c41.375-41.359,62.234-95.938,62.188-150.172C512.053,158.15,491.178,103.557,449.803,62.197z M391.818,304.541
                        c-25.547,25.531-58.672,38.125-92.172,38.188c-33.5-0.063-66.609-12.656-92.188-38.188c-25.531-25.578-38.125-58.688-38.188-92.203
                        c0.063-33.484,12.656-66.609,38.188-92.172c25.578-25.531,58.688-38.125,92.188-38.188c33.5,0.063,66.625,12.656,92.188,38.188
                        c25.531,25.563,38.125,58.688,38.188,92.172C429.959,245.854,417.365,278.963,391.818,304.541z"/>
                </svg>

                <svg class="edit" viewBox="3 3 18 18" xmlns="http://www.w3.org/2000/svg">
                    <title>Изменить</title>
                <path d="M13.2942 7.95881C13.5533 7.63559 13.5013 7.16358 13.178 6.90453C12.8548 6.64549 12.3828 6.6975 12.1238 7.02072L13.2942 7.95881ZM6.811 14.8488L7.37903 15.3385C7.38489 15.3317 7.39062 15.3248 7.39623 15.3178L6.811 14.8488ZM6.64 15.2668L5.89146 15.2179L5.8908 15.2321L6.64 15.2668ZM6.5 18.2898L5.7508 18.2551C5.74908 18.2923 5.75013 18.3296 5.75396 18.3667L6.5 18.2898ZM7.287 18.9768L7.31152 19.7264C7.36154 19.7247 7.41126 19.7181 7.45996 19.7065L7.287 18.9768ZM10.287 18.2658L10.46 18.9956L10.4716 18.9927L10.287 18.2658ZM10.672 18.0218L11.2506 18.4991L11.2571 18.491L10.672 18.0218ZM17.2971 10.959C17.5562 10.6358 17.5043 10.1638 17.1812 9.90466C16.8581 9.64552 16.386 9.69742 16.1269 10.0206L17.2971 10.959ZM12.1269 7.02052C11.8678 7.34365 11.9196 7.81568 12.2428 8.07484C12.5659 8.33399 13.0379 8.28213 13.2971 7.95901L12.1269 7.02052ZM14.3 5.50976L14.8851 5.97901C14.8949 5.96672 14.9044 5.95412 14.9135 5.94123L14.3 5.50976ZM15.929 5.18976L16.4088 4.61332C16.3849 4.59344 16.3598 4.57507 16.3337 4.5583L15.929 5.18976ZM18.166 7.05176L18.6968 6.52192C18.6805 6.50561 18.6635 6.49007 18.6458 6.47532L18.166 7.05176ZM18.5029 7.87264L19.2529 7.87676V7.87676L18.5029 7.87264ZM18.157 8.68976L17.632 8.15412C17.6108
        8.17496 17.5908 8.19704 17.5721 8.22025L18.157 8.68976ZM16.1271 10.0203C15.8678 10.3433 15.9195 10.8153 16.2425 11.0746C16.5655 11.3339 17.0376 11.2823 17.2969 10.9593L16.1271 10.0203ZM13.4537 7.37862C13.3923 6.96898 13.0105 6.68666 12.6009 6.74805C12.1912 6.80943 11.9089 7.19127 11.9703 7.60091L13.4537 7.37862ZM16.813 11.2329C17.2234 11.1772 17.5109 10.7992 17.4552 10.3888C17.3994 9.97834 17.0215 9.69082 16.611 9.74659L16.813 11.2329ZM12.1238 7.02072L6.22577 14.3797L7.39623 15.3178L13.2942 7.95881L12.1238 7.02072ZM6.24297 14.359C6.03561 14.5995 5.91226 14.9011 5.89159 15.218L7.38841 15.3156C7.38786 15.324 7.38457 15.3321 7.37903 15.3385L6.24297 14.359ZM5.8908 15.2321L5.7508 18.2551L7.2492 18.3245L7.3892 15.3015L5.8908 15.2321ZM5.75396 18.3667C5.83563 19.1586 6.51588 19.7524 7.31152 19.7264L7.26248 18.2272C7.25928 18.2273 7.25771 18.2268 7.25669 18.2264C7.25526 18.2259 7.25337 18.2249 7.25144 18.2232C7.2495 18.2215 7.24825 18.2198 7.24754 18.2185C7.24703 18.2175 7.24637 18.216 7.24604 18.2128L5.75396 18.3667ZM7.45996 19.7065L10.46 18.9955L10.114 17.536L7.11404 18.247L7.45996 19.7065ZM10.4716 18.9927C10.7771 18.9151 11.05 18.7422 11.2506 18.499L10.0934 17.5445C10.0958 17.5417 10.0989 17.5397 10.1024 17.5388L10.4716 18.9927ZM11.2571 18.491L17.2971 10.959L16.1269 10.0206L10.0869 17.5526L11.2571 18.491ZM13.2971 7.95901L14.8851 5.97901L13.7149 5.04052L12.1269 7.02052L13.2971 7.95901ZM14.9135 5.94123C15.0521 5.74411 15.3214 5.6912 15.5243 5.82123L16.3337 4.5583C15.4544 3.99484 14.2873 4.2241 13.6865 5.0783L14.9135 5.94123ZM15.4492 5.7662L17.6862 7.6282L18.6458 6.47532L16.4088 4.61332L15.4492 5.7662ZM17.6352 7.58161C17.7111 7.6577 17.7535 7.761 17.7529 7.86852L19.2529 7.87676C19.2557 7.36905 19.0555 6.88127 18.6968 6.52192L17.6352 7.58161ZM17.7529 7.86852C17.7524 7.97604 17.7088 8.07886 17.632 8.15412L18.682 9.22541C19.0446 8.87002 19.2501 8.38447 19.2529 7.87676L17.7529 7.86852ZM17.5721 8.22025L16.1271 10.0203L17.2969 10.9593L18.7419 9.15928L17.5721 8.22025ZM11.9703 7.60091C12.3196 9.93221 14.4771 11.5503 16.813 11.2329L16.611 9.74659C15.0881 9.95352 13.6815 8.89855 13.4537 7.37862L11.9703 7.60091Z"></path></svg>
                   
                <span class="not-icon" style="flex: 1 1 0px"></span>

                <svg class="delete" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <title>Удалить</title>
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                </svg>
            </div>
        </div>
        <div title="Скачать изображения (для скачивания PDF нажмите на кнопку с увеличительным стеклом)" class="download-img" style="flex: 1 1 0px;">
            <div style="width: 100%; height: 100%; background-color: #ffffff80; display: flex; justify-content: center; align-items: center">
                <svg style="width: 50%; height: 50%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path id="Vector" d="M6 21H18M12 3V17M12 17L17 12M12 17L7 12" stroke="#202020" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            </div>
        </div>
    </div>
</div>
</div>
`);

    const popupCont = htmlToElement(`
        <div style="display: flex;align-items: baseline;">
            Ширина:&nbsp;
            <input type="number" style="
                text-align: right;
                font-size: 1rem;
                color: white;
                border-bottom: 0.1rem solid white;" 
                max="4" min="0"></input>
            пикс.
        </div>
    `)

    const settings = el.querySelector('.settings')
    const popupEl = insertPopup(settings)
    const popupId = registerPopup(popupEl)
    addOpenedArgumentToElement(popupId, el.querySelector('.output'))

    popupAddHoverClick(popupId, settings.firstElementChild, (pressed) => settings.setAttribute('data-pressed', pressed))
    popupEl.popup.appendChild(popupCont)

    return { 
        element: el, 
        popupId: popupId,
        widthInput: popupCont.querySelector('input'),
        name: el.querySelector('.name'), 
        image: el.querySelector('img'),
        viewPDF: el.querySelector('.view-pdf'),
        del: el.querySelector('.delete'),
        downloadImg: el.querySelector('.download-img'),
        edit: el.querySelector('.edit'),
    };
}

function insertPopup(par) {
const el = htmlToElement(`
<span class='popup-container' shown="false">
    <div> <!-- nice empty div tat serves no purpose in the doc but needed for propper formating -->
        <div class="safe-zone" style="padding: 2rem; margin-top: -2rem; pointer-events: none;">
            <div class="popup" style="
                pointer-events: all;
                background-color: #4286f1;
                border: 0px solid transparent;
                border-radius: 10px;
                box-shadow: 0px 0px 0.3rem 0px #00000030;
                padding: 0.8rem;
                color: white;
            ">
            </div>
        </div>
    </div>
</span>
`)
    par.style.position = 'relative'
    par.appendChild(el)
    return { 
        element: el, 
        popup: el.querySelector('.popup'), 
        safeZone: el.querySelector('.safe-zone')
    };

}

//https://stackoverflow.com/a/22114687/18704284
function copy(src) {
    var dst = new ArrayBuffer(src.byteLength);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
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

function downloadUrl(url, filename) {
    var a = document.createElement("a")
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
    }, 0);
}

function createAndInitOutputElement(scheme, schedule, doc, img, parentElement, name) {
    const fileUrl = window.URL.createObjectURL(new Blob([copy(doc)], { type: 'application/pdf' }));

    const element = createOutputElement()
    parentElement.appendChild(element.element)

    const imgUrl = URL.createObjectURL(img)
    element.image.src = imgUrl 
    element.widthInput.value = 1000

    element.name.textContent = name
    element.viewPDF.addEventListener('click', function() {
        const tab = window.open();
        if(tab == null) {
            downloadUrl(fileUrl, name + '.pdf')
            return
        }
        tab.location.href = fileUrl;
    })
    element.del.addEventListener('click', function() {
        parentElement.removeChild(element.element)
        unregisterPopup(element.popupId)
        window.URL.revokeObjectURL(imgUrl);
        window.URL.revokeObjectURL(fileUrl);
    })
    element.downloadImg.addEventListener('click', async function() {
        const blob = new Blob([await renderPDF(copy(doc), Number.parseInt(element.widthInput.value))], { type: "image/png" })
        download(blob, name + '.png')
    })
    element.edit.addEventListener('click', function() {
        const parms = JSON.stringify({ schedule: schedule, scheme: scheme });
        const storageId = "parms" + String(Date.now());
        sessionStorage.setItem(storageId, parms);
        window.open("./fix.html" + "?sid=" + storageId);
    })
}


const css = `

.popup input::-webkit-outer-spin-button,
.popup input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.popup input[type=number] {
  -moz-appearance: textfield;
}
.popup input { border: none; outline: none; background: none; }

.output {
    position: relative;
    border: 0px solid transparent;
}

.output-cont > .output {
    box-shadow: 0px 0px 0.5rem 0px #00000030;
}

.out-overlay {
    visibility: collapse;
    opacity: 0;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    transition: opacity 200ms, visibility 0ms 200ms;

    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.out-header {
    background: #000000a0;
}

.output:hover {
    border-color: #00000040;
}

.popup-container {
    width: 0px; height: 0px;
    margin-top: 0.3rem;
    position: absolute;
    left: 50%;

    display: flex;
    justify-content: center; 

    will-change: transform; /*chrome bug*/
    transition: opacity 300ms, transform 300ms;
}

.popup-container              { z-index: 997; }
.popup-container:focus-within { z-index: 998; }
.popup-container:hover        { z-index: 999; }

.popup-container[shown=true] {
    transform: translateY(0);
    opacity: 1;
    & > * { transform: scale(1); transition: transform 0s; }
}

.popup-container:not([shown=true]) {
    transform: translateY(0.7rem);
    opacity: 0;
    & > * { transform: scale(0); transition: transform 0s 300ms; }
}

@media (pointer: fine) {
    .output:hover .out-overlay, .output[data-popup-opened=true] .out-overlay { 
        opacity: 1;
        visibility: visible;
        transition: opacity 200ms;
    }
}

@media not (pointer: fine) {
    .output .out-overlay { opacity: 1; visibility: visible; transition: opacity 200ms; }
    .output .download-img { opacity: 0 }
}

.out-header > .icons {
    display: flex;
    padding: 0.3rem;
}

.out-header > .icons > *:not(.not-icon) {
    overflow: visible;
    height: 1.4rem;
    margin-left: 0.2rem;
    fill: #eeeeee;
    stroke: #eeeeee;
    padding: 0.4rem;
    border: 0px solid #00000000;
    border-radius: 999999px;
}

.out-header > .icons > *:not(.not-icon), .out-overlay .download-img {
    cursor: pointer;
}

.out-header > .icons > *:not(.not-icon):hover {
    background-color: #ffffff30;
}

.out-header > .icons > *:not(.not-icon)[data-pressed=true] {
    background-color: #fff;
    fill: #4286f1;
    stroke: #4286f1;
}

.popup:hover { 
    outline: 1px solid white;
}
`


{ //https://stackoverflow.com/a/524721/18704284
    const head = document.head || document.getElementsByTagName('head')[0],
          style = document.createElement('style');

    style.type = 'text/css';
    if (style.styleSheet){
      // This is required for IE8 and below.
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
}
