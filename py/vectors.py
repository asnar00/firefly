# ᕦ(ツ)ᕤ
# vectors.py
# author: asnaroo (with help from gpt4)
# purpose: semantic search using vector embeddings
# homebrew. replace with something proper when necessary

import numpy as np
from sentence_transformers import SentenceTransformer
import service
import hashlib
import os
import json

global sbertModel
sbertModel = None

global embeddings
embeddings = {} # key => { value, vector }

root = "/Users/asnaroo/desktop/experiments/firefly/data/vectors"

def add(key: str, value):
    global embeddings
    if key in embeddings:   # exists already
        #print("already exists")
        oldValue = (embeddings[key])['value']
        if oldValue != value:
            (embeddings[key])['value'] = value
            save(key, embeddings[key])
    else:                   # compute embedding
        #print("new: computing embedding vector")
        vector = sbertEmbedding(key)
        data = { 'value': value, 'vector': vector }
        embeddings[key] = data
        save(key, data)
    return { 'result' : 'success' }

def search(query: str, nResults: int):
    searchVec = sbertEmbedding(query)
    similarities = [ { 'key': key, 
                       'value': data['value'], 
                       'sim': cosine_similarity(searchVec, data['vector']) } 
                    for key, data in embeddings.items()]
    similarities.sort(key=lambda x: x['sim'], reverse=True)
    return { 'results' : similarities[:nResults] }

def save(key: str, data):
    filename = root + "/" + stringToHash(key) + ".json"
    #print("saving", filename)
    folder = os.path.dirname(filename)
    if folder != '':
        os.makedirs(folder, exist_ok=True)
    value = data['value']
    list = (data['vector']).tolist()        # stored as numpy array in memory
    obj = { 'key' : key, 'data' : { 'value' : value, 'vector' : list } }
    with open(filename, 'w') as file:
        json.dump(obj, file)

def sbertEmbedding(key):
    return sbertModel.encode([ key ])[0]

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    return (dot_product / (norm_v1 * norm_v2)).item()

def load():
    print("loading sbert model...")
    global sbertModel
    sbertModel = SentenceTransformer('paraphrase-MiniLM-L6-v2')
    print("loading vectors...")
    path = root
    try:
        files = os.listdir(path)
    except:
        files = []
    print("found", len(files), "objects")
    global embeddings
    embeddings = {}
    for f in files:
        filepath = path + "/" + f
        with open(filepath, 'r') as file:
            obj = json.load(file) # key, data (value, vector)
            key = obj['key']
            data = obj['data']
            value = data['value']
            list = data['vector']
            npvector = np.array(list)
            embeddings[key] = { 'value': value, 'vector': npvector }

def stringToHash(input_string):
    """Convert an arbitrary length string to a unique hash suitable for a filename."""
    hash_obj = hashlib.sha256()
    hash_obj.update(input_string.encode('utf-8'))
    hash_hex = hash_obj.hexdigest()
    return hash_hex[0:32]
