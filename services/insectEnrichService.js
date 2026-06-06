const axios = require("axios");

const ENRICH_PROMPT = (name, scientificName) => `
You are an agricultural entomologist. Provide factual pest management information for: ${name}${scientificName ? ` (${scientificName})` : ""}.

Return ONLY valid JSON, no markdown:
{
  "name": "common name",
  "scientific_name": "Latin name or empty string",
  "aliases": ["other common names"],
  "affects": ["plant" or "human" or "livestock" or "beneficial"],
  "host_plants": ["crop or host names"],
  "symptoms": ["signs of damage or infestation"],
  "description": "2-3 sentence description",
  "organic_control": ["organic or cultural control methods"],
  "chemical_control": ["chemical options with note to follow label"]
}`;

const parseJsonFromText = (text) => {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return valid JSON");
  return JSON.parse(match[0]);
};

const enrichWithGroq = async (name, scientific_name) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model =
    process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model,
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "user", content: ENRICH_PROMPT(name, scientific_name) },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    },
  );

  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) return null;
  return parseJsonFromText(text);
};

const enrichWithGemini = async (name, scientific_name) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await axios.post(url, {
    contents: [{ parts: [{ text: ENRICH_PROMPT(name, scientific_name) }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
  });

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return parseJsonFromText(text);
};

const enrichInsectData = async ({ name, scientific_name }) => {
  const errors = [];

  try {
    const groq = await enrichWithGroq(name, scientific_name);
    if (groq) return groq;
  } catch (err) {
    errors.push(err.message);
  }

  try {
    const gemini = await enrichWithGemini(name, scientific_name);
    if (gemini) return gemini;
  } catch (err) {
    errors.push(err.message);
  }

  throw new Error(
    errors.length
      ? errors.join("; ")
      : "No AI available to generate insect details",
  );
};

module.exports = enrichInsectData;
