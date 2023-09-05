//https://stackoverflow.com/a/35385518/18704284
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function call1(func) {
    let result;
    return () => (result ??= [func()])[0];
}

//https://stackoverflow.com/a/22114687/18704284
function copy(src) {
    var dst = new ArrayBuffer(src.byteLength);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
}

let prevA

function download(file, filename) {
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        if(prevA) document.body.removeChild(prevA)
        var a = prevA = document.createElement("a")
        const url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function downloadUrl(url, filename) {
    if(prevA) document.body.removeChild(prevA)
    var a = prevA = document.createElement("a")
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
}

function dateToStr(date) {
    return date.getUTCDate().toString().padStart(2, '0')
        + '.' + (date.getUTCMonth()+1).toString().padStart(2, '0')
        + '.' + date.getUTCFullYear().toString().padStart(4, '0')
}

function parseDate(str) {
    if(!str) return
    const dateRegex = /^(\d\d)\.(\d\d)\.(\d\d\d\d)$/
    const r = str.match(dateRegex)
    if(!r) return
    const d = r[1], m = r[2], y = r[3];
    
    const date = new Date(y, m-1, d)
    if(date instanceof Date && isFinite(date)) return date;
}

function addClick(element, callback) {
    function keydownHandler(event) {
        if(event.keyCode === 32) {
            event.preventDefault();
        }
        else if (event.keyCode === 13) {
            event.preventDefault();
            callback(event);
        }
    }
    function keyupHandler(event) {
        if(event.keyCode !== 32) return
        event.preventDefault();
        callback(event);
    } 

    element.addEventListener('keydown', keydownHandler)
    element.addEventListener('keyup', keyupHandler)
    element.addEventListener('click', (e) => { callback(e); element.blur() })

    element.setAttribute('tabindex', '0')
    element.setAttribute('data-custom-button', '')
}

