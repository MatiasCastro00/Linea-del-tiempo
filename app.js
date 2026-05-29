const STORAGE_KEY = "personalTimelineEvents.v1";
const PROFILE_KEY = "personalTimelineProfile.v1";

const birthSummary = document.querySelector("#birth-summary");
const birthDialog = document.querySelector("#birth-dialog");
const birthForm = document.querySelector("#birth-form");
const birthDateInput = document.querySelector("#birth-date");
const changeBirthButton = document.querySelector("#change-birth-button");
const eventDialog = document.querySelector("#event-dialog");
const eventDialogTitle = document.querySelector("#event-dialog-title");
const openEventDialogButton = document.querySelector("#open-event-dialog");
const closeEventDialogButton = document.querySelector("#close-event-dialog");
const form = document.querySelector("#event-form");
const idInput = document.querySelector("#event-id");
const dateInput = document.querySelector("#event-date");
const titleInput = document.querySelector("#event-title");
const descriptionInput = document.querySelector("#event-description");
const saveButton = document.querySelector("#save-button span:last-child");
const cancelEditButton = document.querySelector("#cancel-edit");
const timeline = document.querySelector("#timeline");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#timeline-item-template");
const exportButton = document.querySelector("#export-button");
const clearButton = document.querySelector("#clear-button");

let profile = loadProfile();
let events = loadEvents();

function todayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadProfile() {
  try {
    const rawProfile = localStorage.getItem(PROFILE_KEY);
    if (!rawProfile) return { birthDate: "" };

    const parsed = JSON.parse(rawProfile);
    return { birthDate: parsed.birthDate || "" };
  } catch {
    return { birthDate: "" };
  }
}

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    window.alert("No se pudo guardar en este navegador. Proba abrir la pagina en Chrome, Edge o Firefox.");
    return false;
  }
}

function loadEvents() {
  try {
    const rawEvents = localStorage.getItem(STORAGE_KEY);
    if (!rawEvents) return [];

    const parsed = JSON.parse(rawEvents);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((event) => event.id && event.date && event.title && event.description);
  } catch {
    return [];
  }
}

function saveEvents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch {
    window.alert("No se pudo guardar en este navegador. Proba abrir la pagina en Chrome, Edge o Firefox.");
    return false;
  }
}

function sortEvents(items) {
  return [...items].sort((first, second) => first.date.localeCompare(second.date));
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildTimelineItems() {
  const items = [];

  if (profile.birthDate) {
    items.push({
      id: "birth-marker",
      date: profile.birthDate,
      title: "Nacimiento",
      description: "Inicio de la linea del tiempo.",
      marker: true,
    });
  }

  sortEvents(events).forEach((event) => items.push(event));

  if (profile.birthDate) {
    items.push({
      id: "today-marker",
      date: todayIso(),
      title: "Actualidad",
      description: "Punto actual de la linea del tiempo.",
      marker: true,
    });
  }

  return items;
}

function renderTimeline() {
  timeline.textContent = "";
  const items = buildTimelineItems();

  timeline.hidden = items.length === 0;
  emptyState.hidden = events.length > 0;
  birthSummary.textContent = profile.birthDate ? formatDate(profile.birthDate) : "Fecha de nacimiento pendiente";

  items.forEach((event) => {
    const item = template.content.firstElementChild.cloneNode(true);

    item.dataset.id = event.id;
    item.classList.toggle("marker", Boolean(event.marker));
    item.querySelector("time").dateTime = event.date;
    item.querySelector("time").textContent = formatDate(event.date);
    item.querySelector("h3").textContent = event.title;
    item.querySelector("p").textContent = event.description;

    const editButton = item.querySelector(".edit-button");
    const deleteButton = item.querySelector(".delete-button");
    editButton.addEventListener("click", () => startEditing(event.id));
    deleteButton.addEventListener("click", () => deleteEvent(event.id));

    timeline.append(item);
  });
}

function resetForm() {
  form.reset();
  idInput.value = "";
  eventDialogTitle.textContent = "Agregar recuerdo";
  saveButton.textContent = "Agregar acontecimiento";
  cancelEditButton.hidden = true;
  dateInput.min = profile.birthDate || "";
  dateInput.max = todayIso();
}

function openEventDialog() {
  resetForm();
  if (!eventDialog.open) eventDialog.showModal();
  dateInput.focus();
}

function closeEventDialog() {
  if (eventDialog.open) eventDialog.close();
  resetForm();
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEventFromForm() {
  return {
    id: idInput.value || createId(),
    date: dateInput.value,
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
}

function upsertEvent(event) {
  const existingIndex = events.findIndex((item) => item.id === event.id);

  if (existingIndex >= 0) {
    events[existingIndex] = event;
  } else {
    events.push(event);
  }

  if (saveEvents()) {
    renderTimeline();
  }
}

function startEditing(id) {
  const event = events.find((item) => item.id === id);
  if (!event) return;

  resetForm();
  idInput.value = event.id;
  dateInput.value = event.date;
  titleInput.value = event.title;
  descriptionInput.value = event.description;
  eventDialogTitle.textContent = "Editar recuerdo";
  saveButton.textContent = "Guardar cambios";
  cancelEditButton.hidden = false;
  if (!eventDialog.open) eventDialog.showModal();
  titleInput.focus();
}

function deleteEvent(id) {
  const event = events.find((item) => item.id === id);
  if (!event) return;

  const shouldDelete = window.confirm(`Eliminar "${event.title}" de la linea del tiempo?`);
  if (!shouldDelete) return;

  events = events.filter((item) => item.id !== id);
  if (saveEvents()) {
    renderTimeline();
    if (idInput.value === id) closeEventDialog();
  }
}

function exportEvents() {
  const content = JSON.stringify(
    {
      birthDate: profile.birthDate,
      events: sortEvents(events),
    },
    null,
    2,
  );
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "linea-del-tiempo.json";
  link.click();
  URL.revokeObjectURL(url);
}

function openBirthDialog() {
  birthDateInput.value = profile.birthDate || "";
  birthDateInput.max = todayIso();
  if (!birthDialog.open) birthDialog.showModal();
  birthDateInput.focus();
}

birthForm.addEventListener("submit", (event) => {
  event.preventDefault();

  profile = { birthDate: birthDateInput.value };
  if (!profile.birthDate) return;

  if (saveProfile()) {
    if (birthDialog.open) birthDialog.close();
    resetForm();
    renderTimeline();
  }
});

birthDialog.addEventListener("cancel", (event) => {
  if (!profile.birthDate) event.preventDefault();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const nextEvent = createEventFromForm();
  if (!nextEvent.title || !nextEvent.description) return;

  upsertEvent(nextEvent);
  closeEventDialog();
});

openEventDialogButton.addEventListener("click", openEventDialog);
closeEventDialogButton.addEventListener("click", closeEventDialog);
cancelEditButton.addEventListener("click", closeEventDialog);
changeBirthButton.addEventListener("click", openBirthDialog);
exportButton.addEventListener("click", exportEvents);

clearButton.addEventListener("click", () => {
  if (events.length === 0) return;

  const shouldClear = window.confirm("Borrar todos los acontecimientos guardados en este dispositivo?");
  if (!shouldClear) return;

  events = [];
  if (saveEvents()) {
    renderTimeline();
    closeEventDialog();
  }
});

birthDateInput.max = todayIso();
dateInput.max = todayIso();
renderTimeline();

if (!profile.birthDate) {
  openBirthDialog();
}
