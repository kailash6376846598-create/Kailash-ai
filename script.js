async function sendMessage() {
  const prompt = document.getElementById("prompt").value;
  const responseDiv = document.getElementById("response");

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

    // अभी Debug के लिए पूरा Response दिखाएंगे
    responseDiv.innerHTML = JSON.stringify(data, null, 2);

  } catch (err) {
    responseDiv.innerHTML = "Error: " + err.message;
  }
}
