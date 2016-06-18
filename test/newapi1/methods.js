"use strict";
const assert = require("chai").assert;
const describe = require("mocha-sugar-free").describe;
const it = require("mocha-sugar-free").it;

const jsdom = require("../../lib/newapi1.js");

describe("newapi1 methods", () => {
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

      assert.deepEqual(dom.nodeLocation(node), { start: 17, end: 36 });
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
