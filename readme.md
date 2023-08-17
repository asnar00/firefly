ᕦ(ツ)ᕤ
# firefly

firefly is an experimental GPT-assisted IDE that runs in the browser.

## Big Ideas

- view code as a tree / graph, since that's what it is
- each class / method / function gets a single "card"
- cards float in 3D space:
    - left-to-right is call-stack depth (a calls b means a is to the left b)
    - top-to-bottom is call order (a called before b means a is above b)
    - far-to-near is attention (things we're paying attention to are closer)
- whenever a card calls or refers to another card, the code shows a hyperlink
- clicking a hyperlink in a caller opens the card to the right of the caller
- this can also work backwards; i.e. can open all cards that depend on this one, to the left
- edit code in-card, automatically updates the correct lines of the source file
- text and semantic search across all versions of code

## Really big ideas

### polyglot

- goal: to deliver a consistent, elegant workflow across multiple languages
- each card can hold multiple code versions;
- each version can be in a different language
- "pseudocode" is also considered a language
- use GPT to translate between different languages
- thus allowing any code to run "anywhere" in the stack
- boundaries between different languages are "abstracted away"

### invisible glue

When mating different languages into the same codebase, there's always glue layers;

- typescript <-> (fetch/serve) <-> python
- C++ <-> (reflection) <-> python
- C++ <-> (directX) <-> hlsl
- C++ <-> (cuda) <-> gpu

A really interesting idea is to make the editor aware of this glue, and "get rid of it";
i.e. when A calls B, we don't care which language they're in.

The actual code will of course have to call the glue boilerplate;
but the *link* can be made direct, as long as the editor understands the boilerplate.
Most likely, we can actually just use a comment or decoration, or something clever with the function names.



TODAY:
- python classes and methods
- deal with overlapping Dependency ranges
- do the full supercompact tree view. It'll rock.
- embedding service! infrastructure ahoy! needs a super overhaul.

## TODO

### visual / UI
- conflicting dependencies (constructor vs classname) DONE
- supercompact view: want to see all the code !!! 
- class view: don't want to see all the code, just headers
- want to see class.property etc not just property
- restrict size of expanded
- animate size to make it less jarring
- reopen old trees
- make sure buttons get highlighted properly
- serialise session
- smooth motion
- noob comes with you
- open/close logic for multiple references
- loopback/recursion
- some way of viewing "boundaries" eg. client/server/python
- open dependents
- tree extends upwards
- session persistence
- multiple sessions
- restore scroll position on compact DONE
- transitive close DONE
- better inter-group position negotiation DONE
- "focus in" on a node DONE
- shadows DONE
- arrows DONE
- compact view DONE

### search / GPT
- symbolic search
- semantic search
- ask any question about current view

### importing logic
- cross-project dependencies
- python classes / properties / methods NEXT
- multi-file imports DONE
- mixed codebase DONE
- language server
- tests

### edit/build/debug
- live coding
- auto-generate instrumented code
- variable assignment history
- performance monitoring
- doc/spec/etc (zerp functionality)

### history/collaboration
- live/nonlive collaboration
- plug into github repo
- history viewing


____________________
Lets think about multiple languages here in this example.

1. We want to be able to define the same name in ts and py, and they shouldn't clash.
   We can do this in two ways:
   a- by having the same ID, but not allowing dependencies to go cross-language
   b- by decorating the ID so they're actually different bits of code.

so let's say we have 

    // blah.ts
    function myFunc(a: number) {}

    # blah.py
    def myFunc(a: int): ...

Scenario 1: these are the same cards because they have the same name.
we have

    id: function_myFunc
        code[0](ts): // blah.ts function ...
        code[1](py): # blah.py def ...

And we can only make a connection between code blocks in the same language.

Scenario 2 : these are different functions because they could be totally different 
and do totally different things, eg. be part of separate libraries written by unrelated people.
So the name clash is just a coincidence, and they should be in different namespaces.

So we have two cards:

    id: ts_function_myFunc
        code[0](ts): // blah.ts etc

    id: py_function_myFunc
        code[0](py): # blah.py etc

Now here scenario 2 is obviously the correct one.

So now let's think about the situation where we want to "call" a python function from ts.

    // client.ts

    function main() {
        myFunc(2);
    }

    function myFunc(a: int) {
        remote("@firefly_server", "myFunc", { a: 2 });          // endpoint, function, args
    }

    ---------------------

    // firefly.py

    def firefly_server(request) -> response:
        func = request['func']
        args = request['args']
        if func == 'myFunc': return myFunc(args['a'])
        elif etcetc.

    def myFunc(a: int) ->
        etcetc.

So we could just modify the dependency a *little bit* to allow cross-language connection, by searching for "@firefly_server".

    ts_main => ts_myFunc => py_firefly_server => py_myFunc

This would actually be a pretty good place to get to, I think. 



