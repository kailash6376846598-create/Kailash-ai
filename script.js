alert("Script Loaded");

async function sendMessage() {
  const prompt = document.getElementById("prompt").value;
  const responseDiv = document.getElementById("response");

  if (prompt.trim() === "") {
    return;
  }

  responseDiv.innerHTML = "Thinking...";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    responseDiv.innerHTML = data.reply;

  } catch (err) {
    responseDiv.innerHTML = "Error: " + err.message;
  }
}
