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

    try{ item.onStateChange(id) } catch(e) {}
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function popupAddHoverClick(id, onElement, whenToggled) {
    addOwner('hover', id)
    addOwner('click', id)
    addOwner('focus', id)

    const item = popupList[id]
    const popupEl = item.popup.element
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

    //check if element is already under the mouse
    if(onElement.matches(':hover')/*I hope this is equivalent to mouseenter*/) {
        if(!ignoreHover) updatePopupAfterMs('hover', id, stateShown, 300)
    }

    onElement.addEventListener('mouseenter', () => {
        if(!ignoreHover) updatePopupAfterMs('hover', id, stateShown, 300)
    })
    onElement.addEventListener('mouseleave', () => {
        if(!ignoreHover) updatePopupAfterMs('hover', id, stateHidden, 500)
    })

    //only one callback at a time!
    item.onStateChange = (id) => fixPopupXPosition(id)
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
        if(pp.state !== stateShown) /*
            should this be removed? Popup has hiding transition,
            and while it is playing the popup is technically hidden
            so the user can't hover back on it to reopen it.
            But neither feels good. And this variant is more safe,
            because the safe area migth not collapse some day,
            and this check would prevent a completely hidden popup from 
            showing up when the mouse is over it
        */ continue;

        const bs = pp.popup.safeZone.getBoundingClientRect()
        const hovered = x === clamp(x, bs.left, bs.right)
            && y === clamp(y, bs.top, bs.bottom)

        if(hovered) updatePopup('safe zone', i, stateShown)
        else updatePopupAfterMs('safe zone', i, stateHidden, 500)
    }
})

function isHidden(elem) { //not position: fixed   !
    //jQuery
    return !( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
}

//does not really belong to popups, fix for popups being outside of screen bounds + 'overflow: hidden' on body
//It doesn't work properly because it is not called when popup's position or size changes, so it may
//still go out of bounds. 
//TODO: move popups to separate div and put two 1px divs in popup container instead of popup itself, 
//one positioned normally and another absolutly on top of it and use IntersectionObserver to detect 
//position changes + ResizeObserver for the popup
window.addEventListener('resize', function() {
    for(const i in popupList) fixPopupXPosition(i)
})
function fixPopupXPosition(id) {
    const windowWidth = window.innerWidth
    const horPadding = windowWidth * 0.02 
    const allowedWidth = windowWidth - horPadding*2

    const pp = popupList[id]
    const popup = pp.popup.popup
    if(isHidden(popup)) return
    //if(pp.state !== stateShown) continue; //hiding transition would probably break?

    pp.popup.safeZone.style.transform = ''
    popup.style.width = ''
    popup.style.overflowX = ''

    const bs = popup.getBoundingClientRect()
    const popupWidth = bs.right - bs.left

    if(popupWidth > allowedWidth) {
        pp.popup.safeZone.style.transform = `translateX(${(windowWidth - bs.right - bs.left)*0.5}px)`
        popup.style.width = allowedWidth + 'px'
        popup.style.overflowX = 'scroll'
        return
    }

    const offR = horPadding + allowedWidth - bs.right
    if(offR < 0) {
        pp.popup.safeZone.style.transform = `translateX(${offR}px)`
        return
    }

    const offL = horPadding - bs.left
    if(offL > 0) {
        pp.popup.safeZone.style.transform = `translateX(${offL}px)`
        return
    }
}
