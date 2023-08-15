// ᕦ(ツ)ᕤ
// miso2
// author: asnaroo (with a little help from GPT4)
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { GraphView } from "./graphview.js";
import { element } from "./html.js";
window.onload = () => { main(); };
const s_useLocalFiles = false; // change this to true to enable local file access
let dirHandle = null;
let s_port = 8000;
let s_endPoint = "miso2";
var s_allCards;
var s_view;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("ᕦ(ツ)ᕤ miso2.");
        yield setupEvents();
    });
}
function setupEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        const container = document.getElementById('container');
        s_view = new GraphView(container);
        yield loadCards();
        const card = findCard("function_main");
        if (card) {
            openCard(card, null);
        }
    });
}
function loadCards() {
    return __awaiter(this, void 0, void 0, function* () {
        if (s_useLocalFiles) {
            yield setupDirectoryButton();
        }
        else {
            yield autoImportTest();
        }
    });
}
// to avoid the annoyance of having to give permissions every time, just get system to do it
function autoImportTest() {
    return __awaiter(this, void 0, void 0, function* () {
        const openDirectoryButton = document.getElementById('openDirectory');
        openDirectoryButton.remove();
        yield importCode("miso2", ".ts");
        yield animateLogoToLeft();
    });
}
function setupDirectoryButton() {
    return __awaiter(this, void 0, void 0, function* () {
        const openDirectoryButton = document.getElementById('openDirectory');
        openDirectoryButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            console.log("button pressed!");
            if (!window.showDirectoryPicker) {
                console.log("showDirectoryPicker is null");
                return;
            }
            dirHandle = yield window.showDirectoryPicker();
            yield importLocalFile();
            yield animateLogoToLeft();
        }));
    });
}
// test-reads the first file and sets text in browser
function importLocalFile() {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        console.log("testImportLocalFile");
        // Assuming we are just reading the first file we find.
        console.log("values...");
        try {
            for (var _b = __asyncValues(dirHandle.values()), _c; _c = yield _b.next(), !_c.done;) {
                const entry = _c.value;
                if (entry.kind === 'file') {
                    console.log("getFile...");
                    const file = yield entry.getFile();
                    const filename = file.name; // Assuming 'file' has a 'name' property with the filename.
                    if (filename.startsWith("."))
                        continue;
                    const parts = filename.split('.');
                    const ext = parts.length > 1 ? '.' + parts.pop() : '';
                    console.log("readFileAsText...");
                    console.log(`ext = '${ext}'`);
                    const fullText = yield readFileAsText(file);
                    yield importCode(fullText, ext);
                    break;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
function escapeHTML(unsafeText) {
    return unsafeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
// Read file on client machine in folder
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = error => reject(error);
        reader.readAsText(file);
    });
}
// Store Directory Handle in IndexedDB
function storeHandle() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open('myDatabase', 1);
            openRequest.onupgradeneeded = (event) => {
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
    });
}
// Retrieve Directory Handle from IndexedDB
function getStoredHandle() {
    return __awaiter(this, void 0, void 0, function* () {
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
                    }
                    else {
                        resolve(null); // or resolve(undefined);
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
    });
}
let dbInstance;
function openDB() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("openDB");
        if (dbInstance) {
            console.log("already have a db instance");
            return dbInstance;
        }
        console.log("creating db instance");
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('myDatabase', 1); // 'myDatabase' is the name of your database.
            // This event is only triggered once when the database is first created or when 
            // the version number is changed (like from 1 to 2).
            request.onupgradeneeded = function (event) {
                console.log("onupgradeneeded");
                const db = event.target.result;
                // Create an object store named 'fileHandles' if it doesn't exist.
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles');
                }
            };
            request.onsuccess = function (event) {
                console.log("onsuccess");
                dbInstance = event.target.result;
                resolve(dbInstance);
            };
            request.onerror = function (event) {
                console.error("Error opening database:", event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    });
}
// move the logo and shadow to the left of the window
function animateLogoToLeft() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const logoAndShadow = document.getElementById("logo_and_shadow");
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
    });
}
// just a test: send the string back to the ranch, receive a full JSON analysis in the post
function importCode(fullText, ext) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("importing code");
        s_allCards = yield runOnServer({ "command": "import", "code": fullText, "ext": ext });
        const cards = s_allCards.cards;
        console.log("nCards:", cards.length);
    });
}
// finds the card with the given UID, or null if doesn't exist
function findCard(uid) {
    let index = s_allCards.cards.findIndex((card) => card.uid === uid);
    if (index < 0)
        return null;
    return s_allCards.cards[index];
}
// generates HTML for card, but doesn't connect it yet
function cardToHTML(card) {
    let elem = element(`<div id="${card.uid}" class="code" spellcheck="false" contenteditable="false"></div>`);
    let text = card.code[0].text;
    for (let i = card.dependsOn.length - 1; i >= 0; i--) {
        const dep = card.dependsOn[i];
        const iChar = dep.iChar;
        const jChar = dep.jChar;
        const before = text.slice(0, iChar);
        const link = text.slice(iChar, jChar);
        const after = text.slice(jChar);
        text = `${before}<span class="tag" id="linkto_${dep.target}">${link}</span>${after}`;
    }
    elem.innerHTML = text;
    Array.from(elem.childNodes).forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child instanceof HTMLElement) {
            if (child.tagName.toLowerCase() === 'span') {
                child.addEventListener('click', function () {
                    openOrCloseCard(child, child.id.slice("linkto_".length));
                });
            }
        }
    });
    return elem;
}
// if a card view is closed, opens it; otherwise closes it
function openOrCloseCard(button, uid) {
    const card = findCard(uid);
    if (!card)
        return;
    let existing = s_view.find(uid);
    if (existing) {
        closeCard(existing);
    }
    else {
        openCard(card, button);
    }
}
// opens a card, optionally connected to a button element
function openCard(card, button) {
    console.log("openCard", card.uid);
    let cardDiv = cardToHTML(card);
    s_view.add(cardDiv, button);
    if (button) {
        button.className = "tag-highlight";
    }
    return cardDiv;
}
// closes a card
function closeCard(cardDiv) {
    let button = s_view.findLink(cardDiv);
    if (button) {
        button.className = "tag";
    }
    s_view.close(cardDiv);
}
// sends a command request to the server, waits on the reply, returns dictionary object
function runOnServer(command) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`http://localhost:${s_port}/${s_endPoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(command)
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
