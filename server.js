const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Supporta file statici sia nella cartella root sia in public/
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "public")));
app.use("/js", express.static(__dirname));
app.use("/js", express.static(path.join(__dirname, "public", "js")));
app.use("/css", express.static(__dirname));
app.use("/css", express.static(path.join(__dirname, "public", "css")));

const BOOKINGS_FILE = fs.existsSync(path.join(__dirname, "data", "bookings.json"))
  ? path.join(__dirname, "data", "bookings.json")
  : (fs.existsSync(path.join(__dirname, "bookings.json")) ? path.join(__dirname, "bookings.json") : path.join(__dirname, "data", "bookings.json"));

const CONFIG_FILE = fs.existsSync(path.join(__dirname, "data", "config.json"))
  ? path.join(__dirname, "data", "config.json")
  : (fs.existsSync(path.join(__dirname, "config.json")) ? path.join(__dirname, "config.json") : path.join(__dirname, "data", "config.json"));

const SHOWCASE_FILE = fs.existsSync(path.join(__dirname, "data", "showcase.json"))
  ? path.join(__dirname, "data", "showcase.json")
  : (fs.existsSync(path.join(__dirname, "showcase.json")) ? path.join(__dirname, "showcase.json") : path.join(__dirname, "data", "showcase.json"));

// Helper: Leggi/Scrivi JSON
function readJson(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf-8");
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const clean = raw.replace(/^\uFEFF/, "");
    return JSON.parse(clean);
  } catch (err) {
    console.error(`Errore lettura ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error(`Errore scrittura ${filePath}:`, err);
    return false;
  }
}

// Config iniziale
function getConfig() {
  const fileConfig = readJson(CONFIG_FILE, {});
  return {
    studioName: fileConfig.studioName || process.env.STUDIO_NAME || "JL Graphic Studio",
    designerName: fileConfig.designerName || process.env.DESIGNER_NAME || "Graphic Designer",
    adminPin: fileConfig.adminPin || process.env.ADMIN_PIN || "admin123",
    whatsappNumber: fileConfig.whatsappNumber || process.env.WHATSAPP_NUMBER || "393400000000",
    emailRecipient: fileConfig.emailRecipient || process.env.EMAIL_RECIPIENT || "",
    smtp: {
      enabled: fileConfig.smtp?.enabled || false,
      host: fileConfig.smtp?.host || process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(fileConfig.smtp?.port || process.env.SMTP_PORT || 587),
      secure: fileConfig.smtp?.secure || false,
      user: fileConfig.smtp?.user || process.env.SMTP_USER || "",
      pass: fileConfig.smtp?.pass || process.env.SMTP_PASS || ""
    },
    callMeBot: {
      enabled: fileConfig.callMeBot?.enabled || false,
      phone: fileConfig.callMeBot?.phone || process.env.CALLMEBOT_PHONE || "",
      apiKey: fileConfig.callMeBot?.apiKey || process.env.CALLMEBOT_API_KEY || ""
    }
  };
}

// Helper per mascherare nome per privacy (es. "Mario Rossi" -> "Mario R.")
function maskName(fullName) {
  if (!fullName) return "Anonimo";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase() + ".";
  return `${first} ${lastInitial}`;
}

// Notifica via Email con Nodemailer
async function sendEmailNotification(booking, config) {
  if (!config.smtp.enabled || !config.smtp.user || !config.smtp.pass || !config.emailRecipient) {
    console.log("[EMAIL] Notifica email non configurata o disabilitata. Dati salvati regolarmente.");
    return { sent: false, reason: "SMTP non configurato" };
  }

  try {
    const transporter = nodemailer.createTransporter({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });

    const mailOptions = {
      from: `"${config.studioName}" <${config.smtp.user}>`,
      to: config.emailRecipient,
      subject: `🚨 NUOVA PRENOTAZIONE GRAFICA #${booking.id} - ${booking.clientName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
          <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">🎨 Nuova Richiesta di Lavoro Grafico</h1>
            <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">Codice Prenotazione: <strong>#${booking.id}</strong></p>
          </div>
          <div style="padding: 24px;">
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #a855f7;">
              <h3 style="margin: 0 0 10px 0; color: #cbd5e1; font-size: 14px; text-transform: uppercase;">Dati Cliente</h3>
              <p style="margin: 4px 0;"><strong>Nome Reale (Privato):</strong> ${booking.clientName}</p>
              <p style="margin: 4px 0;"><strong>Nickname Pubblico:</strong> ${booking.nickname || booking.publicName}</p>
              <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${booking.email}" style="color: #38bdf8;">${booking.email}</a></p>
              <p style="margin: 4px 0;"><strong>Telefono/WhatsApp:</strong> <a href="https://wa.me/${booking.phone.replace(/[^0-9]/g, "")}" style="color: #4ade80;">${booking.phone}</a></p>
            </div>

            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #38bdf8;">
              <h3 style="margin: 0 0 10px 0; color: #cbd5e1; font-size: 14px; text-transform: uppercase;">Dettagli Lavoro (Privati)</h3>
              <p style="margin: 4px 0;"><strong>Tipo di Lavoro:</strong> <span style="background: #475569; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${booking.workType}</span></p>
              <p style="margin: 4px 0;"><strong>Budget Indicativo:</strong> ${booking.budget || "Non specificato"}</p>
              <p style="margin: 4px 0;"><strong>Scadenza Desiderata:</strong> ${booking.deadline || "Flessibile"}</p>
              <div style="margin-top: 10px; padding: 10px; background: #0f172a; border-radius: 6px;">
                <strong>Descrizione:</strong><br/>
                <p style="margin: 6px 0 0 0; white-space: pre-wrap; color: #94a3b8;">${booking.description}</p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <span style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; background: #ef4444; color: white;">
                🔴 STATO INIZIALE: ASPETTO
              </span>
            </div>
          </div>
          <div style="background: #090d16; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
            Gestisci questa prenotazione dal tuo pannello admin di ${config.studioName}
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[EMAIL] Inviata con successo:", info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error("[EMAIL ERROR]:", err.message);
    return { sent: false, error: err.message };
  }
}

// Notifica WhatsApp automatica via CallMeBot (opzionale)
async function sendCallMeBotNotification(booking, config) {
  if (!config.callMeBot.enabled || !config.callMeBot.phone || !config.callMeBot.apiKey) {
    return { sent: false, reason: "CallMeBot non attivo" };
  }
  try {
    const text = encodeURIComponent(
      `🎨 *NUOVA PRENOTAZIONE GRAFICA #${booking.id}*\n\n` +
      `👤 *Nome Reale:* ${booking.clientName}\n` +
      `🏷️ *Nickname Pubblico:* ${booking.nickname || booking.publicName}\n` +
      `📁 *Lavoro:* ${booking.workType}\n` +
      `📞 *Tel:* ${booking.phone}\n` +
      `💰 *Budget:* ${booking.budget || "N/D"}\n` +
      `📝 *Descrizione:* ${booking.description.substring(0, 150)}...\n\n` +
      `🔴 *Stato:* ASPETTO`
    );
    const url = `https://api.callmebot.com/whatsapp.php?phone=${config.callMeBot.phone}&text=${text}&apikey=${config.callMeBot.apiKey}`;
    const response = await fetch(url);
    return { sent: response.ok };
  } catch (e) {
    console.error("[CALLMEBOT ERROR]:", e.message);
    return { sent: false, error: e.message };
  }
}

// Generatore link WhatsApp Click-to-Chat precompilato
function generateWhatsAppUrl(booking, targetPhone) {
  const cleanPhone = (targetPhone || "").replace(/[^0-9]/g, "");
  const message = 
    `🎨 *RICHIESTA PRENOTAZIONE LAVORO GRAFICO*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 *ID Richiesta:* #${booking.id}\n` +
    `👤 *Nome Reale (Privato):* ${booking.clientName}\n` +
    `🏷️ *Nickname Pubblico:* ${booking.nickname || booking.publicName}\n` +
    `📧 *Email:* ${booking.email || "Non indicata"}\n` +
    `📱 *Tel/WA:* ${booking.phone}\n` +
    `🎯 *Tipo Lavoro:* ${booking.workType}\n` +
    `💶 *Budget:* ${booking.budget || "Da concordare"}\n` +
    `📅 *Scadenza:* ${booking.deadline || "Flessibile"}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 *Dettagli:* \n${booking.description}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔴 *Stato sul sito:* ASPETTO`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// ==========================================
// 1. API PUBBLICHE (Visibili a chiunque)
// ==========================================

// Info generali studio & statistiche slot
app.get("/api/public/info", (req, res) => {
  const config = getConfig();
  const bookings = readJson(BOOKINGS_FILE, []);
  
  const stats = {
    total: bookings.length,
    aspetto: bookings.filter(b => b.status === "Aspetto").length,
    occupato: bookings.filter(b => b.status === "Occupato").length,
    libero: bookings.filter(b => b.status === "Libero").length
  };

  res.json({
    studioName: config.studioName,
    designerName: config.designerName,
    whatsappNumber: config.whatsappNumber,
    stats,
    // Indicatore disponibilità generale
    isAcceptingRequests: true
  });
});

// VETRINA SHOWCASE PUBBLICA: Ultime Creazioni & Lavori Realizzati
app.get("/api/public/showcase", (req, res) => {
  const showcase = readJson(SHOWCASE_FILE, []);
  res.json(showcase);
});

// LISTA PUBBLICA: Mostra SOLO la lista delle persone (tramite Nickname pubblico) e lo stato (Rosso/Giallo/Verde)
// OCCULTA TOTALMENTE il nome reale, tipo del lavoro, dettagli, email, budget, etc.
app.get("/api/public/bookings", (req, res) => {
  const bookings = readJson(BOOKINGS_FILE, []);
  
  // SANITIZZAZIONE RIGOROSA PER LA PRIVACY: IL NOME REALE NON VIENE MAI INVIATO AL PUBBLICO
  const publicList = bookings.map(b => ({
    id: b.id,
    publicName: b.publicName || b.nickname || "Utente",
    status: b.status || "Aspetto", // "Aspetto" (🔴), "Occupato" (🟡), "Libero" (🟢)
    createdAt: b.createdAt
  })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(publicList);
});

// Invio nuova prenotazione da parte del cliente
app.post("/api/public/bookings", async (req, res) => {
  try {
    const { clientName, nickname, email, phone, workType, description, deadline, budget, privacyConsent, anonymousQueue } = req.body;

    if (!privacyConsent) {
      return res.status(400).json({ 
        error: "È obbligatorio accettare l'Informativa sulla Privacy (GDPR & CCPA) per poter procedere." 
      });
    }

    if (!clientName || !nickname || !phone || !workType || !description) {
      return res.status(400).json({ 
        error: "Compila tutti i campi obbligatori (Nome e Cognome reale, Nickname pubblico, Telefono, Tipo lavoro, Descrizione)." 
      });
    }

    const config = getConfig();
    const bookings = readJson(BOOKINGS_FILE, []);

    const bookingId = "BK-" + Math.floor(1000 + Math.random() * 9000);
    const cleanNick = nickname.trim();
    const publicDisplayName = anonymousQueue ? `Riservato #${bookingId}` : cleanNick;

    const newBooking = {
      id: bookingId,
      clientName: clientName.trim(), // Nome Reale (RISERVATO, visibile SOLO all'amministratore)
      nickname: cleanNick,           // Nickname Pubblico (obbligatorio, visibile nel sito)
      publicName: publicDisplayName, // Nome visibile pubblicamente nella coda
      email: (email || "").trim(),
      phone: phone.trim(),
      workType: workType.trim(),
      description: description.trim(),
      deadline: deadline || "",
      budget: budget || "",
      privacyConsent: true,
      privacyConsentDate: new Date().toISOString(),
      anonymousQueue: !!anonymousQueue,
      status: "Aspetto", // Default iniziale: ROSSO ASPETTO
      createdAt: new Date().toISOString(),
      notes: ""
    };

    bookings.unshift(newBooking);
    writeJson(BOOKINGS_FILE, bookings);

    // Genera URL WhatsApp per il grafico
    const waUrl = generateWhatsAppUrl(newBooking, config.whatsappNumber);

    // Esegui notifiche in background senza bloccare la risposta
    sendEmailNotification(newBooking, config).catch(e => console.error(e));
    sendCallMeBotNotification(newBooking, config).catch(e => console.error(e));

    res.status(201).json({
      success: true,
      booking: {
        id: newBooking.id,
        publicName: newBooking.publicName,
        status: newBooking.status,
        createdAt: newBooking.createdAt
      },
      whatsappUrl: waUrl,
      message: "Prenotazione inviata con successo! Verrai ricontattato a breve."
    });
  } catch (err) {
    console.error("Errore salvataggio prenotazione:", err);
    res.status(500).json({ error: "Si è verificato un errore durante la prenotazione." });
  }
});

// Diritto all'oblio (GDPR Art. 17 & CCPA Deletion)
app.post("/api/public/privacy/delete-my-data", (req, res) => {
  const { bookingId, contact } = req.body;
  if (!bookingId || !contact) {
    return res.status(400).json({ error: "Inserisci il Codice Prenotazione e l'Email o Telefono inseriti al momento della richiesta." });
  }

  const cleanId = bookingId.trim().toUpperCase().replace(/^#/, "");
  const cleanContact = contact.trim().toLowerCase().replace(/[^a-z0-9@.]/g, "");

  let bookings = readJson(BOOKINGS_FILE, []);
  const initialLength = bookings.length;

  bookings = bookings.filter(b => {
    const bId = (b.id || "").toUpperCase().replace(/^#/, "");
    const bEmail = (b.email || "").toLowerCase().replace(/[^a-z0-9@.]/g, "");
    const bPhone = (b.phone || "").replace(/[^0-9]/g, "");
    
    if (bId === cleanId) {
      if (bEmail && (bEmail === cleanContact || bEmail.includes(cleanContact))) return false; // Elimina
      if (bPhone && (bPhone.includes(cleanContact) || cleanContact.includes(bPhone))) return false; // Elimina
    }
    return true;
  });

  if (bookings.length === initialLength) {
    return res.status(404).json({ error: "Nessuna richiesta trovata corrispondente a questo Codice e Contatto." });
  }

  writeJson(BOOKINGS_FILE, bookings);
  return res.json({ success: true, message: "I tuoi dati sono stati rimossi definitivamente dall'archivio in conformità al GDPR (Art. 17) e CCPA." });
});

// ==========================================
// 2. MIDDLEWARE & API ADMIN (Area Riservata Grafico)
// ==========================================

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["x-admin-pin"];
  const config = getConfig();

  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  }

  if (token && token === config.adminPin) {
    return next();
  }
  return res.status(401).json({ error: "Accesso non autorizzato. PIN errato." });
}

// Login Admin
app.post("/api/admin/login", (req, res) => {
  const { pin } = req.body;
  const config = getConfig();

  if (pin && pin === config.adminPin) {
    return res.json({ success: true, token: config.adminPin, message: "Accesso autorizzato" });
  }
  return res.status(401).json({ error: "PIN non corretto" });
});

// Vista COMPLETA per il grafico (con tipo del lavoro, telefono, email, note, ecc.)
app.get("/api/admin/bookings", authMiddleware, (req, res) => {
  const bookings = readJson(BOOKINGS_FILE, []);
  res.json(bookings);
});

// Cambio rapido stato (Aspetto 🔴 / Occupato 🟡 / Libero 🟢)
app.patch("/api/admin/bookings/:id/status", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["Aspetto", "Occupato", "Libero"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Stato non valido. Consentiti: Aspetto, Occupato, Libero" });
  }

  const bookings = readJson(BOOKINGS_FILE, []);
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Prenotazione non trovata" });
  }

  bookings[index].status = status;
  bookings[index].updatedAt = new Date().toISOString();
  writeJson(BOOKINGS_FILE, bookings);

  res.json({ success: true, booking: bookings[index] });
});

// Aggiorna note o dati interni
app.put("/api/admin/bookings/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const bookings = readJson(BOOKINGS_FILE, []);
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Prenotazione non trovata" });
  }

  const { notes, workType, budget, deadline, clientName, email, phone } = req.body;
  if (notes !== undefined) bookings[index].notes = notes;
  if (workType !== undefined) bookings[index].workType = workType;
  if (budget !== undefined) bookings[index].budget = budget;
  if (deadline !== undefined) bookings[index].deadline = deadline;
  if (clientName !== undefined) {
    bookings[index].clientName = clientName;
    bookings[index].publicName = maskName(clientName);
  }
  if (email !== undefined) bookings[index].email = email;
  if (phone !== undefined) bookings[index].phone = phone;

  bookings[index].updatedAt = new Date().toISOString();
  writeJson(BOOKINGS_FILE, bookings);

  res.json({ success: true, booking: bookings[index] });
});

// Elimina o archivia prenotazione
app.delete("/api/admin/bookings/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  let bookings = readJson(BOOKINGS_FILE, []);
  const initialLength = bookings.length;
  bookings = bookings.filter(b => b.id !== id);

  if (bookings.length === initialLength) {
    return res.status(404).json({ error: "Prenotazione non trovata" });
  }

  writeJson(BOOKINGS_FILE, bookings);
  res.json({ success: true, message: "Prenotazione rimossa con successo" });
});

// Leggi impostazioni configurabili
app.get("/api/admin/settings", authMiddleware, (req, res) => {
  const config = getConfig();
  // Maschera parzialmente password per sicurezza
  const safeConfig = {
    ...config,
    smtp: {
      ...config.smtp,
      pass: config.smtp.pass ? "********" : ""
    }
  };
  res.json(safeConfig);
});

// Salva nuove impostazioni
app.post("/api/admin/settings", authMiddleware, (req, res) => {
  const currentConfig = getConfig();
  const updates = req.body;

  const newConfig = {
    studioName: updates.studioName || currentConfig.studioName,
    designerName: updates.designerName || currentConfig.designerName,
    adminPin: updates.adminPin || currentConfig.adminPin,
    whatsappNumber: updates.whatsappNumber || currentConfig.whatsappNumber,
    emailRecipient: updates.emailRecipient || currentConfig.emailRecipient,
    smtp: {
      enabled: updates.smtp?.enabled ?? currentConfig.smtp.enabled,
      host: updates.smtp?.host || currentConfig.smtp.host,
      port: Number(updates.smtp?.port || currentConfig.smtp.port),
      secure: updates.smtp?.secure ?? currentConfig.smtp.secure,
      user: updates.smtp?.user || currentConfig.smtp.user,
      pass: (updates.smtp?.pass && updates.smtp.pass !== "********") ? updates.smtp.pass : currentConfig.smtp.pass
    },
    callMeBot: {
      enabled: updates.callMeBot?.enabled ?? currentConfig.callMeBot.enabled,
      phone: updates.callMeBot?.phone || currentConfig.callMeBot.phone,
      apiKey: updates.callMeBot?.apiKey || currentConfig.callMeBot.apiKey
    }
  };

  writeJson(CONFIG_FILE, newConfig);
  res.json({ success: true, message: "Impostazioni aggiornate con successo", config: newConfig });
});

// Test notifica manuale
app.post("/api/admin/test-notification", authMiddleware, async (req, res) => {
  const { type } = req.body;
  const config = getConfig();

  const dummyBooking = {
    id: "TEST-" + Math.floor(1000 + Math.random() * 9000),
    clientName: "Cliente Test",
    email: "test@example.com",
    phone: "+39 340 0000000",
    workType: "Logo Test di Prova",
    description: "Questa è una notifica di test inviata dal pannello di controllo.",
    budget: "100€",
    deadline: "Immediata",
    status: "Aspetto"
  };

  if (type === "email") {
    const result = await sendEmailNotification(dummyBooking, config);
    return res.json({ result });
  } else if (type === "whatsapp") {
    const result = await sendCallMeBotNotification(dummyBooking, config);
    const link = generateWhatsAppUrl(dummyBooking, config.whatsappNumber);
    return res.json({ result, testLink: link });
  }

  res.status(400).json({ error: "Tipo di test non valido (email o whatsapp)" });
});

// ==========================================
// GESTIONE VETRINA & CREAZIONI (ADMIN)
// ==========================================

// Aggiungi creazione nella vetrina pubblica
app.post("/api/admin/showcase", authMiddleware, (req, res) => {
  const { title, category, description, imageUrl, tag } = req.body;
  if (!title || !imageUrl) {
    return res.status(400).json({ error: "Titolo e Immagine sono obbligatori per pubblicare la creazione." });
  }

  const showcase = readJson(SHOWCASE_FILE, []);
  const newItem = {
    id: "CW-" + Math.floor(100 + Math.random() * 900),
    title: title.trim(),
    category: (category || "Grafica Personalizzata").trim(),
    description: (description || "").trim(),
    imageUrl: imageUrl.trim(),
    tag: (tag || "✨ NUOVO").trim(),
    createdAt: new Date().toISOString()
  };

  showcase.unshift(newItem);
  writeJson(SHOWCASE_FILE, showcase);
  res.status(201).json({ success: true, item: newItem, message: "Creazione pubblicata con successo nella vetrina!" });
});

// Modifica creazione esistente
app.put("/api/admin/showcase/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, category, description, imageUrl, tag } = req.body;

  const showcase = readJson(SHOWCASE_FILE, []);
  const index = showcase.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Creazione non trovata." });
  }

  if (title !== undefined) showcase[index].title = title.trim();
  if (category !== undefined) showcase[index].category = category.trim();
  if (description !== undefined) showcase[index].description = description.trim();
  if (imageUrl !== undefined) showcase[index].imageUrl = imageUrl.trim();
  if (tag !== undefined) showcase[index].tag = tag.trim();

  writeJson(SHOWCASE_FILE, showcase);
  res.json({ success: true, item: showcase[index], message: "Creazione aggiornata!" });
});

// Elimina creazione dalla vetrina
app.delete("/api/admin/showcase/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  let showcase = readJson(SHOWCASE_FILE, []);
  const initialLength = showcase.length;
  showcase = showcase.filter(item => item.id !== id);

  if (showcase.length === initialLength) {
    return res.status(404).json({ error: "Creazione non trovata." });
  }

  writeJson(SHOWCASE_FILE, showcase);
  res.json({ success: true, message: "Creazione rimossa dalla vetrina con successo." });
});

// Avvio Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎨 SERVER GRAFICA BOOKING ATTIVO SU: http://localhost:${PORT}`);
  console.log(`🌐 Home pubblica: http://localhost:${PORT}`);
  console.log(`🔒 Area riservata Grafico: http://localhost:${PORT}/admin.html`);
  console.log(`🔑 PIN Grafico predefinito: ${getConfig().adminPin}`);
  console.log(`====================================================`);
});
