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
const yearInput = document.querySelector("#event-year");
const monthInput = document.querySelector("#event-month");
const titleInput = document.querySelector("#event-title");
const descriptionInput = document.querySelector("#event-description");
const saveButton = document.querySelector("#save-button span:last-child");
const cancelEditButton = document.querySelector("#cancel-edit");
const timeline = document.querySelector("#timeline");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#timeline-item-template");
const exportButton = document.querySelector("#export-button");
const clearButton = document.querySelector("#clear-button");

const MONTH_NAMES = {
  "01": "enero",
  "02": "febrero",
  "03": "marzo",
  "04": "abril",
  "05": "mayo",
  "06": "junio",
  "07": "julio",
  "08": "agosto",
  "09": "septiembre",
  "10": "octubre",
  "11": "noviembre",
  "12": "diciembre",
};

let profile = loadProfile();
let events = loadEvents();

function todayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return String(new Date().getMonth() + 1).padStart(2, "0");
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

    return parsed.map(normalizeEvent).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeEvent(event) {
  if (!event || !event.id || !event.title || !event.description) return null;

  let year = event.year ? String(event.year) : "";
  let month = event.month ? String(event.month).padStart(2, "0") : "";

  if (!year && event.date) {
    const [legacyYear, legacyMonth] = String(event.date).split("-");
    year = legacyYear || "";
    month = legacyMonth || "";
  }

  if (!/^\d{4}$/.test(year)) return null;
  if (month && !MONTH_NAMES[month]) month = "";

  return {
    id: event.id,
    year,
    month,
    title: event.title,
    description: event.description,
    updatedAt: event.updatedAt || new Date().toISOString(),
  };
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
  return [...items].sort((first, second) => getSortKey(first).localeCompare(getSortKey(second)));
}

function getSortKey(event) {
  if (event.date) return event.date;

  return `${event.year}-${event.month || "00"}`;
}

function getMachineDate(event) {
  if (event.date) return event.date;

  return event.month ? `${event.year}-${event.month}` : event.year;
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

function formatEventDate(event) {
  if (event.date) return formatDate(event.date);
  if (event.month) return `${MONTH_NAMES[event.month]} de ${event.year}`;

  return event.year;
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
    item.querySelector("time").dateTime = getMachineDate(event);
    item.querySelector("time").textContent = formatEventDate(event);
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
  yearInput.min = profile.birthDate ? profile.birthDate.slice(0, 4) : "1900";
  yearInput.max = String(currentYear());
}

function openEventDialog() {
  resetForm();
  if (!eventDialog.open) eventDialog.showModal();
  yearInput.focus();
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
    year: yearInput.value,
    month: monthInput.value,
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    updatedAt: new Date().toISOString(),
  };
}

function isEventDateInRange(event) {
  const year = Number(event.year);
  const minYear = profile.birthDate ? Number(profile.birthDate.slice(0, 4)) : 1900;
  const maxYear = currentYear();

  if (year < minYear || year > maxYear) return false;
  if (!event.month) return true;
  if (profile.birthDate && event.year === profile.birthDate.slice(0, 4) && event.month < profile.birthDate.slice(5, 7)) {
    return false;
  }

  return !(year === maxYear && event.month > currentMonth());
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
  yearInput.value = event.year;
  monthInput.value = event.month || "";
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
      exportedAt: new Date().toISOString(),
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
  if (!nextEvent.year || !nextEvent.title || !nextEvent.description) return;
  if (!isEventDateInRange(nextEvent)) {
    window.alert("El acontecimiento tiene que estar entre tu nacimiento y la actualidad.");
    return;
  }

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
yearInput.max = String(currentYear());
renderTimeline();

if (!profile.birthDate) {
  openBirthDialog();
}
