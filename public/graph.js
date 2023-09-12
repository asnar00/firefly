// ᕦ(ツ)ᕤ
// graphview.ts
// author: asnaroo, with help from gpt4
// manages a graph of nodes and edges
import { getChildNodeIndex } from "./util.js";
import { rect } from "./util.js";
import { Rect } from "./util.js";
import { Vec2 } from "./util.js";
import { resizeDiv } from "./util.js";
import { positionDiv } from "./util.js";
var s_graph;
// manages a graph of nodes and edges, arranges them in space
export class Graph {
    constructor(container) {
        this.closed = []; // closed by user
        this.reopen = []; // open children of closed nodes
        this.nodes = new Map(); // maps id => Node
        this.edges = new Map(); // maps sourceID_destID => Edge
        this.padding = 24; // used for everything
        this.rootNode = null; // fixed node around which all others are arranged
        this.forceArrange = false; // set this to cause an arrange-all on next update
        this.visitCount = 0; // monotonic increase: quick way to visit-count nodes
        this.columns = new NodeColumns(); // nodes sorted into columns
        this.container = container;
        s_graph = this;
        this.canvasRect = new Rect(0, 0, document.body.clientWidth, document.body.clientHeight);
        this.svg = this.createSVG();
    }
    // clear all nodes
    clear() {
        for (let node of this.nodes.values()) {
            this.remove(node.div);
        }
        this.requestArrange();
        this.rootNode = null;
        this.canvasRect = new Rect(0, 0, document.body.clientWidth, document.body.clientHeight);
    }
    // create a new node from a div, do nothing if exists  already
    node(div, userInfo = null) {
        let node = this.findNode(div);
        if (node)
            return node;
        node = new Node(div, userInfo);
        this.nodes.set(div.id, node);
        if (!this.rootNode) {
            this.setRootNode(node);
        }
        this.container.append(div);
        this.requestArrange();
    }
    // create a new edge from one div to another; or return existing
    edge(fromDiv, toDiv, userInfo = null) {
        let edge = this.findEdge(fromDiv, toDiv);
        if (edge)
            return edge;
        edge = new Edge(fromDiv, toDiv, userInfo);
        this.edges.set(`${fromDiv.id}_${toDiv.id}`, edge);
        this.findNode(fromDiv).edgesOut.push(edge);
        this.findNode(toDiv).edgesIn.push(edge);
        return edge;
    }
    // focus on a specific node; it keeps same position, others move around it
    focus(div) {
        let node = this.findNode(div);
        if (!node)
            return;
        if (this.rootNode != node)
            this.requestArrange();
        this.rootNode = node;
    }
    // find node given div
    findNode(div) {
        while (div && div.parentElement != s_graph.container) {
            div = div.parentElement;
        }
        if (!div)
            return null;
        let node = this.nodes.get(div.id);
        if (node)
            return node;
        else
            return null;
    }
    // given div somewhere down the tree, return top-level div (child of container)
    topLevelDiv(div) {
        let node = this.findNode(div);
        if (!node)
            return null;
        return node.div;
    }
    // given div, return user info attached to node
    userInfo(div) {
        let node = this.findNode(div);
        if (!node)
            return null;
        return node.userInfo;
    }
    // find div given identifier
    findDiv(id) {
        let node = this.findNodeFromID(id);
        if (node) {
            return node.div;
        }
        return null;
    }
    // find node given identifier
    findNodeFromID(id) {
        const elements = Array.from(this.container.querySelectorAll(`#${id}`));
        if (elements.length == 0)
            return null;
        for (let e of elements) {
            let node = this.findNode(e);
            if (node)
                return node;
        }
        return null;
    }
    // return source divs for all edges incoming to (div)
    findSourceDivs(div) {
        let node = this.findNode(div);
        if (!node)
            return [];
        let sourceDivs = [];
        for (let e of node.edgesIn) {
            sourceDivs.push(e.fromDiv);
        }
        return sourceDivs;
    }
    // find edge given source and dest IDs
    findEdge(fromDiv, toDiv) {
        let edge = this.edges.get(`${fromDiv.id}_${toDiv.id}`);
        if (edge)
            return edge;
        else
            return null;
    }
    // remove a node and all its edges
    remove(div) {
        let node = this.findNode(div);
        if (!node)
            return;
        for (let e of node.edgesIn) {
            this.removeEdge(e);
        }
        for (let e of node.edgesOut) {
            this.removeEdge(e);
        }
        this.nodes.delete(node.div.id);
        div.remove();
        node.delete();
        this.requestArrange();
    }
    // remove an edge
    removeEdge(edge) {
        this.edges.delete(`${edge.fromDiv.id}_${edge.toDiv.id}`);
        edge.delete();
    }
    // create SVG to draw all arrows
    createSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1000';
        this.container.appendChild(svg);
        return svg;
    }
    // set root node to (node), set position to center of window
    setRootNode(node) {
        this.rootNode = node;
        requestAnimationFrame(() => {
            this.rootNode.center();
        });
    }
    // request that rearrange should happen next frame
    requestArrange() {
        requestAnimationFrame(() => {
            this.forceArrange = true;
        });
    }
    // update; call every frame; pass the "focal" element that all others arrange around
    update() {
        if (this.nodes.size == 0)
            return;
        if (!this.rootNode)
            return;
        s_graph = this; // for all internal nodes to access this
        this.arrangeAll(); // figure out where nodes should be
        this.updateNodes(); // move nodes towards where they should be
        this.updateCanvas(); // make sure canvas/scroll/SVG are big enough
        this.updateEdges(); // make sure all edges draw correctly
    }
    arrangeAll() {
        if (!(this.forceArrange || this.anyNodeSizeChanged()))
            return;
        this.rootNode.center();
        this.sortNodesIntoColumns();
        this.columns.groupNodesByParent();
        this.columns.spaceNodesVerticallyInGroups();
        this.columns.spaceGroupsVertically();
        this.columns.spaceNodesHorizontally();
        this.forceArrange = false;
    }
    anyNodeSizeChanged() {
        for (let node of this.nodes.values()) {
            if (node.sizeChanged())
                return true;
        }
        return false;
    }
    // sort nodes into columns (horizontally and vertically)
    sortNodesIntoColumns() {
        this.newVisit();
        this.columns = new NodeColumns();
        this.columns.addNode(this.rootNode, 0);
        this.rootNode.sortIndex = "000";
        this.rootNode.visit();
        this.forwardPassRec(this.rootNode);
        this.backwardPassRec(this.rootNode);
        this.columns.sortVertically();
    }
    // for each outward edge, add to-node to the next column, recursively
    forwardPassRec(node) {
        for (const edge of node.edgesOut) {
            let toNode = edge.toNode();
            if (!toNode.visited()) {
                toNode.visit();
                toNode.parentNode = node;
                this.columns.addNode(toNode, node.iColumn + 1);
                this.forwardPassRec(toNode);
                const index = getChildNodeIndex(edge.fromDiv);
                toNode.sortIndex = node.sortIndex + '.' + index.toString().padStart(3, '0'); // call order
            }
        }
    }
    // for each inward edge, add from-node to the prev column, recursively
    backwardPassRec(node) {
        for (const edge of node.edgesIn) {
            let fromNode = edge.fromNode();
            if (!fromNode.visited()) {
                fromNode.visit();
                fromNode.parentNode = node;
                this.columns.addNode(fromNode, node.iColumn - 1);
                this.backwardPassRec(fromNode);
                fromNode.sortIndex = node.sortIndex + '.' + fromNode.div.id; // for now. TODO: do better
            }
        }
    }
    // we're about to start a new recursive visitation round
    newVisit() {
        this.visitCount++;
    }
    updateCanvas() {
        let bounds = new Rect(0, 0, window.innerWidth, window.innerHeight);
        let padding = 10;
        // Calculate canvas rect based on node positions/sizes
        // note: bounds may be negative, that's fine
        for (const node of this.nodes.values()) {
            bounds.extendToFit(node.targetRect(), this.padding);
        }
        bounds.round();
        if (bounds.isEqualTo(this.canvasRect))
            return;
        const delta = bounds.origin().minus(this.canvasRect.origin());
        this.canvasRect = bounds;
        const size = this.canvasRect.size();
        if (size.x != this.container.offsetWidth || size.y != this.container.offsetHeight) {
            resizeDiv(this.container, size);
            resizeDiv(document.body, size);
            this.svg.setAttribute('viewBox', `0 0 ${size.x} ${size.y}`);
            resizeDiv(this.svg, size);
        }
        // If any code-container div has drifted upwards or left, adjust all divs
        if (delta.x != 0 || delta.y != 0) {
            for (let child of Array.from(this.container.children)) {
                if (child instanceof HTMLElement) {
                    let div = child;
                    positionDiv(div, new Vec2(div.offsetLeft - delta.x, div.offsetTop - delta.y));
                }
            }
            window.scrollTo(window.scrollX - delta.y, window.scrollY - delta.y);
        }
    }
    updateNodes() {
        for (let node of this.nodes.values()) {
            node.update();
        }
    }
    updateEdges() {
        for (let edge of this.edges.values()) {
            edge.update();
        }
    }
    // returns min/max y coord of column intersecting (xPos)
    yRange(xPos) {
        for (let i = 0; i < this.columns.columns.length; i++) {
            let xMin = Infinity;
            let xMax = -1;
            let yBottom = -1;
            let yTop = Infinity;
            for (let node of this.columns.columns[i]) {
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
}
// manages a single div and all incoming and outgoing edges
export class Node {
    constructor(div, userInfo = null) {
        this.userInfo = null; // user info attached to node
        this.edgesIn = []; // edges coming in
        this.edgesOut = []; // edges going out
        this.pos = new Vec2(); // position now
        this.targetPos = new Vec2(); // position we want to get to
        this.size = new Vec2(); // size on last frame
        this.visitCount = 0; // visit-count
        this.iColumn = 0; // which column we're in
        this.sortIndex = ""; // key to sort vertically
        this.parentNode = null; // node we want to move with
        this.div = div;
        this.userInfo = userInfo;
    }
    update() {
        this.div = refind(this.div);
        const pos = this.pos.lerpTowards(this.targetPos, 0.1);
        this.setPos(pos);
        this.size.set(this.div.clientWidth, this.div.clientHeight);
    }
    setTargetPos(pos) {
        this.targetPos = pos;
    }
    setPos(pos) {
        this.pos = pos;
        this.div.style.left = `${pos.x - s_graph.canvasRect.left}px`;
        this.div.style.top = `${pos.y - s_graph.canvasRect.top}px`;
    }
    center() {
        let size = new Vec2(this.div.offsetWidth, this.div.offsetHeight);
        let wsize = new Vec2(window.innerWidth, window.innerHeight);
        let pos = (wsize.minus(size)).times(0.5);
        this.setTargetPos(pos);
        this.setPos(pos);
    }
    targetRect() {
        const r = rect(this.div);
        return new Rect(this.targetPos.x, this.targetPos.y, this.targetPos.x + r.width(), this.targetPos.y + r.height());
    }
    centerLine() {
        const r = this.targetRect();
        return (r.top + r.bottom) / 2;
    }
    sizeChanged() {
        return (this.size.x != this.div.clientWidth ||
            this.size.y != this.div.clientHeight);
    }
    moving() {
        return !(this.pos.equalsTo(this.targetPos));
    }
    delete() { }
    visit() { this.visitCount = s_graph.visitCount; }
    visited() { return (this.visitCount == s_graph.visitCount); }
}
// manages a single edge, and all arrange/draw logic
export class Edge {
    constructor(fromDiv, toDiv, userInfo = null) {
        this.userInfo = null; // user info
        this.fromDiv = fromDiv;
        this.toDiv = toDiv;
        this.userInfo = userInfo;
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.setAttribute('stroke', '#87bdb5');
        this.path.setAttribute('stroke-width', '3');
        this.path.setAttribute('stroke-opacity', '1');
        this.path.setAttribute('fill', 'transparent');
        this.addToSVG();
    }
    update() {
        let fromDiv = refind(this.fromDiv);
        let toDiv = refind(this.toDiv);
        if (!fromDiv || !toDiv) {
            this.removeFromSVG();
            return;
        }
        this.fromDiv = fromDiv;
        this.toDiv = toDiv;
        let parentDiv = fromDiv.parentElement;
        while (parentDiv && parentDiv.parentElement != s_graph.container) {
            parentDiv = parentDiv.parentElement;
        }
        const parentRect = rect(parentDiv);
        const linkRect = rect(fromDiv);
        const targetRect = rect(toDiv);
        const xFrom = parentRect.right + 2;
        let yFrom = (linkRect.top + linkRect.bottom) / 2;
        yFrom = Math.max(yFrom, parentRect.top + 12);
        yFrom = Math.min(yFrom, parentRect.bottom - 12);
        const xTo = targetRect.left - 2;
        let yTo = yFrom;
        yTo = Math.max(yTo, targetRect.top + 12);
        yTo = Math.min(yTo, targetRect.bottom - 12);
        const drawRect = new Rect(xFrom, yFrom, xTo, yTo);
        const xVertical = xTo - 24;
        const startX = drawRect.left;
        const startY = drawRect.top;
        const endX = drawRect.right;
        const endY = drawRect.bottom;
        const cornerRadius = Math.min(Math.abs(endY - startY) / 2, 10);
        const midX = xVertical;
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
    toNode() {
        return s_graph.findNode(this.toDiv);
    }
    fromNode() {
        return s_graph.findNode(this.fromDiv);
    }
    addToSVG() {
        s_graph.svg.appendChild(this.path);
    }
    removeFromSVG() {
        this.path.remove();
    }
    delete() {
        this.removeFromSVG();
    }
}
function refind(div) {
    if (s_graph.container.contains(div))
        return div;
    const elements = Array.from(s_graph.container.querySelectorAll(`#${div.id}`));
    if (elements.length == 0)
        return null;
    return elements[0];
}
class NodeColumns {
    constructor() {
        this.columns = []; // for each column, an array of nodes
        this.groups = []; // for each column, an array of node-groups (grouped by parent)
        this.zeroIndex = 0; // logical index [0] => physical index [zeroIndex], so we can do -ve logical indices
    }
    log() {
        console.log("COLUMNS:");
        for (let i = 0; i < this.columns.length; i++) {
            console.log("column", i - this.zeroIndex);
            for (const node of this.columns[i]) {
                console.log(" ", node.div.id);
            }
        }
    }
    addNode(node, iColumn) {
        let physIndex = this.zeroIndex + iColumn;
        if (physIndex >= this.columns.length) {
            while (this.columns.length <= physIndex) {
                this.columns.push([]);
            }
        }
        else if (physIndex < 0) {
            let pad = [];
            for (let i = 0; i < (-physIndex); i++) {
                this.columns.unshift([]);
            }
            this.zeroIndex -= physIndex;
            physIndex = 0;
        }
        this.columns[physIndex].push(node);
        node.iColumn = iColumn;
    }
    // sort vertically by sort key (call order or alpha, depends)
    sortVertically() {
        for (let col of this.columns) {
            col.sort((a, b) => ((a.sortIndex > b.sortIndex) ? 1 : ((a.sortIndex < b.sortIndex) ? -1 : 0)));
        }
    }
    // group nodes that have the same parent (-ve index ok)
    groupNodesByParent() {
        this.groups = [];
        for (let i = 0; i < this.columns.length; i++) {
            let groups = [];
            let column = this.columns[i];
            let parents = [];
            for (let node of column) {
                let parent = node.parentNode;
                if (parents.indexOf(parent) == -1) {
                    parents.push(parent);
                    let group = [];
                    for (let n of column) {
                        if (n.parentNode === parent) {
                            group.push(n);
                        }
                    }
                    groups.push(group);
                }
            }
            this.groups.push(groups);
        }
    }
    // vertically spaces nodes within each group to be as close to the centerline of their parent as possible
    spaceNodesVerticallyInGroups() {
        for (let groups of this.groups) {
            for (let group of groups) {
                let parent = group[0].parentNode;
                if (!parent)
                    continue;
                // first find the total height of the group, plus padding
                let sumHeight = (group.length - 1) * (s_graph.padding / 2);
                for (const node of group) {
                    sumHeight += node.targetRect().height();
                }
                // then find the centerline of the group's parent
                const parentRect = parent.targetRect();
                const centerLine = (parentRect.top + parentRect.bottom) / 2;
                // now space group out vertically around the centerline
                let yPos = centerLine - (sumHeight / 2);
                for (let i = 0; i < group.length; i++) {
                    let node = group[i];
                    node.targetPos.y = yPos;
                    yPos += node.targetRect().height() + (s_graph.padding / 2);
                }
            }
        }
    }
    // space groups so inter-group space is maintained, while keeping everyone as close to their parents as possible
    spaceGroupsVertically() {
        for (let groups of this.groups) {
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
    }
    // center a group vertically around the center-line of its parent
    centerGroupVertically(group) {
        const parent = group[0].parentNode;
        if (!parent)
            return;
        const top = group[0].targetRect().top;
        const bottom = group[group.length - 1].targetRect().bottom;
        const height = (bottom - top);
        const parentRect = parent.targetRect();
        const centerLine = (parentRect.top + parentRect.bottom) / 2;
        const newTop = centerLine - (height / 2);
        const yMove = newTop - top;
        this.moveGroupVertically(group, yMove);
    }
    // if two groups overlap, move them apart until they don't; mix determines which moves most
    checkGroups(groupA, groupB, mix) {
        const bottomA = groupA[groupA.length - 1].targetRect().bottom;
        const topB = groupB[0].targetRect().top;
        const overlap = (bottomA + (s_graph.padding * 2)) - topB;
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
            node.targetPos.y += yMove;
        }
    }
    // moves nodes horizontally
    spaceNodesHorizontally() {
        // compute widths
        let columnWidths = [];
        for (const column of this.columns) {
            let bounds = column[0].targetRect();
            for (const node of column) {
                bounds.extendToFit(node.targetRect());
            }
            columnWidths.push(bounds.width());
        }
        // rightwards pass from (zeroIndex+1)
        let xPos = this.columns[this.zeroIndex][0].targetPos.x;
        for (let i = this.zeroIndex + 1; i < this.columns.length; i++) {
            let prevWidth = columnWidths[i - 1];
            let xNew = xPos + prevWidth + (s_graph.padding * 2);
            let xAdd = 0;
            for (let group of this.groups[i]) {
                xAdd = Math.max(xAdd, this.setGroupFanoutPos(group, xNew, +1));
            }
            xPos = xNew + xAdd;
        }
        // leftwards pass from (zeroIndex-1)
        xPos = this.columns[this.zeroIndex][0].targetPos.x;
        for (let i = this.zeroIndex - 1; i >= 0; i--) {
            let width = columnWidths[i];
            let xNew = xPos - width - (s_graph.padding * 3);
            let xAdd = 0;
            for (let group of this.groups[i]) {
                xAdd = Math.max(xAdd, this.setGroupFanoutPos(group, xNew, -1));
            }
            xPos = xNew - xAdd;
        }
    }
    // sets group x-positions to "fan out" around parent centerline; returns padding or 0
    setGroupFanoutPos(group, xPos, dir) {
        if (group.length == 1) {
            group[0].targetPos.x = xPos;
            return s_graph.padding;
        }
        const parent = group[0].parentNode;
        const centerLine = parent.centerLine();
        const y0 = group[0].centerLine() - centerLine;
        const yn = group[group.length - 1].centerLine() - centerLine;
        const r0 = (y0 < 0) ? -1 : ((y0 > 0) ? 1 : 0);
        const rn = (yn < 0) ? -1 : ((yn > 0) ? 1 : 0);
        if (r0 < 0 && rn < 0) {
            for (let i = 0; i < group.length; i++) { // arrange around top-right quarter of a circle
                let r = i / (group.length - 1); // 0 .. 1
                let theta = (1 - r) * (Math.PI / 2); // pi/2 .. 0
                let c = Math.cos(theta);
                let x = xPos + (c * s_graph.padding * dir) + s_graph.padding;
                group[i].targetPos.x = x;
            }
        }
        else if (r0 > 0 && rn > 0) { // arrange around bot-right quarter of a circle
            for (let i = 0; i < group.length; i++) {
                let r = 1 - (i / (group.length - 1)); // 1 .. 0
                let theta = (1 - r) * (Math.PI / 2); // 0 .. pi/2
                let c = Math.cos(theta);
                let x = xPos + (c * s_graph.padding * dir) + s_graph.padding;
                group[i].targetPos.x = x;
            }
        }
        else {
            for (let i = 0; i < group.length; i++) { // arrange around right half of a circle
                let r = i / (group.length - 1); // 0 .. 1
                let theta = (Math.PI / 2) - r * (Math.PI);
                let c = Math.cos(theta);
                let x = xPos + (c * s_graph.padding * dir) + s_graph.padding;
                group[i].targetPos.x = x;
            }
        }
        return s_graph.padding * 2;
    }
}
