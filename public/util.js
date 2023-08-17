// ᕦ(ツ)ᕤ
// util.ts
// author: asnaroo, with help from gpt4
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
export class Rect {
    constructor(left, top, right, bottom) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }
    width() { return this.right - this.left; }
    height() { return this.bottom - this.top; }
}
export function element(html) {
    let div = document.createElement('div');
    div.innerHTML = html;
    return div.firstChild;
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
export function scrollToView(div, padding = 10) {
    const rect = div.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    let scrollOptions = {
        behavior: 'smooth'
    };
    // Check vertical visibility
    if (rect.top - padding < 0) {
        // The div is above the viewport
        scrollOptions.top = window.scrollY + rect.top - padding;
    }
    else if (rect.bottom + padding > windowHeight) {
        // The div is below the viewport
        scrollOptions.top = window.scrollY + rect.bottom + padding - windowHeight;
    }
    // Check horizontal visibility
    if (rect.left - padding < 0) {
        // The div is to the left of the viewport
        scrollOptions.left = window.scrollX + rect.left - padding;
    }
    else if (rect.right + padding > windowWidth) {
        // The div is to the right of the viewport
        scrollOptions.left = window.scrollX + rect.right + padding - windowWidth;
    }
    // Perform the scroll if needed
    if (scrollOptions.top || scrollOptions.left) {
        window.scrollTo(scrollOptions);
    }
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
            const response = yield fetch(`http://localhost:8000/${endpoint}`, {
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
