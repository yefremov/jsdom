"use strict";
const assert = require("chai").assert;
const describe = require("mocha-sugar-free").describe;
const it = require("mocha-sugar-free").it;

const jsdom = require("../../lib/newapi1.js");
const { version: packageVersion } = require("../../package.json");

describe("newapi1 options", () => {
  describe("referrer", () => {
    it("should allow customizing document.referrer via the referrer option", () => {
      const document = jsdom(``, { referrer: "http://example.com/" }).window.document;

      assert.strictEqual(document.referrer, "http://example.com/");
    });

    it("should throw an error when passing an invalid absolute URL for referrer", () => {
      assert.throws(() => jsdom(``, { referrer: "asdf" }), TypeError);
    });

    it("should canonicalize referrer URLs", () => {
      const document = jsdom(``, { referrer: "http:example.com" }).window.document;

      assert.strictEqual(document.referrer, "http://example.com/");
    });

    it("should have a default referrer URL of about:blank", () => {
      const document = jsdom().window.document;

      assert.strictEqual(document.referrer, "about:blank");
    });
  });

  describe("url", () => {
    it("should allow customizing document URL via the url option", () => {
      const window = jsdom(``, { url: "http://example.com/" }).window;

      assert.strictEqual(window.location.href, "http://example.com/");
      assert.strictEqual(window.document.URL, "http://example.com/");
      assert.strictEqual(window.document.documentURI, "http://example.com/");
    });

    it("should throw an error when passing an invalid absolute URL for url", () => {
      assert.throws(() => jsdom(``, { url: "asdf" }), TypeError);
    });

    it("should canonicalize document URLs", () => {
      const window = jsdom(``, { url: "http:example.com" }).window;

      assert.strictEqual(window.location.href, "http://example.com/");
      assert.strictEqual(window.document.URL, "http://example.com/");
      assert.strictEqual(window.document.documentURI, "http://example.com/");
    });

    it("should have a default document URL of about:blank", () => {
      const window = jsdom().window;

      assert.strictEqual(window.location.href, "about:blank");
      assert.strictEqual(window.document.URL, "about:blank");
      assert.strictEqual(window.document.documentURI, "about:blank");
    });
  });

  describe("contentType", () => {
    it("should have a default content type of text/html", () => {
      const dom = jsdom();
      const document = dom.window.document;

      assert.strictEqual(document.contentType, "text/html");
    });

    it("should allow customizing document content type via the contentType option", () => {
      const document = jsdom(``, { contentType: "application/funstuff+xml" }).window.document;

      assert.strictEqual(document.contentType, "application/funstuff+xml");
    });

    it("should not show content type parameters in document.contentType (HTML)", () => {
      const document = jsdom(``, { contentType: "text/html; charset=utf8" }).window.document;

      assert.strictEqual(document.contentType, "text/html");
    });

    it("should not show content type parameters in document.contentType (XML)", () => {
      const document = jsdom(``, { contentType: "application/xhtml+xml; charset=utf8" })
                       .window.document;

      assert.strictEqual(document.contentType, "application/xhtml+xml");
    });

    it("should disallow content types that are unparseable", () => {
      assert.throws(() => jsdom(``, { contentType: "" }), TypeError);
      assert.throws(() => jsdom(``, { contentType: "html" }), TypeError);
      assert.throws(() => jsdom(``, { contentType: "text/html/xml" }), TypeError);
    });

    it("should disallow content types that are not XML or HTML", () => {
      assert.throws(() => jsdom(``, { contentType: "text/sgml" }), RangeError);
      assert.throws(() => jsdom(``, { contentType: "application/javascript" }), RangeError);
      assert.throws(() => jsdom(``, { contentType: "text/plain" }), RangeError);
    });
  });

  describe("userAgent", () => {
    it("should have a default user agent following the correct pattern", () => {
      const expected = `Mozilla/5.0 (${process.platform}) AppleWebKit/537.36 ` +
                       `(KHTML, like Gecko) jsdom/${packageVersion}`;

      const dom = jsdom();
      assert.strictEqual(dom.window.navigator.userAgent, expected);
    });

    it("should set the user agent to the given value", () => {
      const dom = jsdom(``, { userAgent: "test user agent" });
      assert.strictEqual(dom.window.navigator.userAgent, "test user agent");
    });
  });

  describe("includeNodeLocations", () => {
    it("should throw when set to true alongside an XML content type", () => {
      assert.throws(() => jsdom(``, {
        includeNodeLocations: true,
        contentType: "application/xhtml+xml"
      }));
    });

    // mostly tested by nodeLocation() tests
  });

  describe("cookieJar", () => {
    it("should use the passed cookie jar", () => {
      const cookieJar = new jsdom.CookieJar();
      const dom = jsdom(``, { cookieJar });

      assert.strictEqual(dom.cookieJar, cookieJar);
    });

    it("should reflect changes to the cookie jar in document.cookie", () => {
      const cookieJar = new jsdom.CookieJar();
      const document = jsdom(``, { cookieJar }).window.document;

      cookieJar.setCookieSync("foo=bar", document.URL);

      assert.strictEqual(document.cookie, "foo=bar");
    });

    it("should have loose behavior by default when using the CookieJar constructor", () => {
      const cookieJar = new jsdom.CookieJar();
      const document = jsdom(``, { cookieJar }).window.document;

      cookieJar.setCookieSync("foo", document.URL);

      assert.strictEqual(document.cookie, "foo");
    });

    it("should have a loose-by-default cookie jar even if none is passed", () => {
      const dom = jsdom();
      const document = dom.window.document;

      dom.cookieJar.setCookieSync("foo", document.URL);

      assert.instanceOf(dom.cookieJar, jsdom.CookieJar);
      assert.strictEqual(document.cookie, "foo");
    });
  });

  describe("virtualConsole", () => {
    it("should use the passed virtual console", () => {
      const virtualConsole = new jsdom.VirtualConsole();
      const dom = jsdom(``, { virtualConsole });

      assert.strictEqual(dom.virtualConsole, virtualConsole);
    });

    it("should have a virtual console even if none is passed", () => {
      const dom = jsdom();
      assert.instanceOf(dom.virtualConsole, jsdom.VirtualConsole);
    });
  });

  describe("runScripts", () => {
    it("should not execute any scripts by default", () => {
      const dom = jsdom(`<body>
        <script>document.body.appendChild(document.createElement("hr"));</script>
      </body>`);

      assert.strictEqual(dom.window.document.body.children.length, 1);
      assert.strictEqual(dom.window.eval, undefined);
    });

    it("should execute <script>s and eval when set to \"dangerously\"", () => {
      const dom = jsdom(`<body>
        <script>document.body.appendChild(document.createElement("hr"));</script>
      </body>`, { runScripts: "dangerously" });
      dom.window.eval(`document.body.appendChild(document.createElement("p"));`);

      assert.strictEqual(dom.window.document.body.children.length, 3);
    });

    it("should only run eval when set to \"outside-only\"", () => {
      const dom = jsdom(`<body>
        <script>document.body.appendChild(document.createElement("hr"));</script>
      </body>`, { runScripts: "outside-only" });
      dom.window.eval(`document.body.appendChild(document.createElement("p"));`);

      assert.strictEqual(dom.window.document.body.children.length, 2);
    });
  });

  describe("beforeParse", () => {
    it("should execute with a window and document but no nodes", () => {
      let windowPassed;

      const dom = jsdom(``, {
        beforeParse(window) {
          assert.instanceOf(window, window.Window);
          assert.instanceOf(window.document, window.Document);

          assert.strictEqual(window.document.doctype, null);
          assert.strictEqual(window.document.documentElement, null);
          assert.strictEqual(window.document.childNodes.length, 0);

          windowPassed = window;
        }
      });

      assert.strictEqual(windowPassed, dom.window);
    });

    it("should not have built-ins on the window by default", () => {
      let windowPassed;

      const dom = jsdom(``, {
        beforeParse(window) {
          assert.strictEqual(window.Array, undefined);

          windowPassed = window;
        }
      });

      assert.strictEqual(windowPassed, dom.window);
    });

    it("should have built-ins on the window when running scripts outside-only", () => {
      let windowPassed;

      const dom = jsdom(``, {
        runScripts: "outside-only",
        beforeParse(window) {
          assert.typeOf(window.Array, "function");

          windowPassed = window;
        }
      });

      assert.strictEqual(windowPassed, dom.window);
    });

    it("should have built-ins on the window when running scripts dangerously", () => {
      let windowPassed;

      const dom = jsdom(``, {
        runScripts: "dangerously",
        beforeParse(window) {
          assert.typeOf(window.Array, "function");

          windowPassed = window;
        }
      });

      assert.strictEqual(windowPassed, dom.window);
    });
  });
});
