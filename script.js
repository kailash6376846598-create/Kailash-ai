let chatHistory = [];

function saveChat() {
  const responseDiv = document.getElementById("response");
  localStorage.setItem("kailash_chat", responseDiv.innerHTML);
}

function loadChat() {
  const responseDiv = document.getElementById("response");
  const savedChat = localStorage.getItem("kailash_chat");

  if (savedChat) {
    responseDiv.innerHTML = savedChat;
    responseDiv.scrollTop = responseDiv.scrollHeight;
  }
}

window.onload = loadChat;

async function sendMessage() {
  const promptInput = document.getElementById("prompt");
const imageInput = document.getElementById("imageInput");
const responseDiv = document.getElementById("response");

  const prompt = promptInput.value.trim();
  const image = imageInput.files[0];
  let imageBase64 = "";

if (image) {
  imageBase64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(image);
  });
}
  
  chatHistory.push({
  role: "user",
  text: prompt
});

  if (prompt === "") return;

  responseDiv.innerHTML += `<div class="user-message">${prompt}</div>`;
  promptInput.value = "";

  responseDiv.innerHTML += `
<div id="thinking" class="ai-message thinking">
  <span>🤖 Kailash AI</span>
  <span class="dot"></span>
  <span class="dot"></span>
  <span class="dot"></span>
</div>`;

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
  imageBase64
})
});

const data = await res.json();

document.getElementById("thinking")?.remove();

   responseDiv.innerHTML += `<div class="ai-message">${data.reply}</div>`; 
    
    const speech = new SpeechSynthesisUtterance(data.reply);
speech.lang = "hi-IN";
speechSynthesis.speak(speech);
    chatHistory.push({
  role: "assistant",
  text: data.reply
});
    responseDiv.scrollTop = responseDiv.scrollHeight;
saveChat();
  } catch (err) {
    document.getElementById("thinking")?.remove();

    responseDiv.innerHTML += `<p><b>❌ Error:</b> ${err.message}</p>`;
    saveChat();
  }
}

document.getElementById("prompt").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
});
const micBtn = document.getElementById("micBtn");

if ("webkitSpeechRecognition" in window) {
  const recognition = new webkitSpeechRecognition();

  recognition.lang = "hi-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  micBtn.addEventListener("click", () => {
    recognition.start();
  });

  recognition.onresult = (event) => {
    document.getElementById("prompt").value =
      event.results[0][0].transcript;
  };
} else {
  micBtn.disabled = true;
  micBtn.innerText = "❌";
}
const imageBtn = document.getElementById("imageBtn");

imageBtn.addEventListener("click", () => {
  document.getElementById("imageInput").click();
});
imageInput.addEventListener("change", () => {
  const preview = document.getElementById("imagePreview");

  if (imageInput.files.length > 0) {
    const file = imageInput.files[0];
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Preview">`;
    removeImageBtn.hidden = false;
} else {
    preview.innerHTML = "";
    removeImageBtn.hidden = true;
  }
});
const removeImageBtn = document.getElementById("removeImageBtn");

removeImageBtn.addEventListener("click", () => {
  imageInput.value = "";
  document.getElementById("imagePreview").innerHTML = "";
  removeImageBtn.hidden = true;
});
const pdfBtn = document.getElementById("pdfBtn");
const pdfInput = document.getElementById("pdfInput");

pdfBtn.addEventListener("click", () => {
  pdfInput.click();
});
