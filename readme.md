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

0- get the UI and graph stuff right for the current dataset
1- write the caching API for GPT-4
2- batch-process everything through GPT-4 again, with better prompts

I'm kind of wondering whether we should actually generate comments for the function.

OK so this is kind of whatever, and I'm now getting super bored of this UI framework, so it's time to write a new one.
FOLLOW YOUR NOSE, DO THE THING THAT NEEDS DOING.

_________________________________________________________
OK so prompt architecture:

1- system prompts in system/ folder
2- per-card prompts in prompts/ folder
3- pseudocode in pseudocode folder.

but there's a general theme here: 

llm_function(data) => output

pseudocode(card) => preprocess => prompt => cache => result
if not in cache, then => process queue

we don't necessarily want to store those inside the card.
instead we want to get back a json object with { title, purpose, pseudocode } based on the uid.

so there should be a folder called 

data/repositories/blah/pseudocode

with a json file for each card;

in general, there's a set of such processes we want to apply.
but we need a cache, and that's that.

so the code should be:

def pseudocode(card) -> dict:
    make the prompt
    issue the request
    cache hit -> immediate response
    cache miss -> go to queue



OK so where are we trying to get to?
we want automatic updating of all documentation with minimum fuss.

so items are:

1- update the serve queue constantly
2- need to scoop up the results and put them into the cards also
3- or do we actually want to compute this using a roundtrip to the server?

=> I kind of like the idea that actually, no, we don't.
but then again, maybe we don't want to try and hold all cards on the client.
because there will be x-hundred thousand cards, when working at scale.
and that's the thing we have to think about.

OK: so what changes do we need to make?
1- when you make a request, if it's already in the queue, don't add it.
2- when you make a request, if the file exists, grab it and process it (add it to the card)
3- keep going until there's nothing left to do.

OK, we're almost there now. The last and final stage is to just go and compute all docs from the list of cards when we process.
And we're good. That we'll do tomorrow. Fresh eyes.

End of day: proper rate-limited prompting system is live and working: PromptQueue.
Seems to work pretty well, and code is followable. Commit now.

To finish this feature, which we're going to do before we fix the UI:
- when we process the repo, we put all cards through generatePseudocode
- browser asks server for status() every now and then, gets back a status object.
- this holds the number of requests pending, and the expected time remaining.

it's taken (x) seconds for (y) requests, therefore time remaining is (nRemaining * x/y)
every ten seconds report status

reportStatus: get status, say result, but only if different to last one.
OK: that's what we're doing.

_________________________________________________________________________
This whole thing is so fucking stupid. It really is
SCRIBBLE TIME

1- update cards based on documentation
2- fix UI bugs, but no major upgrades
3- get documentation indexed and searchable
4- demonstrate card retrieval to answer questions and suggest code
5- ability to visualise edits to code based on LLM input

Right, so this is the workflow:

you type something into the "miso" box.
we fetch the context, LLM takes question and returns a list of answers, a plan, and the edits.
=> apply the edits, rebuild and see what happens. oh yeah I forgot, live testing.
all in one place.

__________________________________________________________________________
IDEA: Generate docview by example.

The idea is that there's actually just one document per card, and it's a zerp-style markdown .md,
but with smart links in there somehow. We'll figure that part out.

Of course, it DOES NOT HAVE TO BE TRADITIONAL MARKDOWN, since markdown doesn't support links from code.
But we can just do a pirate extension to markdown that allows it. Lovely, everyone's happy.

So you can write WHATEVER DOCUMENTATION YOU LIKE for each function (or indeed use code to generate it).
But once it's there, it includes everything you'll need, to whatever complexity. 

So it would be interesting to do something purely by example.
A very handy programming mechanism that would let us try a whole bunch of different things.

original => doc

the DOC is the full description of the code. You should just edit the prompt in the playground, and auto-reload the result.
of course, you can implement all this yourself if you want.
I'm just thinking : what should be the actual app here? 

I think the nicest thing is to be able to design the prompt as a markdown file.

[code]

[pseudocode(code)]


# ${title(code)}

${purpose(code)}

# pseudocode

'''
${pseudocode(code)}
...

But this is a nice line to follow - you make it completely customisable, just by letting people edit the prompt.
Obviously, right? everything is editable.

make it fast for people to modify it in any way they want.

Where we're trying to get to is MISO.

make it so.

two kinds of commands:

"run a function of miso" (i.e. do something with the miso instance currently running)

eg. change the background colour to dark green
    => write some code, run the code, everyone's happy

and those features can be patched between codebases. That's it.

we'll get there. I'm ready to go to bed.

_________
Thoughts on next steps:

1. Have to simplify the relationship between the server and client.
Instead of loading all cards in a single JSON, the client should only request the cards it needs.
The server might as well store cards as single uid.json files, although that's much less efficient (lots of small files are bad)
But we're doing this anyway for the vector database and LLM cache.

Quickest way forward: store the cards locally as a uid => cards hash table, and iterate always through cards.values().
When client asks for uid, just read card[uid] and send it back. Super super easy.

This way we don't need tons of cards sitting around on the client, most of which we'll never look at anyway.

We need some way to check which cards have changed and reload their new state on the client.
We could use a "generation counter"; whenever a change gets made, we increment the global generation counter.
When the client sends an "update(mygen)" message, we return (currentgen, list of changed objects)
But this is kind of exactly what we were about to do, wasn't it?

Changes needed on server:
1) we have to store all cards


In general, there's a need for either (uid => data) or (hash => data)
We'd like to store these in a database of some kind. But in general, super large dictionary probably works just as well.

Quickest way to get this working: finish the "changedCards" thing.
Let's do that: it'll feel more polished then.

_____ 
let's just do this PROPERLY.

ok; we're almost there. Need to figure out why the cache isn't working quite right.
*BUT* I think there's something that needs to change.

OK:

The goal is to fix the layout bug using only GPT-based methods.

1- put all documentation into vectordb
2- question-answering (static)
3- question-answering (dynamic/diagnostic)
4- modification-planning
5- modification-execution
6- modification-testing
7- iterative approach to converge on correct solution

___________
SCRIBBLES

The reason it's hard to get back to work on this is that it's bloody messy now.
But let's hold fast: we want to get GPT-4 to refactor this mess for us.
So let's press on witih question answering and auto-modification.

Let's do it !!

1- put title, purpose and all pseudocode into the vector database.
2- fetch all relevant cards
3- pass each to the GPT prompt asking "1- is this card relevant?" "2- if so, show how this card is relevant to the answer"

How does X happen?

=> get all relevant cards
=> answer the question => pop up some text.

that's the actual most simple way of doing it.
you can use links to the individual cards IN THE ANSWER. Oh yeah baby.
So in fact, the answer is a piece of text containing links to the functions it talks about.

=> we can FILTER the information in the card to be relevant to the question being asked.
=> or highlight the bits that pertain to the question. Even better.

It's buggy as hell, but we're going to develop the way to fix it automatically.

First change: add a tag, which will be just "name" to start with.
Then tags will be "title", "purpose", "pseudocode".

So there's a general thing happening here where we want to cache B = fn(A)
and we want to recompute B when either A or fn changes.
This is basically memoisation.

B[] = fn(A[])

so please do the recompute when A[] changes
also, please do the recompute when (fn) changes

This happens with vectors; 
before, we only stored a list of uids with each sentence;
now we want to store a list of (uid, part) where part = one of [name, title, purpose, pseudocode]

There's a generic thing that has to happen though isn't there.
The generic thing is that there is MARKDOWN. and we have a CARD which is a file, and we can process this to update parts of it.

Now we can store this wherever we want, but for the moment the filesystem is the best place.
We have these IDs and that's all good. So let's just do it that way.

I feel like that's the best way forward. We just store fucking MARKDOWN. Because it's a universal format, and links exist, and it's all good.
EASY PEASY.

[something](http://www.something.com)

OK so this is the thing; how do we make LINKS within code to something else?
Well, there obviously has to be some JSON sitting there too.
But we can happily put JSON into the card, it's totally not a problem.

We want this super generic structure that we can mess with.

OK, so this totally has to fucking work in markdown.
But there's no way we can possibly make it work.
We want to store links within CODE, and therefore we can't be invasive.
We have to store those links separately, and JSON is the only way.

_______
Okay so next version should be started from scratch.

1- call it miso
2- cards stored as individual markdown files
3- all cards stored client-side in a database
4- all computation done client-side (including talking to GPT)
5- proper memoisation structure using datestamps et al.

It would be so much simpler to try again, wouldn't it?

I have all this really cool stuff in here but we need to write it better.
Should we take a break and look at agents? 
No, I don't think so.

___
TOTAL SCRIBBLES at this point

Pragmatic way forward.
Create an engine. Allow faster experimentation.
Get the basic stuff going, then make it easy to create new apps fast.

OK SO.
That's the focus. Let's think engine.

______
Yes OK fine. what's the coolest and cutest engine we need to make experimentation super fucking fast.

- services architecture for embeddings, neural nets, search etc
- values that change over time and update the DOM when they do
- auto-re-running of requests when inputs or prompt change

No, I definitely do want to start again, because the big difference is the simplicity of the markdown-card approach. YES let's just fucking do that, it's more fun.

So actually the plan of action is: 

1- services layer
(import github rev) is a process that runs whenever (latestrev) changes, and spits out a bunch of files, we don't know

yeah we just have a little bunch of these requests just always sitting there. *BUT* they are generated by a request-generation-template which is what an AGENT is.

So the *import* agent sits there and monitors the latest rev and spits out card-folders

The *documentation* agent sits there and processes all cards; it generates a request for each card that also refers to all callees of that card. A request is something of the form (in1..inN) => (fn) where (fn) is a python file, If any of the input files change, OR the python file changes, the request is re-run. We just keep track of the last datestamp each one got run, and literally just receive file-change notations.

Each live request is
    
    class Request
        function: filename
        inputs: filename[]
        lastRun: datestamp
        lastResponse: Response

Of course we store this in a dictionary:

    function => Request[]   iff request uses (function)
    file => Request[]       iff (file) is in r.inputs

So when a file change notification is made, if it's a file-delete, we decRef the request that uses it; if it's a rename, we'll update all internal ptrs to it; but if the contents get changed, then we'll re-run the request.

Each response is

    class Response
        results: string[][]
        best: (string, level)
        changed: boolean

Now "Agent" objects are bits of python that generate Requests. They only get "re-run" when their code changes, which causes them to regenerate all requests. Once the request has been served, they take some action on the data (usually by spitting out files).

So we just throw text files into a folder tree, and the agents come along and process them, generating new files. Those files then trigger other agents to come in and process, and so on.

I do like the idea of a single markdown file, with special demarcators. It's just simple, simple, simple. Each card has one markdown file, it's the code, it's lovely.

____ title

# This is the function I don't know what

____ purpose

It's quite good

____ pseudocode

## Pseudocode

- blah
  - blah blah
  - blah blah blah

____ examples

## Examples

### add numbers

Add numbers:

    var sum = add(5, 6);        => 11

And because they're in sections, we can pull up whatever we like.
It's all beautiful and fantastic.

Also, we can do links in code:

    var sum = {{add}[@test_function_add_py]}(5, 6);

That would be super super nice, because they everything just works.

But in actual fact we could just store json:

____ callees [nodisplay]

    { "callees": [
            { "ic": 0, "jc": 3, "link": ["test_function_add_py"] }
        ]
    }

And that is super nice and fun, because fun, right? We can just like *look* at it in the interface.

It's all about the sections, babe.

OK so decision: single markdown files, we look at sections and changes in general. We can easily modify the re-run-agents code to look at sections that change, it's no biggie. That way the file count is just easier to handle; also it's NICE to be able to look at the whole card as one md file.

    class Card:
        filename: string;
        pages: Map<name, markdown>;

_____________
Template Prompt

[[prompt-text]] in the markdown extracts the text and hands it to the prompt. I think that works pretty well, actually.

Yeah I think that's actually how it works.