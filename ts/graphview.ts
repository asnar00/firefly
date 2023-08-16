// ᕦ(ツ)ᕤ
// graphview.ts
// author: asnaroo, with help from gpt4
// manages a graph of nodes
// nodes can be any HTMLElement
// just make sure nodes have unique ids

import {element} from "./util.js";
import {getBodyWidth} from "./util.js";
import {scrollToView} from "./util.js";
import {rect} from "./util.js";
import {Rect} from "./util.js";

// manages all top-level DOM nodes inside a container
export class GraphView {
    container: HTMLElement;
    nodeMap: Map<HTMLElement, Node> = new Map();
    columns: Node[][] = [];
    padding: number = 24;
    arrowsSVG: SVGSVGElement;
    arrowMap: Map<HTMLElement, Arrow> = new Map();
    htmlFunction : Function;
    highlightFunction : Function;
    attentionID: string;

    // setup: pass the div that's going to hold all nodes
    constructor(container: HTMLElement, htmlFunction: Function, highlightFunction: Function) {
        this.container = container;
        this.htmlFunction = htmlFunction;
        this.highlightFunction = highlightFunction;
        this.arrowsSVG = this.initArrows();
        this.attentionID = "";
    }

    // given an id, returns the first div with that ID (expected to be unique)
    find(id: string, parent?:HTMLElement) : HTMLElement | null {
        if (!parent) parent = this.container;
        const elementsArray = Array.from(parent.querySelectorAll(`#${id}`));
        if (elementsArray.length == 0) return null;
        return elementsArray[0] as HTMLElement;
    }

    // given a div, returns the userObj of the first node that matches
    userObj(div: HTMLElement) : any {
        const node = this.get(div);
        if (!node) return null;
        return node.userObj;
    }

    // given a div, returns the linkDiv that opened it (todo: more than one? IDK)
    findLink(div: HTMLElement) : HTMLElement | null {
        const node = this.get(div);
        return node ? node.linkDiv : null;
    }

    // closes a div that's open, and all children as well
    close(div: HTMLElement) {
        const node = this.get(div)!;
        if (node) {
            let nodes = this.allChildren(node);
            for(let node of nodes) { this.closeSingleNode(node); }
        }
        this.arrangeAll();
    }

    allChildren(node: Node) : Node[] {
        let result : Node[] = [ node ];
        for(let n of this.nodeMap.values()) {
            if (n.parentDiv == node.div) result.push(...this.allChildren(n));
        }
        return result;
    }

    closeSingleNode(node: Node) {
        if (node.linkDiv) {
            this.removeArrow(node.linkDiv);
        }
        this.nodeMap.delete(node.div);
        node.div.remove();
        node.remove();
    }

    open(id: string, linkID: string, parentID: string, userObj: any, emphasize: boolean=false) {
        let div = this.htmlFunction(id, userObj);
        this.container.appendChild(div);
        let linkDiv = null;
        if (linkID != "" && parentID != "") {
            let parentDiv = this.find(parentID);
            if (parentDiv) linkDiv = this.find(linkID, parentDiv); else linkDiv = null;
        }
        if (linkDiv) {
            this.highlightFunction(linkDiv, true);
        }
        this.add(div, linkDiv, userObj);
        if (emphasize) {
            this.get(div)!.emphasize = true;
        }
    }

    openJson(obj: any) {
        let nodesJson : any[] = obj.nodes;
        for(let n of nodesJson) {
            this.open(n.id, n.link, n.parent, n.userObj, n.emphasize);
        }
        this.attentionID = obj.attentionID;
        if (this.attentionID != "") {
            let attentionDiv = this.find(this.attentionID)!;
            if (attentionDiv) { scrollToView(attentionDiv); }
        }
    }

    // adds a div to the manager, and to the container div
    add(div: HTMLElement, link: HTMLElement | null, userObj: any = null) {
        this.container.appendChild(div);
        
        let parentDiv = (link)? this.findDivContainingLink(link) : null;
        let xTarget = 0;
        let yTarget = 0;
        if (link && parentDiv) {
            const prect = rect(parentDiv);
            const brect = rect(link);
            const crect = rect(div);
            xTarget = prect.right + (this.padding * 2);
            yTarget = ((brect.top + brect.bottom)/2) - (crect.height()/2);
        } else {
            const crect = rect(div);
            xTarget = crect.left + 150;
            yTarget = (window.innerHeight / 2) - (crect.height()/2);
        }
        let node = new Node(this, div, link, parentDiv, userObj);
        node.setPos(xTarget, yTarget);
        this.nodeMap.set(div, node);
        if (link && parentDiv) {
            this.addArrow(link, parentDiv, div);
        }
        this.arrangeAll();          // todo: call this every frame
        this.attentionID = div.id;
        scrollToView(div);
        div.addEventListener('scroll', (event) => {
            this.updateArrowsFrom(div);
        });
    }

    // emphasizes element (moves shadow forward in space)
    emphasize(div: HTMLElement, onOff: boolean) {
        let node = this.get(div);
        if (!node) return;
        node.emphasize = onOff; 
        node.updateShadow();
    }

    // arranges all views : computes xTarget, yTarget for each view
    arrangeAll() {
        let xPos = rect(this.columns[0][0].div).right + (this.padding * 2);
        for(let i = 1; i < this.columns.length; i++) {
            let groups : Node[][] = this.splitColumnIntoGroups(i);
            for (let group of groups) {
                this.spaceNodesInGroup(group, xPos);
            }
            this.spaceGroupsVertically(groups);
        
            // now get xPos = max of all right-edges
            for(const node of this.columns[i]) {
                xPos = Math.max(xPos, rect(node.div).right + (this.padding * 2));
            }
        }
        const widthInPixels = getBodyWidth();
        const newWidth = Math.max(window.innerWidth, xPos);
        document.body.style.width = `${newWidth}px`;
        this.updateArrows();
    }

    // ------------------ private ----------------------------

    // returns the Node associated with a top-level div
    get(div: HTMLElement) : Node | null {
        let node = this.nodeMap.get(div);
        return node ? node : null;
    }

    // find the top-level div that contains a link elemeent
    findDivContainingLink(link: HTMLElement | null): HTMLElement | null {
        if (!link) return null;
        let parent = link.parentElement;
        while (parent && parent.parentElement !== this.container) {
            parent = parent.parentElement;
        }
        return (parent) ? parent : null;
    }

    splitColumnIntoGroups(i: number) : Node[][] {
        let groups : Node[][] = [];
        for(const p of this.columns[i-1]) {
            let group : Node[] = [];
            for(const node of this.columns[i]) {
                if (node.parentDiv!.id === p.div.id) {
                    group.push(node);
                }
            }
            if (group.length > 0) {
                groups.push(group);
            }
        }
        return groups;
    }

    // within a group (nodes with same parent), space out around centerline
    spaceNodesInGroup(group: Node[], xPos: number) {
        // first find the total height of the group, plus padding
        let sumHeight = (group.length-1) * this.padding;
        for(const node of group) {
            sumHeight += rect(node.div).height();
        }
        // then find the centerline of the group's parent
        const parentRect = rect(group[0].parentDiv!);
        const centerLine = (parentRect.top + parentRect.bottom)/2;
        // now space group out vertically around the centerline
        let yPos = Math.max(this.padding, centerLine - (sumHeight/2));
        let pivot = (group.length-1)/2;
        for (let i = 0; i < group.length; i++) {
            let node = group[i];
            let xOffset = (i < pivot) ? i : (pivot - (i - pivot));
            node.xTarget = xPos + (xOffset * this.padding);
            node.yTarget = yPos;
            node.setPos(node.xTarget, node.yTarget);
            yPos += rect(node.div).height() + this.padding;
        }
    }
    
    // space groups out vertically so they don't overlap
    spaceGroupsVertically(groups: Node[][]) {
        if (groups.length < 2) return;
        const even = (groups.length % 2) == 0;
        const iPivot = Math.floor((groups.length-1)/2);
        if (even) {
            this.checkGroups(groups[iPivot], groups[iPivot+1], 0.5);
        }
        for(let i=iPivot; i>0; i--) {
            this.checkGroups(groups[i-1], groups[1], 0);
        }
        for(let i=iPivot; i < groups.length-1; i++) {
            this.checkGroups(groups[i], groups[i+1], 1);
        }
    }

    /*
    pivot = (nGroups-1)/2

    n=1:    nothing to do
    n=2:    iPivot=(2-1)/2=>0.5=>0, check(0,1,0.5) correct.
    n=3:    pivot = (3-1)/2 = 1; compare(1, 0); compare(1, 2)
    n=4:    pivot = (4-1)/2 = 1.5; compare(1, 2); compare(1, 0); compare(2, 3)

    */

    checkGroups(groupA: Node[], groupB: Node[], mix: number) {
        const bottomA = rect(groupA[groupA.length-1].div).bottom;
        const topB = rect(groupB[0].div).top;
        const overlap =  (bottomA + (this.padding*2)) - topB;
        if (overlap < 0) return;
        const moveA = -(overlap * (1 - mix));
        const moveB = overlap * mix;
        this.moveGroupVertically(groupA, moveA);
        this.moveGroupVertically(groupB, moveB);
    }

    moveGroupVertically(group: Node[], yMove: number) {
        for(let node of group) {
            node.yTarget += yMove;
            node.setPos(node.xTarget, node.yTarget);
        }
    }

    //----------------------------- internal --------------------------------

    // add a Node to the correct column, keep them sorted vertically
    addToColumnArray(node : Node) {
        while (this.columns.length <= node.column) {
            this.columns.push([]);
        }
        this.columns[node.column].push(node);
        this.columns[node.column].sort((a, b) => (a.yLink() - b.yLink()));
    }

    //----------------------------- arrows ---------------------------------

    // set up the SVG arrow renderer
    initArrows() : SVGSVGElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'relative';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1000';
        this.container.parentElement!.appendChild(svg);
        return svg;
    }

    addArrow(linkDiv: HTMLElement, parentDiv: HTMLElement, div: HTMLElement) {
        let arrow = new Arrow(linkDiv, parentDiv, div);
        this.arrowMap.set(linkDiv, arrow);
        arrow.addToSVG(this.arrowsSVG);
    }

    removeArrow(linkDiv: HTMLElement) {
        let arrow = this.arrowMap.get(linkDiv);
        if (arrow) {
            arrow.removeFromSVG();
            this.arrowMap.delete(linkDiv);
        }
    }

    updateArrows() {
        for (let arrow of this.arrowMap.values()) {
            arrow.initDrawRect();
            // todo: collision detection here
            arrow.update();
        }
    }

    updateArrowsFrom(parentDiv: HTMLElement) {
        for (let arrow of this.arrowMap.values()) {
            if (arrow.parentDiv === parentDiv) {
                arrow.initDrawRect();
                // todo: collision detection here
                arrow.update();
            }
        }
    }

    json(node?: Node) {
        if (!node) { node = this.columns[0][0]; }
        let nodes: Node[] = this.allChildren(node);
        return { attentionID: this.attentionID,
                 nodes:  nodes.map(node => node.json()) };
    }
}


// stores information about a div we're managing
class Node {
    graph: GraphView;                       // the view we're a part of
    userObj: any;                           // per-node user info
    div: HTMLElement;                       // the div we're tracking
    linkDiv: HTMLElement | null;            // the link that triggered this
    parentDiv: HTMLElement | null;          // the parent div of the link div that opened this node
    column: number = 0;                     // column we're in (first one zero)
    xTarget: number = 0;                    // where we're trying to get to, to avoid others
    yTarget: number = 0;                    // ..
    shadow: HTMLElement;                    // the shadow, all-important :-)
    emphasize: boolean = false;             // if set, comes forward in the stack

    constructor(view: GraphView, div: HTMLElement, linkDiv: HTMLElement | null, parentDiv: HTMLElement | null, userObj: any =null) {
        this.graph = view;
        this.userObj = userObj;
        if (parentDiv === undefined) {
            console.log("WARNING: parentDiv undefined!");
        }
        this.div = div; this.linkDiv = linkDiv; this.parentDiv = parentDiv;
        if (parentDiv) { 
            this.column = this.graph.get(parentDiv)!.column + 1;
        }
        this.graph.addToColumnArray(this);

        this.shadow = element(`<div class="shadow"></div>`);
        this.graph.container.appendChild(this.shadow);
    }

    remove() {
        this.graph.columns[this.column] = this.graph.columns[this.column].filter(item => item !== this);
        this.shadow.remove();
    }

    setPos(x: number, y: number) {
        this.div.style.left = `${x}px`;
        this.div.style.top = `${y}px`;
        this.updateShadow();
    }

    yLink() {
        return rect(this.linkDiv!).top;
    }

    updateShadow() {
        const sr = rect(this.div);
        const wh = window.innerHeight;
        let sy = (this.emphasize) ? (wh - 100) : (sr.bottom + 50);
        sy = Math.max(wh/2+20, sy);
        this.shadow.style.left = `${sr.left}px`;
        this.shadow.style.top = `${sy}px`;
        this.shadow.style.width = `${sr.width()}px`;
        this.shadow.style.height = `1px`;
        this.shadow.style.zIndex = `-10`;
    }

    json() : any {
        return { id: this.div.id,
                 link: this.linkDiv?.id ?? "null",
                 parent: this.parentDiv?.id ?? "null",
                 emphasize: this.emphasize,
                 userObj: this.userObj };
    }
};

class Arrow {
    linkDiv: HTMLElement;
    parentDiv: HTMLElement;
    div: HTMLElement;
    drawRect: Rect = new Rect(0,0,0,0);
    xVertical: number = 0;
    path: SVGPathElement;
    constructor(linkDiv: HTMLElement, parentDiv: HTMLElement, div: HTMLElement) {
        this.linkDiv = linkDiv; this.parentDiv = parentDiv; this.div = div;
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute('stroke', '#87bdb5');
        this.path.setAttribute('stroke-width', '3');
        this.path.setAttribute('fill', 'transparent');
    }
    addToSVG(svg: SVGSVGElement) {
        svg.appendChild(this.path);
    }
    removeFromSVG() {
        this.path.remove();
    }
    initDrawRect() {
        const parentRect = rect(this.parentDiv);
        const linkRect = rect(this.linkDiv);
        const targetRect = rect(this.div);
        const xFrom = parentRect.right;
        let yFrom = (linkRect.top + linkRect.bottom) / 2;
        yFrom = Math.max(yFrom, parentRect.top + 12);
        yFrom = Math.min(yFrom, parentRect.bottom - 12);
        const xTo = targetRect.left;
        let yTo = yFrom;
        yTo = Math.max(yTo, targetRect.top + 12);
        yTo = Math.min(yTo, targetRect.bottom - 12);
        this.drawRect = new Rect(xFrom, yFrom, xTo, yTo);
        this.xVertical = (xFrom + xTo) / 2;
    }
    update() {
        const startX = this.drawRect.left;
        const startY = this.drawRect.top;
        const endX = this.drawRect.right;
        const endY = this.drawRect.bottom;
        const cornerRadius = Math.min(Math.abs(endY-startY)/2, 10);
        const midX = this.xVertical;
        const vs = (endY < startY) ? -1 : +1;

        const d = [
            `M ${startX} ${startY}`,
            `H ${midX - cornerRadius}`,
            `Q ${midX} ${startY} ${midX} ${startY + vs*cornerRadius}`,
            `V ${endY - vs*cornerRadius}`,
            `Q ${midX} ${endY} ${midX + cornerRadius} ${endY}`,
            `H ${endX}`,
        ].join(' ');

        this.path.setAttribute('d', d);
    }
};
