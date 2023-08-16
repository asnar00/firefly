"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
let dbInstance;
let dirHandle = null;
function openDB() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("openDB");
        if (dbInstance) {
            console.log("already have a db instance");
            return dbInstance;
        }
        console.log("creating db instance");
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('myDatabase', 1); // 'myDatabase' is the name of your database.
            // This event is only triggered once when the database is first created or when 
            // the version number is changed (like from 1 to 2).
            request.onupgradeneeded = function (event) {
                console.log("onupgradeneeded");
                const db = event.target.result;
                // Create an object store named 'fileHandles' if it doesn't exist.
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles');
                }
            };
            request.onsuccess = function (event) {
                console.log("onsuccess");
                dbInstance = event.target.result;
                resolve(dbInstance);
            };
            request.onerror = function (event) {
                console.error("Error opening database:", event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    });
}
// Store Directory Handle in IndexedDB
function storeHandle() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open('myDatabase', 1);
            openRequest.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles');
                }
            };
            openRequest.onsuccess = () => {
                const db = openRequest.result;
                const transaction = db.transaction('fileHandles', 'readwrite');
                const objectStore = transaction.objectStore('fileHandles');
                const request = objectStore.put(dirHandle, 'dirHandle');
                request.onsuccess = () => {
                    resolve();
                };
                request.onerror = () => {
                    reject(new Error('Error storing dirHandle to IndexedDB'));
                };
            };
            openRequest.onerror = () => {
                reject(new Error('Error opening database'));
            };
        });
    });
}
// Retrieve Directory Handle from IndexedDB
function getStoredHandle() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("getStoredHandle");
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open('myDatabase', 1);
            openRequest.onsuccess = () => {
                const db = openRequest.result;
                const transaction = db.transaction('fileHandles', 'readonly');
                const objectStore = transaction.objectStore('fileHandles');
                const request = objectStore.get('dirHandle');
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result);
                    }
                    else {
                        resolve(null); // or resolve(undefined);
                    }
                };
                request.onerror = () => {
                    //reject(new Error('Error retrieving dirHandle from IndexedDB'));
                    resolve(null);
                };
            };
            openRequest.onerror = () => {
                reject(new Error('Error opening database'));
            };
        });
    });
}
