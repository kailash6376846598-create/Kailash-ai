(async function () {
  const startBtn = document.getElementById('startRecord');
  const stopBtn = document.getElementById('stopRecord');
  const playBtn = document.getElementById('playTTS');
  const ttsPlayer = document.getElementById('ttsPlayer');
  const recStatus = document.getElementById('recStatus');

  let mediaRecorder = null;
  let audioChunks = [];

  async function initMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (e) {
      console.error('Microphone access denied', e);
      alert('Microphone access is required for voice features.');
      throw e;
    }
  }

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    recStatus.textContent = 'Recording...';
    try {
      const stream = await initMedia();
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result; // data:audio/webm;base64,...
          recStatus.textContent = 'Uploading...';
          try {
            const resp = await fetch('/api/voice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64, mimeType: 'audio/webm', prompt: document.getElementById('prompt').value || '' })
            });
            const data = await resp.json();
            recStatus.textContent = data.transcript ? `Transcribed: ${data.transcript}` : 'No transcript';
            // Append assistant message to chat UI
            if (data.assistantText) {
              appendMessage('assistant', data.assistantText);
            }
            if (data.ttsAudioBase64) {
              ttsPlayer.src = data.ttsAudioBase64;
              ttsPlayer.hidden = false;
              playBtn.disabled = false;
            }
          } catch (e) {
            console.error('Voice upload failed', e);
            recStatus.textContent = 'Upload failed';
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
    } catch (e) {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      recStatus.textContent = 'Error';
    }
  });

  stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  playBtn.addEventListener('click', () => {
    if (ttsPlayer.src) {
      ttsPlayer.hidden = false;
      ttsPlayer.play();
    }
  });

  function appendMessage(role, text) {
    const container = document.getElementById('response');
    const el = document.createElement('div');
    el.className = `message ${role}`;
    el.textContent = text;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

})();
