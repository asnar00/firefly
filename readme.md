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
SCRIBBLES

OK, so here is the thing we need to demonstrate: feature modularity.

When interacting with the code, you want to implement a new feature. So we have a conversation with the agent about the change we want, and it builds a task tree showing what modifications it's going to make to the code. Then it makes the modifications, runs tests, repeat, and so on.

The goal should be to demonstrate this workflow for any language, or at least ts and py.

We want to generate a "packaged feature" which tells the story of how the feature got built:
- recording of the "fail" case (original code)
- conversation to establish goals of changes
- task tree
- modifications to code and meta-code

miso.

Where we are now: looking at caller-callee open/close button behaviour. Hard to get right.

- close shouldn't close parentNode (otherwise everything closes)
- button state should toggle nicely, layout shouldn't flip around
- choose better button icons

We really should get some kind of AI stuff working now right. We have the idea.

What: purpose from perspective of caller
How: what it does to achieve that purpose
Steps: pseudocode, line-for-line. There's got to be a nice way.




