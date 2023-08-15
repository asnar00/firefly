// ᕦ(ツ)ᕤ
// graphview.ts
// author: asnaroo, with help from gpt4
// manages a graph of nodes
// nodes can be any HTMLElement
// just make sure nodes have unique ids

import {element} from "./html.js";
import {getBodyWidth} from "./html.js";
import {scrollToView} from "./html.js";
import {rect} from "./html.js";

// manages all top-level DOM nodes inside a container
export class GraphView {
    container: HTMLElement;
    map: WeakMap<HTMLElement, Node> = new WeakMap();
    columns: Node[][] = [];
    padding: number = 24;

    // setup: pass the div that's going to hold all nodes
    constructor(container: HTMLElement) {
        this.container = container;
    }

    // given an id, returns the first div with that ID (expected to be unique)
    find(id: string) : HTMLElement | null {
        const elementsArray = Array.from(this.container.querySelectorAll(`#${id}`));
        if (elementsArray.length == 0) return null;
        return elementsArray[0] as HTMLElement;
    }

    // given a div, returns the linkDiv that opened it (todo: more than one? IDK)
    findLink(div: HTMLElement) : HTMLElement | null {
        const node = this.get(div);
        return node ? node.linkDiv : null;
    }

    // closes a div that's open, and all children as well (todo)
    close(div: HTMLElement) {
        const node = this.get(div)!;
        div.remove();
        node.remove();
        this.arrangeAll();          // todo: call this every frame
    }

    // adds a div to the manager, and to the container div
    add(div: HTMLElement, link: HTMLElement | null) {
        this.container.appendChild(div);
        let parentDiv = (link)? this.findDivContainingLink(link) : null;
        let xTarget = 0;
        let yTarget = 0;
        if (link && parentDiv) {
            const prect = rect(parentDiv);
            const brect = rect(link);
            const crect = rect(div);
            xTarget = prect.right + this.padding;
            yTarget = ((brect.top + brect.bottom)/2) - (crect.height()/2);
        } else {
            const crect = rect(div);
            xTarget = crect.left + 120;
            yTarget = (window.innerHeight / 2) - (crect.height()/2);
        }
        let node = new Node(this, div, link, parentDiv);
        node.setPos(xTarget, yTarget);
        this.map.set(div, node);
        this.arrangeAll();          // todo: call this every frame
        scrollToView(div);
    }

    // arranges all views : computes xTarget, yTarget for each view
    arrangeAll() {
        let xPos = rect(this.columns[0][0].div).right + this.padding;
        for(let i = 1; i < this.columns.length; i++) {
            let groups : Node[][] = this.splitColumnIntoGroups(i);
            for (let group of groups) {
                this.spaceNodesInGroup(group, xPos);
            }
            this.spaceGroupsVertically(groups);
        
            // now get xPos = max of all right-edges
            for(const node of this.columns[i]) {
                xPos = Math.max(xPos, rect(node.div).right + this.padding);
            }
        }
        const widthInPixels = getBodyWidth();
        const newWidth = Math.max(window.innerWidth, xPos);
        document.body.style.width = `${newWidth}px`;
    }

    // ------------------ private ----------------------------

    // returns the Node associated with a top-level div
    get(div: HTMLElement) : Node | null {
        let node = this.map.get(div);
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
        for (let node of group) {
            node.xTarget = xPos;
            node.yTarget = yPos;
            node.setPos(xPos, yPos);
            yPos += rect(node.div).height() + this.padding;
        }
    }

    // space groups out vertically so they don't overlap
    spaceGroupsVertically(groups: Node[][]) {
        for(let i = 1; i < groups.length; i++) {
            let prevGroup = groups[i-1];
            let prevBottom = rect(prevGroup[prevGroup.length-1].div).bottom;
            let group = groups[i];
            let top = rect(group[0].div).top;
            if (top <= (prevBottom + (this.padding*2))) {       // bigger gaps between groups
                const newTop = prevBottom + (this.padding*2);  // where group[0] has to move to
                const diff = newTop - top;  // therefore, how much to move by
                for(let node of group) {
                    node.yTarget += diff;
                    node.setPos(node.xTarget, node.yTarget);
                }
            }
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

    //----------------------------- utility ---------------------------------

};

// stores information about a div we're managing
class Node {
    graph: GraphView;                            // the view we're a part of
    div: HTMLElement;                       // the div we're tracking
    linkDiv: HTMLElement | null;            // the link that triggered this
    parentDiv: HTMLElement | null;          // the parent div of the link div that opened this node
    column: number = 0;                     // column we're in (first one zero)
    xTarget: number = 0;                    // where we're trying to get to, to avoid others
    yTarget: number = 0;                    // ..
    shadow: HTMLElement;                    // the shadow, all-important :-)

    constructor(view: GraphView, div: HTMLElement, linkDiv: HTMLElement | null, parentDiv: HTMLElement | null) {
        this.graph = view;
        if (parentDiv === undefined) {
            console.log("WARNING: parentDiv undefined!");
        }
        this.div = div; this.linkDiv = linkDiv; this.parentDiv = parentDiv;
        if (parentDiv) { 
            this.column = this.graph.get(parentDiv)!.column + 1;
        }
        this.shadow = element(`<div class="shadow"><div>`);
        this.graph.container.appendChild(this.shadow);
        this.updateShadow();
        this.graph.addToColumnArray(this);
    }

    remove() {
        this.graph.columns[this.column] = this.graph.columns[this.column].filter(item => item !== this);
        this.shadow.remove();
    }

    setPos(x: number, y: number) {
        this.div.style.left = `${x}px`;
        this.div.style.top = `${y}px`;
    }

    yLink() {
        return rect(this.linkDiv!).top;
    }

    updateShadow() {
        const sr = rect(this.div);
        const wh = window.innerHeight;
        const sy = wh - ((sr.bottom / wh) * 200);
        this.shadow.style.left = `${sr.left}px`;
        this.shadow.style.top = `${sy - sr.top}px`;
    }
};

// a Rectangle

// utility -------------------------------------------------------------------
