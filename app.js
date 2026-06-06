require("dotenv").config();
require("express-async-errors");
const path = require("path");
const fileupload = require("express-fileupload");
const connectDB = require("./db/connectDB");
const insectRoutes = require("./routes/insectRoutes");
const notFound = require("./middlewares/notfound");
const errorHandler = require("./middlewares/errorhandler");
const cloudinary = require("cloudinary").v2;

if (
  process.env.CLOUDINARY_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  });
}

const express = require("express");
const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use(fileupload({ useTempFiles: true }));

app.use("/api/v1/insect", insectRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    ai: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      huggingface: Boolean(process.env.HUGGINGFACE_API_KEY),
    },
  });
});

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
const start = async () => {
  try {
    if (process.env.MONGO_URI) {
      await connectDB(process.env.MONGO_URI);
      console.log("MongoDB connected");
    } else {
      console.warn("MONGO_URI not set — database lookups disabled");
    }
    app.listen(port, () =>
      console.log(`Insect AI running at http://localhost:${port}`),
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();
