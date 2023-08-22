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
print("firely.ps ᕦ(ツ)ᕤ")
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
    return vectors.search(query, 4)

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
    cards = list(filter(lambda c: not c.uid().endswith("_"), cards))
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
    return result

class Language:
    def name(self) -> str:
        return ""
    def shortName(self) -> str:
        return ""
    def comment(self) -> str:
        return ""
    def importCards(self, project, module,  text):
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
    def __init__(self, iChar: int, jChar: int, target: Card):
        self.iChar = iChar
        self.jChar = jChar
        self.targets = [ target ]
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
                if indent == minIndent and not prevLine.strip().startswith("//"):
                    card = Card(project, module, line, self, iLine+1)
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

def computeDependencies(cards: List[Card]):
    #print("\ncomputing dependencies...")
    # for each card's code, run through all other cards to see if their names occur
    for card in cards:
        if card.name != "unknown" :  #and card.kind != "property" and card.kind != "global" and card.kind != "class"
            for c in cards:
                iCharStart = -1
                search = ""
                if c != card and c.name == card.name and c.kind == "function":     # cross-project dependency
                    search = f"@{c.project}.{c.name}"
                    iCharStart = card.code[0].text.find(search)
                elif c != card and c.name != "unknown" and c.name != card.name and c.language == card.language:
                    search = c.name 
                    if c.kind == "method":
                        if c.name == "constructor": search = c.parent.name + "("    # this is language-specific! move this into a Language method
                        else: search = "." + c.name
                    elif c.kind == "property":
                        search = "." + c.name
                    iCharStart = findWordInString(search, card.code[0].text)
                if iCharStart >= 0:
                    if not inComment(iCharStart, card.code[0]):
                        iCharEnd = iCharStart + len(search)
                        card.dependsOn.append(Dependency(iCharStart, iCharEnd, c))
                        c.dependents.append(Dependency(iCharStart, iCharEnd, card))
            card.dependsOn = sorted(card.dependsOn, key=lambda d: d.iChar)
            # deal with overlapping dependencies (until we switch to using
            i = 0
            while i < len(card.dependsOn)-1:
                d0 = card.dependsOn[i]
                d1 = card.dependsOn[i+1]
                if d0.jChar > d1.iChar and d1.iChar < d0.jChar: # overlaps
                    d0.combine(d1)
                    card.dependsOn.remove(d1)
                else:
                    i +=1

def inComment(iChar: int, code: CodeBlock) -> bool:
    return searchBackwards(code.text, code.language.comment(), iChar)

def searchBackwards(s: str, target: str, iChar: int) -> bool:
    # search backwards from iChar for comment, until we hit start of line or text
    # Edge case: if iChar is outside the bounds of the string
    if iChar < 0 or iChar > len(s):
        return False
    
    # Start from iChar and go backwards
    for i in range(iChar, -1, -1):
        # Check for start of the string
        if i == 0:
            return False
        # Check for start of a line
        if s[i] == '\n':
            return False
        # Check if the substring ending at index i matches the target
        if s[i-len(target)+1:i+1] == target:
            return True
    
    return False

def computeLevels(cards: List[Card]):
    #print("computeLevels...")
    # now compute the levels of all callable things (not classes or properties)
    callables = [c for c in cards if c.kind == "method" or c.kind == "function"]
    #print("\ncomputing rank from top...")
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
    
    #cards = sorted(cards, key=lambda x: x.level)
    #maxLevel =0
    #for card in cards:
        # if card.level > maxLevel:
        #     print("level", card.level, "--------------------")
        #     maxLevel = card.level
        # print(card.shortName())

def writeTextToFile(text: str, path: str):
    folder = os.path.dirname(path)
    if folder != '':
        os.makedirs(folder, exist_ok=True)
    with open(path, 'w') as file:
        file.write(text)

def importCardsFromText(project: str, module: str, language: Language, text: str, parent: Card, minIndent: int)-> List[Card]:
    cards = language.importCards(project, module, text, minIndent)
    removeIndents(cards)
    for c in cards:
        c.parent = parent
        (c.kind, c.name) = language.findTypeAndName(c)
        parentName = (c.parent.name + ".") if c.parent else ""
        #print(f"\n{c.kind}: {parentName}{c.name} ---------------------")
        #print(c.code[0].text)
    return cards
    
def removeIndents(cards: List[Card]):
    for card in cards:
        lines = card.code[0].text.split('\n')
        minLeadingSpaces = 10000
        for line in lines:
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


if __name__ == "__main__":
    vectors.load()
    service.start("firefly", 8003, root)