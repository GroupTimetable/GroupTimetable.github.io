let func

try {
    // @ts-ignore
    const [{ initializeApp }, db] = await Promise.all([
        // @ts-ignore
        import('https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js'),
        // @ts-ignore
        import("https://www.gstatic.com/firebasejs/10.1.0/firebase-database.js"),
    ])
    // @ts-ignore
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

    const regFunctions = {

    regGeneralError: (userUuid: string, randName: string, errorDescription: string) => {
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
    },

    regDocumentCreated: (userUuid: string, randName: string, documentName: string, groupName: string) => {
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
    },

    regDebugInfo: (userUuid: string, randName: string) => {
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
    },

    regDocumentUsed: (userUuid: string, randName: string, documentName: string, groupName: string, useType: string) => {
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
    },

    regDocumentUseError: (userUuid: string, randName: string, documentName: string, groupName: string, useType: string) => {
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
    },

    regMessage: (userUuid: string, randName: string, data: string) => {
        if(!userUuid) {
            console.error('no user uuid for', data)
            return
        }

        for(let i = 0; i < 3; i++) try {
            db.set(db.ref(database, 'users/' + userUuid + '/' + randName), {
                act: 'msg', data
            });
            return
        } catch(e) { console.error(e) }

        //      it doesn't matter, right?   V
        console.error('data not sent for', userUuid, data)
    },

    regDocumentEdited: (userUuid: string, randName: string, documentName: string, groupName: string) => {
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
    },

    regDocumentError: (userUuid: string, randName: string, documentName: string, groupName: string, error: string) => {
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
    },

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
            const userData = JSON.parse(localStorage.getItem('userdata')!)
            if(userData != undefined) return [userData, false]
        } catch(e) { console.error(e) }

        try {
            const userData = get_Cookie();
            if(userData != undefined) return [userData, true]
        } catch(e) { console.error(e) }
    }

    function calculateUserData() {
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
    }

    const cbs: (() => void)[] = []

    let userData = calculateUserData();
    console.log('UUID', userData?.uuid)

    try {
        window.onstorage = (e) => {
            userData = calculateUserData()
            cbs.forEach(cb => {
                try { cb() }
                catch(err) { console.log(err) }
            })
        }
    }
    catch(e) { console.error(e) }

    type DropFirstTwo<T extends (...args: any) => any> =
        T extends (a: any, b: any, ...rest: infer R) => infer Ret
            ? (...args: R) => Ret
            : never;

    const result = <T extends keyof typeof regFunctions>(userdataFuncName: T): DropFirstTwo<(typeof regFunctions)[T]> => {
        try{ try {
            const func = regFunctions[userdataFuncName]
            if(!func) throw 'Function not found'
            const funcName = '' + userdataFuncName

            return ((...params: any[]) => { try { try {
                const userUUID = userData.uuid

                const randNum = new DataView(crypto.getRandomValues(new Uint32Array(1)).buffer).getUint32(0, true)
                    .toString(16).toUpperCase().padStart(8, '0')
                const randName = new Date().toISOString().replace('.', '!') + '+' + randNum;

                const result = (func as any)(userUUID, randName, ...params)
                console.log('sent', funcName, 'with', ...params)
                return result;
            } catch(e) { console.error(e) } } catch(e) {} }) as any
        } catch(e) { console.error(e); console.error(userdataFuncName) }
        } catch(e) {}

        return (() => {}) as any
    }

    func = result
}
catch(error) {
    console.error(error)
}

type Func = typeof func

const send: Func & {} = func ?? ((() => () => {}) as any)

export default send
