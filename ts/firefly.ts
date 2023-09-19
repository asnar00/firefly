// ᕦ(ツ)ᕤ
// firefly.ts
// author: asnaroo (with a little help from GPT4)

import {element} from "./util.js";
import {scrollToViewRect} from "./util.js";
import {Rect} from "./util.js";
import {debounce} from "./util.js";
import {remote} from "./util.js";
import {rect} from "./util.js";
import {Graph} from "./graph.js";
import {EventLog} from "./events.js";

window.onload = () => { main(); };

const s_useLocalFiles = false;              // change this to true to enable local file access
let dirHandle: any | null = null;
var s_allCards: Card[];
let s_cardsByUid: Map<string, Card> = new Map();
var s_graph : Graph;
let s_mainIcon = "icon-search";
let s_mainOption = "search";
let s_searchQuery = "";
const s_mainID = "ts_firefly_firefly_function_main";
let s_playMode: string = "record";
let s_eventLog: EventLog = new EventLog();

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
    targets: string[] = [];             // card uids we link to
};

class Card {
    uid: string = "";                   // uid; something like lang_module_kind_name, but maybe other decorators too
    language: string = "";              // language shortname of original code
    module: string = "";                // module: eg. firefly or graphview
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
    parent: string = "";                // if we're a method or property, points to parent
    rankFromBottom: number = 0;         // 1 means depends on nothing; x means depends on things with rank < x
    rankFromTop: number = 0;            // 1 means nothing calls this; x means called by things with rank < x

}

enum CardViewState {
    Compact,
    Fullsize,
    Editing
}

class CardView {
    minimised: boolean = false;                         // if true, title bar only
    state: CardViewState = CardViewState.Compact;       // state of code viewer
    xScroll: number =0;
    yScroll: number =0;
    constructor(state: CardViewState, minimised: boolean=false) {
        this.state = state;
        this.minimised = minimised;
    }
}

async function main() {
    console.log("firefly ᕦ(ツ)ᕤ");
    await run();
}

async function run() {
    await init();
    await loadCards();
    removeBusyIcon();
    await animateLogoToLeft();
    await openSession();
    searchBox();
    eventLoop();
}

async function init() {
    initLogo();
    initBusyIcon();
    initGraph();
    initKeyboard();
    initMouse();
}

function initMouse() {
    // nothing atm
}

function initLogo() {
    const logo = document.getElementById('logo_etc') as HTMLElement;
    logo.style.left = `${(window.innerWidth - logo.offsetWidth)/2}px`;
    logo.style.top = `${(window.innerHeight/2)-40}px`;
    logo.style.transition = `top 0.25s`;
}

function initBusyIcon() {
    const logo = document.getElementById('logo_etc') as HTMLElement;
    const busy = element(`<i class="icon-arrows-cw rotating" id="busy-icon"></i>`);
    logo.append(busy);
}

function removeBusyIcon() {
    const busyIcon = document.getElementById('busy-icon') as HTMLElement;
    if (busyIcon) busyIcon.remove();
}

function initGraph() {
    const container = document.getElementById('container') as HTMLElement;
    s_graph = new Graph(container);
}

function eventLoop() {
    s_eventLog.update();
    s_graph.update();
    updateDetailTags();
    requestAnimationFrame(eventLoop);
}

async function loadCards() {
    console.log("loadCards");
    if (s_useLocalFiles) {
        await importLocalFolder();
    } 
    const jsonObj = await openRepository("asnar00", "firefly");
    s_allCards = jsonObj.cards as Card[];
    for(const card of s_allCards) {
        s_cardsByUid.set(card.uid, card);
    }
    console.log("nCards:", s_allCards.length);
}

async function openSession() {
    console.log("openSession");
    let json = await load("sessions/test.json");
    if (json.error) {
        console.log("ERROR:", json.error);
        return;
    }
    if (json.ui.playMode) {
        s_playMode = json.ui.playMode;
        console.log(s_playMode);
        if (s_playMode == "replay") {
            say("replaying eventlog");
            await s_eventLog.replay("eventlog/eventlog.json");
        } else if (s_playMode == "record") {
            say("recording eventlog");
            await s_eventLog.record();
        }
    }
    s_searchQuery = json.ui.search;
}

function searchBox() {
    const searchFieldHTML = `<div class="search-field" id="search-field" contenteditable="true" spellcheck="false"></div>`;
    const iconHTML = `<i class="${s_mainIcon}" style="padding-top: 6px;" id="search-button"></i>`;
    const icon2HTML = `<i class="icon-right-big" style="padding-top: 6px; padding-right:3px"></i>`;
    const searchResultsHTML = `<div class="search-results" id="search-results"></div>`;
    const searchDivHTML = `<div class="search-box" id="search-box">${iconHTML}${searchFieldHTML}${icon2HTML}${searchResultsHTML}</div>`;
    let searchDiv = element(searchDivHTML);
    document.body.append(searchDiv);
    let searchField = document.getElementById("search-field")!;
    listen(searchField, 'keydown', async (event : KeyboardEvent) => {
        if (event.key == 'Enter') { event.preventDefault(); }
    });
    listen(searchField, 'input', async (event : InputEvent) => {
        updateSearch(searchField);
    });
    let searchButton = document.getElementById("search-button")!;
    searchButton.style.cursor = 'pointer';
    listen(searchButton, 'click', searchOptions);
    if (s_searchQuery != "") {
        searchField.innerText = s_searchQuery;
        searchFor(s_searchQuery);
    }
}

async function updateSearch(searchField: HTMLElement) {
    searchField.style.width = '128px';
    if (searchField.scrollWidth < 512) {
        searchField.style.width = `${searchField.scrollWidth}px`;
    } else {
        searchField.style.width = '512px';
    }
    setTimeout(async () => {
        s_searchQuery = searchField!.innerText;
        searchFor(s_searchQuery);
    }, 0);
}

async function searchFor(query: string) {
    const results = await search(s_searchQuery);
    clearSearchResults();
    if (results) {
        showSearchResults(results);
    }
}

function searchOptions() {
    console.log("searchOptions");
    let palette = element(`<div class="icon-palette"></div>`);
    let iconNames = [ "icon-search", "icon-wrench", "icon-right-open", "icon-user-plus", "icon-cog", "icon-logout"];
    let optionNames = ["search", "edit-code", "execute-code", "collaborate", "settings", "logout"];
    for(let i=0; i < iconNames.length; i++) {
        const iconName = iconNames[i];
        const optionName = optionNames[i];
        let icon = element(`<i class="${iconName}" id="option-${optionName}" style="margin-left: 4px; margin-right: 4px;"></i>`)!;
        icon.style.cursor = "pointer";
        palette.appendChild(icon);
        listen(icon, 'click', () => { palette.remove(); changeSearchOption(optionName, iconName); });
    }
    document.body.append(palette);
    palette.style.top = `${window.innerHeight -  64}px`;
}

function changeSearchOption(optionName: string, iconName: string) {
    console.log("changeSearchOption", optionName, iconName);
    s_mainIcon = iconName;
    s_mainOption = optionName;
    let searchDiv = document.getElementById("search-box")!;
    searchDiv.remove();
    searchBox();
}

async function initKeyboard() {
    listen(document.body, 'keydown', async (event: KeyboardEvent) => {
        if (event.metaKey) {
            if(event.key == 'f') {
                event.preventDefault();
                onCommandKey();
            } else if (event.key== '.') {
                event.preventDefault();
                let synthetic = (event as any).synthetic;
                if (s_playMode == "record" && synthetic===undefined) {
                    stopRecording();
                } else if (s_playMode == "replay") {
                    if (synthetic===undefined) {
                        setRecordMode();
                    } else {
                        stopPlayback();
                    }
                }
            }
        }
    });
}

async function stopRecording() {
    say("stop eventlog; next run will replay");
    s_playMode = "replay";
    s_eventLog.stop();
    saveAll();
}

function stopPlayback() {
    say("end of event playback");
    s_eventLog.stop();
}

async function setRecordMode() {
    say("next run will record");
    s_playMode = "record";    
    saveAll();
}

async function onCommandKey() {
    let searchField = document.getElementById("search-field")!;
    clearSearchResults();
    searchField.innerText = "";
    searchField.focus();
}

function showSearchResults(results: any) {
    let searchResultsDiv = document.getElementById("search-results")!;
    const array = results.results;
    for(const item of array) {
        const ids : string[] = item.value; // NEXT
        for(let id of ids) {
            const card = findCard(id);
            if (card) {
                let name = shortName(card);
                if (card.kind == "function" || card.kind == "method" || card.kind == "class") {
                    let searchResultDiv = element(`<div class="search-result" id="search_result_${card.uid}">${name}</div>`);
                    listen(searchResultDiv, 'click', () => { jumpToCard(card)});
                    searchResultsDiv.append(searchResultDiv);
                    addDetailTag(searchResultDiv, `${card.module}.${card.language}`);
                }
            }
        }
    }
}

function say(message: string, timeSec: number = 2) {
    console.log(message);
    let div = element(`<div class="speech-bubble">${message}</div>`);
    document.body.appendChild(div);
    let logo = document.getElementById('logo_etc')!;
    setTimeout(() => { 
        let r = rect(logo);
        div.style.left = `${r.left + 13}px`;
        div.style.top = `${r.top - div.clientHeight - 16}px`;
    }, 0);
    setTimeout(() => {
        div.remove();
    }, timeSec*1000);
}

class DetailTag {
    div: HTMLElement;       // track this
    msg: string;            // display
    detailsDiv: HTMLElement;
    constructor(div: HTMLElement, msg: string) { 
        this.div = div; this.msg = msg; 
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
        if (i >= 0) { s_detailTags.splice(i, 1); }
    }
}

var s_detailTags : DetailTag[] = [];

function addDetailTag(div: HTMLElement, message: string) {
    let tag = new DetailTag(div, message);
}

function updateDetailTags() {
    for (let tag of s_detailTags) { 
        tag.update(); 
    }
}

function onClose(div: HTMLElement, func: Function) {
    const parentElement = s_graph.topLevelDiv(div);
    if (!parentElement) return;
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.removedNodes) {
                mutation.removedNodes.forEach(function(node) {
                    if (node as HTMLElement === div) {
                        observer.disconnect();
                        func();
                    }
                });
            }
        });
    });
    observer.observe(parentElement, { childList: true });
}

function jumpToCard(card: Card) {
    console.log("jumpToCard");
    let info = new CardView(CardViewState.Compact);
    let div = cardToHTML(card, info);
    s_graph.clear();        // for now
    s_graph.node(div, info);
    document.title = superShortName(card);
    openCallees(card);
    openCallers(card);
}

function openCallees(card: Card) {
    const div = s_graph.findDiv(card.uid);
    if (!div) return;
    const codeDiv = div.children[0].children[1];    // TODO: do better :-)
    // open all cards we call, minimised
    for(let iDep=0; iDep < card.dependsOn.length; iDep++) {
        const dep = card.dependsOn[iDep];
        let shouldOpen: boolean = false;
        for(let tuid of dep.targets) {
            let target = findCard(tuid);
            if (target && (target.kind=='function' || target.kind=='method')) {
                shouldOpen=true;
            }
        }
        if (shouldOpen) {
            let linkId = linkID(card.uid, dep, iDep);
            let buttons = codeDiv.querySelectorAll(`[id="${linkId}"]`);
            if (buttons.length > 0) {
                openCardsFromButton(buttons[0] as HTMLElement, true);
            }
        }
    }
}

function callees(card: Card) : Card[] {
    let calleeCards: Card[] = [];
    for(let iDep=0; iDep < card.dependsOn.length; iDep++) {
        const dep = card.dependsOn[iDep];
        let shouldOpen: boolean = false;
        for(let tuid of dep.targets) {
            let target = findCard(tuid);
            if (target && (target.kind=='function' || target.kind=='method')) {
                calleeCards.push(target);
            }
        }
    }
    return calleeCards;
}

function openCallers(card: Card) {
    const div = s_graph.findDiv(card.uid);
    if (!div) return;
    for (let caller of callers(card)) {
        openCardTo(caller.uid, div, true);
    }
}

function callers(card: Card) : Card[] {
    let callers: Card[] = [];
    if (card.kind == "function" || card.kind == "method") {
        for(let iDep=0; iDep < card.dependents.length; iDep++) {
            const dep = card.dependents[iDep];
            const caller = dep.targets[0]
            const callerCard = findCard(caller);
            if (callerCard && (callerCard.kind == "function" || callerCard.kind == "method")) {
                callers.push(callerCard);
            }
        }
    }
    return callers;
}

// given (card) and (target), checks card.dependsOn and returns index of dependency that matches
function findDependency(card: Card, target: Card) : number {
    return card.dependsOn.findIndex(d => (d.targets.indexOf(target.uid) >= 0));
}

function clearSearchResults() {
    let searchResultsDiv = document.getElementById("search-results")!;
    if (searchResultsDiv) {
        while (searchResultsDiv.children.length > 0) {
            searchResultsDiv.removeChild(searchResultsDiv.lastChild!);
        }
    }
}

async function search(query: string) : Promise<any> {
    if (query.trim() == "") return null;
    return await remote("@firefly.search", { query: query });
}

async function importLocalFolder() {
    let logo: HTMLButtonElement = document.getElementById('logo_etc') as HTMLButtonElement;
    let button = element(`<button id="openDirectory" class="transparent-button" style="display: inline-block;">
                            <h3 style="display: inline-block;">▶︎</h3></button>`);
    logo.insertBefore(button, logo.children[1]);
    button.addEventListener('click', async () => {
        if (!(window as any).showDirectoryPicker) {
            console.log("showDirectoryPicker is null");
            return;
        }
        dirHandle = await (window as any).showDirectoryPicker!();
        button.remove();
        await importLocalFile();
    });
}

// test-reads the first file and sets text in browser
async function importLocalFile() {
    console.log("importLocalFile");
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
            console.log("NOT IMPLEMENTED YET"); // todo: implement by reading files, horking them over to the server, then following the normal channels
            break;
        }
    }
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

// move the logo to the left of the window
async function animateLogoToLeft(): Promise<void> {
    return new Promise((resolve, reject) => {
        const logo = document.getElementById("logo_etc")!;

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
        logo.style.top = `${window.innerHeight -  66}px`;
    });
}

async function openRepository(owner: string, repoName: string) {
    return await remote("@firefly.openRepository", { owner: owner, repoName: repoName });
}

// finds the card with the given UID, or null if doesn't exist
function findCard(uid: string) : Card | null {
    const card = s_cardsByUid.get(uid);
    if (card === undefined) { return null; }
    return card;
}

// generates HTML for card, but doesn't connect it yet
function cardToHTML(card: Card, view: CardView) : HTMLElement {
    let style = "code"; if (view.state == CardViewState.Fullsize) { style += " code-expanded"; }
    let elem : HTMLElement = element(`<div id="code_${card.uid}" class="${style}" spellcheck="false" contenteditable="false"></div>`);
    let text : string = card.code[0].text;
    if (card.dependsOn.length==0) {
        elem.innerText = text;
    } else {
        let iChar : number = 0;
        let iLink : number = 0
        for(let iDep=0; iDep < card.dependsOn.length; iDep++) {
            const dep = card.dependsOn[iDep];
            // add text-node going from (iChar) to (dep.iChar)
            if (dep.iChar > iChar) {
                elem.appendChild(document.createTextNode(text.slice(iChar, dep.iChar)));
            }
            // add span containing the link
            const link = text.slice(dep.iChar, dep.jChar);
            let linkId = linkID(card.uid, dep, iDep);
            const child = element(`<span class="tag" id="${linkId}">${link}</span>`);
            listen(child, 'click', async function(event: any) {
                onLinkButtonPress(child);
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
    setTimeout(() => { elem.scrollLeft = view.xScroll; elem.scrollTop = view.yScroll;}, 0);
    listen(elem, 'click', function() { expandOrContract(elem); });
    listen(elem, 'scroll', function(event: any) { getScrollPos(elem); });
    let container = codeContainer(card.uid, elem, shortName(card));
    setViewStyle(container, view);
    return container;
}

function linkID(sourceId: string, dep: Dependency, iDep: number) : string {
    let linkId = `from__${sourceId}__linkto__${iDep}__` + dep.targets[0];
    for(let i = 1; i < dep.targets.length; i++) {
        linkId += "__" + dep.targets[i];
    }
    return linkId;
}

function codeContainer(uid: string, codeDiv: HTMLElement, title: string) : HTMLElement {
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

    let card = findCard(containerDiv.id)!;

    // buttons
    let buttons = element(`<div class="buttons" style="visibility:hidden;"></div>`);
    titleDiv.append(buttons);

    if (callers(card).length > 0) {
        let leftButton = element(`<i class="icon-angle-circled-left" "style=filter:invert(1);" id="${containerDiv.id}_left_button"></i>`)!;
        listen(leftButton, 'click', () => { toggleCallers(card); });
        buttons.append(leftButton);
    }

    if (callees(card).length > 0) {
        let rightButton = element(`<i class="icon-angle-circled-right" id="${containerDiv.id}_right_button"></i>`)!;
        listen(rightButton, 'click', () => { toggleCallees(card); });
        buttons.append(rightButton);
    }

    let closeButton = element(`<i class="icon-cancel" id="${containerDiv.id}_close_button"></i>`)!;
    listen(closeButton, 'click', () => { onCloseButtonClick(containerDiv); });
    buttons.append(closeButton);

    listen(titleDiv, 'mouseenter', () => { onMouseOverTitle(titleDiv, buttons, true); });
    listen(titleDiv, 'mouseleave', () => { onMouseOverTitle(titleDiv, buttons, false); });
    

    // Append the title and the code div to the container
    wrapperDiv.appendChild(titleDiv);
    wrapperDiv.appendChild(codeDiv);
    containerDiv.appendChild(wrapperDiv);
    return containerDiv;
}

function toggleCallees(card: Card) {
    let cs = callees(card);
    let openDivs : HTMLElement[] = [];
    for(let c of cs) {
        let div = s_graph.findDiv(c.uid);
        if (div) openDivs.push(div);
    }
    if (openDivs.length > 0) {
        for(let div of openDivs) {
            s_graph.remove(div);
        }
    } else {
        openCallees(card);
        scrollToView(cs);
    }
}

function toggleCallers(card: Card) {
    let cs = callers(card);
    let openDivs : HTMLElement[] = [];
    for(let c of cs) {
        let div = s_graph.findDiv(c.uid);
        if (div) openDivs.push(div);
    }
    if (openDivs.length > 0) {
        for(let div of openDivs) {
            s_graph.remove(div);
        }
    } else {
        openCallers(card); 
        scrollToView(callers(card)); 
    }
}

function scrollToView(cards: Card[]) {
    let divs: HTMLElement[] = [];
    for(let c of cards) divs.push(s_graph.findDiv(c.uid)!); 
    s_graph.scrollToView(divs);
}

function onTitleBarClick(containerDiv: HTMLElement, codeDiv: HTMLElement) {
    const view = s_graph.userInfo(containerDiv)! as CardView;
    view.minimised = !(view.minimised);
    setViewStyle(containerDiv, view);
    s_graph.scrollToView([containerDiv]);
}

function setViewStyle(div: HTMLElement, view: CardView) {
    let codeDiv = div.children[0].children[1] as HTMLElement;  // TODO:  better way
    if (view.minimised) {
        codeDiv.classList.remove("code-expanded");
        codeDiv.classList.add("code-minimised");
    } else {
        codeDiv.classList.remove("code-minimised");
        if (view.state == CardViewState.Compact) {
            codeDiv.classList.remove("code-expanded");
        } else if (view.state == CardViewState.Fullsize) {
            codeDiv.classList.add("code-expanded");
        }
    }
    s_graph.requestArrange();
}

function onMouseOverTitle(titleDiv: HTMLElement, buttonDiv: HTMLElement, entering: boolean) {
    if (entering) {
        buttonDiv.style.visibility = "visible";
    } else {
        buttonDiv.style.visibility = "hidden";
    }
}

function onCloseButtonClick(div: HTMLElement) {
    let buttonDivs = s_graph.findSourceDivs(div);
    closeCard(div.id);
    for(let button of buttonDivs) {
        highlightLink(button, false);
    }
}

function shortName(card: Card) : string {
    let result: string = "";
    if (card.parent != "null") { result += findCard(card.parent)!.name + "."; }
    result += card.name;
    if (card.kind=="method" || card.kind=="function") result += "()";
    return result;
}

function superShortName(card: Card) : string {
    let result = card.name;
    if (card.kind=="method" || card.kind=="function") result += "()";
    return result;
}

function highlightLink(linkDiv: HTMLElement, highlight: boolean) {
    if (highlight) linkDiv.className = "tag-highlight"; else linkDiv.className = "tag";
}

function listen(elem: HTMLElement, type: string, func: Function) {
    elem.addEventListener(type, async (event) => {
        if (elem.id == "") {
            console.log("WARNING: event from element with no ID");
        }
        if (s_playMode == "record") {
            s_eventLog.logEvent(event, elem);
        }
        await func(event); 
        event.stopPropagation();
        if (s_playMode == "record") {
            debouncedSaveAll();
        }
    });
}

function expandOrContract(elem : HTMLElement) {
    let div = s_graph.topLevelDiv(elem)!;
    let view = s_graph.userInfo(div) as CardView;
    if (!view) return;
    if (view.state == CardViewState.Compact) {
        view.state = CardViewState.Fullsize;

    } else if (view.state == CardViewState.Fullsize) {
         view.state = CardViewState.Compact;
         elem.scrollLeft = view.xScroll;
         elem.scrollTop = view.yScroll;
    }
    setViewStyle(div, view);
    s_graph.scrollToView([div]);
}

function getScrollPos(elem: HTMLElement) {
    let view = s_graph.userInfo(elem);
    if (view.state == CardViewState.Compact) {
        view.xScroll = elem.scrollLeft;
        view.yScroll = elem.scrollTop;
    }
}

const debouncedSaveAll = debounce(() => { saveAll() }, 300);

async function saveAll() {
    console.log("saveAll");
    const uiJson = { playMode: s_playMode, search: s_searchQuery };
    const sessionJson = { ui: uiJson };
    save(sessionJson, "sessions/test.json");
    s_eventLog.flush();
}

async function save(json: any, path: string) {
    await remote("@firefly.save", { path: path, obj: json });
}

async function load(path: string) : Promise<any> {
    return await remote("@firefly.load", { path: path});
}

// link button pressed
function onLinkButtonPress(button: HTMLElement) {
    let highlighted = button.classList.contains("tag-highlight");
    if (highlighted) {
        closeCardsFromButton(button);
    } else {
        openCardsFromButton(button);
    }
}

// open all cards pointed to by (button)
function openCardsFromButton(button: HTMLElement, minimised: boolean= false) {
    let cards = getTargetCards(button);
    for(let c of cards) {
        openCardFrom(c.uid, button, minimised);
    }
    highlightLink(button, true);
    let divs : HTMLElement[] = [];
    for(let c of cards) { divs.push(s_graph.findDiv(c.uid)!); }
    s_graph.scrollToView(divs);
}

// close all cards pointed to by (button)
function closeCardsFromButton(button: HTMLElement) {
    let cards = getTargetCards(button);
    for(let c of cards) { closeCard(c.uid); }
    highlightLink(button, false);
}

// given a link button, return all cards it points to
function getTargetCards(button: HTMLElement): Card[] {
    const linkIDs = button.id.split("__"); // from__source__linkto__number__link1__link2__ etc.
    let cards: Card[] = [];
    for(let i = 4; i < linkIDs.length; i++) {
        const cardUid = linkIDs[i];
        const card = findCard(cardUid);
        if (card) cards.push(card);
    }
    return cards;
}

// closes card if it's open
function closeCard(uid: string) {
    let div = s_graph.findDiv(uid);
    if (div) {
        s_graph.remove(div);
    }
}

// opens a card, optionally connected to a button element
function openCardFrom(uid: string, button: HTMLElement | null, minimised: boolean=false) {
    let card = findCard(uid);
    if (!card) return;
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
function openCardTo(uid: string, toDiv: HTMLElement, minimised: boolean=false) {
    let div = s_graph.findDiv(uid);
    let card = findCard(uid);
    if (!card) return;
    let view = new CardView(CardViewState.Compact, minimised);
    if (!div) {
        div = cardToHTML(card, view);
        s_graph.node(div, view);
    }
    let linkButtons = findLinkButtonsTo(toDiv, div);
    for(let button of linkButtons) {
        s_graph.edge(button, toDiv);
        highlightLink(button, true);
    }
}

// returns array of all buttons in "div" that link to "toDiv"
function findLinkButtonsTo(toDiv: HTMLElement, fromDiv: HTMLElement) : HTMLElement[] {
    let buttons = fromDiv.querySelectorAll('span.tag');
    let results : HTMLElement[] = [];
    buttons.forEach((button) => {
        if (button.id.indexOf(toDiv.id) >= 0) {
            results.push(button as HTMLElement);
        }
    });
    return results;
}
