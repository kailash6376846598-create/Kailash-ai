const data = await response.json();

if (!response.ok) {
  return res.status(response.status).json(data);
}

const reply =
  data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

res.status(200).json({ reply });
