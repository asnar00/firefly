"use strict";
// ᕦ(ツ)ᕤ
// miso2
// author: asnaroo (with a little help from GPT4)
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
window.onload = function () { main(); };
var dirHandle = null;
var s_port = 8000;
var s_endPoint = "miso2";
var s_allCards;
var s_container;
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("ᕦ(ツ)ᕤ miso2.");
                    s_container = document.getElementById('container');
                    return [4 /*yield*/, setupDirectoryButton()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// On page load, see if we have a handle stored:
function checkStoredHandle() {
    return __awaiter(this, void 0, void 0, function () {
        var openDirectoryButton;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("checkStoredHandle");
                    return [4 /*yield*/, getStoredHandle()];
                case 1:
                    dirHandle = _a.sent();
                    if (!dirHandle) return [3 /*break*/, 4];
                    console.log('We already have a directory handle:', dirHandle);
                    return [4 /*yield*/, getPermission()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, testReadLocalFile()];
                case 3:
                    _a.sent();
                    openDirectoryButton = document.getElementById('openDirectory');
                    openDirectoryButton.remove();
                    return [3 /*break*/, 5];
                case 4:
                    console.log('No directory handle found. Ask the user.');
                    setupDirectoryButton();
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function setupDirectoryButton() {
    return __awaiter(this, void 0, void 0, function () {
        var openDirectoryButton;
        var _this = this;
        return __generator(this, function (_a) {
            openDirectoryButton = document.getElementById('openDirectory');
            openDirectoryButton.addEventListener('click', function () { return __awaiter(_this, void 0, void 0, function () {
                var card;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.log("button pressed!");
                            if (!window.showDirectoryPicker) {
                                console.log("showDirectoryPicker is null");
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, window.showDirectoryPicker()];
                        case 1:
                            dirHandle = _a.sent();
                            openDirectoryButton.remove();
                            return [4 /*yield*/, Promise.all([animateLogoToLeft(), testReadLocalFile()])];
                        case 2:
                            _a.sent();
                            card = findCard("function_main");
                            if (card) {
                                openCard(card, null);
                            }
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
// get permission to use the dirHandle, or whatever
function getPermission() {
    return __awaiter(this, void 0, void 0, function () {
        var permissionStatus, requestStatus;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dirHandle.queryPermission({ mode: 'read' })];
                case 1:
                    permissionStatus = _a.sent();
                    if (!(permissionStatus === 'granted')) return [3 /*break*/, 2];
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, dirHandle.requestPermission({ mode: 'read' })];
                case 3:
                    requestStatus = _a.sent();
                    if (requestStatus === 'granted') {
                        // Now you have permission, proceed with the operation
                    }
                    else {
                        console.error('Permission denied');
                    }
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
// test-reads the first file and sets text in browser
function testReadLocalFile() {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, _c, entry, file, filename, parts, ext, fullText, e_1_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log("testReadLocalFile");
                    // Assuming we are just reading the first file we find.
                    console.log("values...");
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 9, 10, 15]);
                    _b = __asyncValues(dirHandle.values());
                    _d.label = 2;
                case 2: return [4 /*yield*/, _b.next()];
                case 3:
                    if (!(_c = _d.sent(), !_c.done)) return [3 /*break*/, 8];
                    entry = _c.value;
                    if (!(entry.kind === 'file')) return [3 /*break*/, 7];
                    console.log("getFile...");
                    return [4 /*yield*/, entry.getFile()];
                case 4:
                    file = _d.sent();
                    filename = file.name;
                    parts = filename.split('.');
                    ext = parts.length > 1 ? '.' + parts.pop() : '';
                    console.log("readFileAsText...");
                    console.log("ext = '".concat(ext, "'"));
                    return [4 /*yield*/, readFileAsText(file)];
                case 5:
                    fullText = _d.sent();
                    return [4 /*yield*/, testImportCode(fullText, ext)];
                case 6:
                    _d.sent();
                    return [3 /*break*/, 8];
                case 7: return [3 /*break*/, 2];
                case 8: return [3 /*break*/, 15];
                case 9:
                    e_1_1 = _d.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 15];
                case 10:
                    _d.trys.push([10, , 13, 14]);
                    if (!(_c && !_c.done && (_a = _b.return))) return [3 /*break*/, 12];
                    return [4 /*yield*/, _a.call(_b)];
                case 11:
                    _d.sent();
                    _d.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 14: return [7 /*endfinally*/];
                case 15: return [2 /*return*/];
            }
        });
    });
}
function escapeHTML(unsafeText) {
    return unsafeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
// create a new HTML element from an HTML string
function element(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return div.firstChild;
}
// Read file on client machine in folder
function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (event) { return resolve(event.target.result); };
        reader.onerror = function (error) { return reject(error); };
        reader.readAsText(file);
    });
}
// Store Directory Handle in IndexedDB
function storeHandle() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var openRequest = indexedDB.open('myDatabase', 1);
                    openRequest.onupgradeneeded = function (event) {
                        var db = event.target.result;
                        if (!db.objectStoreNames.contains('fileHandles')) {
                            db.createObjectStore('fileHandles');
                        }
                    };
                    openRequest.onsuccess = function () {
                        var db = openRequest.result;
                        var transaction = db.transaction('fileHandles', 'readwrite');
                        var objectStore = transaction.objectStore('fileHandles');
                        var request = objectStore.put(dirHandle, 'dirHandle');
                        request.onsuccess = function () {
                            resolve();
                        };
                        request.onerror = function () {
                            reject(new Error('Error storing dirHandle to IndexedDB'));
                        };
                    };
                    openRequest.onerror = function () {
                        reject(new Error('Error opening database'));
                    };
                })];
        });
    });
}
// Retrieve Directory Handle from IndexedDB
function getStoredHandle() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log("getStoredHandle");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var openRequest = indexedDB.open('myDatabase', 1);
                    openRequest.onsuccess = function () {
                        var db = openRequest.result;
                        var transaction = db.transaction('fileHandles', 'readonly');
                        var objectStore = transaction.objectStore('fileHandles');
                        var request = objectStore.get('dirHandle');
                        request.onsuccess = function () {
                            if (request.result) {
                                resolve(request.result);
                            }
                            else {
                                resolve(null); // or resolve(undefined);
                            }
                        };
                        request.onerror = function () {
                            //reject(new Error('Error retrieving dirHandle from IndexedDB'));
                            resolve(null);
                        };
                    };
                    openRequest.onerror = function () {
                        reject(new Error('Error opening database'));
                    };
                })];
        });
    });
}
var dbInstance;
function openDB() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log("openDB");
            if (dbInstance) {
                console.log("already have a db instance");
                return [2 /*return*/, dbInstance];
            }
            console.log("creating db instance");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var request = indexedDB.open('myDatabase', 1); // 'myDatabase' is the name of your database.
                    // This event is only triggered once when the database is first created or when 
                    // the version number is changed (like from 1 to 2).
                    request.onupgradeneeded = function (event) {
                        console.log("onupgradeneeded");
                        var db = event.target.result;
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
                })];
        });
    });
}
// move the logo and shadow to the left of the window
function animateLogoToLeft() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var logoAndShadow = document.getElementById("logo_and_shadow");
                    // Set animation properties
                    logoAndShadow.style.animationName = "moveToLeft";
                    logoAndShadow.style.animationDuration = "0.25s";
                    logoAndShadow.style.animationTimingFunction = "ease-in-out";
                    logoAndShadow.style.animationFillMode = "forwards";
                    // Attach the animationend event listener
                    logoAndShadow.addEventListener('animationend', function onAnimationEnd() {
                        // Remove the event listener to prevent memory leaks
                        logoAndShadow.removeEventListener('animationend', onAnimationEnd);
                        resolve();
                    });
                    // Start the animation
                    logoAndShadow.style.left = "0";
                })];
        });
    });
}
// just a test: send the string back to the ranch, receive a full JSON analysis in the post
function testImportCode(fullText, ext) {
    return __awaiter(this, void 0, void 0, function () {
        var cards;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("importing code");
                    return [4 /*yield*/, runOnServer({ "command": "import", "code": fullText, "ext": ext })];
                case 1:
                    s_allCards = _a.sent();
                    cards = s_allCards.cards;
                    console.log("nCards:", cards.length);
                    return [2 /*return*/];
            }
        });
    });
}
// finds the card with the given UID, or null if doesn't exist
function findCard(uid) {
    var index = s_allCards.cards.findIndex(function (card) { return card.uid === uid; });
    if (index < 0)
        return null;
    return s_allCards.cards[index];
}
// generates HTML for card, but doesn't connect it yet
function cardToHTML(card) {
    var elem = element("<div id=\"".concat(card.uid, "\"class=\"code\" spellcheck=\"false\"; contenteditable=\"false\"; style=\"position:absolute; left: 10%;\"></div>"));
    var text = card.code[0].text;
    for (var i = card.dependsOn.length - 1; i >= 0; i--) {
        var dep = card.dependsOn[i];
        var iChar = dep.iChar;
        var jChar = dep.jChar;
        var before = text.slice(0, iChar);
        var link = text.slice(iChar, jChar);
        var after = text.slice(jChar);
        text = "".concat(before, "<span class=\"tag\" id=\"linkto_").concat(dep.target, "\">").concat(link, "</span>").concat(after);
    }
    elem.innerHTML = text;
    Array.from(elem.childNodes).forEach(function (child) {
        if (child.nodeType === Node.ELEMENT_NODE && child instanceof HTMLElement) {
            if (child.tagName.toLowerCase() === 'span') {
                child.addEventListener('click', function () {
                    openOrCloseCard(child, child.id.slice("linkto_".length));
                });
            }
        }
    });
    return elem;
}
// if a card view is closed, opens it; otherwise closes it
function openOrCloseCard(button, uid) {
    console.log("openOrCloseCard", uid);
    var card = findCard(uid);
    if (!card)
        return;
    console.log("found card:", card.uid);
    var existing = findCardDiv(uid);
    if (existing) {
        closeCard(existing);
    }
    else {
        openCard(card, button);
    }
}
// opens a card, optionally connected to a button element
function openCard(card, button) {
    console.log("openCard", card.uid);
    var elem = cardToHTML(card);
    if (button) {
        var parentCard = findCardContainingButton(button);
        if (parentCard) {
            var rect = getRect(parentCard);
            var brect = getRect(button);
            var left = rect.right + 32;
            var top_1 = (brect.top + brect.bottom) / 2;
            elem.style.left = "".concat(left, "px");
            elem.style.top = "".concat(top_1, "px");
        }
    }
    s_container.appendChild(elem);
    return elem;
}
// closes a card that's open, and all children as well
function closeCard(cardDiv) {
    cardDiv.remove();
    // todo: do children as well.
}
// given a uid, finds the div with that ID (the card div)
function findCardDiv(uid) {
    var elementsArray = Array.from(s_container.querySelectorAll("#".concat(uid)));
    if (elementsArray.length == 0)
        return null;
    return elementsArray[0];
}
// given a button, returns the card div that contains it
function findCardContainingButton(button) {
    var immediateParent = button.parentElement;
    while (immediateParent && immediateParent.parentElement !== s_container) {
        immediateParent = immediateParent.parentElement;
    }
    if (immediateParent) {
        return immediateParent;
    }
    else {
        return null;
    }
}
// given an element, returns the rectangle relative to document origin
function getRect(el) {
    var rect = el.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        right: rect.right + window.scrollX,
        width: rect.width,
        height: rect.height
    };
}
// sends a command request to the server, waits on the reply, returns dictionary object
function runOnServer(command) {
    return __awaiter(this, void 0, void 0, function () {
        var response, obj, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("http://localhost:".concat(s_port, "/").concat(s_endPoint), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(command)
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    obj = _a.sent();
                    return [2 /*return*/, obj];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error:', error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, []];
            }
        });
    });
}
