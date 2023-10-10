# ᕦ(ツ)ᕤ
# author: asnaroo. copyright © nøøb, all rights reserved.
# cards.py converts code to cards and keeps them healthy and happy

from typing import List
import os
from util import readJsonFromFile, writeJsonToFile, readFile, findAllFiles
from vectors import VectorDB
from lexer import Lexer, Lex
from languages import Snippet, Language, findLanguage
from prompts import PromptQueue

# a block of code: a card can have multiple blocks
class CodeBlock:
    def __init__(self, text: str, language: Language, iLine: int, jLine:int =-1):
        self.text = text
        self.language = language
        self.iLine = iLine
        if jLine==-1: self.jLine = iLine # inclusive: eurgh
        else: self.jLine = iLine

# represents a unit of code - function, variable, method or class
class Card:
    def __init__(self, project: str="", module: str="", code: str="", language: Language=Language(), iLine: int=0, jLine: int=-1) :
        self.project = project  # global
        self.module = module    # root-relative path of the file, for disambiguation
        self.language = language.shortName()    
        self.kind = ''          # "class" or "function" or "other"
        self.name = ''          # name of function or class being defined
        self.title = ''         # title
        self.purpose = ''       # purpose
        self.pseudocode = ''    # pseudocode
        self.notes = ''         # questions and comments
        self.unused = ''        # dependencies that aren't in fact dependencies (AI generated)
        self.code = [ CodeBlock(code, language, iLine, jLine) ]        # actual text from code file; block 0 is always the original
        self.dependsOn = []     # cards we depend on
        self.dependents = []    # cards that depend on us
        self.children = []      # if we're a class, cards for methods
        self.parent = None      # if we're a method or property, points to parent
        self.superclass = None  # if we're a class, points to superclass
        self.rankFromBottom = 0 # 1 means depends on nothing; x means depends on things with rank < x
        self.rankFromTop = 0    # 1 means nothing calls this; x means called by things with rank < x 

    # concise human-readable name; var, function(), Class, Class.property, or Class.method()
    def shortName(self):
        s = ""
        if self.parent: s= self.parent.name + "."
        s += self.name
        if self.kind == 'function' or self.kind == 'method':
            s += "()"
        return s
    
    # unique identifier based on all sub-identifiers
    def uid(self):
        u = self.language + "_" + self.project + "_" + self.module + "_" + self.kind + "_"
        if self.parent: u += self.parent.name + "_"
        u += self.name
        return u

# represents a dependency from one card to another
class Dependency:
    def __init__(self, iChar: int, jChar: int, targets: List[Card]):
        self.iChar = iChar
        self.jChar = jChar
        self.targets = targets

    # combines two dependencies into a single one
    def combine(self, dep):
        len0 = self.jChar - self.iChar
        len1 = dep.jChar - dep.iChar
        if len1 > len0: # dep wins because longer
            self.iChar = dep.iChar
            self.jChar = dep.jChar
            self.targets = dep.targets
        elif len1 < len0 : # self wins because longer
            pass
        else: # equal length; combine the arrays
            self.iChar = min(self.iChar, dep.iChar)
            self.jChar = max(self.jChar, dep.jChar)
            self.targets += dep.targets

class CardBase:
    def __init__(self, project: str, cardsFile: str):
        self.project = project          # project name
        self.cardsFile = cardsFile      # file where cards are stored
        self.cards = {}                 # maps (uid) => card
        self.changedCards = []          # list of cards changed since load
        self.loadCards()                # load'em

    # given uid, find card, or None if uid doesn't exist
    def card(self, uid):
        return self.cards[uid] if uid in self.cards else None
    
    # return all cards as a single list
    def allCardsAsList(self) -> List[Card]:
        return self.cards.values()
    
    # return all cards as a dict (uid=>Card)
    def allCardsAsDict(self) -> dict:
        return self.cards

    # load cards from single json file 
    def loadCards(self):
        json = readJsonFromFile(self.cardsFile)
        uids = {}       # uid => Card
        cards = []      # temp array
        for j in json['cards']:         # todo: proper serialise/deserialise framework
            card = Card()
            cards.append(card)
            uids[j['uid']] = card
            card.project = self.project
            card.language = j['language']
            card.module = j['module']
            card.kind = j['kind']
            card.name = j['name']
            card.title = j['title']
            card.purpose = j['purpose']
            card.pseudocode = j['pseudocode']
            card.notes = j['notes']
        i=0
        for j in json['cards']:
            card = cards[i]
            i +=1
            # Parse the code, dependsOn, dependents, children, and parent
            card.code = [CodeBlock(c['text'], findLanguage(c['language']), c['iLine'], c['jLine']) for c in j['code']]
            try:
                card.dependsOn = [Dependency(d['iChar'], d['jChar'], [uids[t] for t in d['targets']]) for d in j['dependsOn']]
                card.dependents = [Dependency(d['iChar'], d['jChar'], [uids[t] for t in d['targets']]) for d in j['dependents']]
                card.children = [uids[c] for c in j['children']]
                card.parent = uids[j['parent']] if j['parent'] != 'null' else None
            except:
                continue
        self.cards = uids

    # import cards from github source folder
    def importCardsFromRepository(self, project: str, sourceFolder: str, vectors: VectorDB, prompts: PromptQueue):
        print("importCardsFromRepository")
        newCards = self.importAllCards([sourceFolder])
        self.computeDependencies(newCards)
        self.processChangedCards(newCards, self.cards, vectors)
        self.generatePseudocode(newCards, prompts)
        self.cards = self.uidDict(newCards)
        self.saveCards()

    # save cards to json file
    def saveCards(self):
        obj = self.serialiseCardList(self.cards.values())
        writeJsonToFile(obj, self.cardsFile)

    # reads code for all cards from a list of folders within a project
    def importAllCards(self, folders: List[str]) -> List[Card]:
        cards = []
        for folder in folders:
            print(f"importAllCards: {folder}")
            files = findAllFiles(folder, ".ts") + findAllFiles(folder, ".py")
            for file in files:
                cards.extend(self.importCardsFromFile(self.project, file))
        self.removeIndents(cards)
        return cards

    # generates embedding vectors for (cards)'s function names (shortName) expressed as words
    def saveEmbeddings(self, cards: List[Card], vectors: VectorDB):
        print("saving embeddings for", len(cards), "cards:")
        cardsFromKeys = {}
        for card in cards:
            key = self.separateWords(card.shortName())
            if not (key in cardsFromKeys):
                cardsFromKeys[key] = [ card ]
            else:
                cardsFromKeys[key].append(card)
        for key, cards in cardsFromKeys.items():
            uids = [c.uid() for c in cards]
            vectors.set(key, uids)

    # removes embeddings for (cards) from the vector database
    def removeEmbeddings(self, cards: List[Card], vectors: VectorDB):
        print("removing embeddings for", len(cards), "cards:")
        for card in cards:
            key = self.separateWords(card.shortName())
            uidToRemove = card.uid()
            uids = vectors.get(key)
            if len(uids) > 0:
                uids = [item for item in uids if item != uidToRemove]
                if len(uids)==0:
                    vectors.remove(key)
                else:
                    vectors.set(key, uids)

    # converts an identifier to a normal string of words, eg "camelCaseHTTP" and "camel_case_HTTP" to "camel case HTTP"
    def separateWords(self, name): 
        symbols = "!@#$%^&*()+-={}[]:\";\',.<>/?\`~_"
        result = ""
        for i in range(0, len(name)):
            pc = ' ' if i == 0 else name[i-1]
            nc = ' ' if i == len(name)-1 else name[i+1]
            c = name[i]
            if c.isupper():
                if pc.isupper():        # part of an acronym
                    result += c         # so don't change it
                else:
                    if nc.isupper():    # also part of an acronym, but lead with a space
                        result += ' ' + c
                    else:               # not part of an acronym
                        result += ' ' + c.lower()
            else:
                if c in symbols: c = ' '
                result += c
        return result.replace("\n", " ").strip()

    # converts a card to a JSON object
    def card_serialiser(self, obj):
        if isinstance(obj, Card):
            return {
                "uid" : obj.uid(),
                "language" : obj.language,
                "module" : obj.module,
                "kind" : obj.kind,
                "name" : obj.name,
                "title" : obj.title,
                "purpose" : obj.purpose,
                "pseudocode" : obj.pseudocode,
                "notes" : obj.notes,
                "code" : [{ "text" : c.text, "language" : c.language.shortName(), "iLine" : c.iLine, "jLine" : c.jLine } for c in obj.code],
                "dependsOn" : [ { "targets" : [t.uid() for t in d.targets], "iChar": d.iChar, "jChar": d.jChar } for d in obj.dependsOn],
                "dependents" : [ { "targets" : [t.uid() for t in d.targets], "iChar": d.iChar, "jChar": d.jChar } for d in obj.dependents],
                "children" : [ c.uid() for c in obj.children],
                "parent" : obj.parent.uid() if obj.parent else "null"
            }
        raise TypeError(f"Type {type(obj)} unfortunately is not serializable")
    
    # returns a dictionary mapping (uid => card) for all (cards)
    def uidDict(self, cards: List[Card]) -> dict:
        uids = {}       # uid => Card
        for card in cards:
            uids[card.uid()] = card
        return uids

    # load source (filename) and import all cards 
    def importCardsFromFile(self, project, filename) -> List[Card]:
        #print("importing cards from", filename)
        root, ext = os.path.splitext(filename)
        module = root.split('/')[-1]        # eg. firefly or cards
        text = readFile(filename)
        return self.importCards(project, module, text, ext)

    # given text for a single file, import all cards (including one level down inside classes)
    def importCards(self, project: str, module: str, text: str, ext: str) -> List[Card]:
        language = findLanguage(ext)
        cards = self.importCardsFromText(project, module, language, text, None, 0)
        allChildren = []
        for c in cards:
            if c.kind == "class":
                #print("importing methods for class", c.name)
                c.children = self.importCardsFromText(project, module, language, c.code[0].text, c, 1)
                for child in c.children:
                    #print("  ", child.name)
                    child.code[0].iLine += c.code[0].iLine +1       # not sure why but hey
                    child.code[0].jLine += c.code[0].iLine +1
                allChildren += c.children
        cards += allChildren
        cards = [card for card in cards if card.name != "unknown"] # remove unknown name cards
        return cards

    # given a list of cards, return a json object that we can save
    def serialiseCardList(self, cards: List[Card]) -> dict:
        print("serialiseCardList:", len(cards), "cards")
        jsonObj = { "cards" : [self.card_serialiser(c) for c in cards] }
        return jsonObj
    
    # given some raw text, import all cards
    def importCardsFromText(self, project: str, module: str, language: Language, text: str, parent: Card, minIndent: int)-> List[Card]:
        snippets = language.breakIntoSnippets(text, minIndent)
        cards = []
        for snippet in snippets:
            card = Card(project, module, snippet.text, language, snippet.iLine, snippet.jLine)
            cards.append(card)
        for c in cards:
            c.parent = parent
            parentName = parent.name if parent else ''
            (c.kind, c.name) = language.findTypeAndName(c.code[0].text, parentName)
        return cards

    # remove indents from the code block of all cards
    def removeIndents(self, cards: List[Card]):
        for card in cards:
            lines = card.code[0].text.split('\n')
            if (lines[-1].strip(' ') == ''): lines = lines[0:-1]
            minLeadingSpaces = 10000
            for line in lines:
                if len(line) > 0:
                    nLeadingSpaces = len(line) - len(line.lstrip(' '))
                    minLeadingSpaces = min(minLeadingSpaces, nLeadingSpaces)
            if minLeadingSpaces > 0:
                lines = [l[minLeadingSpaces:] for l in lines]
            card.code[0].text = '\n'.join(lines)

    # given a list of cards that have changed, run all time-consuming import operations
    def processChangedCards(self, cards: List[Card], oldCards: dict, vectors: VectorDB):
        cardsToProcess = []
        removedCards = []
        for card in cards:
            if card.uid() in oldCards:
                oldCard = oldCards[card.uid()]
                if oldCard.code[0].text != card.code[0].text:
                    cardsToProcess.append(card)
            else:
                cardsToProcess.append(card)
        uids = self.uidDict(cards)
        for card in oldCards.values():
            if not card.uid() in uids:
                removedCards.append(card)
        print("cards to process ------------------------")
        for card in cardsToProcess:
            print(card.uid())
        print("removed cards ---------------------------")
        for card in removedCards:
            print(card.uid())
        self.saveEmbeddings(cardsToProcess, vectors)
        self.removeEmbeddings(removedCards, vectors)

    # given a list of cards, map all dependencies between them
    def computeDependencies(self, cards: List[Card]):
        # TODO: this is a bit of a behemoth, refactor!
        # put all cards into a hash table mapping name -> List[Card]
        cardsFromName = {}
        #print("--------------- computeDeps -------------")
        for card in cards:
            #print(card.shortName())
            name = card.name
            if not (name in cardsFromName):
                cardsFromName[name] = [card]
            else:
                cardsFromName[name].append(card)

        lexer = Lexer()

        # find superclass relationships
        for card in cards:
            if card.kind == 'class':
                code = card.code[0].text
                lang = card.code[0].language
                ic = code.find('class ')
                if ic == -1: continue
                eol = code.find('\n', ic)
                line = code[ic:eol]
                ls = lexer.process(line, lang) # class MyClass(Superclass) or class MyClass : Superclass
                if len(ls) >=4 and ls[1].type=='identifier' and ls[3].type=='identifier' and (ls[2]==':' or ls[2]=='('):
                    if ls[3].text in cardsFromName:
                        supers = cardsFromName[ls[3].text]
                        supers = [s for s in supers if s.kind == "class"]
                        if len(supers)==1:
                            card.superclass = supers[0]

        # now check each card for words that might map to others
        for card in cards:
            code = card.code[0].text
            lang = card.code[0].language
            ls = lexer.process(code, lang)
            # first, get the types of all local variables, if they're declared
            typeFromVar = {}
            typeFromVar[lang.thisName()] = card.parent.name if card.parent else ''
            for i in range(0, len(ls)-2):
                if ls[i].type == 'identifier' and ls[i+1]==':' and ls[i+2].type == 'identifier':
                    typeFromVar[ls[i].text] = ls[i+2].text
            # now get an array of possible cards for each identifier
            for l in ls:
                if l.type == 'identifier':
                    p = []
                    if l.text in cardsFromName:
                        p = cardsFromName[l.text]
                    l.targets = p
            # get the type of each global, if you can
            for l in ls:
                if l.type == 'identifier' and len(l.targets)==1:
                    t = l.targets[0]
                    if t.kind == 'global':
                        # split the global def into lexemes
                        gls = lexer.process(t.code[0].text, t.code[0].language)
                        # look for a : b and grab b
                        for i in range(0, len(gls)-2):
                            if gls[i].type == 'identifier' and gls[i] == t.name and gls[i+1] == ':' and gls[i+2].type=='identifier':
                                typeFromVar[l.text] = gls[i+2].text
            # now whittle down the potentials list using various filters
            # 1- remove the targets for the definition
            for l in ls:
                if l.text == card.name and len(l.targets)>0:
                    l.targets= []
                    break
            # 2- remove targets from b that don't match type of a.b
            for i in range(2, len(ls)):
                pred = ls[i-2]
                if ls[i].type == 'identifier' and ls[i-1] == '.' and pred.type == 'identifier':
                    if pred.text in typeFromVar:
                        predType = typeFromVar[pred.text]
                        ls[i].targets = [t for t in ls[i].targets if t.parent and (t.parent.name == predType or (t.parent.superclass and t.parent.superclass.name == predType))]
            # 3- if you matched a property or method but there's no dot before, get rid
            for i in range(1, len(ls)):
                if ls[i].type == 'identifier' and ls[i-1] != '.':
                    ls[i].targets = [t for t in ls[i].targets if t.kind != 'method' and t.kind != 'property']
            # 4- if you matched a function or method but there's no bracket after, get rid; but only if the match is ambiguous! (i.e. keep function ptrs)
            for i in range(0, len(ls)-1):
                if ls[i].type == 'identifier' and ls[i+1] != '(' and len(ls[i].targets) > 1:
                    ls[i].targets = [t for t in ls[i].targets if t.kind != 'function' and t.kind != 'method']
            # 4.1 - if you matched a function or global but there's a dot before, remove it
            for i in range(1, len(ls)-1):
                if ls[i].type == 'identifier' and ls[i-1] == '.':
                    # actually though, if the identifier BEFORE that is the module and we're in python, don't filter
                    module = "" if i < 2 else ls[i-2].text
                    ls[i].targets = [t for t in ls[i].targets if (t.kind != 'function' and t.kind != 'global') or (module == t.module)]
            # 5- if you matched something in a different language, remove it (TBC)
            for l in ls:
                if l.type == 'identifier':
                    l.targets = [t for t in l.targets if t.code[0].language.shortName() == lang.shortName()]
            # 6 - if you matched a class name followed by a "(", redirect to constructor
            for i in range(0, len(ls)-1):
                if ls[i].type == 'identifier' and len(ls[i].targets)==1 and ls[i].targets[0].kind == 'class':
                    if ls[i+1] == '(':
                        constructors = cardsFromName[lang.constructorName()]
                        constructors = [c for c in constructors if c.parent and c.parent.name == ls[i].text]
                        if len(constructors)==1:
                            ls[i].targets = constructors
                    
            # CUSTOM: remote("@service.function" ... gets linked to function
            for i in range(2, len(ls)-2):
                if ls[i-2] == 'remote' and ls[i-1]=='(' and ls[i].type == 'quote':
                    id = ls[i].text[1:-1]        # strip quotations
                    if id.startswith('@'):
                        id = id[1:]
                        parts = id.split('.')
                        service = parts[0]
                        function = parts[1]
                        potentials = cardsFromName[function]
                        for p in potentials:
                            if p.name == function and p.project == service:
                                ls[i].targets.append(p)

            # and create dependencies from the potentials
            for i in range(0, len(ls)):
                l = ls[i]
                l.targets = [t for t in l.targets if t != card]
                if len(l.targets) > 0:
                    dep = Dependency(l.ic, l.jc, l.targets)
                    card.dependsOn.append(dep)
                    for t in l.targets:
                        if t != card:
                            t.dependents.append(Dependency(l.ic, l.jc, [card]))

    # generate pseudocode for all callable cards in (cards)
    def generatePseudocode(self, cards: List[Card], prompts: PromptQueue):
        print("generatePseudocode", len(cards))
        callables = []
        for card in cards:
            if card.kind == 'method' or card.kind == 'function':
                callables.append(card)
        print(len(callables), 'callable')
        system = readFile('../gpt/pseudocode.md')
        for card in callables[0:16]:
            uid = card.uid()
            prompt = self.pseudocodePrompt(card)
            prompts.request(card.uid(), system, prompt, lambda text, card=card: self.setDoc(card, text))
        print(f"{len(self.changedCards)} changed cards")

    # sets documentation properties from a response
    def setDoc(self, card: Card, text: str):
        sections = self.separateTaggedText(text, ['# Pseudocode', '# Purpose', '# Title', '# Unused'])
        card.title = sections[2]
        card.purpose = sections[1]
        card.pseudocode = sections[0]
        card.unused = sections[3]
        self.changedCards.append(card)

    # generates a "user:" prompt for the card
    def pseudocodePrompt(self, card) -> str:
        called = []
        for dep in card.dependsOn:
            for t in dep.targets:
                if not (t in called): called.append(t)
        prompt = ''
        prompt += "Components:\n\n"
        for c in called:
            prompt += "id: " + c.uid() + "\n"
            prompt += self.componentDescriptions(c) + "\n\n"
        prompt += "Function:\n\n" + card.code[0].text + "\n\n"
        prompt += "\nNotes: None\n"
        return prompt
    
    # generates component description list for a card (name/comment/signature for each callee)
    def componentDescriptions(self, card: Card) -> str:
        text = card.code[0].text
        lang = card.code[0].language
        lines = text.split("\n")
        useLines = []
        addedDescLabel = False
        for i in range(0, len(lines)):
            isComment = (lines[i].strip().startswith(lang.comment()))
            if isComment:
                descLine = ''
                if not addedDescLabel:
                    descLine += 'description: '
                    addedDescLabel = True
                descLine += lines[i].strip().removeprefix(lang.comment()).strip()
                useLines.append(descLine)
            else:
                useLines.append('signature: ' + lines[i].strip())
            if not isComment:
                break
        return '\n'.join(useLines)

    # separate text into tags
    def separateTaggedText(self, text: str, tags: List[str]) -> List[str]:
        iTags = []
        for tag in tags:
            iTag = text.find(tag)
            iTags.append(iTag)
        sections = []
        for i in range(0, len(iTags)):
            iChar = iTags[i] + len(tags[i])
            jChar = iTags[i+1] if i < len(iTags)-1 else len(text)
            section = text[iChar:jChar]
            sections.append(section.strip())
        return sections

# note: this doesn't get called yet, but it works: organises cards into dependency order
# my quick hack for generating pseudocode relies on single-line comments, but this would fix things if we didn't have those
# for the moment I'm keep doc-gen order-independent, because it allows promotion of urgent requests to the front of the queue
# sort callable cards into levels from top down and bottom up (set rank properties)
def computeLevels(cards: List[Card]):
    # now compute the levels of all callable things (not classes or properties)
    callables = [c for c in cards if c.kind == 'method' or c.kind == 'function']
    #print('\ncomputing rank from top...')
    queue = []
    for c in callables:
        count=0
        for d in c.dependents:
            for t in d.targets:
                if t in callables:
                    count += 1
        if count == 0:
            c.rankFromTop = 1
            queue.append(c)
    level = 1
    while len(queue) > 0 and level < 100:
        rp = f"level {level}: "
        for c in queue: rp += c.shortName() + " "
        #print(rp)
        nextQueue = []
        for c in queue:
            for d in c.dependsOn:
                for t in d.targets:
                    if t in callables and t.rankFromTop == 0:
                        t.rankFromTop = c.rankFromTop + 1
                        if not t in nextQueue:
                            nextQueue.append(t)
        queue = nextQueue
        level += 1

    #print("\ncomputing rank from bottom...")
    queue = []
    for c in callables:
        count=0
        for d in c.dependsOn:
            for t in d.targets:
                if t in callables:
                    count += 1
        if count == 0:
            c.rankFromBottom = 1
            queue.append(c)
    level = 1
    while len(queue) > 0 and level < 100:
        rp = f"level {level}: "
        for c in queue: rp += c.shortName() + " "
        #print(rp)
        nextQueue = []
        for c in queue:
            for d in c.dependents:
                for t in d.targets:
                    if t in callables and t.rankFromBottom == 0:
                        t.rankFromBottom = c.rankFromBottom + 1
                        if not t in nextQueue:
                            nextQueue.append(t)
        queue = nextQueue
        level += 1

