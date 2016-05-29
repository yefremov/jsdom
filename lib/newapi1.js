"use strict";
const toughCookie = require("tough-cookie");
const whatgURL = require("whatwg-url").URL;
const URL = require("whatwg-url").URL;
const VirtualConsole = require("./jsdom/virtual-console.js");
const Window = require("./jsdom/browser/Window.js");
const locationInfo = require("./jsdom/living/helpers/internal-constants.js").locationInfo;
const domToHtml = require("./jsdom/browser/domtohtml.js").domToHtml;
const idlUtils = require("./jsdom/living/generated/utils.js");

// This file is an experimental new API for jsdom. You can use it via `require("jsdom/lib/newapi1")` as a replacement
// for `require("jsdom")`, to test and give us feedback.

// For the duration of the 9.x series, and possibly beyond, it will not change in backward-incompatible ways. However,
// in some future major release, it will either be removed entirely, or it will become the new jsdom API, taking over
// `require("jsdom")` and this file disappearing.

// TODO:
// - Implement new resourceLoader API. { allowed, fetch }
// - jsdom.fromFile; jsdom.fromURL
// - All the other options. Try to make sure existing uses are covered.

// Speculative possible APIs:
// - jsdom.fragment(html, options) -> creates a <template> for you
// - jsdom.jQuery(html, options) -> gives you back a $ function, with a $.dom to get back to the DOM.

// Resource loader brainstorming
// allowed: [...selectors]
// fetch(resource) -> Promise<string>
// - { url: string, referrer: string, defaultFetch(), element, cookie }

class CookieJar extends toughCookie.CookieJar {
  constructor(store, options) {
    // jsdom cookie jars must be loose by default
    super(store, Object.assign({ looseMode: true }, options));
  }
}

const window = Symbol("window");

class JSDOM {
  constructor(html, options) {
    html = normalizeHTML(html);
    options = normalizeOptions(options);

    this[window] = new Window({
      url: options.url,
      referrer: options.referrer,
      parsingMode: options.parsingMode,
      contentType: options.contentType,
      cookieJar: options.cookieJar,
      virtualConsole: options.virtualConsole
    });

    // TODO NEWAPI: this is still pretty hacky. It's also different than jsdom.jsdom. Does it work? Can it be better?
    const document = idlUtils.implForWrapper(this[window]._document);
    document._htmlToDom.appendHtmlToDocument(html, document);
    document.close();
  }

  get window() {
    return this[window];
  }

  get virtualConsole() {
    return this[window]._virtualConsole;
  }

  get cookieJar() {
    // TODO NEWAPI move this to window probably
    return idlUtils.implForWrapper(this[window]._document)._cookieJar;
  }

  get parsingMode() {
    return idlUtils.implForWrapper(this[window]._document)._parsingMode;
  }

  serialize() {
    return domToHtml([this[window]._document]);
  }

  nodeLocation(node) {
    return node[locationInfo];
  }

  reconfigureWindow(newProps) {
    if ("top" in newProps) {
      this[window]._top = newProps.top;
    }
  }

  changeURL(newURLString) {
    const document = idlUtils.implForWrapper(this[window]._document);

    const url = whatwgURL.parseURL(newURLString);
    if (url === "failure") {
      throw new TypeError(`Could not parse "${newURLString}" as a URL`);
    }

    document._URL = url;
    document._origin = whatwgURL.serializeURLToUnicodeOrigin(document._URL);
  }
}

function jsdom(html, options) {
  // TODO NEWAPI allow jsdom(options) only for default HTML?
  return new JSDOM(html, options);
}

function normalizeOptions(options) {
  const normalized = {};

  if (options === undefined) {
    options = {};
  }

  normalized.parsingMode = options.parsingMode === undefined ? "html" : String(options.parsingMode);
  if (normalized.parsingMode !== "html" && normalized.parsingMode !== "xml") {
    throw new RangeError(`parsingMode must be "html" or "xml"`);
  }

  normalized.contentType = options.contentType === undefined ?
                           getDefaultContentType(normalized.parsingMode) :
                           String(options.contentType);

  normalized.url = options.url === undefined ? "about:blank" : (new URL(options.url)).href;

  normalized.referrer = options.referrer === undefined ? "about:blank" : (new URL(options.referrer)).href;

  normalized.cookieJar = options.cookieJar === undefined ? new CookieJar() : options.cookieJar;

  normalized.virtualConsole = options.virtualConsole === undefined ? (new VirtualConsole()).sendTo(console) :
                              options.virtualConsole;

  // Cookie? Or have them set up their own cookie jar first?

  // concurrentNodeIterators?? deferClose?? parser??

  // created/loaded/done? probably subsumed by promises... maybe not created though. onCreated or some other name?

  return normalized;
}

function normalizeHTML(html) {
  if (html === undefined) {
    return "";
  }
  return String(html);
}

function getDefaultContentType(parsingMode) {
  return parsingMode === "xml" ? "application/xml" : "text/html";
}

module.exports = jsdom;

module.exports.JSDOM = JSDOM;
module.exports.VirtualConsole = VirtualConsole;
module.exports.CookieJar = CookieJar;
module.exports.toughCookie = toughCookie;
