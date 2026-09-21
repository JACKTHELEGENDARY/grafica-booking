const fs = require("fs");
const path = require("path");

let html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf-8");
const translationsCode = fs.readFileSync(path.join(__dirname, "public", "js", "translations.js"), "utf-8");

// Script inline di sicurezza per garantire la traduzione immediata
const inlineScript = `
  <script>
    ${translationsCode}

    function setLanguage(lang) {
      if (!translations || !translations[lang]) return;
      localStorage.setItem("app_lang", lang);
      const dict = translations[lang];

      // Aggiorna stile bottoni lingua
      document.querySelectorAll(".lang-btn").forEach(btn => {
        if (btn.getAttribute("data-lang") === lang) {
          btn.className = "lang-btn px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition bg-purple-600 text-white shadow-sm";
        } else {
          btn.className = "lang-btn px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition text-slate-400 hover:text-white";
        }
      });

      // Traduzione elementi con data-i18n
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key] !== undefined) {
          el.textContent = dict[key];
        }
      });

      // Traduzione placeholder
      document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (dict[key] !== undefined) {
          el.setAttribute("placeholder", dict[key]);
        }
      });

      // Legenda semaforo
      if (document.getElementById("legendTxtAspetto")) {
        document.getElementById("legendTxtAspetto").textContent = dict.statusAspetto;
        document.getElementById("legendTxtOccupato").textContent = dict.statusOccupato;
        document.getElementById("legendTxtLibero").textContent = dict.statusLibero;
      }

      // Filtri tabella
      if (document.getElementById("filterLabelAspetto")) {
        document.getElementById("filterLabelAspetto").textContent = dict.statusAspetto;
        document.getElementById("filterLabelOccupato").textContent = dict.statusOccupato;
        document.getElementById("filterLabelLibero").textContent = dict.statusLibero;
      }

      // Se la funzione della tabella è disponibile, re-renderizza la tabella con lo stato tradotto
      if (typeof renderBookingsTable === "function") {
        renderBookingsTable();
      }

      if (window.lucide) lucide.createIcons();
    }

    // Inizializza al caricamento
    document.addEventListener("DOMContentLoaded", function() {
      const savedLang = localStorage.getItem("app_lang") || "it";
      setLanguage(savedLang);
    });
  </script>
`;

// Sostituisci la chiusura del body con lo script inline
html = html.replace("</body>", inlineScript + "\n</body>");

fs.writeFileSync(path.join(__dirname, "public", "index.html"), html, "utf-8");
fs.writeFileSync(path.join(__dirname, "index.html"), html, "utf-8");
fs.writeFileSync(path.join("C:\\Users\\ulqui.DESKTOP-3LOFF3C\\Desktop\\Archivi\\grafica-booking", "index.html"), html, "utf-8");

console.log("INLINE TRANSLATION INJECTED INTO index.html SUCCESSFULLY!");
