const ACCESS_STORAGE_KEY = "eventPlannerUser";
const THEME_STORAGE_KEY = "eventPlannerTheme";
const FOLDERS_STORAGE_KEY = "eventPlannerFolders";
const CALENDAR_REFRESH_MS = 15000;
const FREE_EVENT_COLOR = "#2f7d66";
const BUSY_EVENT_COLOR = "#b33a3a";

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
const freeEventPageBtn = document.getElementById("freeEventPageBtn");
const busyEventPageBtn = document.getElementById("busyEventPageBtn");
const eventComposerTitle = document.getElementById("eventComposerTitle");
const statusMessage = document.getElementById("statusMessage");
const selectedEventEl = document.getElementById("selectedEvent");
const upcomingList = document.getElementById("upcomingList");
const personalList = document.getElementById("personalList");
const pastList = document.getElementById("pastList");
const folderForm = document.getElementById("folderForm");
const folderNameInput = document.getElementById("folderNameInput");
const folderList = document.getElementById("folderList");
const upcomingCount = document.getElementById("upcomingCount");
const personalCount = document.getElementById("personalCount");
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
const freeRecurringPageBtn = document.getElementById("freeRecurringPageBtn");
const busyRecurringPageBtn = document.getElementById("busyRecurringPageBtn");
const recurringComposerTitle = document.getElementById("recurringComposerTitle");
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
let selectedAvailability = document.body.dataset.eventAvailability || "free";
let selectedRecurringAvailability = document.body.dataset.recurringAvailability || "free";
let calendarRefreshId = null;
let editingEventId = null;
let editingRecurringEventId = null;
let draggedEventId = null;
const initialView = document.body.dataset.initialView || "feed";
let foldersState = loadFoldersState();

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
  if (!date) {
    return false;
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return eventDay.getTime() < startOfToday.getTime();
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

function eventAccentColor(event) {
  return String(event?.availability || "").toLowerCase() === "busy"
    ? BUSY_EVENT_COLOR
    : FREE_EVENT_COLOR;
}

function calendarChipColor(event) {
  return eventAccentColor(event);
}

function calendarChipNote(event) {
  return String(event.extraInfo || "").trim();
}

function loadFoldersState() {
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) {
      return { folders: [], assignments: {} };
    }

    const parsed = JSON.parse(raw);
    const folders = Array.isArray(parsed.folders)
      ? parsed.folders
          .map((folder) => ({
            id: String(folder.id || "").trim(),
            name: String(folder.name || "").trim()
          }))
          .filter((folder) => folder.id && folder.name)
      : [];
    const assignments = parsed.assignments && typeof parsed.assignments === "object"
      ? Object.fromEntries(
          Object.entries(parsed.assignments).map(([eventId, folderId]) => [
            String(eventId),
            String(folderId || "").trim()
          ])
        )
      : {};

    return { folders, assignments };
  } catch (_error) {
    return { folders: [], assignments: {} };
  }
}

function saveFoldersState() {
  localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(foldersState));
}

function eventFolderId(eventId) {
  return foldersState.assignments[String(eventId)] || "";
}

function folderEvents(folderId) {
  return events.filter((event) => eventFolderId(event.id) === folderId);
}

function renderFolders() {
  if (!folderList) {
    return;
  }

  if (!foldersState.folders.length) {
    folderList.innerHTML = '<p class="empty-copy">No folders yet.</p>';
    return;
  }

  folderList.innerHTML = foldersState.folders.map((folder) => {
    const items = sortNewestFirst(folderEvents(folder.id));

    return `
      <section
        class="folder-card"
        data-folder-id="${escapeHtml(folder.id)}"
        data-folder-drop="${escapeHtml(folder.id)}"
      >
        <button
          class="nav-section-head nav-section-toggle folder-toggle"
          type="button"
          data-collapse-target="folderItems-${escapeHtml(folder.id)}"
          aria-expanded="true"
        >
          <h3>${escapeHtml(folder.name)}</h3>
          <span>${items.length}</span>
        </button>
        <div id="folderItems-${escapeHtml(folder.id)}" class="event-nav-list">
          ${
            items.length
              ? items.map((event) => renderEventNavItem(event)).join("")
              : '<p class="empty-copy">Drag events here.</p>'
          }
        </div>
      </section>
    `;
  }).join("");
}

function renderEventNavItem(event) {
  return `
    <button
      class="event-nav-item${event.id === selectedEventId ? " is-selected" : ""}"
      type="button"
      data-event-id="${event.id}"
      data-draggable-event="${event.id}"
      draggable="true"
    >
      <span class="event-nav-row">
        <span class="event-nav-marker" style="background: ${escapeHtml(eventAccentColor(event))}"></span>
        <span class="event-nav-title">${escapeHtml(event.title)}</span>
      </span>
      <span class="event-nav-meta">${escapeHtml(formatWhen(event.when))}</span>
      <span class="event-nav-meta">${escapeHtml(event.where)}</span>
    </button>
  `;
}

function syncAvailabilityButtons() {
  freeEventPageBtn.classList.toggle("is-active", selectedAvailability === "free");
  busyEventPageBtn.classList.toggle("is-active", selectedAvailability === "busy");
  eventComposerTitle.textContent =
    selectedAvailability === "busy"
      ? "Block out time for yourself"
      : "Plan something for your friends";
}

function syncRecurringAvailabilityButtons() {
  freeRecurringPageBtn.classList.toggle("is-active", selectedRecurringAvailability === "free");
  busyRecurringPageBtn.classList.toggle("is-active", selectedRecurringAvailability === "busy");
  recurringComposerTitle.textContent =
    selectedRecurringAvailability === "busy"
      ? "Set a repeating busy block"
      : "Plan a repeating event for your friends";
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

async function refreshCalendarData() {
  await Promise.all([loadEvents(), loadRecurringEvents()]);
}

function startCalendarRefresh() {
  stopCalendarRefresh();
  calendarRefreshId = window.setInterval(refreshCalendarData, CALENDAR_REFRESH_MS);
}

function stopCalendarRefresh() {
  if (calendarRefreshId) {
    window.clearInterval(calendarRefreshId);
    calendarRefreshId = null;
  }
}

function showView(view) {
  feedTab.classList.toggle("is-active", view === "feed");
  calendarTab.classList.toggle("is-active", view === "calendar");
  recurringTab.classList.toggle("is-active", view === "recurring");
  feedView.classList.toggle("is-hidden", view !== "feed");
  calendarView.classList.toggle("is-hidden", view !== "calendar");
  recurringView.classList.toggle("is-hidden", view !== "recurring");
  eventForm.closest(".composer-panel").classList.toggle("is-hidden", view !== "feed");
  if (view === "calendar") {
    refreshCalendarData();
    startCalendarRefresh();
  } else {
    stopCalendarRefresh();
  }
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

  container.innerHTML = list.map((event) => renderEventNavItem(event)).join("");
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
  const isEditing = editingEventId === selected.id;
  const showAttendance = selected.availability !== "busy";
  const replies = (selected.replies || []).filter((reply) => reply.username);
  const rsvps = Object.entries(selected.rsvps || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const currentResponse = (selected.rsvps || {})[currentUser] || "";

  selectedEventEl.innerHTML = `
    <article class="event-detail">
      <div class="detail-meta">
        <span>Posted by ${escapeHtml(selected.createdBy)}</span>
        <span>${escapeHtml(new Date(selected.createdAt).toLocaleString())}</span>
      </div>

      ${
        canDelete
          ? `
            <div class="detail-actions">
              <button class="secondary-btn" type="button" data-start-edit-event="${selected.id}">
                Edit event
              </button>
              <button class="danger-btn" type="button" data-delete-event="${selected.id}">
                Delete event
              </button>
            </div>
          `
          : ""
      }

      <h2 class="event-title" style="color: ${escapeHtml(eventAccentColor(selected))}">
        ${escapeHtml(selected.title)}
      </h2>

      ${
        isEditing
          ? `
            <form class="event-form edit-form" data-edit-event-form="${selected.id}">
              <label>
                <span>Title</span>
                <input name="title" type="text" value="${escapeHtml(selected.title)}" required />
              </label>

              <div class="form-grid">
                <label>
                  <span>When</span>
                  <input name="when" type="datetime-local" value="${escapeHtml(selected.when)}" required />
                </label>

                <label>
                  <span>Where</span>
                  <input name="where" type="text" value="${escapeHtml(selected.where)}" required />
                </label>
              </div>

              <label>
                <span>Extra info</span>
                <textarea name="extraInfo" rows="5">${escapeHtml(selected.extraInfo)}</textarea>
              </label>

              <div class="form-actions">
                <p class="status-message" data-edit-event-status="${selected.id}"></p>
                <button class="secondary-btn" type="button" data-cancel-edit-event="${selected.id}">
                  Cancel
                </button>
                <button class="primary-btn" type="submit">Save changes</button>
              </div>
            </form>
          `
          : `
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
          `
      }

      ${
        showAttendance
          ? `
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
          `
          : ""
      }

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
                    <span class="calendar-chip-marker" style="background: ${escapeHtml(calendarChipColor(event))}"></span>
                    <strong>${escapeHtml(event.title)}</strong>
                    <span>${escapeHtml(formatTime(event.when))}</span>
                    ${event.endTime ? `<span class="calendar-chip-note">Until ${escapeHtml(formatTime(`2026-01-01T${event.endTime}`))}</span>` : ""}
                    ${calendarChipNote(event) ? `<span class="calendar-chip-note">${escapeHtml(calendarChipNote(event))}</span>` : ""}
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
    <article class="recurring-card">
      <div class="detail-meta">
        <span>Planned by ${escapeHtml(event.createdBy)}</span>
        <span>${escapeHtml(new Date(event.createdAt).toLocaleDateString())}</span>
      </div>
      <h3 class="event-title" style="color: ${escapeHtml(eventAccentColor(event))}">
        ${escapeHtml(event.title)}
      </h3>
      ${
        editingRecurringEventId === event.id
          ? `
            <form class="event-form edit-form" data-edit-recurring-form="${event.id}">
              <label>
                <span>Title</span>
                <input name="title" type="text" value="${escapeHtml(event.title)}" required />
              </label>

              <div class="form-grid form-grid--triple">
                <label>
                  <span>Frequency</span>
                  <select name="frequency" data-edit-recurring-frequency="${event.id}" required>
                    <option value="daily"${event.frequency === "daily" ? " selected" : ""}>Daily</option>
                    <option value="weekly"${event.frequency === "weekly" ? " selected" : ""}>Weekly</option>
                    <option value="biweekly"${event.frequency === "biweekly" ? " selected" : ""}>Biweekly</option>
                    <option value="monthly"${event.frequency === "monthly" ? " selected" : ""}>Monthly</option>
                    <option value="every weekday"${event.frequency === "every weekday" ? " selected" : ""}>Every weekday</option>
                    <option value="every weekend"${event.frequency === "every weekend" ? " selected" : ""}>Every weekend</option>
                  </select>
                </label>

                <label class="${requiresRecurringDay(event.frequency) ? "" : "is-hidden"}" data-edit-recurring-day-field="${event.id}">
                  <span>Day</span>
                  <select name="day"${requiresRecurringDay(event.frequency) ? " required" : ""}>
                    <option value="monday"${event.day === "monday" ? " selected" : ""}>Monday</option>
                    <option value="tuesday"${event.day === "tuesday" ? " selected" : ""}>Tuesday</option>
                    <option value="wednesday"${event.day === "wednesday" ? " selected" : ""}>Wednesday</option>
                    <option value="thursday"${event.day === "thursday" ? " selected" : ""}>Thursday</option>
                    <option value="friday"${event.day === "friday" ? " selected" : ""}>Friday</option>
                    <option value="saturday"${event.day === "saturday" ? " selected" : ""}>Saturday</option>
                    <option value="sunday"${event.day === "sunday" ? " selected" : ""}>Sunday</option>
                  </select>
                </label>

                <label>
                  <span>Time</span>
                  <input name="time" type="time" value="${escapeHtml(event.time)}" required />
                </label>
              </div>

              <div class="form-grid">
                <label>
                  <span>End time</span>
                  <input name="endTime" type="time" value="${escapeHtml(event.endTime || "")}" />
                </label>
                <label>
                  <span>End date</span>
                  <input name="endDate" type="date" value="${escapeHtml(event.endDate || "")}" />
                </label>
              </div>

              <div class="form-grid">
                <label>
                  <span>Where</span>
                  <input name="where" type="text" value="${escapeHtml(event.where)}" required />
                </label>
              </div>

              <label>
                <span>Extra info</span>
                <textarea name="extraInfo" rows="4">${escapeHtml(event.extraInfo)}</textarea>
              </label>

              <div class="form-actions">
                <p class="status-message" data-edit-recurring-status="${event.id}"></p>
                <button class="secondary-btn" type="button" data-cancel-edit-recurring="${event.id}">
                  Cancel
                </button>
                <button class="primary-btn" type="submit">Save changes</button>
              </div>
            </form>
          `
          : `
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
          `
      }
      ${
        event.createdBy === currentUser
          ? `
            <div class="detail-actions">
              <button
                class="secondary-btn"
                type="button"
                data-start-edit-recurring="${event.id}"
              >
                Edit recurring event
              </button>
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
  const upcoming = sortedEvents.filter(
    (event) => !isPastEvent(event) && event.availability !== "busy"
  );
  const personal = sortedEvents.filter(
    (event) =>
      !isPastEvent(event) &&
      event.availability === "busy" &&
      event.createdBy === currentUser
  );
  const past = sortedEvents.filter((event) => isPastEvent(event));

  upcomingCount.textContent = String(upcoming.length);
  personalCount.textContent = String(personal.length);
  pastCount.textContent = String(past.length);

  renderNavList(upcomingList, upcoming);
  renderNavList(personalList, personal);
  renderNavList(pastList, past);
  renderFolders();
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

freeRecurringPageBtn.addEventListener("click", () => {
  selectedRecurringAvailability = "free";
  syncRecurringAvailabilityButtons();
});

busyRecurringPageBtn.addEventListener("click", () => {
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

freeEventPageBtn.addEventListener("click", () => {
  selectedAvailability = "free";
  syncAvailabilityButtons();
});

busyEventPageBtn.addEventListener("click", () => {
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

if (folderForm) {
  folderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = String(folderNameInput.value || "").trim();
    if (!name) {
      return;
    }

    foldersState.folders.unshift({
      id: `folder-${Date.now()}`,
      name
    });
    saveFoldersState();
    folderForm.reset();
    renderFolders();
  });
}

document.addEventListener("click", (event) => {
  const collapseTrigger = event.target.closest("[data-collapse-target]");
  if (collapseTrigger) {
    const targetId = collapseTrigger.getAttribute("data-collapse-target");
    const target = document.getElementById(targetId);
    if (target) {
      const isCollapsed = target.classList.toggle("is-collapsed");
      collapseTrigger.setAttribute("aria-expanded", String(!isCollapsed));
    }
    return;
  }

  const deleteTrigger = event.target.closest("[data-delete-event]");
  if (deleteTrigger) {
    deleteEvent(Number(deleteTrigger.getAttribute("data-delete-event")));
    return;
  }

  const editEventTrigger = event.target.closest("[data-start-edit-event]");
  if (editEventTrigger) {
    editingEventId = Number(editEventTrigger.getAttribute("data-start-edit-event"));
    renderSelectedEvent();
    return;
  }

  const cancelEditEventTrigger = event.target.closest("[data-cancel-edit-event]");
  if (cancelEditEventTrigger) {
    editingEventId = null;
    renderSelectedEvent();
    return;
  }

  const deleteRecurringTrigger = event.target.closest("[data-delete-recurring-event]");
  if (deleteRecurringTrigger) {
    deleteRecurringEvent(Number(deleteRecurringTrigger.getAttribute("data-delete-recurring-event")));
    return;
  }

  const editRecurringTrigger = event.target.closest("[data-start-edit-recurring]");
  if (editRecurringTrigger) {
    editingRecurringEventId = Number(editRecurringTrigger.getAttribute("data-start-edit-recurring"));
    renderRecurringEvents();
    return;
  }

  const cancelEditRecurringTrigger = event.target.closest("[data-cancel-edit-recurring]");
  if (cancelEditRecurringTrigger) {
    editingRecurringEventId = null;
    renderRecurringEvents();
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

document.addEventListener("dragstart", (event) => {
  const trigger = event.target.closest("[data-draggable-event]");
  if (!trigger) {
    return;
  }

  draggedEventId = Number(trigger.getAttribute("data-draggable-event"));
  if (event.dataTransfer) {
    event.dataTransfer.setData("text/plain", String(draggedEventId));
    event.dataTransfer.effectAllowed = "move";
  }
});

document.addEventListener("dragend", () => {
  draggedEventId = null;
});

document.addEventListener("dragover", (event) => {
  const folderDrop = event.target.closest("[data-folder-drop]");
  if (!folderDrop) {
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  folderDrop.classList.add("is-drop-target");
});

document.addEventListener("dragleave", (event) => {
  const folderDrop = event.target.closest("[data-folder-drop]");
  if (!folderDrop) {
    return;
  }

  folderDrop.classList.remove("is-drop-target");
});

document.addEventListener("drop", (event) => {
  const folderDrop = event.target.closest("[data-folder-drop]");
  if (!folderDrop) {
    return;
  }

  event.preventDefault();
  folderDrop.classList.remove("is-drop-target");
  const folderId = folderDrop.getAttribute("data-folder-drop");
  const eventId = draggedEventId || Number(event.dataTransfer?.getData("text/plain"));
  if (!folderId || !eventId) {
    return;
  }

  foldersState.assignments[String(eventId)] = folderId;
  saveFoldersState();
  renderFolders();
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-reply-form]");
  if (!form) {
    const editEventForm = event.target.closest("[data-edit-event-form]");
    if (editEventForm) {
      event.preventDefault();
      await submitEventEdit(editEventForm);
      return;
    }

    const editRecurringForm = event.target.closest("[data-edit-recurring-form]");
    if (editRecurringForm) {
      event.preventDefault();
      await submitRecurringEdit(editRecurringForm);
      return;
    }

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

document.addEventListener("change", (event) => {
  const frequencyInput = event.target.closest("[data-edit-recurring-frequency]");
  if (!frequencyInput) {
    return;
  }

  const eventId = frequencyInput.getAttribute("data-edit-recurring-frequency");
  const dayField = document.querySelector(`[data-edit-recurring-day-field="${eventId}"]`);
  const dayInput = dayField ? dayField.querySelector('select[name="day"]') : null;
  const needsDay = requiresRecurringDay(frequencyInput.value);

  if (dayField) {
    dayField.classList.toggle("is-hidden", !needsDay);
  }
  if (dayInput) {
    dayInput.required = needsDay;
  }
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

  delete foldersState.assignments[String(eventId)];
  saveFoldersState();
  events = events.filter((event) => event.id !== eventId);
  selectedEventId = events.length ? events[0].id : null;
  statusMessage.textContent = "Event deleted.";
  renderAll();
}

async function submitEventEdit(form) {
  const eventId = Number(form.getAttribute("data-edit-event-form"));
  const status = form.querySelector("[data-edit-event-status]");
  const formData = new FormData(form);

  status.textContent = "Saving changes...";

  const res = await fetch(`/events/${eventId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: String(formData.get("title") || "").trim(),
      when: String(formData.get("when") || "").trim(),
      where: String(formData.get("where") || "").trim(),
      extraInfo: String(formData.get("extraInfo") || "").trim(),
      username: currentUser
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not save event changes." }));
    status.textContent = error.error || "Could not save event changes.";
    return;
  }

  const data = await res.json();
  events = events.map((existingEvent) =>
    existingEvent.id === data.event.id ? data.event : existingEvent
  );
  editingEventId = null;
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

async function submitRecurringEdit(form) {
  const eventId = Number(form.getAttribute("data-edit-recurring-form"));
  const status = form.querySelector("[data-edit-recurring-status]");
  const formData = new FormData(form);

  status.textContent = "Saving changes...";

  const res = await fetch(`/recurring-events/${eventId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: String(formData.get("title") || "").trim(),
      frequency: String(formData.get("frequency") || "").trim(),
      day: String(formData.get("day") || "").trim(),
      time: String(formData.get("time") || "").trim(),
      endTime: String(formData.get("endTime") || "").trim(),
      endDate: String(formData.get("endDate") || "").trim(),
      where: String(formData.get("where") || "").trim(),
      extraInfo: String(formData.get("extraInfo") || "").trim(),
      username: currentUser
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not save recurring changes." }));
    status.textContent = error.error || "Could not save recurring changes.";
    return;
  }

  const data = await res.json();
  recurringEvents = recurringEvents.map((existingEvent) =>
    existingEvent.id === data.recurringEvent.id ? data.recurringEvent : existingEvent
  );
  editingRecurringEventId = null;
  renderAll();
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
showView(initialView);
Promise.all([loadEvents(), loadRecurringEvents()]);
