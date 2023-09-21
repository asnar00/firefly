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
import { EventLog } from "./events.js";
window.onload = () => { main(); };
const s_useLocalFiles = false; // change this to true to enable local file access
let dirHandle = null;
var s_allCards;
let s_cardsByUid = new Map();
var s_graph;
let s_mainIcon = "icon-search";
let s_mainOption = "search";
let s_searchQuery = "";
const s_mainID = "ts_firefly_firefly_function_main";
let s_playMode = "record";
let s_eventLog = new EventLog();
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
// set up the client, load everything, run event loop
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield init();
        yield loadAll();
        eventLoop();
    });
}
// initialise all the client things
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        initLogo();
        initBusyIcon();
        initGraph();
        initKeyboard();
        initMouse();
    });
}
// load all the data we need from the server
function loadAll() {
    return __awaiter(this, void 0, void 0, function* () {
        yield loadCards();
        removeBusyIcon();
        yield animateLogoToLeft();
        yield openSession();
        searchBox();
    });
}
function initMouse() {
    // nothing atm
}
// move the logo to bottom left to signal we are good to go!
function initLogo() {
    const logo = document.getElementById('logo_etc');
    logo.style.left = `${(window.innerWidth - logo.offsetWidth) / 2}px`;
    logo.style.top = `${(window.innerHeight / 2) - 40}px`;
    logo.style.transition = `top 0.25s`;
}
// display a rotating busy icon 
function initBusyIcon() {
    const logo = document.getElementById('logo_etc');
    const busy = element(`<i class="icon-arrows-cw rotating" id="busy-icon"></i>`);
    logo.append(busy);
}
// stop displaying the busy icon
function removeBusyIcon() {
    const busyIcon = document.getElementById('busy-icon');
    if (busyIcon)
        busyIcon.remove();
}
// initialise the graph manager
function initGraph() {
    const container = document.getElementById('container');
    s_graph = new Graph(container);
}
// update state
function eventLoop() {
    s_eventLog.update();
    s_graph.update();
    updateDetailTags();
    requestAnimationFrame(eventLoop);
}
// load all cards from server, set them up
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
// load session state data, make it so
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
                say("replaying eventlog");
                yield s_eventLog.replay("eventlog/eventlog.json");
            }
            else if (s_playMode == "record") {
                say("recording eventlog");
                yield s_eventLog.record();
            }
        }
        s_searchQuery = json.ui.search;
    });
}
// create search box div
function searchBox() {
    const searchFieldHTML = `<div class="search-field" id="search-field" contenteditable="true" spellcheck="false"></div>`;
    const iconHTML = `<i class="${s_mainIcon}" style="padding-top: 6px;" id="search-button"></i>`;
    const icon2HTML = `<i class="icon-right-big" style="padding-top: 6px; padding-right:3px"></i>`;
    const searchResultsHTML = `<div class="search-results" id="search-results"></div>`;
    const issueIcon = (s_playMode == "replay") ? "icon-ok" : "icon-ccw";
    const issueButtonHTML = `<i class="${issueIcon}" style="padding-top: 3px; padding-right:8px; font-size:16px;"></i>`;
    let issueButton = element(issueButtonHTML);
    listen(issueButton, 'click', (event) => {
        toggleEventRecord(event);
    });
    const searchDivHTML = `<div class="search-box" id="search-box">${iconHTML}${searchFieldHTML}${icon2HTML}${searchResultsHTML}</div>`;
    let searchDiv = element(searchDivHTML);
    searchDiv.append(issueButton);
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
// do a server-side semantic search on whatever text is in (searchField)
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
// search for some query string, display the results
function searchFor(query) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = yield search(s_searchQuery);
        clearSearchResults();
        if (results) {
            showSearchResults(results);
        }
    });
}
// pop-up a menu of possible search types (inoperative)
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
// change the search type (inoperative)
function changeSearchOption(optionName, iconName) {
    console.log("changeSearchOption", optionName, iconName);
    s_mainIcon = iconName;
    s_mainOption = optionName;
    let searchDiv = document.getElementById("search-box");
    searchDiv.remove();
    searchBox();
}
// set up keyboard events
function initKeyboard() {
    return __awaiter(this, void 0, void 0, function* () {
        listen(document.body, 'keydown', (event) => __awaiter(this, void 0, void 0, function* () {
            if (event.metaKey) {
                if (event.key == 'f') {
                    event.preventDefault();
                    selectSearchField();
                }
                else if (event.key == '.') {
                    event.preventDefault();
                    toggleEventRecord(event);
                }
            }
        }));
    });
}
// stop event recording
function stopRecording() {
    return __awaiter(this, void 0, void 0, function* () {
        say("stop eventlog; next run will replay");
        s_playMode = "replay";
        s_eventLog.stop();
        saveAll();
    });
}
// toggle event recording
function toggleEventRecord(event) {
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
// stop event playback
function stopPlayback() {
    say("end of event playback");
    s_eventLog.stop();
}
// indicate that the next run shouldn't be in replay mode
function setRecordMode() {
    return __awaiter(this, void 0, void 0, function* () {
        say("next run will record");
        s_playMode = "record";
        saveAll();
    });
}
// focuses on the search field and clears it
function selectSearchField() {
    return __awaiter(this, void 0, void 0, function* () {
        let searchField = document.getElementById("search-field");
        clearSearchResults();
        searchField.innerText = "";
        searchField.focus();
    });
}
// updates the search results bar with the latest matches
function showSearchResults(results) {
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
function say(message, timeSec = 2) {
    console.log(message);
    let div = element(`<div class="speech-bubble">${message}</div>`);
    document.body.appendChild(div);
    let logo = document.getElementById('logo_etc');
    setTimeout(() => {
        let r = rect(logo);
        div.style.left = `${r.left + 13}px`;
        div.style.top = `${r.top - div.clientHeight - 16}px`;
    }, 0);
    setTimeout(() => {
        div.remove();
    }, timeSec * 1000);
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
            this.detailsDiv.style.top = `${r.top - 16}px`;
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
    console.log("jumpToCard");
    let info = new CardView(CardViewState.Compact);
    let div = cardToHTML(card, info);
    s_graph.clear(); // for now
    s_graph.node(div, info);
    document.title = superShortName(card);
    openCallees(card);
    openCallers(card);
}
// opens all cards called by (card)
function openCallees(card) {
    const div = s_graph.findDiv(card.uid);
    if (!div)
        return;
    const codeDiv = div.children[0].children[1]; // TODO: do better :-)
    // open all cards we call, minimised
    for (let iDep = 0; iDep < card.dependsOn.length; iDep++) {
        const dep = card.dependsOn[iDep];
        let shouldOpen = false;
        for (let tuid of dep.targets) {
            let target = findCard(tuid);
            if (target && (target.kind == 'function' || target.kind == 'method')) {
                shouldOpen = true;
            }
        }
        if (shouldOpen) {
            let linkId = linkID(card.uid, dep, iDep);
            let buttons = codeDiv.querySelectorAll(`[id="${linkId}"]`);
            if (buttons.length > 0) {
                openCardsFromButton(buttons[0], true);
            }
        }
    }
}
// returns a list of all cards called by (card) [callable only]
function callees(card) {
    let calleeCards = [];
    for (let iDep = 0; iDep < card.dependsOn.length; iDep++) {
        const dep = card.dependsOn[iDep];
        let shouldOpen = false;
        for (let tuid of dep.targets) {
            let target = findCard(tuid);
            if (target && (target.kind == 'function' || target.kind == 'method')) {
                calleeCards.push(target);
            }
        }
    }
    return calleeCards;
}
// opens all cards that call (card)
function openCallers(card) {
    const div = s_graph.findDiv(card.uid);
    if (!div)
        return;
    for (let caller of callers(card)) {
        openCardTo(caller.uid, div, true);
    }
}
// returns a list of all cards that call (card) [upstream]
function callers(card) {
    let callers = [];
    if (card.kind == "function" || card.kind == "method") {
        for (let iDep = 0; iDep < card.dependents.length; iDep++) {
            const dep = card.dependents[iDep];
            const caller = dep.targets[0];
            const callerCard = findCard(caller);
            if (callerCard && (callerCard.kind == "function" || callerCard.kind == "method")) {
                callers.push(callerCard);
            }
        }
    }
    return callers;
}
// empty out the search result bar
function clearSearchResults() {
    let searchResultsDiv = document.getElementById("search-results");
    if (searchResultsDiv) {
        while (searchResultsDiv.children.length > 0) {
            searchResultsDiv.removeChild(searchResultsDiv.lastChild);
        }
    }
}
// on server, do a semantic search and return list of matches
function search(query) {
    return __awaiter(this, void 0, void 0, function* () {
        if (query.trim() == "")
            return null;
        return yield remote("@firefly.search", { query: query });
    });
}
// import all files from within nominated path on user's machine
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
            logo.style.top = `${window.innerHeight - 66}px`;
        });
    });
}
// on server, open github repo, and analyse its contents
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
        for (let iDep = 0; iDep < card.dependsOn.length; iDep++) {
            const dep = card.dependsOn[iDep];
            // add text-node going from (iChar) to (dep.iChar)
            if (dep.iChar > iChar) {
                elem.appendChild(document.createTextNode(text.slice(iChar, dep.iChar)));
            }
            // add span containing the link
            const link = text.slice(dep.iChar, dep.jChar);
            let linkId = linkID(card.uid, dep, iDep);
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
    setViewStyle(container, view);
    return container;
}
// given a source card and one of its dependencies, return a decorated link button ID
function linkID(sourceId, dep, iDep) {
    let linkId = `from__${sourceId}__linkto__${iDep}__` + dep.targets[0];
    for (let i = 1; i < dep.targets.length; i++) {
        linkId += "__" + dep.targets[i];
    }
    return linkId;
}
// given a DIV containing card content, wrap it up in a container: title bar, content wrapper, the works
function codeContainer(uid, codeDiv, title) {
    let card = findCard(uid);
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
    listen(titleDiv, 'click', () => { toggleMinimise(containerDiv, codeDiv); });
    listen(titleDiv, 'mouseenter', () => { toggleTitle(card, containerDiv, titleDiv, true); });
    listen(titleDiv, 'mouseleave', () => { toggleTitle(card, containerDiv, titleDiv, false); });
    let buttons = createTitleButtons(card, containerDiv, titleDiv);
    buttons.style.visibility = 'hidden';
    setTimeout(() => { updateTitleButtons(card, containerDiv, titleDiv); }, 310);
    // Append the title and the code div to the container
    wrapperDiv.appendChild(titleDiv);
    wrapperDiv.appendChild(codeDiv);
    containerDiv.appendChild(wrapperDiv);
    return containerDiv;
}
// toggle visility of all callees of (card) [downstream]
function toggleCallees(card) {
    let fromDiv = s_graph.findDiv(card.uid);
    if (!fromDiv)
        return;
    let cs = callees(card);
    let openDivs = getOpenDivs(cs);
    if (openDivs.length == cs.length) { // all open
        for (let div of openDivs) {
            let linkButtons = findLinkButtonsTo(div, fromDiv);
            for (let b of linkButtons) {
                highlightLink(b, false);
            }
            s_graph.remove(div);
        }
    }
    else {
        openCallees(card);
        scrollToView(cs);
    }
}
// create title buttons and add them to (titleDiv)
function createTitleButtons(card, containerDiv, titleDiv) {
    let buttons = element(`<div class="buttons"></div>`);
    titleDiv.append(buttons);
    let cs = callers(card);
    if (cs.length > 0) {
        let divs = getOpenDivs(cs);
        let willClose = (divs.length == cs.length);
        let icon = willClose ? "icon-angle-circled-left" : "icon-angle-left";
        let leftButton = element(`<i class="${icon}" "style=filter:invert(1);" id="${containerDiv.id}_left_button"></i>`);
        listen(leftButton, 'click', () => {
            toggleCallers(card);
            setTimeout(() => { updateTitleButtons(card, containerDiv, titleDiv); }, 300);
        });
        buttons.append(leftButton);
    }
    cs = callees(card);
    if (cs.length > 0) {
        let divs = getOpenDivs(cs);
        let willClose = (divs.length == cs.length);
        let icon = willClose ? "icon-angle-circled-right" : "icon-angle-right";
        let rightButton = element(`<i class="${icon}" id="${containerDiv.id}_right_button"></i>`);
        listen(rightButton, 'click', () => {
            toggleCallees(card);
            setTimeout(() => { updateTitleButtons(card, containerDiv, titleDiv); }, 300);
        });
        buttons.append(rightButton);
    }
    addDetailTag(titleDiv, `${card.module}.${card.language}`);
    let closeButton = element(`<i class="icon-cancel" id="${containerDiv.id}_close_button"></i>`);
    listen(closeButton, 'click', () => { onCloseButtonClick(containerDiv); });
    buttons.append(closeButton);
    return buttons;
}
// toggle visibility of all callers of (card) [upstream]
function toggleCallers(card) {
    let cs = callers(card);
    let openDivs = getOpenDivs(cs);
    if (openDivs.length == cs.length) { // if all are open
        for (let div of openDivs) {
            s_graph.remove(div);
        }
    }
    else {
        openCallers(card);
        scrollToView(callers(card));
    }
}
// returns list of open DIVs for any list of cards
function getOpenDivs(cards) {
    let openDivs = [];
    for (let c of cards) {
        let div = s_graph.findDiv(c.uid);
        if (div)
            openDivs.push(div);
    }
    return openDivs;
}
// scroll main window to ensure that all (cards) are in view
function scrollToView(cards) {
    let divs = [];
    for (let c of cards)
        divs.push(s_graph.findDiv(c.uid));
    s_graph.scrollToView(divs);
}
// toggle card view minimise
function toggleMinimise(containerDiv, codeDiv) {
    const view = s_graph.userInfo(containerDiv);
    view.minimised = !(view.minimised);
    setViewStyle(containerDiv, view);
    s_graph.scrollToView([containerDiv]);
}
// ensure that (div)'s styles etc match the settings in (view)
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
    s_graph.requestArrange();
}
// toggle visibility of buttons within a title
function toggleTitle(card, containerDiv, titleDiv, entering) {
    let buttonDiv = titleDiv.querySelector('.buttons');
    if (entering) {
        buttonDiv.style.visibility = 'visible';
    }
    else {
        buttonDiv.style.visibility = 'hidden';
    }
}
// update buttons in title bar
function updateTitleButtons(card, containerDiv, titleDiv) {
    let buttonDiv = titleDiv.querySelector('.buttons');
    let vis = 'visible';
    if (buttonDiv) {
        buttonDiv.remove();
        vis = buttonDiv.style.visibility;
    }
    let newButtonDiv = createTitleButtons(card, containerDiv, titleDiv);
    newButtonDiv.style.visibility = vis;
}
// close card and de-highlight buttons that link to it
function onCloseButtonClick(div) {
    let buttonDivs = s_graph.findSourceDivs(div);
    closeCard(div.id);
    for (let button of buttonDivs) {
        highlightLink(button, false);
    }
}
// user-readable short name, as concise as possible
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
// even more concise short-name for a card
function superShortName(card) {
    let result = card.name;
    if (card.kind == "method" || card.kind == "function")
        result += "()";
    return result;
}
// sets highlight style on or off for a link button
function highlightLink(linkDiv, highlight) {
    if (highlight)
        linkDiv.className = "tag-highlight";
    else
        linkDiv.className = "tag";
}
// listen for an event, but enable record/replay and auto-save-all
function listen(elem, type, func) {
    elem.addEventListener(type, (event) => __awaiter(this, void 0, void 0, function* () {
        if (elem.id == "") {
            console.log("WARNING: event from element with no ID");
        }
        if (s_playMode == "record") {
            s_eventLog.logEvent(event, elem);
        }
        yield func(event);
        event.stopPropagation();
        if (s_playMode == "record") {
            debouncedSaveAll();
        }
    }));
}
// toggle expanded/contracted state of a card's view
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
    s_graph.scrollToView([div]);
}
// gets the current scroll offsets for a card view
function getScrollPos(elem) {
    let view = s_graph.userInfo(elem);
    if (view.state == CardViewState.Compact) {
        view.xScroll = elem.scrollLeft;
        view.yScroll = elem.scrollTop;
    }
}
const debouncedSaveAll = debounce(() => { saveAll(); }, 300);
// save all state
function saveAll() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("saveAll");
        const uiJson = { playMode: s_playMode, search: s_searchQuery };
        const sessionJson = { ui: uiJson };
        save(sessionJson, "sessions/test.json");
        s_eventLog.flush();
    });
}
// saves (obj) to (path) on server
function save(json, path) {
    return __awaiter(this, void 0, void 0, function* () {
        yield remote("@firefly.save", { path: path, obj: json });
    });
}
// loads (path) from server to create object
function load(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield remote("@firefly.load", { path: path });
    });
}
// link button pressed
function onLinkButtonPress(button) {
    let highlighted = button.classList.contains("tag-highlight");
    if (highlighted) {
        closeCardsFromButton(button);
    }
    else {
        openCardsFromButton(button);
    }
}
// open all cards pointed to by (button)
function openCardsFromButton(button, minimised = false) {
    let cards = getTargetCards(button);
    for (let c of cards) {
        openCardFrom(c.uid, button, minimised);
    }
    highlightLink(button, true);
    let divs = [];
    for (let c of cards) {
        divs.push(s_graph.findDiv(c.uid));
    }
    s_graph.scrollToView(divs);
}
// close all cards pointed to by (button)
function closeCardsFromButton(button) {
    let cards = getTargetCards(button);
    for (let c of cards) {
        closeCard(c.uid);
    }
    highlightLink(button, false);
}
// given a link button, return all cards it points to
function getTargetCards(button) {
    const linkIDs = button.id.split("__"); // from__source__linkto__number__link1__link2__ etc.
    let cards = [];
    for (let i = 4; i < linkIDs.length; i++) {
        const cardUid = linkIDs[i];
        const card = findCard(cardUid);
        if (card)
            cards.push(card);
    }
    return cards;
}
// closes card if it's open
function closeCard(uid) {
    let div = s_graph.findDiv(uid);
    if (div) {
        s_graph.remove(div);
    }
}
// opens a card, optionally connected to a button element
function openCardFrom(uid, button, minimised = false) {
    let card = findCard(uid);
    if (!card)
        return;
    let view = new CardView(CardViewState.Compact, minimised);
    let div = s_graph.findDiv(uid);
    if (!div) {
        div = cardToHTML(card, view);
        s_graph.node(div, view);
    }
    if (button) {
        s_graph.edge(button, div);
    }
}
// opens a card that calls to an existing element
function openCardTo(uid, toDiv, minimised = false) {
    let div = s_graph.findDiv(uid);
    let card = findCard(uid);
    if (!card)
        return;
    let view = new CardView(CardViewState.Compact, minimised);
    if (!div) {
        div = cardToHTML(card, view);
        s_graph.node(div, view);
    }
    let linkButtons = findLinkButtonsTo(toDiv, div);
    for (let button of linkButtons) {
        s_graph.edge(button, toDiv);
        highlightLink(button, true);
    }
}
// returns array of all buttons in "div" that link to "toDiv"
function findLinkButtonsTo(toDiv, fromDiv) {
    let buttons = Array.from(fromDiv.querySelectorAll('span.tag'));
    buttons.push(...Array.from(fromDiv.querySelectorAll('span.tag-highlight')));
    let results = [];
    for (let button of buttons) {
        if (button.id.indexOf(toDiv.id) >= 0) {
            results.push(button);
        }
    }
    return results;
}
