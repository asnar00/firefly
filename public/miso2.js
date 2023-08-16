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
import { scrollToView } from "./html.js";
window.onload = () => { main(); };
const s_useLocalFiles = false; // change this to true to enable local file access
let dirHandle = null;
let s_port = 8000;
let s_endPoint = "miso2";
var s_allCards;
var s_graphView;
class CodeBlock {
    constructor(code, language, iLine) {
        this.text = ""; // actual code text
        this.iLine = 0; // 1-based line index in original code file
        this.text = code;
        this.language = language;
        this.iLine = iLine;
    }
}
class Dependency {
    constructor(target, iChar, jChar) {
        this.iChar = 0; // character index in code of start of symbol
        this.jChar = 0; // character index in code after symbol
        this.target = target;
        this.iChar = iChar;
        this.jChar = jChar;
    }
}
;
class Card {
    constructor() {
        this.uid = ""; // uid; something like kind_name, but maybe other decorators too
        this.kind = ""; // "class" or "function" or "other"
        this.name = ""; // name of function or class being defined
        this.purpose = ""; // purpose
        this.examples = ""; // examples
        this.inputs = ""; // inputs
        this.outputs = ""; // outputs
        this.code = []; // actual text from code file
        this.dependsOn = []; // cards we depend on
        this.dependents = []; // cards that depend on us
        this.children = []; // if we're a class, cards for methods
        this.parent = null; // if we're a method or property, points to parent
        this.rankFromBottom = 0; // 1 means depends on nothing; x means depends on things with rank < x
        this.rankFromTop = 0; // 1 means nothing calls this; x means called by things with rank < x
    }
}
var CardViewState;
(function (CardViewState) {
    CardViewState[CardViewState["SuperCompact"] = 0] = "SuperCompact";
    CardViewState[CardViewState["Compact"] = 1] = "Compact";
    CardViewState[CardViewState["Fullsize"] = 2] = "Fullsize";
    CardViewState[CardViewState["Editing"] = 3] = "Editing";
})(CardViewState || (CardViewState = {}));
class CardView {
    constructor(card, state) {
        this.state = CardViewState.Compact;
        this.xScroll = 0;
        this.yScroll = 0;
        this.uid = card.uid;
        this.state = state;
    }
    card() {
        return findCard(this.uid);
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("ᕦ(ツ)ᕤ miso2.");
        yield setupEvents();
    });
}
function setupEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        const container = document.getElementById('container');
        s_graphView = new GraphView(container);
        yield loadCards();
    });
}
function loadCards() {
    return __awaiter(this, void 0, void 0, function* () {
        if (s_useLocalFiles) {
            yield importLocalFolder();
        }
        else {
            yield autoImport();
        }
    });
}
function openMain() {
    return __awaiter(this, void 0, void 0, function* () {
        const card = findCard("function_main");
        if (card) {
            openCard(card, null);
        }
    });
}
// to avoid the annoyance of having to give permissions every time, just get system to do it
function autoImport() {
    return __awaiter(this, void 0, void 0, function* () {
        yield importCode("miso2", ".ts");
        yield animateLogoToLeft();
        yield openMain();
    });
}
function importLocalFolder() {
    return __awaiter(this, void 0, void 0, function* () {
        let logo = document.getElementById('logo_and_shadow');
        let button = element(`<button id="openDirectory" class="transparent-button" style="display: inline-block;">
                            <h3 style="display: inline-block;">▶︎</h3></button>`);
        logo.insertBefore(button, logo.children[1]);
        button.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            console.log("button pressed!");
            if (!window.showDirectoryPicker) {
                console.log("showDirectoryPicker is null");
                return;
            }
            dirHandle = yield window.showDirectoryPicker();
            button.remove();
            yield importLocalFile();
            yield animateLogoToLeft();
            yield openMain();
        }));
    });
}
// test-reads the first file and sets text in browser
function importLocalFile() {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        console.log("importLocalFile");
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
        const obj = yield runOnServer({ "command": "import", "code": fullText, "ext": ext });
        s_allCards = obj.cards;
        console.log("nCards:", s_allCards.length);
        let uids = [];
        for (const card of s_allCards) {
            uids.push(card.uid);
        }
        console.log(uids);
    });
}
// finds the card with the given UID, or null if doesn't exist
function findCard(uid) {
    let index = s_allCards.findIndex((card) => card.uid === uid);
    if (index < 0)
        return null;
    return s_allCards[index];
}
// generates HTML for card, but doesn't connect it yet
function cardToHTML(card, view) {
    let elem = element(`<div id="${card.uid}" class="code" spellcheck="false" contenteditable="false"></div>`);
    let text = card.code[0].text;
    if (card.dependsOn.length == 0) {
        elem.innerText = text;
    }
    else {
        let iChar = 0;
        for (const dep of card.dependsOn) {
            // add text-node going from (iChar) to (dep.iChar)
            if (dep.iChar > iChar) {
                elem.appendChild(document.createTextNode(text.slice(iChar, dep.iChar)));
            }
            // add span containing the link
            const link = text.slice(dep.iChar, dep.jChar);
            const child = element(`<span class="tag" id="linkto_${dep.target}">${link}</span>`);
            child.addEventListener('click', function (event) {
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
    elem.addEventListener('click', function () {
        expandOrContract(elem);
    });
    elem.addEventListener('scroll', function (event) {
        getScrollPos(elem);
    });
    return elem;
}
function expandOrContract(div) {
    console.log("expandOrContract", div.id);
    let view = s_graphView.userObj(div);
    if (view.state == CardViewState.Compact) {
        console.log(" expanding");
        div.classList.add("code-expanded");
        view.state = CardViewState.Fullsize;
    }
    else if (view.state == CardViewState.Fullsize) {
        console.log(" contracting");
        div.classList.remove("code-expanded");
        view.state = CardViewState.Compact;
        div.scrollLeft = view.xScroll;
        div.scrollTop = view.yScroll;
    }
    s_graphView.emphasize(div, div.classList.contains("code-expanded"));
    s_graphView.arrangeAll();
    scrollToView(div);
}
function getScrollPos(div) {
    let view = s_graphView.userObj(div);
    if (view.state == CardViewState.Compact) {
        view.xScroll = div.scrollLeft;
        view.yScroll = div.scrollTop;
    }
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
function openOrCloseCard(button, uid) {
    const card = findCard(uid);
    if (!card)
        return;
    let existing = s_graphView.find(uid);
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
    let view = new CardView(card, CardViewState.Compact);
    let cardDiv = cardToHTML(card, view);
    s_graphView.add(cardDiv, button, view);
    if (button) {
        button.className = "tag-highlight";
    }
    return cardDiv;
}
// closes a card
function closeCard(cardDiv) {
    let button = s_graphView.findLink(cardDiv);
    if (button) {
        button.className = "tag";
    }
    s_graphView.close(cardDiv);
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
