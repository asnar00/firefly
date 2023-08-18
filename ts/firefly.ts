// ᕦ(ツ)ᕤ
// firefly.ts
// author: asnaroo (with a little help from GPT4)

import {GraphView} from "./graphview.js";
import {element} from "./util.js";
import {scrollToView} from "./util.js";
import {debounce} from "./util.js";
import {remote} from "./util.js";

window.onload = () => { main(); };

const s_useLocalFiles = false;              // change this to true to enable local file access
let dirHandle: any | null = null;
var s_allCards: Card[];
var s_graphView : GraphView;

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
    target: Card;                       // card we link to or from (works both ways)
    constructor(target: Card, iChar: number, jChar: number) {
        this.target = target; this.iChar = iChar; this.jChar = jChar; 
    }
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
    parent: Card | null = null;         // if we're a method or property, points to parent
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
    await setupEvents();
}

async function setupEvents() {
    const container = document.getElementById('container') as HTMLElement;
    s_graphView = new GraphView(container, cardToHTML, highlightLink);
    await loadCards();
    await animateLogoToLeft();
    await openMain();
    eventLoop();
}

function eventLoop() {
    s_graphView.update();
    requestAnimationFrame(eventLoop);
}

async function loadCards() {
    console.log("loadCards");
    if (s_useLocalFiles) {
        await importLocalFolder();
    } 
    const jsonObj = await importFolders("firefly", ["ts", "py"]);
    s_allCards = jsonObj.cards as Card[];
    console.log("nCards:", s_allCards.length);
    let uids: string[] = [];
    for(const card of s_allCards) {
        uids.push(card.uid);
    }
    //console.log(uids);
}

async function openMain() {
    let json = await load("session/test.json");
    if (json.error) {
        console.log("failed to load session:", json.error);
        openCard("ts_firefly_firefly_function_main", null);
    } else {
        s_graphView.openJson(json);
    }
}

async function importLocalFolder() {
    let logo: HTMLButtonElement = document.getElementById('logo_and_shadow') as HTMLButtonElement;
    let button = element(`<button id="openDirectory" class="transparent-button" style="display: inline-block;">
                            <h3 style="display: inline-block;">▶︎</h3></button>`);
    logo.insertBefore(button, logo.children[1]);
    button.addEventListener('click', async () => {
        console.log("button pressed!");
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

// returns fresh JSON for all cards in the codebase
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
    let elem : HTMLElement = element(`<div id="${card.uid}" class="${style}" spellcheck="false" contenteditable="false"></div>`);
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
            const child = element(`<span class="tag" id="linkto_${dep.target}">${link}</span>`);
            listen(child, 'click', async function(event: any) {
                openOrCloseCard(child.id.slice("linkto_".length), child);
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
    return elem;
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

function expandOrContract(div : HTMLElement) {
    let view = s_graphView.userObj(div);
    if (view.state == CardViewState.Compact) {
        div.classList.add("code-expanded");
        view.state = CardViewState.Fullsize;

    } else if (view.state == CardViewState.Fullsize) {
         div.classList.remove("code-expanded");
         view.state = CardViewState.Compact;
         div.scrollLeft = view.xScroll;
         div.scrollTop = view.yScroll;
    }
    s_graphView.emphasize(div, div.classList.contains("code-expanded"));
    scrollToView(div);
}

function getScrollPos(div: HTMLElement) {
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
    await remote("@firefly.save", { path: "sessions/test.json", json: json });
}

async function load(path: string) : Promise<any> {
    return await remote("@firefly.load", { path: "sessions/test.json"});
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
    console.log("openCard", uid);
    let linkID = "";
    let parentID = "";
    if (button) {
        linkID = button.id;
        let parent = s_graphView.findDivContainingLink(button);
        if (parent) parentID = parent.id;
    }
    s_graphView.open(uid, linkID, parentID, new CardView(CardViewState.Compact));
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