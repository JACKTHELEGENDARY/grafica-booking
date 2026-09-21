const fs = require("fs");
const path = require("path");

const translationsCode = fs.readFileSync(path.join(__dirname, "public", "js", "translations.js"), "utf-8");
const appCode = fs.readFileSync(path.join(__dirname, "public", "js", "app.js"), "utf-8");

// Combina translations dentro app.js
const combinedAppJs = translationsCode + "\n\n" + appCode + "\nwindow.setLanguage = setLanguage;\n";

fs.writeFileSync(path.join(__dirname, "public", "js", "app.js"), combinedAppJs, "utf-8");
fs.writeFileSync(path.join(__dirname, "app.js"), combinedAppJs, "utf-8");
fs.writeFileSync(path.join("C:\\Users\\ulqui.DESKTOP-3LOFF3C\\Desktop", "app.js"), combinedAppJs, "utf-8");

console.log("SUCCESS: combined app.js written to public/js/app.js, ./app.js, and Desktop/app.js");
