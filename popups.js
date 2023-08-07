const stateHidden = 0;
const stateShown = 1;
const popupList = {}
let popupTop = 0
let curActor = 0

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function registerPopup(popup) {
    const id = popupTop++
    popupList[id] = { popup, state: stateHidden, action: {}, ownerStates: {}, ownerActions: {} }
    addOwner('safe zone', id)
    popup.safeZone.setAttribute('data-popup-id', id)
    return id
}

function unregisterPopup(id) {
    delete popupList[id]
}

function addOpenedArgumentToElement(id, element) {
    popupList[id].openedArgElement = element;
}

function addOwner(owner, id) {
    popupList[id].ownerStates[owner] = stateHidden;
}

async function updatePopupAfterMs(owner, id, state, delay) {
    const item = popupList[id]
    const action = item.ownerActions[owner]
    if(delay <= 0) { updatePopup(owner, id, state); return }

    const end = new Date()
    end.setMilliseconds(end.getMilliseconds() + delay)
    if(action && action.desired === state && end >= action.time) return
    else if(!action && item.ownerStates[owner] === state) return

    const me = curActor++
    item.ownerActions[owner] = { actor: me, owner: owner, desired: state, time: end }

    //console.log('popup ' + id + ' ' + owner + ' started ' + (state === stateShown ? 'showing' : 'hiding'))

    await timeout(delay)
    const newAction = item.ownerActions[owner]
    if(newAction && newAction.actor === me) updatePopup(owner, id, state); 
}

function updatePopup(owner, id, newState) {
    const item = popupList[id]
    item.ownerStates[owner] = newState
    delete item.ownerActions[owner]

    const oldState = item.state

    if(newState == stateHidden) {
        item.state = stateHidden
        for(const owner in item.ownerStates) if(item.ownerStates[owner] === stateShown) {
            item.state = stateShown
            break
        }
    }
    else item.state = newState

    if(item.state === oldState) return

    const opened = item.state === stateShown
    item.popup.element.setAttribute('shown', opened)
    const el = popupList[id].openedArgElement
    if(el) el.setAttribute('data-popup-opened', opened)
    //console.log('popup ' + id + (opened ? ' opened' : ' hidden'))
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function isHidden(elem) { //not position: fixed   !
    //jQuery
    return !( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
}

function popupAddHoverClick(id, onElement, whenToggled) {
    addOwner('hover', id)
    addOwner('click', id)
    addOwner('focus', id)

    const popupEl = popupList[id].popup.element
    popupEl.addEventListener('focusin', () => {
        updatePopup('focus', id, stateShown)
    })
    popupEl.addEventListener('focusout', () => {
        if(popupEl.contains(document.activeElement)) return; /*switching tabs or something*/
        updatePopup('focus', id, stateHidden)
    })

    let keepPopupOpen = false, ignoreHover = false
    onElement.addEventListener('click', () => {
        keepPopupOpen = !keepPopupOpen;

        if(!window.matchMedia('(pointer: fine)').matches) {
            ignoreHover = true
            updatePopup('hover', id, stateHidden)
        }
        else ignoreHover = false

        if(keepPopupOpen) updatePopup('click', id, stateShown)
        else updatePopup('click', id, stateHidden)

        whenToggled(keepPopupOpen)
    })
    onElement.addEventListener('mouseenter', () => {
        if(!ignoreHover) updatePopupAfterMs('hover', id, stateShown, 300)
    })
    onElement.addEventListener('mouseleave', () => {
        if(!ignoreHover) updatePopupAfterMs('hover', id, stateHidden, 500)
    })
}

window.addEventListener('mousemove', function(ev) {
    if(popupList.length === 0) return

    if(!window.matchMedia('(pointer: fine)').matches) {
        for(const i in popupList) {
            updatePopup('safe zone', i, stateHidden)
        }
        return
    }

    const x = ev.clientX
    const y = ev.clientY

    for(const i in popupList) {
        const pp = popupList[i]
        if(isHidden(pp.popup.popup)) return
        const bs = pp.popup.safeZone.getBoundingClientRect()

        const hovered = x === clamp(x, bs.left, bs.right)
            && y === clamp(y, bs.top, bs.bottom)

        if(pp.state === stateShown) {
            if(hovered) updatePopup('safe zone', i, stateShown)
            else updatePopupAfterMs('safe zone', i, stateHidden, 500)
        }
    }
})
