// ᕦ(ツ)ᕤ
// graphview.ts
// author: asnaroo, with help from gpt4
// manages a graph of nodes
// nodes can be any HTMLElement
// just make sure nodes have unique ids
import { element } from "./html.js";
import { getBodyWidth } from "./html.js";
import { scrollToView } from "./html.js";
import { rect } from "./html.js";
import { Rect } from "./html.js";
// manages all top-level DOM nodes inside a container
export class GraphView {
    // setup: pass the div that's going to hold all nodes
    constructor(container) {
        this.nodeMap = new WeakMap();
        this.columns = [];
        this.padding = 24;
        this.arrowMap = new Map();
        this.container = container;
        this.arrowsSVG = this.initArrows();
    }
    // given an id, returns the first div with that ID (expected to be unique)
    find(id) {
        const elementsArray = Array.from(this.container.querySelectorAll(`#${id}`));
        if (elementsArray.length == 0)
            return null;
        return elementsArray[0];
    }
    // given a div, returns the linkDiv that opened it (todo: more than one? IDK)
    findLink(div) {
        const node = this.get(div);
        return node ? node.linkDiv : null;
    }
    // closes a div that's open, and all children as well (todo)
    close(div) {
        const node = this.get(div);
        if (node.linkDiv) {
            this.removeArrow(node.linkDiv);
        }
        div.remove();
        node.remove();
        this.arrangeAll(); // todo: call this every frame
    }
    // adds a div to the manager, and to the container div
    add(div, link) {
        this.container.appendChild(div);
        let parentDiv = (link) ? this.findDivContainingLink(link) : null;
        let xTarget = 0;
        let yTarget = 0;
        if (link && parentDiv) {
            const prect = rect(parentDiv);
            const brect = rect(link);
            const crect = rect(div);
            xTarget = prect.right + (this.padding * 2);
            yTarget = ((brect.top + brect.bottom) / 2) - (crect.height() / 2);
        }
        else {
            const crect = rect(div);
            xTarget = crect.left + 150;
            yTarget = (window.innerHeight / 2) - (crect.height() / 2);
        }
        let node = new Node(this, div, link, parentDiv);
        node.setPos(xTarget, yTarget);
        this.nodeMap.set(div, node);
        if (link && parentDiv) {
            this.addArrow(link, parentDiv, div);
        }
        this.arrangeAll(); // todo: call this every frame
        scrollToView(div);
    }
    // emphasizes element (moves shadow forward in space)
    emphasize(div, onOff) {
        let node = this.get(div);
        if (!node)
            return;
        node.emphasize = onOff;
        node.updateShadow();
    }
    // arranges all views : computes xTarget, yTarget for each view
    arrangeAll() {
        let xPos = rect(this.columns[0][0].div).right + (this.padding * 2);
        for (let i = 1; i < this.columns.length; i++) {
            let groups = this.splitColumnIntoGroups(i);
            for (let group of groups) {
                this.spaceNodesInGroup(group, xPos);
            }
            this.spaceGroupsVertically(groups);
            // now get xPos = max of all right-edges
            for (const node of this.columns[i]) {
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
    get(div) {
        let node = this.nodeMap.get(div);
        return node ? node : null;
    }
    // find the top-level div that contains a link elemeent
    findDivContainingLink(link) {
        if (!link)
            return null;
        let parent = link.parentElement;
        while (parent && parent.parentElement !== this.container) {
            parent = parent.parentElement;
        }
        return (parent) ? parent : null;
    }
    splitColumnIntoGroups(i) {
        let groups = [];
        for (const p of this.columns[i - 1]) {
            let group = [];
            for (const node of this.columns[i]) {
                if (node.parentDiv.id === p.div.id) {
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
    spaceNodesInGroup(group, xPos) {
        // first find the total height of the group, plus padding
        let sumHeight = (group.length - 1) * this.padding;
        for (const node of group) {
            sumHeight += rect(node.div).height();
        }
        // then find the centerline of the group's parent
        const parentRect = rect(group[0].parentDiv);
        const centerLine = (parentRect.top + parentRect.bottom) / 2;
        // now space group out vertically around the centerline
        let yPos = Math.max(this.padding, centerLine - (sumHeight / 2));
        let pivot = (group.length - 1) / 2;
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
    spaceGroupsVertically(groups) {
        for (let i = 1; i < groups.length; i++) {
            let prevGroup = groups[i - 1];
            let prevBottom = rect(prevGroup[prevGroup.length - 1].div).bottom;
            let group = groups[i];
            let top = rect(group[0].div).top;
            if (top <= (prevBottom + (this.padding * 2))) { // bigger gaps between groups
                const newTop = prevBottom + (this.padding * 2); // where group[0] has to move to
                const diff = newTop - top; // therefore, how much to move by
                for (let node of group) {
                    node.yTarget += diff;
                    node.setPos(node.xTarget, node.yTarget);
                }
            }
        }
    }
    //----------------------------- internal --------------------------------
    // add a Node to the correct column, keep them sorted vertically
    addToColumnArray(node) {
        while (this.columns.length <= node.column) {
            this.columns.push([]);
        }
        this.columns[node.column].push(node);
        this.columns[node.column].sort((a, b) => (a.yLink() - b.yLink()));
    }
    //----------------------------- arrows ---------------------------------
    // set up the SVG arrow renderer
    initArrows() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'relative';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1000';
        this.container.parentElement.appendChild(svg);
        return svg;
    }
    addArrow(linkDiv, parentDiv, div) {
        let arrow = new Arrow(linkDiv, parentDiv, div);
        this.arrowMap.set(linkDiv, arrow);
        arrow.addToSVG(this.arrowsSVG);
    }
    removeArrow(linkDiv) {
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
}
;
// stores information about a div we're managing
class Node {
    constructor(view, div, linkDiv, parentDiv) {
        this.column = 0; // column we're in (first one zero)
        this.xTarget = 0; // where we're trying to get to, to avoid others
        this.yTarget = 0; // ..
        this.emphasize = false; // if set, comes forward in the stack
        this.graph = view;
        if (parentDiv === undefined) {
            console.log("WARNING: parentDiv undefined!");
        }
        this.div = div;
        this.linkDiv = linkDiv;
        this.parentDiv = parentDiv;
        if (parentDiv) {
            this.column = this.graph.get(parentDiv).column + 1;
        }
        this.graph.addToColumnArray(this);
        this.shadow = element(`<div class="shadow"></div>`);
        this.graph.container.appendChild(this.shadow);
    }
    remove() {
        this.graph.columns[this.column] = this.graph.columns[this.column].filter(item => item !== this);
        this.shadow.remove();
    }
    setPos(x, y) {
        this.div.style.left = `${x}px`;
        this.div.style.top = `${y}px`;
        this.updateShadow();
    }
    yLink() {
        return rect(this.linkDiv).top;
    }
    updateShadow() {
        const sr = rect(this.div);
        const wh = window.innerHeight;
        let sy = (this.emphasize) ? (wh - 100) : (sr.bottom + 50);
        sy = Math.max(wh / 2 + 20, sy);
        this.shadow.style.left = `${sr.left}px`;
        this.shadow.style.top = `${sy}px`;
        this.shadow.style.width = `${sr.width()}px`;
        this.shadow.style.height = `1px`;
        this.shadow.style.zIndex = `-10`;
    }
}
;
class Arrow {
    constructor(linkDiv, parentDiv, div) {
        this.drawRect = new Rect(0, 0, 0, 0);
        this.xVertical = 0;
        this.linkDiv = linkDiv;
        this.parentDiv = parentDiv;
        this.div = div;
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute('stroke', '#87bdb5');
        this.path.setAttribute('stroke-width', '3');
        this.path.setAttribute('fill', 'transparent');
    }
    addToSVG(svg) {
        console.log("Arrow.addToSVG");
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
        const yFrom = (linkRect.top + linkRect.bottom) / 2;
        const xTo = targetRect.left;
        const yTo = (targetRect.top + targetRect.bottom) / 2;
        this.drawRect = new Rect(xFrom, yFrom, xTo, yTo);
        this.xVertical = (xFrom + xTo) / 2;
    }
    update() {
        const startX = this.drawRect.left;
        const startY = this.drawRect.top;
        const endX = this.drawRect.right;
        const endY = this.drawRect.bottom;
        const cornerRadius = Math.min(Math.abs(endY - startY) / 2, 10);
        const midX = this.xVertical;
        const vs = (endY < startY) ? -1 : +1;
        const d = [
            `M ${startX} ${startY}`,
            `H ${midX - cornerRadius}`,
            `Q ${midX} ${startY} ${midX} ${startY + vs * cornerRadius}`,
            `V ${endY - vs * cornerRadius}`,
            `Q ${midX} ${endY} ${midX + cornerRadius} ${endY}`,
            `H ${endX}`,
        ].join(' ');
        this.path.setAttribute('d', d);
        console.log("Arrow.update:", startX, startY, endX, endY);
    }
}
;