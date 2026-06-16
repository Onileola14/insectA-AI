const { listScans, getScanById, deleteScanById } = require("../services/scanService");
const { calculateTreatment } = require("../services/treatmentCalculatorService");

const getHistory = async (req, res) => {
  const scans = await listScans({ limit: req.query.limit });
  res.json({ count: scans.length, scans });
};

const getReport = async (req, res) => {
  const scan = await getScanById(req.params.id);
  if (!scan) return res.status(404).json({ message: "Scan not found" });

  const report = [
    "INSECT AI REPORT",
    `Date: ${new Date(scan.createdAt).toLocaleString()}`,
    `Crop: ${scan.crop || "N/A"}`,
    `Detected: ${scan.identified_as?.name || "Unknown"}`,
    `Scientific: ${scan.identified_as?.scientific_name || "N/A"}`,
    `Confidence: ${scan.identified_as?.confidence ?? "N/A"}%`,
    "",
    "Seasonal alerts:",
    ...(scan.seasonal_alerts?.length ? scan.seasonal_alerts.map((x) => `- ${x}`) : ["- None"]),
    "",
    "Symptoms:",
    ...(scan.insect?.symptoms?.length ? scan.insect.symptoms.map((x) => `- ${x}`) : ["- N/A"]),
    "",
    "Organic control:",
    ...(scan.insect?.organic_control?.length
      ? scan.insect.organic_control.map((x) => `- ${x}`)
      : ["- N/A"]),
    "",
    "Chemical control:",
    ...(scan.insect?.chemical_control?.length
      ? scan.insect.chemical_control.map((x) => `- ${x}`)
      : ["- N/A"]),
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="insect-report-${scan.id}.txt"`);
  res.send(report);
};

const getTreatment = async (req, res) => {
  const result = calculateTreatment({
    area: req.query.area,
    unit: req.query.unit,
    rateMlPerL: req.query.rateMlPerL || 2,
    sprayVolumeLPerHa: req.query.sprayVolumeLPerHa || 200,
  });
  res.json(result);
};

const deleteScan = async (req, res) => {
  const deleted = await deleteScanById(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Scan not found" });
  res.json({ message: "Scan deleted" });
};

module.exports = { getHistory, getReport, getTreatment, deleteScan };
