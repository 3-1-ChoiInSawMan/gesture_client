import test from "node:test";
import assert from "node:assert/strict";
import { resolveCallSocketOptions, resolveChatSocketOptions } from "../src/components/videoroom/callSocketOptions.ts";

test("chat shares the call proxy without polling POST redirects", () => {
  for (const origin of ["http://localhost:3000", "https://gesture.example"]) {
    assert.deepEqual(resolveChatSocketOptions(origin), {
      url: `${origin}/chat`, path: "/socket.io", transports: ["polling"], addTrailingSlash: false,
    });
  }
});
test("direct chat uses the configured server with the chat namespace", () => {
  assert.deepEqual(resolveChatSocketOptions("https://gesture.example", {
    mode: "direct", url: "https://api.example/calls", path: "/custom",
  }), {
    url: "https://api.example/chat", path: "/custom", transports: ["polling", "websocket"], addTrailingSlash: true,
  });
});

test("local calls use the proxy even when the old remote URL remains configured", () => {
  assert.deepEqual(resolveCallSocketOptions("http://localhost:3000", {
    url: "ws://13.209.81.30:8080/calls", path: "/custom-path",
  }), { url: "http://localhost:3000/calls", path: "/socket.io", transports: ["polling"] });
});
test("HTTPS defaults to same-origin polling", () => {
  assert.equal(resolveCallSocketOptions("https://gesture.example").url, "https://gesture.example/calls");
});
test("explicit direct mode preserves the namespace and custom Engine.IO path", () => {
  assert.deepEqual(resolveCallSocketOptions("https://gesture.example", {
    mode: "direct", url: "wss://bff.example/calls", path: "/custom-path",
  }), { url: "https://bff.example/calls", path: "/custom-path", transports: ["polling", "websocket"] });
});
test("an insecure direct endpoint falls back to the proxy on HTTPS", () => {
  assert.equal(resolveCallSocketOptions("https://gesture.example", {
    mode: "direct", url: "ws://13.209.81.30:8080/calls",
  }).url, "https://gesture.example/calls");
});
