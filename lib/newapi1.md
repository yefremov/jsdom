# jsdom New API Docs

We are currently attempting to build a new jsdom API which is simpler and more intuitive than the previous one. For now, you can acquire it via

```js
const jsdom = require("jsdom/lib/newapi1");
```

Like all parts of the public jsdom API, this will be stable for the duration of a major version. Eventually, when we feel the new API has reached parity with the previous one, we'll switch it over to being the default.

## Basic usage

To use jsdom, just pass it a string. You will get back a `JSDOM` object, which has a number of useful properties, notably `window`:

```js
const jsdom = require("jsdom/lib/newap1");

const dom = jsdom(`<!DOCTYPE html><p>Hello world</p>`);
console.log(dom.window.document.querySelector("p").textContent); // "Hello world"
```

(Note how jsdom will parse the HTML you pass it just like a browser does, including implied `<html>`, `<head>`, and `<body>` tags.)

The resulting object is an instance of the `JSDOM` class, which contains a number of useful properties and methods besides `window`. In general it can be used to act on the jsdom from the "outside," doing things that are not possible with the normal DOM APIs. For simple cases, where you don't need any of this functionality, we recommend a coding pattern like

```js
const window = jsdom(`...`).window;
// or even
const document = jsdom(`...`).window.document;
```

## Customizing jsdom

The `jsdom` function accepts a second parameter which can be used to customize your jsdom in the following ways.

### Simple Options

```js
const dom = jsdom(``, {
  url: "https://example.org/",
  referrer: "https://example.com/",
  contentType: "text/html+awesomesauce",
  parsingMode: "html"
});
```

- `url` sets the value returned by `document.URL` and `document.documentURI`, but it also affects things like resolution of relative URLs within the document, and same-origin checks used in fetching external resources. It defaults to `"about:blank"`.
- `referrer` just affects the value read from `document.referrer`. It defaults to `"about:blank"`.
- `contentType` just affects the value read from `document.contentType`. By default it will be `"text/html"`, unless you override the parsing mode to be XML (see below), in which case it will be `"application/xml"`.
- `parsingMode` can be either `"html"`, the default, or `"xml"`, indicating to parse the document as XML.

Note that both `url` and `referrer` are canonicalized before they're used, so e.g. if you pass in `"https:example.com"`, jsdom will interpret that as if you had given `"https://example.com/"`. If you pass an unparseable URL, the call will throw. (URLs are parsed according to the [URL Standard](http://url.spec.whatwg.org/).)

### Virtual Consoles

Like web browsers, jsdom has the concept of a "console", where information both directly logged from the page (via scripts executing inside the document) and information about errors that have occurred are logged. We call the user-controllable console a "virtual console", to distinguish it from the Node.js `console` API and from the inside-the-page `window.console` API.

By default, the `jsdom` function will return a `JSDOM` instance with a virtual console that forwards all its output to the Node.js console. To create your own virtual console and pass it to jsdom, you can override this default by doing

```js
const virtualConsole = new jsdom.VirtualConsole();
const dom = jsdom(``, { virtualConsole });
```

Code like this will create a virtual console with no behavior, which you can intercept by adding event listeners for all the possible console methods:

```js
virtualConsole.on("error", () => { ... });
virtualConsole.on("warn", () => { ... });
virtualConsole.on("info", () => { ... });
virtualConsole.on("dir", () => { ... });
// ... etc. See https://console.spec.whatwg.org/#logging
```

If you simply want to redirect the virtual console output to another console, like the default Node.js one, you can do

```js
virtualConsole.sendTo(console);
```

There is also a special event, `"jsdomError"`, which will fire with error objects to report errors from jsdom itself. This is similar to how error messages often show up in web browser consoles, even if they are not initiated by `console.error`. So far, the following errors are output this way:

- Errors loading or parsing external resources (scripts, stylesheets, frames, and iframes)
- Script execution errors that are not handled by a window `onerror` event handler that returns `true` or calls `event.preventDefault()`
- Calls to methods, like `window.alert`, which jsdom does not implement, but installs anyway for web compatibility

If you're using `sendTo(console)` to send errors to `console`, by default it will call `console.error` with information from `"jsdomError"` events. If you'd prefer to maintain a strict one-to-one mapping of events to method calls, and perhaps handle `"jsdomError"`s yourself, then you can do

```js
virtualConsole.sendTo(console, { omitJsdomErrors: true });
```

### Cookie Jars

## JSDOM Object API

### Retrieving jsdom properties

The property `window` retrieves the `Window` object that you created.

The properties `virtualConsole`, `cookieJar`, and `parsingMode` reflect the options you pass in, or the defaults if nothing was passed in for those options.

### Serializing the document with `serialize()`

### Getting the source location of a node with `nodeLocation(node)`

To find where a DOM node is within the source document, each `JSDOM` instance provides a `nodeLocation` method that returns the [parse5 location info](https://www.npmjs.com/package/parse5#options-locationinfo) for the node:

```js
const dom = jsdom(`<p>Hello
    <img src="foo.jpg">
  </p>`);

const document = dom.window.document;
const bodyEl = document.body; // implicitly created
const pEl = document.querySelector("p");
const textNode = pEl.firstChild;
const imgEl = document.querySelector("img");

console.log(dom.nodeLocation(bodyEl));   // null; it's not in the source
console.log(dom.nodeLocation(pEl));      // { start: 0, end: 39, startTag: ..., endTag: ... }
console.log(dom.nodeLocation(textNode)); // { start: 3, end: 13 }
console.log(dom.nodeLocation(imgEl));    // { start: 13, end: 32 }
```

#### Reconfiguring window properties with `reconfigureWindow(props)`

#### Changing the document URL with `changeURL(url)`
