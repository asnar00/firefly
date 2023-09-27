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
// records or replays a stream of browser events
export class EventLog {
    constructor() {
        this.nRetries = 0;
        this.events = [];
        this.iFrame = 0;
        this.playMode = "none"; // or "record" or "replay"
        this.iEventReplay = 0;
        this.scrollEvent = null;
    }
    // set record-mode; from now on, all events get saved
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
    // serialise an event and add it to the log
    logEvent(event, elem) {
        let obj = this.serialiseEvent(event, elem);
        if (!obj) {
            console.log("failed to serialise event");
            return;
        }
        this.addEventToLog(obj);
    }
    // add a serialised-event object to the log
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
    // select replay mode, set "play cursor" to the beginning
    replay(eventLogPath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.playMode = "replay";
            this.events = yield remote("@firefly.load", { path: eventLogPath });
            console.log(`${this.events.length} events`);
            this.iEventReplay = 0;
        });
    }
    // call this once per frame to record or replay events
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
                        console.log("REPLAY FAILED:");
                        console.log(failure);
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
    // send all events to the server to be recorded, clear event log
    flush() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.playMode == "record") {
                yield remote("@firefly.saveEventLog", { events: this.events });
                this.events = [];
            }
        });
    }
    // stop recording or playback
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
    // saves the most recent scroll event in a stream of consecutive events
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
    // converts an event to a JSON object that can be stored
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
    // converts a serialised event to a "real" event (with 'synthetic' tag so we can tell the difference)
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
