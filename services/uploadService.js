const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_SECRET,
  );

const uploadImage = async (file) => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  const result = await cloudinary.uploader.upload(file.tempFilePath, {
    folder: "insect-ai",
    use_filename: true,
  });
  fs.unlinkSync(file.tempFilePath);
  return result.secure_url;
};

module.exports = uploadImage;
module.exports.isCloudinaryConfigured = isCloudinaryConfigured;
