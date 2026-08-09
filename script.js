let chatHistory = [];
let pdfText = "";

// 📄 PDF.js setup
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// 🔗 HTML elements
const promptInput = document.getElementById("prompt");
const responseDiv = document.getElementById("response");

const imageInput = document.getElementById("imageInput");
const imageBtn = document.getElementById("imageBtn");
const removeImageBtn = document.getElementById("removeImageBtn");

const pdfInput = document.getElementById("pdfInput");
const pdfBtn = document.getElementById("pdfBtn");

const micBtn = document.getElementById("micBtn");


// 💾 Save Chat
function saveChat() {
  localStorage.setItem("kailash_chat", responseDiv.innerHTML);
}

// 📂 Load Chat
function loadChat() {
  const chat = localStorage.getItem("kailash_chat");

  if (chat) {
    responseDiv.innerHTML = chat;
    responseDiv.scrollTop = responseDiv.scrollHeight;
  }
}

window.onload = loadChat;
async function sendMessage() {
  const prompt = promptInput.value.trim();

  if (!prompt && imageInput.files.length === 0 && pdfText === "") {
    return;
  }

  let imageBase64 = "";
  const image = imageInput.files[0];

  // 📷 Photo को Base64 में बदलना
  if (image) {
    imageBase64 = await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.readAsDataURL(image);
    });
  }

  // 📎 Attachment को Chat में दिखाना
  let attachmentHTML = "";

  if (imageBase64) {
    attachmentHTML += `
      <div style="margin-top:8px;">
        <img
          src="${imageBase64}"
          style="max-width:220px;max-height:220px;border-radius:12px;"
        >
      </div>
    `;
  }

  if (pdfInput.files.length > 0) {
    const pdfFile = pdfInput.files[0];

attachmentHTML += `
  <div style="
    margin-top:8px;
    padding:10px;
    background:#30465a;
    border-radius:10px;
  ">
    <a
      href="${URL.createObjectURL(pdfFile)}"
      target="_blank"
      style="color:white;text-decoration:none;"
    >
      📄 ${pdfFile.name}
    </a>
  </div>
`;
  }

  // 💬 User message Chat में
  responseDiv.innerHTML += `
    <div class="user-message">
      ${prompt}
      ${attachmentHTML}
    </div>
  `;

  promptInput.value = "";

  // 🤖 Thinking 3 dots
  responseDiv.innerHTML += `
    <div id="thinking" class="ai-message thinking">
      <span>🤖 Kailash AI</span>
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `;

  responseDiv.scrollTop = responseDiv.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        prompt,
        chatHistory,
        hasImage: !!image,
        imageBase64,
        pdfText
      })
    });

    const data = await res.json();

    document.getElementById("thinking")?.remove();

    responseDiv.innerHTML += `
      <div class="ai-message">
        ${data.reply || "No response"}
      </div>
    `;

    chatHistory.push(
      {
        role: "user",
        text: prompt
      },
      {
        role: "assistant",
        text: data.reply || "No response"
      }
    );

    saveChat();

    responseDiv.scrollTop = responseDiv.scrollHeight;
        // 📷 Photo और 📄 PDF preview साफ करना
    imageInput.value = "";
    pdfInput.value = "";

    document.getElementById("imagePreview").innerHTML = "";
    document.getElementById("pdfPreview").innerHTML = "";

    removeImageBtn.hidden = true;

    pdfText = "";

    // 🔊 AI Voice


      } catch (err) {
    document.getElementById("thinking")?.remove();

    responseDiv.innerHTML += `
      <div class="ai-message">
        ❌ ${err.message}
      </div>
    `;
  }
}
// ⌨️ Enter से Message Send
promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});


// 🎤 Voice Input
if ("webkitSpeechRecognition" in window) {
  const recognition = new webkitSpeechRecognition();

  recognition.lang = "hi-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  micBtn.addEventListener("click", () => {
    recognition.start();
  });

  recognition.onresult = (event) => {
    promptInput.value =
      event.results[0][0].transcript;
  };

} else {
  micBtn.disabled = true;
}
// 📷 Image Upload
imageBtn.addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", () => {
  const preview = document.getElementById("imagePreview");

  if (imageInput.files.length > 0) {
    const file = imageInput.files[0];

    preview.innerHTML = `
      <img
        src="${URL.createObjectURL(file)}"
        style="max-width:120px;border-radius:10px;"
      >
    `;

    removeImageBtn.hidden = false;
  } else {
    preview.innerHTML = "";
    removeImageBtn.hidden = true;
  }
});


// ❌ Remove Image
removeImageBtn.addEventListener("click", () => {
  imageInput.value = "";

  document.getElementById("imagePreview").innerHTML = "";

  removeImageBtn.hidden = true;
});


// 📄 PDF Button
pdfBtn.addEventListener("click", () => {
  pdfInput.click();
});


// 📄 PDF Upload + Read
pdfInput.addEventListener("change", async () => {
  const preview = document.getElementById("pdfPreview");

  if (pdfInput.files.length === 0) {
    preview.innerHTML = "";
    pdfText = "";
    return;
  }

  const file = pdfInput.files[0];

  const pdfUrl = URL.createObjectURL(file);

  preview.innerHTML = `
    <a
      href="${pdfUrl}"
      target="_blank"
      style="color:white;text-decoration:none;"
    >
      📄 ${file.name}
    </a>
  `;

  try {
    const arrayBuffer = await file.arrayBuffer();

    const pdf =
      await pdfjsLib.getDocument({
        data: arrayBuffer
      }).promise;

    pdfText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      const text =
        await page.getTextContent();

      pdfText +=
        text.items
          .map(item => item.str)
          .join(" ") + "\n";
    }

  } catch (err) {
    alert("PDF Read Error: " + err.message);
  }
});
// ✏️ New Chat
const newChatBtn = document.getElementById("newChatBtn");

newChatBtn.addEventListener("click", () => {
  if (confirm("नई चैट शुरू करनी है?")) {
    chatHistory = [];
    pdfText = "";

    localStorage.removeItem("kailash_chat");

    responseDiv.innerHTML = "";

    promptInput.value = "";

    imageInput.value = "";
    pdfInput.value = "";

    document.getElementById("imagePreview").innerHTML = "";
    document.getElementById("pdfPreview").innerHTML = "";

    removeImageBtn.hidden = true;
  }
});


// ☰ Menu
const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");
const closeMenuBtn = document.getElementById("closeMenuBtn");

menuBtn.addEventListener("click", () => {
  menu.hidden = false;
});

closeMenuBtn.addEventListener("click", () => {
  menu.hidden = true;
});


// ℹ️ About
const aboutBtn = document.getElementById("aboutBtn");

aboutBtn.addEventListener("click", () => {
  alert(
    "🤖 Kailash AI\n\nVersion: V1.0\nDeveloper: Kailash"
  );

  menu.hidden = true;
});


// 🆕 New Chat from Menu
const newChatMenuBtn =
  document.getElementById("newChatMenuBtn");

newChatMenuBtn.addEventListener("click", () => {
  if (confirm("नई चैट शुरू करनी है?")) {
    chatHistory = [];
    pdfText = "";

    localStorage.removeItem("kailash_chat");

    responseDiv.innerHTML = "";
    promptInput.value = "";

    imageInput.value = "";
    pdfInput.value = "";

    document.getElementById("imagePreview").innerHTML = "";
    document.getElementById("pdfPreview").innerHTML = "";

    removeImageBtn.hidden = true;

    menu.hidden = true;
  }
});


// 🌙 / ☀️ Theme
const themeBtn = document.getElementById("themeBtn");

const savedTheme =
  localStorage.getItem("theme");

if (savedTheme === "light") {
  document.body.classList.add("light-mode");
  themeBtn.innerHTML = "☀️ Light Mode";
}

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");

  if (document.body.classList.contains("light-mode")) {
    localStorage.setItem("theme", "light");
    themeBtn.innerHTML = "☀️ Light Mode";
  } else {
    localStorage.setItem("theme", "dark");
    themeBtn.innerHTML = "🌙 Dark Mode";
  }

  menu.hidden = true;
});


// ⚙️ Settings
const settingsBtn =
  document.getElementById("settingsBtn");

const settingsPanel =
  document.getElementById("settingsPanel");

const closeSettingsBtn =
  document.getElementById("closeSettingsBtn");

settingsBtn.addEventListener("click", () => {
  settingsPanel.hidden = false;
  menu.hidden = true;
});

closeSettingsBtn.addEventListener("click", () => {
  settingsPanel.hidden = true;
});
