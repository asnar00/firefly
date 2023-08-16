// ᕦ(ツ)ᕤ
// util.ts
// author: asnaroo, with help from gpt4
// useful utility functions to manage DOM elements and stuff

export class Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    constructor(left: number, top: number, right: number, bottom: number) {
        this.left = left; this.top = top; this.right = right; this.bottom = bottom; 
    }
    width() : number { return this.right - this.left; }
    height() : number { return this.bottom - this.top; }
}

export function element(html: string) : HTMLElement {
    let div = document.createElement('div');
    div.innerHTML = html;  
    return div.firstChild as HTMLElement;
}

// given an element, returns the rectangle relative to document origin
export function rect(el: HTMLElement) : Rect {
    const r = el.getBoundingClientRect();
    return new Rect(r.left + window.scrollX, r.top + window.scrollY,
                    r.right + window.scrollX, r.bottom + window.scrollY);
}

// find width of body element
export function getBodyWidth() : number {
    let bodyWidth: string = getComputedStyle(document.body).width;
    return parseInt(bodyWidth, 10);
}

export function scrollToView(div: HTMLElement, padding: number = 10) {
    const rect = div.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    let scrollOptions: ScrollToOptions = {
        behavior: 'smooth'
    };

    // Check vertical visibility
    if (rect.top - padding < 0) {
        // The div is above the viewport
        scrollOptions.top = window.scrollY + rect.top - padding;
    } else if (rect.bottom + padding > windowHeight) {
        // The div is below the viewport
        scrollOptions.top = window.scrollY + rect.bottom + padding - windowHeight;
    }

    // Check horizontal visibility
    if (rect.left - padding < 0) {
        // The div is to the left of the viewport
        scrollOptions.left = window.scrollX + rect.left - padding;
    } else if (rect.right + padding > windowWidth) {
        // The div is to the right of the viewport
        scrollOptions.left = window.scrollX + rect.right + padding - windowWidth;
    }

    // Perform the scroll if needed
    if (scrollOptions.top || scrollOptions.left) {
        window.scrollTo(scrollOptions);
    }
}

// Debounce function
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | undefined;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
        clearTimeout(timeout);
  
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait) as unknown as number;
    };
}
