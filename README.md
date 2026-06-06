# Insect AI — Free identification API + web app

Identify insects from photos using **free AI** (Google Gemini), with optional verified pest data from MongoDB. Includes a built-in web frontend.

**No OpenAI billing required.**

---

## What changed from the original repo

| Before | After |
|--------|--------|
| OpenAI Vision (paid) | **Google Gemini** (free tier) + Hugging Face fallback |
| API only | **Web UI** at `http://localhost:5000` |
| Cloudinary required | Cloudinary **optional** |

---

## Quick start

### 1. Install

```bash
cd insectAI-API
npm install
```

### 2. Environment

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

**Minimum to run identification:**

```env
GEMINI_API_KEY=your_key_from_https://aistudio.google.com/apikey
```

Optional:

- `MONGO_URI` — for stored pest details (run `npm run seed` after connecting)
- `HUGGINGFACE_API_KEY` — backup classifier if Gemini fails
- Cloudinary vars — only if you want images stored in the cloud

### 3. Run

```bash
npm start
```

Open **http://localhost:5000** in your browser.

### 4. Seed sample pests (optional)

```bash
npm run seed
```

---

## API

**POST** `/api/v1/insect/upload`  
`multipart/form-data` field: `image`

**GET** `/api/health` — shows which AI keys are configured

---

## How it works

```
Upload image (browser or API)
        ↓
Optional Cloudinary upload
        ↓
Gemini Vision identifies name + scientific name (FREE)
        ↓
MongoDB lookup for control methods (if seeded)
        ↓
JSON response + UI display
```

---

## Free AI setup

### Google Gemini (recommended)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key (free tier available)
3. Add to `.env`: `GEMINI_API_KEY=...`

### Hugging Face (fallback)

1. Create account at [huggingface.co](https://huggingface.co)
2. Create a token at Settings → Access Tokens
3. Add to `.env`: `HUGGINGFACE_API_KEY=...`

---

## Project structure

```
insectAI-API/
├── app.js
├── public/          ← Web frontend
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── controllers/
├── services/
│   └── aiService.js ← Gemini + HuggingFace
├── models/
├── db/
│   └── seed.js
└── .env.example
```

---

## Author

**Salami Tunde Onileola** — Agriculture (Crop Protection) | Backend Developer
git repo : https://github.com/Onileola14/insectA-AI.git
live-url : https://insecta-ai.pxxl.click/
