const axios = require("axios");
const fs = require("fs");
const path = require("path");

const IDENTIFY_PROMPT = `You are an entomologist. Identify the insect in this image.
Return ONLY valid JSON with no markdown:
{
  "name": "best common name",
  "scientific_name": "best Latin name or empty string",
  "confidence": 0-100,
  "predictions": [
    {"name":"option 1","scientific_name":"latin or empty","confidence":0-100},
    {"name":"option 2","scientific_name":"latin or empty","confidence":0-100},
    {"name":"option 3","scientific_name":"latin or empty","confidence":0-100}
  ]
}
If unsure, still provide best guesses with lower confidence.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseJsonFromText = (text) => {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI did not return valid JSON");
  return JSON.parse(match[0]);
};

const normalizePredictions = (parsed) => {
  const predictions = Array.isArray(parsed.predictions) ? parsed.predictions : [];
  const normalized = predictions
    .map((p) => ({
      name: p?.name || "",
      scientific_name: p?.scientific_name || "",
      confidence: Number(p?.confidence) || 0,
    }))
    .filter((p) => p.name)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  const top = normalized[0] || {
    name: parsed.name || "",
    scientific_name: parsed.scientific_name || "",
    confidence: Number(parsed.confidence) || 0,
  };

  return {
    name: parsed.name || top.name || "Unknown",
    scientific_name: parsed.scientific_name || top.scientific_name || "",
    confidence: Number(parsed.confidence) || top.confidence || 0,
    predictions: normalized.length ? normalized : [top],
  };
};

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const detectMimeType = (imageSource) => {
  if (typeof imageSource === "string" && !imageSource.startsWith("http")) {
    const ext = path.extname(imageSource).toLowerCase();
    if (MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  }
  return "image/jpeg";
};

const loadImageBuffer = async (imageSource) => {
  if (Buffer.isBuffer(imageSource)) return imageSource;
  if (typeof imageSource === "string" && imageSource.startsWith("http")) {
    const res = await axios.get(imageSource, { responseType: "arraybuffer" });
    return Buffer.from(res.data);
  }
  if (typeof imageSource === "string" && fs.existsSync(imageSource)) {
    return fs.readFileSync(imageSource);
  }
  throw new Error("Invalid image source for AI");
};

const imageToBase64 = async (imageSource) => {
  const buffer = await loadImageBuffer(imageSource);
  return buffer.toString("base64");
};

const postWithRetry = async (url, body, config, retries = 3) => {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await axios.post(url, body, config);
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if ((status === 429 || status === 503) && attempt < retries - 1) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

const formatProviderError = (provider, err) => {
  const status = err.response?.status;
  const apiMessage =
    err.response?.data?.error?.message ||
    err.response?.data?.error ||
    err.message;

  if (status === 429) {
    return `${provider}: rate limit — wait a minute or try another provider`;
  }
  if (status === 401 || status === 403) {
    if (provider === "HuggingFace") {
      return `${provider}: invalid token — create a new one at huggingface.co/settings/tokens (Read access)`;
    }
    return `${provider}: invalid API key — check your .env file`;
  }
  if (err.code === "ENOTFOUND") {
    return `${provider}: could not reach API (check internet connection)`;
  }
  return `${provider}: ${apiMessage}`;
};

const identifyWithGemini = async (imageSource) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const base64 = await imageToBase64(imageSource);
  const mimeType = detectMimeType(imageSource);
  const models = (
    process.env.GEMINI_MODEL ||
    "gemini-2.0-flash-lite,gemini-2.0-flash,gemini-1.5-flash"
  ).split(",");

  let lastError;
  for (const model of models) {
    const trimmed = model.trim();
    if (!trimmed) continue;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${trimmed}:generateContent?key=${apiKey}`;

    try {
      const response = await postWithRetry(
        url,
        {
          contents: [
            {
              parts: [
                { text: IDENTIFY_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256,
          },
        },
        { timeout: 60000 },
        4,
      );

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");
      return {
        ...normalizePredictions(parseJsonFromText(text)),
        source: "gemini",
        model: trimmed,
      };
    } catch (err) {
      lastError = err;
      if (err.response?.status !== 429) break;
    }
  }

  throw lastError || new Error("Gemini request failed");
};

const identifyWithGroq = async (imageSource) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const base64 = await imageToBase64(imageSource);
  const mimeType = detectMimeType(imageSource);
  const models = (
    process.env.GROQ_MODEL ||
    "meta-llama/llama-4-scout-17b-16e-instruct"
  ).split(",");

  let lastError;
  for (const model of models) {
    const trimmed = model.trim();
    if (!trimmed) continue;

    try {
      const response = await postWithRetry(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: trimmed,
          temperature: 0.2,
          max_tokens: 256,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: IDENTIFY_PROMPT },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`,
                  },
                },
              ],
            },
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
      if (!text) throw new Error("Empty response from Groq");
      return {
        ...normalizePredictions(parseJsonFromText(text)),
        source: "groq",
        model: trimmed,
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Groq request failed");
};

const identifyWithHuggingFace = async (imageSource) => {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) return null;

  const base64 = await imageToBase64(imageSource);
  const mimeType = detectMimeType(imageSource);
  const model =
    process.env.HUGGINGFACE_MODEL ||
    "meta-llama/Llama-3.2-11B-Vision-Instruct";

  const response = await axios.post(
    "https://router.huggingface.co/v1/chat/completions",
    {
      model: `${model}:hf-inference`,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: IDENTIFY_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 256,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 90000,
    },
  );

  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Hugging Face");
  return {
    ...normalizePredictions(parseJsonFromText(text)),
    source: "huggingface",
    model,
  };
};

const PROVIDERS = {
  groq: identifyWithGroq,
  gemini: identifyWithGemini,
  huggingface: identifyWithHuggingFace,
};

const identifyInsect = async (imageSource) => {
  const order = (
    process.env.AI_PROVIDER_ORDER || "groq,gemini,huggingface"
  )
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter((name) => PROVIDERS[name]);

  const providers = order.length
    ? order.map((name) => PROVIDERS[name])
    : [identifyWithGroq, identifyWithGemini, identifyWithHuggingFace];

  const errors = [];

  for (const provider of providers) {
    try {
      const result = await provider(imageSource);
      if (result) return result;
    } catch (err) {
      const name = provider.name.replace("identifyWith", "");
      errors.push(formatProviderError(name, err));
    }
  }

  if (
    !process.env.GEMINI_API_KEY &&
    !process.env.GROQ_API_KEY &&
    !process.env.HUGGINGFACE_API_KEY
  ) {
    throw new Error(
      "No AI configured. Set GROQ_API_KEY, GEMINI_API_KEY, or HUGGINGFACE_API_KEY in .env",
    );
  }

  throw new Error(errors.join("; "));
};

module.exports = identifyInsect;
