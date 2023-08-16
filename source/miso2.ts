// ᕦ(ツ)ᕤ
// miso2
// author: asnaroo (with a little help from GPT4)

import {GraphView} from "./graphview.js";
import {element} from "./html.js";
import {scrollToView} from "./html.js";

window.onload = () => { main(); };

const s_useLocalFiles = false;              // change this to true to enable local file access
let dirHandle: any | null = null;
let s_port = 8000;
let s_endPoint = "miso2";
var s_allCards: Card[];
var s_view : GraphView;

class CodeBlock {
    text: string = "";                  // actual code text
    language: string;                   // ".ts", ".py", ".cpp", ".hpp", etc.
    iLine: number = 0;                  // 1-based line index in original code file
    constructor(code: string, language: string, iLine: number) {
        this.text = code; this.language = language; this.iLine = iLine;
    }
}

class Dependency {
    iChar: number = 0;                  // character index in code of start of symbol
    jChar: number = 0;                  // character index in code after symbol
    target: Card;                       // card we link to or from (works both ways)
    constructor(target: Card, iChar: number, jChar: number) {
        this.target = target; this.iChar = iChar; this.jChar = jChar; 
    }
};

class Card {
    uid: string = "";                   // uid; something like kind_name, but maybe other decorators too
    kind: string = "";                  // "class" or "function" or "other"
    name: string = "";                  // name of function or class being defined
    purpose: string = "";               // purpose
    examples: string = "";              // examples
    inputs: string = "";                // inputs
    outputs: string = "";               // outputs
    code: CodeBlock[] = [];             // actual text from code file
    dependsOn: Dependency[] = [];       // cards we depend on
    dependents: Dependency[] =[];       // cards that depend on us
    children: Card[] =[];               // if we're a class, cards for methods
    parent: Card | null = null;         // if we're a method or property, points to parent
    rankFromBottom: number = 0;         // 1 means depends on nothing; x means depends on things with rank < x
    rankFromTop: number = 0;            // 1 means nothing calls this; x means called by things with rank < x
}

async function main() {
    console.log("ᕦ(ツ)ᕤ miso2.");
    await setupEvents();
}

async function setupEvents() {
    const container = document.getElementById('container') as HTMLElement;
    s_view = new GraphView(container);
    await loadCards();
}

async function loadCards() {
    if (s_useLocalFiles) {
        await setupDirectoryButton();
    } else {
        await autoImport();
    }
}

async function openMain() {
    const card = findCard("function_main");
    if (card) {
        openCard(card, null);
    }
}

// to avoid the annoyance of having to give permissions every time, just get system to do it
async function autoImport() {
    const openDirectoryButton: HTMLButtonElement = document.getElementById('openDirectory') as HTMLButtonElement;
    openDirectoryButton.remove();
    await importCode("miso2", ".ts");
    await animateLogoToLeft();
    await openMain();
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
        openDirectoryButton.remove();
        await importLocalFile();
        await animateLogoToLeft();
        await openMain();
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
    const obj = await runOnServer({"command": "import", "code" : fullText, "ext" : ext});
    s_allCards = obj.cards as Card[];
    console.log("nCards:", s_allCards.length);
    let uids: string[] = [];
    for(const card of s_allCards) {
        uids.push(card.uid);
    }
    console.log(uids);
}

// finds the card with the given UID, or null if doesn't exist
function findCard(uid: string) : Card | null {
    let index = s_allCards.findIndex((card : any ) => card.uid === uid);
    if (index < 0) return null;
    return s_allCards[index];
}

// generates HTML for card, but doesn't connect it yet
function cardToHTML(card: Card) : HTMLElement {
    let elem : HTMLElement = element(`<div id="${card.uid}" class="code" spellcheck="false" contenteditable="false"></div>`);
    let text : string = card.code[0].text;
    if (card.dependsOn.length==0) {
        elem.innerText = text;
    } else {
        let iChar : number = 0;
        for(const dep of card.dependsOn) {
            // add text-node going from (iChar) to (dep.iChar)
            if (dep.iChar > iChar) {
                elem.appendChild(document.createTextNode(text.slice(iChar, dep.iChar)));
            }
            // add span containing the link
            const link = text.slice(dep.iChar, dep.jChar);
            const child = element(`<span class="tag" id="linkto_${dep.target}">${link}</span>`);
            child.addEventListener('click', function(event) {
                openOrCloseCard(child, child.id.slice("linkto_".length));
                event.stopPropagation();
            });
            elem.appendChild(child);
            // step
            iChar = dep.jChar;
        }
        // add text-node for the remaining bit of text
        if (iChar < text.length) {
            elem.appendChild(document.createTextNode(text.slice(iChar, text.length)));
        }
    }
    elem.addEventListener('click', function() {
        expandOrContract(elem);
    });
    return elem;
}

function expandOrContract(div : HTMLElement) {
    div.classList.toggle("code-expanded");
    s_view.emphasize(div, div.classList.contains("code-expanded"));
    s_view.arrangeAll();
    scrollToView(div);
}

/*
        for(let i = card.dependsOn.length-1; i >= 0; i--) {
            const dep : Dependency = card.dependsOn[i];
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
*/

// if a card view is closed, opens it; otherwise closes it
function openOrCloseCard(button: HTMLElement, uid: string) {
    const card : Card | null = findCard(uid);
    if (!card) return;
    let existing = s_view.find(uid);
    if (existing) {
        closeCard(existing);
    } else {
        openCard(card, button);
    }
}

// opens a card, optionally connected to a button element
function openCard(card: Card, button: HTMLElement | null) : HTMLElement {
    console.log("openCard", card.uid);
    let cardDiv = cardToHTML(card);
    s_view.add(cardDiv, button);
    if (button) {
        button.className = "tag-highlight";
    }
    return cardDiv;
}

// closes a card
function closeCard(cardDiv: HTMLElement) {
    let button = s_view.findLink(cardDiv);
    if (button) {
        button.className = "tag";
    }
    s_view.close(cardDiv);
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