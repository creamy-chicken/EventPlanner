const welcomeEl = document.getElementById("welcome");
const eventForm = document.getElementById("eventForm");
const titleInput = document.getElementById("titleInput");
const whenInput = document.getElementById("whenInput");
const whereInput = document.getElementById("whereInput");
const extraInfoInput = document.getElementById("extraInfoInput");
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
const feedTab = document.getElementById("feedTab");
const calendarTab = document.getElementById("calendarTab");
const feedView = document.getElementById("feedView");
const calendarView = document.getElementById("calendarView");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = "";
let events = [];
let selectedEventId = null;
let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
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

function formatDay(value) {
  const date = parseLocalDateTime(`${value}T00:00`);
  if (!date) return value;

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
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

function isPastEvent(event) {
  const date = parseLocalDateTime(event.when);
  return date ? date.getTime() < Date.now() : false;
}

function sortNewestFirst(list) {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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
  const canReply = selected.createdBy === currentUser;

  const replies = (selected.replies || []).filter((reply) => reply.username);

  selectedEventEl.innerHTML = `
    <article class="event-detail">
      <div class="detail-meta">
        <span>Posted by ${escapeHtml(selected.createdBy)}</span>
        <span>${escapeHtml(new Date(selected.createdAt).toLocaleString())}</span>
      </div>

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

      <section class="info-block replies-block">
        <div class="section-head">
          <div>
            <p class="app-kicker">Replies</p>
            <h3>Event thread</h3>
          </div>
        </div>
        ${
          canReply
            ? `
              <form class="reply-form" data-reply-form="${selected.id}">
                <label>
                  <span>Add reply</span>
                  <textarea
                    name="replyBody"
                    rows="4"
                    placeholder="Post an update, answer questions, or add a note to your event."
                    required
                  ></textarea>
                </label>
                <div class="form-actions">
                  <p class="status-message" data-reply-status="${selected.id}"></p>
                  <button class="primary-btn" type="submit">Post reply</button>
                </div>
              </form>
            `
            : ""
        }
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
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < startWeekday; index += 1) {
    cells.push('<div class="calendar-cell calendar-cell--blank"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = (grouped[key] || []).sort((a, b) => a.when.localeCompare(b.when));
    const isToday = dayKeyFromLocalValue(new Date().toISOString().slice(0, 10)) === key;

    cells.push(`
      <section class="calendar-cell${isToday ? " calendar-cell--today" : ""}">
        <div class="calendar-cell-head">
          <span class="calendar-date-number">${day}</span>
          <span class="calendar-event-count">${dayEvents.length ? `${dayEvents.length} planned` : ""}</span>
        </div>
        <div class="calendar-cell-events">
          ${
            dayEvents.length
              ? dayEvents.map((event) => `
                  <button class="calendar-chip" type="button" data-event-id="${event.id}">
                    <strong>${escapeHtml(event.title)}</strong>
                    <span>${escapeHtml(formatTime(event.when))}</span>
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
}

async function loadUser() {
  const res = await fetch("/me");

  if (!res.ok) {
    window.location.href = "/";
    return;
  }

  const data = await res.json();
  currentUser = data.username;
  welcomeEl.textContent = data.username;
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

feedTab.addEventListener("click", () => {
  feedTab.classList.add("is-active");
  calendarTab.classList.remove("is-active");
  feedView.classList.remove("is-hidden");
  calendarView.classList.add("is-hidden");
});

calendarTab.addEventListener("click", () => {
  calendarTab.classList.add("is-active");
  feedTab.classList.remove("is-active");
  calendarView.classList.remove("is-hidden");
  feedView.classList.add("is-hidden");
});

prevMonthBtn.addEventListener("click", () => {
  displayedMonth = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() - 1,
    1
  );
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  displayedMonth = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() + 1,
    1
  );
  renderCalendar();
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusMessage.textContent = "Posting event...";

  const payload = {
    title: titleInput.value.trim(),
    when: whenInput.value,
    where: whereInput.value.trim(),
    extraInfo: extraInfoInput.value.trim()
  };

  const res = await fetch("/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
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
  statusMessage.textContent = "Event posted.";
  renderAll();
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" });
  window.location.href = "/";
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-event-id]");
  if (!trigger) return;

  selectEvent(Number(trigger.getAttribute("data-event-id")));
  feedTab.click();
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-reply-form]");
  if (!form) {
    return;
  }

  event.preventDefault();

  const eventId = Number(form.getAttribute("data-reply-form"));
  const textarea = form.querySelector('textarea[name="replyBody"]');
  const status = form.querySelector("[data-reply-status]");
  const body = textarea.value.trim();

  if (!body) {
    status.textContent = "Reply text is required.";
    return;
  }

  status.textContent = "Posting reply...";

  const res = await fetch(`/events/${eventId}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Could not post reply." }));
    status.textContent = error.error || "Could not post reply.";
    return;
  }

  const data = await res.json();
  events = events.map((existingEvent) =>
    existingEvent.id === data.event.id ? data.event : existingEvent
  );
  status.textContent = "Reply posted.";
  renderAll();
});

Promise.all([loadUser(), loadEvents()]);
