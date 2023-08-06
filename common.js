//https://stackoverflow.com/a/35385518/18704284
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function call1(func) {
    let result;
    return () => (result ??= [func()])[0]
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
