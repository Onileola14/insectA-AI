require("dotenv").config();
const mongoose = require("mongoose");
const Insect = require("../models/Insect");

const seed = async () => {
  if (!process.env.MONGO_URI) {
    console.error("Set MONGO_URI in .env before seeding");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const count = await Insect.countDocuments();
  console.log(`Database already has ${count} insect(s).`);
  console.log(
    "No manual seed file needed — upload photos and each identified insect is saved automatically.",
  );
  console.log("View all: GET http://localhost:5000/api/v1/insect");
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
