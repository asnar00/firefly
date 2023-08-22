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
import { debounce } from "./util.js";
import { remote } from "./util.js";
window.onload = () => { main(); };
const s_useLocalFiles = false; // change this to true to enable local file access
let dirHandle = null;
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
    constructor() {
        this.iChar = 0; // character index in code of start of symbol
        this.jChar = 0; // character index in code after symbol
        this.targets = []; // card uids we link to
    }
}
;
class Card {
    constructor() {
        this.uid = ""; // uid; something like lang_module_kind_name, but maybe other decorators too
        this.language = ""; // language shortname of original code
        this.module = ""; // module: eg. firefly or graphview
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
        this.parent = ""; // if we're a method or property, points to parent
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
    constructor(state) {
        this.state = CardViewState.Compact;
        this.xScroll = 0;
        this.yScroll = 0;
        this.state = state;
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("firefly ᕦ(ツ)ᕤ");
        yield run();
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield init();
        yield loadCards();
        yield animateLogoToLeft();
        yield openMain();
        testVectors();
        eventLoop();
    });
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        logo();
        graph();
    });
}
function logo() {
    const logo = document.getElementById('logo_and_shadow');
    logo.style.left = `${(window.innerWidth - logo.offsetWidth) / 2}px`;
    logo.style.top = `${(window.innerHeight / 2) - 40}px`;
}
function graph() {
    const container = document.getElementById('container');
    s_graphView = new GraphView(container, cardToHTML, highlightLink);
}
function eventLoop() {
    s_graphView.update();
    requestAnimationFrame(eventLoop);
}
function loadCards() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("loadCards");
        if (s_useLocalFiles) {
            yield importLocalFolder();
        }
        const jsonObj = yield importFolders("firefly", ["ts", "py"]);
        s_allCards = jsonObj.cards;
        console.log("nCards:", s_allCards.length);
    });
}
function openMain() {
    return __awaiter(this, void 0, void 0, function* () {
        let json = yield load("session/test.json");
        if (json.error) {
            console.log("failed to load session:", json.error);
            openCard("ts_firefly_firefly_function_main", null);
        }
        else {
            s_graphView.openJson(json);
        }
    });
}
function testVectors() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("testVectors");
        const query = "animate logo to left";
        console.log(query);
        let tNow = performance.now();
        const results = yield search(query);
        let tElapsed = performance.now() - tNow;
        console.log(`result:\n${JSON.stringify(results)}`);
        console.log(`took ${tElapsed} msec`);
    });
}
function search(query) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield remote("@firefly.search", { query });
    });
}
function importLocalFolder() {
    return __awaiter(this, void 0, void 0, function* () {
        let logo = document.getElementById('logo_and_shadow');
        let button = element(`<button id="openDirectory" class="transparent-button" style="display: inline-block;">
                            <h3 style="display: inline-block;">▶︎</h3></button>`);
        logo.insertBefore(button, logo.children[1]);
        button.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
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
                    console.log("NOT IMPLEMENTED YET"); // todo: implement by reading files, horking them over to the server, then following the normal channels
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
function importFolders(project, folders) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield remote("@firefly.importFolders", { project: project, folders: folders });
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
    let elem = element(`<div id="code_${card.uid}" class="${style}" spellcheck="false" contenteditable="false"></div>`);
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
            let linkId = "linkto_" + dep.targets[0];
            for (let i = 1; i < dep.targets.length; i++) {
                linkId += "__" + dep.targets[i];
            }
            const child = element(`<span class="tag" id="${linkId}">${link}</span>`);
            listen(child, 'click', function (event) {
                return __awaiter(this, void 0, void 0, function* () {
                    onLinkButtonPress(child);
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
    setTimeout(() => { elem.scrollLeft = view.xScroll; elem.scrollTop = view.yScroll; }, 0);
    listen(elem, 'click', function () { expandOrContract(elem); });
    listen(elem, 'scroll', function (event) { getScrollPos(elem); });
    let container = codeContainer(elem, shortName(card));
    container.id = card.uid;
    return container;
}
function codeContainer(codeDiv, title) {
    const containerDiv = document.createElement('div');
    containerDiv.className = 'code-container';
    // Create the title div
    const titleDiv = document.createElement('div');
    titleDiv.className = 'code-title';
    titleDiv.textContent = title;
    // Append the title and the code div to the container
    containerDiv.appendChild(titleDiv);
    containerDiv.appendChild(codeDiv);
    return containerDiv;
}
function shortName(card) {
    let result = "";
    if (card.parent != "null") {
        result += findCard(card.parent).name + ".";
    }
    result += card.name;
    if (card.kind == "method" || card.kind == "function")
        result += "()";
    return result;
}
function highlightLink(linkDiv, highlight) {
    if (highlight)
        linkDiv.className = "tag-highlight";
    else
        linkDiv.className = "tag";
}
function listen(elem, type, func) {
    elem.addEventListener(type, (event) => __awaiter(this, void 0, void 0, function* () {
        //console.log(`${type}: ${elem.id}`);
        yield func(event); // Assuming func is synchronous. If it's async, use await func(event);
        event.stopPropagation();
        debouncedSaveAll();
    }));
}
function expandOrContract(elem) {
    let div = elem.parentElement;
    let view = s_graphView.userObj(div);
    if (view.state == CardViewState.Compact) {
        elem.classList.add("code-expanded");
        view.state = CardViewState.Fullsize;
    }
    else if (view.state == CardViewState.Fullsize) {
        elem.classList.remove("code-expanded");
        view.state = CardViewState.Compact;
        elem.scrollLeft = view.xScroll;
        elem.scrollTop = view.yScroll;
    }
    s_graphView.emphasize(div, elem.classList.contains("code-expanded"));
    s_graphView.attention(div);
}
function getScrollPos(elem) {
    let div = elem.parentElement;
    let view = s_graphView.userObj(div);
    if (view.state == CardViewState.Compact) {
        view.xScroll = div.scrollLeft;
        view.yScroll = div.scrollTop;
    }
}
const debouncedSaveAll = debounce(() => { saveAll(); }, 300);
function saveAll() {
    return __awaiter(this, void 0, void 0, function* () {
        //console.log("saveAll");
        const json = s_graphView.json();
        yield save(json, "sessions/test.json");
    });
}
function save(json, path) {
    return __awaiter(this, void 0, void 0, function* () {
        yield remote("@firefly.save", { path: "sessions/test.json", obj: json });
    });
}
function load(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield remote("@firefly.load", { path: "sessions/test.json" });
    });
}
// link button pressed
function onLinkButtonPress(button) {
    const id = button.id.slice("linkto_".length);
    const linkIDs = id.split("__");
    for (const linkID of linkIDs) {
        openOrCloseCard(linkID, button);
    }
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
    let linkID = "";
    let parentID = "";
    if (button) {
        linkID = button.id;
        let parent = s_graphView.findDivContainingLink(button);
        if (parent)
            parentID = parent.id;
    }
    s_graphView.reopen(uid, linkID, parentID, new CardView(CardViewState.Compact));
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
