const storageKey = "eventify.events.v1";
const maxNameLength = 100;
const maxOrganizerLength = 80;

const form = document.querySelector("#event-form");
const nameInput = document.querySelector(".event-name");
const organizerInput = document.querySelector(".organizer");
const dateInput = document.querySelector(".event-date");
const eventsList = document.querySelector(".events");
const statusElement = document.querySelector(".status");

function setStatus(message, tone = "info") {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.dataset.tone = tone;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventTimestamp(dateValue) {
  const timestamp = new Date(`${dateValue}T00:00:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function readEvents() {
  try {
    const saved = localStorage.getItem(storageKey) ?? localStorage.getItem("events") ?? "[]";
    const stored = JSON.parse(saved);
    if (!Array.isArray(stored)) return [];
    return stored.filter((event) => (
      event &&
      typeof event.name === "string" &&
      typeof event.organizer === "string" &&
      typeof event.date === "string" &&
      Number.isFinite(event.timeStamp)
    ));
  } catch (error) {
    console.error("Unable to read saved events", error);
    setStatus("Saved events could not be read from this browser.", "error");
    return [];
  }
}

function saveEvents(events) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(events));
    return true;
  } catch (error) {
    console.error("Unable to save events", error);
    setStatus("The event could not be saved in this browser.", "error");
    return false;
  }
}

function formatTimeLeft(timestamp) {
  const remaining = timestamp - Date.now();
  if (remaining <= 0) return "Started";
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function appendLabelValue(parent, label, value) {
  const paragraph = document.createElement("p");
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const valueElement = document.createElement("span");
  valueElement.textContent = value;
  paragraph.append(labelElement, valueElement);
  parent.appendChild(paragraph);
}

function displayEvents() {
  if (!eventsList) return;
  const events = readEvents();
  eventsList.replaceChildren();
  eventsList.setAttribute("aria-busy", "false");

  if (events.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = "No events yet. Add your first event above.";
    eventsList.appendChild(emptyState);
    return;
  }

  events.forEach((event, index) => {
    const card = document.createElement("article");
    card.className = "event";
    const title = document.createElement("h3");
    title.textContent = event.name;
    card.appendChild(title);
    appendLabelValue(card, "Organizer", event.organizer);
    appendLabelValue(card, "Date", event.date);
    appendLabelValue(card, "Time left", formatTimeLeft(event.timeStamp));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-event";
    deleteButton.dataset.index = String(index);
    deleteButton.textContent = "Delete";
    card.appendChild(deleteButton);
    eventsList.appendChild(card);
  });
}

function addEvent(event) {
  event.preventDefault();
  const name = nameInput?.value.trim() || "";
  const organizer = organizerInput?.value.trim() || "";
  const date = dateInput?.value || "";
  const timestamp = eventTimestamp(date);
  const today = localDateString();

  if (!name || !organizer || !date) {
    setStatus("Please complete the event name, organizer, and date.", "error");
    return;
  }
  if (name.length > maxNameLength || organizer.length > maxOrganizerLength) {
    setStatus(`Event names must be at most ${maxNameLength} characters and organizers at most ${maxOrganizerLength}.`, "error");
    return;
  }
  if (date < today || timestamp === null) {
    setStatus("Choose today or a future date.", "error");
    dateInput?.focus();
    return;
  }

  const events = readEvents();
  events.push({ name, organizer, date, timeStamp: timestamp });
  if (!saveEvents(events)) return;

  form?.reset();
  if (dateInput) dateInput.min = today;
  setStatus("Event added successfully.", "success");
  displayEvents();
}

function deleteEvent(index) {
  const events = readEvents();
  if (!Number.isInteger(index) || index < 0 || index >= events.length) return;
  events.splice(index, 1);
  if (saveEvents(events)) {
    setStatus("Event deleted.", "success");
    displayEvents();
  }
}

function initialize() {
  if (dateInput) {
    dateInput.min = localDateString();
    dateInput.addEventListener("input", () => {
      if (dateInput.value < dateInput.min) dateInput.value = dateInput.min;
    });
  }
  form?.addEventListener("submit", addEvent);
  eventsList?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLButtonElement && target.matches(".delete-event")) {
      deleteEvent(Number(target.dataset.index));
    }
  });
  displayEvents();
  window.setInterval(displayEvents, 1_000);
}

window.addEventListener("DOMContentLoaded", initialize);
