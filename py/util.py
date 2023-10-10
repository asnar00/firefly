# ᕦ(ツ)ᕤ
# util.py
# author: asnaroo
# generally useful functions

import json
import os
import hashlib

# reads a file and returns the contents as a string
def readFile(filename: str) -> str:
    with open (filename, "r") as f:
        text = f.read()
    return text

# reads a json object from a file
def readJsonFromFile(filename):
    with open(filename, 'r') as file:
        data = json.load(file)
    return data

# writes an object as a json string to a file
def writeJsonToFile(obj, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as file:
        json.dump(obj, file, indent=4)

# make sure directories are created for (path)
def makeDirs(path):
    dir = os.path.dirname(path)
    if dir != '':
        os.makedirs(dir, exist_ok=True)

# Convert an arbitrary length string to a unique hash suitable for a filename
def stringToHash(input_string):
    hash_obj = hashlib.sha256()
    hash_obj.update(input_string.encode('utf-8'))
    hash_hex = hash_obj.hexdigest()
    return hash_hex[0:32]

# return a list of files in the given directory (and its subdirectories) that end with the given extension.
def findAllFiles(directory, extension):
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