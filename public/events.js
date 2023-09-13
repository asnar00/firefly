// ᕦ(ツ)ᕤ
// events.ts
// author: asnaroo (with a little help from GPT4)
// quick-and-dirty rewindability : record and replay browser events
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { remote } from "./util.js";
import { setCursorToEnd } from "./util.js";
export class EventLog {
    constructor() {
        this.nRetries = 0;
        this.events = [];
        this.iFrame = 0;
        this.playMode = "none"; // or "record" or "replay"
        this.iEventReplay = 0;
        this.scrollEvent = null;
    }
    record() {
        return __awaiter(this, void 0, void 0, function* () {
            this.playMode = "record";
            this.events = [];
            yield remote("@firefly.startEventRecording", {});
            window.addEventListener('scroll', (event) => {
                this.saveScrollEvent(event.type, window.scrollX, window.scrollY);
            });
        });
    }
    logEvent(event, elem) {
        let obj = this.serialiseEvent(event, elem);
        if (!obj) {
            console.log("failed to serialise event");
            return;
        }
        this.addEventToLog(obj);
    }
    addEventToLog(obj) {
        if (obj.type == "scroll") {
            if (!this.scrollEvent ||
                (this.scrollEvent.iFrame == (obj.iFrame - 1) &&
                    this.scrollEvent.target == obj.target)) {
                this.scrollEvent = obj;
                return;
            }
        }
        this.events.push(obj);
    }
    replay(eventLogPath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.playMode = "replay";
            this.events = yield remote("@firefly.load", { path: eventLogPath });
            console.log(`${this.events.length} events`);
            this.iEventReplay = 0;
        });
    }
    update() {
        if (this.playMode == "replay") {
            if (this.iEventReplay >= this.events.length) {
                this.playMode = "none";
                return;
            }
            // issue as fast as possible
            if (this.iEventReplay < this.events.length) {
                let failure = this.issueEvent(this.events[this.iEventReplay]);
                if (failure == "") {
                    this.iEventReplay++;
                    this.nRetries = 0;
                }
                else {
                    this.nRetries++;
                    if (this.nRetries > 100) {
                        this.stop();
                    }
                }
            }
        }
        else if (this.playMode == "record") {
            if (this.scrollEvent && this.iFrame > this.scrollEvent.iFrame) {
                this.events.push(this.scrollEvent);
                this.scrollEvent = null;
            }
        }
        this.iFrame++;
    }
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.playMode == "record") {
                yield remote("@firefly.saveEventLog", { events: this.events });
                this.events = [];
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.playMode == "replay") {
                this.iEventReplay = this.events.length;
            }
            else if (this.playMode == "record") {
                this.iEventReplay = this.events.length;
                remote("@firefly.stopRecording", { events: this.events });
            }
            this.playMode = "none";
        });
    }
    saveScrollEvent(eventType, x, y) {
        if (this.playMode == "record") {
            let sev = {
                iFrame: this.iFrame,
                type: "scroll",
                eventType: eventType,
                target: "window",
                data: {
                    xScroll: window.scrollX,
                    yScroll: window.scrollY
                }
            };
            this.addEventToLog(sev);
        }
    }
    serialiseEvent(event, target) {
        if (event instanceof MouseEvent) {
            return {
                iFrame: this.iFrame,
                type: "mouse",
                eventType: event.type,
                target: target.id,
                data: {
                    pageX: event.pageX,
                    pageY: event.pageY,
                    button: event.button
                }
            };
        }
        else if (event instanceof KeyboardEvent) {
            return {
                iFrame: this.iFrame,
                type: "keyboard",
                eventType: event.type,
                target: target.id,
                data: {
                    key: event.key,
                    metaKey: event.metaKey
                }
            };
        }
        else if (event.type === "scroll") {
            return {
                iFrame: this.iFrame,
                type: "scroll",
                eventType: event.type,
                target: target.id,
                data: {
                    xScroll: target.scrollLeft,
                    yScroll: target.scrollTop
                }
            };
        }
        else if (event instanceof InputEvent) {
            return {
                iFrame: this.iFrame,
                type: "input",
                eventType: event.type,
                target: target.id,
                data: {
                    value: target.innerText
                }
            };
        }
        // Add more event types as needed
        console.log("unserialised event type", typeof (event));
        return null;
    }
    issueEvent(sev) {
        if (sev.eventType != 'mousemove') {
            //console.log(`frame ${s_iFrame}: ${sev.type}.${sev.eventType}`);
        }
        if (sev.target == "") {
            return "WARNING: recorded event has no target";
        }
        if (sev.target == "window" && sev.type == "scroll") {
            window.scrollTo(sev.data.xScroll, sev.data.yScroll);
            return "";
        }
        const target = document.getElementById(sev.target);
        if (!target) {
            return `WARNING: Element with ID ${sev.target} not found.`;
        }
        let event;
        switch (sev.type) {
            case "mouse":
                event = new MouseEvent(sev.eventType, {
                    bubbles: false,
                    cancelable: true,
                    view: window,
                    button: sev.data.button,
                    clientX: sev.data.pageX - window.scrollX,
                    clientY: sev.data.pageY - window.scrollY
                });
                break;
            case "keyboard":
                event = new KeyboardEvent(sev.eventType, {
                    bubbles: true,
                    cancelable: true,
                    key: sev.data.key,
                    metaKey: sev.data.metaKey
                });
                break;
            case "scroll":
                target.scrollLeft = sev.data.xScroll;
                target.scrollTop = sev.data.yScroll;
                return ""; // Since we've manually set the scroll, we don't need to dispatch an event
                break;
            case "input":
                target.innerText = sev.data.value;
                setCursorToEnd(target);
                event = new InputEvent(sev.eventType, {
                    bubbles: true,
                    cancelable: true
                });
                break;
            default:
                return `Unknown event type: ${sev.type}`;
        }
        event.synthetic = true;
        target.dispatchEvent(event);
        return "";
    }
}
