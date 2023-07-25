const stateHidden = 0;
const stateShown = 1;
const popupList = []
let popupTop = 0

let curActor = 0

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function registerPopup(popup) {
    const id = popupTop++
    popupList[id] = { popup, state: stateHidden, action: {}, ownerStates: {} }
    addOwner('safe zone', id)
    popup.safeZone.setAttribute('data-popup-id', id)
    return id
}

function addOwner(owner, id) {
    popupList[id].ownerStates[owner] = stateHidden;
}

async function updatePopupAfterMs(owner, id, state, delay) {
    const item = popupList[id]
    item.ownerStates[owner] = state
    const action = item.action
    if(delay <= 0) { updatePopup(owner, id, state); return }

    const end = new Date()
    end.setMilliseconds(end.getMilliseconds() + delay)
    if(action.desired === state && end >= action.time) return

    const me = curActor++
    item.action = { actor: me, owner: owner, desired: state, time: end }

    //console.log('popup ' + id + ' ' + owner + ' started ' + (state === stateShown ? 'showing' : 'hiding'))

    await timeout(delay)
    if(item.action.actor === me) updatePopup(owner, id, state); 
}

function updatePopup(owner, id, newState) {
    const item = popupList[id]
    item.ownerStates[owner] = newState
    item.action = {}

    const oldState = item.state

    if(newState == stateHidden) {
        item.state = stateHidden
        for(const owner in item.ownerStates) if(item.ownerStates[owner] === stateShown) {
            item.state = stateShown
            break
        }
    }
    else item.state = newState

    if(item.state === oldState); 
    else if(item.state === stateShown) {
        item.popup.element.style.visibility = 'visible'
        item.popup.element.style.opacity = 1

        //console.log('popup ' + id + ' shown')
    }
    else {
        item.popup.element.style.opacity = 0
        item.popup.element.style.visibility = 'hidden'

        //console.log('popup ' + id + ' hidden')
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

window.addEventListener('mousemove', function(ev) {
    const x = ev.clientX
    const y = ev.clientY

    for(let i = 0; i < popupList.length; i++) {
        const pp = popupList[i]
        const bs = pp.popup.safeZone.getBoundingClientRect()
        if(pp.state !== stateShown) continue;
        if(x === clamp(x, bs.left, bs.right)
            && y === clamp(y, bs.top, bs.bottom)
        ) updatePopup('safe zone', i, stateShown)
        else updatePopupAfterMs('safe zone', i, stateHidden, 500)
    }
})
