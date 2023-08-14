// ᕦ(ツ)ᕤ
// miso2
// author: asnaroo (with a little help from GPT4)

window.onload = () => { main(); };

const s_useLocalFiles = false;              // change this to true to enable local file access
let dirHandle: any | null = null;
let s_port = 8000;
let s_endPoint = "miso2";
var s_allCards: { cards: any[]; };
var s_container: HTMLElement;
var s_viewMap: WeakMap<HTMLElement, ViewInfo> = new WeakMap();
var s_columns : ViewInfo[][] = [];
var s_padding = 24; // pixels

async function main() {
    console.log("ᕦ(ツ)ᕤ miso2.");
    await setupEvents();
}

async function setupEvents() {
    s_container = document.getElementById('container') as HTMLElement;
    await loadCards();
    const card = findCard("function_main");
    if (card) {
        openCard(card, null);
    }
}


async function loadCards() {
    if (s_useLocalFiles) {
        await setupDirectoryButton();
    } else {
        await autoImportTest();
    }
}

// to avoid the annoyance of having to give permissions every time, just get system to do it
async function autoImportTest() {
    const openDirectoryButton: HTMLButtonElement = document.getElementById('openDirectory') as HTMLButtonElement;
    openDirectoryButton.remove();
    await Promise.all([animateLogoToLeft(), importCode("miso2", ".ts")]);
}

async function setupDirectoryButton() {
    const openDirectoryButton: HTMLButtonElement = document.getElementById('openDirectory') as HTMLButtonElement;
    openDirectoryButton.addEventListener('click', async () => {
        console.log("button pressed!");
        if (!(window as any).showDirectoryPicker) {
            console.log("showDirectoryPicker is null");
            return;
        }
        dirHandle = await (window as any).showDirectoryPicker!();
        await Promise.all([animateLogoToLeft(), importLocalFile()]);
    });
}

// test-reads the first file and sets text in browser
async function importLocalFile() {
    console.log("testImportLocalFile");
    // Assuming we are just reading the first file we find.
    console.log("values...");
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            console.log("getFile...");
            const file = await (entry as any).getFile();
            const filename : string = file.name; // Assuming 'file' has a 'name' property with the filename.
            if (filename.startsWith(".")) continue;
            const parts = filename.split('.');
            const ext = parts.length > 1 ? '.' + parts.pop() : '';
            console.log("readFileAsText...");
            console.log(`ext = '${ext}'`);
            const fullText = await readFileAsText(file);
            await importCode(fullText, ext);
            break;
        }
    }
}

function escapeHTML(unsafeText: string) {
    return unsafeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// create a new HTML element from an HTML string
function element(html: string) : HTMLElement {
    let div = document.createElement('div');
    div.innerHTML = html;  
    return div.firstChild as HTMLElement;
}

// Read file on client machine in folder
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target!.result as string);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
}

// Store Directory Handle in IndexedDB
async function storeHandle(): Promise<void> {
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open('myDatabase', 1);

        openRequest.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('fileHandles')) {
                db.createObjectStore('fileHandles');
            }
        };

        openRequest.onsuccess = () => {
            const db = openRequest.result;
            const transaction = db.transaction('fileHandles', 'readwrite');
            const objectStore = transaction.objectStore('fileHandles');
            const request = objectStore.put(dirHandle, 'dirHandle');

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error('Error storing dirHandle to IndexedDB'));
            };
        };

        openRequest.onerror = () => {
            reject(new Error('Error opening database'));
        };
    });
}

// Retrieve Directory Handle from IndexedDB
async function getStoredHandle() : Promise<any> {
    console.log("getStoredHandle");
    return new Promise((resolve, reject) => {
        const openRequest = indexedDB.open('myDatabase', 1);

        openRequest.onsuccess = () => {
            const db = openRequest.result;
            const transaction = db.transaction('fileHandles', 'readonly');
            const objectStore = transaction.objectStore('fileHandles');
            const request = objectStore.get('dirHandle');

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result);
                } else {
                    resolve(null);  // or resolve(undefined);
                }
            };

            request.onerror = () => {
                //reject(new Error('Error retrieving dirHandle from IndexedDB'));
                resolve(null);
            };
        };

        openRequest.onerror = () => {
            reject(new Error('Error opening database'));
        };
    });
}

let dbInstance : any;
async function openDB() {
    console.log("openDB");
    if (dbInstance) {
        console.log("already have a db instance");
        return dbInstance;
    }
    console.log("creating db instance");
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('myDatabase', 1);  // 'myDatabase' is the name of your database.

        // This event is only triggered once when the database is first created or when 
        // the version number is changed (like from 1 to 2).
        request.onupgradeneeded = function(event: any) {
            console.log("onupgradeneeded");
            const db = event.target.result;
            
            // Create an object store named 'fileHandles' if it doesn't exist.
            if (!db.objectStoreNames.contains('fileHandles')) {
                db.createObjectStore('fileHandles');
            }
        };

        request.onsuccess = function(event: any) {
            console.log("onsuccess");
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = function(event: any) {
            console.error("Error opening database:", event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// move the logo and shadow to the left of the window
async function animateLogoToLeft(): Promise<void> {
    return new Promise((resolve, reject) => {
        const logoAndShadow = document.getElementById("logo_and_shadow")!;

        // Set animation properties
        logoAndShadow.style.animationName = "moveToLeft";
        logoAndShadow.style.animationDuration = "0.25s";
        logoAndShadow.style.animationTimingFunction = "ease-in-out";
        logoAndShadow.style.animationFillMode = "forwards"; 

        // Attach the animationend event listener
        logoAndShadow.addEventListener('animationend', function onAnimationEnd() {
            // Remove the event listener to prevent memory leaks
            logoAndShadow.removeEventListener('animationend', onAnimationEnd);
            resolve();
        });

        // Start the animation
        logoAndShadow.style.left = "0";
    });
}


// just a test: send the string back to the ranch, receive a full JSON analysis in the post
async function importCode(fullText: string, ext: string) {
    console.log("importing code");
    s_allCards = await runOnServer({"command": "import", "code" : fullText, "ext" : ext});
    const cards : any = s_allCards.cards;
    console.log("nCards:", cards.length);
    
}

// finds the card with the given UID, or null if doesn't exist
function findCard(uid: string) : any {
    let index = s_allCards.cards.findIndex((card : any ) => card.uid === uid);
    if (index < 0) return null;
    return s_allCards.cards[index];
}

// generates HTML for card, but doesn't connect it yet
function cardToHTML(card: any) : HTMLElement {
    let elem : HTMLElement = element(`<div id="${card.uid}"class="code" spellcheck="false"; contenteditable="false"; style="position:absolute; left: 10%;"></div>`);
    let text : string = card.code[0].text;
    for(let i = card.dependsOn.length-1; i >= 0; i--) {
        const dep = card.dependsOn[i];
        const iChar = dep.iChar;
        const jChar = dep.jChar;
        const before = text.slice(0, iChar);
        const link = text.slice(iChar, jChar);
        const after = text.slice(jChar);
        text = `${before}<span class="tag" id="linkto_${dep.target}">${link}</span>${after}`
    }
    elem.innerHTML = text;
    Array.from(elem.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child instanceof HTMLElement) {
            if (child.tagName.toLowerCase() === 'span') {
                child.addEventListener('click', function() {
                    openOrCloseCard(child, child.id.slice("linkto_".length));
                });
            }
        }
    });
    return elem;
}

// if a card view is closed, opens it; otherwise closes it
function openOrCloseCard(button: HTMLElement, uid: string) {
    console.log("openOrCloseCard", uid);
    const card = findCard(uid);
    if (!card) return;
    console.log("found card:", card.uid);
    let existing = findCardDiv(uid);
    if (existing) {
        closeCard(existing);
    } else {
        openCard(card, button);
    }
}

// opens a card, optionally connected to a button element
function openCard(card: any, button: HTMLElement | null) : HTMLElement {
    console.log("openCard", card.uid);
    let cardDiv = cardToHTML(card);
    s_container.appendChild(cardDiv); // have to do this first so
    setPosition(cardDiv, button);
    const bodyWidth = getBodyWidth();
    arrangeAllViews();          // todo: call this every frame
    const newWidth = getBodyWidth();
    if (newWidth > bodyWidth) {
        smoothScrollToRight(250);
    }
    if (button) {
        button.className = "tag-highlight";
    }
    return cardDiv;
}

// sets the position of a card based on its connections
function setPosition(cardDiv: HTMLElement, button: HTMLElement | null) {
    let parentCard = (button)? findCardContainingButton(button) : null;
    let xTarget = 0;
    let yTarget = 0;
    if (button && parentCard) {
        const rect = getRect(parentCard);
        const brect = getRect(button);
        const crect = getRect(cardDiv);
        console.log("crect", crect);
        xTarget = rect.right + s_padding;
        yTarget = ((brect.top + brect.bottom)/2) - (crect.height()/2);
    } else {
        const crect = getRect(cardDiv);
        console.log("crect", crect);
        xTarget = crect.left;
        yTarget = (window.innerHeight / 2) - (crect.height()/2);
    }

    let viewInfo = new ViewInfo(cardDiv, button, parentCard);
    //viewInfo.setPos(xTarget, yTarget);
    viewInfo.card.style.left = `${xTarget}px`;
    viewInfo.card.style.top = `${yTarget}px`;
    viewInfo.idealRect = getRect(cardDiv);
    s_viewMap.set(cardDiv, viewInfo);
}

// closes a card that's open, and all children as well
function closeCard(cardDiv: HTMLElement) {
    const view = s_viewMap.get(cardDiv)!;
    if (view.button) {
        view.button.className = "tag";
    }
    cardDiv.remove();
    view.remove();
    const bodyWidth = getBodyWidth();
    arrangeAllViews();          // todo: call this every frame
    const newWidth = getBodyWidth();
    if (newWidth < bodyWidth) {
        smoothScrollToRight(250);
    }
}

// given a uid, finds the div with that ID (the card div)
function findCardDiv(uid: string) : HTMLElement | null {
    const elementsArray = Array.from(s_container.querySelectorAll(`#${uid}`));
    if (elementsArray.length == 0) return null;
    return elementsArray[0] as HTMLElement;
}

// given a button, returns the card div that contains it
function findCardContainingButton(button: HTMLElement): HTMLElement | null {
    let immediateParent = button.parentElement;
    while (immediateParent && immediateParent.parentElement !== s_container) {
        immediateParent = immediateParent.parentElement;
    }
    if (immediateParent) {
        return immediateParent;
    } else {
        return null;
    }
}

// given an element, returns the rectangle relative to document origin
function getRect(el: HTMLElement) : Rect {
    const rect = el.getBoundingClientRect();
    return new Rect(rect.left + window.scrollX, rect.top + window.scrollY,
                    rect.right + window.scrollX, rect.bottom + window.scrollY);
}

// sends a command request to the server, waits on the reply, returns dictionary object
async function runOnServer(command: any) : Promise<any> {
    try {
        const response = await fetch(`http://localhost:${s_port}/${s_endPoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
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

// stores information about a div we're arranging
class ViewInfo {
    card: HTMLElement;                      // the card we're tracking
    button: HTMLElement | null;             // the button that triggered this
    parentCard: HTMLElement | null;         // the parent card of the button that triggered this card
    column: number = 0;                     // column we're in (first one zero)
    idealRect: Rect = new Rect(0,0,0,0);    // where we'd like to be in a perfect world
    xTarget: number = 0;                    // where we're trying to get to, to avoid others
    yTarget: number = 0;                    // ..
    shadow: HTMLElement;                    // the shadow, all-important :-)
    constructor(card: HTMLElement, button: HTMLElement | null, parentCard: HTMLElement | null) {
        if (parentCard === undefined) {
            console.log("WARNING: parentCard undefined!");
        }
        this.card = card; this.button = button; this.parentCard = parentCard;
        if (parentCard) { 
            this.column = s_viewMap.get(parentCard)!.column + 1;
        }
        this.shadow = element(`<div class="shadow"><div>`);
        s_container.appendChild(this.shadow);
        this.updateShadow();
        addToColumnArray(this);
    }
    remove() {
        s_columns[this.column] = s_columns[this.column].filter(item => item !== this);
        this.shadow.remove();
    }
    setPos(x:number, y:number) {                // for some reason this just doesn't want to work. No idea why.
        this.card.style.left = `${x}px;`;
        this.card.style.top  = `${y}px;`;
    }
    yButton() {
        return getRect(this.button!).top;
    }
    updateShadow() {
        const sr = getRect(this.card);
        const wh = window.innerHeight;
        const sy = wh - ((sr.bottom / wh) * 200);
        this.shadow.style.left = `${sr.left}px`;
        this.shadow.style.top = `${sy - sr.top}px`;
    }
};

class Rect {
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

// adds a viewinfo to the columns array-of-arrays
function addToColumnArray(v :ViewInfo) {
    while (s_columns.length <= v.column) {
        s_columns.push([]);
    }
    s_columns[v.column].push(v);
    s_columns[v.column].sort((a, b) => (a.yButton() - b.yButton()));
}

// arranges all views : computes xTarget, yTarget for each view
function arrangeAllViews() {
    console.log("arrangeAllViews");
    let xPos = getRect(s_columns[0][0].card).right + s_padding;
    for(let i = 1; i < s_columns.length; i++) {
        let groups : ViewInfo[][] = splitColumnIntoGroups(i);
        for (let group of groups) {
            spaceViewsInGroup(group, xPos);
        }
        spaceGroupsVertically(groups);
    
        // now get xPos = max of all right-edges
        for(const v of s_columns[i]) {
            xPos = Math.max(xPos, getRect(v.card).right + s_padding);
        }
    }
    const widthInPixels = getBodyWidth();
    const newWidth = Math.max(window.innerWidth, xPos);
    document.body.style.width = `${newWidth}px`;
}

function splitColumnIntoGroups(i: number) : ViewInfo[][] {
    let groups : ViewInfo[][] = [];
    for(const p of s_columns[i-1]) {
        let group : ViewInfo[] = [];
        for(const v of s_columns[i]) {
            if (v.parentCard!.id === p.card.id) {
                group.push(v);
            }
        }
        if (group.length > 0) {
            groups.push(group);
        }
    }
    return groups;
}

function spaceViewsInGroup(group: ViewInfo[], xPos: number) {
    // first find the total height of the group, plus padding
    let sumHeight = (group.length-1) * s_padding;
    for(const v of group) {
        sumHeight += getRect(v.card).height();
    }
    // then find the centerline of the group's parent
    const parentRect = getRect(group[0].parentCard!);
    const centerLine = (parentRect.top + parentRect.bottom)/2;
    // now space group out vertically around the centerline
    let yPos = Math.max(s_padding, centerLine - (sumHeight/2));
    for (let v of group) {
        v.xTarget = xPos;
        v.yTarget = yPos;
        yPos += getRect(v.card).height() + s_padding;
        v.card.style.left = `${v.xTarget}px`;
        v.card.style.top = `${v.yTarget}px`;
        const sr = getRect(v.card);
        const wh = window.innerHeight;
        const sy = wh - ((sr.bottom / wh) * 200);
        v.shadow.style.left = `${sr.left}px`;
        v.shadow.style.top = `${sy - sr.top}px`;
    }
}

function spaceGroupsVertically(groups: ViewInfo[][]) {
    // space groups out vertically so they don't overlap
    for(let i = 1; i < groups.length; i++) {
        const prevGroup = groups[i-1];
        const prevBottom = getRect(prevGroup[prevGroup.length-1].card).bottom;
        const group = groups[i];
        const top = getRect(group[0].card).top;
        if (top <= (prevBottom + s_padding)) {
            const newTop = prevBottom + s_padding;  // where group[0] has to move to
            const diff = newTop - top;  // therefore, how much to move by
            for(let v of group) {
                v.yTarget += diff;
                v.card.style.top = `${v.yTarget}px`;  
                const sr = getRect(v.card);
                const wh = window.innerHeight;
                const sy = wh - ((sr.bottom / wh) * 200);
                v.shadow.style.left = `${sr.left}px`;
                v.shadow.style.top = `${sy - sr.top}px`;
            }
        }
    }
}

function getBodyWidth() : number {
    let bodyWidth: string = getComputedStyle(document.body).width;
    return parseInt(bodyWidth, 10);
}

function smoothScrollToRight(duration: number) {
    const maxX = document.body.scrollWidth - window.innerWidth;
    window.scrollTo({
        top: 0,
        left: maxX,
        behavior: 'smooth'
    });
}
