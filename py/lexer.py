# ᕦ(ツ)ᕤ
# author: asnaroo. copyright © nøøb, all rights reserved.
# to parse is human, to lex is divine

from languages import Language
from typing import List

# represents a single Lexeme, and possible meanings 
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
    
# does lexing
class Lexer:
    # for debug - given a string of lexemes, print them out            
    def printLs(self, msg, ls): 
        print(msg)
        for l in ls:
            out = '[ '
            for t in l.targets:
                out += f"{t.shortName()} "
            out += ']'
            print(' ', l.text, out)

    # convert text to a string of lexemes
    def process(self, code: str, lang: Language) -> List[Lex]:
        mlc = lang.multiLineComment()
        elmc = lang.endMultiLineComment()
        result = []
        ic = 0
        while ic < len(code):
            ic = self.skipToNextNonWhitespace(code, ic)
            type = ''
            if ic < len(code):
                if code.startswith(lang.comment(), ic):         # single-line comment
                    jc = self.skipPast('\n', code, ic)
                    type = 'comment'
                elif mlc != '' and code.startswith(mlc, ic):    # multi-line comment
                    jc = self.skipPast(elmc, code, ic)
                    type = 'comment'
                else:
                    (openQuote, closeQuote) = lang.checkOpenQuote(code, ic)          # quotes
                    if closeQuote != '':
                        jc = self.skipPastCloseQuote(closeQuote, code, ic + len(openQuote))
                        type = 'quote'
                    elif self.isAlpha(code[ic]):
                        jc = self.skipPastNextWord(code, ic, lang)
                        type = 'identifier'
                    elif self.isOperator(code[ic]):
                        jc = self.skipPastOperator(code, ic)
                        type = 'operator'
                    else:
                        jc = ic + 1
                result.append(Lex(code, ic, jc, type))
                ic = jc
        return result

    # search for (searchFor), return index after or len() if not found
    def skipPast(self, searchFor, inText, ic) -> int: 
        jc = inText.find(searchFor, ic)
        return (jc + len(searchFor)) if jc >= 0 else len(inText)

    # search for (searchFor), ignoring occurrences inside quotes
    def skipPastCloseQuote(self, searchFor, inText, ic) -> int:
        while(ic < len(inText)):
            ic = inText.find(searchFor, ic)
            if ic < 0: return len(inText)
            if ic == 0 or inText[ic-1] != '\\': return ic + len(searchFor)
            ic = ic + len(searchFor)
        return len(inText)

    # skip past end of next word
    def skipPastNextWord(self, inText, ic, lang: Language) -> int:
        while(ic < len(inText)):
            char = inText[ic]
            if not self.isWordChar(char, lang): return ic
            ic += 1
        return len(inText)
    
     # skip to next nonwhitespace character
    def skipToNextNonWhitespace(self, inText, ic) -> int:
        while(ic < len(inText)):
            if not self.isWhitespace(inText[ic]):
                return ic
            ic += 1
        return ic

    # skip past the next operator
    def skipPastOperator(self, inText, ic) -> int:
        if ic < len(inText)-1 and self.isOperator(inText[ic+1]): return ic+2
        return ic+1

    # true if character returns whitespace
    def isWhitespace(self, char) -> bool:
        return char in ' \n\t'

    # true if character is a--z or "_"
    def isAlpha(self, char) -> bool:
        l = char.lower()
        return (l >= 'a' and l <= 'z') or l == '_'

    # true if character is one of a list of operator characters
    def isOperator(self, char) -> bool:
        return char in '!@#$%^&*_+-=:;<>.,/?'

    # true if a character can occur within a word
    def isWordChar(self, char, lang: Language) -> bool:
        l = char.lower()
        if (l >= 'a' and l <= 'z'): return True
        if (l >= '0' and l <= '9'): return True
        if (l == '_'): return True
        if (lang.namesCanContainHyphens() and l == '-'): return True
        return False