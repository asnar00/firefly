type widget = any;

// make a cardView widget
function cardView(card: Card) : widget {
    let view= group("cardView", {
        titleBar: group("titleBar", {
            text: text("fixed-bold", shortName(card)),
            buttons: group("buttons", {
                left: button("left", () => { toggleCallees(card);}),
                right: button("right", () => { toggleCallers(card);}),
                close: button("close", () => { close(view);})
            })
        }),
        content: group("cardContent", {
            title: text("bold", card.title),
            purpose: text("normal", card.purpose),
            pseudocodeHeading: text("bold", "Pseudocode"),
            pseudocode: text("pseudocode", card.pseudocode),
            codeHeading: text("bold", "Code"),
            code: text("code", card.code[0].text)
        })
    });
    listen(view.titleBar.div, "mouseenter", () => { show(view.titleVar.buttons.div); });
    listen(view.titleBar.div, "mouseleave", () => { hide(view.titleVar.buttons.div); });
    return view;
}

// make a text widget
function text(style: string, content: string) : widget {
    return { div: element(`<div style="${style}">${content}</div>`) };
};

// make a button widget
function button(icon: string, func: Function) : widget {
    let div = element(`<div style="button" etc>whatnot</div>`);
    listen(div, "onClick", func);
    return { div: div };
}

// make a group widget from a bunch of named stuff
function group(style: string, elements: any) : widget {
    let g : any = { div: element(`<div style="${style}"></div>`) };
    for (let key in elements) {
        if (elements.hasOwnProperty(key)) {  // This check is important to filter out properties from the prototype
            let value = elements[key];
            g[key] = value;
            g.div.append(value.div);
        }
    }
    return g;
}

// show a div
function show(div: HTMLElement) {
    div.style.visibility = 'visible';
}

// hide a div
function hide(div: HTMLElement) {
    div.style.visibility = 'hidden';
}

// close a widget (does nothing for now)
function close(w: widget) {
}
