# ᕦ(ツ)ᕤ
# author: asnaroo. copyright © nøøb, all rights reserved.
# firefly.py serves public files, runs commands, returns results

import os
import threading
from urllib.parse import parse_qs, urlparse
from typing import List
import time
import prompts
from github import GithubRepo
from cards import CardBase, Card
from vectors import VectorDB
from prompts import PromptQueue
from service import Service, register
from util import readJsonFromFile, writeJsonToFile, readFile

class App:
    def __init__(self, dataFolder: str, owner: str, project: str):
        self.eventLog = []                                                  # event log from client (TODO: support multiple clients)
        self.dataFolder = dataFolder                                        # physical path to firefly/data folder
        self.printed = False                                                # we haven't printed anything yet
        self.openRepository(owner, project)                                 # get everything up and running
        self.updateAll()                                                    # start auto-self-update
        
    def openRepository(self, owner: str, project: str):
        self.owner = owner                                                          # github username of owner  
        self.project = project                                                      # project name as per github
        self.projectFolder = f'{self.dataFolder}/projects/{owner}/{project}'        # folder in which all project-specific stuff lives
        self.cards = CardBase(project, f'{self.projectFolder}/cards/cards.json')    # start cardbase
        self.vectors = VectorDB(f'{self.projectFolder}/vectors')                    # vector database
        self.prompts = PromptQueue(f'{self.projectFolder}/prompts')                 # prompt queue/cache
        self.repo = GithubRepo(self.dataFolder, owner, project)                     # github repository
        self.processRepo()                                                          # get latest code from github, update all cards
        return self.cards.allCardsAsList()

    # update; calls once per second
    def updateAll(self):
        nRequests = self.prompts.serveNext()
        self.cards.saveCardsIfRequired()
        n = 0
        nt = 0
        with self.prompts.threadLock:    # todo: shouldn't have to access innards
            n = len(self.cards.changedCards)
            nt = self.prompts.nThreadsRunning
        if nt > 0 or not(self.printed):
            print(f"{nt} prompts inflight; {n} changed cards; ")
            self.printed = True
        timer = threading.Timer(1.0, self.updateAll)
        timer.daemon = True
        timer.start()
    
    # download latest repository code from github, update cards as necessary
    def processRepo(self):
        changed = self.repo.update()
        if not changed: return
        sourceFolder = f'{self.projectFolder}/source'
        self.cards.importCardsFromRepository(self.project, sourceFolder, self.vectors, self.prompts)

    # semantic search
    def search(self, query):
        return self.vectors.search(query, 8)
        

print("---------------------------------------------------------------------------")
print("firefly.ps ᕦ(ツ)ᕤ")

global s_app
s_app = None

def root():
    return s_app.dataFolder

# return a status object (whatever)
@register
def status():
    global s_app
    count = int(time.time() / 5)
    msg = f"count: {count}"
    return { "status" : {
        "nPromptsRemaining" : len(s_app.prompts.queue),
        "nChangedCards" : len(s_app.cards.changedCards)
    } }

# returns the i-th "changedCard" onwards
@register
def getChangedCards(index: int):
    if index < len(cards.changedCards):
        cards = s_app.cards.changedCards[index:]
        return s_app.cards.serialiseCardList(cards)
    return {}

# opens a github repository, imports and processes all cards
@register
def openRepository(owner: str, project: str):
    print("open repository", owner, project)
    p0 = time.perf_counter()
    cards = s_app.openRepository(owner, project)
    t = time.perf_counter() - p0
    print(f"done! took {t} sec.")
    return s_app.cards.serialiseCardList(cards)

# saves an individual json object to a file
@register
def save(path, obj):
    path = root() + "/" + path
    writeJsonToFile(obj, path)
    return { "saved" : True }

# loads an individual json object from a file
@register
def load(path):
    path = f'{root()}/{path}'
    print("path:", path)
    if os.path.exists(path):
        json = readJsonFromFile(path)
        return json
    else:
        return { "error" : f"{path.replace(root(), '')} not found" }

# clears the event log
@register
def startEventRecording():
    global eventLog
    eventLog = []
    return { "success" : True }

# flushes the event log 
@register
def saveEventLog(events):
    global eventLog
    eventLog.extend(events)
    return { "success" : True }

# stops recording, saves all events
@register
def stopRecording(events):
    global eventLog
    writeJsonToFile(eventLog, f"{root()}/data/eventlog/eventlog.json")
    return { "success" : True }

# semantic search - returns top 8 matches
@register
def search(query):
    global s_app
    return s_app.search(query)
    return dict

# python main
if __name__ == "__main__":
    scriptPath = os.path.abspath(__file__)
    scriptDir = os.path.dirname(scriptPath)
    os.chdir(scriptDir)
    folder = '/Users/asnaroo/desktop/experiments/firefly'
    s_app = App(f'{folder}/data', 'asnar00', 'firefly')
    service = Service('firefly', 8003, folder)
