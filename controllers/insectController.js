const fs = require("fs");
const identifyInsect = require("../services/aiService");
const { getOrCreateInsectDetails } = require("../services/insectService");
const uploadImage = require("../services/uploadService");
const { getSeasonalAlerts } = require("../services/seasonalAlertService");
const { saveScan } = require("../services/scanService");
const { StatusCodes } = require("http-status-codes");

const identify = async (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Please upload an image",
    });
  }

  const file = req.files.image;
  const crop = req.body?.crop || "";
  let imageUrl = null;

  try {
    imageUrl = await uploadImage(file);
    const imageSource = imageUrl || file.tempFilePath;
    const aiResult = await identifyInsect(imageSource);

    let insect = null;
    let savedToDatabase = false;
    let note = null;

    try {
      let result = await getOrCreateInsectDetails(aiResult);
      if (!result?.insect && aiResult.predictions?.length > 1) {
        for (const alternative of aiResult.predictions.slice(1)) {
          result = await getOrCreateInsectDetails(alternative);
          if (result?.insect) break;
        }
      }
      insect = result?.insect || null;
      savedToDatabase = Boolean(result?.created);
      if (result?.created) {
        note = "New insect saved to database for future lookups.";
      }
    } catch (err) {
      note = `Identified but could not save details: ${err.message}`;
    }

    if (!process.env.MONGO_URI) {
      note = "MongoDB not connected — identification only, no pest details stored.";
    }

    const seasonalAlerts = getSeasonalAlerts({
      insectName: aiResult.name,
      crop,
    });

    const scan = await saveScan({
      image: imageUrl,
      crop,
      identified_as: {
        name: aiResult.name,
        scientific_name: aiResult.scientific_name,
        confidence: aiResult.confidence,
        source: aiResult.source,
        model: aiResult.model,
      },
      predictions: aiResult.predictions || [],
      insect: insect?._id,
      seasonal_alerts: seasonalAlerts,
    });

    res.json({
      image: imageUrl,
      crop,
      identified_as: aiResult,
      predictions: aiResult.predictions || [],
      details: insect,
      saved_to_database: savedToDatabase,
      scan_id: scan?._id || null,
      seasonal_alerts: seasonalAlerts,
      note,
    });
  } finally {
    if (
      file.tempFilePath &&
      fs.existsSync(file.tempFilePath) &&
      !imageUrl
    ) {
      fs.unlinkSync(file.tempFilePath);
    }
  }
};

module.exports = identify;
