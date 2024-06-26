// ᕦ(ツ)ᕤ
// util.ts
// author: asnaroo
// useful utility functions to manage DOM elements and stuff
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = 0;
        this.y = 0;
        this.x = x;
        this.y = y;
    }
    set(x, y) { this.x = x; this.y = y; }
    plus(v) { return new Vec2(this.x + v.x, this.y + v.y); }
    minus(v) { return new Vec2(this.x - v.x, this.y - v.y); }
    times(f) { return new Vec2(this.x * f, this.y * f); }
    lerpTowards(v, f = 0.1) {
        const diff = v.minus(this);
        const x = (Math.abs(diff.x) <= 1) ? v.x : (this.x + diff.x * f);
        const y = (Math.abs(diff.y) <= 1) ? v.y : (this.y + diff.y * f);
        return new Vec2(x, y);
    }
    equalsTo(v) {
        return this.x == v.x && this.y == v.y;
    }
}
;
export class Rect {
    constructor(left, top, right, bottom) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }
    width() { return this.right - this.left; }
    height() { return this.bottom - this.top; }
    origin() { return new Vec2(this.left, this.top); }
    size() { return new Vec2(this.right - this.left, this.bottom - this.top); }
    // update rect so that it surrounds (r), with optional padding
    extendToFit(r, padding = 0) {
        this.left = Math.min(this.left, r.left - padding);
        this.top = Math.min(this.top, r.top - padding);
        this.right = Math.max(this.right, r.right + padding);
        this.bottom = Math.max(this.bottom, r.bottom + padding);
    }
    // round all values to nearest integers
    round() {
        this.left = Math.floor(this.left);
        this.top = Math.floor(this.top);
        this.right = Math.ceil(this.right);
        this.bottom = Math.ceil(this.bottom);
    }
    // true if all values are equal
    isEqualTo(r) {
        return (this.left == r.left &&
            this.top == r.top &&
            this.right == r.right &&
            this.bottom == r.bottom);
    }
    // bounding rect of multiple rectangles
    static bounding(rects) {
        if (rects.length == 0)
            return new Rect(0, 0, 0, 0);
        let rect = rects[0];
        for (let i = 1; i < rects.length; i++) {
            rect.extendToFit(rects[i]);
        }
        return rect;
    }
}
// given some HTML, make a DIV from it
export function element(html) {
    let div = document.createElement('div');
    div.innerHTML = html;
    return div.firstChild;
}
// set the position of a DIV
export function positionDiv(div, pos) {
    div.style.left = `${pos.x}px`;
    div.style.top = `${pos.y}px`;
}
export function resizeDiv(div, size) {
    div.style.width = `${size.x}px`;
    div.style.height = `${size.y}px`;
}
// given an element, returns the rectangle relative to document origin
export function rect(el) {
    const r = el.getBoundingClientRect();
    return new Rect(r.left + window.scrollX, r.top + window.scrollY, r.right + window.scrollX, r.bottom + window.scrollY);
}
// find width of body element
export function getBodyWidth() {
    let bodyWidth = getComputedStyle(document.body).width;
    return parseInt(bodyWidth, 10);
}
export function scrollToViewRect(rect, padding = 48) {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    let x = window.scrollX;
    let y = window.scrollY;
    // Check vertical visibility
    if (rect.top - padding < 0) {
        // The div is above the viewport
        y = window.scrollY + rect.top - padding;
    }
    else if (rect.bottom + padding > windowHeight) {
        // The div is below the viewport
        y = window.scrollY + rect.bottom + padding - windowHeight;
    }
    // Check horizontal visibility
    if (rect.left - padding < 0) {
        // The div is to the left of the viewport
        x = window.scrollX + rect.left - padding;
    }
    else if (rect.right + padding > windowWidth) {
        // The div is to the right of the viewport
        x = window.scrollX + rect.right + padding - windowWidth;
    }
    // Perform the scroll if needed
    if (x != window.scrollX || y != window.scrollY) {
        smoothScrollTo(x, y);
    }
    return [x, y];
}
export function smoothScrollTo(x, y) {
    let scrollOptions = {
        behavior: 'smooth'
    };
    scrollOptions.left = x;
    scrollOptions.top = y;
    window.scrollTo(scrollOptions);
}
export function splitArray(arr, cond) {
    const trueArray = [];
    const falseArray = [];
    arr.forEach(item => {
        if (cond(item)) {
            trueArray.push(item);
        }
        else {
            falseArray.push(item);
        }
    });
    return [trueArray, falseArray];
}
// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}
export function getChildNodeIndex(element) {
    return Array.from(element.parentElement.children).indexOf(element);
}
// sends a command request to the server, waits on the reply, returns dictionary object
export function remote(endpointAndFunc, args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!endpointAndFunc.startsWith("@")) {
            console.error(`endpoint '${endpointAndFunc}' must start with '@'`);
        }
        const parts = endpointAndFunc.split(".");
        const endpoint = parts[0].slice(1);
        const func = parts[1];
        try {
            const response = yield fetch(`https://www.microclub.org:4433/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ func: func, args: args })
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const obj = yield response.json();
            return obj;
        }
        catch (error) {
            console.error('Error:', error);
        }
        return [];
    });
}
export function setCursorToEnd(contentEditableElem) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(contentEditableElem);
    range.collapse(false); // Collapse the range to the end point. false means collapse to end rather than the start
    sel === null || sel === void 0 ? void 0 : sel.removeAllRanges();
    sel === null || sel === void 0 ? void 0 : sel.addRange(range);
    contentEditableElem.focus();
}
