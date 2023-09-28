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

MORE PROGRESS:
- now reads github repo given author / repoName / token (for private)
- next: refactored graph system, backtrace properly.
- then: architect for "tools / viewers" so it's all nice and expandable
- each "tool" can read the output of any other tool, per-card, and look at context "around" any card (callers/callees)
- first goal: ask questions about the code, get intelligent answers
    - translate to pseudocode
    - documentation page: howto etc.
    - process other documentation pages!

- OK so I should have a nice fat database of every line of every file.


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

TODAY (travel day):
worked on cleaning up the search interface (all surface stuff, not really the time for any real meaty work).
search is now continuous (each keypress)

TODAY:
got semantic search workflow pass 1 running !
and our little noob friend comes with us on the journey - makes a big difference. Not sure his movement is quite right yet.
but it's fun, right amount of playfulness.
direction: keep building it for ME to use, don't care what anyone else wants.

things to improve:
- lexer-based dependency mapping
- reset view before open-sequence
- fold in exact search results, merge with semantic
- check why "embedding" buttons don't always work in search results
- shortcut keys for search, jump-to-result

TOMORROW: travel day, may not get much done
but if we do, priority is lexer-based dependency computation
- have to make that a bit more robust and correct.

next thing: compute "versions" from original version.
memoised prompts to GPT-4. That's got to be the way forward.

Thoughts on what to build with this:

clearly, build a WebGPU renderer that can render this, with proper shadows/lighting/radiosity and whatnot. Like in "Her".
how that interacts with the browser renderer I don't know, but I guess render HTML to some kind of offscreen buffer.
also good to use it to emulate the old FTR, hummingbird, mosquito, dragonfly codebases.

Thoughts on company structure.

1. nøøb is the R&D company
2. to see its top-secret demos, sign an NDA and play with the experiments
3. emulate old work and make it available (CV)
4. older experiments can also be released without NDA
5. express your mission statement through action.

## TODO

NEXT: 
- disambiguate calls by finding type DONE
- get inter-language callgraphs working again ("remote" barrier) DONE
- deal with ${} and {} in ts and py strings... annoying but anyway

### infrastructure

- tidy up the server code to use the same library of functions
- auto-restart of the subsidiary servers (and indeed the main server)
- proper logging
- github repo download
- journal back up and running

### search
- exact match in title, contents, mix in with semantic results
- reset tree view, or don't (use option-press)
- supercompact graph-to-target node
- work correctly with all nodes
- show shortest chain, all chains
- keep UI state in session
- proper lexer DONE

### visual / UI
- disambiguate references (.method, importname.method, etc)
- map class relationships, use it to open multi-class method implementations (Language.importx example)
- supercompact view: want to see all the code !!! 
- class view: don't want to see all the code, just headers
- open/close logic for multiple references
- loopback/recursion
- some way of viewing "boundaries" eg. client/server/python
- open dependents
- multiple sessions

- better inter-group position negotiation DONE
- "focus in" on a node DONE
- shadows DONE
- arrows DONE
- compact view DONE
- body resize DONE
- titles DONE
- python classes and methods DONE
- deal with overlapping Dependency ranges DONE
- noob comes with you DONE- restrict size of expanded DONE
- animate size to make it less jarring DONE
- reopen old trees DONE
- make sure buttons get highlighted properly DONE
- serialise session DONE
- smooth motion DONE
- want to see class.property etc not just property DONE
- titlebars per node with Class.method() names DONE
- tree extends upwards and downwards as far as necessary DONE
- conflicting dependencies (constructor vs classname) DONE
- restore scroll position on compact DONE
- session persistence DONE
- transitive close DONE

### search / GPT
- symbolic search
- semantic search
- ask any question about current view

### importing logic
- proper lexer DONE
- cross-project dependencies
- download github repo !
- language server
- tests
- python classes / properties / methods DONE
- multi-file imports DONE
- mixed codebase DONE

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


______________________________________________
This is fucking awesome.
BUT it has to be flawless and delightful, perfect in every detail.
The feature set can be small, but it has to be AWESOMELY GREAT.
ATTENTION TO DETAIL is literally everything.
Small, simple, and delightful. That's what this must feel like.

"Software as performance"

The discovery of a new piece of software is a journey, a story, a performance.
We need to exercise *showmanship*.

novice

Things to fix tomorrow: 

1- breadth-first layout sort-routine
2- vertical layout is so super fucked
3- it's coool, keep going!

Things to think about:
Watch this video:
https://www.youtube.com/watch?v=pJwR5pv0_gs

Obviously this is the "agent" structure that we want : multi-agent.
It also showed me how actually we want to able to look at JSON data within firefly;
the ability to display structured data like this in a neat way is a KILLER FEATURE.
So it should be possible to take any JSON file and make it into a graph.
In other words, JSON is just another tree structure.

OK, cool, that's interesting, hadn't thought of that.


So next step: fix all open/close logic bugs, make transitions beautiful.

___
DONE:
- close-multiple should fix link highlights (not sure how) DONE
- animation in and out DONE
- auto-scroll behaviour (scrollToView) DONE
- toggle up/down arrow buttons (close-all-callers/callees) DONE
- close should close dependents automatically DONE
- fix sort-index by tracing from the first column DONE

___
NEXT STEPS:

- persistence
- delta on import: only process changed cards
- generate what and how strings!
- generate pseudocode.

____
OK so now we're going to do METACODE.
title
purpose
steps

____
OK so that's done. Next we're going to build it into the interface.

states:

Minimised => Title => Purpose => Pseudocode => Code

deal is - always shows you the smallest size it can, showing you the max information.
all that stuff gets controlled with the style; there's just a different cardToHTML depending on what the mode is.

That's easy enough, right?

OK well let's just fucking try it, I guess.

We'll have two orthogonal parameters - select, and size.

Easypeasy. Let's go.

_ASIDE_

We need a good workflow for doing time-consuming bulk LLM tasks like this.
For instance: when we get a new repo, we should queue up all card uids for processing; show this progress somehow via a thought bubble or whatever.
But if we open a card that hasn't been processed yet, it should go to the front of the queue, we should get a busywheel, and then immediately see its pseudocode.
So for now we have a weird frankenstein non-workflow, but this has to be made ROBUST.

_SECOND GOOD IDEA_
The idea of a "hierarchy of models"; a task has to be done, expressed as a prompt; and we have an array of models, M0 .. Mn. 

M0 is like cheap, fast, immediate, local.
Mn is expensive, slow, high-latency, remote.

For any task, we kick off M0..Mn in parallel, understanding that they will deliver progressively better results at time t0, t1, ... tn.
We abstract this away, so when we ask for something that hasn't been computed yet, we get an immediate approximate result that improves progressively.

Something to consider.

______
OK so this is super messy.
We definitely need OpenAI caching, for speed as much as cost.
Then we do this joblist thing, and run it all again. Take a little time, get it right and do it properly.

_____
there's a general need to memoise large computations;
that's what's going on with embeddings, and with pseudocode generation.
We just kind of broke things, but the system should be self-healing;
right now I think we accidentally knocked out all class cards, but it should be possible to combine properly.
We'll fix that tomorrow and write the pseudocode generator properly. For now, press on.

SCRIBBLES:

There's a generic function doSomething(x)
and there are multiple versions doSomething_1(x), .. doSomething_N(x)

we want a framework that :

1- eventually computes doSomething_1(x) .. doSomething_N(x) for all x
2- when you call doSomething(x):
    2.1- check to see if any doSomething_i(x) is in the cache; if so, returns it
    2.2- if not, moves all doSomething_1..N(x) to the front of the queue
    2.3- as soon as results come in, adds them to the cache, and returns it

this works for *anything* - in particular, embeddings and pseudocode generation, but any LLM task we want to apply to everything

OK, carry on.
Next: toggle the contents of the card based on the card view content setting.

SO THINGS TO DO TOMORROW:

1- write the caching API for GPT-4
2- batch-process everything through GPT-4
3- simplify the detail level interface (wonder if we can do pinch-to-zoom?)

