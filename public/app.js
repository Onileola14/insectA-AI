const API_URL = "/api/v1/insect/upload";
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 1024 * 1024;
const SKIP_COMPRESS_BELOW = 500 * 1024;

const $ = (id) => document.getElementById(id);

const dropzone = $("dropzone");
const fileInput = $("file-input");
const cropInput = $("crop-input");
const previewImg = $("preview-img");
const dropzoneEmpty = $("dropzone-empty");
const identifyBtn = $("identify-btn");
const clearBtn = $("clear-btn");
const statusEl = $("status");
const resultsEl = $("results");
const shareBtn = $("share-btn");
const downloadReportBtn = $("download-report-btn");
const seasonalAlertsEl = $("seasonal-alerts");
const predictionsCard = $("predictions-card");
const predictionsList = $("list-predictions");

let selectedFile = null;
let previewUrl = null;
let latestReportText = "";
let latestScanId = null;

const showStatus = (text, type = "loading") => {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove("hidden");
};

const hideStatus = () => statusEl.classList.add("hidden");

const loadImageSource = async (file) => {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, cleanup: () => bitmap.close?.() };
  }

  const url = URL.createObjectURL(file);
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = url;
  });

  return {
    source: img,
    cleanup: () => URL.revokeObjectURL(url),
  };
};

const compressImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  if (file.size <= SKIP_COMPRESS_BELOW) {
    return file;
  }

  const { source, cleanup } = await loadImageSource(file);
  const srcWidth = source.width;
  const srcHeight = source.height;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(srcWidth, srcHeight));
  const width = Math.round(srcWidth * scale);
  const height = Math.round(srcHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(source, 0, 0, width, height);
  cleanup();

  let quality = JPEG_QUALITY;
  let blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );

  while (blob && blob.size > MAX_BYTES && quality > 0.5) {
    quality -= 0.1;
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
  }

  canvas.width = 0;
  canvas.height = 0;

  if (!blob) {
    throw new Error("Could not process image");
  }

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
};

const setPreview = (file) => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  selectedFile = file;
  previewUrl = URL.createObjectURL(file);
  previewImg.src = previewUrl;
  previewImg.classList.remove("hidden");
  dropzoneEmpty.classList.add("hidden");
  identifyBtn.disabled = false;
  clearBtn.classList.remove("hidden");
  resultsEl.classList.add("hidden");
  hideStatus();
};

const clearPreview = () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  selectedFile = null;
  previewUrl = null;
  previewImg.src = "";
  previewImg.classList.add("hidden");
  dropzoneEmpty.classList.remove("hidden");
  identifyBtn.disabled = true;
  clearBtn.classList.add("hidden");
  fileInput.value = "";
  cropInput.value = "";
  resultsEl.classList.add("hidden");
  $("result-image").src = "";
  $("result-name").textContent = "—";
  $("result-scientific").textContent = "";
  $("result-source").textContent = "";
  $("result-confidence").textContent = "";
  $("result-note").textContent = "";
  $("result-note").classList.add("hidden");
  seasonalAlertsEl.textContent = "";
  seasonalAlertsEl.classList.add("hidden");
  predictionsList.innerHTML = "";
  predictionsCard.classList.add("hidden");
  $("list-affects").innerHTML = "";
  $("list-hosts").innerHTML = "";
  $("list-symptoms").innerHTML = "";
  $("list-organic").innerHTML = "";
  $("list-chemical").innerHTML = "";
  $("text-description").textContent = "";
  showCard("card-affects", false);
  showCard("card-hosts", false);
  showCard("card-symptoms", false);
  showCard("card-organic", false);
  showCard("card-chemical", false);
  showCard("card-description", false);
  downloadReportBtn.classList.add("hidden");
  shareBtn.classList.add("hidden");
  latestScanId = null;
  latestReportText = "";
  hideStatus();
};

const handleFile = async (file) => {
  if (!file?.type.startsWith("image/")) return;

  identifyBtn.disabled = true;
  showStatus("Preparing image…", "loading");

  try {
    const compressed = await compressImage(file);
    setPreview(compressed);
  } catch (err) {
    showStatus(err.message || "Could not process image", "error");
    identifyBtn.disabled = true;
  }
};

const renderList = (el, items) => {
  el.innerHTML = "";
  if (!items?.length) return false;
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
  return true;
};

const showCard = (cardId, hasContent) => {
  const card = $(cardId);
  if (hasContent) card.classList.remove("hidden");
  else card.classList.add("hidden");
};

const showResults = (data, localPreview) => {
  const { identified_as: ai, details, note, seasonal_alerts, predictions, scan_id } = data;

  $("result-image").src = data.image || localPreview;
  $("result-name").textContent = ai?.name || "Unknown";
  $("result-scientific").textContent = ai?.scientific_name
    ? ai.scientific_name
    : "";
  $("result-source").textContent = ai?.source
    ? `via ${ai.source}`
    : "AI identification";
  $("result-confidence").textContent =
    ai?.confidence != null ? `Confidence: ${Number(ai.confidence).toFixed(1)}%` : "";
  latestScanId = scan_id || null;

  if (latestScanId) {
    downloadReportBtn.href = `/api/v1/insect/report/${latestScanId}`;
    downloadReportBtn.classList.remove("hidden");
    shareBtn.classList.remove("hidden");
  }

  const noteEl = $("result-note");
  if (note) {
    noteEl.textContent = note;
    noteEl.classList.remove("hidden");
  } else {
    noteEl.classList.add("hidden");
  }

  if (seasonal_alerts?.length) {
    seasonalAlertsEl.textContent = `Seasonal alerts: ${seasonal_alerts.join(" | ")}`;
    seasonalAlertsEl.classList.remove("hidden");
  } else {
    seasonalAlertsEl.classList.add("hidden");
  }

  predictionsList.innerHTML = "";
  if (predictions?.length) {
    predictions.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.name} (${item.scientific_name || "N/A"}) - ${Number(item.confidence || 0).toFixed(1)}%`;
      predictionsList.appendChild(li);
    });
    predictionsCard.classList.remove("hidden");
  } else {
    predictionsCard.classList.add("hidden");
  }

  const grid = $("details-grid");
  if (!details) {
    grid.classList.add("hidden");
  } else {
    grid.classList.remove("hidden");
    showCard("card-affects", renderList($("list-affects"), details.affects));
    showCard("card-hosts", renderList($("list-hosts"), details.host_plants));
    showCard(
      "card-symptoms",
      renderList($("list-symptoms"), details.symptoms),
    );
    showCard(
      "card-organic",
      renderList($("list-organic"), details.organic_control),
    );
    showCard(
      "card-chemical",
      renderList($("list-chemical"), details.chemical_control),
    );
    const desc = details.description?.trim();
    $("text-description").textContent = desc || "";
    showCard("card-description", Boolean(desc));
  }

  resultsEl.classList.remove("hidden");
};

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) handleFile(file);
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file) handleFile(file);
});

clearBtn.addEventListener("click", clearPreview);

identifyBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  identifyBtn.disabled = true;
  showStatus("Analyzing image with AI…", "loading");

  const form = new FormData();
  form.append("image", selectedFile);
  if (cropInput.value.trim()) form.append("crop", cropInput.value.trim());

  try {
    const res = await fetch(API_URL, { method: "POST", body: form });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Identification failed");
    }

    hideStatus();
    showResults(data, previewUrl);
  } catch (err) {
    showStatus(err.message || "Something went wrong", "error");
  } finally {
    identifyBtn.disabled = false;
  }
});

shareBtn.addEventListener("click", async () => {
  if (!latestScanId) return;
  try {
    const res = await fetch(`/api/v1/insect/report/${latestScanId}`);
    latestReportText = await res.text();
    if (navigator.share) {
      await navigator.share({
        title: "Insect AI Report",
        text: latestReportText,
      });
    } else {
      await navigator.clipboard.writeText(latestReportText);
      showStatus("Report copied to clipboard", "loading");
    }
  } catch (err) {
    showStatus("Unable to share report", "error");
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(() => null);
}
