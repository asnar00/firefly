# ᕦ(ツ)ᕤ
# author: asnaroo and gpt4. copyright © nøøb, all rights reserved.
# firefly.py serves public files, runs commands, returns results

import http.server
import socketserver
import json
import os
import subprocess
import threading
from urllib.parse import parse_qs, urlparse
from io import BytesIO
import socket
from typing import Tuple
import re
import select
import subprocess
import service
from typing import List
import random
import vectors


print("---------------------------------------------------------------------------")
print("firefly.ps ᕦ(ツ)ᕤ")
root = "/Users/asnaroo/desktop/experiments/firefly"

@service.register
def importFolders(project, folders):
    fullPaths = []
    for f in folders: fullPaths.append(root + "/" + f)
    return importAllCards(project, fullPaths)

@service.register
def save(path, obj):
    path = root + "/data/" + path
    writeJsonToFile(obj, path)
    return { "saved" : True }

@service.register
def load(path):
    path = root + "/data/" + path
    print("path:", path)
    if os.path.exists(path):
        json = readJsonFromFile(path)
        return json
    else:
        return { "error" : f"{path.replace(root, '')} not found" }
    
@service.register
def search(query):
    return vectors.search(query, 8)

def writeJsonToFile(obj, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as file:
        json.dump(obj, file, indent=4)

def readJsonFromFile(filename):
    with open(filename, 'r') as file:
        data = json.load(file)
    return data


def importAllCards(project, folders) -> dict:
    cards = []
    for folder in folders:
        files = findAllFiles(folder, ".ts") + findAllFiles(folder, ".py")
        print("files:", files)
        for file in files:
            cards.extend(importCardsFromFile(project, file))
    removeIndents(cards)
    computeDependencies(cards)
    #computeLevels(cards)
    saveEmbeddings(cards)
    return cardsToJsonDict(cards)

def saveEmbeddings(cards):
    print("saving embeddings")
    for card in cards:
        key = separateWords(card.shortName())
        vectors.add(key, card.uid())

def separateWords(name): # convert "camelCaseHTTP" and "camel_case_HTTP" to "camel case HTTP", 
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

class Language:
    def name(self) -> str:
        return ""
    def shortName(self) -> str:
        return ""
    def comment(self) -> str:
        return ""
    def multiLineComment(self) -> str:
        return ""
    def endMultiLineComment(self) -> str:
        return ""
    def checkOpenQuote(self, str, ic):   # if (str[ic:]) starts with an openquote, return the closed-quote string to look for
        return ""
    def namesCanContainHyphens(self) -> bool:
        return False
    def constructorName(self) -> str:
        return ""
    def definitionKeywords(self) -> List[str]:
        return []
    def importCards(self, project, module,  text):
        return []
    def thisName(self) -> str:  # return "this" or "self" or whatever
        return ""
    def findTypeAndName(self, card, minIndent) -> (str, str):
        return ("", "")
    
class CodeBlock:
    def __init__(self, text: str, language: Language, iLine: int):
        self.text = text
        self.language = language
        self.iLine = iLine
        self.jLine = iLine # inclusive: eurgh
        
class Card:
    def __init__(self, project: str, module: str, code: str, language: Language, iLine: int) :
        self.project = project  # global
        self.module = module    # root-relative path of the file, for disambiguation
        self.language = language.shortName()    
        self.kind = ''          # "class" or "function" or "other"
        self.name = ''          # name of function or class being defined
        self.purpose = ''       # purpose
        self.examples = ''      # examples
        self.inputs = ''        # inputs
        self.outputs = ''       # outputs
        self.code = [ CodeBlock(code, language, iLine) ]        # actual text from code file
        self.dependsOn = []     # cards we depend on
        self.dependents = []    # cards that depend on us
        self.children = []      # if we're a class, cards for methods
        self.parent = None      # if we're a method or property, points to parent
        self.superclass = None  # if we're a class, points to superclass
        self.rankFromBottom = 0 # 1 means depends on nothing; x means depends on things with rank < x
        self.rankFromTop = 0    # 1 means nothing calls this; x means called by things with rank < x 

    def shortName(self):
        s = ""
        if self.parent: s= self.parent.name + "."
        s += self.name
        if self.kind == 'function' or self.kind == 'method':
            s += "()"
        return s
    
    def uid(self):
        u = self.language + "_" + self.project + "_" + self.module + "_" + self.kind + "_"
        if self.parent: u += self.parent.name + "_"
        u += self.name
        return u

def card_serialiser(obj):
    if isinstance(obj, Card):
        return {
            "uid" : obj.uid(),
            "language" : obj.language,
            "module" : obj.module,
            "kind" : obj.kind,
            "name" : obj.name,
            "purpose" : obj.purpose,
            "examples" : obj.examples,
            "inputs" : obj.inputs,
            "outputs" : obj.outputs,
            "code" : [{ "text" : c.text, "language" : c.language.shortName(), "iLine" : c.iLine, "jLine" : c.jLine } for c in obj.code],
            "dependsOn" : [ { "targets" : [t.uid() for t in d.targets], "iChar": d.iChar, "jChar": d.jChar } for d in obj.dependsOn],
            "dependents" : [ { "targets" : [t.uid() for t in d.targets], "iChar": d.iChar, "jChar": d.jChar } for d in obj.dependents],
            "children" : [ c.uid() for c in obj.children],
            "parent" : obj.parent.uid() if obj.parent else "null"
        }
    raise TypeError(f"Type {type(obj)} unfortunately is not serializable")

class Dependency:
    def __init__(self, iChar: int, jChar: int, targets: Card):
        self.iChar = iChar
        self.jChar = jChar
        self.targets = targets
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

class Python(Language):
    def name(self): return "python"
    def shortName(self): return "py"
    def comment(self): return "#"
    def checkOpenQuote(self, str, ic):   # if (str) starts with an openquote, return a pair: open and close quote strings
        if str.startswith('\'', ic): return ('\'', '\'')
        elif str.startswith('"', ic): return ('"', '"')
        elif str.startswith('f"', ic): return ('f"', '"')
        elif str.startswith('"""', ic): return ('"""', '"""')
        return("", "")
    def constructorName(self) -> str:
        return "__init__"
    def definitionKeywords(self) -> List[str]:
        return ["def", "class"]
    def thisName(self) -> str:  # return "this" or "self" or whatever
        return 'self'
    def importCards(self, project, module, text, minIndent) -> List[Card]:
        lines = text.split("\n")
        card = None
        cards = []
        indent = 0
        for i in range(0, len(lines)):
            line = lines[i]
            prevLine = lines[i-1] if i > 0 else ""
            if not(isBlank(line)):
                oldIndent = indent
                indent = nTabsAtStart(line)
                if indent >= minIndent:
                    if card == None or (oldIndent > minIndent and indent == minIndent) or (indent==minIndent and oldIndent==indent and (not(prevLine.strip().startswith("#")))):
                        card = Card(project, module, line, self, i+1)
                        cards.append(card)
                    else:
                        card.code[0].text += "\n" + line
                        card.code[0].jLine = i+1
        return cards
    def findTypeAndName(self, card) -> (str, str):
        lines = card.code[0].text.split("\n")
        for line in lines:
            l = line.strip()
            if not l.startswith("#"):
                if l.startswith("def"):
                    parts = l.split(f"(")   # "def funcName"  "params) -> result:"
                    funcName = parts[0].split(" ")[1].strip()
                    if parts[1].startswith("self"):
                        return ("method", funcName)
                    else:
                        return ("function", funcName)
                elif l.startswith("class"):
                    
                    return ("class", l.split(" ")[1].split(":")[0].split("(")[0])
                else: # could be property (self.blah = ) or global (blah = ..)
                    parts = l.split("=")
                    if "self." in parts[0]:
                        return ("method", parts[0].strip())
                    else:
                        return ("global", parts[0].strip())
        return ("unknown", "unknown")

# typescript
class Typescript(Language):
    def name(self): return "typescript"
    def shortName(self): return "ts"
    def comment(self): return "//"
    def multiLineComment(self): return "/*"
    def endMultiLineComment(self): return "*/"
    def checkOpenQuote(self, str, ic):
        if str[ic] == '"': return ('"', '"')
        elif str[ic] == '`': return ('`','`')
        elif str[ic] == '\'': return ('\'', '\'')
        return ("", "")
    def constructorName(self) -> str:
        return "constructor"
    def definitionKeywords(self) -> List[str]:
        return ["function", "class"]
    def thisName(self) -> str:  # return "this" or "self" or whatever
        return 'this'
    def importCards(self, project, module, text, minIndent) -> List[Card]:
        lines = text.split("\n")
        cards = []
        card = None
        prevLine = ""
        indent = 0
        for iLine in range(0, len(lines)):
            line = lines[iLine]
            if indent >= minIndent: # only consider lines above the min indent level
                # should we start a new card?
                # YES if current line has indent = minIndent, line is not blank and previous line is not a comment
                # NO if the line is just "}"
                blank = (line.strip()=="")
                singleCloseBrace = (line.strip() == "}")
                prevComment = prevLine.strip().startswith("//")
                if indent == minIndent and (not blank) and (not prevComment) and (not singleCloseBrace):
                    card = Card(project, module, line, self, iLine+1)
                    cards.append(card)
                elif card:
                    card.code[0].text += "\n" + line
                    card.code[0].jLine = iLine + 1
            indent = indent + countBraces(line)
            prevLine = line
        return cards
    def findTypeAndName(self, card) -> (str, str):
        lines = card.code[0].text.split("\n")
        for line in lines:
            l = line.strip()
            icom = l.find("//")
            if icom>=0: l = l[0 : icom]
            if l != "":
                w = l.split(" ")
                classIndex = findString(w, "class")
                if classIndex >= 0:
                    return ("class", w[classIndex+1])
                funcIndex = findString(w, "function")
                if funcIndex >= 0:
                    return ("function", w[funcIndex+1].split("(")[0].split("<")[0])
                elif card.parent != None:
                    if "(" in w[0]:
                        return ("method", w[0].split("(")[0])
                    else:
                        return ("property", w[0].split(":")[0])
                elif w[0]=="var" or w[0]=="let" or w[0]=="const":
                    return ("global", w[1].split(":")[0])
        return ("unknown", "unknown")

def countBraces(s: str) -> int:
    return s.count("{") - s.count("}")

def nTabsAtStart(s: str) -> int:
    return (len(s) - len(s.lstrip(' ')))/4

def isBlank(s: str) -> bool:    
    return not s.strip()

def readFile(filename: str) -> str:
    with open (filename, "r") as f:
        text = f.read()
    return text

def findLanguage(ext: str) -> Language:
    if ext == ".py": return Python()
    elif ext == ".ts" or ext == ".js": return Typescript()
    else:
        raise Exception("Unrecognised file extension")
    
def importCardsFromFile(project, filename) -> List[Card]:
    #print("importing cards from", filename)
    root, ext = os.path.splitext(filename)
    module = root.split('/')[-1]        # eg. firefly or cards
    text = readFile(filename)
    return importCards(project, module, text, ext)

def importCards(project: str, module: str, text: str, ext: str) -> List[Card]:
    language = findLanguage(ext)
    cards = importCardsFromText(project, module, language, text, None, 0)
    allChildren = []
    for c in cards:
        if c.kind == "class":
            #print("importing methods for class", c.name)
            c.children = importCardsFromText(project, module, language, c.code[0].text, c, 1)
            for child in c.children:
                #print("  ", child.name)
                child.code[0].iLine += c.code[0].iLine +1       # not sure why but hey
                child.code[0].jLine += c.code[0].iLine +1
            allChildren += c.children
    cards += allChildren
    cards = [card for card in cards if card.name != "unknown"] # remove unknown name cards
    return cards

def cardsToJsonDict(cards: List[Card]) -> dict:
    print("cardsToJsonDict:", len(cards), "cards")
    jsonObj = { "cards" : [card_serialiser(c) for c in cards] }
    jsonStr = json.dumps(jsonObj, indent=4)
    print("saving...")
    writeTextToFile(jsonStr, "/Users/asnaroo/desktop/experiments/firefly/data/cards/test.json")
    print("saved")
    return jsonObj

class Lex:
    def __init__(self, code: str ="", iChar:int =0, jChar:int =0, type:str =""):
        sub = code[iChar:jChar]
        ts = sub.lstrip()
        iChar += len(sub) - len(ts)
        te = sub.rstrip()
        jChar -= len(sub) - len(te)
        self.ic = iChar
        self.jc = jChar
        self.text = code[iChar:jChar]
        self.type = type
        self.targets = []

    def __eq__(self, other):
        if isinstance(other, Lex):
            return self.text == other.text
        elif isinstance(other, str):
            return self.text == other
        return False

def computeDependencies(cards: List[Card]):         # this is a bit of a behemoth, refactor!
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

    # find superclass relationships
    for card in cards:
        if card.kind == 'class':
            code = card.code[0].text
            lang = card.code[0].language
            ic = code.find('class ')
            if ic == -1: continue
            eol = code.find('\n', ic)
            line = code[ic:eol]
            ls = processLexemes(line, lang) # class MyClass(Superclass) or class MyClass : Superclass
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
        ls = processLexemes(code, lang)
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
                    gls = processLexemes(t.code[0].text, t.code[0].language)
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
            
def processLexemes(code: str, lang: Language) -> List[Lex]:
    mlc = lang.multiLineComment()
    elmc = lang.endMultiLineComment()
    result = []
    ic = 0
    while ic < len(code):
        ic = skipToNextNonWhitespace(code, ic)
        type = ''
        if ic < len(code):
            if code.startswith(lang.comment(), ic):         # single-line comment
                jc = skipPast('\n', code, ic)
                type = 'comment'
            elif mlc != '' and code.startswith(mlc, ic):    # multi-line comment
                jc = skipPast(elmc, code, ic)
                type = 'comment'
            else:
                (openQuote, closeQuote) = lang.checkOpenQuote(code, ic)          # quotes
                if closeQuote != '':
                    jc = skipPastCloseQuote(closeQuote, code, ic + len(openQuote))
                    type = 'quote'
                elif isAlpha(code[ic]):
                    jc = skipPastNextWord(code, ic, lang)
                    type = 'identifier'
                elif isOperator(code[ic]):
                    jc = skipPastOperator(code, ic)
                    type = 'operator'
                else:
                    jc = ic + 1
            result.append(Lex(code, ic, jc, type))
            ic = jc
    return result

def skipPast(searchFor, inText, ic) -> int:     # just straight search for (search), return index after or len() if not found
    jc = inText.find(searchFor, ic)
    return (jc + len(searchFor)) if jc >= 0 else len(inText)

def skipPastCloseQuote(searchFor, inText, ic) -> int:   # same, but will overlook '\' characters
    while(ic < len(inText)):
        ic = inText.find(searchFor, ic)
        if ic < 0: return len(inText)
        if ic == 0 or inText[ic-1] != '\\': return ic + len(searchFor)
        ic = ic + len(searchFor)
    return len(inText)

def skipPastNextWord(inText, ic, lang: Language) -> int:    # skip past end of next word
    while(ic < len(inText)):
        char = inText[ic]
        if not isWordChar(char, lang): return ic
        ic += 1
    return len(inText)

def isWhitespace(char) -> bool:
    return char in ' \n\t'

def skipToNextNonWhitespace(inText, ic) -> int: # skip to next nonwhitespace character
    while(ic < len(inText)):
        if not isWhitespace(inText[ic]):
            return ic
        ic += 1
    return ic

def isAlpha(char) -> bool:
    l = char.lower()
    return (l >= 'a' and l <= 'z') or l == '_'

def isOperator(char) -> bool:
    return char in '!@#$%^&*_+-=:;<>.,/?'

def skipPastOperator(inText, ic) -> int:
    if ic < len(inText)-1 and isOperator(inText[ic+1]): return ic+2
    return ic+1

def isWordChar(char, lang: Language) -> bool:
    l = char.lower()
    if (l >= 'a' and l <= 'z'): return True
    if (l >= '0' and l <= '9'): return True
    if (l == '_'): return True
    if (lang.namesCanContainHyphens() and l == '-'): return True
    return False


def computeLevels(cards: List[Card]):
    #print('computeLevels...')
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

def writeTextToFile(text: str, path: str):
    folder = os.path.dirname(path)
    if folder != '':
        os.makedirs(folder, exist_ok=True)
    with open(path, 'w') as file:
        file.write(text)

def importCardsFromText(project: str, module: str, language: Language, text: str, parent: Card, minIndent: int)-> List[Card]:
    cards = language.importCards(project, module, text, minIndent)
    for c in cards:
        c.parent = parent
        (c.kind, c.name) = language.findTypeAndName(c)
    return cards
    
def removeIndents(cards: List[Card]):
    for card in cards:
        lines = card.code[0].text.split('\n')
        minLeadingSpaces = 10000
        for line in lines:
            if len(line) > 0:
                nLeadingSpaces = len(line) - len(line.lstrip(' '))
                minLeadingSpaces = min(minLeadingSpaces, nLeadingSpaces)
        if minLeadingSpaces > 0:
            lines = [l[minLeadingSpaces:] for l in lines]
            card.code[0].text = '\n'.join(lines)

def findWordInString(word: str, string: str) -> int:    # not part of another word
    punc = " !@#$%^&*()+-={}[]:\";\',.<>/?\`~"
    index = 0
    while index != -1:
        index = string.find(word, index)
        if index == -1:
            return -1
        end = index + len(word)
        if (index == 0 or \
            (string[index-1:index] in punc) or word[0] in punc) and \
            (string[end:end+1] in punc or word[len(word)-1] in punc):
            return index
        else:
            index = end
    return -1

def findString(strings: list, target: str) -> int:
    try:
        return strings.index(target)
    except ValueError:
        return -1
    
def findAllFiles(directory, extension):
    """
    Returns a list of files in the given directory (and its subdirectories) that end with the given extension.
    """
    matched_files = []

    # Ensure the extension starts with a dot
    if not extension.startswith("."):
        extension = "." + extension

    # Recursively walk the directory
    for dirpath, dirnames, filenames in os.walk(directory):
        for filename in filenames:
            if filename.endswith(extension):
                full_path = os.path.join(dirpath, filename)
                matched_files.append(full_path)

    return matched_files

def startFirefly():
    vectors.load()
    service.start("firefly", 8003, root)

def test():
    print("testing...")
    cards = importCardsFromFile("firefly", "../ts/firefly.ts")
    computeDependencies(cards)
    for card in cards:
        print("----------------------------------")
        print(card.uid())
        code = card.code[0].text
        print(code)
        words = []
        for d in card.dependsOn:
            for t in d.targets:
                words.append(t.shortName())
        print(words)

if __name__ == "__main__":
    #test()
    startFirefly()