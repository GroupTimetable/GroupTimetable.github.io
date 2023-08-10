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

const regFunctions = {}
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

//https://stackoverflow.com/a/24103596/18704284
function setCookie(value) {
    const date = new Date();
    date.setTime(date.getTime() + (90*24*60*60*1000));
    document.cookie = 'data=' + btoa(JSON.stringify(value)) + '; expires=' + date.toUTCString() + '; path=/';
}
function getCookie() {
    const nameEQ = "data=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        const c = ca[i].trimStart();
        if(c.indexOf(nameEQ) == 0) {
            return JSON.parse(atob(c.substring(nameEQ.length,c.length)));
        }
    }
}

const userData = (() => {
    let userData;
    try { userData = getCookie() } catch(e) { console.error(e) }
    if(!userData || !userData.uuid) {
         //preserving the fields
        userData ??= {}
        userData.uuid ??= genUUID()
        userData.noUserdata ??= false
    }
    try { setCookie(userData) } catch(e) { console.error(e) }
    return userData
})()

window.setUserdataAllowed = (isAllowed) => {
    userData.noUserdata = !isAllowed
    try { setCookie(userData) } catch(e) { console.error(e) }
}

window.getUserdataAllowed = () => {
    return !userData.noUserdata
}

window.updateUserdataF = (userdataFuncName) => { 
    try{ try {
        const func = regFunctions[userdataFuncName]
        if(!func) throw 'Function not found'
        const funcName = '' + userdataFuncName

        return (...params) => { try { try {
            if(userData.noUserdata) return;
            const userUUID = userData.uuid

            const randNum = new DataView(crypto.getRandomValues(new Uint32Array(1)).buffer).getUint32(0, true)
                .toString(16).toUpperCase().padStart('0', 8)
            const randName = new Date().toISOString().replace('.', '!') + '+' + randNum;

            func(userUUID, randName, ...params)
            console.log('sent', funcName, 'with', ...params)
        } catch(e) { console.error(e) } } catch(e) {} }
    } catch(e) { console.error(e); console.error(userdataFuncName) }
    } catch(e) {} 
 
    return () => {}
}
