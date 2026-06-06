const express = require("express");
const router = express.Router();
const identify = require("../controllers/insectController");
const getAll = require("../controllers/insectListController");

router.route("/upload").post(identify);
router.route("/").get(getAll);

module.exports = router;
