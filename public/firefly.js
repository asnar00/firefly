// ᕦ(ツ)ᕤ
// firefly.ts
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
import { element } from "./util.js";
import { scrollToView } from "./util.js";
import { debounce } from "./util.js";
window.onload = () => { main(); };
const s_useLocalFiles = false; // change this to true to enable local file access
let dirHandle = null;
let s_port = 8000;
let s_endPoint = "firefly";
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
    constructor(uid, state) {
        this.state = CardViewState.Compact;
        this.xScroll = 0;
        this.yScroll = 0;
        this.uid = uid;
        this.state = state;
    }
    card() {
        return findCard(this.uid);
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("firefly ᕦ(ツ)ᕤ");
        yield setupEvents();
    });
}
function setupEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        const container = document.getElementById('container');
        s_graphView = new GraphView(container, cardToHTML, highlightLink);
        yield loadCards();
        yield animateLogoToLeft();
        yield openMain();
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
        let json = yield loadObject("session/test.json");
        if (json.error) {
            console.log("failed to load session:", json.error);
            openCard("function_main", null);
        }
        else {
            s_graphView.openJson(json);
        }
    });
}
// to avoid the annoyance of having to give permissions every time, just get system to do it
function autoImport() {
    return __awaiter(this, void 0, void 0, function* () {
        yield importCode("firefly", ".ts");
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
function cardToHTML(id, view) {
    let card = findCard(id);
    if (!card) {
        return element(`<div></div>`);
    }
    let style = "code";
    if (view.state == CardViewState.Fullsize) {
        style += " code-expanded";
    }
    let elem = element(`<div id="${card.uid}" class="${style}" spellcheck="false" contenteditable="false"></div>`);
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
            listen(child, 'click', function (event) {
                return __awaiter(this, void 0, void 0, function* () {
                    openOrCloseCard(child.id.slice("linkto_".length), child);
                });
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
    elem.scrollLeft = view.xScroll;
    elem.scrollTop = view.yScroll;
    listen(elem, 'click', function () { expandOrContract(elem); });
    listen(elem, 'scroll', function (event) { getScrollPos(elem); });
    return elem;
}
function highlightLink(linkDiv, highlight) {
    if (highlight)
        linkDiv.className = "tag-highlight";
    else
        linkDiv.className = "tag";
}
function listen(elem, type, func) {
    elem.addEventListener(type, (event) => __awaiter(this, void 0, void 0, function* () {
        console.log(elem.id, type);
        yield func(event); // Assuming func is synchronous. If it's async, use await func(event);
        event.stopPropagation();
        debouncedSaveAll();
    }));
}
function expandOrContract(div) {
    let view = s_graphView.userObj(div);
    if (view.state == CardViewState.Compact) {
        div.classList.add("code-expanded");
        view.state = CardViewState.Fullsize;
    }
    else if (view.state == CardViewState.Fullsize) {
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
const debouncedSaveAll = debounce(() => { saveAll(); }, 300);
function saveAll() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("saveAll");
        const json = s_graphView.json();
        yield saveObject(json, "sessions/test.json");
    });
}
function saveObject(json, path) {
    return __awaiter(this, void 0, void 0, function* () {
        yield runOnServer({ command: "save", path: "sessions/test.json", json: json });
    });
}
function loadObject(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield runOnServer({ command: "load", path: "sessions/test.json" });
    });
}
// if a card view is closed, opens it; otherwise closes it
function openOrCloseCard(uid, button) {
    const card = findCard(uid);
    if (!card)
        return;
    let existing = s_graphView.find(uid);
    if (existing) {
        closeCard(existing);
    }
    else {
        openCard(uid, button);
    }
}
// opens a card, optionally connected to a button element
function openCard(uid, button) {
    console.log("openCard", uid);
    let linkID = "";
    let parentID = "";
    if (button) {
        linkID = button.id;
        let parent = s_graphView.findDivContainingLink(button);
        if (parent)
            parentID = parent.id;
    }
    s_graphView.open(uid, linkID, parentID, new CardView(uid, CardViewState.Compact));
    if (button) {
        highlightLink(button, true);
    }
}
// closes a card
function closeCard(cardDiv) {
    let button = s_graphView.findLink(cardDiv);
    if (button) {
        highlightLink(button, false);
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
