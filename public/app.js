const API_URL = "/api/v1/insect/upload";

const $ = (id) => document.getElementById(id);

const dropzone = $("dropzone");
const fileInput = $("file-input");
const previewImg = $("preview-img");
const dropzoneEmpty = $("dropzone-empty");
const identifyBtn = $("identify-btn");
const clearBtn = $("clear-btn");
const statusEl = $("status");
const resultsEl = $("results");

let selectedFile = null;
let previewUrl = null;

const showStatus = (text, type = "loading") => {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove("hidden");
};

const hideStatus = () => statusEl.classList.add("hidden");

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
  resultsEl.classList.add("hidden");
  hideStatus();
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
  const { identified_as: ai, details, note } = data;

  $("result-image").src = data.image || localPreview;
  $("result-name").textContent = ai?.name || "Unknown";
  $("result-scientific").textContent = ai?.scientific_name
    ? ai.scientific_name
    : "";
  $("result-source").textContent = ai?.source
    ? `via ${ai.source}`
    : "AI identification";

  const noteEl = $("result-note");
  if (note) {
    noteEl.textContent = note;
    noteEl.classList.remove("hidden");
  } else {
    noteEl.classList.add("hidden");
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
  if (file) setPreview(file);
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
  if (file?.type.startsWith("image/")) setPreview(file);
});

clearBtn.addEventListener("click", clearPreview);

identifyBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  identifyBtn.disabled = true;
  showStatus("Analyzing image with AI…", "loading");

  const form = new FormData();
  form.append("image", selectedFile);

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
