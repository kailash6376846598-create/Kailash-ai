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
  const responseDiv = document.getElementById("response");

  const prompt = promptInput.value.trim();

  if (prompt === "") return;

  responseDiv.innerHTML += `<div class="user-message">${prompt}</div>`;
  promptInput.value = "";

  responseDiv.innerHTML += `<p id="thinking"><b>🤖 Kailash AI:</b> Thinking...</p>`;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

document.getElementById("thinking")?.remove();

    responseDiv.innerHTML += `<p><b>🤖 Kailash AI:</b> ${data.reply}</p>`;
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
