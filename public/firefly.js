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
import { element } from "./util.js";
import { debounce } from "./util.js";
import { remote } from "./util.js";
import { rect } from "./util.js";
import { Graph } from "./graph.js";
window.onload = () => { main(); };
const s_useLocalFiles = false; // change this to true to enable local file access
let dirHandle = null;
var s_allCards;
let s_cardsByUid = new Map();
var s_graph;
let s_mainIcon = "icon-search";
let s_mainOption = "search";
let s_searchQuery = "";
let s_eventLog = [];
let s_iFrame = 0;
let s_playMode = "record"; // or "replay"
let s_iEventReplay = 0;
const s_mainID = "ts_firefly_firefly_function_main";
var s_mousePointer;
let s_nRetries = 0;
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
    CardViewState[CardViewState["Compact"] = 0] = "Compact";
    CardViewState[CardViewState["Fullsize"] = 1] = "Fullsize";
    CardViewState[CardViewState["Editing"] = 2] = "Editing";
})(CardViewState || (CardViewState = {}));
class CardView {
    constructor(state, minimised = false) {
        this.minimised = false; // if true, title bar only
        this.state = CardViewState.Compact; // state of code viewer
        this.xScroll = 0;
        this.yScroll = 0;
        this.state = state;
        this.minimised = minimised;
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
        removeBusyIcon();
        yield animateLogoToLeft();
        yield openSession();
        searchBox();
        eventLoop();
    });
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        logo();
        busyIcon();
        graph();
        keyboard();
        scroll();
        mouse();
    });
}
function mouse() {
    // nothing atm
}
function logo() {
    const logo = document.getElementById('logo_etc');
    logo.style.left = `${(window.innerWidth - logo.offsetWidth) / 2}px`;
    logo.style.top = `${(window.innerHeight / 2) - 40}px`;
    logo.style.transition = `top 0.25s`;
}
function busyIcon() {
    const logo = document.getElementById('logo_etc');
    const busy = element(`<i class="icon-arrows-cw rotating" id="busy-icon"></i>`);
    logo.append(busy);
}
function removeBusyIcon() {
    const busyIcon = document.getElementById('busy-icon');
    if (busyIcon)
        busyIcon.remove();
}
function graph() {
    const container = document.getElementById('container');
    s_graph = new Graph(container);
}
function eventLoop() {
    updateReplay();
    s_graph.update();
    moveLogo();
    updateDetailTags();
    requestAnimationFrame(eventLoop);
    s_iFrame++;
}
function moveLogo() {
    let xScroll = window.scrollX;
    let logo = document.getElementById("logo_etc");
    let [yMin, yMax] = s_graph.yRange(xScroll + rect(logo).width() + 50);
    if (yMin && yMax) {
        logo.style.top = `${window.innerHeight - 66}px`;
    }
    else {
        logo.style.top = `${(window.innerHeight / 2) - 40}px`;
    }
}
function loadCards() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("loadCards");
        if (s_useLocalFiles) {
            yield importLocalFolder();
        }
        const jsonObj = yield openRepository("asnar00", "firefly");
        s_allCards = jsonObj.cards;
        for (const card of s_allCards) {
            s_cardsByUid.set(card.uid, card);
        }
        console.log("nCards:", s_allCards.length);
    });
}
function openSession() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("openSession");
        let json = yield load("sessions/test.json");
        if (json.error) {
            console.log("ERROR:", json.error);
            return;
        }
        if (json.ui.playMode) {
            s_playMode = json.ui.playMode;
            console.log(s_playMode);
            if (s_playMode == "replay") {
                console.log("loading eventlog");
                s_eventLog = yield load("eventlog/eventlog.json");
                console.log(`${s_eventLog.length} events`);
                s_mousePointer = element(`<i class="icon-up-circled" style="position: absolute;"></i>`);
                document.body.append(s_mousePointer);
            }
            else if (s_playMode == "record") {
                s_eventLog = [];
                startRecordingEvents();
            }
        }
        s_searchQuery = json.ui.search;
    });
}
function startRecordingEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        yield remote("@firefly.startEventRecording", {});
    });
}
function openMain() {
    console.log("openMain");
    /*
    openCard(s_mainID, null);
    const mainCard = findCard(s_mainID)!;
    */
}
function searchBox() {
    const searchFieldHTML = `<div class="search-field" id="search-field" contenteditable="true" spellcheck="false"></div>`;
    const iconHTML = `<i class="${s_mainIcon}" style="padding-top: 6px;" id="search-button"></i>`;
    const icon2HTML = `<i class="icon-right-big" style="padding-top: 6px; padding-right:3px"></i>`;
    const searchResultsHTML = `<div class="search-results" id="search-results"></div>`;
    const searchDivHTML = `<div class="search-box" id="search-box">${iconHTML}${searchFieldHTML}${icon2HTML}${searchResultsHTML}</div>`;
    let searchDiv = element(searchDivHTML);
    document.body.append(searchDiv);
    let searchField = document.getElementById("search-field");
    listen(searchField, 'keydown', (event) => __awaiter(this, void 0, void 0, function* () {
        if (event.key == 'Enter') {
            event.preventDefault();
        }
    }));
    listen(searchField, 'input', (event) => __awaiter(this, void 0, void 0, function* () {
        updateSearch(searchField);
    }));
    let searchButton = document.getElementById("search-button");
    searchButton.style.cursor = 'pointer';
    listen(searchButton, 'click', searchOptions);
    if (s_searchQuery != "") {
        searchField.innerText = s_searchQuery;
        searchFor(s_searchQuery);
    }
}
function updateSearch(searchField) {
    return __awaiter(this, void 0, void 0, function* () {
        searchField.style.width = '128px';
        if (searchField.scrollWidth < 512) {
            searchField.style.width = `${searchField.scrollWidth}px`;
        }
        else {
            searchField.style.width = '512px';
        }
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            s_searchQuery = searchField.innerText;
            searchFor(s_searchQuery);
        }), 0);
    });
}
function searchFor(query) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("searchFor", query);
        const results = yield search(s_searchQuery);
        if (results) {
            showSearchResults(results);
        }
        else {
            clearSearchResults();
        }
    });
}
function searchOptions() {
    console.log("searchOptions");
    let palette = element(`<div class="icon-palette"></div>`);
    let iconNames = ["icon-search", "icon-wrench", "icon-right-open", "icon-user-plus", "icon-cog", "icon-logout"];
    let optionNames = ["search", "edit-code", "execute-code", "collaborate", "settings", "logout"];
    for (let i = 0; i < iconNames.length; i++) {
        const iconName = iconNames[i];
        const optionName = optionNames[i];
        let icon = element(`<i class="${iconName}" id="option-${optionName}" style="margin-left: 4px; margin-right: 4px;"></i>`);
        icon.style.cursor = "pointer";
        palette.appendChild(icon);
        listen(icon, 'click', () => { palette.remove(); changeSearchOption(optionName, iconName); });
    }
    document.body.append(palette);
    palette.style.top = `${window.innerHeight - 64}px`;
}
function changeSearchOption(optionName, iconName) {
    console.log("changeSearchOption", optionName, iconName);
    s_mainIcon = iconName;
    s_mainOption = optionName;
    let searchDiv = document.getElementById("search-box");
    searchDiv.remove();
    searchBox();
}
function keyboard() {
    return __awaiter(this, void 0, void 0, function* () {
        listen(document.body, 'keydown', (event) => __awaiter(this, void 0, void 0, function* () {
            if (event.metaKey) {
                if (event.key == 'f') {
                    event.preventDefault();
                    onCommandKey();
                }
                else if (event.key == '.') {
                    event.preventDefault();
                    let synthetic = event.synthetic;
                    if (s_playMode == "record" && synthetic === undefined) {
                        stopRecording();
                    }
                    else if (s_playMode == "replay") {
                        if (synthetic === undefined) {
                            setRecordMode();
                        }
                        else {
                            stopPlayback();
                        }
                    }
                }
            }
        }));
    });
}
function stopRecording() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("stop eventlog; next run will replay");
        s_playMode = "replay";
        s_iEventReplay = s_eventLog.length;
        saveAll();
        remote("@firefly.stopRecording", { events: s_eventLog });
    });
}
function stopPlayback() {
    console.log("end of event playback");
    s_iEventReplay = s_eventLog.length;
    if (s_mousePointer) {
        s_mousePointer.remove();
    }
}
function setRecordMode() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("next run will record");
        s_playMode = "record";
        saveAll();
        if (s_mousePointer) {
            s_mousePointer.remove();
        }
    });
}
function scroll() {
    return __awaiter(this, void 0, void 0, function* () {
        window.addEventListener('scroll', (event) => {
            if (s_playMode == "record") {
                let sev = {
                    iFrame: s_iFrame,
                    type: "scroll",
                    eventType: event.type,
                    target: "window",
                    data: {
                        xScroll: window.scrollX,
                        yScroll: window.scrollY
                    }
                };
                s_eventLog.push(sev);
                debouncedSaveAll();
            }
        });
    });
}
function onCommandKey() {
    return __awaiter(this, void 0, void 0, function* () {
        let searchField = document.getElementById("search-field");
        clearSearchResults();
        searchField.innerText = "";
        searchField.focus();
    });
}
function showSearchResults(results) {
    clearSearchResults();
    let searchResultsDiv = document.getElementById("search-results");
    const array = results.results;
    for (const item of array) {
        const ids = item.value; // NEXT
        for (let id of ids) {
            const card = findCard(id);
            if (card) {
                let name = shortName(card);
                if (card.kind == "function" || card.kind == "method" || card.kind == "class") {
                    let searchResultDiv = element(`<div class="search-result" id="search_result_${card.uid}">${name}</div>`);
                    listen(searchResultDiv, 'click', () => { jumpToCard(card); });
                    searchResultsDiv.append(searchResultDiv);
                    addDetailTag(searchResultDiv, `${card.module}.${card.language}`);
                }
            }
        }
    }
}
class DetailTag {
    constructor(div, msg) {
        this.div = div;
        this.msg = msg;
        this.detailsDiv = element(`<div class="details-tag">${msg}</div>`);
        this.detailsDiv.style.visibility = `hidden`;
        document.body.append(this.detailsDiv);
        listen(div, 'mouseenter', () => { this.detailsDiv.style.visibility = 'visible'; });
        listen(div, 'mouseleave', () => { this.detailsDiv.style.visibility = 'hidden'; });
        onClose(div, () => { this.remove(); });
        s_detailTags.push(this);
        this.update();
    }
    update() {
        if (this.detailsDiv.style.visibility == 'visible') {
            let r = rect(this.div);
            this.detailsDiv.style.left = `${r.left}px`;
            this.detailsDiv.style.top = `${r.top - 32}px`;
        }
    }
    remove() {
        this.detailsDiv.remove();
        let i = s_detailTags.indexOf(this);
        if (i >= 0) {
            s_detailTags.splice(i, 1);
        }
    }
}
var s_detailTags = [];
function addDetailTag(div, message) {
    let tag = new DetailTag(div, message);
}
function updateDetailTags() {
    for (let tag of s_detailTags) {
        tag.update();
    }
}
function onClose(div, func) {
    const parentElement = s_graph.topLevelDiv(div);
    if (!parentElement)
        return;
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.removedNodes) {
                mutation.removedNodes.forEach(function (node) {
                    if (node === div) {
                        observer.disconnect();
                        func();
                    }
                });
            }
        });
    });
    observer.observe(parentElement, { childList: true });
}
function jumpToCard(card) {
    console.log("jumpTo", shortName(card));
    let info = new CardView(CardViewState.Compact);
    let div = cardToHTML(card, info);
    s_graph.clear(); // for now
    s_graph.node(div, info);
}
// given (card) and (target), checks card.dependsOn and returns index of dependency that matches
function findDependency(card, target) {
    return card.dependsOn.findIndex(d => (d.targets.indexOf(target.uid) >= 0));
}
function clearSearchResults() {
    let searchResultsDiv = document.getElementById("search-results");
    if (searchResultsDiv) {
        while (searchResultsDiv.children.length > 0) {
            searchResultsDiv.removeChild(searchResultsDiv.lastChild);
        }
    }
}
function search(query) {
    return __awaiter(this, void 0, void 0, function* () {
        if (query.trim() == "")
            return null;
        return yield remote("@firefly.search", { query: query });
    });
}
function setCursorToEnd(contentEditableElem) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(contentEditableElem);
    range.collapse(false); // Collapse the range to the end point. false means collapse to end rather than the start
    sel === null || sel === void 0 ? void 0 : sel.removeAllRanges();
    sel === null || sel === void 0 ? void 0 : sel.addRange(range);
    contentEditableElem.focus();
}
function importLocalFolder() {
    return __awaiter(this, void 0, void 0, function* () {
        let logo = document.getElementById('logo_etc');
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
// move the logo to the left of the window
function animateLogoToLeft() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const logo = document.getElementById("logo_etc");
            // Set animation properties
            logo.style.animationName = "moveToLeft";
            logo.style.animationDuration = "0.25s";
            logo.style.animationTimingFunction = "ease-in-out";
            logo.style.animationFillMode = "forwards";
            // Attach the animationend event listener
            logo.addEventListener('animationend', function onAnimationEnd() {
                // Remove the event listener to prevent memory leaks
                logo.removeEventListener('animationend', onAnimationEnd);
                resolve();
            });
            // Start the animation
            logo.style.left = "0";
        });
    });
}
function openRepository(owner, repoName) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield remote("@firefly.openRepository", { owner: owner, repoName: repoName });
    });
}
// finds the card with the given UID, or null if doesn't exist
function findCard(uid) {
    const card = s_cardsByUid.get(uid);
    if (card === undefined) {
        return null;
    }
    return card;
}
// generates HTML for card, but doesn't connect it yet
function cardToHTML(card, view) {
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
        let iLink = 0;
        for (const dep of card.dependsOn) {
            // add text-node going from (iChar) to (dep.iChar)
            if (dep.iChar > iChar) {
                elem.appendChild(document.createTextNode(text.slice(iChar, dep.iChar)));
            }
            // add span containing the link
            const link = text.slice(dep.iChar, dep.jChar);
            let linkId = `linkto__${iLink}__` + dep.targets[0];
            iLink++;
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
    let container = codeContainer(card.uid, elem, shortName(card));
    if (view.minimised) {
        elem.style.display = "none";
    }
    return container;
}
function codeContainer(uid, codeDiv, title) {
    let containerDiv = document.createElement('div');
    containerDiv.id = uid;
    containerDiv.className = 'code-container';
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'inner-wrapper';
    // Create the title div
    const titleDiv = document.createElement('div');
    titleDiv.className = 'code-title';
    titleDiv.id = `${containerDiv.id}_title_bar`;
    titleDiv.textContent = title;
    listen(titleDiv, 'click', () => { onTitleBarClick(containerDiv, codeDiv); });
    // close button (eventually multiple)
    if (title != "main()") { // todo: better way of finding the root node
        let closeButton = element(`<i class="icon-cancel"></i>`);
        closeButton.id = `${containerDiv.id}_close_button`;
        closeButton.style.visibility = "hidden";
        titleDiv.append(closeButton);
        listen(titleDiv, 'mouseenter', () => { onMouseOverTitle(titleDiv, closeButton, true); });
        listen(titleDiv, 'mouseleave', () => { onMouseOverTitle(titleDiv, closeButton, false); });
        listen(closeButton, 'click', () => { onCloseButtonClick(containerDiv); });
    }
    // Append the title and the code div to the container
    wrapperDiv.appendChild(titleDiv);
    wrapperDiv.appendChild(codeDiv);
    containerDiv.appendChild(wrapperDiv);
    return containerDiv;
}
function onTitleBarClick(containerDiv, codeDiv) {
    const view = s_graph.userInfo(containerDiv);
    view.minimised = !(view.minimised);
    setViewStyle(containerDiv, view);
}
function setViewStyle(div, view) {
    let codeDiv = div.children[0].children[1]; // TODO:  better way
    if (view.minimised) {
        codeDiv.classList.remove("code-expanded");
        codeDiv.classList.add("code-minimised");
    }
    else {
        codeDiv.classList.remove("code-minimised");
        if (view.state == CardViewState.Compact) {
            codeDiv.classList.remove("code-expanded");
        }
        else if (view.state == CardViewState.Fullsize) {
            codeDiv.classList.add("code-expanded");
        }
    }
}
function onMouseOverTitle(titleDiv, buttonDiv, entering) {
    if (entering) {
        buttonDiv.style.visibility = "visible";
    }
    else {
        buttonDiv.style.visibility = "hidden";
    }
}
function onCloseButtonClick(div) {
    console.log("onCloseButton");
    /*
    s_graph.close(div);
    */
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
        if (elem.id == "") {
            console.log("WARNING: event from element with no ID");
        }
        if (s_playMode == "record") {
            logEvent(event, elem);
        }
        yield func(event);
        event.stopPropagation();
        if (s_playMode == "record") {
            debouncedSaveAll();
        }
    }));
}
function updateReplay() {
    if (s_playMode != "replay" || s_iEventReplay >= s_eventLog.length) {
        if (s_mousePointer) {
            s_mousePointer.remove();
            s_mousePointer = null;
            console.log("end of event playback");
        }
        return;
    }
    // just issue as fast as possible
    if (s_iEventReplay < s_eventLog.length) {
        if (issueEvent(s_eventLog[s_iEventReplay]) == true) {
            s_iEventReplay++;
            s_nRetries = 0;
        }
        else {
            s_nRetries++;
            if (s_nRetries > 100) {
                console.log("playback failed");
                stopPlayback();
            }
        }
    }
}
function issueEvent(sev) {
    if (sev.eventType != 'mousemove') {
        //console.log(`frame ${s_iFrame}: ${sev.type}.${sev.eventType}`);
    }
    if (sev.target == "") {
        console.log("WARNING: recorded event has no target");
        return false;
    }
    if (sev.target == "window" && sev.type == "scroll") {
        window.scrollTo(sev.data.xScroll, sev.data.yScroll);
        return true;
    }
    const target = document.getElementById(sev.target);
    if (!target) {
        console.log(`WARNING: Element with ID ${sev.target} not found.`);
        return false;
    }
    let event;
    switch (sev.type) {
        case "mouse":
            event = new MouseEvent(sev.eventType, {
                bubbles: false,
                cancelable: true,
                view: window,
                button: sev.data.button,
                clientX: sev.data.pageX - window.scrollX,
                clientY: sev.data.pageY - window.scrollY
            });
            s_mousePointer.style.zIndex = `1000`;
            s_mousePointer.style.transform = `rotate(-45deg)`;
            s_mousePointer.style.left = `${sev.data.pageX - window.scrollX}px`;
            s_mousePointer.style.top = `${sev.data.pageY - window.scrollY}px`;
            break;
        case "keyboard":
            event = new KeyboardEvent(sev.eventType, {
                bubbles: true,
                cancelable: true,
                key: sev.data.key,
                metaKey: sev.data.metaKey
            });
            break;
        case "scroll":
            target.scrollLeft = sev.data.xScroll;
            target.scrollTop = sev.data.yScroll;
            return true; // Since we've manually set the scroll, we don't need to dispatch an event
            break;
        case "input":
            target.innerText = sev.data.value;
            setCursorToEnd(target);
            event = new InputEvent(sev.eventType, {
                bubbles: true,
                cancelable: true
            });
            break;
        default:
            console.error(`Unknown event type: ${sev.type}`);
            return false;
    }
    event.synthetic = true;
    target.dispatchEvent(event);
    return true;
}
function logEvent(event, elem) {
    let obj = serialiseEvent(event, elem);
    if (!obj) {
        console.log("failed to serialise event");
        return;
    }
    s_eventLog.push(obj);
}
function serialiseEvent(event, target) {
    if (event instanceof MouseEvent) {
        return {
            iFrame: s_iFrame,
            type: "mouse",
            eventType: event.type,
            target: target.id,
            data: {
                pageX: event.pageX,
                pageY: event.pageY,
                button: event.button
            }
        };
    }
    else if (event instanceof KeyboardEvent) {
        return {
            iFrame: s_iFrame,
            type: "keyboard",
            eventType: event.type,
            target: target.id,
            data: {
                key: event.key,
                metaKey: event.metaKey
            }
        };
    }
    else if (event.type === "scroll") {
        return {
            iFrame: s_iFrame,
            type: "scroll",
            eventType: event.type,
            target: target.id,
            data: {
                xScroll: target.scrollLeft,
                yScroll: target.scrollTop
            }
        };
    }
    else if (event instanceof InputEvent) {
        return {
            iFrame: s_iFrame,
            type: "input",
            eventType: event.type,
            target: target.id,
            data: {
                value: target.innerText
            }
        };
    }
    // Add more event types as needed
    console.log("event type", typeof (event));
    return null;
}
function expandOrContract(elem) {
    let div = s_graph.topLevelDiv(elem);
    let view = s_graph.userInfo(div);
    if (!view)
        return;
    if (view.state == CardViewState.Compact) {
        view.state = CardViewState.Fullsize;
    }
    else if (view.state == CardViewState.Fullsize) {
        view.state = CardViewState.Compact;
        elem.scrollLeft = view.xScroll;
        elem.scrollTop = view.yScroll;
    }
    setViewStyle(div, view);
}
function getScrollPos(elem) {
    console.log("getScrollPos");
    /*
    let div = elem.parentElement!;
    let view = s_graph.userObj(div);
    if (view.state == CardViewState.Compact) {
        view.xScroll = div.scrollLeft;
        view.yScroll = div.scrollTop;
    }
    */
}
const debouncedSaveAll = debounce(() => { saveAll(); }, 300);
function saveAll() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("saveAll");
        const uiJson = { playMode: s_playMode, search: s_searchQuery };
        const sessionJson = { ui: uiJson };
        save(sessionJson, "sessions/test.json");
        if (s_playMode == "record") {
            saveEventLog();
        }
    });
}
function save(json, path) {
    return __awaiter(this, void 0, void 0, function* () {
        yield remote("@firefly.save", { path: path, obj: json });
    });
}
function saveEventLog() {
    return __awaiter(this, void 0, void 0, function* () {
        yield remote("@firefly.saveEventLog", { events: s_eventLog });
        s_eventLog = [];
    });
}
function load(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield remote("@firefly.load", { path: path });
    });
}
// link button pressed
function onLinkButtonPress(button) {
    const linkIDs = button.id.split("__"); // linkto__number__link1__link2__ etc.
    let cards = [];
    for (let i = 2; i < linkIDs.length; i++) {
        const cardUid = linkIDs[i];
        const card = findCard(cardUid);
        if (card)
            cards.push(card);
    }
    let highlighted = button.classList.contains("tag-highlight");
    if (highlighted) {
        for (let c of cards) {
            closeCardIfExists(c.uid);
        }
        highlightLink(button, false);
    }
    else {
        for (let c of cards) {
            openCard(c.uid, button);
        }
        highlightLink(button, true);
    }
}
// closes card if it's open
function closeCardIfExists(uid) {
    console.log("closeCardIfExists");
    /*
    let existing = s_graph.find(uid);
    if (existing) {
        closeCard(existing);
    }
    */
}
// opens a card, optionally connected to a button element
function openCard(uid, button, minimised = false) {
    console.log("openCard");
    let card = findCard(uid);
    if (!card)
        return;
    let view = new CardView(CardViewState.Compact);
    let div = cardToHTML(card, view);
    s_graph.node(div, view);
    if (button) {
        s_graph.edge(button, div);
    }
}
// closes a card
function closeCard(cardDiv) {
    console.log("closeCard");
    /*
    let button = s_graph.findLink(cardDiv);
    if (button) {
        highlightLink(button, false);
    }
    s_graph.close(cardDiv);
    */
}
// opens a card when we don't know the link, but we know the parent
function openCardWithParent(card, parent, minimised = false) {
    console.log("openCardWithParent", shortName(card));
    /*
    // first find the parent card's div; it should be open
    let parentDiv = s_graph.find(parent.uid);
    if (!parentDiv) { console.log("can't find parent!"); return; }
    const linkDivs: NodeListOf<Element> = parentDiv.querySelectorAll(`[id*='${card.uid}']`);
    if (linkDivs.length==0) { console.log("can't find link!"); return; }
    openCard(card.uid, linkDivs[0] as HTMLElement, minimised);
    */
}
