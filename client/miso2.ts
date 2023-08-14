// ᕦ(ツ)ᕤ
// miso2
// author: asnaroo (with a little help from GPT4)

window.onload = () => { main(); };
let dirHandle: any | null = null;
let s_port = 8000;
let s_endPoint = "miso2";
var s_allCards: { cards: any[]; };
var s_container: HTMLElement;

async function main() {
    console.log("ᕦ(ツ)ᕤ miso2.");
    s_container = document.getElementById('container') as HTMLElement;
    await setupDirectoryButton();
}

// On page load, see if we have a handle stored:
async function checkStoredHandle() {
    console.log("checkStoredHandle");
    dirHandle = await getStoredHandle();
    if (dirHandle) {
        console.log('We already have a directory handle:', dirHandle);
        await getPermission();
        await testReadLocalFile();
        const openDirectoryButton: HTMLButtonElement = document.getElementById('openDirectory') as HTMLButtonElement;
        openDirectoryButton.remove();
    } else {
        console.log('No directory handle found. Ask the user.');
        setupDirectoryButton();
    }
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
        await Promise.all([animateLogoToLeft(), testReadLocalFile()]);

        const card = findCard("function_main");     // todo: otherwise open top-level card or whatever
        if (card) {
            openCard(card, null);
        }
    });
}

// get permission to use the dirHandle, or whatever
async function getPermission() {
    const permissionStatus = await dirHandle.queryPermission({ mode: 'read' });
    if (permissionStatus === 'granted') {
        // You have permission, proceed with the operation
    } else {    
        // You don't have permission, you might need to request it
        const requestStatus = await dirHandle.requestPermission({ mode: 'read' });
        if (requestStatus === 'granted') {
            // Now you have permission, proceed with the operation
        } else {
            console.error('Permission denied');
        }
    }
}

// test-reads the first file and sets text in browser
async function testReadLocalFile() {
    console.log("testReadLocalFile");
    // Assuming we are just reading the first file we find.
    console.log("values...");
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            console.log("getFile...");
            const file = await (entry as any).getFile();
            const filename = file.name; // Assuming 'file' has a 'name' property with the filename.
            const parts = filename.split('.');
            const ext = parts.length > 1 ? '.' + parts.pop() : '';
            console.log("readFileAsText...");
            console.log(`ext = '${ext}'`);
            const fullText = await readFileAsText(file);

            await testImportCode(fullText, ext);
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
async function testImportCode(fullText: string, ext: string) {
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
    let elem= cardToHTML(card);
    if (button) {
        let parentCard = findCardContainingButton(button);
        if (parentCard) {
            const rect = getRect(parentCard);
            const brect = getRect(button);
            const left = rect.right + 32;
            const top = (brect.top + brect.bottom)/2;
            elem.style.left = `${left}px`;
            elem.style.top = `${top}px`;
        }
    }
    s_container.appendChild(elem);
    return elem;
}

// closes a card that's open, and all children as well
function closeCard(cardDiv: HTMLElement) {
    cardDiv.remove();
    // todo: do children as well.
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
function getRect(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        right: rect.right + window.scrollX,
        width: rect.width,
        height: rect.height
    };
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