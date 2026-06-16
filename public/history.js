const historyList = document.getElementById("history-list");

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
      item.className = "history-item";
      item.innerHTML = `
        <strong>${scan.identified_as?.name || "Unknown"}</strong><br/>
        <span class="dropzone-hint">${new Date(scan.createdAt).toLocaleString()}</span><br/>
        <span class="dropzone-hint">Crop: ${scan.crop || "N/A"}</span><br/>
        <span class="dropzone-hint">Confidence: ${scan.identified_as?.confidence ?? "N/A"}%</span>
      `;
      historyList.appendChild(item);
    });
  } catch {
    historyList.innerHTML = `<div class="history-item">Could not load history.</div>`;
  }
};

refreshHistory();
