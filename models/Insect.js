const mongoose = require("mongoose");

const insectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    scientific_name: String,
    aliases: [String],
    affects: [String],
    host_plants: [String],
    symptoms: [String],
    description: String,
    organic_control: [String],
    chemical_control: [String],
    control_methods: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Insect", insectSchema);
