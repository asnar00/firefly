// ᕦ(ツ)ᕤ
// util.ts
// author: asnaroo, with help from gpt4
// useful utility functions to manage DOM elements and stuff

export class Vec2 {
    x: number = 0;
    y: number = 0;
    constructor(x: number=0, y: number=0) { this.x = x; this.y = y; }
    set(x: number, y: number) { this.x = x; this.y = y; }
    plus(v: Vec2) : Vec2 { return new Vec2(this.x + v.x, this.y + v.y); }
    minus(v: Vec2) : Vec2 { return new Vec2(this.x - v.x, this.y - v.y); }
    times(f: number) : Vec2 { return new Vec2(this.x * f, this.y * f); }
    lerpTowards(v: Vec2, f: number=0.1) {
        const diff: Vec2 = v.minus(this);
        const x = (Math.abs(diff.x)<=1) ? v.x : (this.x + diff.x*f);
        const y = (Math.abs(diff.y)<=1) ? v.y : (this.y + diff.y*f);
        return new Vec2(x, y);
    }
    equalsTo(v: Vec2) : boolean {
        return this.x == v.x && this.y == v.y;
    }
};

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

    origin(): Vec2 { return new Vec2(this.left, this.top); }
    size(): Vec2 { return new Vec2(this.right-this.left, this.bottom-this.top); }
    
    // update rect so that it surrounds (r), with optional padding
    extendToFit(r: Rect, padding: number = 0) {
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
    isEqualTo(r: Rect): boolean {
        return (this.left == r.left &&
                this.top == r.top &&
                this.right == r.right &&
                this.bottom == r.bottom);
    }
}

// given some HTML, make a DIV from it
export function element(html: string) : HTMLElement {
    let div = document.createElement('div');
    div.innerHTML = html;  
    return div.firstChild as HTMLElement;
}

// set the position of a DIV
export function positionDiv(div: HTMLElement, pos: Vec2) {
    div.style.left = `${pos.x}px`;
    div.style.top = `${pos.y}px`;
}

export function resizeDiv(div: HTMLElement | SVGElement, size: Vec2) {
    div.style.width = `${size.x}px`;
    div.style.height = `${size.y}px`;
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

export function scrollToView(div: HTMLElement, padding: number = 48) : [number, number]{
    const rect = div.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    let x = window.scrollX;
    let y = window.scrollY;
    // Check vertical visibility
    if (rect.top - padding < 0) {
        // The div is above the viewport
        y= window.scrollY + rect.top - padding;
    } else if (rect.bottom + padding > windowHeight) {
        // The div is below the viewport
        y= window.scrollY + rect.bottom + padding - windowHeight;
    }
    // Check horizontal visibility
    if (rect.left - padding < 0) {
        // The div is to the left of the viewport
        x = window.scrollX + rect.left - padding;
    } else if (rect.right + padding > windowWidth) {
        // The div is to the right of the viewport
        x = window.scrollX + rect.right + padding - windowWidth;
    }
    // Perform the scroll if needed
    if (x != window.scrollX || y != window.scrollY) {
        window.scrollTo(x, y);
    }
    return [x, y];
}

export function scrollTo(x: number | undefined, y: number | undefined) {
    let scrollOptions: ScrollToOptions = {
        behavior: 'smooth'
    };
    scrollOptions.left = x;
    scrollOptions.top = y;
    window.scrollTo(scrollOptions);
}

export function splitArray<T>(arr: T[], cond: (item: T) => boolean): [T[], T[]] {
    const trueArray: T[] = [];
    const falseArray: T[] = [];

    arr.forEach(item => {
        if (cond(item)) {
            trueArray.push(item);
        } else {
            falseArray.push(item);
        }
    });

    return [trueArray, falseArray];
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

export function isOnscren(element: HTMLElement) : boolean {
    return document.body.contains(element);
}

export function getChildNodeIndex(element: Element): number {
    return Array.from(element.parentElement!.children).indexOf(element);
}

// sends a command request to the server, waits on the reply, returns dictionary object
export async function remote(endpointAndFunc: string, args: any) : Promise<any> {
    if (!endpointAndFunc.startsWith("@")) {
        console.error(`endpoint '${endpointAndFunc}' must start with '@'`);
    }
    const parts = endpointAndFunc.split(".");
    const endpoint = parts[0].slice(1);
    const func = parts[1];
    try {
        const response = await fetch(`http://localhost:8000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ func: func, args: args })
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const obj= await response.json();
        return obj;
    } catch (error) {
        console.error('Error:', error);
    }
    return [];
}