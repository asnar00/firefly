# title

# purpose

# pseudocode

# original code

```ts
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
```

# callees

```
id: method_Graph_findDiv
title: find div given identifier
prototype: Graph.findDiv(id: string) : HTMLElement | null

id: function_callees
title: returns a list of all cards called by (card) [callable only]
prototype: function callees(card: Card) : Card[] 

id: function_getOpenDivs
title: returns list of open DIVs for any list of cards
prototype: function getOpenDivs(cards: Card[]) : HTMLElement[] 

id: function_findLinkButtons
title: returns array of all buttons in "div" that link to "toDiv"
prototype: function findLinkButtonsTo(toDiv: HTMLElement, fromDiv: HTMLElement) : HTMLElement[]

id: function_highlightLink
title: sets highlight style on or off for a link button
prototype: function highlightLink(linkDiv: HTMLElement, highlight: boolean)

id: method_Graph_remove
title: remove node and dependents
prototype: Graph.remove(div: HTMLElement)

id: function_openCallees
title: opens all cards called by (card)
protoype: function openCallees(card: Card)

id: function_scrollToView
title: scroll main window to ensure that all (cards) are in view
protoype: function scrollToView(cards: Card[]) 

id: class_Card
title: represents a piece of code (class, method, function, variable)
prototype: class Card 

id: class_Graph
title: manages a graph of nodes and edges, arranges them in space
prototype: class Graph

```

# callers

# notes
