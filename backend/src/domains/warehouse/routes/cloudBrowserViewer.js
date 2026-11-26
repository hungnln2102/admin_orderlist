const express = require("express");
const http = require("node:http");
const path = require("node:path");
const { authorize, closeSession, onSocket } = require("../services/cloudBrowserSessions");

const viewer = express.Router();
const assets = path.join(__dirname, "../viewer");
const viewerCsp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

viewer.use("/:id", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  try {
    req.cloudSession = authorize(req.params.id, req.sessionID);
    next();
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});
viewer.get("/:id/viewer", (_req, res) => res.set("Content-Security-Policy", viewerCsp).sendFile("index.html", { root: assets }));
viewer.get("/:id/viewer.css", (_req, res) => res.sendFile("viewer.css", { root: assets }));
viewer.get("/:id/viewer.mjs", (_req, res) => res.type("text/javascript").sendFile("viewer.mjs", { root: assets }));
viewer.use("/:id/novnc", express.static("/usr/share/novnc", { index: false, redirect: false }));
viewer.post("/:id/close", async (req, res) => {
  try {
    await closeSession(req.cloudSession);
    return res.json({ success: true });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
});

function attachViewerUpgrade(server, sessionMiddleware, adminRoles, isAllowedOrigin) {
  server.on("upgrade", (req, socket, head) => {
    socket.on("error", () => socket.destroy());
    const route = /^\/api\/warehouse\/cloud-browser\/sessions\/([a-f0-9-]{36})\/vnc$/.exec(req.url);
    if (!route || !req.headers.origin || !isAllowedOrigin(req.headers.origin)) return socket.destroy();
    const response = new http.ServerResponse(req);
    sessionMiddleware(req, response, (error) => {
      if (socket.destroyed) return;
      const role = String(req.session?.user?.role ?? "").trim().toLowerCase();
      if (error || !adminRoles.has(role)) return socket.destroy();
      let session;
      try {
        session = authorize(route[1], req.sessionID);
      } catch {
        return socket.destroy();
      }
      if (session.state !== "open" || session.closing) return socket.destroy();
      const headers = {
        Host: "localhost", Connection: "Upgrade", Upgrade: "websocket",
        "Sec-WebSocket-Key": req.headers["sec-websocket-key"],
        "Sec-WebSocket-Version": req.headers["sec-websocket-version"],
      };
      if (req.headers["sec-websocket-protocol"]) headers["Sec-WebSocket-Protocol"] = req.headers["sec-websocket-protocol"];
      let upstream;
      try {
        upstream = http.request({ socketPath: session.desktop.websocketPath, path: "/", headers });
      } catch {
        return socket.destroy();
      }
      onSocket(session, socket);
      socket.once("close", () => upstream.destroy());
      upstream.setTimeout(5000, () => socket.destroy());
      upstream.once("error", () => socket.destroy());
      upstream.once("response", (incoming) => {
        incoming.destroy();
        socket.destroy();
      });
      upstream.once("upgrade", (incoming, target, initial) => {
        target.on("error", () => socket.destroy());
        target.once("close", () => socket.destroy());
        socket.once("close", () => target.destroy());
        if (socket.destroyed) return target.destroy();
        target.setTimeout(0);
        const responseHeaders = incoming.rawHeaders.reduce((lines, header, index, all) =>
          index % 2 === 0 ? lines.concat(`${header}: ${all[index + 1]}`) : lines, []);
        socket.write(["HTTP/1.1 101 Switching Protocols", ...responseHeaders, "", ""].join("\r\n"));
        if (initial.length) socket.write(initial);
        if (head.length) target.write(head);
        socket.pipe(target).pipe(socket);
      });
      upstream.end();
    });
  });
}

module.exports = { viewer, attachViewerUpgrade };
