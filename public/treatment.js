const areaInput = document.getElementById("area-input");
const unitInput = document.getElementById("unit-input");
const calcBtn = document.getElementById("calc-btn");
const calcResult = document.getElementById("calc-result");

calcBtn.addEventListener("click", async () => {
  const area = Number(areaInput.value);
  if (!area) {
    calcResult.textContent = "Enter area first.";
    return;
  }

  const params = new URLSearchParams({
    area: String(area),
    unit: unitInput.value,
  });

  try {
    const res = await fetch(`/api/v1/insect/treatment/calculate?${params.toString()}`);
    const data = await res.json();
    calcResult.textContent = `Spray volume: ${data.totals.sprayVolumeL}L, Product: ${data.totals.productMl}ml (${data.totals.productLiters}L).`;
  } catch {
    calcResult.textContent = "Could not calculate treatment now.";
  }
});
