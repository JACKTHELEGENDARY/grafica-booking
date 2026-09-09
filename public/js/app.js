// Logica Frontend per Prenotazioni & Tabella Pubblica
let allBookings = [];
let currentFilter = "all";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
  // Inizializza icone Lucide
  if (window.lucide) {
    lucide.createIcons();
  }

  loadStudioInfo();
  loadPublicBookings();

  // Form submit
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", handleBookingSubmit);
  }

  // Filtri stato
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => {
        b.classList.remove("bg-purple-600", "text-white", "font-medium");
        b.classList.add("text-slate-400");
      });
      btn.classList.add("bg-purple-600", "text-white", "font-medium");
      btn.classList.remove("text-slate-400");

      currentFilter = btn.getAttribute("data-filter");
      renderBookingsTable();
    });
  });

  // Ricerca testuale
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderBookingsTable();
    });
  }

  // Modal Chiudi
  const btnCloseModal = document.getElementById("btnCloseModal");
  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
      document.getElementById("successModal").classList.add("hidden");
    });
  }
});

// Carica info generali dello studio
async function loadStudioInfo() {
  try {
    const res = await fetch("/api/public/info");
    if (!res.ok) return;
    const data = await res.json();

    if (data.studioName) {
      document.getElementById("brandStudioName").childNodes[0].textContent = data.studioName + " ";
    }
    if (data.designerName) {
      document.getElementById("brandDesignerName").textContent = data.designerName + " • Grafica & Design";
    }
  } catch (err) {
    console.error("Errore caricamento info studio:", err);
  }
}

// Carica le prenotazioni pubbliche
async function loadPublicBookings() {
  const tbody = document.getElementById("publicBookingsTableBody");
  try {
    const res = await fetch("/api/public/bookings");
    if (!res.ok) throw new Error("Errore nel recupero dati");
    allBookings = await res.json();
    renderBookingsTable();
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-red-400">
          Impossibile caricare le prenotazioni al momento.
        </td>
      </tr>
    `;
  }
}

// Renderizza la tabella filtrata
function renderBookingsTable() {
  const tbody = document.getElementById("publicBookingsTableBody");
  const countBadge = document.getElementById("bookingsCountBadge");
  const noBookings = document.getElementById("noBookingsMessage");

  let filtered = allBookings.filter(b => {
    const matchesFilter = (currentFilter === "all") || (b.status === currentFilter);
    const matchesSearch = !searchQuery || 
      b.publicName.toLowerCase().includes(searchQuery) || 
      b.id.toLowerCase().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  countBadge.textContent = `${allBookings.length} Richieste Totali`;

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    noBookings.classList.remove("hidden");
    return;
  }

  noBookings.classList.add("hidden");

  tbody.innerHTML = filtered.map(item => {
    const dateFormatted = new Date(item.createdAt).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // Configurazione Stato e Colore richiesto
    let statusBadge = "";
    if (item.status === "Aspetto") {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-aspetto">
          <span class="w-2 h-2 rounded-full dot-aspetto animate-pulse-dot"></span>
          🔴 ASPETTO
        </span>
      `;
    } else if (item.status === "Occupato") {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-occupato">
          <span class="w-2 h-2 rounded-full dot-occupato animate-pulse-dot"></span>
          🟡 OCCUPATO
        </span>
      `;
    } else if (item.status === "Libero") {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold badge-libero">
          <span class="w-2 h-2 rounded-full dot-libero"></span>
          🟢 LIBERO
        </span>
      `;
    }

    return `
      <tr class="hover:bg-white/[0.02] transition">
        <td class="py-3.5 px-4 font-mono text-xs text-purple-400 font-semibold">
          #${item.id}
        </td>
        <td class="py-3.5 px-4 font-medium text-white flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs text-purple-300 font-bold shrink-0">
            ${item.publicName.charAt(0)}
          </div>
          <span>${escapeHtml(item.publicName)}</span>
        </td>
        <td class="py-3.5 px-4 text-xs text-slate-400">
          ${dateFormatted}
        </td>
        <td class="py-3.5 px-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-900/90 text-slate-400 border border-white/5">
            <i data-lucide="lock" class="w-3 h-3 text-amber-400/80"></i>
            <span>Riservato al grafico</span>
          </span>
        </td>
        <td class="py-3.5 px-4 text-center">
          ${statusBadge}
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Gestione invio nuova prenotazione
async function handleBookingSubmit(e) {
  e.preventDefault();

  const btnSubmit = document.getElementById("btnSubmit");
  const originalBtnHtml = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `
    <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
    <span>Invio richiesta in corso...</span>
  `;
  if (window.lucide) lucide.createIcons();

  const payload = {
    clientName: document.getElementById("clientName").value,
    phone: document.getElementById("phone").value,
    email: document.getElementById("email").value,
    workType: document.getElementById("workType").value,
    description: document.getElementById("description").value,
    budget: document.getElementById("budget").value,
    deadline: document.getElementById("deadline").value
  };

  try {
    const res = await fetch("/api/public/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Errore durante la prenotazione");
    }

    // Reset Form
    document.getElementById("bookingForm").reset();

    // Mostra Modal Successo con pulsante WhatsApp
    document.getElementById("modalBookingId").textContent = `#${data.booking.id}`;
    document.getElementById("modalClientName").textContent = data.booking.publicName;
    
    const btnWa = document.getElementById("btnWhatsAppDirect");
    if (data.whatsappUrl) {
      btnWa.href = data.whatsappUrl;
      btnWa.classList.remove("hidden");
    } else {
      btnWa.classList.add("hidden");
    }

    document.getElementById("successModal").classList.remove("hidden");

    // Ricarica la tabella pubblica
    await loadPublicBookings();

    // Scroll verso la tabella o evidenzia
    const tabella = document.getElementById("tabella-lavori");
    if (tabella) {
      tabella.scrollIntoView({ behavior: "smooth" });
    }

  } catch (err) {
    alert("Attenzione: " + err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = originalBtnHtml;
    if (window.lucide) lucide.createIcons();
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
