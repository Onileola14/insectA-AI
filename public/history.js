const historyList = document.getElementById("history-list");
const responseSection = document.getElementById("history-response");
const respName = document.getElementById("resp-name");
const respMeta = document.getElementById("resp-meta");
const respCrop = document.getElementById("resp-crop");
const respSource = document.getElementById("resp-source");
const respAlerts = document.getElementById("resp-alerts");
const respPredictions = document.getElementById("resp-predictions");
const respSymptoms = document.getElementById("resp-symptoms");
const respOrganic = document.getElementById("resp-organic");
const respChemical = document.getElementById("resp-chemical");
const respReportLink = document.getElementById("resp-report-link");

const renderList = (el, items, fallback = "N/A") => {
  el.innerHTML = "";
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    const li = document.createElement("li");
    li.textContent = fallback;
    el.appendChild(li);
    return;
  }
  safeItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
};

const showScanResponse = (scan) => {
  responseSection.classList.remove("hidden");
  respName.textContent = scan.identified_as?.name || "Unknown";
  respMeta.textContent = `${new Date(scan.createdAt).toLocaleString()} • Confidence: ${scan.identified_as?.confidence ?? "N/A"}%`;
  respCrop.textContent = `Crop: ${scan.crop || "N/A"}`;
  respSource.textContent = `Source: ${scan.identified_as?.source || "N/A"} (${scan.identified_as?.model || "N/A"})`;
  respAlerts.textContent = scan.seasonal_alerts?.length
    ? `Seasonal alerts: ${scan.seasonal_alerts.join(" | ")}`
    : "Seasonal alerts: None";

  const predictionLines = (scan.predictions || []).map(
    (p) => `${p.name} (${p.scientific_name || "N/A"}) - ${Number(p.confidence || 0).toFixed(1)}%`,
  );
  renderList(respPredictions, predictionLines);
  renderList(respSymptoms, scan.insect?.symptoms);
  renderList(respOrganic, scan.insect?.organic_control);
  renderList(respChemical, scan.insect?.chemical_control);
  respReportLink.href = `/api/v1/insect/report/${scan._id}`;
};

const refreshHistory = async () => {
  try {
    const res = await fetch("/api/v1/insect/history?limit=50");
    if (!res.ok) {
      historyList.innerHTML = `<div class="history-item">Could not load history.</div>`;
      return;
    }
    const data = await res.json();
    if (!data.scans?.length) {
      historyList.innerHTML = `<div class="history-item">No scans yet.</div>`;
      return;
    }

    historyList.innerHTML = "";
    data.scans.forEach((scan) => {
      const item = document.createElement("div");
      item.className = "history-item history-item-clickable";
      item.innerHTML = `
        <strong>${scan.identified_as?.name || "Unknown"}</strong><br/>
        <span class="dropzone-hint">${new Date(scan.createdAt).toLocaleString()}</span><br/>
        <span class="dropzone-hint">Crop: ${scan.crop || "N/A"}</span><br/>
        <span class="dropzone-hint">Confidence: ${scan.identified_as?.confidence ?? "N/A"}%</span>
      `;
      item.addEventListener("click", () => {
        document
          .querySelectorAll(".history-item-clickable")
          .forEach((el) => el.classList.remove("history-item-active"));
        item.classList.add("history-item-active");
        showScanResponse(scan);
      });
      historyList.appendChild(item);
    });
  } catch {
    historyList.innerHTML = `<div class="history-item">Could not load history.</div>`;
  }
};

refreshHistory();
