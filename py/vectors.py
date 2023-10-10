# ᕦ(ツ)ᕤ
# vectors.py
# author: asnaroo
# purpose: semantic search using vector embeddings
# homebrew. replace with something proper when necessary

import numpy as np
from sentence_transformers import SentenceTransformer
import service
import hashlib
import os
import json
import shutil
from util import stringToHash, makeDirs

global sbertModel   # global so we only load it once
sbertModel = SentenceTransformer('paraphrase-MiniLM-L6-v2')

class VectorDB:
    def __init__(self, folder):
        self.folder = folder
        global sbertModel
        self.sbertModel = sbertModel
        self.loadEmbeddings()

    # get rid of everything
    def clear(self):
        self.embeddings = {}
        if os.path.exists(self.folder):
            shutil.rmtree(self.folder)
            makeDirs(self.folder)
    
    # set an individual key => value
    def set(self, key: str, value):
        if key in self.embeddings:   # exists already
            #print("already exists")
            oldValue = (self.embeddings[key])['value']
            if oldValue != value:
                (self.embeddings[key])['value'] = value
                self.save(key, self.embeddings[key])
        else:                   # compute embedding
            vector = self.sbertModel.encode([ key ])[0]
            data = { 'value': value, 'vector': vector }
            self.embeddings[key] = data
            self.save(key, data)
        return { 'result' : 'success' }

    # get the value associated with the key
    def get(self, key: str):
        if key in self.embeddings:
            return (self.embeddings[key])['value']
        else:
            return {}

    # remove all values associated with the key (delete file)
    def remove(self, key: str):
        if key in self.embeddings:
            self.embeddings.pop(key, None)
            filename = self.folder + "/" + stringToHash(key) + ".json"
            os.remove(filename)

    # vector-search by cosine-similarity; return best (nResults) results
    def search(self, query: str, nResults: int):
        searchVec = self.sbertModel.encode([ query ])[0]
        similarities = [ { 'key': key, 
                        'value': data['value'], 
                        'sim': cosine_similarity(searchVec, data['vector']) } 
                        for key, data in self.embeddings.items()]
        similarities.sort(key=lambda x: x['sim'], reverse=True)
        return { 'results' : similarities[:nResults] }

    # save an individual key => (value, vector) to a file 
    def save(self, key: str, data):
        filename = self.folder + "/" + stringToHash(key) + ".json"
        #print("saving", filename)
        folder = os.path.dirname(filename)
        if folder != '':
            os.makedirs(folder, exist_ok=True)
        value = data['value']
        list = (data['vector']).tolist()        # stored as numpy array in memory
        obj = { 'key' : key, 'data' : { 'value' : value, 'vector' : list } }
        with open(filename, 'w') as file:
            json.dump(obj, file)

    # loads all saved embedding-vector files (sentence => (value, vector))
    def loadEmbeddings(self):
        self.embeddings = {}
        print("loading vectors...")
        try:
            files = os.listdir(self.folder)
        except:
            files = []
        print("found", len(files), "objects")
        for f in files:
            filepath = self.folder + "/" + f
            with open(filepath, 'r') as file:
                obj = json.load(file) # key, data (value, vector)
                key = obj['key']
                data = obj['data']
                value = data['value']
                list = data['vector']
                npvector = np.array(list)
                self.embeddings[key] = { 'value': value, 'vector': npvector }

# given two embedding vectors, returns the 'degree of similarity' (1 = most similar, 0 = least)
def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    return (dot_product / (norm_v1 * norm_v2)).item()
