async function sendMessage() {
  const promptInput = document.getElementById("prompt");
  const responseDiv = document.getElementById("response");

  const prompt = promptInput.value.trim();

  if (prompt === "") return;

  // User Message दिखाओ
  responseDiv.innerHTML += `<p><b>🧑 You:</b> ${prompt}</p>`;

  // Input खाली करो
  promptInput.value = "";

  // Thinking दिखाओ
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

    const data = await res.json();

    document.getElementById("thinking").remove();

    responseDiv.innerHTML += `<p><b>🤖 Kailash AI:</b> ${data.reply}</p>`;

    responseDiv.scrollTop = responseDiv.scrollHeight;

  } catch (err) {
    const thinking = document.getElementById("thinking");
    if (thinking) thinking.remove();

    responseDiv.innerHTML += `<p><b>❌ Error:</b> ${err.message}</p>`;
  }
}

document.getElementById("prompt").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
});
