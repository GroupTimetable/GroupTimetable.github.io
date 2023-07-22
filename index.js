function dragOverHandler(event) {
	event.preventDefault();
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



async function workWithPDF(contents) {
	pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.8.162/pdf.worker.min.js';

	const loadingTask = pdfjsLib.getDocument({ data: contents });
	(async () => {
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const cont = (await page.getTextContent()).items;
        
        const name = "ИБ-122";
        
        let itemI;
        for(let i = 0; i < cont.length; i++) {
            if(cont[i].str === name) {
                itemI = i;
                break;
            }
        }
        if(itemI == undefined) throw "No group with this name found";

        const boundsH = findItemBoundsH(cont, itemI);
        const vBounds = findDaysOfWeekHoursBoundsV(cont);
        const schedule = makeSchedule(cont, vBounds, boundsH);

        //"1 2\n 3 4\n5"
        scheduleToPDF(schedule, [[0, 1, 2], [3, 4]], 1000).then(async function (doc) {
            console.log("start drawing")
            const loadingTask = pdfjsLib.getDocument({ data: doc });

            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const cont = (await page.getTextContent()).items;

            const scale = 1
            const viewport = page.getViewport({ scale });
            const outputScale = window.devicePixelRatio || 1;

            const canvas = document.getElementById("the-canvas");
            const context = canvas.getContext("2d");

            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = Math.floor(viewport.width) + "px";
            canvas.style.height = Math.floor(viewport.height) + "px";

            const transform = outputScale !== 1
                ? [outputScale, 0, 0, outputScale, 0, 0]
                : null;

            const renderContext = {
                canvasContext: context,
                transform,
                viewport,
            };
            await page.render(renderContext);

            console.log("finished!")
        });
    })();
}

