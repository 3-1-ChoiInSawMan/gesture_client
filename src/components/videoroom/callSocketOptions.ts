/** Keep Engine.IO polling on the page's origin unless direct access is explicit. */
export function resolveCallSocketOptions(
  pageOrigin: string,
  config: { mode?: string; url?: string; path?: string } = {},
): { url: string; path: string; transports: string[] } {
  const proxy = { url: `${pageOrigin}/calls`, path: "/socket.io", transports: ["polling"] };
  if (config.mode !== "direct" || !config.url) return proxy;
  const url = new URL(config.url.replace(/^ws/, "http"));
  // HTTPS pages cannot use an insecure direct endpoint.
  if (pageOrigin.startsWith("https:") && url.protocol !== "https:") return proxy;
  return { url: url.toString(), path: config.path || "/socket.io", transports: ["polling", "websocket"] };
}

export function resolveChatSocketOptions(
  pageOrigin: string,
  config: { mode?: string; url?: string; path?: string } = {},
) {
  const options = resolveCallSocketOptions(pageOrigin, config);
  const url = new URL(options.url);
  url.pathname = "/chat";
  return { ...options, url: url.toString(), addTrailingSlash: url.origin !== pageOrigin };
}
