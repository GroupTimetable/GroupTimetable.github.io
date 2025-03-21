/// Module for testing.
/// 1. create test folder inside the repo
/// 2. put pdf file under test in that forder, name it file.pdf
/// 3. open local server url for this repo, call __load_test() from console
/// 4. console.log(JSON.stringify(await Test.getTestData(<folder>))) into <folder>/expected.txt
/// 5. Test.performTest(<folder>)
const M = {}

async function readFile0(folder, filename) {
    if(folder == null) return Promise.reject('test folder not given');
    const result = await fetch(folder + '/' + filename)
    if(!result.ok) throw 'error fetching file ' + filename;
    return await result.arrayBuffer()
};

async function readJson0(folder, filename) {
    const file = await readFile0(folder, filename)
    return JSON.parse(new TextDecoder('utf-8').decode(file))
}

function wrap(func, folder, filename) {
    return func(folder, filename).catch(err => {
        console.error('file ', folder, filename, ' not loaded:', err);
        return undefined
    })
}

function readFile(folder, filename) { return wrap(readFile0, folder, filename) }
function readJson(folder, filename) { return wrap(readJson0, folder, filename) }

const groupNameRegex = (/^(\p{L}{1,8})-(\p{N}{1,4})$/u)

async function updateFile(folder, filename) {
    const cont = await readFile(folder, filename)
    if(cont != undefined) {
        updateFilenameDisplay('Test folder: ', folder);
        updateCurrentDocument(cont, 'test file')
    }
    else {
        throw 'could not load file `' + filename + '`'
    }
}

/// get all group names in the file.
/// if folder is null, uses current loaded file
async function getGroupNames(folder, filename) {
    await loadSchedule

    if(folder) await updateFile(folder, filename)

    var orig
    const docData = await currentDocumentData
    try { orig = await docData.taskPromise }
    catch (e) { throw ["Документ не распознан как PDF", e] }

    const result = []
    M.lastNames = result

    for(let pageI = 0; pageI < orig.numPages; pageI++) try {
        console.log("At page", pageI)
        const pageData = await docData.pages.get(pageI);
        const page = pageData.page;
        const cont = pageData.text;

        const contLength = cont.length;
        for(let contI = 0; contI < contLength; contI++) try {
            var text = cont[contI].str
            if(text.match(groupNameRegex)) {
                const itemBounds = Array(cont.length);
                for(let i = 0; i < itemBounds.length; i++) {
                    itemBounds[i] = calcItemBounds(cont[i]);
                }
                var names = findGroupNames(cont, itemBounds, contI);
                for(let i = 0; i < names.length; i++) {
                    result.push(cont[names[i]].str)
                }
                console.log("Found", names.length, "groups")
                break;
            }
        } catch(e) { console.error(e); }
    } catch(e) { console.error(e); }

    console.log("Done!")
    return result
}
M.getGroupNames = getGroupNames

function dateStr(date) {
    return date.getUTCFullYear() + '.'
        + String(date.getUTCMonth() + 1).padStart(2, '0') + '.'
        + String(date.getUTCDate()).padStart(2, '0');
}

// calculate test data for file and group names.
// if groupNames is null, computes the names
async function getTestData(folder, groupNames, filename) {
    filename ??= 'file.pdf'
    await loadSchedule
    await updateFile(folder, filename)

    //groupNames ??= await readJson(folder, 'names.txt')
    groupNames ??= await getGroupNames(folder, filename)

    var orig
    const docData = await currentDocumentData
    try { orig = await docData.taskPromise }
    catch (e) { throw ["Документ не распознан как PDF", e] }

    const result = {}
    M.lastGroups = result

    for(let i = 0; i < groupNames.length; i++) {
        const name = groupNames[i]
        console.log("Group", i, name)

        const nameFixed = nameFixup(name);
        const itemInfo = await findName(docData, orig.numPages, nameFixed);
        const schedule = makeSchedule(
            itemInfo.pageData.text,
            itemInfo.pageData.page.view,
            itemInfo.itemI, []
        )

        const it = []

        it.push(schedule[0])
        if(schedule[1]) it.push([dateStr(schedule[1][0]), dateStr(schedule[1][1])])
        else it.push([])
        it.push(schedule[2])

        result[name] = it
    }

    console.log("Done!")
    return result
}
M.getTestData = getTestData

/// test given groups agains what's expected
/// ignore = { big: bool? }?
async function performTest(folder, ignore, expected) {
    await loadSchedule
    await updateFile(folder, 'file.pdf')

    expected ??= await readJson(folder, 'expected.txt')
    ignore ??= {}

    var orig
    const docData = await currentDocumentData
    try { orig = await docData.taskPromise }
    catch (e) { throw ["Документ не распознан как PDF", e] }

    const result = []
    M.lastTestResult = result

    var errors = 0
    for(name in expected) {
        const exp = expected[name]
        console.log("Group", name)

        const nameFixed = nameFixup(name);
        const itemInfo = await findName(docData, orig.numPages, nameFixed);
        const schedule = makeSchedule(
            itemInfo.pageData.text,
            itemInfo.pageData.page.view,
            itemInfo.itemI, []
        )

        const it = []

        it.push(schedule[0])
        if(schedule[1]) it.push([dateStr(schedule[1][0]), dateStr(schedule[1][1])])
        else it.push([])
        it.push(schedule[2])

        result.push(it)

        let what
        if(JSON.stringify(it[0]) !== JSON.stringify(exp[0])) {
            what = (what ? what + ', ' : '') + 'schedule'
        }
        if(JSON.stringify(it[1]) !== JSON.stringify(exp[1])) {
            what = (what ? what + ', ' : '') + 'dates'
        }
        if(!ignore.big && JSON.stringify(it[2]) !== JSON.stringify(exp[2])) {
            what = (what ? what + ', ' : '') + 'big fields'
            what = what
                + ':\n  expected: ' + warningNames(exp[2])
                + '\n  actual: ' + warningNames(it[2])
                + '\n'
        }

        if(what) {
            errors++;
            console.error("Doesn't match!", what);
        }
    }

    if(errors > 0) console.log("Done!", errors, "errors");
    else console.log("Done!");

    return result
}
M.performTest = performTest

window.Test = M
