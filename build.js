// Builds a standalone, phone-ready copy of the game for GitHub Pages.
// Usage: node build.js   ->   writes docs/index.html
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const icon = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  '<rect x="2" y="2" width="13" height="13" rx="2" fill="#ff5a5f"/>' +
  '<rect x="17" y="2" width="13" height="13" rx="2" fill="#ffd23f"/>' +
  '<rect x="2" y="17" width="13" height="13" rx="2" fill="#2ec4f1"/>' +
  '<rect x="17" y="17" width="13" height="13" rx="2" fill="#3ddc84"/></svg>'
);

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#10162a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Brickfall">
<link rel="icon" href="data:image/svg+xml,${icon}">
<style>
  :root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
  body { font-size: 14px; }
</style>
`;

// Split the source: everything up to the first <div class="app"> is head material.
const bodyStart = src.indexOf('<div class="app">');
const out = head + src.slice(0, bodyStart) + "</head>\n<body>\n" + src.slice(bodyStart) + "\n</body>\n</html>\n";

fs.mkdirSync(path.join(__dirname, "docs"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "docs", "index.html"), out);
console.log("Wrote docs/index.html (" + out.length.toLocaleString() + " bytes)");
