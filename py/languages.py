# ᕦ(ツ)ᕤ
# author: asnaroo. copyright © nøøb, all rights reserved.
# represents language-specific oddities
# currently supports typescript and python

from typing import List

# snippet is some text, with a source line number indicating where it came from
class Snippet:
    def __init__(self, text: str, iLine: int):
        self.text = text
        self.iLine = iLine                          # 1-based
        self.jLine = iLine + text.count('`n')       # 0 line breaks means jLine = iLine

# base class representing a programming language we want to support
class Language:
    # the name of the language, eg "python"
    def name(self) -> str:
        return ""
    # short nane of the language, eg "py"
    def shortName(self) -> str:
        return ""
    # character string indicating an end-of-line comment ('#' for python, '//' for c++, etc)
    def comment(self) -> str:
        return ""
    # character string for multi-line comment start
    def multiLineComment(self) -> str:
        return ""
    # character string for multi-line comment end
    def endMultiLineComment(self) -> str:
        return ""
    # if (str[ic:]) starts with an openquote, return the closed-quote string to look for
    def checkOpenQuote(self, str, ic): 
        return ""
    # true if names can contain hyphens, false otherwise
    def namesCanContainHyphens(self) -> bool:
        return False
    # constructor name - 'constructor' for typescript, '__init__' for python, etc
    def constructorName(self) -> str:
        return ""
    # keywords indicating function/etc definition, eg. 'function' for typescript, 'def' for python
    def definitionKeywords(self) -> List[str]:
        return []
    # given some code (text), break into snippets (each one later becomes a card)
    def breakIntoSnippets(self, text: str, minIndent:int =0) -> List[Snippet]:
        return []  
    # return "this" or "self" or whatever
    def thisName(self) -> str:
        return ""
    # given a raw text block of code, figure out what type, kind, name, etc it is
    def findTypeAndName(self, code: str, parent: str) -> (str, str):
        return ("", "")
    
# represents the Python language for processing
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
    
    # break code into snippets, later to become cards
    def breakIntoSnippets(self, text, minIndent) -> List[Snippet]:
        lines = text.split("\n")
        snippet = None
        snippets = []
        indent = 0
        for i in range(0, len(lines)):
            line = lines[i]
            prevLine = lines[i-1] if i > 0 else ""
            if not(isBlank(line)):
                oldIndent = indent
                indent = nTabsAtStart(line)
                if indent >= minIndent:
                    backToBaseIndent = (oldIndent > minIndent and indent == minIndent)
                    stillOnBaseIndent = indent==minIndent and oldIndent==indent
                    prevComment = prevLine.strip().startswith("#")
                    prevDecorator = prevLine.strip().startswith("@")
                    if snippet == None or backToBaseIndent or (stillOnBaseIndent and (not(prevComment or prevDecorator))):
                        snippet = Snippet(line, i+1)
                        snippets.append(snippet)
                    else:
                        snippet.text += "\n" + line
                        snippet.jLine = i+1
        return snippets
    
    # extract the type ('method', 'function') and name of a snippet
    def findTypeAndName(self, code: str, parent: str) -> (str, str):
        lines = code.split("\n")
        for line in lines:
            l = line.strip()
            if not (l.startswith("#") or l.startswith("@")):
                if l.startswith("def"):
                    parts = l.split(f"(")   # "def funcName"  "params) -> result:"
                    funcName = parts[0].split(" ")[1].strip()
                    if parts[1].startswith("self"):
                        return ("method", funcName)
                    else:
                        return ("function", funcName)
                elif l.startswith("class"):
                    return ("class", l.split(" ")[1].split(":")[0].split("(")[0])
                elif l.startswith('if __name__ == "__main__":'):
                    return ("function", "__main__")
                else: # could be property (self.blah = ) or global (blah = ..)
                    parts = l.split("=")
                    if "self." in parts[0]:
                        return ("method", parts[0].strip())
                    else:
                        return ("global", parts[0].strip())
        return ("unknown", "unknown")

# represents the Typescript for processing
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
    
    # break code into snippets, later to become cards
    def breakIntoSnippets(self, text, minIndent) -> List[Snippet]:
        lines = text.split("\n")
        snippets = []
        snippet = None
        prevLine = ""
        indent = 0
        for iLine in range(0, len(lines)):
            line = lines[iLine]
            if indent >= minIndent: # only consider lines above the min indent level
                # should we start a new snippet?
                # YES if current line has indent = minIndent, line is not blank and previous line is not a comment
                # NO if the line is just "}"
                blank = (line.strip()=="")
                singleCloseBrace = (line.strip() == "}")
                prevComment = prevLine.strip().startswith("//")
                if indent == minIndent and (not blank) and (not prevComment) and (not singleCloseBrace):
                    snippet = Snippet(line, iLine+1)
                    snippets.append(snippet)
                elif snippet:
                    snippet.text += "\n" + line
                    snippet.jLine = iLine + 1
            indent = indent + countBraces(line)
            prevLine = line
        return snippets
    
    def findTypeAndName(self, code: str, parent: str) -> (str, str):
        lines = code.split("\n")
        for line in lines:
            l = line.strip()
            icom = l.find("//")
            if icom>=0: l = l[0 : icom]
            if l != "":
                l = l.replace("async ", "")
                w = l.split(" ")
                classIndex = findString(w, "class")
                if classIndex >= 0:
                    return ("class", w[classIndex+1])
                funcIndex = findString(w, "function")
                if funcIndex >= 0:
                    return ("function", w[funcIndex+1].split("(")[0].split("<")[0])
                elif parent != '':
                    if "(" in w[0]:
                        return ("method", w[0].split("(")[0])
                    else:
                        return ("property", w[0].split(":")[0])
                elif w[0]=="var" or w[0]=="let" or w[0]=="const":
                    return ("global", w[1].split(":")[0])
        return ("unknown", "unknown")

# return true if (target) exists in a list of strings
def findString(strings: list, target: str) -> int:
    try:
        return strings.index(target)
    except ValueError:
        return -1

# returns the difference between the number of open-braces and closed-braces in a string
def countBraces(s: str) -> int:
    return s.count("{") - s.count("}")

# returns the number of tabs (four spaces) at the start of a line
def nTabsAtStart(s: str) -> int:
    return (len(s) - len(s.lstrip(' ')))/4

# returns true if the line is blank / whitespace 
def isBlank(s: str) -> bool:    
    return not s.strip()

# given a filename extension or language shortname, returns the corresponding Language object
def findLanguage(ext: str) -> Language:
    if ext.startswith('.'): ext = ext[1:]
    if ext == "py": return Python()
    elif ext == "ts" or ext == "js": return Typescript()
    else:
        raise Exception("Unrecognised file extension")
