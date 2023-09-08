// ᕦ(ツ)ᕤ
// firefly.ts
// author: asnaroo (with a little help from GPT4)

import {element} from "./util.js";
import {scrollToView} from "./util.js";
import {debounce} from "./util.js";
import {remote} from "./util.js";
import {rect} from "./util.js";
import {Graph} from "./graph.js";

window.onload = () => { main(); };

const s_useLocalFiles = false;              // change this to true to enable local file access
let dirHandle: any | null = null;
var s_allCards: Card[];
let s_cardsByUid: Map<string, Card> = new Map();
var s_graph : Graph;
let s_mainIcon = "icon-search";
let s_mainOption = "search";
let s_searchQuery = "";
let s_eventLog: SerialisedEvent[] = [];
let s_iFrame = 0;
let s_playMode = "record";          // or "replay"
let s_iEventReplay = 0;
const s_mainID = "ts_firefly_firefly_function_main";
var s_mousePointer : HTMLElement | null;

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
    logo();
    busyIcon();
    graph();
    keyboard();
    scroll();
    mouse();
}

function mouse() {
    document.addEventListener('mousemove', (event) => {
        if (s_playMode == "record") {
            logEvent(event, document.body);
        }
    });
}

function logo() {
    const logo = document.getElementById('logo_etc') as HTMLElement;
    logo.style.left = `${(window.innerWidth - logo.offsetWidth)/2}px`;
    logo.style.top = `${(window.innerHeight/2)-40}px`;
    logo.style.transition = `top 0.25s`;
}

function busyIcon() {
    const logo = document.getElementById('logo_etc') as HTMLElement;
    const busy = element(`<i class="icon-arrows-cw rotating" id="busy-icon"></i>`);
    logo.append(busy);
}

function removeBusyIcon() {
    const busyIcon = document.getElementById('busy-icon') as HTMLElement;
    if (busyIcon) busyIcon.remove();
}

function graph() {
    const container = document.getElementById('container') as HTMLElement;
    s_graph = new Graph(container);
}

function eventLoop() {
    updateReplay();
    s_graph.update();
    moveLogo();
    updateDetailTags();
    requestAnimationFrame(eventLoop);
    s_iFrame ++;
}

function moveLogo() {
    let xScroll = window.scrollX;
    let logo = document.getElementById("logo_etc")!;
    let [yMin, yMax] = s_graph.yRange(xScroll + rect(logo).width() + 50);
    if (yMin && yMax) {
        logo.style.top = `${window.innerHeight -  66}px`;
    } else {
        logo.style.top = `${(window.innerHeight/2)-40}px`;
    }
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
            console.log("loading eventlog");
            s_eventLog = await load("eventlog/eventlog.json");
            console.log(`${s_eventLog.length} events`);
            s_mousePointer = element(`<i class="icon-up-circled" style="position: absolute;"></i>`);
            document.body.append(s_mousePointer);
        } else if (s_playMode == "record") {
            s_eventLog = [];
            startRecordingEvents();
        }
    }
    s_searchQuery = json.ui.search;
}

async function startRecordingEvents() {
    await remote("@firefly.startEventRecording", {});
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
    console.log("searchFor", query);
    const results = await search(s_searchQuery);
    if (results) {
        showSearchResults(results);
    } else {
        clearSearchResults();
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

async function keyboard() {
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
    console.log("stop eventlog; next run will replay");
    s_playMode = "replay";
    s_iEventReplay = s_eventLog.length; 
    saveAll();
    remote("@firefly.stopRecording", { events: s_eventLog });
}

function stopPlayback() {
    console.log("end of event playback");
    s_iEventReplay = s_eventLog.length;
    if (s_mousePointer) {
        s_mousePointer.remove();
    }
}

async function setRecordMode() {
    console.log("next run will record");
    s_playMode = "record";    
    saveAll();
    if (s_mousePointer) {
        s_mousePointer.remove();
    }
}

async function scroll() {
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
}

async function onCommandKey() {
    let searchField = document.getElementById("search-field")!;
    clearSearchResults();
    searchField.innerText = "";
    searchField.focus();
}

function showSearchResults(results: any) {
    clearSearchResults();
    let searchResultsDiv = document.getElementById("search-results")!;
    const array = results.results;
    for(const item of array) {
        const ids : string[] = item.value; // NEXT
        for(let id of ids) {
            const card = findCard(id);
            if (card) {
                let name = shortName(card);
                if (card.kind == "function" || card.kind == "method" || card.kind == "class") {
                    let searchResultDiv = element(`<div class="search-result" id="search_result_${name}">${name}</div>`);
                    listen(searchResultDiv, 'click', () => { jumpToCard(card)});
                    searchResultsDiv.append(searchResultDiv);
                    addDetailTag(searchResultDiv, `${card.module}.${card.language}`);
                }
            }
        }
    }
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
    console.log("jumpTo", shortName(card));
    let info = new CardView(CardViewState.Compact);
    let div = cardToHTML(card, info);
    s_graph.clear();        // for now
    s_graph.node(div, info);
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

function setCursorToEnd(contentEditableElem: HTMLElement) {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(contentEditableElem);
    range.collapse(false); // Collapse the range to the end point. false means collapse to end rather than the start
    sel?.removeAllRanges();
    sel?.addRange(range);
    contentEditableElem.focus();
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
        for(const dep of card.dependsOn) {
            // add text-node going from (iChar) to (dep.iChar)
            if (dep.iChar > iChar) {
                elem.appendChild(document.createTextNode(text.slice(iChar, dep.iChar)));
            }
            // add span containing the link
            const link = text.slice(dep.iChar, dep.jChar);
            let linkId = `linkto__${iLink}__` + dep.targets[0];
            iLink++;
            for(let i = 1; i < dep.targets.length; i++) {
                linkId += "__" + dep.targets[i];
            }
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
    if (view.minimised) {
        elem.style.display = "none";
    }
    return container;
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

    // close button (eventually multiple)
    if (title != "main()") { // todo: better way of finding the root node
        let closeButton = element(`<i class="icon-cancel"></i>`)!;
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

function onTitleBarClick(containerDiv: HTMLElement, codeDiv: HTMLElement) {
    const view = s_graph.userInfo(containerDiv)! as CardView;
    view.minimised = !(view.minimised);
    setViewStyle(containerDiv, view);
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
}

function onMouseOverTitle(titleDiv: HTMLElement, buttonDiv: HTMLElement, entering: boolean) {
    if (entering) {
        buttonDiv.style.visibility = "visible";
    } else {
        buttonDiv.style.visibility = "hidden";
    }
}

function onCloseButtonClick(div: HTMLElement) {
    console.log("onCloseButton");
    /*
    s_graph.close(div);
    */
}

function shortName(card: Card) : string {
    let result: string = "";
    if (card.parent != "null") { result += findCard(card.parent)!.name + "."; }
    result += card.name;
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
            logEvent(event, elem);
        }
        await func(event); 
        event.stopPropagation();
        if (s_playMode == "record") {
            debouncedSaveAll();
        }
    });
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
    while(s_iEventReplay < s_eventLog.length &&
        s_iFrame >= s_eventLog[s_iEventReplay].iFrame) {
        issueEvent(s_eventLog[s_iEventReplay]);
        s_iEventReplay++;
    }
}

function issueEvent(sev: SerialisedEvent) {
    if (sev.eventType != 'mousemove') {
        //console.log(`frame ${s_iFrame}: ${sev.type}.${sev.eventType}`);
    }
    if (sev.target == "") {
        console.log("WARNING: recorded event has no target");
        return;
    }
    if (sev.target == "window" && sev.type == "scroll") {
        window.scrollTo(sev.data.xScroll, sev.data.yScroll);
        return;
    }
    const target = document.getElementById(sev.target);
    if (!target) {
        console.log(`WARNING: Element with ID ${sev.target} not found.`);
        return;
    }
    let event: Event;
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
            s_mousePointer!.style.zIndex = `1000`;
            s_mousePointer!.style.transform = `rotate(-45deg)`;
            s_mousePointer!.style.left = `${sev.data.pageX - window.scrollX}px`;
            s_mousePointer!.style.top = `${sev.data.pageY - window.scrollY}px`;
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
            return;  // Since we've manually set the scroll, we don't need to dispatch an event
            break;

        case "input":
            target.innerText = sev.data.value;
            setCursorToEnd(target);
            event = new InputEvent(sev.eventType, {
                bubbles: true,
                cancelable: true});
            break;

        default:
            console.error(`Unknown event type: ${sev.type}`);
            return;
    }
    (event as any).synthetic = true;
    target.dispatchEvent(event);
}

interface SerialisedEvent {
    iFrame: number;  // s_iFrame when event was generated
    type: string; // "mouse", "keyboard", etc.
    eventType: string; // "click", "keydown", etc.
    target: string; // id of element that generated this
    data: any; // Data specific to the event type
}

function logEvent(event: Event, elem: HTMLElement) {
    let obj = serialiseEvent(event, elem);
    if (!obj) {
        console.log("failed to serialise event");
        return;
    }
    s_eventLog.push(obj);
}

function serialiseEvent(event: Event, target: HTMLElement): SerialisedEvent | null {
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
    } else if (event instanceof KeyboardEvent) {
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
    } else if (event.type === "scroll") {
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
    } else if (event instanceof InputEvent) {
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
    console.log("event type", typeof(event));
    return null;
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
}

function getScrollPos(elem: HTMLElement) {
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

const debouncedSaveAll = debounce(() => { saveAll() }, 300);

async function saveAll() {
    console.log("saveAll");
    const uiJson = { playMode: s_playMode, search: s_searchQuery };
    const sessionJson = { ui: uiJson };
    save(sessionJson, "sessions/test.json");
    if (s_playMode == "record") {
        saveEventLog();
    }
}

async function save(json: any, path: string) {
    await remote("@firefly.save", { path: path, obj: json });
}

async function saveEventLog() {
    await remote("@firefly.saveEventLog", { events: s_eventLog });
    s_eventLog = [];
}

async function load(path: string) : Promise<any> {
    return await remote("@firefly.load", { path: path});
}

// link button pressed
function onLinkButtonPress(button: HTMLElement) {
    const linkIDs = button.id.split("__"); // linkto__number__link1__link2__ etc.
    let cards: Card[] = [];
    for(let i = 2; i < linkIDs.length; i++) {
        const cardUid = linkIDs[i];
        const card = findCard(cardUid);
        if (card) cards.push(card);
    }
    
    let highlighted = button.classList.contains("tag-highlight");
    if (highlighted) {
        for(let c of cards) { closeCardIfExists(c.uid); }
        highlightLink(button, false);
    } else {
        for(let c of cards) { openCard(c.uid, button); }
        highlightLink(button, true);
    }
}

// closes card if it's open
function closeCardIfExists(uid: string) {
    console.log("closeCardIfExists");
    /*
    let existing = s_graph.find(uid);
    if (existing) {
        closeCard(existing);
    }
    */
}

// opens a card, optionally connected to a button element
function openCard(uid: string, button: HTMLElement | null, minimised: boolean=false) {
    console.log("openCard");
    let card = findCard(uid);
    if (!card) return;
    let view = new CardView(CardViewState.Compact);
    let div = cardToHTML(card, view);
    s_graph.node(div, view);
    if (button) {
        s_graph.edge(button, div);
    }
}

// closes a card
function closeCard(cardDiv: HTMLElement) {
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
function openCardWithParent(card: Card, parent: Card, minimised: boolean=false) {
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