const express = require("express");
const router = express.Router();
const identify = require("../controllers/insectController");
const getAll = require("../controllers/insectListController");
const {
  getHistory,
  getReport,
  getTreatment,
  deleteScan,
} = require("../controllers/scanController");

router.route("/upload").post(identify);
router.route("/").get(getAll);
router.route("/history").get(getHistory);
router.route("/history/:id").delete(deleteScan);
router.route("/report/:id").get(getReport);
router.route("/treatment/calculate").get(getTreatment);

module.exports = router;
