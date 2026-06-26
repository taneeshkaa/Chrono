/**
 * ChronoAI Extension — Popup Logic (popup.js)
 *
 * Communicates with background.js to display connection status,
 * handle sign-in, and manage disconnection.
 */

// Default backend URL for development.
// Change to "https://api.chronoai.app" for production.
var DEFAULT_API_BASE = "http://localhost:3000";

// ─── DOM References ─────────────────────────────────────────────

var connectedView = document.getElementById("connected-view");
var disconnectedView = document.getElementById("disconnected-view");
var userEmailEl = document.getElementById("user-email");
var lastSyncEl = document.getElementById("last-sync");
var btnSignIn = document.getElementById("btn-signin");
var btnOpen = document.getElementById("btn-open");
var btnDisconnect = document.getElementById("btn-disconnect");

// ─── Init ───────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  loadStatus();

  if (btnSignIn) btnSignIn.addEventListener("click", signIn);
  if (btnOpen) btnOpen.addEventListener("click", openChronoAI);
  if (btnDisconnect) btnDisconnect.addEventListener("click", disconnect);
});

// ─── Load Status from Background ────────────────────────────────

function loadStatus() {
  try {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, function (response) {
      if (chrome.runtime.lastError || !response) {
        showDisconnected();
        return;
      }

      if (response.connected) {
        showConnected(response.userEmail, response.lastSync);
      } else {
        showDisconnected();
      }
    });
  } catch (_e) {
    showDisconnected();
  }
}

// ─── View Rendering ─────────────────────────────────────────────

function showConnected(email, lastSync) {
  connectedView.classList.remove("hidden");
  disconnectedView.classList.add("hidden");

  userEmailEl.textContent = email || "Unknown";
  updateLastSync(lastSync);
}

function showDisconnected() {
  connectedView.classList.add("hidden");
  disconnectedView.classList.remove("hidden");
}

// ─── Actions ────────────────────────────────────────────────────

function signIn() {
  try {
    // Read apiBase from storage, default to localhost
    chrome.storage.local.get(["apiBase"], function (result) {
      var apiBase = (result && result.apiBase) || DEFAULT_API_BASE;
      // Open the auth page in a new tab
      // This endpoint will be implemented in Phase 4
      chrome.tabs.create({
        url: apiBase + "/auth/extension?redirect=chronoai-extension",
      });
    });
  } catch (_e) {
    // Fallback
    chrome.tabs.create({
      url: DEFAULT_API_BASE + "/auth/extension?redirect=chronoai-extension",
    });
  }
}

function openChronoAI() {
  try {
    chrome.storage.local.get(["apiBase"], function (result) {
      var apiBase = (result && result.apiBase) || DEFAULT_API_BASE;
      chrome.tabs.create({ url: apiBase });
    });
  } catch (_e) {
    chrome.tabs.create({ url: DEFAULT_API_BASE });
  }
}

function disconnect() {
  try {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, function () {
      // Reload the popup to reflect disconnected state
      window.location.reload();
    });
  } catch (_e) {
    window.location.reload();
  }
}

// ─── Time Ago Formatter ─────────────────────────────────────────

function updateLastSync(timestamp) {
  if (!timestamp) {
    lastSyncEl.textContent = "Never synced";
    return;
  }

  var now = Date.now();
  var diff = now - timestamp;

  if (diff < 0) diff = 0;

  var seconds = Math.floor(diff / 1000);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  var days = Math.floor(hours / 24);

  var text;
  if (seconds < 60) {
    text = "just now";
  } else if (minutes < 60) {
    text = minutes === 1 ? "1 minute ago" : minutes + " minutes ago";
  } else if (hours < 24) {
    text = hours === 1 ? "1 hour ago" : hours + " hours ago";
  } else {
    text = days === 1 ? "1 day ago" : days + " days ago";
  }

  lastSyncEl.textContent = text;
}
