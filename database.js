import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js'
import * as db from "https://www.gstatic.com/firebasejs/10.1.0/firebase-database.js"

//https://stackoverflow.com/a/8809472/18704284
function fallbackUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const genUUID = () => {
    let uuid;
    //I hope it works this way
    try { uuid = self.crypto.randomUUID() } catch(e) { console.error(e) }
    if(!uuid) uuid = fallbackUUID()
    return uuid;
}

let userAgent = '';
(async() => { userAgent = navigator.userAgent; })()

const firebaseConfig = {
    databaseURL: 'https://test-fbc56-default-rtdb.firebaseio.com/'
};
const app = initializeApp(firebaseConfig);
const database = db.getDatabase(app);

const groupsData = {};

const regFunctions = {}

regFunctions.regGeneralError = (userUuid, randName, errorDescription) => {
    if(!userUuid) {
        console.error('no user uuid for', errorDescription)
        return
    }

    for(let i = 0; i < 3; i++) try {
        db.set(db.ref(database, 'users/' + userUuid + '/' + randName), {
            act: 'err', err: errorDescription
        });
        return
    } catch(e) { console.error(e) }

    //      it doesn't matter, right?   V
    console.error('data not sent for', userUuid, errorDescription)
};

regFunctions.regDocumentCreated = (userUuid, randName, documentName, groupName) => {
    if(!userUuid) {
        console.error('no user uuid for', documentName, groupName)
        return
    }

    for(let i = 0; i < 3; i++) try {
        db.set(db.ref(database, 'users/' + userUuid + '/' + randName), {
            act: 'crt', doc: documentName, grp: groupName, ua: userAgent
        });
        return
    } catch(e) { console.error(e) }

    //      it doesn't matter, right?   V
    console.error('data not sent for', userUuid, documentName, groupName)
}

regFunctions.regDebugInfo = (userUuid, randName) => {
    if(userAgent.trim() == '') return false;

    for(let i = 0; i < 3; i++) try {
        db.set(db.ref(database, 'users/' + userUuid + '/' + randName), {
            act: 'dbg', ua: userAgent
        });
        return true;
    } catch(e) {
        console.error(e);
    }
    return false;
}

regFunctions.regDocumentUsed = (userUuid, randName, documentName, groupName, useType) => {
    if(!userUuid) {
        console.error('no user uuid for', documentName, groupName)
        return
    }

    for(let i = 0; i < 3; i++) try {
        db.set(db.ref(database, 'users/' + userUuid + '/' + randName), {
            act: 'use', doc: documentName, grp: groupName, utp: useType, ua: userAgent
        });
        return
    } catch(e) { console.error(e) }

    //      it doesn't matter, right?   V
    console.error('data not sent for', userUuid, documentName, groupName)
}

regFunctions.regDocumentUseError = (userUuid, randName, documentName, groupName, useType) => {
    if(!userUuid) {
        console.error('no user uuid for', documentName, groupName)
        return
    }

    for(let i = 0; i < 3; i++) try {
        db.set(db.ref(database, 'users/' + userUuid + '/' + randName), {
            act: 'eus', doc: documentName, grp: groupName, utp: useType, ua: userAgent
        });
        return
    } catch(e) { console.error(e) }

    //      it doesn't matter, right?   V
    console.error('data not sent for', userUuid, documentName, groupName)
}

regFunctions.regDocumentEdited = (userUuid, randName, documentName, groupName) => {
    if(!userUuid) {
        console.error('no user uuid for', documentName, groupName)
        return
    }

    for(let i = 0; i < 3; i++) try {
        db.set(db.ref(database, 'users/' + userUuid + '/' + randName), {
            act: 'edt', doc: documentName, grp: groupName, ua: userAgent
        });
        return
    } catch(e) { console.error(e) }

    //      it doesn't matter, right?   V
    console.error('data not sent for', userUuid, documentName, groupName)
}

regFunctions.regDocumentError = (userUuid, randName, documentName, groupName, error) => {
    if(!userUuid) {
        console.error('no user uuid for', documentName, groupName)
        return
    }

    for(let i = 0; i < 3; i++) try {
        db.set(db.ref(database, 'users/' + userUuid + '/' + randName), {
            act: 'error', doc: documentName, grp: groupName, err: error, ua: userAgent
        });
        return
    } catch(e) { console.error(e) }

    //      it doesn't matter, right?   V
    console.error('data not sent for', userUuid, documentName, groupName, error)
}

function get_Cookie() {
    const nameEQ = "data=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        const c = ca[i].trimStart();
        if(c.indexOf(nameEQ) == 0) {
            return JSON.parse(atob(c.substring(nameEQ.length,c.length)));
        }
    }
}

//used in help-page
function updateUserdata() {
    try {
        const userData = JSON.parse(localStorage.getItem('userdata'))
        if(userData != undefined) return [userData, false]
    } catch(e) { console.error(e) }

    try {
        const userData = get_Cookie();
        if(userData != undefined) return [userData, true]
    } catch(e) { console.error(e) }
}

const userData = (_ => {
    const result = updateUserdata()
    const userData = result?.[0] ?? {}
    let updated = result?.[1] ?? true

    if(userData.uuid == undefined) {
        userData.uuid = genUUID()
        updated = true
    }
    if(userData.noUserdata == undefined) {
        userData.noUserdata = false
        updated = true
    }

    if(updated) try {
        localStorage.setItem('userdata', JSON.stringify(userData))
        document.cookie = '' //TODO: remove sometime later
    } catch(e) { console.error(e) }

    return userData
})()


window.setUserdataAllowed = (isAllowed) => {
    userData.noUserdata = !isAllowed
    try { localStorage.setItem('userdata', JSON.stringify(userData)) } catch(e) { console.error(e) }
}

window.getUserdataAllowed = () => {
    return !userData.noUserdata
}

window.updateUserdataF = (userdataFuncName, forceSend) => {
    try{ try {
        const func = regFunctions[userdataFuncName]
        if(!func) throw 'Function not found'
        const funcName = '' + userdataFuncName

        return (...params) => { try { try {
            if(userData.noUserdata && !forceSend) return;
            const userUUID = userData.uuid

            const randNum = new DataView(crypto.getRandomValues(new Uint32Array(1)).buffer).getUint32(0, true)
                .toString(16).toUpperCase().padStart('0', 8)
            const randName = new Date().toISOString().replace('.', '!') + '+' + randNum;

            const result = func(userUUID, randName, ...params)
            console.log('sent', funcName, 'with', ...params)
            return result;
        } catch(e) { console.error(e) } } catch(e) {} }
    } catch(e) { console.error(e); console.error(userdataFuncName) }
    } catch(e) {}

    return () => {}
}
