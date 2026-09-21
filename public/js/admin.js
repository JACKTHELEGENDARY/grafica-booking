let currentOtpPreview = "";
let pendingPin = "";
// Logica Amministratore / Grafico
let adminToken = localStorage.getItem("admin_pin") || "";
let adminBookings = [];
let adminFilter = "all";
let adminSearch = "";

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  // Verifica se già loggato
  if (adminToken) {
    tryLogin(adminToken, true);
  } else {
    showLogin();
  }

  // Form Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = document.getElementById("pinInput").value.trim();
      tryLogin(pin, false);
    });
  }

  // Logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("admin_pin");
      adminToken = "";
      showLogin();
    });
  }

  // Refresh
  const btnRefresh = document.getElementById("btnRefresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", loadAdminData);
  }

  // Filtri & Ricerca
  const filterSelect = document.getElementById("adminStatusFilter");
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      adminFilter = e.target.value;
      renderAdminList();
    });
  }

  const searchInput = document.getElementById("adminSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      adminSearch = e.target.value.toLowerCase().trim();
      renderAdminList();
    });
  }

  // Impostazioni Modal
  const btnOpenSettings = document.getElementById("btnOpenSettings");
  const settingsModal = document.getElementById("settingsModal");
  const btnCloseSettings = document.getElementById("btnCloseSettings");
  const btnCancelSettings = document.getElementById("btnCancelSettings");

  if (btnOpenSettings) {
    btnOpenSettings.addEventListener("click", openSettingsModal);
  }
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
  }
  if (btnCancelSettings) {
    btnCancelSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
  }

  const settingsForm = document.getElementById("settingsForm");
  if (settingsForm) {
    settingsForm.addEventListener("submit", handleSaveSettings);
  }

  // Test Email
  const btnTestEmail = document.getElementById("btnTestEmail");
  if (btnTestEmail) {
    btnTestEmail.addEventListener("click", handleTestEmail);
  }
});


  // Listener per Form Autenticazione a Due Fattori (2FA)
  const form2FA = document.getElementById("form2FA");
  if (form2FA) {
    form2FA.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = document.getElementById("otpCodeInput").value.trim();
      const errBox = document.getElementById("twoFactorError");
      const btnVerify = document.getElementById("btnVerify2FA");
      if (btnVerify) btnVerify.disabled = true;

      try {
        const res = await fetch("/api/admin/verify-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pendingPin, code })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          adminToken = data.token || pendingPin;
          localStorage.setItem("admin_pin", adminToken);
          showDashboard();
        } else {
          errBox.textContent = data.error || "Codice 2FA errato o scaduto. Riprova.";
          errBox.classList.remove("hidden");
        }
      } catch (err) {
        errBox.textContent = "Errore di connessione con il server.";
        errBox.classList.remove("hidden");
      } finally {
        if (btnVerify) btnVerify.disabled = false;
      }
    });
  }

  // Reinvia codice 2FA
  const btnResendOtp = document.getElementById("btnResendOtp");
  if (btnResendOtp) {
    btnResendOtp.addEventListener("click", async () => {
      if (!pendingPin) return;
      btnResendOtp.disabled = true;
      btnResendOtp.textContent = "Invio in corso...";
      try {
        const res = await fetch("/api/admin/resend-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pendingPin })
        });
        const data = await res.json();
        if (res.ok) {
          alert("Nuovo codice 2FA generato e inviato!");
          if (data.waDirectUrl) {
            document.getElementById("btnWaDirectOtp").href = data.waDirectUrl;
          }
        } else {
          alert("Errore reinvio: " + (data.error || "Riprova"));
        }
      } catch (e) {
        alert("Errore di connessione.");
      } finally {
        btnResendOtp.disabled = false;
        btnResendOtp.innerHTML = '<i data-lucide="rotate-ccw" class="w-3 h-3"></i> Reinvia codice';
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  // Torna allo Step PIN
  const btnBackToPin = document.getElementById("btnBackToPin");
  if (btnBackToPin) {
    btnBackToPin.addEventListener("click", () => {
      document.getElementById("step2FA").classList.add("hidden");
      document.getElementById("stepPin").classList.remove("hidden");
      pendingPin = "";
      if (window.lucide) lucide.createIcons();
    });
  }


  // Inserisci & Accedi automatico con il codice di sessione
  const btnAutoFillCode = document.getElementById("btnAutoFillCode");
  const displaySessionCode = document.getElementById("displaySessionCode");

  function autoFillAndSubmit() {
    if (!currentOtpPreview) return;
    const input = document.getElementById("otpCodeInput");
    if (input) {
      input.value = currentOtpPreview;
      const form = document.getElementById("form2FA");
      if (form) form.dispatchEvent(new Event("submit"));
    }
  }

  if (btnAutoFillCode) btnAutoFillCode.addEventListener("click", autoFillAndSubmit);
  if (displaySessionCode) displaySessionCode.addEventListener("click", autoFillAndSubmit);

  // Toggle box cambio numero
  const btnToggleChangePhone = document.getElementById("btnToggleChangePhone");
  const changePhoneBox = document.getElementById("changePhoneBox");
  if (btnToggleChangePhone && changePhoneBox) {
    btnToggleChangePhone.addEventListener("click", () => {
      changePhoneBox.classList.toggle("hidden");
    });
  }

  // Salva nuovo numero di telefono al volo
  const btnSaveNewPhone = document.getElementById("btnSaveNewPhone");
  if (btnSaveNewPhone) {
    btnSaveNewPhone.addEventListener("click", async () => {
      const newPhone = document.getElementById("inputNewPhone").value.trim();
      if (!newPhone) return alert("Inserisci un numero di cellulare valido.");

      btnSaveNewPhone.disabled = true;
      btnSaveNewPhone.textContent = "Salvataggio...";

      try {
        const res = await fetch("/api/admin/update-2fa-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pendingPin, newPhone })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert("Numero salvato con successo! Il codice è stato inviato al tuo cellulare.");
          currentOtpPreview = data.codePreview || "";
          document.getElementById("twoFactorPhoneDisplay").textContent = data.phoneMasked || newPhone;
          if (displaySessionCode) displaySessionCode.textContent = currentOtpPreview;
          if (data.waDirectUrl) document.getElementById("btnWaDirectOtp").href = data.waDirectUrl;
          changePhoneBox.classList.add("hidden");
        } else {
          alert("Errore: " + (data.error || "Riprova"));
        }
      } catch (e) {
        alert("Errore di connessione.");
      } finally {
        btnSaveNewPhone.disabled = false;
        btnSaveNewPhone.textContent = "Salva & Invia";
      }
    });
  }

function showLogin() {
  document.getElementById("stepPin")?.classList.remove("hidden");
  document.getElementById("step2FA")?.classList.add("hidden");
  pendingPin = "";
  document.getElementById("loginSection").classList.remove("hidden");
  document.getElementById("dashboardSection").classList.add("hidden");
  document.getElementById("authActions").classList.add("hidden");
  if (window.lucide) lucide.createIcons();
}

function showDashboard() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("dashboardSection").classList.remove("hidden");
  document.getElementById("authActions").classList.remove("hidden");
  loadAdminData();
  if (window.lucide) lucide.createIcons();
}

async function tryLogin(pin, isAuto = false) {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });

    const data = await res.json();
    if (res.ok) {
      if (data.requires2FA) {
        // Mostra schermata 2FA
        pendingPin = pin;
        currentOtpPreview = data.codePreview || "";
        const codeDisplay = document.getElementById("displaySessionCode");
        if (codeDisplay) codeDisplay.textContent = currentOtpPreview;
        document.getElementById("stepPin").classList.add("hidden");
        document.getElementById("step2FA").classList.remove("hidden");
        
        const phoneDisp = document.getElementById("twoFactorPhoneDisplay");
        if (phoneDisp) phoneDisp.textContent = data.phoneMasked || "+39 ••• ••00";

        const btnWa = document.getElementById("btnWaDirectOtp");
        if (btnWa && data.waDirectUrl) {
          btnWa.href = data.waDirectUrl;
        }

        const errBox = document.getElementById("twoFactorError");
        if (errBox) errBox.classList.add("hidden");

        const otpInput = document.getElementById("otpCodeInput");
        if (otpInput) {
          otpInput.value = "";
          setTimeout(() => otpInput.focus(), 150);
        }
        if (window.lucide) lucide.createIcons();
      } else if (data.success) {
        adminToken = pin;
        localStorage.setItem("admin_pin", pin);
        showDashboard();
      }
    } else {
      if (!isAuto) {
        alert(data.error || "PIN non valido. Riprova.");
      } else {
        showLogin();
      }
    }
  } catch (err) {
    console.error("Errore login:", err);
    if (!isAuto) alert("Errore di connessione al server.");
  }
}

async function loadAdminData() {
  try {
    const res = await fetch("/api/admin/bookings", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });

    if (res.status === 401) {
      localStorage.removeItem("admin_pin");
      showLogin();
      return;
    }

    if (!res.ok) throw new Error("Errore recupero dati");
    adminBookings = await res.json();
    updateStats();
    renderAdminList();
  } catch (err) {
    console.error("Errore loadAdminData:", err);
  }
}

function updateStats() {
  const total = adminBookings.length;
  const aspetto = adminBookings.filter(b => b.status === "Aspetto").length;
  const occupato = adminBookings.filter(b => b.status === "Occupato").length;
  const libero = adminBookings.filter(b => b.status === "Libero").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statAspetto").textContent = aspetto;
  document.getElementById("statOccupato").textContent = occupato;
  document.getElementById("statLibero").textContent = libero;
}

function renderAdminList() {
  const container = document.getElementById("adminBookingsList");
  const noBookings = document.getElementById("adminNoBookings");

  let filtered = adminBookings.filter(b => {
    const matchesFilter = (adminFilter === "all") || (b.status === adminFilter);
    const searchTarget = `${b.id} ${b.clientName} ${b.nickname || ''} ${b.workType} ${b.email} ${b.phone} ${b.description}`.toLowerCase();
    const matchesSearch = !adminSearch || searchTarget.includes(adminSearch);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = "";
    noBookings.classList.remove("hidden");
    return;
  }

  noBookings.classList.add("hidden");

  container.innerHTML = filtered.map(b => {
    const dateFormatted = new Date(b.createdAt).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const cleanPhone = (b.phone || "").replace(/[^0-9]/g, "");
    const waChatUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Ciao ${b.clientName} (@${b.nickname || b.publicName}), ti contatto in merito alla tua richiesta grafica #${b.id} (${b.workType}).`)}`;

    // Badge stato
    let badgeHtml = "";
    if (b.status === "Aspetto") {
      badgeHtml = `<span class="px-3 py-1 rounded-full text-xs font-bold badge-aspetto flex items-center gap-1.5"><span class="w-2 h-2 rounded-full dot-aspetto animate-pulse-dot"></span> 🔴 ASPETTO</span>`;
    } else if (b.status === "Occupato") {
      badgeHtml = `<span class="px-3 py-1 rounded-full text-xs font-bold badge-occupato flex items-center gap-1.5"><span class="w-2 h-2 rounded-full dot-occupato animate-pulse-dot"></span> 🟡 OCCUPATO</span>`;
    } else if (b.status === "Libero") {
      badgeHtml = `<span class="px-3 py-1 rounded-full text-xs font-bold badge-libero flex items-center gap-1.5"><span class="w-2 h-2 rounded-full dot-libero"></span> 🟢 LIBERO</span>`;
    }

    return `
      <div class="glass-panel p-5 sm:p-6 border border-white/10 hover:border-purple-500/30 transition">
        
        <!-- HEADER CARD -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div class="flex items-center gap-3">
            <span class="font-mono text-sm font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
              #${b.id}
            </span>
            <div>
              <h3 class="font-heading font-bold text-base text-white flex items-center gap-2">
                <span>${escapeHtml(b.clientName)}</span>
                <span class="text-xs font-normal text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  Nick pubblico: @${escapeHtml(b.nickname || b.publicName)}
                </span>
              </h3>
              <span class="text-[11px] text-slate-400">Ricevuta il ${dateFormatted}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${badgeHtml}
          </div>
        </div>

        <!-- CONTENUTO PRINCIPALE (VISIBILE SOLO AL GRAFICO) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 my-4">
          
          <!-- Dettagli del lavoro & descrizione -->
          <div class="lg:col-span-8 space-y-3">
            <div>
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tipo di Lavoro Richiesto (Nascosto al pubblico):</span>
              <div class="mt-1 inline-block px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 font-semibold text-sm border border-purple-500/30">
                🎨 ${escapeHtml(b.workType)}
              </div>
            </div>

            <div>
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Descrizione & Istruzioni del Cliente:</span>
              <div class="mt-1 p-3.5 rounded-xl bg-slate-900/90 border border-white/5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                ${escapeHtml(b.description)}
              </div>
            </div>

            <!-- Note Interne Grafico -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <i data-lucide="edit-3" class="w-3 h-3"></i> Note Interne del Grafico (Private)
                </span>
                <button onclick="saveInternalNotes('${b.id}')" class="text-[10px] text-cyan-300 hover:underline">
                  Salva Nota
                </button>
              </div>
              <textarea id="notes-${b.id}" rows="2" placeholder="Es. Inviata bozza 1 via WhatsApp; pagamento acconto ricevuto..." 
                class="glass-input w-full px-3 py-2 rounded-lg text-xs placeholder-slate-500">${escapeHtml(b.notes || "")}</textarea>
            </div>
          </div>

          <!-- Dati Contatto & Economici -->
          <div class="lg:col-span-4 bg-slate-900/60 rounded-xl p-4 border border-white/5 space-y-3 text-xs">
            <div class="pb-2 border-b border-white/10 font-semibold text-slate-300 uppercase text-[11px] tracking-wider">
              Contatti Cliente
            </div>

            <div>
              <span class="text-slate-500 text-[11px] block">Telefono / WhatsApp:</span>
              <a href="${waChatUrl}" target="_blank" class="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 font-semibold transition">
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                <span>${escapeHtml(b.phone)}</span>
              </a>
            </div>

            <div>
              <span class="text-slate-500 text-[11px] block">Email:</span>
              <a href="mailto:${escapeHtml(b.email)}" class="text-purple-300 hover:underline">
                ${escapeHtml(b.email || "Non fornita")}
              </a>
            </div>

            <div class="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
              <div>
                <span class="text-slate-500 text-[11px] block">Budget:</span>
                <span class="font-semibold text-emerald-400">${escapeHtml(b.budget || "N/D")}</span>
              </div>
              <div>
                <span class="text-slate-500 text-[11px] block">Scadenza:</span>
                <span class="font-semibold text-slate-300">${escapeHtml(b.deadline || "Flessibile")}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- FOOTER CARD: CAMBIO RAPIDO STATO -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-400">Imposta Stato:</span>
            
            <button onclick="updateStatus('${b.id}', 'Aspetto')" 
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${b.status === 'Aspetto' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
              <span class="w-2 h-2 rounded-full dot-aspetto"></span> 🔴 Aspetto
            </button>

            <button onclick="updateStatus('${b.id}', 'Occupato')" 
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${b.status === 'Occupato' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
              <span class="w-2 h-2 rounded-full dot-occupato"></span> 🟡 Occupato
            </button>

            <button onclick="updateStatus('${b.id}', 'Libero')" 
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${b.status === 'Libero' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
              <span class="w-2 h-2 rounded-full dot-libero"></span> 🟢 Libero
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="deleteBooking('${b.id}')" class="px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:text-white hover:bg-red-950/60 border border-red-500/20 transition flex items-center gap-1">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              <span>Elimina</span>
            </button>
          </div>
        </div>

      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

// Cambio Stato Rapido
async function updateStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/bookings/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      // Aggiorna stato locale
      const item = adminBookings.find(b => b.id === id);
      if (item) item.status = newStatus;
      updateStats();
      renderAdminList();
    } else {
      alert("Errore durante l'aggiornamento dello stato");
    }
  } catch (err) {
    console.error(err);
    alert("Errore di comunicazione col server");
  }
}

// Salva Note Interne
async function saveInternalNotes(id) {
  const notesText = document.getElementById(`notes-${id}`).value;
  try {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ notes: notesText })
    });

    if (res.ok) {
      alert("Nota interna salvata con successo!");
      const item = adminBookings.find(b => b.id === id);
      if (item) item.notes = notesText;
    } else {
      alert("Errore salvataggio nota");
    }
  } catch (err) {
    console.error(err);
  }
}

// Elimina Prenotazione
async function deleteBooking(id) {
  if (!confirm(`Sei sicuro di voler eliminare la prenotazione #${id}?`)) return;

  try {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${adminToken}` }
    });

    if (res.ok) {
      adminBookings = adminBookings.filter(b => b.id !== id);
      updateStats();
      renderAdminList();
    } else {
      alert("Errore eliminazione");
    }
  } catch (err) {
    console.error(err);
  }
}

// Gestione Impostazioni
async function openSettingsModal() {
  try {
    const res = await fetch("/api/admin/settings", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });
    if (!res.ok) return;
    const cfg = await res.json();

    document.getElementById("cfgStudioName").value = cfg.studioName || "";
    if (document.getElementById("cfg2faEnabled")) {
      document.getElementById("cfg2faEnabled").checked = cfg.twoFactor?.enabled !== false;
    }
    if (document.getElementById("cfg2faPhone")) {
      document.getElementById("cfg2faPhone").value = cfg.twoFactor?.phone || cfg.whatsappNumber || "";
    }
    document.getElementById("cfgAdminPin").value = cfg.adminPin || "";
    document.getElementById("cfgWhatsappNumber").value = cfg.whatsappNumber || "";
    document.getElementById("cfgEmailRecipient").value = cfg.emailRecipient || "";

    document.getElementById("cfgSmtpEnabled").checked = !!cfg.smtp?.enabled;
    document.getElementById("cfgSmtpHost").value = cfg.smtp?.host || "smtp.gmail.com";
    document.getElementById("cfgSmtpPort").value = cfg.smtp?.port || 587;
    document.getElementById("cfgSmtpUser").value = cfg.smtp?.user || "";
    document.getElementById("cfgSmtpPass").value = cfg.smtp?.pass || "";

    document.getElementById("settingsModal").classList.remove("hidden");
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Errore apertura impostazioni:", err);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();

  const payload = {
    studioName: document.getElementById("cfgStudioName").value.trim(),
    adminPin: document.getElementById("cfgAdminPin").value.trim(),
    whatsappNumber: document.getElementById("cfgWhatsappNumber").value.trim(),
    twoFactor: {
      enabled: document.getElementById("cfg2faEnabled") ? document.getElementById("cfg2faEnabled").checked : true,
      phone: document.getElementById("cfg2faPhone") ? document.getElementById("cfg2faPhone").value.trim() : document.getElementById("cfgWhatsappNumber").value.trim()
    },
    emailRecipient: document.getElementById("cfgEmailRecipient").value.trim(),
    smtp: {
      enabled: document.getElementById("cfgSmtpEnabled").checked,
      host: document.getElementById("cfgSmtpHost").value.trim(),
      port: Number(document.getElementById("cfgSmtpPort").value),
      user: document.getElementById("cfgSmtpUser").value.trim(),
      pass: document.getElementById("cfgSmtpPass").value.trim()
    }
  };

  try {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      // Se il PIN è cambiato, aggiorna il token locale
      if (payload.adminPin !== adminToken) {
        adminToken = payload.adminPin;
        localStorage.setItem("admin_pin", adminToken);
      }
      alert("Impostazioni salvate con successo!");
      document.getElementById("settingsModal").classList.add("hidden");
    } else {
      alert("Errore salvataggio: " + (data.error || "Riprova"));
    }
  } catch (err) {
    console.error(err);
    alert("Errore di connessione.");
  }
}

async function handleTestEmail() {
  const resultSpan = document.getElementById("testEmailResult");
  resultSpan.textContent = "Invio in corso...";

  try {
    const res = await fetch("/api/admin/test-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ type: "email" })
    });

    const data = await res.json();
    if (data.result?.sent) {
      resultSpan.textContent = "✅ Inviata con successo!";
      resultSpan.className = "text-[11px] text-emerald-400";
    } else {
      resultSpan.textContent = "⚠️ " + (data.result?.error || data.result?.reason || "Fallita");
      resultSpan.className = "text-[11px] text-amber-400";
    }
  } catch (err) {
    resultSpan.textContent = "❌ Errore";
    resultSpan.className = "text-[11px] text-red-400";
  }
}

function escapeHtml(string) {
  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return String(string).replace(/[&<>"']/g, s => entityMap[s]);
}


  // ==========================================
  // GESTIONE VETRINA SHOWCASE (ADMIN)
  // ==========================================
  const btnOpenShowcase = document.getElementById("btnOpenShowcase");
  const btnCloseShowcase = document.getElementById("btnCloseShowcase");
  const showcaseModal = document.getElementById("showcaseModal");
  const formAddShowcase = document.getElementById("formAddShowcase");
  const shFileInput = document.getElementById("shFileInput");
  const shImageUrl = document.getElementById("shImageUrl");

  if (btnOpenShowcase) {
    btnOpenShowcase.addEventListener("click", () => {
      if (showcaseModal) showcaseModal.classList.remove("hidden");
      loadAdminShowcase();
      if (window.lucide) lucide.createIcons();
    });
  }

  if (btnCloseShowcase) {
    btnCloseShowcase.addEventListener("click", () => {
      if (showcaseModal) showcaseModal.classList.add("hidden");
    });
  }

  // Upload file immagine locale in base64
  if (shFileInput) {
    shFileInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(event) {
        if (shImageUrl) shImageUrl.value = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Invio nuova creazione
  if (formAddShowcase) {
    formAddShowcase.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("btnSubmitShowcase");
      if (btn) btn.disabled = true;

      const payload = {
        title: document.getElementById("shTitle").value.trim(),
        category: document.getElementById("shCategory").value,
        imageUrl: document.getElementById("shImageUrl").value.trim(),
        tag: document.getElementById("shTag").value.trim(),
        description: document.getElementById("shDescription").value.trim()
      };

      try {
        const res = await fetch("/api/admin/showcase", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + adminToken
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        alert("Creazione pubblicata con successo nella vetrina!");
        formAddShowcase.reset();
        loadAdminShowcase();
      } catch (err) {
        alert("Errore pubblicazione: " + err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  async function loadAdminShowcase() {
    const listEl = document.getElementById("adminShowcaseList");
    if (!listEl) return;

    try {
      const res = await fetch("/api/public/showcase");
      const items = await res.json();

      if (!items || items.length === 0) {
        listEl.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">Nessuna creazione in vetrina. Aggiungine una sopra!</div>';
        return;
      }

      listEl.innerHTML = items.map(item => {
        return (
          '<div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-white/10 hover:border-lime-500/30 transition gap-3">' +
            '<div class="flex items-center gap-3 min-w-0">' +
              '<div class="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">' +
                '<img src="' + escapeHtml(item.imageUrl) + '" alt="" class="w-full h-full object-cover">' +
              '</div>' +
              '<div class="min-w-0">' +
                '<h5 class="text-xs font-bold text-white truncate">' + escapeHtml(item.title) + '</h5>' +
                '<span class="text-[10px] text-lime-400 font-semibold">' + escapeHtml(item.category) + '</span>' +
                (item.tag ? ' <span class="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">' + escapeHtml(item.tag) + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<button onclick="deleteShowcaseItem(\'' + item.id + '\')" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 transition shrink-0">' +
              'Elimina' +
            '</button>' +
          '</div>'
        );
      }).join("");

      if (window.lucide) lucide.createIcons();
    } catch (e) {
      listEl.innerHTML = '<div class="text-red-400 text-xs">Errore caricamento creazioni: ' + e.message + '</div>';
    }
  }

  window.deleteShowcaseItem = async function(id) {
    if (!confirm("Sei sicuro di voler rimuovere questa creazione dalla vetrina?")) return;
    try {
      const res = await fetch("/api/admin/showcase/" + id, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + adminToken }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      loadAdminShowcase();
    } catch (e) {
      alert("Errore eliminazione: " + e.message);
    }
  };
