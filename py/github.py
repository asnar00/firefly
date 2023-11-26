# ᕦ(ツ)ᕤ
# author: asnaroo. copyright © nøøb, all rights reserved.
# github.py does github stuff

import requests
import os
import shutil
import zipfile
from util import readJsonFromFile, writeJsonToFile
import dotenv

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class GithubRepo:
    def __init__(self, dataFolder: str, owner: str, project: str):
        self.owner = owner
        self.project = project
        self.folder = f'{dataFolder}/projects/{self.owner}/{self.project}'
    
    # download repository, return true if the code changed since last time
    def update(self) -> bool:
        githubFile =f'{self.folder}/github/github.json'
        githubInfo = readJsonFromFile(githubFile)
        token = os.getenv(githubInfo['token'])
        print(f"checking repository {self.owner}/{self.project}...")
        latestSHA = self.getRepositorySHA(token)
        if latestSHA == githubInfo['SHA']:
            print("SHA unchanged; nothing to do.")
            return False
        else:
            self.downloadSource(token)
            githubInfo['SHA'] = latestSHA
            #writeJsonToFile(githubInfo, githubFile) TODO: put this back in!
            return True
      
    # find the SHA of the tip of "main" branch of a github repo
    def getRepositorySHA(self, token: str=''):
        #print(f"getting SHA for {self.owner}/{self.project}")
        repoURL = "https://github.com/{self.owner}/{self.project}"
        branch = "main"
        apiURL = f"https://api.github.com/repos/{self.owner}/{self.project}/branches/{branch}"
        headers = { 'Authorization': f'token {token}' } if token != '' else {}
        response = requests.get(apiURL, headers=headers)
        if response.status_code == 200:
            latestSHA = response.json()["commit"]["sha"]
            #print(latestSHA)
            return latestSHA
        else:
            print("Failed to fetch the latest commit SHA:", response.content)
            return ''
          
    # download latest source to the correct folder
    def downloadSource(self, pat_token: str=''):
        save_path = f'{self.folder}/code.zip'
        extract_path = f'{self.folder}/source'
        repo_url = f"https://github.com/{self.owner}/{self.project}"

        # clean out the destination folder
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path)
        if os.path.exists(save_path):
            os.remove(save_path)

        # make sure all folders exist
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        os.makedirs(os.path.dirname(extract_path), exist_ok=True)

        # Construct the URL for the ZIP file
        zip_url = f"{repo_url.rstrip('/')}/archive/refs/heads/main.zip"
        
        # Set up the headers for the request, including the PAT
        if pat_token == '':
            headers = {}
        else:
            headers = { 'Authorization': f'token {pat_token}' }
        
        # Download the ZIP file
        print("downloading zip file")
        print(headers)
        print(zip_url)
        response = requests.get(zip_url, headers=headers, stream=True)
        
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                response.raw.decode_content = True
                shutil.copyfileobj(response.raw, f)
                
            # Extract the ZIP file
            print("unzipping...")
            with zipfile.ZipFile(save_path, 'r') as zip_ref:
                zip_ref.extractall(extract_path)
                
            # Remove the ZIP file
            os.remove(save_path)
            
        else:
            print(f"Failed to get file: {response.content}")