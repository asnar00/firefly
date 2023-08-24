// ᕦ(ツ)ᕤ
// firefly.ts
// author: asnaroo (with a little help from GPT4)

import {GraphView} from "./graphview.js";
import {element} from "./util.js";
import {scrollToView} from "./util.js";
import {debounce} from "./util.js";
import {remote} from "./util.js";
import {rect} from "./util.js";

window.onload = () => { main(); };

const s_useLocalFiles = false;              // change this to true to enable local file access
let dirHandle: any | null = null;
var s_allCards: Card[];
var s_graphView : GraphView;
let s_mainIcon = "icon-search";
let s_mainOption = "search";

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
    SuperCompact,
    Compact,
    Fullsize,
    Editing
}

class CardView {
    state: CardViewState = CardViewState.Compact;
    xScroll: number =0;
    yScroll: number =0;
    constructor(state: CardViewState) {
        this.state = state;
    }
}

async function main() {
    console.log("firefly ᕦ(ツ)ᕤ");
    await run();
}


async function run() {
    await init();
    await loadCards();
    await animateLogoToLeft();
    await openSession();
    testSearch("animate logo to left");
    eventLoop();
}

async function init() {
    logo();
    graph();
    searchBox();
    keyboard();
}

function logo() {
    const logo = document.getElementById('logo_and_shadow') as HTMLElement;
    let shadow = document.getElementById("logo_shadow")!;
    logo.style.left = `${(window.innerWidth - logo.offsetWidth)/2}px`;
    logo.style.top = `${(window.innerHeight/2)-40}px`;
    logo.style.transition = `top 0.25s`;
    shadow.style.transition = `top 0.25s`;
}

function graph() {
    const container = document.getElementById('container') as HTMLElement;
    s_graphView = new GraphView(container, cardToHTML, highlightLink);
}

function eventLoop() {
    s_graphView.update();
    moveLogo();
    requestAnimationFrame(eventLoop);
}

function moveLogo() {
    let xScroll = window.scrollX;
    let logo = document.getElementById("logo_and_shadow")!;
    let shadow = document.getElementById("logo_shadow")!;
    let [yMin, yMax] = s_graphView.yRange(xScroll + rect(logo).width() + 50);
    if (yMin && yMax) {
        logo.style.top = `${window.innerHeight -  60}px`;
        shadow.style.top = `${document.body.clientHeight - yMin - 100}px`;
    } else {
        logo.style.top = `${(window.innerHeight/2)-40}px`;
        shadow.style.top = `${45}px`;
    }
}

async function loadCards() {
    console.log("loadCards");
    if (s_useLocalFiles) {
        await importLocalFolder();
    } 
    const jsonObj = await importFolders("firefly", ["ts", "py"]);
    s_allCards = jsonObj.cards as Card[];
    console.log("nCards:", s_allCards.length);
}

async function openSession() {
    let json = await load("session/test.json");
    if (json.error) {
        console.log("failed to load session:", json.error);
        openMain();
    } else {
        s_graphView.openJson(json);
    }
}

function openMain() {
    openCard("ts_firefly_firefly_function_main", null);
}

function reset() {
    s_graphView.reset();
}

function searchBox() {
    const searchFieldHTML = `<div class="search-field" id="search-field" contenteditable="true" spellcheck="false"></div>`;
    const iconHTML = `<i class="${s_mainIcon}" style="padding-top: 6px;" id="search-button"></i>`;
    const icon2HTML = `<i class="icon-right-big" style="padding-top: 6px; padding-right:3px"></i>`;
    const searchResultsHTML = `<div class="search-results" id="search-results"></div>`;
    const searchDivHTML = `<div class="search-box" id="search-box">${iconHTML}${searchFieldHTML}${icon2HTML}${searchResultsHTML}</div>`;
    const shadow = element(`<div class="shadow"></div>`);
    let searchDiv = element(searchDivHTML);
    document.body.append(searchDiv);
    searchDiv.style.top = `${window.innerHeight -  64}px`;
    let searchField = document.getElementById("search-field")!;
    searchField.addEventListener('keydown', async (event) => {
        await updateSearch(searchField);
    });
    let searchButton = document.getElementById("search-button")!;
    searchButton.style.cursor = 'pointer';
    listen(searchButton, 'click', searchOptions);
}

async function updateSearch(searchField: HTMLElement) {
    searchField.style.width = '128px';
    if (searchField.scrollWidth < 512) {
        searchField.style.width = `${searchField.scrollWidth}px`;
    } else {
        searchField.style.width = '512px';
    }
    setTimeout(async () => {
        const results = await testSearch(searchField!.innerText);
        showSearchResults(results);
    }, 0);
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
        console.log(event.key);
        if (event.metaKey && event.key == 'f') {
            event.preventDefault();
            await onCommandKey();
        }
    });
}

async function onCommandKey() {
    let searchField = document.getElementById("search-field")!;
    searchField.innerText = "";
    searchField.focus();
}

async function testSearch(query: string) : Promise<any>{
    console.log("testSearch");
    console.log(query);
    let tNow = performance.now();
    const results = await search(query);
    let tElapsed = performance.now() - tNow;
    //console.log(`result:\n${JSON.stringify(results)}`);
    //console.log(`took ${tElapsed} msec`);
    return results;
}

function showSearchResults(results: any) {
    console.log("search results:");
    let searchResultsDiv = document.getElementById("search-results")!;
    clearSearchResults(searchResultsDiv);
    const array = results.results;
    for(const item of array) {
        const id = item.value;
        const card = findCard(id);
        if (!card) {
            console.log("  unknown:", id);
        } else {
            const name = shortName(card);
            console.log("  ", name);
            if (card.kind == "function" || card.kind == "method" || card.kind == "class") {
                let searchResultDiv = element(`<div class="search-result">${name}</div>`);
                listen(searchResultDiv, 'click', () => { jumpToCard(card)});
                searchResultsDiv.append(searchResultDiv);
            }
        }
    }
}

class Link {
    iDep: number =-1;               // dependency index in caller
    card: Card | null = null;       // card to open
    constructor(iDep: number, card: Card) {
        this.iDep = iDep; this.card = card;
    }
}

function jumpToCard(target: Card) {
    console.log("jumpToCard", target.uid);
    let mainCard = findCard("ts_firefly_firefly_function_main");
    if (!mainCard) return;
    let chain : Link[] = callChain(mainCard, target);
    console.log(chain);
    if (chain.length==0) return;
    //reset();
    let card : Card = mainCard;
    for(let link of chain) {
        const cardID = link.card!.uid;
        console.log("open", cardID, `linkto_${cardID}`, card.uid);
        s_graphView.open(cardID, `linkto_${cardID}`, card.uid, new CardView(CardViewState.Compact), false);
        card = link.card!;
    }
    let lastId = chain[chain.length-1].card!.uid;
    //setTimeout(() => { expandOrContract(s_graphView.find(lastId)!); }, 0);
}


function callChain(from: Card, to: Card) : Link[] {
    newVisitPass();
    return callChainRec(from, to).slice(1);
}

// returns a list of { dep, card } to get from a to b
function callChainRec(from: Card, to: Card, iDepFrom: number=-1) : Link[]  {
    if (from.kind != "method" && from.kind != "function") return []; // only callables
    if (visited(from)) return [];
    if (from === to) return [ new Link(iDepFrom, from) ];
    let iDep = findDependency(from, to);
    if (iDep >= 0) return [ new Link(iDepFrom, from), new Link(iDep, to) ];
    visit(from);        // prevent us from going down this path again
    for(let iDep = 0; iDep < from.dependsOn.length; iDep++) {
        const dep = from.dependsOn[iDep];
        for(const t of dep.targets) {
            const chain = callChainRec(findCard(t)!, to, iDep);
            if (chain.length != 0) {
                return [ new Link(iDepFrom, from), ...chain ];
            }
        }
    }
    return [];
}

let s_visit: number = 0;
let s_visitCount: Map<Card, number> = new Map();

function newVisitPass() { s_visit ++; }
function visited(card: Card) : boolean {
    let vc = s_visitCount.get(card);
    return (vc && vc == s_visit) ? true : false;
}
function visit(card: Card) {
    s_visitCount.set(card, s_visit);
}

// given (card) and (target), checks card.dependsOn and returns index of dependency that matches
function findDependency(card: Card, target: Card) : number {
    return card.dependsOn.findIndex(d => (d.targets.indexOf(target.uid) >= 0));
}


function clearSearchResults(searchDiv: HTMLElement) {
    if (searchDiv) {
        while (searchDiv.children.length > 0) {
            searchDiv.removeChild(searchDiv.lastChild!);
        }
    }
}

async function search(query: string) : Promise<any> {
    return await remote("@firefly.search", { query });
}

async function importLocalFolder() {
    let logo: HTMLButtonElement = document.getElementById('logo_and_shadow') as HTMLButtonElement;
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

async function importFolders(project: string, folders: string[]) {
    return await remote("@firefly.importFolders", { project: project, folders: folders });
}

// finds the card with the given UID, or null if doesn't exist
function findCard(uid: string) : Card | null {
    let index = s_allCards.findIndex((card : any ) => card.uid === uid);
    if (index < 0) return null;
    return s_allCards[index];
}

// generates HTML for card, but doesn't connect it yet
function cardToHTML(id: string, view: CardView) : HTMLElement {
    let card : Card | null = findCard(id);
    if (!card) { return element(`<div></div>`); }
    let style = "code"; if (view.state == CardViewState.Fullsize) { style += " code-expanded"; }
    let elem : HTMLElement = element(`<div id="code_${card.uid}" class="${style}" spellcheck="false" contenteditable="false"></div>`);
    let text : string = card.code[0].text;
    if (card.dependsOn.length==0) {
        elem.innerText = text;
    } else {
        let iChar : number = 0;
        for(const dep of card.dependsOn) {
            // add text-node going from (iChar) to (dep.iChar)
            if (dep.iChar > iChar) {
                elem.appendChild(document.createTextNode(text.slice(iChar, dep.iChar)));
            }
            // add span containing the link
            const link = text.slice(dep.iChar, dep.jChar);
            let linkId = "linkto_" + dep.targets[0];
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
    let container = codeContainer(elem, shortName(card));
    container.id = card.uid;
    return container;
}

function codeContainer(codeDiv: HTMLElement, title: string) : HTMLElement {
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
        //console.log(`${type}: ${elem.id}`);
        await func(event);  // Assuming func is synchronous. If it's async, use await func(event);
        event.stopPropagation();
        debouncedSaveAll();
    });
}

function expandOrContract(elem : HTMLElement) {
    let div = elem.parentElement!;
    let view = s_graphView.userObj(div);
    if (view.state == CardViewState.Compact) {
        elem.classList.add("code-expanded");
        view.state = CardViewState.Fullsize;

    } else if (view.state == CardViewState.Fullsize) {
         elem.classList.remove("code-expanded");
         view.state = CardViewState.Compact;
         elem.scrollLeft = view.xScroll;
         elem.scrollTop = view.yScroll;
    }
    s_graphView.emphasize(div, elem.classList.contains("code-expanded"));
    s_graphView.attention(div);
}

function getScrollPos(elem: HTMLElement) {
    let div = elem.parentElement!;
    let view = s_graphView.userObj(div);
    if (view.state == CardViewState.Compact) {
        view.xScroll = div.scrollLeft;
        view.yScroll = div.scrollTop;
    }
}

const debouncedSaveAll = debounce(() => { saveAll() }, 300);

async function saveAll() {
    //console.log("saveAll");
    const json = s_graphView.json();
    await save(json, "sessions/test.json");
}

async function save(json: any, path: string) {
    await remote("@firefly.save", { path: "sessions/test.json", obj: json });
}

async function load(path: string) : Promise<any> {
    return await remote("@firefly.load", { path: "sessions/test.json"});
}

// link button pressed
function onLinkButtonPress(button: HTMLElement) {
    const id = button.id.slice("linkto_".length);
    const linkIDs = id.split("__");
    for(const linkID of linkIDs) {
        openOrCloseCard(linkID, button);
    }
}

// if a card view is closed, opens it; otherwise closes it
function openOrCloseCard(uid: string, button: HTMLElement) {
    const card : Card | null = findCard(uid);
    if (!card) return;
    let existing = s_graphView.find(uid);
    if (existing) {
        closeCard(existing);
    } else {
        openCard(uid, button);
    }
}

// opens a card, optionally connected to a button element
function openCard(uid: string, button: HTMLElement | null){
    let linkID = "";
    let parentID = "";
    if (button) {
        linkID = button.id;
        let parent = s_graphView.findDivContainingLink(button);
        if (parent) parentID = parent.id;
    }
    s_graphView.reopen(uid, linkID, parentID, new CardView(CardViewState.Compact));
    if (button) {
        highlightLink(button, true);
    }
}

// closes a card
function closeCard(cardDiv: HTMLElement) {
    let button = s_graphView.findLink(cardDiv);
    if (button) {
        highlightLink(button, false);
    }
    s_graphView.close(cardDiv);
}