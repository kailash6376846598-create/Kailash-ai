let chatHistory = [];
let pdfText = "";

// PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// HTML Elements
const promptInput = document.getElementById("prompt");
const responseDiv = document.getElementById("response");

const imageInput = document.getElementById("imageInput");
const removeImageBtn =
  document.getElementById("removeImageBtn");

const pdfInput = document.getElementById("pdfInput");

const micBtn = document.getElementById("micBtn");
const actionBtn = document.getElementById("actionBtn");
const imagePreview =
  document.getElementById("imagePreview");

const pdfPreview =
  document.getElementById("pdfPreview");


// Check important elements
console.log("Kailash AI loaded");

console.log("Prompt:", promptInput);
console.log("Response:", responseDiv);
console.log("Image:", imageInput);
console.log("PDF:", pdfInput);
console.log("Mic:", micBtn);


// Save Chat
function saveChat() {
  localStorage.setItem(
    "kailash_chat",
    responseDiv.innerHTML
  );
}


// Load Chat
function loadChat() {
  const chat =
    localStorage.getItem("kailash_chat");

  if (chat) {
    responseDiv.innerHTML = chat;

    responseDiv.scrollTop =
      responseDiv.scrollHeight;
  }
}


// Load saved chat
loadChat();


// Enter Button
if (promptInput) {
  promptInput.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Enter") {

        event.preventDefault();

        sendMessage();
      }

    }
  );
}
// ================================
// PART 2 — SEND MESSAGE
// ================================

async function sendMessage() {

  const prompt =
    promptInput.value.trim();

  // Check message
  if (
    !prompt &&
    imageInput.files.length === 0 &&
    pdfText === ""
  ) {
    return;
  }


  // ================================
  // IMAGE → BASE64
  // ================================

  let imageBase64 = "";

const image =
  imageInput.files[0];

if (image) {

  imageBase64 =
    await new Promise((resolve) => {

      const reader = new FileReader();

      reader.onload = () => {

        const img = new Image();

        img.onload = () => {

          const maxSize = 800;

          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {

            if (width > height) {
              height =
                Math.round(height * maxSize / width);
              width = maxSize;
            } else {
              width =
                Math.round(width * maxSize / height);
              height = maxSize;
            }

          }

          const canvas =
            document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const ctx =
            canvas.getContext("2d");

          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );

          resolve(
            canvas.toDataURL(
              "image/jpeg",
              0.7
            )
          );

        };

                img.src = reader.result;
      };

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
  <div style="
  margin-top:8px;
  display:inline-block;
  line-height:0;
">
  <img
    src="${imageBase64}"
    style="
      width:auto;
      height:auto;
      max-width:280px;
      max-height:350px;
      border-radius:12px;
      object-fit:contain;
      display:block;
    "
  >
</div>  
        >
      </div>
    `;
  }


  // PDF attachment
  if (
    pdfInput &&
    pdfInput.files.length > 0
  ) {

    const pdfFile =
      pdfInput.files[0];

    const pdfUrl =
      URL.createObjectURL(pdfFile);

    attachmentHTML += `
      <div style="
        margin-top:8px;
        padding:10px;
        background:#30465a;
        border-radius:10px;
      ">

        <a
          href="${pdfUrl}"
          target="_blank"
          style="
            color:white;
            text-decoration:none;
          "
        >
          📄 ${pdfFile.name}
        </a>

      </div>
    `;
  }


  // ================================
  // USER MESSAGE
  // ================================

  responseDiv.innerHTML += `
    <div class="user-message">

      <div>
        ${prompt}
      </div>

      ${attachmentHTML}

    </div>
  `;


  // Clear input
  promptInput.value = "";


  // ================================
  // THINKING
  // ================================

  responseDiv.innerHTML += `
    <div
      id="thinking"
      class="ai-message thinking"
    >

      <span>
        🤖 Kailash AI
      </span>

      <span class="dot"></span>

      <span class="dot"></span>

      <span class="dot"></span>

    </div>
  `;


  responseDiv.scrollTop =
    responseDiv.scrollHeight;
  // ================================
// PART 3 — API + AI REPLY
// ================================

  try {

    const res = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        prompt: prompt,

        chatHistory: chatHistory,

        hasImage: !!image,

        imageBase64: imageBase64,

        pdfText: pdfText

      })

    });


    // Check server response
    if (!res.ok) {

      const errorText =
        await res.text();

      throw new Error(
        "Server Error: " +
        res.status +
        " " +
        errorText
      );

    }


    const data =
      await res.json();


    // Remove thinking
    document
      .getElementById("thinking")
      ?.remove();


    // AI reply
    const replyText =
      data.reply || "No response";


    // Clean text for voice
    const cleanReply =
      replyText
        .replace(/[*#`_~]/g, "")
        .replace(/\s+/g, " ")
        .trim();


    // ================================
    // AI MESSAGE
    // ================================

    responseDiv.innerHTML += `
      <div class="ai-message">

        <div>
          ${replyText}
        </div>

        <button
          class="speak-btn"
          onclick="speakReply(this)"
          data-text="${cleanReply
            .replace(/"/g, "&quot;")}"
        >
          🔊
        </button>

      </div>
    `;


    // ================================
    // CHAT HISTORY
    // ================================

    chatHistory.push({

      role: "user",

      text: prompt

    });


    chatHistory.push({

      role: "assistant",

      text: replyText

    });


    // Save chat
    saveChat();


    // Scroll down
    responseDiv.scrollTop =
      responseDiv.scrollHeight;


    // ================================
    // CLEAR ATTACHMENTS
    // ================================

    imageInput.value = "";

    pdfInput.value = "";

    imagePreview.innerHTML = "";

    pdfPreview.innerHTML = "";

    removeImageBtn.hidden = true;

    pdfText = "";

  } catch (error) {

    // Remove thinking
    document
      .getElementById("thinking")
      ?.remove();


    // Show error
    responseDiv.innerHTML += `
      <div class="ai-message">

        ❌ ${error.message}

      </div>
    `;


    responseDiv.scrollTop =
      responseDiv.scrollHeight;

  }

      }
// ================================
// PART 4 — VOICE INPUT
// ================================

if ("webkitSpeechRecognition" in window) {

  const recognition =
    new webkitSpeechRecognition();

  recognition.lang = "hi-IN";

  recognition.continuous = false;

  recognition.interimResults = false;


  if (micBtn) {

    micBtn.addEventListener(
      "click",
      () => {

        recognition.start();

      }
    );

  }


  recognition.onresult =
    (event) => {

      const text =
        event.results[0][0].transcript;

      promptInput.value = text;

    };


  recognition.onerror =
    (event) => {

      console.log(
        "Voice Error:",
        event.error
      );

    };

} else {

  if (micBtn) {
    micBtn.disabled = true;
  }

}


// ================================
// PART 4 — AI VOICE
// ================================

function speakReply(button) {

  if (!button) return;


  const text =
    button.getAttribute("data-text");


  if (!text) return;


  speechSynthesis.cancel();


  const speech =
    new SpeechSynthesisUtterance(text);


  speech.lang = "hi-IN";

  speech.rate = 1;

  speech.pitch = 1;


  speechSynthesis.speak(speech);

}
// ================================
// PART 5 — IMAGE UPLOAD
// ================================

if (imageInput) {

  imageInput.addEventListener(
    "change",
    () => {

      if (imageInput.files.length > 0) {

        const file =
          imageInput.files[0];

        const imageUrl =
          URL.createObjectURL(file);


        imagePreview.innerHTML = `
  <div style="
    position:relative;
    display:inline-block;
    margin:8px;
  ">
    <img
      src="${imageUrl}"
      style="
        max-width:120px;
        max-height:120px;
        border-radius:10px;
        display:block;
      "
    >

    <button
      type="button"
      onclick="document.getElementById('removeImageBtn').click()"
      style="
        position:absolute;
        top:-8px;
        right:-8px;
        width:24px;
        height:24px;
        border:none;
        border-radius:50%;
        background:#333;
        color:white;
        font-size:18px;
        line-height:24px;
        padding:0;
        cursor:pointer;
      "
    >×</button>
  </div>
`;

removeImageBtn.hidden = false;

actionBtn.innerHTML = "↑";


        removeImageBtn.hidden =
  false;

actionBtn.innerHTML = "↑";

} else {

  imagePreview.innerHTML =
    "";

  removeImageBtn.hidden =
    true;

  actionBtn.innerHTML = "🔵";;
      }

    }
  );

}


// ================================
// REMOVE IMAGE
// ================================

if (removeImageBtn) {

  removeImageBtn.addEventListener(
    "click",
    () => {

      imageInput.value = "";

      imagePreview.innerHTML =
        "";

      removeImageBtn.hidden =
        true;

    }
  );

}


// ================================
// PDF UPLOAD
// ================================

if (pdfInput) {

  pdfInput.addEventListener(
    "change",
    async () => {

      if (pdfInput.files.length === 0) {

        pdfPreview.innerHTML =
          "";

        pdfText = "";

        return;

      }


      const file =
        pdfInput.files[0];


      const pdfUrl =
        URL.createObjectURL(file);


      pdfPreview.innerHTML = `
        <a
          href="${pdfUrl}"
          target="_blank"
          style="
            color:white;
            text-decoration:none;
          "
        >
          📄 ${file.name}
        </a>
      `;


      // PDF.js check
      if (!window.pdfjsLib) {

        alert(
          "PDF reader load नहीं हुआ।"
        );

        return;

      }


      try {

        const arrayBuffer =
          await file.arrayBuffer();


        const pdf =
          await pdfjsLib
            .getDocument({
              data: arrayBuffer
            })
            .promise;


        pdfText = "";


        for (
          let i = 1;
          i <= pdf.numPages;
          i++
        ) {

          const page =
            await pdf.getPage(i);


          const text =
            await page.getTextContent();


          pdfText +=
            text.items
              .map(item => item.str)
              .join(" ") +
            "\n";

        }


        console.log(
          "PDF text loaded"
        );

      } catch (error) {

        pdfText = "";

        alert(
          "PDF Read Error: " +
          error.message
        );

      }

    }
  );

}
// ================================
// PART 6 — NEW CHAT
// ================================

const newChatBtn =
  document.getElementById("newChatBtn");

function startNewChat() {

  chatHistory = [];

  pdfText = "";

  localStorage.removeItem(
    "kailash_chat"
  );

  responseDiv.innerHTML = "";

  promptInput.value = "";

  imageInput.value = "";

  pdfInput.value = "";

  imagePreview.innerHTML = "";

  pdfPreview.innerHTML = "";

  removeImageBtn.hidden = true;

}


// Top New Chat button
if (newChatBtn) {

  newChatBtn.addEventListener(
    "click",
    () => {

      if (
        confirm(
          "नई चैट शुरू करनी है?"
        )
      ) {

        startNewChat();

      }

    }
  );

}


// ================================
// PART 6 — MENU
// ================================

const menuBtn =
  document.getElementById("menuBtn");

const menu =
  document.getElementById("menu");

const closeMenuBtn =
  document.getElementById(
    "closeMenuBtn"
  );


if (menuBtn && menu) {

  menuBtn.addEventListener(
    "click",
    () => {

      menu.hidden =
        !menu.hidden;

    }
  );

}


if (closeMenuBtn && menu) {

  closeMenuBtn.addEventListener(
    "click",
    () => {

      menu.hidden = true;

    }
  );

}


// ================================
// ABOUT
// ================================

const aboutBtn =
  document.getElementById("aboutBtn");


if (aboutBtn) {

  aboutBtn.addEventListener(
    "click",
    () => {

      alert(
        "🤖 Kailash AI\n\n" +
        "Version: V1.0\n" +
        "Developer: Kailash"
      );

      if (menu) {
        menu.hidden = true;
      }

    }
  );

}


// ================================
// NEW CHAT FROM MENU
// ================================

const newChatMenuBtn =
  document.getElementById(
    "newChatMenuBtn"
  );


if (newChatMenuBtn) {

  newChatMenuBtn.addEventListener(
    "click",
    () => {

      if (
        confirm(
          "नई चैट शुरू करनी है?"
        )
      ) {

        startNewChat();

      }

      if (menu) {
        menu.hidden = true;
      }

    }
  );

}
// ================================
// PART 7 — THEME + SETTINGS
// ================================

const themeBtn =
  document.getElementById("themeBtn");

const savedTheme =
  localStorage.getItem("theme");

if (
  savedTheme === "light" &&
  themeBtn
) {
  document.body.classList.add(
    "light-mode"
  );

  themeBtn.innerHTML =
    "☀️ Light Mode";
}


if (themeBtn) {

  themeBtn.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "light-mode"
      );


      if (
        document.body.classList.contains(
          "light-mode"
        )
      ) {

        localStorage.setItem(
          "theme",
          "light"
        );

        themeBtn.innerHTML =
          "☀️ Light Mode";

      } else {

        localStorage.setItem(
          "theme",
          "dark"
        );

        themeBtn.innerHTML =
          "🌙 Dark Mode";

      }


      if (menu) {
        menu.hidden = true;
      }

    }
  );

}


// ================================
// SETTINGS
// ================================

const settingsBtn =
  document.getElementById(
    "settingsBtn"
  );

const settingsPanel =
  document.getElementById(
    "settingsPanel"
  );

const closeSettingsBtn =
  document.getElementById(
    "closeSettingsBtn"
  );


if (
  settingsBtn &&
  settingsPanel
) {

  settingsBtn.addEventListener(
    "click",
    () => {

      settingsPanel.hidden =
        false;

      if (menu) {
        menu.hidden = true;
      }

    }
  );

}


if (
  closeSettingsBtn &&
  settingsPanel
) {

  closeSettingsBtn.addEventListener(
    "click",
    () => {

      settingsPanel.hidden =
        true;

    }
  );

}


// ================================
// CLOSE SETTINGS WITH ESC
// ================================

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape" &&
      settingsPanel
    ) {

      settingsPanel.hidden =
        true;

    }

  }
);
// ================================
// PART 8 — PLUS MENU
// ================================

const plusBtn =
  document.getElementById("plusBtn");

const plusMenu =
  document.getElementById("plusMenu");

const cameraOption =
  document.getElementById("cameraOption");

const photosOption =
  document.getElementById("photosOption");

const filesOption =
  document.getElementById("filesOption");


// ➕ Open / Close Plus Menu
if (plusBtn && plusMenu) {

  plusBtn.addEventListener(
    "click",
    () => {

      plusMenu.hidden =
        !plusMenu.hidden;

    }
  );

}


// 📷 Camera
if (cameraOption) {

  cameraOption.addEventListener(
    "click",
    () => {

      imageInput.setAttribute(
        "capture",
        "environment"
      );

      imageInput.click();

      if (plusMenu) {
        plusMenu.hidden = true;
      }

    }
  );

}


// 🖼️ Photos
if (photosOption) {

  photosOption.addEventListener(
    "click",
    () => {

      imageInput.removeAttribute(
        "capture"
      );

      imageInput.click();

      if (plusMenu) {
        plusMenu.hidden = true;
      }

    }
  );

}


// 📄 Files / PDF
if (filesOption) {

  filesOption.addEventListener(
    "click",
    () => {

      pdfInput.click();

      if (plusMenu) {
        plusMenu.hidden = true;
      }

    }
  );

}


// ================================
// CLOSE PLUS MENU OUTSIDE
// ================================

document.addEventListener(
  "click",
  (event) => {

    if (
      plusMenu &&
      plusBtn &&
      !plusMenu.contains(event.target) &&
      !plusBtn.contains(event.target)
    ) {

      plusMenu.hidden = true;

    }

  }
);


// ================================
// FINAL MESSAGE
// ================================

console.log(
  "✅ Kailash AI JavaScript loaded successfully"
  );
// ==========================================
// LIVE VOICE
// ==========================================

let liveMode = false;
let liveRecognition = null;
let liveSpeaking = false;
let liveProcessing = false;
let liveStarting = false;

if ("webkitSpeechRecognition" in window) {

  liveRecognition =
    new webkitSpeechRecognition();

  liveRecognition.lang = "hi-IN";

  liveRecognition.continuous = true;

  liveRecognition.interimResults = true;

  console.log("Live Voice Ready");

}
function cleanLiveText(text) {

  if (!text) return "";

  return text
    .replace(/[*#`_~]/g, "")
    .replace(
      /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

}
function startLiveListening() {

  if (!liveMode) return;

  if (liveSpeaking) return;

  if (liveProcessing) return;

  if (liveStarting) return;

  liveStarting = true;

  try {

    liveRecognition.start();

    console.log(
      "🎤 Live सुन रहा है..."
    );

  } catch (error) {

    console.log(
      "Recognition already active"
    );

  }

  setTimeout(() => {

    liveStarting = false;

  }, 500);

}
function stopLiveVoice() {

  liveMode = false;
  liveProcessing = false;
  liveSpeaking = false;
  liveStarting = false;

  try {
    liveRecognition.stop();
  } catch (e) {}

  try {
    speechSynthesis.cancel();
  } catch (e) {}

  actionBtn.innerHTML = "🔵";

  console.log("🔴 Live Voice बंद");

}
function stopLiveSpeaking() {

  try {
    speechSynthesis.cancel();
  } catch (e) {}

  liveSpeaking = false;

}
if (liveRecognition) {

  liveRecognition.onresult =
    async (event) => {

      if (!liveMode) return;

      let text = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {

        if (event.results[i].isFinal) {

          text +=
            event.results[i][0].transcript;

        }

      }

      text = text.trim();

      if (!text) return;

      console.log("🎤 User:", text);

      // अगर AI बोल रही है तो तुरंत रोक दो
      if (liveSpeaking) {
        stopLiveSpeaking();
      }

      liveProcessing = true;

      promptInput.value = text;

      try {
        liveRecognition.stop();
      } catch (e) {}

      await sendMessage();

    };

}
if (liveRecognition) {

  liveRecognition.onend = () => {

    if (!liveMode) return;

    if (liveSpeaking) return;

    if (liveProcessing) return;

    setTimeout(() => {

      startLiveListening();

    }, 300);

  };

}
async function speakLiveReply() {

  const messages =
    responseDiv.querySelectorAll(
      ".ai-message"
    );

  if (!messages.length) {

    liveProcessing = false;

    if (liveMode) {
      startLiveListening();
    }

    return;
  }

  const lastMessage =
    messages[messages.length - 1];

  const textElement =
    lastMessage.querySelector("div");

  if (!textElement) {

    liveProcessing = false;

    if (liveMode) {
      startLiveListening();
    }

    return;
  }

  const aiText =
    cleanLiveText(
      textElement.innerText
    );

  if (!aiText) {

    liveProcessing = false;

    if (liveMode) {
      startLiveListening();
    }

    return;
  }

  stopLiveSpeaking();

  liveSpeaking = true;
    const speech =
    new SpeechSynthesisUtterance(
      aiText
    );

  speech.lang = "hi-IN";
  speech.rate = 0.95;
  speech.pitch = 1;

  speech.onend = () => {

    liveSpeaking = false;
    liveProcessing = false;

    if (liveMode) {

      setTimeout(() => {

        startLiveListening();

      }, 300);

    }

  };

  speech.onerror = () => {

    liveSpeaking = false;
    liveProcessing = false;

    if (liveMode) {
      startLiveListening();
    }

  };

  speechSynthesis.speak(speech);

}
function startLiveVoice() {

  if (!liveRecognition) {
    console.log("Live Voice supported नहीं है");
    return;
  }

  if (liveMode) {

    stopLiveVoice();

    return;
  }

  liveMode = true;
  liveProcessing = false;
  liveSpeaking = false;
  liveStarting = false;

  actionBtn.innerHTML = "🔴";

  startLiveListening();

}
// ================================
// ACTION BUTTON — MIC / SEND / LIVE
// ================================


if (actionBtn && promptInput) {

  function updateActionButton() {

    if (
  promptInput.value.trim() ||
  imageInput.files.length > 0
) {

      // Message लिखा है → SEND
      actionBtn.innerHTML = "↑";
      actionBtn.classList.add("send-mode");

    } else {

      // खाली है → LIVE VOICE
      actionBtn.innerHTML = "🔵";
      actionBtn.classList.remove("send-mode");

    }
  }

  promptInput.addEventListener(
    "input",
    updateActionButton
  );

  actionBtn.addEventListener(
    "click",
    () => {

    if (
  promptInput.value.trim() ||
  imageInput.files.length > 0
) {

        sendMessage();

      } else if (typeof startLiveVoice === "function") {

        startLiveVoice();

      } else if (typeof liveBtn !== "undefined") {

        liveBtn.click();

      }

    }
  );

  updateActionButton();
}
