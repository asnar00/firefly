# ᕦ(ツ)ᕤ
# author: asnaroo and gpt4. copyright © nøøb, all rights reserved.
# webservery.py serves public files, runs commands, returns results

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
import import_code

listen_port = 8003
app_name = "miso2"

public = f"/Users/asnaroo/desktop/experiments/{app_name}/public"
root = f"/Users/asnaroo/desktop/experiments/{app_name}"

build_process = None

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header("Access-Control-Allow-Origin", "http://localhost:8000")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.translate_path(self.path)
        if path is None:
            print("notfound:", path)
            self.send_error(404, "File not found")
            return
        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_data = self.rfile.read(content_length).decode("utf-8")
        post_data = json.loads(raw_data)
        if self.path == f"/{app_name}":
            response = app_process(post_data)
            self.respond(response)
        else:
            self.send_error(404, "Endpoint not found")

    def respond(self, output):
        encoded_output = json.dumps(output).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded_output)))
        self.send_header("Access-Control-Allow-Origin", "http://localhost:8000")
        self.end_headers()
        self.wfile.write(encoded_output)

    def translate_path(self, path):
        print("requested:", path)
        path = urlparse(path).path
        #print("after urlparse", path)
        path = os.path.normpath(path)

        _, ext = os.path.splitext(path)
        if (path==f"/{app_name}"):
            path = public + "/index.html"
        elif ext == ".css" or ext == ".js" or ext == ".ico":
            path = public + path.replace(f"{app_name}/", "", 1)
        elif ext == ".md" or ext == ".hpp" or ext == ".cpp" or ext == ".ts":
            path = root + path
        else:
            return None

        print("resolved path:", path)
        if not os.path.exists(path):
            return None
        
        # Serve files from the specified folder
        return path
    

def app_process(post_data):
    cmd = post_data['command']
    if cmd=="import":
        print("app_process: IMPORT")
        jsonObj = import_code.import_code(post_data["code"], post_data["ext"])
        return jsonObj
    return f"${app_name}: command not supported"

if __name__ == "__main__":
    print(f"starting webserver listening on port {listen_port}...")
    Handler = CustomHTTPRequestHandler
    with socketserver.TCPServer(("", listen_port), Handler) as httpd:
        print(f"Serving on port {listen_port}")
        httpd.serve_forever()
