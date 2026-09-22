const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(
  path.join(__dirname, "..", "Onothiti_Customer_Web_UI_v3 (2)", "01-login.html"),
  "utf8",
);
const match = html.match(/data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)/);
if (!match) {
  console.error("no embedded image");
  process.exit(1);
}
const buf = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
const dest = path.join(__dirname, "..", "web", "public", "hero.png");
fs.writeFileSync(dest, buf);
console.log("hero.png", buf.length);
