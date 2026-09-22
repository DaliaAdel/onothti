const fs = require("fs");
const path = require("path");
const outDir = path.join(__dirname, "..", ".html-extract");
fs.mkdirSync(outDir, { recursive: true });
const imgRe = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g;

function extract(dir, prefix) {
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".html") && !name.includes("Index"))) {
    let html = fs.readFileSync(path.join(dir, file), "utf8").replace(imgRe, "assets/hero.png");
    const start = html.search(/<body[^>]*>/i);
    const body = html.slice(start);
    fs.writeFileSync(path.join(outDir, `${prefix}-${file}`), body);
    console.log(prefix, file, body.length);
  }
}

extract(path.join(__dirname, "..", "Onothiti_Customer_Web_UI_v3 (2)"), "cu");
extract(path.join(__dirname, "..", "Onothiti_Provider_Web_UI_v3"), "pr");
