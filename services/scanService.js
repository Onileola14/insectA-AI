const Scan = require("../models/Scan");

const saveScan = async (payload) => {
  if (!process.env.MONGO_URI) return null;
  return await Scan.create(payload);
};

const listScans = async ({ limit = 20 } = {}) => {
  if (!process.env.MONGO_URI) return [];
  return await Scan.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 100))
    .populate("insect");
};

const getScanById = async (id) => {
  if (!process.env.MONGO_URI) return null;
  return await Scan.findById(id).populate("insect");
};

module.exports = { saveScan, listScans, getScanById };
