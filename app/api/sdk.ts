import { Request, Response } from "@elements/app";

/**
 * The browser snippet. A page includes it with its DSN key:
 *
 *   <script src="https://faultkeep.example/sdk.js" data-key="fk_..." data-release="web@1.2.0"></script>
 *
 * It reports uncaught errors and unhandled promise rejections, and exposes
 * `faultkeep.setUser(user)` and `faultkeep.capture(error)`.
 */
const SDK = `(function () {
  var script = document.currentScript;
  if (!script || window.faultkeep) return;

  var key = script.getAttribute("data-key");
  var release = script.getAttribute("data-release") || "";
  var endpoint = script.getAttribute("data-endpoint") || new URL("/api/events", script.src).href;
  var user = null;
  var sent = 0;
  var last = "";
  var lastAt = 0;

  function send(error, fallbackMessage) {
    if (!key || sent >= 25) return;

    var message = (error && error.message) || fallbackMessage || String(error);
    var stack = (error && error.stack) || "";
    var fingerprint = message + stack;
    // The same error twice in a second is one error reported by two handlers.
    if (fingerprint === last && Date.now() - lastAt < 1000) return;
    last = fingerprint;
    lastAt = Date.now();
    sent++;

    var body = JSON.stringify({
      type: (error && error.name) || "",
      message: message,
      stack: stack,
      url: location.href,
      userAgent: navigator.userAgent,
      release: release,
      user: user,
      timestamp: new Date().toISOString()
    });

    var url = endpoint + (endpoint.indexOf("?") < 0 ? "?" : "&") + "key=" + encodeURIComponent(key);

    try {
      fetch(url, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } });
    } catch (e) {
      if (navigator.sendBeacon) navigator.sendBeacon(url, body);
    }
  }

  window.addEventListener("error", function (e) {
    if (e.error || e.message) send(e.error, e.message);
  });

  window.addEventListener("unhandledrejection", function (e) {
    var reason = e.reason;
    send(reason instanceof Error ? reason : null, "Unhandled rejection: " + (typeof reason === "string" ? reason : JSON.stringify(reason)));
  });

  window.faultkeep = {
    setUser: function (u) { user = u; },
    capture: function (error) { send(error); }
  };
})();
`;

export default function route(req: Request, res: Response) {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(SDK);
}
