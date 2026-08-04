async function sendMessage() {
  const promptInput = document.getElementById("prompt");
  const responseDiv = document.getElementById("response");

  const prompt = promptInput.value.trim();

  if (prompt === "") return;

  responseDiv.innerHTML += `<p><b>🧑 You:</b> ${prompt}</p>`;

  promptInput.value = "";

  responseDiv.innerHTML += `<p id="thinking"><b>🤖 Kailash AI:</b> Thinking...</p>`;

  responseDiv.scrollTop = responseDiv.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const text = await res.text();
alert(text);
return;

    const thinking = document.getElementById("thinking");
    if (thinking) thinking.remove();

    responseDiv.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre>`;

    responseDiv.scrollTop = responseDiv

    responseDiv.innerHTML += `<p><b>❌ Error:</b> ${err.message}</p>`;
  }
}

document.getElementById("prompt").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
});
