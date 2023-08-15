# ᕦ(ツ)ᕤ
# import.py
# author: asnaroo, with help from gpt4
# purpose: to analyse a piece of (typescript or python) code [eventually C++ maybe]
# and create a set of "cards", each of which is a single class, function, or method
# cards are organised so that they depend on each other

import os
from typing import List
import random
import json

global vb
vb = True

def import_code(code: str, ext: str) -> dict:
    print("------ import_code COME ON MOTHERFUCKERS ---------")
    global vb
    vb = False
    cards = importCards(code, ext)
    jsonObj = cardsToJsonDict(cards)
    return jsonObj

class Language:
    def name(self) -> str:
        return ""
    def shortName(self) -> str:
        return ""
    def importCards(self, text):
        return []
    def findTypeAndName(self, card, minIndent) -> (str, str):
        return ("", "")
    
class CodeBlock:
    def __init__(self, text: str, language: Language, iLine: int):
        self.text = text
        self.language = language
        self.iLine = iLine
        self.jLine = iLine # inclusive: eurgh
        
class Card:
    def __init__(self, code: str, language: Language, iLine: int) :
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
        self.rankFromBottom = 0 # 1 means depends on nothing; x means depends on things with rank < x
        self.rankFromTop = 0    # 1 means nothing calls this; x means called by things with rank < x 
    def fullName(self):
        if self.parent: return self.parent.name + "." + self.name
        else: return self.name
    def uid(self):
        u = self.kind + "_"
        if self.parent: u += self.parent.name + "_"
        u += self.name
        return u

def card_serialiser(obj):
    if isinstance(obj, Card):
        return {
            "uid" : obj.uid(),
            "kind" : obj.kind,
            "name" : obj.name,
            "purpose" : obj.purpose,
            "examples" : obj.examples,
            "inputs" : obj.inputs,
            "outputs" : obj.outputs,
            "code" : [{ "text" : c.text, "language" : c.language.name(), "iLine" : c.iLine, "jLine" : c.jLine } for c in obj.code],
            "dependsOn" : [ { "target" : d.target.uid(), "iChar": d.iChar, "jChar": d.jChar } for d in obj.dependsOn],
            "dependents" : [ { "target" : d.target.uid(), "iChar": d.iChar, "jChar": d.jChar } for d in obj.dependents],
            "children" : [ c.uid() for c in obj.children],
            "parent" : obj.parent.uid() if obj.parent else "None"
        }
    raise TypeError(f"Type {type(obj)} unfortunately is not serializable")

class Dependency:
    def __init__(self, iChar: int, jChar: int, target: Card):
        self.iChar = iChar
        self.jChar = jChar
        self.target = target

class Python(Language):
    def name(self): return "python"
    def shortName(self): return "py"
    def importCards(self, text, minIndent) -> List[Card]:
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
                        card = Card(line, self, i+1)
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
                    return ("function", l.split(" ")[1].split("(")[0])
                elif l.startswith("class"):
                    return ("class", l.split(" ")[1].split(":")[0].split("(")[0])
        return ("unknown", "unknown")

# typescript
class Typescript(Language):
    def name(self): return "typescript"
    def shortName(self): return "ts"
    def importCards(self, text, minIndent) -> List[Card]:
        lines = text.split("\n")
        cards = []
        card = None
        prevLine = ""
        indent = 0
        for iLine in range(0, len(lines)):
            line = lines[iLine]
            if line.strip():
                if indent >= minIndent:
                    # should we start a new card?
                    # YES if current line has indent = minIndent, and previous line is not a comment
                    # NO if line is just a close-brace
                    singleClose = (indent <= minIndent) and (line.strip() == "}")
                    if not singleClose:
                        if indent == minIndent and not prevLine.strip().startswith("//"):
                            card = Card(line, self, iLine+1)
                            cards.append(card)
                        else:
                            card.code[0].text += "\n" + line
                            card.code[0].jLine = iLine + 1
                indent = indent + countBraces(line)
                prevLine = line
        return cards
    def findTypeAndName(self, card) -> (str, str):
        lines = card.code[0].text.split("\n")
        for line in lines:
            l = line.strip()
            if not l.startswith("//"):
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
    elif ext == ".cpp" or ext == ".hpp" or ext == ".cc" or ext == ".hh": return Cplusplus()
    else:
        raise Exception("Unrecognised file extension")
    
def importCardsFromFile(filename) -> List[Card]:
    global vb
    #print("importing cards from", filename)
    root, ext = os.path.splitext(filename)
    text = readFile(filename)
    return importCards(text, ext)

def importCards(text: str, ext: str) -> List[Card]:
    global vb
    #print("importing cards")
    language = findLanguage(ext)
    #print("language:", language.name())
    cards = importCardsFromText(language, text, None, 0)
    allChildren = []
    for c in cards:
        if c.kind == "class":
            #print("importing methods for class", c.name)
            c.children = importCardsFromText(language, c.code[0].text, c, 1)
            for child in c.children:
                child.code[0].iLine += c.code[0].iLine +1       # not sure why but hey
                child.code[0].jLine += c.code[0].iLine +1
            allChildren += c.children
    cards += allChildren
    cards = [card for card in cards if card.name != "unknown"] # remove unknown name cards
    computeDependencies(cards)
    computeLevels(cards)
    return cards

def cardsToJsonDict(cards: List[Card]) -> dict:
    print("cardsToJsonDict:", len(cards), "cards")
    jsonObj = { "cards" : [card_serialiser(c) for c in cards] }
    print(jsonObj)
    print("type(jsonObj)=", type(jsonObj))
    return jsonObj

def computeDependencies(cards: List[Card]):
    global vb
    #print("\ncomputing dependencies...")
    # for each card's code, run through all other cards to see if their names occur
    for card in cards:
        if card.name != "unknown" and card.kind != "property" and card.kind != "global" and card.kind != "class":
            for c in cards:
                if c != card and c.name != "unknown" and c.name != card.name:
                    search = c.name 
                    if c.kind == "method":
                        if c.name == "constructor": search = c.parent.name + "("    # this is language-specific! move this into a Language method
                        else: search = "." + c.name
                    iCharStart = findWordInString(search, card.code[0].text)
                    if iCharStart >= 0:
                        iCharEnd = iCharStart + len(search)
                        card.dependsOn.append(Dependency(iCharStart, iCharEnd, c))
                        c.dependents.append(Dependency(iCharStart, iCharEnd, card))
            card.dependsOn = sorted(card.dependsOn, key=lambda d: d.iChar)
    sortedCards = sorted(cards, key=lambda x: x.fullName())
    for card in sortedCards:
        report = card.fullName() + " ==> "
        for d in card.dependsOn:
            report += d.target.fullName() + " "
        report += "\n     <== "
        for d in card.dependents:
            report += d.target.fullName() + " "
        #print(report)

def computeLevels(cards: List[Card]):
    global vb
    #print("computeLevels...")
    # now compute the levels of all callable things (not classes or properties)
    callables = [c for c in cards if c.kind == "method" or c.kind == "function"]
    #print("\ncomputing rank from top...")
    queue = []
    for c in callables:
        if len([d for d in c.dependents if d.target in callables])==0:
            c.rankFromTop = 1
            queue.append(c)
    level = 1
    while len(queue) > 0 and level < 100:
        rp = f"level {level}: "
        for c in queue: rp += c.fullName() + " "
        #print(rp)
        nextQueue = []
        for c in queue:
            for d in c.dependsOn:
                if d.target in callables and d.target.rankFromTop == 0:
                    d.target.rankFromTop = c.rankFromTop + 1
                    if not d.target in nextQueue:
                        nextQueue.append(d.target)
        queue = nextQueue
        level += 1

    #print("\ncomputing rank from bottom...")
    queue = []
    for c in callables:
        if len([d for d in c.dependsOn if d.target in callables])==0:
            c.rankFromBottom = 1
            queue.append(c)
    level = 1
    while len(queue) > 0 and level < 100:
        rp = f"level {level}: "
        for c in queue: rp += c.fullName() + " "
        #print(rp)
        nextQueue = []
        for c in queue:
            for d in c.dependents:
                if d.target in callables and d.target.rankFromBottom == 0:
                    d.target.rankFromBottom = c.rankFromBottom + 1
                    if not d.target in nextQueue:
                        nextQueue.append(d.target)
        queue = nextQueue
        level += 1
    
    #cards = sorted(cards, key=lambda x: x.level)
    #maxLevel =0
    #for card in cards:
        # if card.level > maxLevel:
        #     print("level", card.level, "--------------------")
        #     maxLevel = card.level
        # print(card.fullName())


def writeTextToFile(text: str, path: str):
    folder = os.path.dirname(path)
    if folder != '':
        os.makedirs(folder, exist_ok=True)
    with open(path, 'w') as file:
        file.write(text)

def importCardsFromText(language: Language, text: str, parent: Card, minIndent: int)-> List[Card]:
    global vb
    cards = language.importCards(text, minIndent)
    for c in cards:
        c.parent = parent
        (c.kind, c.name) = language.findTypeAndName(c)
        parentName = (c.parent.name + ".") if c.parent else ""
        #print(f"\n{c.kind}: {parentName}{c.name} ---------------------")
        #print(c.code[0].text)
    return cards
    
def findWordInString(word: str, string: str) -> int:    # not part of another word
    global vb
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

# not used, but let's keep it anyways
def newUid() -> str:
    uid = "@"
    cs = "bcdfghjklmnpqrstvwxyz"
    vs = "aeiou"
    for i in range(0, 8):
        ic = random.randint(0, 20) # inclusive... eurgh
        iv = random.randint(0, 4)
        uid += cs[ic] + vs[iv]
    return uid

if __name__ == "__main__":
    cards = importCardsFromFile("miso2.ts")
    jsonObj = cardsToJsonDict(cards)
    json = json.dumps(jsonObj, indent=4)
    writeTextToFile(json, "miso2.json")
    #importCardsFromFile("import.py")