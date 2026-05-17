/* ═══════════════════════════════════════════════════════════
   Bloomberg Help Desk Training Simulator — main.js
   Handles:
     • Live clock display
     • Status button management (Hit / Add / Hold / )
     • Ticket generation via backend API
     • 30-second countdown timers per ticket
     • Ticket selection and chat routing
     • Multi-ticket chat history tracking
     • AI chat via backend proxy
═══════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────

let currentStatus = "hit";       // Active status: hit | add | hold | del
let activeTickets  = [];         // Array of ticket objects currently in queue
let selectedTicket = null;       // ticket_id of the currently viewed chat
let ticketTimers   = {};         // { ticket_id: remainingSeconds }
let chatHistories  = {};         // { ticket_id: [ {role, content} ] }
let ticketTimerIntervals = {};   // { ticket_id: setIntervalId } for countdown ticks
let pollInterval   = null;       // Interval that tries to spawn new tickets

// Chance per second for a new ticket by status
const TICKET_CHANCE = { hit: 0.05, add: 0.01, hold: 0, del: 0 };
const MAX_TICKETS   = 3;
const TICKET_TTL    = 30;        // Seconds before a ticket auto-expires

// ─────────────────────────────────────────────
//  CLOCK
// ─────────────────────────────────────────────

/**
 * Updates the header clock every second.
 * Displays UTC time in Bloomberg style.
 */
function startClock() {
 function tick() {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const nyc = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hours = pad(nyc.getHours());
    const minutes = pad(nyc.getMinutes());
    const seconds = pad(nyc.getSeconds());
    const ampm = nyc.getHours() >= 12 ? "PM" : "AM";
    document.getElementById("header-clock").textContent =
      `${hours}:${minutes}:${seconds} ${ampm} ET`;
  }
  tick();
  setInterval(tick, 1000);
}

// ─────────────────────────────────────────────
//  STATUS BUTTONS
// ─────────────────────────────────────────────

/**
 * Called when a status button is clicked.
 * Updates visual state and starts/stops the ticket poll loop.
 */
function setStatus(status) {
  currentStatus = status;

  // Remove all active classes from buttons
  ["hit","add","hold","del"].forEach(s => {
    document.getElementById(`btn-${s}`).classList.remove(
      "active-hit","active-add","active-hold","active-del"
    );
  });

  // Apply the correct active class to the chosen button
  document.getElementById(`btn-${status}`).classList.add(`active-${status}`);

  // Update bottom status bar
  document.getElementById("current-status-text").textContent = status.toUpperCase();

  // "Del" — remove all tickets immediately
  if (status === "del") {
    activeTickets.forEach(t => removeTicket(t.ticket_id));
    activeTickets = [];
    updateTicketCountDisplay();
  }

  // Restart the poll loop so the new chance takes effect immediately
  startPollLoop();
}

// ─────────────────────────────────────────────
//  TICKET POLLING LOOP
// ─────────────────────────────────────────────

/**
 * Clears and restarts the 1-second interval
 * that randomly attempts to generate a new ticket.
 */
function startPollLoop() {
  if (pollInterval) clearInterval(pollInterval);

  pollInterval = setInterval(() => {
    const chance = TICKET_CHANCE[currentStatus] || 0;
    // Only try if below max and status allows tickets
    if (
      chance > 0 &&
      activeTickets.length < MAX_TICKETS &&
      Math.random() < chance
    ) {
      fetchNewTicket();
    }
  }, 1000);
}

// ─────────────────────────────────────────────
//  FETCH NEW TICKET FROM BACKEND
// ─────────────────────────────────────────────

/**
 * Calls the Flask /api/new_ticket endpoint.
 * On success, adds the ticket to the queue.
 */
function fetchNewTicket() {
  fetch("/api/new_ticket")
    .then(r => r.json())
    .then(ticket => {
      // Guard: don't exceed max or add duplicates
      if (activeTickets.length >= MAX_TICKETS) return;
      if (activeTickets.find(t => t.ticket_id === ticket.ticket_id)) return;

      activeTickets.push(ticket);
      chatHistories[ticket.ticket_id] = [];  // Fresh chat history for this ticket
      ticketTimers[ticket.ticket_id]   = TICKET_TTL;
      renderTicketQueue();
      startTicketCountdown(ticket.ticket_id);
      updateTicketCountDisplay();

    })
    .catch(err => console.error("Ticket fetch error:", err));
}

// ─────────────────────────────────────────────
//  TICKET COUNTDOWN TIMER
// ─────────────────────────────────────────────

/**
 * Starts a 1-second countdown for a given ticket.
 * When it hits 0, the ticket is auto-removed.
 */
function startTicketCountdown(ticketId) {
  // Clear any existing timer for this ticket
  if (ticketTimerIntervals[ticketId]) clearInterval(ticketTimerIntervals[ticketId]);

  ticketTimerIntervals[ticketId] = setInterval(() => {
    ticketTimers[ticketId]--;

    // Update the timer display on the card
    const timerEl = document.getElementById(`timer-${ticketId}`);
    if (timerEl) {
      timerEl.textContent = ticketTimers[ticketId] + "s";
      // Highlight red/yellow when urgent
      timerEl.className = "ticket-timer" + (ticketTimers[ticketId] <= 10 ? " urgent" : "");
    }

    // Time's up — remove ticket
    if (ticketTimers[ticketId] <= 0) {
      clearInterval(ticketTimerIntervals[ticketId]);
      removeTicket(ticketId);
    }
  }, 1000);
}

// ─────────────────────────────────────────────
//  REMOVE TICKET
// ─────────────────────────────────────────────

/**
 * Removes a ticket from the queue by ID.
 * Clears its timer, chat history, and re-renders the queue.
 * If it was selected, deselects and shows placeholder.
 */
function removeTicket(ticketId) {
  clearInterval(ticketTimerIntervals[ticketId]);
  ete ticketTimerIntervals[ticketId];
  ete ticketTimers[ticketId];
  ete chatHistories[ticketId];

  activeTickets = activeTickets.filter(t => t.ticket_id !== ticketId);
  renderTicketQueue();
  updateTicketCountDisplay();

  // If the removed ticket was the open one, go back to placeholder
  if (selectedTicket === ticketId) {
    selectedTicket = null;
    showChatPlaceholder();
    showProfilePlaceholder();
  }
}

// ─────────────────────────────────────────────
//  RENDER TICKET QUEUE
// ─────────────────────────────────────────────

/**
 * Re-renders all ticket cards in the left panel.
 * Called whenever activeTickets changes.
 */
function renderTicketQueue() {
  const queueEl = document.getElementById("ticket-queue");

  // Clear only the ticket cards, not the no-tickets message
  const existingCards = queueEl.querySelectorAll(".ticket-card");
  existingCards.forEach(card => card.remove());

  const noMsg = document.getElementById("no-tickets-msg");

  if (activeTickets.length === 0) {
    if (noMsg) noMsg.classList.remove("hidden");
    return;
  }

  if (noMsg) noMsg.classList.add("hidden");

  activeTickets.forEach(ticket => {
    const card = document.createElement("div");
    card.className = "ticket-card" + (selectedTicket === ticket.ticket_id ? " selected" : "");
    card.id = `card-${ticket.ticket_id}`;
    card.onclick = () => openTicket(ticket.ticket_id);

    card.innerHTML = `
      <div class="ticket-bucket">${ticket.bucket}</div>
      <div class="ticket-id">${ticket.ticket_id}</div>
      <div class="ticket-timer" id="timer-${ticket.ticket_id}">${ticketTimers[ticket.ticket_id]}s</div>
    `;

    queueEl.appendChild(card);
  });
}

// ─────────────────────────────────────────────
//  OPEN TICKET (load into middle panel)
// ─────────────────────────────────────────────

/**
 * Opens a ticket into the middle chat panel.
 * Loads the customer profile into the right panel.
 * Sends the AI's opening question if this is a fresh chat.
 */
function openTicket(ticketId) {
  const ticket = activeTickets.find(t => t.ticket_id === ticketId);
  if (!ticket) return;

  // Update selected state
  selectedTicket = ticketId;

  // Re-render queue to update selected styling
  renderTicketQueue();

  // Show chat UI
  document.getElementById("chat-placeholder").classList.add("hidden");
  const chatArea = document.getElementById("chat-area");
  chatArea.classList.remove("hidden");

  // Set chat header fields
  document.getElementById("chat-ticket-id").textContent    = ticket.ticket_id;
  document.getElementById("chat-bucket-badge").textContent = ticket.bucket;
  document.getElementById("chat-client-name").textContent  = ticket.profile.name;

  // Load right panel profile
  loadProfile(ticket.profile);

  // Render chat history for this ticket
  renderChatHistory(ticketId);

  // If this is a brand-new ticket with no messages yet, send the AI opening question
  if (chatHistories[ticketId].length === 0) {
    sendClientOpener(ticket);
  }
}

// ─────────────────────────────────────────────
//  SEND CLIENT OPENING MESSAGE
// ─────────────────────────────────────────────

/**
 * Displays the pre-set opening question from the ticket
 * as the first client message. Does NOT call the AI for this —
 * the question is already in the ticket data from the backend.
 */
function sendClientOpener(ticket) {
  const question = ticket.question;

  // Record in history as the client's first turn
  chatHistories[ticket.ticket_id].push({
    role: "assistant",    // "assistant" = client in our AI prompt setup
    content: question
  });

  appendMessage(ticket.ticket_id, "client", ticket.profile.name, question);
}

// ─────────────────────────────────────────────
//  HANDLE CHAT INPUT (keydown Enter)
// ─────────────────────────────────────────────

/**
 * Fires when Enter is pressed in the chat input box.
 */
function handleChatKey(event) {
  if (event.key === "Enter") sendMessage();
}

// ─────────────────────────────────────────────
//  SEND REP MESSAGE & GET AI REPLY
// ─────────────────────────────────────────────

/**
 * Sends the trainee's typed message, then requests
 * an AI follow-up from the client persona via the backend.
 */
function sendMessage() {
  if (!selectedTicket) return;

  const inputEl = document.getElementById("chat-input");
  const text    = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";

  const ticket = activeTickets.find(t => t.ticket_id === selectedTicket);
  if (!ticket) return;

  // Add rep message to history (role "user" = trainee in our prompt)
  chatHistories[selectedTicket].push({ role: "user", content: text });
  appendMessage(selectedTicket, "rep", "YOU", text);

  // Show typing indicator while waiting for AI
  document.getElementById("typing-indicator").classList.remove("hidden");

  // Call the backend AI proxy
  fetch("/api/ai_response", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      history: chatHistories[selectedTicket],
      bucket:  ticket.bucket
    })
  })
  .then(r => r.json())
  .then(data => {
    document.getElementById("typing-indicator").classList.add("hidden");

    const reply = data.reply;
    chatHistories[selectedTicket].push({ role: "assistant", content: reply });
    appendMessage(selectedTicket, "client", ticket.profile.name, reply);
  })
  .catch(err => {
    document.getElementById("typing-indicator").classList.add("hidden");
    console.error("AI response error:", err);
  });
}

// ─────────────────────────────────────────────
//  APPEND A SINGLE MESSAGE BUBBLE
// ─────────────────────────────────────────────

/**
 * Creates and appends one message bubble to #chat-messages.
 * type: "client" | "rep"
 */
function appendMessage(ticketId, type, label, text) {
  // Only render if this ticket is currently selected
  if (selectedTicket !== ticketId) return;

  const container = document.getElementById("chat-messages");
  const bubble    = document.createElement("div");
  bubble.className = `msg ${type}`;
  bubble.innerHTML = `<div class="msg-label">${label.toUpperCase()}</div>${escapeHtml(text)}`;
  container.appendChild(bubble);

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// ─────────────────────────────────────────────
//  RENDER FULL CHAT HISTORY (when switching tickets)
// ─────────────────────────────────────────────

/**
 * Clears the message area and re-renders
 * the full stored history for the given ticket.
 */
function renderChatHistory(ticketId) {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";

  const ticket  = activeTickets.find(t => t.ticket_id === ticketId);
  const history = chatHistories[ticketId] || [];

  history.forEach(msg => {
    // "assistant" role = client, "user" role = trainee
    if (msg.role === "assistant") {
      const bubble = document.createElement("div");
      bubble.className = "msg client";
      bubble.innerHTML = `<div class="msg-label">${ticket.profile.name.toUpperCase()}</div>${escapeHtml(msg.content)}`;
      container.appendChild(bubble);
    } else {
      const bubble = document.createElement("div");
      bubble.className = "msg rep";
      bubble.innerHTML = `<div class="msg-label">YOU</div>${escapeHtml(msg.content)}`;
      container.appendChild(bubble);
    }
  });

  container.scrollTop = container.scrollHeight;
}

// ─────────────────────────────────────────────
//  PROFILE PANEL
// ─────────────────────────────────────────────

/**
 * Populates the right panel with the given customer profile.
 */
function loadProfile(profile) {
  document.getElementById("profile-placeholder").classList.add("hidden");
  document.getElementById("profile-info").classList.remove("hidden");

  document.getElementById("p-name").textContent     = profile.name;
  document.getElementById("p-position").textContent = profile.position;
  document.getElementById("p-firm").textContent      = profile.firm;
  document.getElementById("p-uid").textContent       = profile.uid;
  document.getElementById("p-language").textContent  = profile.language;
  document.getElementById("p-city").textContent      = profile.city;
  document.getElementById("p-country").textContent   = profile.country;
}

/**
 * Called when the selected ticket is closed/expired —
 * hides profile and shows placeholder.
 */
function showProfilePlaceholder() {
  document.getElementById("profile-info").classList.add("hidden");
  document.getElementById("profile-placeholder").classList.remove("hidden");
}

/**
 * Shows the chat placeholder (no ticket selected).
 */
function showChatPlaceholder() {
  document.getElementById("chat-area").classList.add("hidden");
  document.getElementById("chat-placeholder").classList.remove("hidden");
  document.getElementById("typing-indicator").classList.add("hidden");
}

// ─────────────────────────────────────────────
//  PROFILE ACTION BUTTONS (UUID, PROS, APIY)
// ─────────────────────────────────────────────

/**
 * Placeholder handler for the three profile action buttons.
 * Future: open new windows or panels depending on the action.
 */
function profileAction(action) {
  // Will be wired to specific functionality in future iterations
  console.log(`Profile action triggered: ${action}`);
}

// ─────────────────────────────────────────────
//  TICKET COUNT DISPLAY
// ─────────────────────────────────────────────

/** Updates the ticket counter in the bottom status bar. */
function updateTicketCountDisplay() {
  document.getElementById("ticket-count-num").textContent = activeTickets.length;
}

// ─────────────────────────────────────────────
//  UTILITY: HTML Escape
// ─────────────────────────────────────────────

/** Prevents XSS by escaping user/AI text before inserting into DOM. */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────

/**
 * Bootstraps everything when the page loads.
 */
(function init() {
  startClock();
  setStatus("del");   // Default status on load
})();
