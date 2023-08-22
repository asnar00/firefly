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

NEXT STEPS:
- had a good chat with Evan + Dean - lots of food for thought. 
- Key observation is that we can use firefly as a sort of "platform" : to view line-number-led console readout data in situ, within a graph, and visualise any kind of data.
- Idea came up of interfacing with the Cody system (steered by Steve Yegge, quite mature, but very IDE centric - but it seems like they have some good stuff). Might be a quick way of doing this, but actually I think I want to build that part myself.
- Same with interfacing with vscode - we could use vscode as the editor within each card. 
- I think other people could come along and do those later, if I make it open enough.

So my forward direction is: 
- code querying is job 1, which means microservice infrastructure is first.
- then we implement vector search, openAI embedding, API, all that
- then eventually language server is the way to go

As seductive as it is to interface with vscode and other APIs, I think I want to keep things super local and build things myself. The key reasons are: 
1- simplicity
2- freedom of movement
3- understanding
4- control

In general, we should keep up forward movement speed, rather than polishing for the sake of polishing.
I think it would be good to create a generic parser that can extract symbols and types, and particularly resolve Class.method properly.
But it's also totally fine to resolve ambiguity in other ways.
The key thing is to get capability with vector search, embeddings, document understanding, and the agent.
Now let's do service registry.


TODAY:
- titles DONE
- class/subclass map
- body resize DONE
- github repo download
- journal back up and running

yesterday:
- python classes and methods DONE
- deal with overlapping Dependency ranges DONE
- do the full supercompact tree view. It'll rock. NEXT
- embedding service! infrastructure ahoy! needs a super overhaul.

## TODO

### infrastructure

- tidy up the server code to use the same library of functions
- auto-restart of the subsidiary servers (and indeed the main server)
- proper logging


### visual / UI
- titlebars per node with Class.method() names
- tree extends upwards and downwards as far as necessary
- map class relationships, use it to open multi-class method implementations (Language.importx example)
- conflicting dependencies (constructor vs classname) DONE
- supercompact view: want to see all the code !!! 
- class view: don't want to see all the code, just headers
- want to see class.property etc not just property
- restrict size of expanded DONE
- animate size to make it less jarring DONE
- reopen old trees DONE
- make sure buttons get highlighted properly DONE
- serialise session DONE
- smooth motion DONE
- noob comes with you
- open/close logic for multiple references
- loopback/recursion
- some way of viewing "boundaries" eg. client/server/python
- open dependents
- session persistence DONE
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
- python classes / properties / methods DONE
- multi-file imports DONE
- mixed codebase DONE
- download github repo !
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
Disambiguation: we need to coalesce to an array of dependencies;
or we need to disambiguate in the client.
I'd rather do it in the data, TBH.
In the absence of a language server, we have to guess, and hold all guesses.


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
        remote("@firefly").call("myFunc", { a: 2 });          // endpoint, function, args
    }

    remote("@firefly").myFunc(2);       => ideally, fully type-checked.
    And this works because we DYNAMICALLY INCLUDE IT? Or do we read it from the header file?
    
    embeddings.set(key, value) { generate vec(key); store(value); }
    embeddings.get(query) => [ {value, confidence} ]

    We need to really consider this architecture properly.
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


So let's create something called service.py.
How do we do that?
Let's look into generators.
