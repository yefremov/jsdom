"use strict";
const http = require("http");
const assert = require("chai").assert;
const describe = require("mocha-sugar-free").describe;
const it = require("mocha-sugar-free").it;

const jsdom = require("../../lib/newapi1.js");

require("chai").use(require("../chai-helpers.js"));

describe("newapi1: jsdom.fromURL", () => {
  it("should return a rejected promise for a bad URL", () => {
    return Promise.all([
      assert.isRejected(jsdom.fromURL("asdf"), TypeError),
      assert.isRejected(jsdom.fromURL(undefined), TypeError),
      assert.isRejected(jsdom.fromURL("fail.com"), TypeError)
    ]);
  });

  it("should return a rejected promise for a 404", () => {
    const url = simpleServer(404);

    return assert.isRejected(jsdom.fromURL(url));
  });

  it("should return a rejected promise for a 500", () => {
    const url = simpleServer(500);

    return assert.isRejected(jsdom.fromURL(url));
  });

  it("should use the body of 200 responses", () => {
    const url = simpleServer(200, { "Content-Type": "text/html" }, "<p>Hello</p>");

    return jsdom.fromURL(url).then(dom => {
      assert.strictEqual(dom.serialize(), "<html><head></head><body><p>Hello</p></body></html>");
    });
  });

  it("should use the body of 301 responses", () => {
    const [requestURL] = redirectServer("<p>Hello</p>", { "Content-Type": "text/html" });

    return jsdom.fromURL(requestURL).then(dom => {
      assert.strictEqual(dom.serialize(), "<html><head></head><body><p>Hello</p></body></html>");
    });
  });

  describe("inferring options from the response", () => {
    describe("url", () => {
      it("should use the URL fetched for a 200", () => {
        const url = simpleServer(200, { "Content-Type": "text/html" });

        return jsdom.fromURL(url).then(dom => {
          assert.strictEqual(dom.window.document.URL, url);
        });
      });

      it("should use the ultimate response URL after a redirect", () => {
        const [requestURL, responseURL] = redirectServer("<p>Hello</p>", { "Content-Type": "text/html" });

        return jsdom.fromURL(requestURL).then(dom => {
          assert.strictEqual(dom.window.document.URL, responseURL);
        });
      });

      it("should disallow passing a URL manually", () => {
        return assert.isRejected(jsdom.fromURL("http://example.com/", { url: "https://example.org" }), TypeError);
      });
    });

    describe("contentType", () => {
      it("should use the content type fetched for a 200", () => {
        const url = simpleServer(200, { "Content-Type": "application/xml" });

        return jsdom.fromURL(url).then(dom => {
          assert.strictEqual(dom.window.document.contentType, "application/xml");
        });
      });

      it("should use the ultimate response content type after a redirect", () => {
        const [requestURL] = redirectServer(
          "<p>Hello</p>",
          { "Content-Type": "text/html" },
          { "Content-Type": "application/xml" }
        );

        return jsdom.fromURL(requestURL).then(dom => {
          assert.strictEqual(dom.window.document.contentType, "application/xml");
        });
      });

      it("should disallow passing a content type manually", () => {
        return assert.isRejected(jsdom.fromURL("http://example.com/", { contentType: "application/xml" }), TypeError);
      });
    });
  });
});

function simpleServer(responseCode, headers, body) {
  const server = http.createServer((req, res) => {
    res.writeHead(responseCode, headers);
    res.end(body);
    server.close();
  }).listen();

  return `http://127.0.0.1:${server.address().port}/`;
}

function redirectServer(body, extraInitialResponseHeaders, ultimateResponseHeaders) {
  const server = http.createServer((req, res) => {
    if (req.url.endsWith("/1")) {
      res.writeHead(301, Object.assign({ "Location": "/2" }, extraInitialResponseHeaders));
      res.end();
    } else if (req.url.endsWith("/2")) {
      res.writeHead(200, ultimateResponseHeaders);
      res.end(body);
      server.close();
    } else {
      throw new Error("Unexpected route hit in redirect test server");
    }
  }).listen();

  const base = `http://127.0.0.1:${server.address().port}/`;

  return [base + "1", base + "2"];
}
