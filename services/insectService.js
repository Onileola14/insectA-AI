const Insect = require("../models/Insect");
const enrichInsectData = require("./insectEnrichService");

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findInsect = async ({ name, scientific_name } = {}) => {
  if (!name || !process.env.MONGO_URI) return null;

  const searchName = name.trim();
  const escaped = escapeRegex(searchName);

  const queries = [
    { name: new RegExp(`^${escaped}$`, "i") },
    { aliases: new RegExp(escaped, "i") },
    { name: new RegExp(escaped, "i") },
  ];

  if (scientific_name?.trim()) {
    queries.push({
      scientific_name: new RegExp(
        `^${escapeRegex(scientific_name.trim())}$`,
        "i",
      ),
    });
  }

  let insect = await Insect.findOne({ $or: queries });
  if (insect) return insect;

  const insects = await Insect.find({});
  const normalized = searchName.toLowerCase();

  return (
    insects.find((entry) => {
      const dbName = entry.name.toLowerCase();
      const aliasHit = entry.aliases?.some(
        (alias) =>
          normalized.includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(normalized),
      );
      return (
        aliasHit ||
        normalized.includes(dbName) ||
        dbName.includes(normalized)
      );
    }) || null
  );
};

const saveInsect = async (data) => {
  const payload = {
    name: data.name?.trim(),
    scientific_name: data.scientific_name?.trim() || "",
    aliases: data.aliases || [],
    affects: data.affects || [],
    host_plants: data.host_plants || [],
    symptoms: data.symptoms || [],
    description: data.description || "",
    organic_control: data.organic_control || [],
    chemical_control: data.chemical_control || [],
    control_methods: data.control_methods || [],
  };

  const existing = await findInsect(payload);
  if (existing) return existing;

  return await Insect.create(payload);
};

const getInsectDetails = async ({ name, scientific_name } = {}) => {
  return await findInsect({ name, scientific_name });
};

const getOrCreateInsectDetails = async (aiResult) => {
  if (!process.env.MONGO_URI) return null;

  const existing = await findInsect(aiResult);
  if (existing) return { insect: existing, created: false };

  const autoSave = process.env.AUTO_SAVE_INSECTS !== "false";
  if (!autoSave) return null;

  const enriched = await enrichInsectData(aiResult);
  const insect = await saveInsect({
    ...enriched,
    name: enriched.name || aiResult.name,
    scientific_name: enriched.scientific_name || aiResult.scientific_name || "",
    aliases: [
      ...(enriched.aliases || []),
      aiResult.name,
    ].filter((value, index, list) => list.indexOf(value) === index),
  });

  return { insect, created: true };
};

const listInsects = async () => {
  if (!process.env.MONGO_URI) return [];
  return await Insect.find({}).sort({ name: 1 }).select("-__v");
};

module.exports = {
  getInsectDetails,
  getOrCreateInsectDetails,
  saveInsect,
  listInsects,
};
