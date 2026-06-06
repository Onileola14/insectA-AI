const fs = require("fs");
const identifyInsect = require("../services/aiService");
const { getOrCreateInsectDetails } = require("../services/insectService");
const uploadImage = require("../services/uploadService");
const { StatusCodes } = require("http-status-codes");

const identify = async (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Please upload an image",
    });
  }

  const file = req.files.image;
  let imageUrl = null;

  try {
    imageUrl = await uploadImage(file);
    const imageSource = imageUrl || file.tempFilePath;
    const aiResult = await identifyInsect(imageSource);

    let insect = null;
    let savedToDatabase = false;
    let note = null;

    try {
      const result = await getOrCreateInsectDetails(aiResult);
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

    res.json({
      image: imageUrl,
      identified_as: aiResult,
      details: insect,
      saved_to_database: savedToDatabase,
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
