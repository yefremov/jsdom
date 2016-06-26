"use strict";
const idlUtils = require("../generated/utils");
const conversions = require("webidl-conversions");
const Blob = require("../generated/Blob");

module.exports = class BlobImpl {
  constructor(args) {
    const parts = args[0];
    const properties = args[1];

    const buffers = [];

    if (parts) {
      for (const part of parts) {
        let buffer;
        if (part instanceof ArrayBuffer) {
          buffer = new Buffer(new Uint8Array(part));
        } else if (Blob.is(part)) {
          buffer = idlUtils.implForWrapper(part)._buffer;
        } else if (ArrayBuffer.isView(part)) {
          buffer = new Buffer(new Uint8Array(part.buffer, part.byteOffset, part.byteLength));
        } else {
          buffer = new Buffer(conversions.USVString(part));
        }
        buffers.push(buffer);
      }
    }

    this._buffer = Buffer.concat(buffers);

    this.type = properties.type.toLowerCase();
    if (!this._type.match(/^[\u0020-\u007E]*$/)) {
      this.type = "";
    }

    this.isClosed = false;
  }

  get size() {
    return this._buffer.length;
  }

  slice(start, end, contentType) {
    const buffer = this._buffer;
    const slicedBuffer = this._buffer.slice(
      start === undefined ? 0 : start,
      end === undefined ? this.size : end
    );

    const blob = Blob.create([[], { type: contentType === undefined ? this.type : contentType }], {});
    idlUtils.implForWrapper(blob)._buffer = slicedBuffer;

    return blob;
  }

  close() {
    this.isClosed = true;
  }
};
