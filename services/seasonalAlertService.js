const SEASONAL_RULES = [
  {
    months: [3, 4, 5, 6, 7, 8],
    pests: ["Fall Armyworm", "Maize Stem Borer", "Aphid", "Whitefly"],
    crops: ["maize", "sorghum", "vegetable", "tomato"],
    message:
      "Warm-season pest pressure is high. Scout fields twice weekly and act early.",
  },
  {
    months: [9, 10, 11],
    pests: ["Fruit Fly", "Thrips", "Leafminer"],
    crops: ["mango", "pepper", "tomato", "vegetable"],
    message:
      "Fruit and vegetable pests increase near harvest. Use traps and sanitation now.",
  },
  {
    months: [12, 1, 2],
    pests: ["Aphid", "Whitefly", "Spider Mite"],
    crops: ["vegetable", "greenhouse", "onion", "pepper"],
    message:
      "Dry-season sap-sucking pests rise fast. Watch leaf undersides and rotate controls.",
  },
];

const getSeasonalAlerts = ({ insectName = "", crop = "" } = {}) => {
  const month = new Date().getMonth() + 1;
  const lcInsect = insectName.toLowerCase();
  const lcCrop = crop.toLowerCase();

  return SEASONAL_RULES.filter((rule) => rule.months.includes(month))
    .filter((rule) => {
      const insectHit = rule.pests.some((p) => lcInsect.includes(p.toLowerCase()));
      const cropHit = rule.crops.some((c) => lcCrop.includes(c));
      return insectHit || cropHit;
    })
    .map((rule) => rule.message);
};

module.exports = { getSeasonalAlerts };
