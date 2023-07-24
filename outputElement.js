//https://stackoverflow.com/a/35385518/18704284
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function createOutputElement() {
    const el = htmlToElement(`
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
    console.log(el)

    return { 
        element: el, 
        name: el.querySelector('.name'), 
        image: el.querySelector('img'),
        viewPDF: el.querySelector('.view-pdf'),
        del: el.querySelector('.delete'),
        downloadImg: el.querySelector('.download-img'),
    };
}
