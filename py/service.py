# ᕦ(ツ)ᕤ
# service.py
# author: asnaroo (with help from gpt4)
# purpose: make it easy to register functions as microservices

# to export a function so it can be called remotely
# use the decorator @service

from inspect import signature
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
import inspect
import sys
import time
import signal
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

global listen_port, app_name, public, root
listen_port = 0
app_name = ""
public = ""
root = ""

global functions
functions = {}

# decorator that adds (func) to a list of callables
def register(func):
    functions[func.__name__] = { 'call' : func, 'args' :  list(signature(func).parameters) }
    print(f"registered {func.__name__}")
    return func

# calls one of the callables
def call(func, args):
    print(f"calling {func}")
    #print(f"calling {func} with {args}")
    result = (functions[func])['call'](**args)
    #print(f"result: {result}")
    return result  

# server gobbledygook
class RestartHandler(FileSystemEventHandler):
    def __init__(self, observer, script_to_run):
        self.observer = observer
        self.script_to_run = script_to_run

    def on_modified(self, event):
        if event.src_path.endswith('.py'):
            print('Detected changes in:', event.src_path)
            self.restart_script()

    def restart_script(self):
        self.observer.stop()
        os.execv(sys.executable, ['python'] + [self.script_to_run])

# more server gobbledygook
class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header("Access-Control-Allow-Origin", "http://localhost:8000")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # process a GET request - just serve the file from the right place
    def do_GET(self):
        path = self.translate_path(self.path)
        if path is None:
            print("notfound:", path)
            self.send_error(404, "File not found")
            return
        super().do_GET()

    # process a POST request - call the right function, return its results
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_data = self.rfile.read(content_length).decode("utf-8")
        post_data = json.loads(raw_data)
        if self.path == f"/{app_name}":
            func = post_data['func']
            args = post_data['args']
            global functions
            if func in functions:
                response = call(func, args)
                self.respond(response)
            else:
                self.send_error(404, "Function not found")
        else:
            self.send_error(404, "Endpoint not found")

    # send a response back to the client
    def respond(self, output):
        encoded_output = json.dumps(output).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded_output)))
        self.send_header("Access-Control-Allow-Origin", "http://localhost:8000")
        self.end_headers()
        self.wfile.write(encoded_output)

    # convert an external requested path to an internal path
    def translate_path(self, path):
        global listen_port, app_name, public, root
        #print("requested:", path)
        path = urlparse(path).path
        #print("after urlparse", path)
        path = os.path.normpath(path)
        #print("after normpath", path)

        _, ext = os.path.splitext(path)
        if (path==f"/{app_name}"):
            path = public + "/index.html"
        elif path.startswith(f"/{app_name}/"):
            path = public + path.replace(f"{app_name}/", "", 1)
        else:
            return None

        print("resolved path:", path)
        if not os.path.exists(path):
            return None
        
        # Serve files from the specified folder
        return path

# implements auto self-restart (only works if the py files all load correctly)
def start(name, port, rootFolder):
    global listen_port, app_name, public, root
    app_name = name
    listen_port = port
    root = rootFolder
    public = root + "/public"

    observer = Observer()
    event_handler = RestartHandler(observer, sys.argv[0])
    observer.schedule(event_handler, path='.', recursive=True)
    try:
        observer.start()
        runServer()
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

# server gobbledygook
class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

# start the server
def runServer():
    global listen_port, app_name, public, root
    print(f"starting service '{app_name}' listening on port {listen_port}...")
    Handler = CustomHTTPRequestHandler
    with ReusableTCPServer(("", listen_port), Handler) as httpd:
        print(f"Serving on port {listen_port}")
        httpd.serve_forever()