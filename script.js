// Kailash AI client script — updated with safer DOM guards and fixes
let chatHistory = [];
let pdfText = "";

// PDF.js worker
if (typeof window !== 'undefined' && window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// HTML Elements (may be missing during some tests — guard accesses)
const promptInput = typeof document !== 'undefined' ? document.getElementById("prompt") : null;
const responseDiv = typeof document !== 'undefined' ? document.getElementById("response") : null;

const imageInput = typeof document !== 'undefined' ? document.getElementById("imageInput") : null;
const removeImageBtn = typeof document !== 'undefined' ? document.getElementById("removeImageBtn") : null;

const pdfInput = typeof document !== 'undefined' ? document.getElementById("pdfInput") : null;

const micBtn = typeof document !== 'undefined' ? document.getElementById("micBtn") : null;
const actionBtn = typeof document !== 'undefined' ? document.getElementById("actionBtn") : null;
const imagePreview = typeof document !== 'undefined' ? document.getElementById("imagePreview") : null;

const pdfPreview = typeof document !== 'undefined' ? document.getElementById("pdfPreview") : null;

// Check important elements
if (typeof console !== 'undefined') console.log("Kailash AI loaded");
if (typeof console !== 'undefined') {
  console.log("Prompt:", promptInput);
  console.log("Response:", responseDiv);
  console.log("Image:", imageInput);
  console.log("PDF:", pdfInput);
  console.log("Mic:", micBtn);
}

// Save Chat
function saveChat() {
  try {
    if (!responseDiv) return;
    localStorage.setItem("kailash_chat", responseDiv.innerHTML);
  } catch (e) {}
}

// Load Chat
function loadChat() {
  try {
    if (!responseDiv) return;
    const chat = localStorage.getItem("kailash_chat");
    if (chat) {
      responseDiv.innerHTML = chat;
      responseDiv.scrollTop = responseDiv.scrollHeight;
    }
  } catch (e) {}
}

// Load saved chat
loadChat();

// Enter Button
if (promptInput) {
  promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });
}

// ================================
// PART 2 — SEND MESSAGE
// ================================

let isSending = false; // Prevent concurrent sends

async function sendMessage() {
  if (isSending) return;

  const prompt = promptInput ? promptInput.value.trim() : "";

  const hasImageFile = !!(imageInput && imageInput.files && imageInput.files.length > 0);

  // Check message
  if (!prompt && !hasImageFile && pdfText === "") {
    return;
  }

  isSending = true;

  try {
    // ================================
    // IMAGE → BASE64
    // ================================

    let imageBase64 = "";
    const image = hasImageFile ? imageInput.files[0] : null;

    if (image) {
      imageBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const maxSize = 800;
            let width = img.width;
            let height = img.height;
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
              } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          };
          img.onerror = () => resolve("");
          img.src = reader.result;
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(image);
      });
    }

    // ================================
    // ATTACHMENT HTML
    // ================================

    let attachmentHTML = "";

    // Image attachment
    if (imageBase64) {
      attachmentHTML += `
  <div style="margin-top:8px;display:inline-block;line-height:0;">
    <img src="${imageBase64}" style="width:auto;height:auto;max-width:280px;max-height:350px;border-radius:12px;object-fit:contain;display:block;" />
  </div>
  `;
    }

    // PDF attachment
    if (pdfInput && pdfInput.files && pdfInput.files.length > 0) {
      const pdfFile = pdfInput.files[0];
      const pdfUrl = URL.createObjectURL(pdfFile);
      attachmentHTML += `
      <div style="margin-top:8px;padding:10px;background:#30465a;border-radius:10px;">
        <a href="${pdfUrl}" target="_blank" style="color:white;text-decoration:none;">📄 ${pdfFile.name}</a>
      </div>
    `;
    }

    // ================================
    // USER MESSAGE
    // ================================
    if (responseDiv) {
      responseDiv.innerHTML += `
    <div class="user-message">
      <div>${escapeHtml(prompt)}</div>
      ${attachmentHTML}
    </div>
  `;
      responseDiv.scrollTop = responseDiv.scrollHeight;
    }

    // Clear input
    if (promptInput) promptInput.value = "";

    // ================================
    // THINKING
    // ================================
    if (responseDiv) {
      responseDiv.innerHTML += `
    <div id="thinking" class="ai-message thinking">
      <span>🤖 Kailash AI</span>
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `;
      responseDiv.scrollTop = responseDiv.scrollHeight;
    }

    // ================================
    // PART 3 — API + AI REPLY (with client-side retries)
    // ================================

    const MAX_RETRIES = 2;
    let attempt = 0;
    let resObj = null;

    while (attempt <= MAX_RETRIES) {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt, chatHistory: chatHistory, hasImage: hasImageFile, imageBase64: imageBase64, pdfText: pdfText }),
        });

        // If OK, parse and break
        if (res.ok) {
          resObj = await res.json();
          break;
        }

        // For rate limits and timeouts, retry with backoff
        if (res.status === 429 || res.status === 504) {
          const thinkingEl = document.getElementById("thinking");
          if (thinkingEl) {
            const span = thinkingEl.querySelector("span");
            if (span) span.innerText = `🤖 Retrying... (attempt ${attempt + 1})`;
          }
          const wait = 500 * Math.pow(2, attempt) + Math.random() * 200;
          await new Promise((r) => setTimeout(r, wait));
          attempt++;
          continue;
        }

        // Other errors: surface message
        const errorText = await res.text();
        throw new Error("Server Error: " + res.status + " " + errorText);
      } catch (error) {
        if (attempt >= MAX_RETRIES) throw error;
        const thinkingEl = document.getElementById("thinking");
        if (thinkingEl) {
          const span = thinkingEl.querySelector("span");
          if (span) span.innerText = `🤖 Network issue, retrying... (attempt ${attempt + 1})`;
        }
        const wait = 500 * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, wait));
        attempt++;
      }
    }

    if (!resObj) {
      throw new Error("AI did not return a response.");
    }

    // Remove thinking
    try {
      document.getElementById("thinking")?.remove();
    } catch (e) {}

    // AI reply
    const replyText = resObj.reply || "No response";

    // Clean text for voice
    const cleanReply = replyText.replace(/[*#`_~]/g, "").replace(/\s+/g, " ").trim();

    // ================================
    // AI MESSAGE
    // ================================
    if (responseDiv) {
      responseDiv.innerHTML += `
      <div class="ai-message">
        <div>${escapeHtml(replyText)}</div>
        <button class="speak-btn" onclick="speakReply(this)" data-text="${escapeAttr(cleanReply)}">🔊</button>
      </div>
    `;
      responseDiv.scrollTop = responseDiv.scrollHeight;
    }

    // ================================
    // CHAT HISTORY
    // ================================
    chatHistory.push({ role: "user", text: prompt });
    chatHistory.push({ role: "assistant", text: replyText });

    // Save chat
    saveChat();

    // ================================
    // CLEAR ATTACHMENTS
    // ================================
    if (imageInput) imageInput.value = "";
    if (pdfInput) pdfInput.value = "";
    if (imagePreview) imagePreview.innerHTML = "";
    if (pdfPreview) pdfPreview.innerHTML = "";
    if (removeImageBtn) removeImageBtn.hidden = true;
    pdfText = "";

  } catch (error) {
    // Remove thinking
    try { document.getElementById("thinking")?.remove(); } catch (e) {}

    if (responseDiv) {
      responseDiv.innerHTML += `
      <div class="ai-message">❌ ${escapeHtml(error.message || String(error))}</div>
    `;
      responseDiv.scrollTop = responseDiv.scrollHeight;
    }
  } finally {
    isSending = false;
  }
}

// ================================
// PART 4 — VOICE INPUT
// ================================

if (typeof window !== 'undefined' && "webkitSpeechRecognition" in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "hi-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  if (micBtn) {
    micBtn.addEventListener("click", () => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
        if (typeof liveSpeaking !== 'undefined') liveSpeaking = false;
        if (typeof liveProcessing !== 'undefined') liveProcessing = false;
      }
      recognition.start();
    });
  }

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    if (promptInput) promptInput.value = text;
  };

  recognition.onerror = (event) => { console.log("Voice Error:", event.error); };

  recognition.onspeechstart = () => {
    if (speechSynthesis.speaking) {
      console.log('User started speaking: cancelling AI speech');
      speechSynthesis.cancel();
      if (typeof liveSpeaking !== 'undefined') liveSpeaking = false;
      if (typeof liveProcessing !== 'undefined') liveProcessing = false;
    }
  };

  recognition.onend = () => { /* nothing special */ };
} else {
  if (micBtn) micBtn.disabled = true;
}

// ================================
// PART 4 — AI VOICE
// ================================

function speakReply(button) {
  if (!button) return;
  const text = button.getAttribute("data-text");
  if (!text) return;
  try { stopLiveListening(); } catch (e) {}
  speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "hi-IN";
  speech.rate = 1;
  speech.pitch = 1;
  speechSynthesis.speak(speech);
}

// ================================
// PART 5 — IMAGE UPLOAD
// ================================

if (imageInput) {
  imageInput.addEventListener("change", () => {
    if (imageInput.files && imageInput.files.length > 0) {
      const file = imageInput.files[0];
      const imageUrl = URL.createObjectURL(file);
      if (imagePreview) {
        imagePreview.innerHTML = `
  <div style="position:relative;display:inline-block;margin:8px;">
    <img src="${imageUrl}" style="max-width:120px;max-height:120px;border-radius:10px;display:block;" />
    <button type="button" onclick="document.getElementById('removeImageBtn')?.click()" style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border:none;border-radius:50%;background:#333;color:white;font-size:18px;line-height:24px;padding:0;cursor:pointer;">×</button>
  </div>
 `;
      }
      if (removeImageBtn) removeImageBtn.hidden = false;
      if (actionBtn) actionBtn.innerHTML = "↑";
    } else {
      if (imagePreview) imagePreview.innerHTML = "";
      if (removeImageBtn) removeImageBtn.hidden = true;
      if (actionBtn) actionBtn.innerHTML = "🔵";
    }
  });
}

// ================================
// REMOVE IMAGE
// ================================

if (removeImageBtn) {
  removeImageBtn.addEventListener("click", () => {
    if (imageInput) imageInput.value = "";
    if (imagePreview) imagePreview.innerHTML = "";
    removeImageBtn.hidden = true;
  });
}

// ================================
// PDF UPLOAD
// ================================

if (pdfInput) {
  pdfInput.addEventListener("change", async () => {
    if (!pdfInput.files || pdfInput.files.length === 0) {
      if (pdfPreview) pdfPreview.innerHTML = "";
      pdfText = "";
      return;
    }

    const file = pdfInput.files[0];
    const pdfUrl = URL.createObjectURL(file);
    if (pdfPreview) pdfPreview.innerHTML = `
      <a href="${pdfUrl}" target="_blank" style="color:white;text-decoration:none;">📄 ${file.name}</a>
    `;

    if (!window.pdfjsLib) {
      alert("PDF reader load नहीं हुआ।");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        pdfText += text.items.map((item) => item.str).join(" ") + "\n";
      }
      console.log("PDF text loaded");
    } catch (error) {
      pdfText = "";
      alert("PDF Read Error: " + (error && error.message ? error.message : error));
    }
  });
}

// ================================
// PART 6 — NEW CHAT
// ================================

const newChatBtn = typeof document !== 'undefined' ? document.getElementById("newChatBtn") : null;

function startNewChat() {
  chatHistory = [];
  pdfText = "";
  try { localStorage.removeItem("kailash_chat"); } catch (e) {}
  if (responseDiv) responseDiv.innerHTML = "";
  if (promptInput) promptInput.value = "";
  if (imageInput) imageInput.value = "";
  if (pdfInput) pdfInput.value = "";
  if (imagePreview) imagePreview.innerHTML = "";
  if (pdfPreview) pdfPreview.innerHTML = "";
  if (removeImageBtn) removeImageBtn.hidden = true;
}

// Top New Chat button — safe default: no confirm dialogs
if (newChatBtn) {
  newChatBtn.addEventListener("click", () => { startNewChat(); });
}

// ================================
// PART 6 — MENU
// ================================

const menuBtn = typeof document !== 'undefined' ? document.getElementById("menuBtn") : null;
const menu = typeof document !== 'undefined' ? document.getElementById("menu") : null;
const closeMenuBtn = typeof document !== 'undefined' ? document.getElementById("closeMenuBtn") : null;

if (menuBtn && menu) {
  menuBtn.addEventListener("click", () => { menu.hidden = !menu.hidden; });
}
if (closeMenuBtn && menu) {
  closeMenuBtn.addEventListener("click", () => { menu.hidden = true; });
}

// ================================
// ABOUT
// ================================

const aboutBtn = typeof document !== 'undefined' ? document.getElementById("aboutBtn") : null;
if (aboutBtn) {
  aboutBtn.addEventListener("click", () => {
    alert("🤖 Kailash AI\n\nVersion: V1.0\nDeveloper: Kailash");
    if (menu) menu.hidden = true;
  });
}

// ================================
// NEW CHAT FROM MENU
// ================================

const newChatMenuBtn = typeof document !== 'undefined' ? document.getElementById("newChatMenuBtn") : null;
if (newChatMenuBtn) {
  newChatMenuBtn.addEventListener("click", () => {
    startNewChat();
    if (menu) menu.hidden = true;
  });
}

// ================================
// PART 7 — THEME + SETTINGS
// ================================

const themeBtn = typeof document !== 'undefined' ? document.getElementById("themeBtn") : null;
const savedTheme = (typeof localStorage !== 'undefined') ? localStorage.getItem("theme") : null;
if (savedTheme === "light" && themeBtn) {
  document.body.classList.add("light-mode");
  themeBtn.innerHTML = "☀️ Light Mode";
}
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    if (document.body.classList.contains("light-mode")) {
      localStorage.setItem("theme", "light");
      themeBtn.innerHTML = "☀️ Light Mode";
    } else {
      localStorage.setItem("theme", "dark");
      themeBtn.innerHTML = "🌙 Dark Mode";
    }
    if (menu) menu.hidden = true;
  });
}

// ================================
// SETTINGS
// ================================

const settingsBtn = typeof document !== 'undefined' ? document.getElementById("settingsBtn") : null;
const settingsPanel = typeof document !== 'undefined' ? document.getElementById("settingsPanel") : null;
const closeSettingsBtn = typeof document !== 'undefined' ? document.getElementById("closeSettingsBtn") : null;
if (settingsBtn && settingsPanel) {
  settingsBtn.addEventListener("click", () => { settingsPanel.hidden = false; if (menu) menu.hidden = true; });
}
if (closeSettingsBtn && settingsPanel) {
  closeSettingsBtn.addEventListener("click", () => { settingsPanel.hidden = true; });
}

// Close settings with ESC
if (typeof document !== 'undefined') {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && settingsPanel) settingsPanel.hidden = true;
  });
}

// ================================
// PART 8 — PLUS MENU
// ================================

const plusBtn = typeof document !== 'undefined' ? document.getElementById("plusBtn") : null;
const plusMenu = typeof document !== 'undefined' ? document.getElementById("plusMenu") : null;
const cameraOption = typeof document !== 'undefined' ? document.getElementById("cameraOption") : null;
const photosOption = typeof document !== 'undefined' ? document.getElementById("photosOption") : null;
const filesOption = typeof document !== 'undefined' ? document.getElementById("filesOption") : null;

if (plusBtn && plusMenu) {
  plusBtn.addEventListener("click", () => { plusMenu.hidden = !plusMenu.hidden; });
}
if (cameraOption) {
  cameraOption.addEventListener("click", () => { if (imageInput) { imageInput.setAttribute("capture", "environment"); imageInput.click(); } if (plusMenu) plusMenu.hidden = true; });
}
if (photosOption) {
  photosOption.addEventListener("click", () => { if (imageInput) { imageInput.removeAttribute("capture"); imageInput.click(); } if (plusMenu) plusMenu.hidden = true; });
}
if (filesOption) {
  filesOption.addEventListener("click", () => { if (pdfInput) pdfInput.click(); if (plusMenu) plusMenu.hidden = true; });
}

// Close plus menu when clicking outside
if (typeof document !== 'undefined') {
  document.addEventListener("click", (event) => {
    if (plusMenu && plusBtn && !plusMenu.contains(event.target) && !plusBtn.contains(event.target)) {
      plusMenu.hidden = true;
    }
  });
}

// Final message
if (typeof console !== 'undefined') console.log("✅ Kailash AI JavaScript loaded successfully");

// ==========================================
// LIVE VOICE — STABLE
// ==========================================

let liveMode = false;
let liveRecognition = null;
let liveSpeaking = false;
let liveProcessing = false;
let liveStarting = false;
let liveUserSpeaking = false;

if (typeof window !== 'undefined' && "webkitSpeechRecognition" in window) {
  liveRecognition = new webkitSpeechRecognition();
  liveRecognition.lang = "hi-IN";
  liveRecognition.continuous = true;
  liveRecognition.interimResults = true;
  console.log("🎤 Live Voice Ready");
}

function startLiveListening() {
  if (!liveRecognition) return;
  if (!liveMode) return;
  if (liveStarting) return;
  if (liveSpeaking) return;
  if (liveProcessing) return;
  liveStarting = true;
  try { liveRecognition.start(); console.log("🎤 Listening..."); } catch (error) { console.log("🎤 Already listening"); }
  setTimeout(() => { liveStarting = false; }, 700);
}

function stopLiveListening() {
  if (!liveRecognition) return;
  try { liveRecognition.stop(); } catch (error) {}
  liveStarting = false;
}

if (liveRecognition) {
  liveRecognition.onspeechstart = () => {
    if (liveSpeaking || speechSynthesis.speaking) {
      console.log('User started speaking during AI speech: cancelling AI');
      speechSynthesis.cancel();
      liveSpeaking = false;
    }
  };

  liveRecognition.onresult = async (event) => {
    if (!liveMode) return;
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
    }
    finalText = finalText.trim();
    if (!finalText) return;
    console.log("🎤 You:", finalText);
    if (liveSpeaking) liveSpeaking = false;
    if (liveProcessing) return;
    liveProcessing = true;
    const promptEl = document.getElementById("prompt");
    if (promptEl) promptEl.value = finalText;
    stopLiveListening();
    try { await sendMessage(); await speakLiveReply(); } catch (error) { console.error("Live Voice Error:", error); }
    liveProcessing = false;
  };

  liveRecognition.onerror = (event) => {
    console.warn('Live recognition error', event.error);
    if (liveMode && !liveSpeaking && !liveProcessing) setTimeout(() => startLiveListening(), 500);
  };

  liveRecognition.onend = () => {
    if (liveMode && !liveSpeaking && !liveProcessing) setTimeout(() => { try { startLiveListening(); } catch (e) {} }, 300);
  };
}

function speakLiveReply() {
  if (!liveMode) return;
  if (!responseDiv) { liveProcessing = false; startLiveListening(); return; }
  const messages = responseDiv.querySelectorAll(".ai-message");
  if (!messages.length) { liveProcessing = false; startLiveListening(); return; }
  const lastMessage = messages[messages.length - 1];
  const textElement = lastMessage.querySelector("div");
  if (!textElement) { liveProcessing = false; startLiveListening(); return; }
  let text = textElement.innerText || "";
  text = text.replace(/[*#`_~]/g, "").replace(/🤖/g, "").trim();
  if (!text) { liveProcessing = false; startLiveListening(); return; }
  try { stopLiveListening(); } catch (e) {}
  speechSynthesis.cancel();
  liveSpeaking = true;
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "hi-IN";
  speech.rate = 0.95;
  speech.pitch = 1;
  speech.onend = () => { liveSpeaking = false; liveProcessing = false; if (liveMode) setTimeout(() => startLiveListening(), 400); };
  speech.onerror = () => { liveSpeaking = false; liveProcessing = false; if (liveMode) startLiveListening(); };
  speechSynthesis.speak(speech);
}

function startLiveVoice() {
  if (!liveRecognition) { console.log("Live Voice supported नहीं है"); return; }
  if (liveMode) {
    liveMode = false; liveSpeaking = false; liveProcessing = false; liveStarting = false; speechSynthesis.cancel(); stopLiveListening(); console.log("🔴 Live Voice OFF"); return;
  }
  liveMode = true; liveSpeaking = false; liveProcessing = false; liveStarting = false; console.log("🟢 Live Voice ON"); startLiveListening();
}

// ================================
// ACTION BUTTON — MIC / SEND / LIVE
// ================================

if (actionBtn && promptInput) {
  function updateActionButton() {
    const hasText = promptInput && promptInput.value && promptInput.value.trim().length > 0;
    const hasImageFile = !!(imageInput && imageInput.files && imageInput.files.length > 0);
    if (hasText || hasImageFile) {
      actionBtn.innerHTML = "↑";
      actionBtn.classList.add("send-mode");
    } else {
      actionBtn.innerHTML = "🔵";
      actionBtn.classList.remove("send-mode");
    }
  }
  promptInput.addEventListener("input", updateActionButton);
  actionBtn.addEventListener("click", () => {
    const hasText = promptInput && promptInput.value && promptInput.value.trim().length > 0;
    const hasImageFile = !!(imageInput && imageInput.files && imageInput.files.length > 0);
    if (hasText || hasImageFile) { sendMessage(); } else if (typeof startLiveVoice === "function") { startLiveVoice(); }
  });
  updateActionButton();
}

// ================================
// Helpers: escape HTML when inserting AI/user text
// ================================
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"]+/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c;
  });
}
function escapeAttr(s) {
  if (!s) return "";
  return String(s).replace(/\"/g, '&quot;').replace(/\n/g, ' ');
}
