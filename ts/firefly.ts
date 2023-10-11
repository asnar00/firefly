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
import {Vec2} from "./util.js";

window.onload = () => { main(); };

// represents a block of code contained within a card
class CodeBlock {
    text: string = "";                  // actual code text
    language: string;                   // ".ts", ".py", ".cpp", ".hpp", etc.
    iLine: number = 0;                  // 1-based line index in original code file
    constructor(code: string, language: string, iLine: number) {
        this.text = code; this.language = language; this.iLine = iLine;
    }
}

// indicates that a character range (iChar--jChar) links to another card
class Dependency {
    iChar: number = 0;                  // character index in code of start of symbol
    jChar: number = 0;                  // character index in code after symbol
    targets: string[] = [];             // card uids we link to
};

// represents a piece of code (class, method, function, variable)
class Card {
    uid: string = "";                   // uid; something like lang_module_kind_name, but maybe other decorators too
    language: string = "";              // language shortname of original code
    module: string = "";                // module: eg. firefly or graphview
    kind: string = "";                  // "class" or "function" or "other"
    name: string = "";                  // name of function or class being defined
    title: string = "";                 // human-readable title (llm-generated)
    purpose: string = "";               // paragraph-length purpose (llm-generated)
    pseudocode: string = "";            // one line per original code (llm-generated)
    notes: string = "";                 // notes (llm-generated)
    unused: string = "";                // list of unused dependencies (llm-generated)
    code: CodeBlock[] = [];             // actual text from code file
    dependsOn: Dependency[] = [];       // cards we depend on
    dependents: Dependency[] =[];       // cards that depend on us
    children: Card[] =[];               // if we're a class, cards for methods
    parent: string = "";                // if we're a method or property, points to parent
    rankFromBottom: number = 0;         // 1 means depends on nothing; x means depends on things with rank < x
    rankFromTop: number = 0;            // 1 means nothing calls this; x means called by things with rank < x
}

// possible options for the content of the card view
enum CardViewContent {
    Documentation,                      // title, purpose
    Pseudocode,                         // pseudocode
    Code                                // actual code
}

// possible options for the size of a card-view
enum CardViewSize {
    Compact,
    Fullsize
}

// holds all state about an individual card viewer
class CardView {
    minimised: boolean = false;
    content: CardViewContent = CardViewContent.Code;           // content option
    size: CardViewSize = CardViewSize.Compact;                      // size of code viewer
    xScroll: number =0;
    yScroll: number =0;
    constructor(size: CardViewSize, content: CardViewContent=CardViewContent.Code, minimised: boolean = false) {
        this.size = size;
        this.content = content;
        this.minimised = minimised;
    }
    selectBestContent(card: Card) {
        if (this.content == CardViewContent.Documentation && card.title == "") this.content = (this.content + 1) % 3;
        if (this.content == CardViewContent.Pseudocode && card.pseudocode == "") this.content = (this.content + 1) % 3;
    }
}

// holds all state for the application
class App {
    useLocalFiles = false;
    dirHandle: any | null = null;
    allCards: Card[] = [];
    cardsByUid: Map<string, Card> = new Map();
    graph : Graph = new Graph(document.getElementById("container")!);
    mainIcon = "icon-search";
    mainOption = "search";
    searchQuery = "";
    mainID = "ts_firefly_firefly_function_main";
    playMode: string = "record";
    eventLog: EventLog = new EventLog();
    detailTags : DetailTag[] = [];
    status: string= ""
}

let s_app : App = new App();

// does everything client-side
async function main() {
    console.log("firefly ᕦ(ツ)ᕤ");
    run();
}

// set up the client, load everything, run event loop
async function run() {
    await init();
    await loadAll();
    setInterval(showServerStatus, 1000);
    eventLoop();
}

// initialise all the client things
async function init() {
    initLogo();
    initBusyIcon();
    initKeyboard();
}

// load all the data we need from the server
async function loadAll() {
    await loadCards();
    removeBusyIcon();
    await animateLogoToLeft();
    await openSession();
    searchBox();
}

// show server status
async function showServerStatus() {
    return;
    let status = await getServerStatus();
    if (JSON.stringify(status) != JSON.stringify(s_app.status)) {
        s_app.status = status;
        console.log("server:", status);
    }
}

// move the logo to bottom left to signal we are good to go!
function initLogo() {
    const logo = document.getElementById('logo_etc') as HTMLElement;
    logo.style.left = `${(window.innerWidth - logo.offsetWidth)/2}px`;
    logo.style.top = `${(window.innerHeight/2)-40}px`;
    logo.style.transition = `top 0.25s`;
}

// display a rotating busy icon 
function initBusyIcon() {
    console.log("initBusyIcon");
    const logo = document.getElementById('logo_etc') as HTMLElement;
    const busy = element(`<i class="icon-arrows-cw rotating" id="busy-icon"></i>`);
    logo.append(busy);
}

// stop displaying the busy icon
function removeBusyIcon() {
    const busyIcon = document.getElementById('busy-icon') as HTMLElement;
    if (busyIcon) busyIcon.remove();
}

// update state
function eventLoop() {
    s_app.eventLog.update();
    s_app.graph.update();
    updateDetailTags();
    requestAnimationFrame(eventLoop);
}

// load all cards from server, set them up
async function loadCards() {
    console.log("loadCards");
    if (s_app.useLocalFiles) {
        await importLocalFolder();
    } 
    const jsonObj = await openRepository("asnar00", "firefly");
    s_app.allCards = jsonObj.cards as Card[];
    for(const card of s_app.allCards) {
        s_app.cardsByUid.set(card.uid, card);
    }
    console.log("nCards:", s_app.allCards.length);
}

// load session state data, make it so
async function openSession() {
    console.log("openSession");
    let json = await load("sessions/test.json");
    if (json.error) {
        console.log("ERROR:", json.error);
        return;
    }
    if (json.ui.playMode) {
        s_app.playMode = json.ui.playMode;
        console.log(s_app.playMode);
        if (s_app.playMode == "replay") {
            say("replaying");
            await s_app.eventLog.replay("eventlog/eventlog.json");
        } else if (s_app.playMode == "record") {
            say("recording");
            await s_app.eventLog.record();
        }
    }
    s_app.searchQuery = json.ui.search;
}

// create search box div
function searchBox() {
    const searchFieldHTML = `<div class="search-field" id="search-field" contenteditable="true" spellcheck="false"></div>`;
    const iconHTML = `<i class="${s_app.mainIcon}" style="padding-top: 6px;" id="search-button"></i>`;
    const icon2HTML = `<i class="icon-right-big" style="padding-top: 6px; padding-right:3px"></i>`;
    const searchResultsHTML = `<div class="search-results" id="search-results"></div>`;
    const issueIcon = (s_app.playMode=="replay") ? "icon-ok" : "icon-ccw";
    const issueButtonHTML = `<i class="${issueIcon}" style="padding-top: 3px; padding-right:8px; font-size:16px; cursor: pointer;"></i>`;
    let issueButton = element(issueButtonHTML);
    listen(issueButton, 'click', (event: MouseEvent) => {
        toggleEventRecord(event);
    });
    const searchDivHTML = `<div class="search-box" id="search-box">${iconHTML}${searchFieldHTML}${icon2HTML}${searchResultsHTML}</div>`;
    let searchDiv = element(searchDivHTML);
    searchDiv.append(issueButton);
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
    if (s_app.searchQuery != "") {
        searchField.innerText = s_app.searchQuery;
        searchFor(s_app.searchQuery);
    }
}

// do a server-side semantic search on whatever text is in (searchField)
async function updateSearch(searchField: HTMLElement) {
    searchField.style.width = '128px';
    if (searchField.scrollWidth < 512) {
        searchField.style.width = `${searchField.scrollWidth}px`;
    } else {
        searchField.style.width = '512px';
    }
    setTimeout(async () => {
        s_app.searchQuery = searchField!.innerText;
        searchFor(s_app.searchQuery);
    }, 0);
}

// search for some query string, display the results
async function searchFor(query: string) {
    const results = await search(s_app.searchQuery);
    clearSearchResults();
    if (results) {
        showSearchResults(results);
    }
}

// pop-up a menu of possible search types (inoperative)
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

// change the search type (inoperative)
function changeSearchOption(optionName: string, iconName: string) {
    console.log("changeSearchOption", optionName, iconName);
    s_app.mainIcon = iconName;
    s_app.mainOption = optionName;
    let searchDiv = document.getElementById("search-box")!;
    searchDiv.remove();
    searchBox();
}

// set up keyboard events
async function initKeyboard() {
    listen(document.body, 'keydown', async (event: KeyboardEvent) => {
        if (event.metaKey) {
            if(event.key == 'f') {
                event.preventDefault();
                selectSearchField();
            } else if (event.key== '.') {
                event.preventDefault();
                toggleEventRecord(event);
            }
        }
    });
}

// stop event recording
async function stopRecording() {
    say("next run will replay");
    s_app.playMode = "replay";
    s_app.eventLog.stop();
    saveAll();
}

// toggle event recording
function toggleEventRecord(event: Event) {
    let synthetic = (event as any).synthetic;
    if (s_app.playMode == "record" && synthetic===undefined) {
        stopRecording();
    } else if (s_app.playMode == "replay") {
        if (synthetic===undefined) {
            setRecordMode();
        } else {
            stopPlayback();
        }
    }
}


// stop event playback
function stopPlayback() {
    say("end of event playback");
    s_app.eventLog.stop();
}

// indicate that the next run shouldn't be in replay mode
async function setRecordMode() {
    say("next run will record");
    s_app.playMode = "record";    
    saveAll();
}

// focuses on the search field and clears it
async function selectSearchField() {
    let searchField = document.getElementById("search-field")!;
    clearSearchResults();
    searchField.innerText = "";
    searchField.focus();
}

// updates the search results bar with the latest matches
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

// deliver an "alertbox" style message to the user, via our little logo dude character
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

// represents a pop-up detail tag (appears on mouse-over)
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
        s_app.detailTags.push(this);
        this.update();
    }
    update() {
        if (this.detailsDiv.style.visibility == 'visible') {
            let r = rect(this.div);
            this.detailsDiv.style.left = `${r.left + 16}px`;
            this.detailsDiv.style.top = `${r.top - 16}px`;
        }
    }
    remove() {
        this.detailsDiv.remove();
        let i = s_app.detailTags.indexOf(this);
        if (i >= 0) { s_app.detailTags.splice(i, 1); }
    }
}

// adds a detail tag to any HTML element
function addDetailTag(div: HTMLElement, message: string) {
    let tag = new DetailTag(div, message);
}

// call this once per frame
function updateDetailTags() {
    for (let tag of s_app.detailTags) { 
        tag.update(); 
    }
}

// causes (func) to be called when (div) is closed
function onClose(div: HTMLElement, func: Function) {
    const parentElement = s_app.graph.topLevelDiv(div);
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

// opens (card) as the main card, shows all callers and callees
function jumpToCard(card: Card) {
    console.log("jumpToCard");
    let info = new CardView(CardViewSize.Compact);
    let div = cardToHTML(card, info);
    s_app.graph.clear();        // for now
    s_app.graph.node(div, info);
    document.title = superShortName(card);
    openCallees(card);
    openCallers(card);
}

// opens all cards called by (card)
function openCallees(card: Card) {
    const div = s_app.graph.findDiv(card.uid);
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
                openCardsFromButton(buttons[0] as HTMLElement, CardViewContent.Code, true);
            }
        }
    }
}

// returns a list of all cards called by (card) [callable only]
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

// opens all cards that call (card)
function openCallers(card: Card) {
    const div = s_app.graph.findDiv(card.uid);
    if (!div) return;
    for (let caller of callers(card)) {
        openCardTo(caller.uid, div, CardViewContent.Code, true);
    }
}

// returns a list of all cards that call (card) [upstream]
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

// empty out the search result bar
function clearSearchResults() {
    let searchResultsDiv = document.getElementById("search-results")!;
    if (searchResultsDiv) {
        while (searchResultsDiv.children.length > 0) {
            searchResultsDiv.removeChild(searchResultsDiv.lastChild!);
        }
    }
}

// on server, do a semantic search and return list of matches
async function search(query: string) : Promise<any> {
    if (query.trim() == "") return null;
    return await remote("@firefly.search", { query: query });
}

// import all files from within nominated path on user's machine
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

// get server status
async function getServerStatus(): Promise<string> {
    return (await remote("@firefly.status", {})).status;
}

// on server, open github repo, and analyse its contents
async function openRepository(owner: string, project: string) {
    return await remote("@firefly.openRepository", { owner: owner, project: project });
}

// finds the card with the given UID, or null if doesn't exist
function findCard(uid: string) : Card | null {
    const card = s_app.cardsByUid.get(uid);
    if (card === undefined) { return null; }
    return card;
}

// generates HTML for card, but doesn't connect it yet
function cardToHTML(card: Card, view: CardView) : HTMLElement {
    let elem = generateHTML(card, view);
    let container = codeContainer(card.uid, elem, shortName(card));
    setViewStyle(container, view);
    return container;
}

// generates HTML for the card contents
function generateHTML(card: Card, view: CardView) : HTMLElement {
    view.selectBestContent(card);   // super important; default to code when we don't have documentation
    const content = view.content;
    let elem: HTMLElement | null = null;
    if (content == CardViewContent.Documentation) {
        elem= documentationToHTML(card, view);
    } else if (content == CardViewContent.Pseudocode) {
        elem = pseudocodeToHTML(card, view);
    } else if (content == CardViewContent.Code) {
        elem= codeToHTML(card, view);
    }
    if (!elem) {
        console.log("failed to generate HTML!");
        return element(`<div>AIEEEEEE</div>`);
    }
    setTimeout(() => { elem!.scrollLeft = view.xScroll; elem!.scrollTop = view.yScroll;}, 0);
    listen(elem, 'click', function() { expandOrContract(elem!); });
    listen(elem, 'scroll', function(event: any) { getScrollPos(elem!); });
    return elem;
}

function documentationToHTML(card: Card, view: CardView) : HTMLElement {
    let style = "description"; if (view.size == CardViewSize.Fullsize) { style += " code-expanded"; }
    let elem: HTMLElement = element(`<div id="code_${card.uid}" class="${style}" spellcheck="false" contenteditable="false"></div>`);
    let title: HTMLElement = element(`<h3>${card.title}</h3>`);
    let purpose: HTMLElement = element(`<p>${card.purpose}</p>`);
    elem.append(title);
    elem.append(purpose);
    return elem;
}

function pseudocodeToHTML(card: Card, view: CardView) : HTMLElement {
    let style = "code"; if (view.size == CardViewSize.Fullsize) { style += " code-expanded"; }
    let elem: HTMLElement = element(`<div id="code_${card.uid}" class="${style}" spellcheck="false" contenteditable="false"></div>`);
    elem.innerText= card.pseudocode;
    return elem;
}

// converts code content to HTML
function codeToHTML(card: Card, view: CardView) : HTMLElement {
    let style = "code"; if (view.size == CardViewSize.Fullsize) { style += " code-expanded"; }
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
    return elem;
}

// given a source card and one of its dependencies, return a decorated link button ID
function linkID(sourceId: string, dep: Dependency, iDep: number) : string {
    let linkId = `from__${sourceId}__linkto__${iDep}__` + dep.targets[0];
    for(let i = 1; i < dep.targets.length; i++) {
        linkId += "__" + dep.targets[i];
    }
    return linkId;
}

// given a DIV containing card content, wrap it up in a container: title bar, content wrapper, the works
function codeContainer(uid: string, codeDiv: HTMLElement, title: string) : HTMLElement {
    let card = findCard(uid)!;

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
    listen(titleDiv, 'click', () => { toggleMinimise(card, containerDiv, codeDiv); });
    listen(titleDiv, 'mouseenter', () => { toggleTitle(card, containerDiv, titleDiv, true); });
    listen(titleDiv, 'mouseleave', () => { toggleTitle(card, containerDiv, titleDiv, false); });
    let buttons: HTMLElement = createTitleButtons(card, containerDiv, titleDiv);
    buttons.style.visibility = 'hidden';
    setTimeout(() => {updateTitleButtons(card, containerDiv, titleDiv);}, 310);
    
    // Append the title and the code div to the container
    wrapperDiv.appendChild(titleDiv);
    wrapperDiv.appendChild(codeDiv);
    containerDiv.appendChild(wrapperDiv);
    return containerDiv;
}

// toggle visility of all callees of (card) [downstream]
function toggleCallees(card: Card) {
    let fromDiv = s_app.graph.findDiv(card.uid);
    if (!fromDiv) return;
    let cs = callees(card);
    let openDivs : HTMLElement[] = getOpenDivs(cs);
    if (openDivs.length == cs.length) { // all open
        for(let div of openDivs) {
            let linkButtons = findLinkButtonsTo(div, fromDiv);
            for(let b of linkButtons) {
                highlightLink(b, false);
            }
            s_app.graph.remove(div);
        }
    } else {
        openCallees(card);
        scrollToView(cs);
    }
}

// create title buttons and add them to (titleDiv)
function createTitleButtons(card: Card, containerDiv: HTMLElement, titleDiv: HTMLElement) : HTMLElement {
    let buttons = element(`<div class="buttons"></div>`);
    titleDiv.append(buttons);

    let infoButton = element(`<i class="icon-info" "style=filter:invert(1);" id="${containerDiv.id}_info_button"></i>`)!;
    listen(infoButton, "click", () => { selectViewContent(card, containerDiv, CardViewContent.Documentation); });
    let pscodeButton = element(`<i class="icon-share" "style=filter:invert(1);" id="${containerDiv.id}_pscode_button"></i>`)!;
    listen(pscodeButton, "click", () => { selectViewContent(card, containerDiv, CardViewContent.Pseudocode); });
    let codeButton = element(`<i class="icon-code" "style=filter:invert(1);" id="${containerDiv.id}_code_button"></i>`)!;
    listen(codeButton, "click", () => { selectViewContent(card, containerDiv, CardViewContent.Code); });
    buttons.append(infoButton);
    buttons.append(pscodeButton);
    buttons.append(codeButton);
    buttons.append(element(`<div style="width: 16px;"></div>`));

    let cs = callers(card);
    if (cs.length > 0) {
        let divs = getOpenDivs(cs);
        let willClose = (divs.length == cs.length);
        let icon = willClose ? "icon-angle-circled-left" : "icon-angle-left";
        let leftButton = element(`<i class="${icon}" "style=filter:invert(1);" id="${containerDiv.id}_left_button"></i>`)!;
        listen(leftButton, 'click', () => { 
            toggleCallers(card);
            setTimeout(() => {updateTitleButtons(card, containerDiv, titleDiv);}, 300);
        });
        buttons.append(leftButton);
    }
    cs = callees(card);
    if (cs.length > 0) {
        let divs = getOpenDivs(cs);
        let willClose = (divs.length == cs.length);
        let icon = willClose ? "icon-angle-circled-right" : "icon-angle-right";
        let rightButton = element(`<i class="${icon}" id="${containerDiv.id}_right_button"></i>`)!;
        listen(rightButton, 'click', () => { 
            toggleCallees(card); 
            setTimeout(() => {updateTitleButtons(card, containerDiv, titleDiv);}, 300);
        });
        buttons.append(rightButton);
    }

    addDetailTag(titleDiv, `${card.module}.${card.language}`);

    let closeButton = element(`<i class="icon-cancel" id="${containerDiv.id}_close_button"></i>`)!;
    listen(closeButton, 'click', () => { onCloseButtonClick(containerDiv); });
    buttons.append(closeButton);
    return buttons;
}

// toggle visibility of all callers of (card) [upstream]
function toggleCallers(card: Card) {
    let cs = callers(card);
    let openDivs : HTMLElement[] = getOpenDivs(cs);
    if (openDivs.length == cs.length) { // if all are open
        for(let div of openDivs) {
            s_app.graph.remove(div);
        }
    } else {
        openCallers(card); 
        scrollToView(callers(card)); 
    }
}

// returns list of open DIVs for any list of cards
function getOpenDivs(cards: Card[]) : HTMLElement[] {
    let openDivs : HTMLElement[] = [];
    for(let c of cards) {
        let div = s_app.graph.findDiv(c.uid);
        if (div) openDivs.push(div);
    }
    return openDivs;
}

// scroll main window to ensure that all (cards) are in view
function scrollToView(cards: Card[]) {
    let divs: HTMLElement[] = [];
    for(let c of cards) divs.push(s_app.graph.findDiv(c.uid)!); 
    s_app.graph.scrollToView(divs);
}

// toggle view minimised status
function toggleMinimise(card: Card, containerDiv: HTMLElement, codeDiv: HTMLElement) {
    console.log("toggleMinimise");
    const view = s_app.graph.userInfo(containerDiv)! as CardView;
    view.minimised = !(view.minimised);
    setViewContent(containerDiv, view);
    setViewStyle(containerDiv, view);
    s_app.graph.requestArrange();
}

// select view content
function selectViewContent(card: Card, containerDiv: HTMLElement, content: CardViewContent) {
    console.log("selectViewContent");
    const view = s_app.graph.userInfo(containerDiv)! as CardView;
    view.content = content;
    view.selectBestContent(card);
    setViewContent(containerDiv, view);
    setViewStyle(containerDiv, view);
    s_app.graph.requestArrange();
    s_app.graph.scrollToView([containerDiv]);
}

// ensure that (div)'s content matches the settings in (view)
function setViewContent(div: HTMLElement, view: CardView) {
    let id = div.id;
    let card = findCard(id);
    if (!card) return;
    let elem = generateHTML(card, view);
    let wrapperDiv = div.children[0];
    let titleDiv = wrapperDiv.children[0];
    let contentDiv = wrapperDiv.children[1] as HTMLElement;
    contentDiv.remove();
    let newContentDiv = generateHTML(card, view);
    wrapperDiv.append(newContentDiv);
}

// ensure that (div)'s styles etc match the settings in (view)
function setViewStyle(div: HTMLElement, view: CardView) {
    let codeDiv = div.children[0].children[1] as HTMLElement;  // TODO:  better way
    if (view.minimised){
        codeDiv.classList.remove("code-expanded");
        codeDiv.classList.add("code-minimised");
    } else {
        codeDiv.classList.remove("code-minimised");
        if (view.size == CardViewSize.Compact) {
            codeDiv.classList.remove("code-expanded");
        } else if (view.size == CardViewSize.Fullsize) {
            codeDiv.classList.add("code-expanded");
        }
    }
    s_app.graph.requestArrange();
}

// toggle visibility of buttons within a title
function toggleTitle(card: Card, containerDiv: HTMLElement, titleDiv: HTMLElement, entering: boolean) {
    let buttonDiv : HTMLElement | null = titleDiv.querySelector('.buttons')!;
    if (entering) {
        buttonDiv!.style.visibility = 'visible';
    } else {
        buttonDiv!.style.visibility = 'hidden';
    }
}

// update buttons in title bar
function updateTitleButtons(card: Card, containerDiv: HTMLElement, titleDiv: HTMLElement) {
    let buttonDiv : HTMLElement | null = titleDiv.querySelector('.buttons')!;
    let vis = 'visible';
    if (buttonDiv) {
        buttonDiv.remove();
        vis = buttonDiv.style.visibility;
    }
    let newButtonDiv: HTMLElement = createTitleButtons(card, containerDiv, titleDiv);
    newButtonDiv.style.visibility = vis;
}

// close card and de-highlight buttons that link to it
function onCloseButtonClick(div: HTMLElement) {
    let buttonDivs = s_app.graph.findSourceDivs(div);
    closeCard(div.id);
    for(let button of buttonDivs) {
        highlightLink(button, false);
    }
}

// user-readable short name, as concise as possible
function shortName(card: Card) : string {
    let result: string = "";
    if (card.parent != "null") { 
        let parentCard = findCard(card.parent);
        if (!parentCard) {
            console.log("couldn't find parentCard", card.parent);
        } else {
            result += parentCard.name + "."; 
        }
    }
    result += card.name;
    if (card.kind=="method" || card.kind=="function") result += "()";
    return result;
}

// even more concise short-name for a card
function superShortName(card: Card) : string {
    let result = card.name;
    if (card.kind=="method" || card.kind=="function") result += "()";
    return result;
}

// sets highlight style on or off for a link button
function highlightLink(linkDiv: HTMLElement, highlight: boolean) {
    if (highlight) linkDiv.className = "tag-highlight"; else linkDiv.className = "tag";
}

// listen for an event, but enable record/replay and auto-save-all
function listen(elem: HTMLElement, type: string, func: Function) {
    elem.addEventListener(type, async (event) => {
        if (elem.id == "") {
            console.log("WARNING: event from element with no ID");
        }
        if (s_app.playMode == "record") {
            s_app.eventLog.logEvent(event, elem);
        }
        await func(event); 
        event.stopPropagation();
        if (s_app.playMode == "record") {
            debouncedSaveAll();
        }
    });
}

// toggle expanded/contracted state of a card's view
function expandOrContract(elem : HTMLElement) {
    let div = s_app.graph.topLevelDiv(elem)!;
    let view = s_app.graph.userInfo(div) as CardView;
    if (!view) return;
    if (view.size == CardViewSize.Compact) {
        view.size = CardViewSize.Fullsize;
    } else if (view.size == CardViewSize.Fullsize) {
         view.size = CardViewSize.Compact;
         elem.scrollLeft = view.xScroll;
         elem.scrollTop = view.yScroll;
    }
    setViewStyle(div, view);
    s_app.graph.scrollToView([div]);
}

// gets the current scroll offsets for a card view
function getScrollPos(elem: HTMLElement) {
    let view = s_app.graph.userInfo(elem);
    if (view.size == CardViewSize.Compact) {
        view.xScroll = elem.scrollLeft;
        view.yScroll = elem.scrollTop;
    }
}

const debouncedSaveAll = debounce(() => { saveAll() }, 300);

// save all state
async function saveAll() {
    console.log("saveAll");
    const uiJson = { playMode: s_app.playMode, search: s_app.searchQuery };
    const sessionJson = { ui: uiJson };
    save(sessionJson, "sessions/test.json");
    s_app.eventLog.flush();
}

// saves (obj) to (path) on server
async function save(json: any, path: string) {
    await remote("@firefly.save", { path: path, obj: json });
}

// loads (path) from server to create object
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
function openCardsFromButton(button: HTMLElement, content: CardViewContent=CardViewContent.Code, minimised: boolean = false) {
    let cards = getTargetCards(button);
    for(let c of cards) {
        openCardFrom(c.uid, button, content, minimised);
    }
    let divs : HTMLElement[] = [];
    for(let c of cards) { divs.push(s_app.graph.findDiv(c.uid)!); }
    s_app.graph.scrollToView(divs);
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
    let div = s_app.graph.findDiv(uid);
    if (div) {
        s_app.graph.remove(div);
    }
}

// opens a card, optionally connected to a button element
function openCardFrom(uid: string, button: HTMLElement | null, content: CardViewContent=CardViewContent.Code, minimised: boolean = false) {
    let card = findCard(uid);
    if (!card) return;
    let view = new CardView(CardViewSize.Compact, content, minimised);
    let div = s_app.graph.findDiv(uid);
    if (!div) {
        div = cardToHTML(card, view);
        s_app.graph.node(div, view);
    }
    if (button) {
        highlightLink(button, true);
        s_app.graph.edge(button, div);
    }
}

// opens a card that calls to an existing element
function openCardTo(uid: string, toDiv: HTMLElement, content: CardViewContent=CardViewContent.Code, minimised: boolean= false) {
    let div = s_app.graph.findDiv(uid);
    let card = findCard(uid);
    if (!card) return;
    let view = new CardView(CardViewSize.Compact, content, minimised);
    if (!div) {
        div = cardToHTML(card, view);
        s_app.graph.node(div, view);
    }
    let linkButtons = findLinkButtonsTo(toDiv, div);
    for(let button of linkButtons) {
        s_app.graph.edge(button, toDiv);
        highlightLink(button, true);
    }
}

// returns array of all buttons in "div" that link to "toDiv"
function findLinkButtonsTo(toDiv: HTMLElement, fromDiv: HTMLElement) : HTMLElement[] {
    let buttons = Array.from(fromDiv.querySelectorAll('span.tag'));
    buttons.push(... Array.from(fromDiv.querySelectorAll('span.tag-highlight')));
    let results : HTMLElement[] = [];
    for(let button of buttons) {
        if (button.id.indexOf(toDiv.id) >= 0) {
            results.push(button as HTMLElement);
        }
    }
    return results;
}
