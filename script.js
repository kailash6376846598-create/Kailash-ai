// ================================
// 🤖 KAILASH AI - SCRIPT.JS
// PART 1
// ================================

let chatHistory = [];
let pdfText = "";

// 📄 PDF.js setup
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}


// ================================
// 🔗 HTML ELEMENTS
// ================================

const promptInput =
  document.getElementById("prompt");

const responseDiv =
  document.getElementById("response");

const imageInput =
  document.getElementById("imageInput");

const removeImageBtn =
  document.getElementById("removeImageBtn");

const pdfInput =
  document.getElementById("pdfInput");

const micBtn =
  document.getElementById("micBtn");

const sendBtn =
  document.getElementById("sendBtn");

const plusBtn =
  document.getElementById("plusBtn");

const plusMenu =
  document.getElementById("plusMenu");


// ================================
// 💾 SAVE CHAT
// ================================

function saveChat() {
  localStorage.setItem(
    "kailash_chat",
    responseDiv.innerHTML
  );
}


// ================================
// 📂 LOAD CHAT
// ================================

function loadChat() {
  const chat =
    localStorage.getItem("kailash_chat");

  if (chat) {
    responseDiv.innerHTML = chat;

    responseDiv.scrollTop =
      responseDiv.scrollHeight;
  }
}


// ================================
// 🚀 PAGE LOAD
// ================================

window.addEventListener(
  "load",
  loadChat
);
// ================================
// 💬 SEND MESSAGE
// ================================

async function sendMessage() {

  const prompt =
    promptInput.value.trim();

  // अगर कुछ भी नहीं है तो वापस
  if (
    !prompt &&
    imageInput.files.length === 0 &&
    pdfText === ""
  ) {
    return;
  }

  // ================================
  // 📷 IMAGE → BASE64
  // ================================

  let imageBase64 = "";

  const image =
    imageInput.files[0];

  if (image) {

    imageBase64 =
      await new Promise((resolve) => {

        const reader =
          new FileReader();

        reader.onload = () => {
          resolve(reader.result);
        };

        reader.readAsDataURL(image);
      });
  }


  // ================================
  // 📎 ATTACHMENTS
  // ================================

  let attachmentHTML = "";

  if (imageBase64) {

    attachmentHTML += `
      <div style="margin-top:8px;">
        <img
          src="${imageBase64}"
          style="
            max-width:220px;
            max-height:220px;
            border-radius:12px;
          "
        >
      </div>
    `;
  }


  // ================================
  // 📄 PDF
  // ================================

  if (
    pdfInput &&
    pdfInput.files.length > 0
  ) {

    const pdfFile =
      pdfInput.files[0];

    attachmentHTML += `
      <div style="
        margin-top:8px;
        padding:10px;
        background:#30465a;
        border-radius:10px;
      ">
        📄 ${pdfFile.name}
      </div>
    `;
  }


  // ================================
  // 👤 USER MESSAGE
  // ================================

  responseDiv.innerHTML += `
    <div class="user-message">
      ${prompt}
      ${attachmentHTML}
    </div>
  `;

  promptInput.value = "";


  // ================================
  // 🤖 THINKING
  // ================================

  responseDiv.innerHTML += `
    <div
      id="thinking"
      class="ai-message thinking"
    >
      <span>🤖 Kailash AI</span>
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `;

  responseDiv.scrollTop =
    responseDiv.scrollHeight;


  // ================================
  // 🌐 API REQUEST
  // ================================

  try {

    const res =
      await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          prompt: prompt,
          chatHistory: chatHistory,
          hasImage: !!image,
          imageBase64: imageBase64,
          pdfText: pdfText
        })
      });


    const data =
      await res.json();


    document
      .getElementById("thinking")
      ?.remove();


    const replyText =
      data.reply ||
      "No response";


    // ================================
    // 🤖 AI MESSAGE
    // ================================

    responseDiv.innerHTML += `
      <div class="ai-message">
        <div>${replyText}</div>

        <button
          class="speak-btn"
          onclick="speakReply(this)"
          data-text="${replyText
            .replace(/"/g, "&quot;")}"
        >
          🔊
        </button>
      </div>
    `;


    // ================================
    // 🧠 CHAT HISTORY
    // ================================

    chatHistory.push(
      {
        role: "user",
        text: prompt
      },
      {
        role: "assistant",
        text: replyText
      }
    );


    saveChat();

    responseDiv.scrollTop =
      responseDiv.scrollHeight;

  } catch (err) {

    document
      .getElementById("thinking")
      ?.remove();

    responseDiv.innerHTML += `
      <div class="ai-message">
        ❌ ${err.message}
      </div>
    `;
  }
}
// ================================
// ⌨️ ENTER KEY
// ================================

promptInput.addEventListener(
  "keydown",
  (e) => {

    if (e.key === "Enter") {

      e.preventDefault();

      sendMessage();
    }
  }
);


// ================================
// 🎤 VOICE INPUT
// ================================

if (
  "webkitSpeechRecognition"
  in window
) {

  const recognition =
    new webkitSpeechRecognition();

  recognition.lang =
    "hi-IN";

  recognition.continuous =
    false;

  recognition.interimResults =
    false;


  micBtn.addEventListener(
    "click",
    () => {

      recognition.start();
    }
  );


  recognition.onresult =
    (event) => {

      promptInput.value =
        event.results[0][0]
          .transcript;
    };


  recognition.onerror =
    () => {

      console.log(
        "Voice input error"
      );
    };

} else {

  micBtn.disabled = true;
}


// ================================
// 🔊 AI VOICE
// ================================

function speakReply(button) {

  const text =
    button.getAttribute(
      "data-text"
    );

  if (!text) return;

  speechSynthesis.cancel();

  const speech =
    new SpeechSynthesisUtterance(
      text
    );

  speech.lang =
    "hi-IN";

  speech.rate =
    1;

  speech.pitch =
    1;

  speechSynthesis.speak(
    speech
  );
}


// ================================
// 📷 IMAGE PREVIEW
// ================================

imageInput.addEventListener(
  "change",
  () => {

    const preview =
      document.getElementById(
        "imagePreview"
      );

    if (
      imageInput.files.length > 0
    ) {

      const file =
        imageInput.files[0];

      preview.innerHTML = `
        <img
          src="${URL.createObjectURL(file)}"
          style="
            max-width:120px;
            border-radius:10px;
          "
        >
      `;

      removeImageBtn.hidden =
        false;

    } else {

      preview.innerHTML = "";

      removeImageBtn.hidden =
        true;
    }
  }
);


// ================================
// ❌ REMOVE IMAGE
// ================================

removeImageBtn.addEventListener(
  "click",
  () => {

    imageInput.value = "";

    document.getElementById(
      "imagePreview"
    ).innerHTML = "";

    removeImageBtn.hidden =
      true;
  }
);


// ================================
// 📄 PDF UPLOAD
// ================================

pdfInput.addEventListener(
  "change",
  async () => {

    const preview =
      document.getElementById(
        "pdfPreview"
      );

    if (
      pdfInput.files.length === 0
    ) {

      preview.innerHTML = "";

      pdfText = "";

      return;
    }


    const file =
      pdfInput.files[0];

    preview.innerHTML = `
      <div
        style="
          padding:10px;
          color:white;
        "
      >
        📄 ${file.name}
      </div>
    `;


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
          await
          // ================================
// ✏️ NEW CHAT
// ================================

const newChatBtn =
  document.getElementById("newChatBtn");

newChatBtn.addEventListener(
  "click",
  () => {

    if (
      confirm("नई चैट शुरू करनी है?")
    ) {

      chatHistory = [];
      pdfText = "";

      localStorage.removeItem(
        "kailash_chat"
      );

      responseDiv.innerHTML = "";

      promptInput.value = "";

      imageInput.value = "";

      pdfInput.value = "";

      document.getElementById(
        "imagePreview"
      ).innerHTML = "";

      document.getElementById(
        "pdfPreview"
      ).innerHTML = "";

      removeImageBtn.hidden =
        true;
    }
  }
);


// ================================
// ☰ MENU
// ================================

const menuBtn =
  document.getElementById(
    "menuBtn"
  );

const menu =
  document.getElementById("menu");

const closeMenuBtn =
  document.getElementById(
    "closeMenuBtn"
  );


menuBtn.addEventListener(
  "click",
  () => {

    menu.hidden = false;
  }
);


closeMenuBtn.addEventListener(
  "click",
  () => {

    menu.hidden = true;
  }
);


// ================================
// ℹ️ ABOUT
// ================================

const aboutBtn =
  document.getElementById(
    "aboutBtn"
  );

aboutBtn.addEventListener(
  "click",
  () => {

    alert(
      "🤖 Kailash AI\n\n" +
      "Version: V1.0\n" +
      "Developer: Kailash"
    );

    menu.hidden = true;
  }
);


// ================================
// 🆕 NEW CHAT FROM MENU
// ================================

const newChatMenuBtn =
  document.getElementById(
    "newChatMenuBtn"
  );

newChatMenuBtn.addEventListener(
  "click",
  () => {

    newChatBtn.click();

    menu.hidden = true;
  }
);


// ================================
// 🌙 DARK / ☀️ LIGHT MODE
// ================================

const themeBtn =
  document.getElementById(
    "themeBtn"
  );

const savedTheme =
  localStorage.getItem(
    "theme"
  );


if (savedTheme === "light") {

  document.body.classList.add(
    "light-mode"
  );

  themeBtn.innerHTML =
    "☀️ Light Mode";
}


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

    menu.hidden = true;
  }
);


// ================================
// ⚙️ SETTINGS
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


settingsBtn.addEventListener(
  "click",
  () => {

    settingsPanel.hidden = false;

    menu.hidden = true;
  }
);


closeSettingsBtn.addEventListener(
  "click",
  () => {

    settingsPanel.hidden = true;
  }
);


// ================================
// ➕ PLUS MENU
// ================================

plusBtn.addEventListener(
  "click",
  () => {

    plusMenu.hidden =
      !plusMenu.hidden;
  }
);


// ================================
// 📷 CAMERA / PHOTOS / FILES
// ================================

const cameraOption =
  document.getElementById(
    "cameraOption"
  );

const photosOption =
  document.getElementById(
    "photosOption"
  );

const filesOption =
  document.getElementById(
    "filesOption"
  );


// 📷 Camera
cameraOption.addEventListener(
  "click",
  () => {

    imageInput.setAttribute(
      "capture",
      "environment"
    );

    imageInput.click();

    plusMenu.hidden = true;
  }
);


// 🖼️ Photos
photosOption.addEventListener(
  "click",
  () => {

    imageInput.removeAttribute(
      "capture"
    );

    imageInput.click();

    plusMenu.hidden = true;
  }
);


// 📄 Files
filesOption.addEventListener(
  "click",
  () => {

    pdfInput.click();

    plusMenu.hidden = true;
  }
);
