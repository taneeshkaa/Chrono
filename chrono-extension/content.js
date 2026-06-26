/**
 * ChronoAI Extension — Content Script (content.js)
 *
 * Injected into chatgpt.com, claude.ai, and gemini.google.com.
 * Observes the DOM for conversation changes, extracts messages,
 * and forwards them to background.js for syncing to the backend.
 *
 * Design principle: fail silently, never throw, never disrupt the host page.
 */

(function () {
  "use strict";

  // ─── Constants ────────────────────────────────────────────────

  var DEBOUNCE_MS = 3000;
  var NAV_DEBOUNCE_MS = 2000;
  var MAX_MESSAGE_LENGTH = 2000;
  var MIN_MESSAGES = 2;

  // ─── Platform Detection ───────────────────────────────────────

  var hostname = "";
  try {
    hostname = window.location.hostname;
  } catch (_e) {
    return; // can't even read hostname — bail
  }

  var platform = null;
  if (hostname.includes("chatgpt.com")) platform = "chatgpt";
  else if (hostname.includes("claude.ai")) platform = "claude";
  else if (hostname.includes("gemini.google.com")) platform = "gemini";
  else if (hostname.includes("chronoai.app") || hostname.includes("localhost")) platform = "chronoai";

  if (!platform) return; // not on a supported site

  // If on the ChronoAI page, listen for the handshake event and exit
  if (platform === "chronoai") {
    try {
      window.addEventListener("message", function (event) {
        if (event && event.data && event.data.type === "CHRONO_AUTH_SUCCESS") {
          chrome.runtime.sendMessage({
            type: "SAVE_AUTH",
            data: {
              authToken: event.data.token,
              userEmail: event.data.email,
              apiBase: event.data.apiBase
            }
          }, function() {
            // Suppress error if context is invalidated
            if (chrome.runtime.lastError) {}
          });
        }
      });
    } catch (_e) {
      // Fail silently
    }
    return;
  }

  // ─── State ────────────────────────────────────────────────────

  var lastSentHash = "";
  var debounceTimer = null;

  // ─── Title Extraction ─────────────────────────────────────────

  function getTitle() {
    try {
      if (platform === "chatgpt") {
        var h1 = document.querySelector("h1");
        if (h1 && h1.textContent.trim()) return h1.textContent.trim();
      }
      // All platforms: fall back to document.title
      var title = document.title || "";
      // Strip common suffixes
      title = title
        .replace(/ [-–|] ChatGPT$/i, "")
        .replace(/ [-–|] Claude$/i, "")
        .replace(/ [-–|] Google Gemini$/i, "")
        .replace(/ [-–|] Gemini$/i, "")
        .trim();
      return title || "Untitled Conversation";
    } catch (_e) {
      return "Untitled Conversation";
    }
  }

  // ─── Conversation ID Extraction ───────────────────────────────

  function getConversationId() {
    try {
      var path = window.location.pathname;

      if (platform === "chatgpt") {
        // chatgpt.com/c/abc123 or chatgpt.com/g/abc123/c/def456
        var chatMatch = path.match(/\/c\/([a-zA-Z0-9_-]+)/);
        if (chatMatch) return chatMatch[1];
      }

      if (platform === "claude") {
        // claude.ai/chat/abc123
        var claudeMatch = path.match(/\/chat\/([a-zA-Z0-9_-]+)/);
        if (claudeMatch) return claudeMatch[1];
      }

      if (platform === "gemini") {
        // gemini.google.com/app/<id>
        var geminiMatch = path.match(/\/app\/([a-zA-Z0-9_-]+)/);
        if (geminiMatch) return geminiMatch[1];
      }

      // Fallback: stable hash from source + title + date
      var title = getTitle();
      var dateStr = new Date().toISOString().split("T")[0];
      return platform + "-" + simpleHash(title + dateStr);
    } catch (_e) {
      return platform + "-" + Date.now();
    }
  }

  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      hash = (hash << 5) - hash + ch;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ─── Message Extraction ───────────────────────────────────────

  function extractMessages() {
    try {
      switch (platform) {
        case "chatgpt":
          return extractChatGPT();
        case "claude":
          return extractClaude();
        case "gemini":
          return extractGemini();
        default:
          return [];
      }
    } catch (_e) {
      return [];
    }
  }

  function extractChatGPT() {
    var messages = [];

    // Primary: data-message-author-role attribute
    var els = document.querySelectorAll("[data-message-author-role]");
    if (els.length > 0) {
      els.forEach(function (el) {
        var role = el.getAttribute("data-message-author-role");
        var content = safeTextContent(el);
        if (content && (role === "user" || role === "assistant")) {
          messages.push({ role: role, content: content });
        }
      });
      return messages;
    }

    // Fallback: .group elements — alternate user/assistant
    var groups = document.querySelectorAll("main .group");
    groups.forEach(function (el, idx) {
      var content = safeTextContent(el);
      if (content) {
        messages.push({
          role: idx % 2 === 0 ? "user" : "assistant",
          content: content,
        });
      }
    });

    return messages;
  }

  function extractClaude() {
    var messages = [];

    // Try to find message containers with role indicators
    var userMsgs = document.querySelectorAll(
      ".font-user-message, [data-testid='user-message']"
    );
    var assistantMsgs = document.querySelectorAll(
      ".font-claude-message, [data-testid='ai-message']"
    );

    if (userMsgs.length > 0 || assistantMsgs.length > 0) {
      // Interleave by DOM order
      var allMsgs = document.querySelectorAll(
        ".font-user-message, .font-claude-message, [data-testid='user-message'], [data-testid='ai-message']"
      );
      allMsgs.forEach(function (el) {
        var content = safeTextContent(el);
        if (!content) return;
        var isUser =
          el.classList.contains("font-user-message") ||
          (el.getAttribute("data-testid") || "").includes("user");
        messages.push({
          role: isUser ? "user" : "assistant",
          content: content,
        });
      });
      return messages;
    }

    // Fallback: look for human/assistant turn containers
    var turns = document.querySelectorAll(
      "[class*='human'], [class*='assistant'], [class*='Human'], [class*='Assistant']"
    );
    turns.forEach(function (el) {
      var content = safeTextContent(el);
      if (!content) return;
      var className = (el.className || "").toLowerCase();
      var isUser =
        className.includes("human") || className.includes("user");
      messages.push({
        role: isUser ? "user" : "assistant",
        content: content,
      });
    });

    return messages;
  }

  function extractGemini() {
    var messages = [];

    // Try: query/response pattern
    var userEls = document.querySelectorAll(
      ".user-query, .query-content, [data-message-role='user']"
    );
    var assistantEls = document.querySelectorAll(
      ".model-response, .response-content, [data-message-role='model']"
    );

    if (userEls.length > 0 || assistantEls.length > 0) {
      // Collect all with position, sort by DOM order
      var all = [];
      userEls.forEach(function (el) {
        all.push({ el: el, role: "user" });
      });
      assistantEls.forEach(function (el) {
        all.push({ el: el, role: "assistant" });
      });

      // Sort by DOM position
      all.sort(function (a, b) {
        var pos = a.el.compareDocumentPosition(b.el);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });

      all.forEach(function (item) {
        var content = safeTextContent(item.el);
        if (content) {
          messages.push({ role: item.role, content: content });
        }
      });

      return messages;
    }

    // Fallback: .message elements alternating
    var msgEls = document.querySelectorAll(".message, .chat-message");
    msgEls.forEach(function (el, idx) {
      var content = safeTextContent(el);
      if (content) {
        messages.push({
          role: idx % 2 === 0 ? "user" : "assistant",
          content: content,
        });
      }
    });

    return messages;
  }

  // ─── Helpers ──────────────────────────────────────────────────

  function safeTextContent(el) {
    try {
      var text = (el.innerText || el.textContent || "").trim();
      if (text.length > MAX_MESSAGE_LENGTH) {
        text = text.substring(0, MAX_MESSAGE_LENGTH);
      }
      return text || "";
    } catch (_e) {
      return "";
    }
  }

  function computeHash(messages) {
    var str = messages
      .map(function (m) {
        return m.role + ":" + m.content.length;
      })
      .join("|");
    return simpleHash(str);
  }

  // ─── Core: Extract & Send ─────────────────────────────────────

  function extractAndSend() {
    try {
      var messages = extractMessages();

      // Must have at least MIN_MESSAGES (1 user + 1 assistant)
      if (messages.length < MIN_MESSAGES) return;

      // Last message must be from the assistant (turn is complete)
      if (messages[messages.length - 1].role !== "assistant") return;

      // Check if content has changed since last send
      var hash = computeHash(messages);
      if (hash === lastSentHash) return;

      lastSentHash = hash;

      var payload = {
        source: platform,
        conversationId: getConversationId(),
        title: getTitle(),
        messages: messages,
      };

      chrome.runtime.sendMessage(
        { type: "SEND_CONVERSATION", data: payload },
        function () {
          // Suppress "receiving end does not exist" errors
          if (chrome.runtime.lastError) {
            // Extension context invalidated — ignore
          }
        }
      );
    } catch (_e) {
      // Never throw from content script
    }
  }

  // ─── Debounced Observer ───────────────────────────────────────

  function scheduleExtraction() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(extractAndSend, DEBOUNCE_MS);
  }

  // Watch for DOM mutations (new messages appearing)
  try {
    var observer = new MutationObserver(function () {
      scheduleExtraction();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch (_e) {
    // MutationObserver not available — fall back to polling
    setInterval(extractAndSend, 10000);
  }

  // ─── SPA Navigation Detection ────────────────────────────────

  // Detect URL changes in single-page apps (ChatGPT, Claude, Gemini are all SPAs)

  var lastUrl = window.location.href;

  function onNavigation() {
    var currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      lastSentHash = ""; // Reset hash so new conversation gets captured
      setTimeout(extractAndSend, NAV_DEBOUNCE_MS);
    }
  }

  // popstate fires on back/forward
  window.addEventListener("popstate", onNavigation);

  // Override pushState and replaceState to detect SPA route changes
  try {
    var origPushState = history.pushState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      onNavigation();
    };

    var origReplaceState = history.replaceState;
    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      onNavigation();
    };
  } catch (_e) {
    // If we can't override, fall back to polling for URL changes
    setInterval(onNavigation, 2000);
  }

  // ─── Initial extraction after page settles ────────────────────

  setTimeout(extractAndSend, 5000);
})();
