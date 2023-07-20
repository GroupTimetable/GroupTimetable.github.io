function dragOverHandler(event) {
	event.preventDefault();
	console.log("a");
}

function dropHandler(ev) {
    console.log("File(s) dropped");

    const processFile = function(file) {
        file.arrayBuffer().then(function(text) {
            workWithPDF(text);
        });
    };

    ev.preventDefault();

    if(ev.dataTransfer.items) {
        for(const item of [...ev.dataTransfer.items]) {
            if(item.kind === "file") {
                processFile(item.getAsFile());
                break;
            }
        }
    }
    else {
        for(const item of [...ev.dataTransfer.files]) {
            processFile(item);
            break;
        }
    }
}


function workWithPDF(contents) {
	pdfjsLib.GlobalWorkerOptions.workerSrc =
	'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';

	const loadingTask = pdfjsLib.getDocument({ data: contents });
	(async () => {
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        //for(const el of page) {
        //    console.log(el);
        //}
       
        console.log(page);

        return;

        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        // Support HiDPI-screens.
        const outputScale = window.devicePixelRatio || 1;

        //
        // Prepare canvas using PDF page dimensions
        //
        const canvas = document.getElementById("the-canvas");
        const context = canvas.getContext("2d");

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0]
        : null;

        //
        // Render PDF page into canvas context
        //
        const renderContext = {
        canvasContext: context,
        transform,
        viewport,
        };
        page.render(renderContext);
	})();
}
