"use strict";
const vm = require("vm");
const toughCookie = require("tough-cookie");
const whatwgURL = require("whatwg-url");
const { URL } = require("whatwg-url");
const idlUtils = require("./jsdom/living/generated/utils.js");
const VirtualConsole = require("./jsdom/virtual-console.js");
const Window = require("./jsdom/browser/Window.js");
const { locationInfo } = require("./jsdom/living/helpers/internal-constants.js");
const { domToHtml } = require("./jsdom/browser/domtohtml.js");
const { applyDocumentFeatures } = require("./jsdom/browser/documentfeatures.js");
const { parseContentType } = require("./jsdom/living/helpers/headers.js");
const { version: packageVersion } = require("../package.json");

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

    this[window] = new Window(options.windowOptions);

    // TODO NEWAPI: the whole "features" infrastructure is horrible and should be re-built. When we switch to newapi
    // wholesale, or perhaps before, we should re-do it. For now, just adapt the new, nice, public API into the old,
    // ugly, internal API.
    const features = {
      FetchExternalResources: [],
      ProcessExternalResources: false,
      SkipExternalResources: false
    };
    if (options.runScripts === "dangerously") {
      features.ProcessExternalResources = ["script"];
    }
    applyDocumentFeatures(this[window].document, features);

    if (options.runScripts === "outside-only") {
      vm.createContext(this[window]);
      this[window]._document._defaultView = this[window]._globalProxy = vm.runInContext("this", this[window]);
    }

    options.beforeParse(this[window]._globalProxy);

    // TODO NEWAPI: this is still pretty hacky. It's also different than jsdom.jsdom. Does it work? Can it be better?
    const document = idlUtils.implForWrapper(this[window]._document);
    document._htmlToDom.appendHtmlToDocument(html, document);
    document.close();
  }

  get window() {
    // It's important to grab the global proxy, instead of just the result of `new Window(...)`, since otherwise things
    // like `window.eval` don't exist.
    return this[window]._globalProxy;
  }

  get virtualConsole() {
    return this[window]._virtualConsole;
  }

  get cookieJar() {
    // TODO NEWAPI move this to window probably
    return idlUtils.implForWrapper(this[window]._document)._cookieJar;
  }

  serialize() {
    return domToHtml([this[window]._document]);
  }

  nodeLocation(node) {
    if (!idlUtils.implForWrapper(this[window]._document)._parseOptions.locationInfo) {
      throw new Error("Location information was not saved for this jsdom. Use includeNodeLocations during creation.")
    }

    return idlUtils.implForWrapper(node)[locationInfo];
  }

  reconfigure(settings) {
    if ("windowTop" in settings) {
      this[window]._top = settings.windowTop;
    }

    if ("url" in settings) {
      const document = idlUtils.implForWrapper(this[window]._document);

      const url = whatwgURL.parseURL(settings.url);
      if (url === "failure") {
        throw new TypeError(`Could not parse "${settings.url}" as a URL`);
      }

      document._URL = url;
      document._origin = whatwgURL.serializeURLToUnicodeOrigin(document._URL);
    }
  }
}

function jsdom(html, options) {
  return new JSDOM(html, options);
}

function normalizeOptions(options) {
  const normalized = {
    windowOptions: {
      // Defaults
      url: "about:blank",
      referrer: "about:blank",
      contentType: "text/html",
      parsingMode: "html",
      userAgent: `Mozilla/5.0 (${process.platform}) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/${packageVersion}`,
      parseOptions: { locationInfo: false },

      // Defaults filled in later
      virtualConsole: undefined,
      cookieJar: undefined
    },

    // Defaults
    runScripts: undefined,
    beforeParse() { }
  };

  if (options === undefined) {
    options = {};
  }

  if (options.contentType !== undefined) {
    const contentTypeParsed = parseContentType(options.contentType);
    if (contentTypeParsed === null) {
      throw new TypeError(`Could not parse the given content type of "${options.contentType}"`);
    }

    if (!contentTypeParsed.isHTML() && !contentTypeParsed.isXML()) {
      throw new RangeError(`The given content type of "${options.contentType}" was not a HTML or XML content type`);
    }

    normalized.windowOptions.contentType = contentTypeParsed.type + "/" + contentTypeParsed.subtype;
    normalized.windowOptions.parsingMode = contentTypeParsed.isHTML() ? "html" : "xml";
  }

  if (options.url !== undefined) {
    normalized.windowOptions.url = (new URL(options.url)).href;
  }

  if (options.referrer !== undefined) {
    normalized.windowOptions.referrer = (new URL(options.referrer)).href;
  }

  if (options.userAgent !== undefined) {
    normalized.windowOptions.userAgent = String(options.userAgent);
  }

  if (options.includeNodeLocations) {
    if (normalized.windowOptions.parsingMode === "xml") {
      throw new TypeError("Cannot set includeNodeLocations to true with an XML content type");
    }

    normalized.windowOptions.parseOptions = { locationInfo: true };
  }

  normalized.windowOptions.cookieJar = options.cookieJar === undefined ?
                                       new CookieJar() :
                                       options.cookieJar;

  normalized.windowOptions.virtualConsole = options.virtualConsole === undefined ?
                                            (new VirtualConsole()).sendTo(console) :
                                            options.virtualConsole;

  if (options.runScripts !== undefined) {
    normalized.runScripts = String(options.runScripts);
    if (normalized.runScripts !== "dangerously" && normalized.runScripts !== "outside-only") {
      throw new RangeError(`runScripts must be undefined, "dangerously", or "outside-only"`);
    }
  }

  if (options.beforeParse !== undefined) {
    normalized.beforeParse = options.beforeParse;
  }

  // concurrentNodeIterators?? deferClose?? parser??

  return normalized;
}

function normalizeHTML(html) {
  if (html === undefined) {
    return "";
  }
  return String(html);
}

module.exports = jsdom;

module.exports.JSDOM = JSDOM;
module.exports.VirtualConsole = VirtualConsole;
module.exports.CookieJar = CookieJar;
module.exports.toughCookie = toughCookie;
