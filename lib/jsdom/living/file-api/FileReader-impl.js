"use strict";
const DOMException = require("../../web-idl/DOMException");
const EventTargetImpl = require("../events/EventTarget-impl").implementation;
const parseContentType = require("../helpers/headers").parseContentType;
const normalizeEncoding = require("../helpers/encoding").normalizeEncoding;
const decodeString = require("../helpers/encoding").decodeString;
const ProgressEvent = require("../generated/ProgressEvent");
const blobSymbols = require("../blob-symbols");
const querystring = require("querystring");

const READY_STATES = Object.freeze({
  EMPTY: 0,
  LOADING: 1,
  DONE: 2
});

exports.implementation = class FileReaderImpl extends EventTargetImpl {
  constructor(args, privateData) {
    super([], privateData);

    this.error = null;
    this.readyState = READY_STATES.EMPTY;
    this.result = null;

    this.onloadstart = null;
    this.onprogress = null;
    this.onload = null;
    this.onabort = null;
    this.onerror = null;
    this.onloadened = null;
  }

  readAsArrayBuffer(file) {
    this._readFile(file, "buffer");
  }
  readAsDataURL(file) {
    this._readFile(file, "dataURL");
  }
  readAsText(file, encoding) {
    this._readFile(file, "text", normalizeEncoding(encoding) || "UTF-8");
  }

  abort() {
    if (this.readyState === READY_STATES.DONE || this.readyState === READY_STATES.EMPTY) {
      this.result = null;
      return;
    }

    if (this.readyState === READY_STATES.LOADING) {
      this.readyState = READY_STATES.DONE;
    }

    this._fireProgressEvent("abort");
    this._fireProgressEvent("loadend");
  }

  _fireProgressEvent(name, props) {
    const event = ProgressEvent.createImpl([name, Object.assign({ bubbles: false, cancelable: false }, props)], {});
    this.dispatchEvent(event);
  }

  _readFile(file, format, encoding) {
    if (!(blobSymbols.buffer in file)) {
      throw new TypeError("file argument must be a Blob");
    }

    if (this.readyState === READY_STATES.LOADING) {
      throw new DOMException(DOMException.INVALID_STATE_ERR);
    }
    if (file[blobSymbols.closed]) {
      this.error = new DOMException(DOMException.INVALID_STATE_ERR);
      this._fireProgressEvent("error");
    }

    this.readyState = READY_STATES.LOADING;
    this._fireProgressEvent("loadstart");

    process.nextTick(() => {
      let data = file[blobSymbols.buffer];
      if (!data) {
        data = new Buffer("");
      }
      this._fireProgressEvent("progress", {
        lengthComputable: !isNaN(file.size),
        total: file.size,
        loaded: data.length
      });

      process.nextTick(() => {
        switch (format) {
          default:
          case "buffer": {
            this.result = (new Uint8Array(data)).buffer;
            break;
          }
          case "dataURL": {
            let dataURL = "data:";
            const contentType = parseContentType(file.type);
            if (contentType && contentType.isText()) {
              const decoded = decodeString(data, {
                contentType,
                defaultEncoding: "UTF-8"
              });
              if (decoded.encoding !== contentType.get("charset")) {
                contentType.set("charset", decoded.encoding);
              }
              dataURL += contentType.toString();
              dataURL += ",";
              dataURL += querystring.escape(decoded.data);
            } else {
              if (contentType) {
                dataURL += contentType.toString();
              }
              dataURL += ";base64,";
              dataURL += data.toString("base64");
            }
            this.result = dataURL;
            break;
          }
          case "text": {
            this.result = decodeString(data, { defaultEncoding: encoding }).data;
            break;
          }
        }
        this.readyState = READY_STATES.DONE;
        this._fireProgressEvent("load");
        this._fireProgressEvent("loadend");
      });
    });
  }
};
