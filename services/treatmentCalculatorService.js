const calculateTreatment = ({ area, unit = "ha", rateMlPerL = 2, sprayVolumeLPerHa = 200 }) => {
  const parsedArea = Number(area);
  if (!Number.isFinite(parsedArea) || parsedArea <= 0) {
    throw new Error("Area must be a positive number");
  }

  const normalizedUnit = unit === "acre" ? "acre" : "ha";
  const areaHa = normalizedUnit === "acre" ? parsedArea * 0.404686 : parsedArea;
  const totalSprayVolumeL = areaHa * Number(sprayVolumeLPerHa);
  const productMl = totalSprayVolumeL * Number(rateMlPerL);

  return {
    input: { area: parsedArea, unit: normalizedUnit, rateMlPerL, sprayVolumeLPerHa },
    totals: {
      areaHa: Number(areaHa.toFixed(3)),
      sprayVolumeL: Number(totalSprayVolumeL.toFixed(2)),
      productMl: Number(productMl.toFixed(2)),
      productLiters: Number((productMl / 1000).toFixed(3)),
    },
    note: "Always follow product label and local extension guidance.",
  };
};

module.exports = { calculateTreatment };
