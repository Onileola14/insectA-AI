const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema(
  {
    name: String,
    scientific_name: String,
    confidence: Number,
  },
  { _id: false },
);

const scanSchema = new mongoose.Schema(
  {
    image: String,
    crop: String,
    identified_as: {
      name: String,
      scientific_name: String,
      confidence: Number,
      source: String,
      model: String,
    },
    predictions: [predictionSchema],
    insect: { type: mongoose.Schema.Types.ObjectId, ref: "Insect" },
    seasonal_alerts: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Scan", scanSchema);
