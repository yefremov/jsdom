"use strict";
const assert = require("chai").assert;
const describe = require("mocha-sugar-free").describe;
const it = require("mocha-sugar-free").it;

const jsdom = require("../../lib/newapi1.js");
const { version: packageVersion } = require("../../package.json");

describe("newapi1", () => {
  describe("basic functionality", () => {
    it("should have a window and a document", () => {
      const dom = jsdom();

      assert.isOk(dom.window);
      assert.isOk(dom.window.document);
    });

    it("should have a document with documentElement <html> when no arguments are passed", () => {
      const document = jsdom().window.document;

      assert.strictEqual(document.documentElement.localName, "html");
    });
  });

  describe("first argument", () => {
    it("should populate the resulting document with the given HTML", () => {
      const document = jsdom(`<a id="test" href="#test">`).window.document;

      assert.strictEqual(document.getElementById("test").getAttribute("href"), "#test");
    });

    it("should give the same document innerHTML for empty and whitespace and omitted strings", () => {
      const document1 = jsdom().window.document;
      const document2 = jsdom(undefined).window.document;
      const document3 = jsdom(``).window.document;
      const document4 = jsdom(` `).window.document;

      assert.strictEqual(document1.innerHTML, document2.innerHTML);
      assert.strictEqual(document2.innerHTML, document3.innerHTML);
      assert.strictEqual(document3.innerHTML, document4.innerHTML);
    });
  });

  describe("options", () => {
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

  describe("methods", () => {
    describe("serialize", () => {
      it("should serialize the default document correctly", () => {
        const dom = jsdom();

        assert.strictEqual(dom.serialize(), `<html><head></head><body></body></html>`);
      });

      it("should serialize a text-only document correctly", () => {
        const dom = jsdom(`hello`);

        assert.strictEqual(dom.serialize(), `<html><head></head><body>hello</body></html>`);
      });

      it("should serialize a document with HTML correctly", () => {
        const dom = jsdom(`<!DOCTYPE html><html><head></head><body><p>hello world!</p></body></html>`);

        assert.strictEqual(dom.serialize(),
                           `<!DOCTYPE html><html><head></head><body><p>hello world!</p></body></html>`);
      });
    });

    describe("nodeLocation", () => {
      it("should throw when includeNodeLocations is left as the default (false)", () => {
        const dom = jsdom(`<p>Hello</p>`);
        const node = dom.window.document.querySelector("p");

        assert.throws(() => dom.nodeLocation(node));
      });

      it("should throw when includeNodeLocations is set explicitly to false", () => {
        const dom = jsdom(`<p>Hello</p>`, { includeNodeLocations: false });
        const node = dom.window.document.querySelector("p");

        assert.throws(() => dom.nodeLocation(node));
      });

      it("should give the correct location for an element", () => {
        const dom = jsdom(`<p>Hello</p>`, { includeNodeLocations: true });
        const node = dom.window.document.querySelector("p");

        assert.deepEqual(dom.nodeLocation(node), {
          start: 0,
          end: 12,
          startTag: { start: 0, end: 3 },
          endTag: { start: 8, end: 12 }
        });
      });

      it("should give the correct location for a text node", () => {
        const dom = jsdom(`<p>Hello</p>`, { includeNodeLocations: true });
        const node = dom.window.document.querySelector("p").firstChild;

        assert.deepEqual(dom.nodeLocation(node), { start: 3, end: 8 });
      });

      it("should give the correct location for a void element", () => {
        const dom = jsdom(`<p>Hello
          <img src="foo.jpg">
        </p>`, { includeNodeLocations: true });
        const node = dom.window.document.querySelector("img");

        assert.deepEqual(dom.nodeLocation(node), { start: 19, end: 38 });
      });
    });

    describe("reconfigure", () => {
      describe("windowTop", () => {
        it("should reconfigure the window.top property (tested from the outside)", () => {
          const dom = jsdom();
          const newTop = { is: "top" };

          dom.reconfigure({ windowTop: newTop });

          assert.strictEqual(dom.window.top, newTop);
        });

        it("should reconfigure the window.top property (tested from the inside)", () => {
          const dom = jsdom(``, { runScripts: "dangerously" });
          const newTop = { is: "top" };

          dom.reconfigure({ windowTop: newTop });

          dom.window.document.body.innerHTML = `<script>
            window.topResult = top.is;
          </script>`;

          assert.strictEqual(dom.window.topResult, "top");
        });

        specify("Passing no top option does nothing", () => {
          const dom = jsdom();

          dom.reconfigure({ });

          assert.strictEqual(dom.window.top, dom.window);
        });

        specify("Passing undefined for top does change it to undefined", () => {
          const dom = jsdom();

          dom.reconfigure({ windowTop: undefined });

          assert.strictEqual(dom.window.top, undefined);
        });
      });

      describe("url", () => {
        it("should successfully change the URL", () => {
          const dom = jsdom(``, { url: "http://example.com/" });
          const window = dom.window;

          assert.strictEqual(window.document.URL, "http://example.com/");

          function testPass(urlString, expected = urlString) {
            dom.reconfigure({ url: urlString } );

            assert.strictEqual(window.location.href, expected);
            assert.strictEqual(window.document.URL, expected);
            assert.strictEqual(window.document.documentURI, expected);
          }

          testPass("http://localhost", "http://localhost/");
          testPass("http://www.localhost", "http://www.localhost/");
          testPass("http://www.localhost.com", "http://www.localhost.com/");
          testPass("https://localhost/");
          testPass("file://path/to/my/location/");
          testPass("http://localhost.subdomain.subdomain/");
          testPass("http://localhost:3000/");
          testPass("http://localhost/");
        });

        it("should throw and not impact the URL when trying to change to an unparseable URL", () => {
          const dom = jsdom(``, { url: "http://example.com/" });
          const window = dom.window;

          assert.strictEqual(window.document.URL, "http://example.com/");

          function testFail(url) {
            assert.throws(() => dom.reconfigure({ url }), TypeError);

            assert.strictEqual(window.location.href, "http://example.com/");
            assert.strictEqual(window.document.URL, "http://example.com/");
            assert.strictEqual(window.document.documentURI, "http://example.com/");
          }

          testFail("fail");
          testFail("/fail");
          testFail("fail.com");
          testFail(undefined);
        });


        it("should not throw and not impact the URL when no url option is given", () => {
          const dom = jsdom(``, { url: "http://example.com/" });
          const window = dom.window;

          assert.strictEqual(window.document.URL, "http://example.com/");

          assert.doesNotThrow(() => dom.reconfigure({ }));

          assert.strictEqual(window.location.href, "http://example.com/");
          assert.strictEqual(window.document.URL, "http://example.com/");
          assert.strictEqual(window.document.documentURI, "http://example.com/");
        });
      });
    });
  });
});
