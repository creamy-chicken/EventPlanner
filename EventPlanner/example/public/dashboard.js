const ACCESS_STORAGE_KEY = "eventPlannerUser";
const THEME_STORAGE_KEY = "eventPlannerTheme";
const AUTO_REFRESH_MS = 15000;

const accessGate = document.getElementById("accessGate");
const accessForm = document.getElementById("accessForm");
const accessPrompt = document.getElementById("accessPrompt");
const accessLabel = document.getElementById("accessLabel");
const accessInput = document.getElementById("accessInput");
const accessStatus = document.getElementById("accessStatus");
const accessSubmit = document.getElementById("accessSubmit");
const welcomeEl = document.getElementById("welcome");
const eventForm = document.getElementById("eventForm");
const titleInput = document.getElementById("titleInput");
const whenInput = document.getElementById("whenInput");
const whereInput = document.getElementById("whereInput");
const extraInfoInput = document.getElementById("extraInfoInput");
const availabilityFreeBtn = document.getElementById("availabilityFreeBtn");
const availabilityBusyBtn = document.getElementById("availabilityBusyBtn");
const statusMessage = document.getElementById("statusMessage");
const selectedEventEl = document.getElementById("selectedEvent");
const upcomingList = document.getElementById("upcomingList");
const pastList = document.getElementById("pastList");
const upcomingCount = document.getElementById("upcomingCount");
const pastCount = document.getElementById("pastCount");
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const recurringList = document.getElementById("recurringList");
const recurringForm = document.getElementById("recurringForm");
const recurringComposer = document.getElementById("recurringComposer");
const recurringTitleInput = document.getElementById("recurringTitleInput");
const recurringFrequencyInput = document.getElementById("recurringFrequencyInput");
const recurringDayField = document.getElementById("recurringDayField");
const recurringDayInput = document.getElementById("recurringDayInput");
const recurringTimeInput = document.getElementById("recurringTimeInput");
const recurringEndTimeField = document.getElementById("recurringEndTimeField");
const recurringEndTimeInput = document.getElementById("recurringEndTimeInput");
const recurringEndDateField = document.getElementById("recurringEndDateField");
const recurringEndDateInput = document.getElementById("recurringEndDateInput");
const recurringWhereInput = document.getElementById("recurringWhereInput");
const recurringExtraInfoInput = document.getElementById("recurringExtraInfoInput");
const recurringStatusMessage = document.getElementById("recurringStatusMessage");
const toggleRecurringEndTimeBtn = document.getElementById("toggleRecurringEndTimeBtn");
const toggleRecurringEndDateBtn = document.getElementById("toggleRecurringEndDateBtn");
const recurringAvailabilityFreeBtn = document.getElementById("recurringAvailabilityFreeBtn");
const recurringAvailabilityBusyBtn = document.getElementById("recurringAvailabilityBusyBtn");
const feedTab = document.getElementById("feedTab");
const calendarTab = document.getElementById("calendarTab");
const recurringTab = document.getElementById("recurringTab");
const feedView = document.getElementById("feedView");
const calendarView = document.getElementById("calendarView");
const recurringView = document.getElementById("recurringView");
const themeBtn = document.getElementById("themeBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = "";
let pendingName = "";
let accessStep = "name";
let events = [];
let recurringEvents = [];
let selectedEventId = null;
let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedAvailability = "free";
let selectedRecurringAvailability = "free";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseLocalDateTime(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const datePart = `${match[1]}-${match[2]}-${match[3]}`;
  const timePart = `${match[4]}:${match[5]}:${match[6] || "00"}`;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute, second);
}

function dayKeyFromLocalValue(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = parseLocalDateTime(value);
  if (!date) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWhen(value) {
  const date = parseLocalDateTime(value);
  if (!date) return value;

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatTime(value) {
  const date = parseLocalDateTime(value);
  if (!date) return value;

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

function monthLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function formatDateOnly(value) {
  if (!value) return "";
  const date = parseLocalDateTime(`${value}T00:00`);
  if (!date) return value;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function recurringOccursOnDate(event, date) {
  const frequency = String(event.frequency || "").toLowerCase();
  const weekday = date.getDay();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];
  const eventCreatedDate = new Date(event.createdAt);
  const createdDay = new Date(
    eventCreatedDate.getFullYear(),
    eventCreatedDate.getMonth(),
    eventCreatedDate.getDate()
  );
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (event.endDate && targetDay > parseLocalDateTime(`${event.endDate}T23:59`)) {
    return false;
  }

  if (targetDay < createdDay) {
    return false;
  }

  if (frequency === "daily") {
    return true;
  }

  if (frequency === "every weekday") {
    return weekday >= 1 && weekday <= 5;
  }

  if (frequency === "every weekend") {
    return weekday === 0 || weekday === 6;
  }

  if (frequency === "weekly") {
    return dayNames[weekday] === event.day;
  }

  if (frequency === "biweekly") {
    if (dayNames[weekday] !== event.day) {
      return false;
    }

    const diffDays = Math.floor((targetDay - createdDay) / 86400000);
    return diffDays >= 0 && Math.floor(diffDays / 7) % 2 === 0;
  }

  if (frequency === "monthly") {
    if (dayNames[weekday] !== event.day) {
      return false;
    }

    return targetDay.getDate() <= 7;
  }

  return false;
}

function isPastEvent(event) {
  const date = parseLocalDateTime(event.when);
  return date ? date.getTime() < Date.now() : false;
}

function sortNewestFirst(list) {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("theme-dark", nextTheme === "dark");
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  themeBtn.textContent = nextTheme === "dark" ? "Light mode" : "Dark mode";
}

function eventAccentStyle(event) {
  return event && event.color ? `style="border-left: 6px solid ${escapeHtml(event.color)};"` : "";
}

function availabilityLabel(value) {
  return String(value || "").toLowerCase() === "busy"
    ? "I am busy for this event"
    : "I am free this event";
}

function syncAvailabilityButtons() {
  availabilityFreeBtn.classList.toggle("is-active", selectedAvailability === "free");
  availabilityBusyBtn.classList.toggle("is-active", selectedAvailability === "busy");
}

function syncRecurringAvailabilityButtons() {
  recurringAvailabilityFreeBtn.classList.toggle("is-active", selectedRecurringAvailability === "free");
  recurringAvailabilityBusyBtn.classList.toggle("is-active", selectedRecurringAvailability === "busy");
}

function requiresRecurringDay(frequency) {
  return ["weekly", "biweekly", "monthly"].includes(String(frequency || "").toLowerCase());
}

function syncRecurringFormState() {
  const needsDay = requiresRecurringDay(recurringFrequencyInput.value);
  recurringDayField.classList.toggle("is-hidden", !needsDay);
  recurringDayInput.required = needsDay;
}

function setCurrentUser(username) {
  currentUser = username;
  localStorage.setItem(ACCESS_STORAGE_KEY, username);
  welcomeEl.textContent = username;
  accessGate.classList.add("is-hidden");
}

function resetAccessForm() {
  accessStep = "name";
  pendingName = "";
  accessPrompt.textContent =
    "Start with your name. Then answer your favorite-color question to enter the site.";
  accessLabel.textContent = "Your name";
  accessInput.value = "";
  accessStatus.textContent = "";
  accessSubmit.textContent = "Continue";
}

function openGate() {
  resetAccessForm();
  accessGate.classList.remove("is-hidden");
  welcomeEl.textContent = "Waiting for name";
}

function verifyStoredUser() {
  const storedName = localStorage.getItem(ACCESS_STORAGE_KEY);
  if (!storedName) {
    openGate();
    return;
  }

  currentUser = storedName;
  welcomeEl.textContent = storedName;
  accessGate.classList.add("is-hidden");
}

async function refreshAllData() {
  await Promise.all([loadEvents(), loadRecurringEvents()]);
}

function showView(view) {
  feedTab.classList.toggle("is-active", view === "feed");
  calendarTab.classList.toggle("is-active", view === "calendar");
  recurringTab.classList.toggle("is-active", view === "recurring");
  feedView.classList.toggle("is-hidden", view !== "feed");
  calendarView.classList.toggle("is-hidden", view !== "calendar");
  recurringView.classList.toggle("is-hidden", view !== "recurring");
  eventForm.closest(".composer-panel").classList.toggle("is-hidden", view === "recurring");
}

function selectEvent(eventId) {
  selectedEventId = eventId;
  renderAll();
}

function renderNavList(container, list) {
  if (!list.length) {
    container.innerHTML = '<p class="empty-copy">No events here yet.</p>';
    return;
  }

  container.innerHTML = list.map((event) => `
    <button
      class="event-nav-item${event.id === selectedEventId ? " is-selected" : ""}"
      type="button"
      data-event-id="${event.id}"
      ${eventAccentStyle(event)}
    >
      <span class="event-nav-title">${escapeHtml(event.title)}</span>
      <span class="event-nav-meta">${escapeHtml(formatWhen(event.when))}</span>
      <span class="event-nav-meta">${escapeHtml(event.where)}</span>
    </button>
  `).join("");
}

function renderSelectedEvent() {
  if (!events.length) {
    selectedEventEl.innerHTML = `
      <div class="empty-state">
        <p class="app-kicker">No event posts yet</p>
        <h2>Start with your first plan</h2>
        <p>Create an event above to populate the feed, calendar, and event menu.</p>
      </div>
    `;
    return;
  }

  const selected = events.find((event) => event.id === selectedEventId) || events[0];
  selectedEventId = selected.id;
  const canDelete = selected.createdBy === currentUser;
  const replies = (selected.replies || []).filter((reply) => reply.username);
  const rsvps = Object.entries(selected.rsvps || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const currentResponse = (selected.rsvps || {})[currentUser] || "";

  selectedEventEl.innerHTML = `
    <article class="event-detail" ${eventAccentStyle(selected)}>
      <div class="detail-meta">
        <span>Posted by ${escapeHtml(selected.createdBy)}</span>
        <span>${escapeHtml(new Date(selected.createdAt).toLocaleString())}</span>
      </div>

      ${
        canDelete
          ? `
            <div class="detail-actions">
              <button class="danger-btn" type="button" data-delete-event="${selected.id}">
                Delete event
              </button>
            </div>
          `
          : ""
      }

      <h2>${escapeHtml(selected.title)}</h2>

      <div class="detail-grid">
        <div class="detail-card">
          <h3>When</h3>
          <p>${escapeHtml(formatWhen(selected.when))}</p>
        </div>
        <div class="detail-card">
          <h3>Where</h3>
          <p>${escapeHtml(selected.where)}</p>
        </div>
      </div>

      <section class="info-block">
        <h3>Extra info</h3>
        <p>${escapeHtml(selected.extraInfo || "No extra info added yet.")}</p>
      </section>

      <section class="info-block">
        <h3>Planner status</h3>
        <p>${escapeHtml(availabilityLabel(selected.availability))}</p>
      </section>

      <aside class="info-block rsvp-block">
        <div class="section-head">
          <div>
            <p class="app-kicker">Attendance</p>
            <h3>Can you come?</h3>
          </div>
        </div>

        <div class="rsvp-actions">
          <button
            class="rsvp-btn${currentResponse === "yes" ? " is-active" : ""}"
            type="button"
            data-rsvp-event="${selected.id}"
            data-rsvp-response="yes"
          >
            Yes
          </button>
          <button
            class="rsvp-btn${currentResponse === "no" ? " is-active" : ""}"
            type="button"
            data-rsvp-event="${selected.id}"
            data-rsvp-response="no"
          >
            No
          </button>
        </div>

        <p class="status-message" data-rsvp-status="${selected.id}"></p>

        ${
          rsvps.length
            ? `
              <div class="rsvp-list">
                ${rsvps.map(([name, value]) => `
                  <div class="rsvp-item">
                    <span>${escapeHtml(name)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </div>
                `).join("")}
              </div>
            `
            : '<p class="empty-copy">No responses yet.</p>'
        }
      </aside>

      <section class="info-block replies-block">
        <div class="section-head">
          <div>
            <p class="app-kicker">Replies</p>
            <h3>Event thread</h3>
          </div>
        </div>
        <form class="reply-form" data-reply-form="${selected.id}">
          <label>
            <span>Add reply</span>
            <textarea
              name="replyBody"
              rows="4"
              placeholder="Post an update, answer questions, or add a note to this event."
              required
            ></textarea>
          </label>
          <div class="form-actions">
            <p class="status-message" data-reply-status="${selected.id}"></p>
            <button class="primary-btn" type="submit">Post reply</button>
          </div>
        </form>
        ${
          replies.length
            ? `<div class="reply-list">${replies.map((reply) => `
                <article class="reply-card">
                  <div class="reply-top">
                    <span>${escapeHtml(reply.username)}</span>
                    <span>${escapeHtml(new Date(reply.createdAt).toLocaleString())}</span>
                  </div>
                  <p>${escapeHtml(reply.body)}</p>
                </article>
              `).join("")}</div>`
            : '<p class="empty-copy">No replies in this thread yet.</p>'
        }
      </section>
    </article>
  `;
}

function renderCalendar() {
  calendarMonthLabel.textContent = monthLabel(displayedMonth);

  const grouped = events.reduce((acc, event) => {
    const key = dayKeyFromLocalValue(event.when);
    acc[key] = acc[key] || [];
    acc[key].push(event);
    return acc;
  }, {});

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const cells = [];

  for (let index = 0; index < startWeekday; index += 1) {
    cells.push('<div class="calendar-cell calendar-cell--blank"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const recurringMatches = recurringEvents
      .filter((event) => recurringOccursOnDate(event, new Date(year, month, day)))
      .map((event) => ({
        ...event,
        when: `${key}T${event.time}`,
        isRecurring: true
      }));
    const dayEvents = (grouped[key] || []).sort((a, b) => a.when.localeCompare(b.when));
    const mergedDayEvents = [...dayEvents, ...recurringMatches].sort((a, b) => a.when.localeCompare(b.when));
    const isToday = todayKey === key;

    cells.push(`
      <section class="calendar-cell${isToday ? " calendar-cell--today" : ""}">
        <div class="calendar-cell-head">
          <span class="calendar-date-number">${day}</span>
          <span class="calendar-event-count">${mergedDayEvents.length ? `${mergedDayEvents.length} planned` : ""}</span>
        </div>
        <div class="calendar-cell-events">
          ${
            mergedDayEvents.length
              ? mergedDayEvents.map((event) => `
                  <button
                    class="calendar-chip"
                    type="button"
                    ${event.isRecurring ? `data-recurring-event="${event.id}"` : `data-event-id="${event.id}"`}
                  >
                    <span class="calendar-chip-marker" style="background: ${escapeHtml(event.color || "#d9d9d9")}"></span>
                    <strong>${escapeHtml(event.title)}</strong>
                    <span>${escapeHtml(formatTime(event.when))}</span>
                    ${event.endTime ? `<span class="calendar-chip-note">Until ${escapeHtml(formatTime(`2026-01-01T${event.endTime}`))}</span>` : ""}
                    ${event.availability ? `<span class="calendar-chip-note">${escapeHtml(availabilityLabel(event.availability))}</span>` : ""}
                    ${event.isRecurring ? '<span class="calendar-chip-note">Recurring</span>' : ""}
                  </button>
                `).join("")
              : '<p class="calendar-empty">No events</p>'
          }
        </div>
      </section>
    `);
  }

  calendarGrid.innerHTML = cells.join("");
}

function renderRecurringEvents() {
  if (!recurringEvents.length) {
    recurringList.innerHTML = "";
    return;
  }

  recurringList.innerHTML = recurringEvents.map((event) => `
    <article class="recurring-card" ${eventAccentStyle(event)}>
      <div class="detail-meta">
        <span>Planned by ${escapeHtml(event.createdBy)}</span>
        <span>${escapeHtml(new Date(event.createdAt).toLocaleDateString())}</span>
      </div>
      <h3>${escapeHtml(event.title)}</h3>
      <div class="recurring-meta-grid">
        <div class="detail-card">
          <h3>Frequency</h3>
          <p>${escapeHtml(titleCase(event.frequency))}</p>
        </div>
        ${
          event.day
            ? `
              <div class="detail-card">
                <h3>Day</h3>
                <p>${escapeHtml(titleCase(event.day))}</p>
              </div>
            `
            : ""
        }
        <div class="detail-card">
          <h3>Time</h3>
          <p>
            ${escapeHtml(formatTime(`2026-01-01T${event.time}`))}
            ${event.endTime ? ` to ${escapeHtml(formatTime(`2026-01-01T${event.endTime}`))}` : ""}
          </p>
        </div>
        <div class="detail-card">
          <h3>Where</h3>
          <p>${escapeHtml(event.where)}</p>
        </div>
        <div class="detail-card">
          <h3>Planner status</h3>
          <p>${escapeHtml(availabilityLabel(event.availability))}</p>
        </div>
        ${
          event.endDate
            ? `
              <div class="detail-card">
                <h3>End date</h3>
                <p>${escapeHtml(formatDateOnly(event.endDate))}</p>
              </div>
            `
            : ""
        }
      </div>
      <section class="info-block">
        <h3>Extra info</h3>
        <p>${escapeHtml(event.extraInfo || "No extra info added yet.")}</p>
      </section>
      ${
        event.createdBy === currentUser
          ? `
            <div class="detail-actions">
              <button
                class="danger-btn"
                type="button"
                data-delete-recurring-event="${event.id}"
              >
                Delete recurring event
              </button>
            </div>
          `
          : ""
      }
    </article>
  `).join("");
}

function renderAll() {
  const sortedEvents = sortNewestFirst(events);
  const upcoming = sortedEvents.filter((event) => !isPastEvent(event));
  const past = sortedEvents.filter((event) => isPastEvent(event));

  upcomingCount.textContent = String(upcoming.length);
  pastCount.textContent = String(past.length);

  renderNavList(upcomingList, upcoming);
  renderNavList(pastList, past);
  renderSelectedEvent();
  renderCalendar();
  renderRecurringEvents();
}

async function loadEvents() {
  const res = await fetch("/events");
  if (!res.ok) {
    statusMessage.textContent = "Could not load events.";
    return;
  }

  const data = await res.json();
  events = data.events || [];
  if (!selectedEventId && events.length) {
    selectedEventId = events[0].id;
  }
  if (events.length) {
    const firstEventDate = parseLocalDateTime(events[0].when);
    if (firstEventDate) {
      displayedMonth = new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1);
    }
  }
  renderAll();
}

async function loadRecurringEvents() {
  const res = await fetch("/recurring-events");
  if (!res.ok) {
    recurringStatusMessage.textContent = "Could not load recurring plans.";
    return;
  }

  const data = await res.json();
  recurringEvents = data.recurringEvents || [];
  renderRecurringEvents();
}

feedTab.addEventListener("click", () => showView("feed"));
calendarTab.addEventListener("click", () => showView("calendar"));
recurringTab.addEventListener("click", () => showView("recurring"));
recurringFrequencyInput.addEventListener("change", syncRecurringFormState);

prevMonthBtn.addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
  renderCalendar();
});

toggleRecurringEndTimeBtn.addEventListener("click", () => {
  const isHidden = recurringEndTimeField.classList.toggle("is-hidden");
  toggleRecurringEndTimeBtn.textContent = isHidden ? "Add end time" : "Remove end time";
  if (isHidden) {
    recurringEndTimeInput.value = "";
  }
});

toggleRecurringEndDateBtn.addEventListener("click", () => {
  const isHidden = recurringEndDateField.classList.toggle("is-hidden");
  toggleRecurringEndDateBtn.textContent = isHidden ? "Add end date" : "Remove end date";
  if (isHidden) {
    recurringEndDateInput.value = "";
  }
});

recurringAvailabilityFreeBtn.addEventListener("click", () => {
  selectedRecurringAvailability = "free";
  syncRecurringAvailabilityButtons();
});

recurringAvailabilityBusyBtn.addEventListener("click", () => {
  selectedRecurringAvailability = "busy";
  syncRecurringAvailabilityButtons();
});

themeBtn.addEventListener("click", () => {
  const currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  currentUser = "";
  openGate();
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    statusMessage.textContent = "Enter your name first.";
    openGate();
    return;
  }

  statusMessage.textContent = "Posting event...";

  const res = await fetch("/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: titleInput.value.trim(),
      when: whenInput.value,
      where: whereInput.value.trim(),
      extraInfo: extraInfoInput.value.trim(),
      availability: selectedAvailability,
      username: currentUser
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not post event." }));
    statusMessage.textContent = error.error || "Could not post event.";
    return;
  }

  const data = await res.json();
  events = [data.event, ...events];
  selectedEventId = data.event.id;
  eventForm.reset();
  selectedAvailability = "free";
  syncAvailabilityButtons();
  statusMessage.textContent = "Event posted.";
  renderAll();
});

availabilityFreeBtn.addEventListener("click", () => {
  selectedAvailability = "free";
  syncAvailabilityButtons();
});

availabilityBusyBtn.addEventListener("click", () => {
  selectedAvailability = "busy";
  syncAvailabilityButtons();
});

recurringForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    recurringStatusMessage.textContent = "Enter your name first.";
    openGate();
    return;
  }

  recurringStatusMessage.textContent = "Saving recurring plan...";

  const res = await fetch("/recurring-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: recurringTitleInput.value.trim(),
      frequency: recurringFrequencyInput.value,
      day: requiresRecurringDay(recurringFrequencyInput.value) ? recurringDayInput.value : "",
      time: recurringTimeInput.value,
      endTime: recurringEndTimeField.classList.contains("is-hidden")
        ? ""
        : recurringEndTimeInput.value,
      endDate: recurringEndDateField.classList.contains("is-hidden")
        ? ""
        : recurringEndDateInput.value,
      where: recurringWhereInput.value.trim(),
      extraInfo: recurringExtraInfoInput.value.trim(),
      availability: selectedRecurringAvailability,
      username: currentUser
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not save recurring plan." }));
    recurringStatusMessage.textContent = error.error || "Could not save recurring plan.";
    return;
  }

  const data = await res.json();
  recurringEvents = [data.recurringEvent, ...recurringEvents];
  recurringForm.reset();
  recurringStatusMessage.textContent = "Recurring plan saved.";
  recurringEndTimeField.classList.add("is-hidden");
  toggleRecurringEndTimeBtn.textContent = "Add end time";
  recurringEndDateField.classList.add("is-hidden");
  toggleRecurringEndDateBtn.textContent = "Add end date";
  selectedRecurringAvailability = "free";
  syncRecurringAvailabilityButtons();
  syncRecurringFormState();
  renderRecurringEvents();
});

document.addEventListener("click", (event) => {
  const deleteTrigger = event.target.closest("[data-delete-event]");
  if (deleteTrigger) {
    deleteEvent(Number(deleteTrigger.getAttribute("data-delete-event")));
    return;
  }

  const deleteRecurringTrigger = event.target.closest("[data-delete-recurring-event]");
  if (deleteRecurringTrigger) {
    deleteRecurringEvent(Number(deleteRecurringTrigger.getAttribute("data-delete-recurring-event")));
    return;
  }

  const rsvpTrigger = event.target.closest("[data-rsvp-event]");
  if (rsvpTrigger) {
    submitRsvp(
      Number(rsvpTrigger.getAttribute("data-rsvp-event")),
      rsvpTrigger.getAttribute("data-rsvp-response")
    );
    return;
  }

  const recurringTrigger = event.target.closest("[data-recurring-event]");
  if (recurringTrigger) {
    showView("recurring");
    return;
  }

  const trigger = event.target.closest("[data-event-id]");
  if (!trigger) {
    return;
  }

  selectEvent(Number(trigger.getAttribute("data-event-id")));
  showView("feed");
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-reply-form]");
  if (!form) {
    return;
  }

  event.preventDefault();

  const eventId = Number(form.getAttribute("data-reply-form"));
  const textarea = form.querySelector('textarea[name="replyBody"]');
  const replyStatus = form.querySelector("[data-reply-status]");
  const body = textarea.value.trim();

  if (!body) {
    replyStatus.textContent = "Reply text is required.";
    return;
  }

  replyStatus.textContent = "Posting reply...";

  const res = await fetch(`/events/${eventId}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      body,
      username: currentUser
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not post reply." }));
    replyStatus.textContent = error.error || "Could not post reply.";
    return;
  }

  const data = await res.json();
  events = events.map((existingEvent) =>
    existingEvent.id === data.event.id ? data.event : existingEvent
  );
  renderAll();
});

async function deleteEvent(eventId) {
  if (!currentUser) {
    openGate();
    return;
  }

  if (!window.confirm("Delete this event?")) {
    return;
  }

  const res = await fetch(`/events/${eventId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username: currentUser })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not delete event." }));
    statusMessage.textContent = error.error || "Could not delete event.";
    return;
  }

  events = events.filter((event) => event.id !== eventId);
  selectedEventId = events.length ? events[0].id : null;
  statusMessage.textContent = "Event deleted.";
  renderAll();
}

async function deleteRecurringEvent(eventId) {
  if (!currentUser) {
    openGate();
    return;
  }

  if (!window.confirm("Delete this recurring event?")) {
    return;
  }

  const res = await fetch(`/recurring-events/${eventId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username: currentUser })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not delete recurring event." }));
    recurringStatusMessage.textContent = error.error || "Could not delete recurring event.";
    return;
  }

  recurringEvents = recurringEvents.filter((event) => event.id !== eventId);
  recurringStatusMessage.textContent = "Recurring event deleted.";
  renderRecurringEvents();
}

async function submitRsvp(eventId, response) {
  if (!currentUser) {
    openGate();
    return;
  }

  const status = document.querySelector(`[data-rsvp-status="${eventId}"]`);
  if (status) {
    status.textContent = "Saving response...";
  }

  const res = await fetch(`/events/${eventId}/rsvp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: currentUser,
      response
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not save response." }));
    if (status) {
      status.textContent = error.error || "Could not save response.";
    }
    return;
  }

  const data = await res.json();
  events = events.map((existingEvent) =>
    existingEvent.id === data.event.id ? data.event : existingEvent
  );
  renderAll();
}

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  accessStatus.textContent = "";

  if (accessStep === "name") {
    const name = accessInput.value.trim();
    if (!name) {
      accessStatus.textContent = "Enter your name.";
      return;
    }

    accessStatus.textContent = "Checking question...";

    const res = await fetch(`/access-question?name=${encodeURIComponent(name)}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Could not find that name." }));
      accessStatus.textContent = error.error || "Could not find that name.";
      return;
    }

    const data = await res.json();
    pendingName = name;
    accessStep = "answer";
    accessPrompt.textContent = data.question;
    accessLabel.textContent = "Answer";
    accessInput.value = "";
    accessSubmit.textContent = "Enter site";
    return;
  }

  const answer = accessInput.value.trim();
  if (!answer) {
    accessStatus.textContent = "Enter the answer.";
    return;
  }

  accessStatus.textContent = "Verifying...";

  const res = await fetch("/verify-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: pendingName,
      answer
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Verification failed." }));
    accessStatus.textContent = error.error || "Verification failed.";
    return;
  }

  const data = await res.json();
  setCurrentUser(data.username);
});

verifyStoredUser();
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "light");
syncRecurringFormState();
syncAvailabilityButtons();
syncRecurringAvailabilityButtons();
refreshAllData();
window.setInterval(refreshAllData, AUTO_REFRESH_MS);
