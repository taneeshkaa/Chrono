/**
 * ChronoAI Extension — Service Worker (background.js)
 *
 * Receives messages from content.js and the popup, manages auth state,
 * and forwards captured conversations to the ChronoAI backend.
 */

// Default backend URL for development.
// Change to "https://api.chronoai.app" for production.
var DEFAULT_API_BASE = "http://localhost:3000";

/**
 * Read a set of keys from chrome.storage.local safely.
 * Returns an object with the requested keys (missing keys are undefined).
 */
function readStorage(keys) {
  return new Promise(function (resolve) {
    try {
      chrome.storage.local.get(keys, function (result) {
        resolve(result || {});
      });
    } catch (_e) {
      // Extension context invalidated
      resolve({});
    }
  });
}

/**
 * Write key-value pairs to chrome.storage.local safely.
 */
function writeStorage(data) {
  return new Promise(function (resolve) {
    try {
      chrome.storage.local.set(data, function () {
        resolve();
      });
    } catch (_e) {
      resolve();
    }
  });
}

/**
 * Clear all extension storage safely.
 */
function clearStorage() {
  return new Promise(function (resolve) {
    try {
      chrome.storage.local.clear(function () {
        resolve();
      });
    } catch (_e) {
      resolve();
    }
  });
}

// ─── Message Router ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  if (!message || !message.type) return false;

  switch (message.type) {
    case "SEND_CONVERSATION":
      handleSendConversation(message.data);
      // Fire-and-forget — don't hold the message channel open
      return false;

    case "GET_STATUS":
      handleGetStatus().then(sendResponse);
      // Return true to keep the message channel open for async response
      return true;

    case "SAVE_AUTH":
      handleSaveAuth(message.data).then(sendResponse);
      return true;

    case "LOGOUT":
      handleLogout().then(sendResponse);
      return true;

    default:
      return false;
  }
});

// ─── Handlers ─────────────────────────────────────────────────────

/**
 * SEND_CONVERSATION — POST conversation data to the ChronoAI backend.
 * Fire-and-forget: log errors silently, never alert the user.
 */
async function handleSendConversation(data) {
  try {
    var storage = await readStorage(["authToken", "apiBase"]);
    var authToken = storage.authToken;
    var apiBase = storage.apiBase || DEFAULT_API_BASE;

    // If the user hasn't connected yet, silently skip
    if (!authToken) return;

    var url = apiBase + "/api/connections/chatgpt";

    var response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authToken,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await writeStorage({ lastSync: Date.now() });
    } else {
      console.warn(
        "[ChronoAI] Backend returned " + response.status + " for conversation sync"
      );
    }
  } catch (err) {
    console.warn("[ChronoAI] Failed to send conversation:", err);
  }
}

/**
 * GET_STATUS — Return the current connection state to the popup.
 */
async function handleGetStatus() {
  var storage = await readStorage(["authToken", "userEmail", "lastSync"]);
  return {
    connected: !!storage.authToken,
    userEmail: storage.userEmail || null,
    lastSync: storage.lastSync || null,
  };
}

/**
 * SAVE_AUTH — Store credentials provided after the user signs in.
 */
async function handleSaveAuth(data) {
  await writeStorage({
    authToken: data.authToken || "",
    userEmail: data.userEmail || "",
    apiBase: data.apiBase || DEFAULT_API_BASE,
  });
  return { success: true };
}

/**
 * LOGOUT — Wipe all stored data.
 */
async function handleLogout() {
  await clearStorage();
  return { success: true };
}
