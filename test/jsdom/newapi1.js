"use strict";
const assert = require("chai").assert;
const describe = require("mocha-sugar-free").describe;
const it = require("mocha-sugar-free").it;

const jsdom = require("../../lib/newapi1.js");

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

    describe("contentType/parsingMode", () => {
      it("should allow customizing document content type via the contentType option", () => {
        const document = jsdom(``, { contentType: "text/html+funstuff" }).window.document;

        assert.strictEqual(document.contentType, "text/html+funstuff");
      });

      it("should have a default content type of text/html and parsing mode of html", () => {
        const dom = jsdom();
        const document = dom.window.document;

        assert.strictEqual(document.contentType, "text/html");
        assert.strictEqual(dom.parsingMode, "html");
      });

      it("should have a default content type of text/html with parsingMode html", () => {
        const dom = jsdom(``, { parsingMode: "html" });
        const document = dom.window.document;

        assert.strictEqual(document.contentType, "text/html");
        assert.strictEqual(dom.parsingMode, "html");
      });

      it("should have a default content type of application/xml with parsingMode xml", () => {
        const dom = jsdom(``, { parsingMode: "xml" });
        const document = dom.window.document;

        assert.strictEqual(document.contentType, "application/xml");
        assert.strictEqual(dom.parsingMode, "xml");
      });

      it("should be able to override the content type for parsingMode html documents", () => {
        const document = jsdom(``, { parsingMode: "html", contentType: "text/html+awesomesauce" }).window.document;

        assert.strictEqual(document.contentType, "text/html+awesomesauce");
      });

      it("should be able to override the content type for parsingMode xml documents", () => {
        const document = jsdom(``, { parsingMode: "xml", contentType: "application/xhtml+xml" }).window.document;

        assert.strictEqual(document.contentType, "application/xhtml+xml");
      });

      it("should disallow parsing modes that are not xml or html", () => {
        assert.throws(() => jsdom(``, { parsingMode: "sgml" }), RangeError);
      });
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

    describe("dangerouslyRunScripts", () => {
      it("should not execute any scripts by default", () => {
        const dom = jsdom(`<body>
          <script>document.body.appendChild(document.createElement("hr"));</script>
        </body>`);

        assert.strictEqual(dom.window.document.body.children.length, 1);
      });

      it("should execute scripts when set to true", () => {
        const dom = jsdom(`<body>
          <script>document.body.appendChild(document.createElement("hr"));</script>
        </body>`, { dangerouslyRunScripts: true });

        assert.strictEqual(dom.window.document.body.children.length, 2);
      });

      // Broken: right now dangerouslyRunScripts is what does the vm stuff, which makes window.eval exist :(
      it.skip("should not impact window.eval when omitted", () => {
        const window = jsdom().window;

        window.eval(`document.body.innerHTML = "<p>Hello, world!</p>";`);
        assert.strictEqual(window.document.body.children.length, 1);
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
      it("should give the correct location for an element", () => {
        const dom = jsdom(`<p>Hello</p>`);
        const node = dom.window.document.querySelector("p");

        assert.deepEqual(dom.nodeLocation(node), {
          start: 0,
          end: 12,
          startTag: { start: 0, end: 3 },
          endTag: { start: 8, end: 12 }
        });
      });

      it("should give the correct location for a text node", () => {
        const dom = jsdom(`<p>Hello</p>`);
        const node = dom.window.document.querySelector("p").firstChild;

        assert.deepEqual(dom.nodeLocation(node), { start: 3, end: 8 });
      });

      it("should give the correct location for a void element", () => {
        const dom = jsdom(`<p>Hello
          <img src="foo.jpg">
        </p>`);
        const node = dom.window.document.querySelector("img");

        assert.deepEqual(dom.nodeLocation(node), { start: 19, end: 38 });
      });
    });

    describe("reconfigureWindow", () => {
      it("should be able to reconfigure the top property (as tested from the outside)", () => {
        const dom = jsdom();
        const newTop = { is: "top" };

        dom.reconfigureWindow({ top: newTop });

        assert.strictEqual(dom.window.top, newTop);
      });

      it("should be able to reconfigure the top property (as tested from the inside)", () => {
        const dom = jsdom(``, { dangerouslyRunScripts: true });
        const newTop = { is: "top" };

        dom.reconfigureWindow({ top: newTop });

        dom.window.document.body.innerHTML = `<script>
          window.topResult = top.is;
        </script>`;

        assert.strictEqual(dom.window.topResult, "top");
      });

      specify("Passing no top option does nothing", () => {
        const dom = jsdom();

        dom.reconfigureWindow({ });

        assert.strictEqual(dom.window.top, dom.window);
      });

      specify("Passing undefined for top does change it to undefined", () => {
        const dom = jsdom();

        dom.reconfigureWindow({ top: undefined });

        assert.strictEqual(dom.window.top, undefined);
      });
    });

    describe.skip("changeURL", () => {

    });
  });
});
