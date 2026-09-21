const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Leggi le traduzioni da public/js/translations.js
const transRaw = fs.readFileSync(path.join(__dirname, "public", "js", "translations.js"), "utf-8").replace(/\uFEFF/g, "");

// Leggi index.html base (fino a prima degli script in fondo)
let html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf-8").replace(/\uFEFF/g, "");

// Rimuovi vecchi script prima di </body>
const bodyIndex = html.indexOf("<footer");
const footerEndIndex = html.indexOf("</footer>") + 9;
const headAndBody = html.substring(0, footerEndIndex);

const masterScript = `
  <!-- SCRIPT UNIFICATO AUTONOMO (NESSUNA DIPENDENZA ESTERNA O CONFLITTI) -->
  <script>
    ${transRaw.replace("const translations =", "window.I18N =").replace("window.translations = translations;", "")}

    var currentLang = localStorage.getItem("app_lang") || "it";
    var allBookings = [];
    var currentFilter = "all";
    var searchQuery = "";

    window.setLanguage = function(lang) {
      if (!window.I18N || !window.I18N[lang]) return;
      currentLang = lang;
      localStorage.setItem("app_lang", lang);
      var dict = window.I18N[lang];

      // Stile pulsanti lingua
      document.querySelectorAll(".lang-btn").forEach(function(btn) {
        if (btn.getAttribute("data-lang") === lang) {
          btn.className = "lang-btn px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition bg-purple-600 text-white shadow-sm";
        } else {
          btn.className = "lang-btn px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition text-slate-400 hover:text-white";
        }
      });

      // Traduci elementi con data-i18n
      document.querySelectorAll("[data-i18n]").forEach(function(el) {
        var key = el.getAttribute("data-i18n");
        if (dict[key] !== undefined) {
          el.textContent = dict[key];
        }
      });

      // Traduci placeholder con data-i18n-placeholder
      document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el) {
        var key = el.getAttribute("data-i18n-placeholder");
        if (dict[key] !== undefined) {
          el.setAttribute("placeholder", dict[key]);
        }
      });

      // Legenda semaforo
      var lAsp = document.getElementById("legendTxtAspetto");
      if (lAsp) lAsp.textContent = dict.statusAspetto;
      var lOcc = document.getElementById("legendTxtOccupato");
      if (lOcc) lOcc.textContent = dict.statusOccupato;
      var lLib = document.getElementById("legendTxtLibero");
      if (lLib) lLib.textContent = dict.statusLibero;

      // Filtri tabella
      var fAsp = document.getElementById("filterLabelAspetto");
      if (fAsp) fAsp.textContent = dict.statusAspetto;
      var fOcc = document.getElementById("filterLabelOccupato");
      if (fOcc) fOcc.textContent = dict.statusOccupato;
      var fLib = document.getElementById("filterLabelLibero");
      if (fLib) fLib.textContent = dict.statusLibero;

      // Re-render tabella pubblica con traduzione stati
      renderBookingsTable();

      if (window.lucide) lucide.createIcons();
    };

    function loadStudioInfo() {
      fetch("/api/public/info")
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.studioName) {
            var bEl = document.getElementById("brandStudioName");
            if (bEl && bEl.childNodes[0]) bEl.childNodes[0].textContent = data.studioName + " ";
          }
        })
        .catch(function(e) { console.log(e); });
    }

    function loadPublicBookings() {
      var tbody = document.getElementById("publicBookingsTableBody");
      fetch("/api/public/bookings")
        .then(function(res) { return res.json(); })
        .then(function(data) {
          allBookings = data;
          renderBookingsTable();
        })
        .catch(function() {
          if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-red-400">Impossibile caricare le prenotazioni al momento.</td></tr>';
        });
    }

    function renderBookingsTable() {
      var tbody = document.getElementById("publicBookingsTableBody");
      if (!tbody) return;
      var countBadge = document.getElementById("bookingsCountBadge");
      var noBookings = document.getElementById("noBookingsMessage");
      var dict = (window.I18N && window.I18N[currentLang]) ? window.I18N[currentLang] : {};

      var filtered = allBookings.filter(function(b) {
        var matchesFilter = (currentFilter === "all") || (b.status === currentFilter);
        var matchesSearch = !searchQuery || 
          b.publicName.toLowerCase().includes(searchQuery) || 
          b.id.toLowerCase().includes(searchQuery);
        return matchesFilter && matchesSearch;
      });

      var totalLabel = dict.totalRequests || "Richieste Totali";
      if (countBadge) countBadge.textContent = allBookings.length + " " + totalLabel;

      if (filtered.length === 0) {
        tbody.innerHTML = "";
        if (noBookings) noBookings.classList.remove("hidden");
        return;
      }

      if (noBookings) noBookings.classList.add("hidden");

      tbody.innerHTML = filtered.map(function(item) {
        var locale = currentLang === "en" ? "en-US" : (currentLang === "es" ? "es-ES" : "it-IT");
        var dateFormatted = new Date(item.createdAt).toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });

        var statusLabel = item.status;
        if (item.status === "Aspetto") statusLabel = dict.statusAspetto || "Aspetto";
        else if (item.status === "Occupato") statusLabel = dict.statusOccupato || "Occupato";
        else if (item.status === "Libero") statusLabel = dict.statusLibero || "Libero";

        var statusBadge = "";
        if (item.status === "Aspetto") {
          statusBadge = '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-aspetto"><span class="w-2 h-2 rounded-full dot-aspetto animate-pulse-dot"></span> 🔴 ' + statusLabel.toUpperCase() + '</span>';
        } else if (item.status === "Occupato") {
          statusBadge = '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-occupato"><span class="w-2 h-2 rounded-full dot-occupato animate-pulse-dot"></span> 🟡 ' + statusLabel.toUpperCase() + '</span>';
        } else if (item.status === "Libero") {
          statusBadge = '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-libero"><span class="w-2 h-2 rounded-full dot-libero"></span> 🟢 ' + statusLabel.toUpperCase() + '</span>';
        }

        var reservedText = dict.reservedBadge || "Riservato al grafico";

        return (
          '<tr class="hover:bg-white/[0.02] transition">' +
            '<td class="py-3.5 px-4 font-mono text-xs text-purple-400 font-semibold">#' + item.id + '</td>' +
            '<td class="py-3.5 px-4 font-medium text-white flex items-center gap-2">' +
              '<div class="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs text-purple-300 font-bold shrink-0">' +
                item.publicName.charAt(0) +
              '</div>' +
              '<span>' + escapeHtml(item.publicName) + '</span>' +
            '</td>' +
            '<td class="py-3.5 px-4 text-xs text-slate-400">' + dateFormatted + '</td>' +
            '<td class="py-3.5 px-4">' +
              '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900/90 text-slate-400 border border-white/5">' +
                '<i data-lucide="lock" class="w-3 h-3 text-amber-400/80"></i>' +
                '<span>' + reservedText + '</span>' +
              '</span>' +
            '</td>' +
            '<td class="py-3.5 px-4 text-center">' + statusBadge + '</td>' +
          '</tr>'
        );
      }).join("");

      if (window.lucide) lucide.createIcons();
    }

    document.addEventListener("DOMContentLoaded", function() {
      if (window.lucide) lucide.createIcons();
      window.setLanguage(currentLang);
      loadStudioInfo();
      loadPublicBookings();

      // Form prenotazione
      var bookingForm = document.getElementById("bookingForm");
      if (bookingForm) {
        bookingForm.addEventListener("submit", function(e) {
          e.preventDefault();
          var dict = (window.I18N && window.I18N[currentLang]) ? window.I18N[currentLang] : {};
          var btnSubmit = document.getElementById("btnSubmit");
          var btnText = document.getElementById("btnSubmitText");
          var originalText = btnText ? btnText.textContent : "INVIA";
          if (btnSubmit) btnSubmit.disabled = true;
          if (btnText) btnText.textContent = dict.submitBtnLoading || "Invio...";

          var payload = {
            clientName: document.getElementById("clientName").value,
            phone: document.getElementById("phone").value,
            email: document.getElementById("email").value,
            workType: document.getElementById("workType").value,
            description: document.getElementById("description").value,
            budget: document.getElementById("budget").value,
            deadline: document.getElementById("deadline").value
          };

          fetch("/api/public/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.error) throw new Error(data.error);
            document.getElementById("bookingForm").reset();
            document.getElementById("modalBookingId").textContent = "#" + data.booking.id;
            document.getElementById("modalClientName").textContent = data.booking.publicName;
            document.getElementById("modalStatusText").textContent = "🔴 " + (dict.statusAspetto || "ASPETTO").toUpperCase();

            var btnWa = document.getElementById("btnWhatsAppDirect");
            if (btnWa) {
              if (data.whatsappUrl) {
                btnWa.href = data.whatsappUrl;
                btnWa.classList.remove("hidden");
              } else {
                btnWa.classList.add("hidden");
              }
            }

            document.getElementById("successModal").classList.remove("hidden");
            loadPublicBookings();
          })
          .catch(function(err) {
            alert("Errore: " + err.message);
          })
          .finally(function() {
            if (btnSubmit) btnSubmit.disabled = false;
            if (btnText) btnText.textContent = originalText;
          });
        });
      }

      // Filtri stato
      document.querySelectorAll(".filter-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
          document.querySelectorAll(".filter-btn").forEach(function(b) {
            b.classList.remove("bg-purple-600", "text-white", "font-medium");
            b.classList.add("text-slate-400");
          });
          btn.classList.add("bg-purple-600", "text-white", "font-medium");
          btn.classList.remove("text-slate-400");
          currentFilter = btn.getAttribute("data-filter");
          renderBookingsTable();
        });
      });

      // Ricerca
      var searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.addEventListener("input", function(e) {
          searchQuery = e.target.value.toLowerCase().trim();
          renderBookingsTable();
        });
      }

      // Chiudi modal
      var btnCloseModal = document.getElementById("btnCloseModal");
      if (btnCloseModal) {
        btnCloseModal.addEventListener("click", function() {
          document.getElementById("successModal").classList.add("hidden");
        });
      }
    });

    function escapeHtml(string) {
      var entityMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return String(string).replace(/[&<>"']/g, function(s) { return entityMap[s]; });
    }
  </script>
</body>
</html>
`;

const finalHtml = headAndBody + "\n" + masterScript;

// Verifica di sintassi con Node VM
try {
  const scriptOnly = masterScript.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(scriptOnly);
  console.log("SYNTAX CHECK: Master script is 100% valid JS!");
} catch (e) {
  console.error("Syntax Error in master script:", e);
  process.exit(1);
}

// Scrivi su tutti i percorsi
fs.writeFileSync(path.join(__dirname, "public", "index.html"), finalHtml, "utf-8");
fs.writeFileSync(path.join(__dirname, "index.html"), finalHtml, "utf-8");
fs.writeFileSync("C:/Users/ulqui.DESKTOP-3LOFF3C/Desktop/index.html", finalHtml, "utf-8");
fs.writeFileSync("C:/Users/ulqui.DESKTOP-3LOFF3C/Desktop/Archivi/grafica-booking/index.html", finalHtml, "utf-8");

console.log("SUCCESS: Master self-contained index.html generated and validated!");
