const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(
  path.join(__dirname, "..", "Onothiti_Customer_Web_UI_v3 (2)", "01-login.html"),
  "utf8",
);
const match = html.match(/<style>([\s\S]*?)<\/style>/);
if (!match) throw new Error("no style");
let css = match[1].replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g, "");
fs.writeFileSync(path.join(__dirname, "..", ".html-extract", "design.css"), css);
console.log("css", css.length);
