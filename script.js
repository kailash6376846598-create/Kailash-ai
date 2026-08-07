let chatHistory = [];
let pdfText = "";

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";
}

const promptInput = document.getElementById("prompt");
const responseDiv = document.getElementById("response");

const imageInput = document.getElementById("imageInput");
const imageBtn = document.getElementById("imageBtn");
const removeImageBtn = document.getElementById("removeImageBtn");

const pdfInput = document.getElementById("pdfInput");
const pdfBtn = document.getElementById("pdfBtn");

const micBtn = document.getElementById("micBtn");

function saveChat() {
  localStorage.setItem("kailash_chat", responseDiv.innerHTML);
}

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

  if (image) {
    imageBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(image);
    });
  }

  responseDiv.innerHTML += `<div class="user-message">${prompt}</div>`;
  promptInput.value = "";

  responseDiv.innerHTML += `
    <div id="thinking" class="ai-message">
      🤖 Kailash AI is thinking...
    </div>
  `;

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

    responseDiv.innerHTML += `<div class="ai-message">${data.reply}</div>`;

    chatHistory.push(
      { role: "user", text: prompt },
      { role: "assistant", text: data.reply }
    );

    saveChat();

    responseDiv.scrollTop = responseDiv.scrollHeight;

    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(data.reply);
      speech.lang = "hi-IN";
      speechSynthesis.speak(speech);
    }

  } catch (err) {
    document.getElementById("thinking")?.remove();

    responseDiv.innerHTML += `<div class="ai-message">❌ ${err.message}</div>`;
  }
}
document.getElementById("prompt").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
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
    promptInput.value = event.results[0][0].transcript;
  };
} else {
  micBtn.disabled = true;
}

// 📎 Image Upload
imageBtn.addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", () => {
  const preview = document.getElementById("imagePreview");

  if (imageInput.files.length > 0) {
    const file = imageInput.files[0];
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" style="max-width:120px;border-radius:10px;">`;
    removeImageBtn.hidden = false;
  } else {
    preview.innerHTML = "";
    removeImageBtn.hidden = true;
  }
});

removeImageBtn.addEventListener("click", () => {
  imageInput.value = "";
  document.getElementById("imagePreview").innerHTML = "";
  removeImageBtn.hidden = true;
});
