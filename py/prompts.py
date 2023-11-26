# ᕦ(ツ)ᕤ
# prompts.py
# author: asnaroo
# prompt manager! prompts, cache, queues, threads, retries, fun times

from typing import List
import random
import os
import time
import threading
import openai
from util import makeDirs, stringToHash
import dotenv

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
openai.api_key = os.getenv('OPENAI_KEY')

# Prompt holds messages, file to store result in, and function to call (synchronously) on completion
class Prompt:
    def __init__(self, name: str, messages: List[str], cacheFile: str, onCompletion):
        self.name = name # for printing out; should be unique
        self.messages = messages # messages in gpt format [{"role":"blah", "content":"blah"}, ..]
        self.cacheFile = cacheFile # write the result to this file
        self.onCompletion = onCompletion # this gets called on (response)

# Prompt Queue holds a queue of prompts, serves them as fast as possible
class PromptQueue:
    def __init__(self, cacheFolder):
        self.cacheFolder = cacheFolder
        self.queue : List[Prompt] = []      # ordered list of prompts to process
        self.cacheToPrompt = {}             # map hash to prompt
        self.threadLock = threading.Lock()  # stop race conditions
        self.nThreadsRunning = 0            # number of threads running
        self.nThreadsRetrying = 0           # number of threads engaged in backoff-and-try-later

    # request a prompt - will get served as soon as possible; call this from client code
    def request(self, name: str, system: str, user: str, onCompletion) -> bool:
        messages = [ {"role": "system", "content": system}, 
                    {"role": "user", "content": user} ]
        cache = self.cacheFilePath(messages)
        if os.path.exists(cache):
            with open (cache, "r") as f:
                text = f.read()
            onCompletion(text)
            return True
        if cache in self.cacheToPrompt:
            index = next((i for i, item in enumerate(self.queue) if item.name == name), None)
            if index != None:
                self.queue = [self.queue.pop(index)] + self.queue
        else:
            prompt = Prompt(name, messages, cache, onCompletion)
            self.queue.append(prompt)
            self.cacheToPrompt[cache] = prompt
        return False

    # serve the next prompt in the queue if possible, return number remaining; call this from client code
    def serveNext(self) -> int:
        nPerSec = 2
        for i in range(0, nPerSec):
            if len(self.queue) > 0:
                prompt = self.queue[0]
                nRetrying = 0
                nRunning = 0
                with self.threadLock:
                    nRetrying = self.nThreadsRetrying
                    nRunning = self.nThreadsRunning
                if i==nPerSec-1:
                    print(f"remaining: {len(self.queue)} running: {nRunning}, retrying: {nRetrying}")
                if (nRetrying == 0):                  # we've got enough in the tank
                    computation_thread = threading.Thread(target=self.servePrompt, args=(prompt,))
                    self.cacheToPrompt.pop(prompt.cacheFile)
                    self.queue = self.queue[1:]
                    computation_thread.start()
                else:
                    if i==nPerSec-1:
                        print(f"waiting...")
        return len(self.queue)
    
    # serve a single prompt (called within a thread)
    def servePrompt(self, prompt):
        maxRetries = 20
        with self.threadLock:
            self.nThreadsRunning += 1
        response = self.retryGpt4Prompt(prompt, maxRetries)
        if response == "":
            print(f"request failed after {maxRetries} retries.")
            return
        with self.threadLock:
            self.nThreadsRunning -= 1
            print("completed", prompt.name)
            prompt.onCompletion(response)
        #print("-------------------------------")
        #print(f"{prompt.name}:")
        #print(response)
        #print("-------------------------------")

    # retries GPT request if it fails because of rate-limits (20sec backoff)
    def retryGpt4Prompt(self, prompt, nRetries) -> str:
        backoff = random.uniform(5, 10)
        didRetry = False
        while(nRetries > 0):
            try:
                print("issuing", prompt.name)
                response = self.gpt(prompt.messages)
                makeDirs(prompt.cacheFile)
                with open(prompt.cacheFile, 'w') as file:
                    file.write(response)
                print("served", prompt.name)
                if didRetry == True:
                    with self.threadLock:
                        self.nThreadsRetrying -= 1
                return response
            except Exception as e:  # Catch any exception
                if 'Rate limit reached' in str(e):
                    print(f"RATE LIMIT: {prompt.name}; waiting {backoff} sec.")
                    if didRetry == False:
                        didRetry = True    
                        with self.threadLock:
                            self.nThreadsRetrying += 1
                    time.sleep(backoff)
                    backoff *= 2
                    print("RETRYING", prompt.name, nRetries, "tries left")
                    nRetries -= 1
                else:
                    print(f"issue with {prompt.name}: {e}")
                    break
        return ""
    
    # call into GPT4, wait for response; potentially throws rate-limit exception
    def gpt(self, messages) -> str:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            temperature=0,
            max_tokens=2048,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            messages=messages
        )
        result = response.choices[0].message.content
        return result

    # returns path to cache file for message array
    def cacheFilePath(self, messages: List[str]) -> str:
        id = ""
        for m in messages:
            id += m['role'] + m['content']
        hash = stringToHash(id)
        path = self.cacheFolder + '/' + hash + '.md'
        return path

    
    

