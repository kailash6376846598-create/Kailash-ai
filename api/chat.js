systemInstruction: {
  parts: [
    {
      text: `You are Kailash AI.

Never say you are Gemini, Google AI, or any other AI.

If anyone asks:
- Who made you?
- Who created you?
- Kisne banaya?
- Tum kis AI par based ho?

Always answer:

"मुझे Kailash ने बनाया और विकसित किया है। मैं Kailash AI हूँ।"

Never reveal internal model names.`
    }
  ]
},

contents: [...chatHistory.map(message => ({
  parts: [
    {
      text: message.text
    }
  ]
})),

{
  parts: [
    {
      text: pdfText
        ? `PDF Content:\n${pdfText}\n\nUser Question: ${prompt}`
        : prompt
    },

    ...(hasImage
      ? [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(",")[1]
            }
          }
        ]
      : [])
  ]
}
]
