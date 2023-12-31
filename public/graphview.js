// ᕦ(ツ)ᕤ
// graphview.ts
// author: asnaroo, with help from gpt4
// manages a graph of nodes
// nodes can be any HTMLElement
// just make sure nodes have unique ids
import { element } from "./util.js";
import { getBodyWidth } from "./util.js";
import { scrollToView } from "./util.js";
import { rect } from "./util.js";
import { Rect } from "./util.js";
import { getChildNodeIndex } from "./util.js";
var OldGraph;
(function (OldGraph) {
    function user(id) {
        const parts = id.split("_");
        return parts[parts.length - 1];
    }
    // manages all top-level DOM nodes inside a container
    class GraphView {
        // setup: pass the div that's going to hold all nodes
        constructor(container, htmlFunction, highlightFunction) {
            this.nodeMap = new Map();
            this.columns = [];
            this.padding = 24;
            this.arrowMap = new Map();
            this.scrolling = false;
            this.xScroll = 0;
            this.yScroll = 0;
            this.xScrollTarget = 0;
            this.yScrollTarget = 0;
            this.autoScroll = false;
            this.closedNodes = []; // nodes we closed intentionally
            this.reopenNodes = []; // nodes that were children of a node we closed
            this.container = container;
            this.container.style.zIndex = `-10`;
            this.htmlFunction = htmlFunction;
            this.highlightFunction = highlightFunction;
            this.arrowsSVG = this.initArrows();
            this.attentionNode = null;
            this.canvasRect = new Rect(0, 0, document.body.clientWidth, document.body.clientHeight);
        }
        // given an id, returns the first div with that ID (expected to be unique)
        find(id, parent) {
            if (!parent)
                parent = this.container;
            const elementsArray = Array.from(parent.querySelectorAll(`#${id}`));
            if (elementsArray.length == 0)
                return null;
            return elementsArray[0];
        }
        // given a div, returns the userObj of the first node that matches
        userObj(div) {
            const node = this.get(div);
            if (!node)
                return null;
            return node.userObj;
        }
        // given a div, returns the linkDiv that opened it (todo: more than one? IDK)
        findLink(div) {
            const node = this.get(div);
            return node ? node.linkDiv : null;
        }
        // closes a div that's open, and all children as well
        close(div) {
            const node = this.get(div);
            if (node) {
                let nodes = this.allChildren(node);
                this.closedNodes.push(nodes[0].json());
                for (let i = 1; i < nodes.length; i++) {
                    this.reopenNodes.push(nodes[i].json());
                }
                for (let node of nodes) {
                    this.disappear(node);
                }
            }
            this.arrangeAll();
        }
        // pay attention to (div)
        attention(div) {
            this.attentionNode = this.get(div);
            //console.log("attention:", user(this.attentionNode!.div.id));
        }
        // animates to nothing over (time) seconds, then closes
        disappear(node, time = 0.25) {
            this.highlightFunction(node.linkDiv, false);
            let div = node.div;
            if (node.linkDiv) {
                this.removeArrow(node.linkDiv, div);
            }
            div.style.width = div.scrollWidth + "px";
            div.style.height = div.scrollHeight + "px";
            div.style.transition = `width ${time}s, height ${time}s`;
            div.offsetWidth;
            div.offsetHeight;
            div.style.width = '0';
            div.style.height = '0';
            setTimeout(() => { this.closeSingleNode(node); }, (time - 0.1) * 1000);
        }
        allChildren(node) {
            let result = [node];
            for (let n of this.nodeMap.values()) {
                if (n.parentDiv == node.div)
                    result.push(...this.allChildren(n));
            }
            return result;
        }
        closeSingleNode(node) {
            this.nodeMap.delete(node.div);
            node.div.remove();
            node.remove();
        }
        reopen(id, linkID, parentID, userObj, emphasize = false) {
            let toOpen = [];
            // is the node already open? if so, move it to the new link/parent
            let existingDiv = this.find(id);
            if (existingDiv) {
                let node = this.get(existingDiv);
                if (node) {
                    node.reassignTo(linkID, parentID);
                }
                return;
            }
            // is the node in reopen-list or closed-list? If so, use old userObj
            let i = this.reopenNodes.findIndex(n => n.id == id); // is new node in reopenNodes?
            if (i >= 0) {
                toOpen = this.reopenNodes.splice(i, 1);
            }
            else {
                i = this.closedNodes.findIndex(n => n.id == id);
                if (i >= 0) {
                    toOpen = this.closedNodes.splice(i, 1);
                }
            }
            // if not, use the userObj passed in
            if (i == -1) {
                toOpen = [{ id: id, link: linkID !== null && linkID !== void 0 ? linkID : "null",
                        parent: parentID !== null && parentID !== void 0 ? parentID : "null",
                        emphasize: emphasize,
                        userObj: userObj }];
            }
            // grab all nodes from reopenNodes whose parents are in (tOpen)
            let iCheck = 0;
            while (iCheck < toOpen.length) {
                const p = toOpen[iCheck++];
                let remaining = [];
                for (let c of this.reopenNodes) {
                    if (c.parent == p.id) {
                        toOpen.push(c);
                    }
                    else {
                        remaining.push(c);
                    }
                }
                this.reopenNodes = remaining;
            }
            // and open them
            this.openJsonNodeList(toOpen);
            this.attentionNode = this.get(this.find(id));
            //console.log("attention:", user(this.attentionNode!.div.id));
        }
        // opens a new node, generates the HTML
        open(id, linkID, parentID, userObj, emphasize = false) {
            if (this.find(id))
                return; // don't make one if exists already
            let div = this.htmlFunction(id, userObj);
            div.style.transition = 'max-width 0.5s, max-height 0.5s, background-color 0.5s';
            let linkDiv = null;
            if (linkID != "" && parentID != "") {
                let parentDiv = this.find(parentID);
                if (parentDiv)
                    linkDiv = this.find(linkID, parentDiv);
                else
                    linkDiv = null;
            }
            if (linkDiv) {
                this.highlightFunction(linkDiv, true);
            }
            let node = this.add(div, linkDiv, userObj);
            if (emphasize) {
                node.emphasize = true;
            }
        }
        reset() {
            for (let i = 1; i < this.columns.length; i++) {
                for (let node of this.columns[i]) {
                    this.closeSingleNode(node);
                }
            }
            this.columns.splice(1, this.columns.length - 1);
            this.reopenNodes = [];
        }
        openJson(obj) {
            this.openJsonNodeList(obj.nodes);
            this.closedNodes = obj.closedNodes;
            this.reopenNodes = obj.reopenNodes;
            //console.log("closed nodelist:", this.reopenNodes);
            this.xScroll = obj.xScroll;
            this.yScroll = obj.yScroll;
            scrollTo(this.xScroll, this.yScroll);
        }
        openJsonNodeList(nodesJson) {
            for (let n of nodesJson) {
                this.open(n.id, n.link, n.parent, n.userObj, n.emphasize);
            }
        }
        // adds a div to the manager, and to the container div
        add(div, link, userObj = null) {
            this.container.appendChild(div);
            let parentDiv = (link) ? this.findDivContainingLink(link) : null;
            let xTarget = 0;
            let yTarget = 0;
            if (link && parentDiv) {
                const prect = rect(parentDiv);
                const brect = rect(link);
                const crect = rect(div);
                xTarget = brect.left;
                yTarget = ((brect.top + brect.bottom) / 2) - (crect.height() / 2);
            }
            else {
                const crect = rect(div);
                xTarget = crect.left + 150;
                yTarget = (window.innerHeight / 2) - (crect.height() / 2) - 32;
            }
            let node = new Node(this, div, link, parentDiv, userObj);
            node.setTargetPos(xTarget, yTarget);
            node.setPos(xTarget, yTarget);
            this.nodeMap.set(div, node);
            if (link && parentDiv) {
                this.addArrow(link, parentDiv, div);
            }
            this.arrangeAll(); // todo: call this every frame
            return node;
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
            this.sortColumns();
            let rootNode = this.columns[0][0];
            let crect = rect(rootNode.div);
            rootNode.setTargetPos(150, (window.innerHeight / 2) - (crect.height() / 2) - 32);
            let xPos = this.xMax(this.columns[0]);
            for (let i = 1; i < this.columns.length; i++) {
                let groups = this.splitColumnIntoGroups(i);
                for (let group of groups) {
                    this.spaceNodesInGroup(group, xPos);
                }
                this.spaceGroupsVertically(groups);
                xPos = this.xMax(this.columns[i]);
            }
            const widthInPixels = getBodyWidth();
            const newWidth = Math.max(window.innerWidth, xPos);
            document.body.style.width = `${newWidth}px`;
        }
        // sort nodes within each column by link order
        sortColumns() {
            for (let col of this.columns) {
                col.sort((a, b) => ((a.linkIndex > b.linkIndex) ? 1 : ((a.linkIndex < b.linkIndex) ? -1 : 0)));
            }
        }
        // right edge of column
        xMax(nodes) {
            let x = 0;
            for (const node of nodes) {
                x = Math.max(x, node.targetRect().right + (this.padding * 2));
            }
            return x;
        }
        // top edge of colum at xPos, or null if none intersect
        yRange(xPos) {
            for (let i = 0; i < this.columns.length; i++) {
                let xMin = Infinity;
                let xMax = -1;
                let yBottom = -1;
                let yTop = Infinity;
                for (let node of this.columns[i]) {
                    const r = rect(node.div);
                    xMin = Math.min(r.left, xMin);
                    xMax = Math.max(r.right + this.padding * 2, xMax);
                    yTop = Math.min(r.top, yTop);
                    yBottom = Math.max(r.bottom, yBottom);
                }
                if (xMin <= xPos && xMax >= xPos) {
                    return [yTop, yBottom];
                }
            }
            return [null, null];
        }
        // update
        update() {
            if (this.anyNodeSizeChanged()) {
                this.arrangeAll();
            }
            this.updateCanvas();
            this.updateScroll();
            for (let node of this.nodeMap.values()) {
                node.update();
            }
            this.updateArrows();
        }
        updateCanvas() {
            let bounds = new Rect(0, 0, window.innerWidth, window.innerHeight);
            let padding = 10;
            // Calculate canvas rect based on node positions/sizes
            // note: bounds may be negative, that's fine
            for (const node of this.nodeMap.values()) {
                const r = node.targetRect();
                bounds.left = Math.min(bounds.left, r.left - padding);
                bounds.top = Math.min(bounds.top, r.top - padding);
                bounds.right = Math.max(bounds.right, r.right + padding);
                bounds.bottom = Math.max(bounds.bottom, r.bottom + padding);
            }
            bounds.left = Math.floor(bounds.left);
            bounds.top = Math.floor(bounds.top);
            bounds.right = Math.ceil(bounds.right);
            bounds.bottom = Math.ceil(bounds.bottom);
            if (bounds.left == this.canvasRect.left &&
                bounds.top == this.canvasRect.top &&
                bounds.right == this.canvasRect.right &&
                bounds.bottom == this.canvasRect.bottom)
                return;
            const deltaX = bounds.left - this.canvasRect.left;
            const deltaY = bounds.top - this.canvasRect.top;
            this.canvasRect = bounds;
            const xSize = this.canvasRect.width();
            const ySize = this.canvasRect.height();
            if (xSize != this.container.offsetWidth ||
                ySize != this.container.offsetHeight) {
                this.container.style.width = `${xSize}px`;
                this.container.style.height = `${ySize}px`;
                document.body.style.width = `${xSize}px`;
                document.body.style.height = `${ySize}px`;
                this.arrowsSVG.setAttribute('viewBox', `0 0 ${xSize} ${ySize}`);
                this.arrowsSVG.style.width = `${xSize}px`;
                this.arrowsSVG.style.height = `${ySize}px`;
            }
            // If any code-container div has drifted upwards or left, adjust all divs
            if (deltaX != 0 || deltaY != 0) {
                for (let child of Array.from(this.container.children)) {
                    if (child instanceof HTMLElement) {
                        let div = child;
                        div.style.left = `${div.offsetLeft - deltaX}px`;
                        div.style.top = `${div.offsetTop - deltaY}px`;
                    }
                }
                window.scrollTo(window.scrollX - deltaX, window.scrollY - deltaY);
            }
        }
        updateScroll() {
            if (this.attentionNode &&
                (this.attentionNode.sizeChanged() ||
                    this.attentionNode.moving())) {
                if (this.attentionNode.div.parentElement) {
                    [this.xScrollTarget, this.yScrollTarget] = scrollToView(this.attentionNode.div);
                }
                else {
                    this.attentionNode = null;
                }
            }
            if (window.scrollX == this.xScroll &&
                window.scrollY == this.yScroll) {
                if (this.scrolling && this.attentionNode) {
                    this.attentionNode = null;
                }
                this.scrolling = false;
            }
            else {
                this.scrolling = true;
            }
            this.xScroll = window.scrollX;
            this.yScroll = window.scrollY;
        }
        // ------------------ private ----------------------------
        // returns the Node associated with a top-level div
        get(div) {
            let node = this.nodeMap.get(div);
            return node ? node : null;
        }
        // returns the user-obj associated with top-level div
        getUserObj(div) {
            let node = this.get(div);
            return node ? node.userObj : null;
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
        // returns true if the size of any node changed this frame
        anyNodeSizeChanged() {
            for (let node of this.nodeMap.values()) {
                if (node.sizeChanged())
                    return true;
            }
            return false;
        }
        // group nodes that have the same parent
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
                sumHeight += node.targetRect().height();
            }
            // then find the centerline of the group's parent
            const parentDiv = group[0].parentDiv;
            const parentNode = this.get(parentDiv);
            const parentRect = parentNode.targetRect();
            const centerLine = (parentRect.top + parentRect.bottom) / 2;
            // now space group out vertically around the centerline
            let yPos = centerLine - (sumHeight / 2);
            let pivot = (group.length - 1) / 2;
            for (let i = 0; i < group.length; i++) {
                let node = group[i];
                let xOffset = (i < pivot) ? i : (pivot - (i - pivot));
                node.setTargetPos(xPos + (xOffset * this.padding), yPos);
                yPos += node.targetRect().height() + this.padding;
            }
        }
        // space groups out vertically so they don't overlap
        spaceGroupsVertically(groups) {
            if (groups.length == 0)
                return;
            if (groups.length == 1) {
                this.centerGroupVertically(groups[0]);
            }
            else {
                const even = (groups.length % 2) == 0;
                const iPivot = Math.floor((groups.length - 1) / 2);
                if (even) {
                    this.checkGroups(groups[iPivot], groups[iPivot + 1], 0.5);
                }
                for (let i = iPivot; i > 0; i--) {
                    this.checkGroups(groups[i - 1], groups[1], 0);
                }
                for (let i = iPivot; i < groups.length - 1; i++) {
                    this.checkGroups(groups[i], groups[i + 1], 1);
                }
            }
        }
        // center a group vertically around the center-line of its parent
        centerGroupVertically(group) {
            const top = group[0].targetRect().top;
            const bottom = group[group.length - 1].targetRect().bottom;
            const height = (bottom - top);
            const parentRect = group[0].parentNode.targetRect();
            const centerLine = (parentRect.top + parentRect.bottom) / 2;
            const newTop = centerLine - (height / 2);
            const yMove = newTop - top;
            this.moveGroupVertically(group, yMove);
        }
        // if two groups overlap, move them apart until they don't; mix determines which moves most
        checkGroups(groupA, groupB, mix) {
            const bottomA = groupA[groupA.length - 1].targetRect().bottom;
            const topB = groupB[0].targetRect().top;
            const overlap = (bottomA + (this.padding * 2)) - topB;
            if (overlap < 0)
                return;
            const moveA = -(overlap * (1 - mix));
            const moveB = overlap * mix;
            this.moveGroupVertically(groupA, moveA);
            this.moveGroupVertically(groupB, moveB);
        }
        // moves all nodes in a group vertically by (yMove)
        moveGroupVertically(group, yMove) {
            for (let node of group) {
                node.yTarget += yMove;
            }
        }
        //----------------------------- internal --------------------------------
        // add a Node to the correct column, keep them sorted vertically
        addToColumnArray(node) {
            while (this.columns.length <= node.column) {
                this.columns.push([]);
            }
            this.columns[node.column].push(node);
        }
        //----------------------------- arrows ---------------------------------
        // set up the SVG arrow renderer
        initArrows() {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.position = 'absolute';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '1000';
            this.container.appendChild(svg);
            return svg;
        }
        addArrow(linkDiv, parentDiv, div) {
            let arrow = new Arrow(linkDiv, parentDiv, div, false);
            if (!this.arrowMap.has(linkDiv)) {
                this.arrowMap.set(linkDiv, []);
            }
            this.arrowMap.get(linkDiv).push(arrow);
            arrow.addToSVG(this.arrowsSVG);
        }
        removeArrow(linkDiv, div) {
            let arrows = this.arrowMap.get(linkDiv);
            if (arrows) {
                const index = arrows.findIndex(a => a.div === div);
                if (index >= 0) {
                    let arrow = arrows[index];
                    arrows.splice(index, 1);
                    arrow.removeFromSVG();
                }
            }
        }
        updateArrows() {
            for (let arrows of this.arrowMap.values()) {
                for (let arrow of arrows) {
                    arrow.update();
                }
            }
        }
        json() {
            let node = this.columns[0][0];
            let nodes = this.allChildren(node);
            return { xScroll: this.xScroll, yScroll: this.yScroll,
                nodes: nodes.map(node => node.json()),
                closedNodes: this.closedNodes,
                reopenNodes: this.reopenNodes };
        }
    }
    OldGraph.GraphView = GraphView;
    // stores information about a div we're managing
    class Node {
        constructor(view, div, linkDiv, parentDiv, userObj = null) {
            this.parentNode = null; // the parent node corresponding to parentDiv
            this.column = 0; // column we're in (first one zero)
            this.x = 0; // position right now
            this.y = 0; // ..
            this.xTarget = 0; // where we're trying to get to, to avoid others
            this.yTarget = 0; // ..
            this.width = 0; // width on last frame, so we can react to animation
            this.height = 0; // ..
            this.emphasize = false; // if set, comes forward in the stack
            this.linkIndex = ""; // sort index for vertical ordering
            this.graph = view;
            this.userObj = userObj;
            if (parentDiv === undefined) {
                console.log("WARNING: parentDiv undefined!");
            }
            this.div = div;
            this.linkDiv = linkDiv;
            this.parentDiv = parentDiv;
            if (parentDiv) {
                this.column = this.graph.get(parentDiv).column + 1;
                this.parentNode = this.graph.get(parentDiv);
                this.linkIndex = this.computeLinkIndex();
            }
            this.graph.addToColumnArray(this);
            this.shadow = element(`<div class="shadow"></div>`);
            this.graph.container.appendChild(this.shadow);
            this.width = div.clientWidth;
            this.height = div.clientHeight;
        }
        remove() {
            this.graph.columns[this.column] = this.graph.columns[this.column].filter(item => item !== this);
            this.shadow.remove();
        }
        setTargetPos(x, y) {
            this.xTarget = x;
            this.yTarget = y;
        }
        setPos(x, y) {
            this.x = x;
            this.y = y;
            this.div.style.left = `${x - this.graph.canvasRect.left}px`;
            this.div.style.top = `${y - this.graph.canvasRect.top}px`;
        }
        targetRect() {
            const r = rect(this.div);
            return new Rect(this.xTarget, this.yTarget, this.xTarget + r.width(), this.yTarget + r.height());
        }
        sizeChanged() {
            return (this.width != this.div.clientWidth ||
                this.height != this.div.clientHeight);
        }
        moving() {
            return (this.x != this.xTarget || this.y != this.yTarget);
        }
        reassignTo(linkID, parentID) {
            this.graph.columns[this.column] = this.graph.columns[this.column].filter(item => item !== this);
            if (this.linkDiv) {
                this.graph.removeArrow(this.linkDiv, this.div);
                this.graph.highlightFunction(this.linkDiv, false);
            }
            this.parentDiv = this.graph.find(parentID);
            this.parentNode = this.graph.get(this.parentDiv);
            this.linkDiv = this.graph.find(linkID, this.parentDiv);
            this.column = this.parentNode.column + 1;
            this.graph.addToColumnArray(this);
            this.graph.addArrow(this.linkDiv, this.parentDiv, this.div);
        }
        update() {
            const dx = this.xTarget - this.x;
            const dy = this.yTarget - this.y;
            const x = (Math.abs(dx) <= 1) ? this.xTarget : (this.x + dx * 0.1);
            const y = (Math.abs(dy) <= 1) ? this.yTarget : (this.y + dy * 0.1);
            this.setPos(x, y);
            this.updateShadow();
            this.width = this.div.clientWidth;
            this.height = this.div.clientHeight;
        }
        computeLinkIndex() {
            let result = "";
            let digit = 1;
            let node = this;
            while (node) {
                if (node.linkDiv) {
                    let i = getChildNodeIndex(node.linkDiv).toString().padStart(3, '0');
                    result = (result == "") ? i : i + '.' + result;
                }
                node = node.parentNode;
            }
            return result;
        }
        updateShadow() {
            const sr = rect(this.div);
            const wh = window.innerHeight;
            let sy = (this.emphasize) ? (sr.bottom + 150) : (sr.bottom + 50);
            sy = Math.max(wh / 2 + 20, sy);
            this.shadow.style.left = `${sr.left}px`;
            this.shadow.style.top = `${sy}px`;
            this.shadow.style.width = `${sr.width()}px`;
            this.shadow.style.height = `1px`;
            this.shadow.style.zIndex = `-1`;
        }
        json() {
            var _a, _b, _c, _d;
            return { id: this.div.id,
                link: (_b = (_a = this.linkDiv) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "null",
                parent: (_d = (_c = this.parentDiv) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : "null",
                emphasize: this.emphasize,
                userObj: this.userObj };
        }
    }
    class Arrow {
        constructor(linkDiv, parentDiv, div, dashed) {
            this.drawRect = new Rect(0, 0, 0, 0);
            this.xVertical = 0;
            this.linkDiv = linkDiv;
            this.parentDiv = parentDiv;
            this.div = div;
            this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.path.setAttribute('stroke', '#87bdb5');
            this.path.setAttribute('stroke-width', '3');
            this.path.setAttribute('stroke-opacity', '1');
            this.path.setAttribute('fill', 'transparent');
            if (dashed) {
                this.path.setAttribute('stroke-dasharray', '8,4');
            }
        }
        addToSVG(svg) {
            svg.appendChild(this.path);
        }
        removeFromSVG() {
            this.path.remove();
        }
        update() {
            this.initDrawRect();
            this.updatePath();
        }
        initDrawRect() {
            let parentDiv = this.linkDiv.parentElement;
            if (window.getComputedStyle(parentDiv).display == 'none') {
                parentDiv = parentDiv.parentElement;
            }
            const parentRect = rect(parentDiv);
            const linkRect = rect(this.linkDiv);
            const targetRect = rect(this.div);
            const xFrom = parentRect.right + 2;
            let yFrom = (linkRect.top + linkRect.bottom) / 2;
            yFrom = Math.max(yFrom, parentRect.top + 12);
            yFrom = Math.min(yFrom, parentRect.bottom - 12);
            const xTo = targetRect.left - 2;
            let yTo = yFrom;
            yTo = Math.max(yTo, targetRect.top + 12);
            yTo = Math.min(yTo, targetRect.bottom - 12);
            this.drawRect = new Rect(xFrom, yFrom, xTo, yTo);
            this.xVertical = xTo - 24;
        }
        updatePath() {
            /*if (!document.body.contains(this.linkDiv) || !document.body.contains(this.div)) {
                this.removeFromSVG();
                return;
            }*/
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
        }
    }
})(OldGraph || (OldGraph = {}));
