const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
let nextEventId = 1;
let nextRecurringEventId = 1;

const configuredMemberAnswers = {
  dasha: "black",
  sanjana: "green",
  leah: "green",
  arthur: "bombs"
};

const memberColors = {
  dasha: "#e78ac3",
  sanjana: "#7fc97f",
  leah: "#80b1d3",
  arthur: "#fdb462"
};

const memberAnswers = Object.fromEntries(
  Object.entries(configuredMemberAnswers).map(([name, answer]) => [
    normalizeName(name),
    normalizeName(answer)
  ])
);

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

const events = [];
const recurringEvents = [];

function displayName(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isValidLocalDateTime(value) {
  if (typeof value !== "string") {
    return false;
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || "0");
  const date = new Date(year, month - 1, day, hour, minute, second);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second
  );
}

function normalizeLocalDateTime(value) {
  const match = String(value).match(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?$/
  );

  return match ? match[1] : String(value);
}

function findEventById(eventId) {
  return events.find((event) => event.id === Number(eventId));
}

function findRecurringEventById(eventId) {
  return recurringEvents.find((event) => event.id === Number(eventId));
}

function requireKnownUser(name) {
  const normalized = normalizeName(name);
  return normalized && memberAnswers[normalized] ? normalized : "";
}

function userColor(name) {
  return memberColors[normalizeName(name)] || "#d9d9d9";
}

function isValidDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

app.get("/access-question", (req, res) => {
  const name = requireKnownUser(req.query.name);

  if (!name) {
    return res.status(404).json({
      error: "That name is not on the planning list."
    });
  }

  res.json({
    question: `What is ${displayName(name)}'s favorite color?`
  });
});

app.post("/verify-user", (req, res) => {
  const name = requireKnownUser(req.body.name);
  const answer = normalizeName(req.body.answer);

  if (!name) {
    return res.status(404).json({
      error: "That name is not on the planning list."
    });
  }

  if (memberAnswers[name] !== answer) {
    return res.status(401).json({
      error: "That answer is not correct."
    });
  }

  res.json({
    username: displayName(name),
    color: userColor(name)
  });
});

app.get("/events", (req, res) => {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ events: sortedEvents });
});

app.get("/recurring-events", (req, res) => {
  const sortedEvents = [...recurringEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ recurringEvents: sortedEvents });
});

app.post("/events", (req, res) => {
  const { title, when, where, extraInfo, username, availability } = req.body;
  const createdBy = requireKnownUser(username);

  if (!createdBy) {
    return res.status(401).json({ error: "A verified name is required." });
  }

  if (!title || !when || !where) {
    return res.status(400).json({
      error: "Title, when, and where are required."
    });
  }

  if (!isValidLocalDateTime(when)) {
    return res.status(400).json({
      error: "Please provide a valid date and time."
    });
  }

  const normalizedAvailability = String(availability || "free").trim().toLowerCase();
  if (!["free", "busy"].includes(normalizedAvailability)) {
    return res.status(400).json({
      error: "Availability must be free or busy."
    });
  }

  const newEvent = {
    id: nextEventId++,
    title: String(title).trim(),
    when: normalizeLocalDateTime(when),
    where: String(where).trim(),
    extraInfo: String(extraInfo || "").trim(),
    availability: normalizedAvailability,
    createdBy: displayName(createdBy),
    color: userColor(createdBy),
    createdAt: new Date().toISOString(),
    replies: [],
    rsvps: {}
  };

  events.push(newEvent);
  res.status(201).json({ event: newEvent });
});

app.post("/events/:id/replies", (req, res) => {
  const event = findEventById(req.params.id);
  const username = requireKnownUser(req.body.username);

  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  if (!username) {
    return res.status(401).json({ error: "A verified name is required." });
  }

  const body = String(req.body.body || "").trim();

  if (!body) {
    return res.status(400).json({ error: "Reply text is required." });
  }

  const reply = {
    id: Date.now(),
    username: displayName(username),
    body,
    createdAt: new Date().toISOString()
  };

  event.replies.push(reply);
  res.status(201).json({ reply, event });
});

app.post("/events/:id/rsvp", (req, res) => {
  const event = findEventById(req.params.id);
  const username = requireKnownUser(req.body.username);
  const response = String(req.body.response || "").trim().toLowerCase();

  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  if (!username) {
    return res.status(401).json({ error: "A verified name is required." });
  }

  if (!["yes", "no"].includes(response)) {
    return res.status(400).json({ error: "Response must be yes or no." });
  }

  event.rsvps[displayName(username)] = response;
  res.json({ event });
});

app.post("/recurring-events", (req, res) => {
  const {
    title,
    frequency,
    day,
    time,
    endTime,
    where,
    extraInfo,
    username,
    endDate,
    availability
  } = req.body;
  const createdBy = requireKnownUser(username);

  if (!createdBy) {
    return res.status(401).json({ error: "A verified name is required." });
  }

  if (!title || !frequency || !time || !where) {
    return res.status(400).json({
      error: "Title, frequency, time, and where are required."
    });
  }

  const normalizedFrequency = String(frequency).trim().toLowerCase();
  const normalizedDay = String(day).trim().toLowerCase();
  const normalizedTime = String(time).trim();
  const normalizedEndTime = String(endTime || "").trim();
  const normalizedEndDate = String(endDate || "").trim();
  const normalizedAvailability = String(availability || "free").trim().toLowerCase();

  const validFrequencies = [
    "daily",
    "weekly",
    "biweekly",
    "monthly",
    "every weekday",
    "every weekend"
  ];
  const validDays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];

  if (!validFrequencies.includes(normalizedFrequency)) {
    return res.status(400).json({
      error: "Frequency must be daily, weekly, biweekly, monthly, every weekday, or every weekend."
    });
  }

  if (
    ["weekly", "biweekly", "monthly"].includes(normalizedFrequency) &&
    !validDays.includes(normalizedDay)
  ) {
    return res.status(400).json({ error: "Choose a valid weekday." });
  }

  if (!/^\d{2}:\d{2}$/.test(normalizedTime)) {
    return res.status(400).json({ error: "Time must use HH:MM format." });
  }

  if (normalizedEndTime && !/^\d{2}:\d{2}$/.test(normalizedEndTime)) {
    return res.status(400).json({ error: "End time must use HH:MM format." });
  }

  if (normalizedEndDate && !isValidDateOnly(normalizedEndDate)) {
    return res.status(400).json({ error: "End date must use YYYY-MM-DD format." });
  }

  if (!["free", "busy"].includes(normalizedAvailability)) {
    return res.status(400).json({
      error: "Availability must be free or busy."
    });
  }

  const recurringEvent = {
    id: nextRecurringEventId++,
    title: String(title).trim(),
    frequency: normalizedFrequency,
    day: validDays.includes(normalizedDay) ? normalizedDay : "",
    time: normalizedTime,
    endTime: normalizedEndTime,
    endDate: normalizedEndDate,
    where: String(where).trim(),
    extraInfo: String(extraInfo || "").trim(),
    availability: normalizedAvailability,
    createdBy: displayName(createdBy),
    color: userColor(createdBy),
    createdAt: new Date().toISOString()
  };

  recurringEvents.push(recurringEvent);
  res.status(201).json({ recurringEvent });
});

app.delete("/recurring-events/:id", (req, res) => {
  const event = findRecurringEventById(req.params.id);
  const username = requireKnownUser(req.body.username);

  if (!event) {
    return res.status(404).json({ error: "Recurring event not found." });
  }

  if (!username) {
    return res.status(401).json({ error: "A verified name is required." });
  }

  if (event.createdBy !== displayName(username)) {
    return res.status(403).json({
      error: "Only the original event owner can delete this recurring event."
    });
  }

  const eventIndex = recurringEvents.findIndex((item) => item.id === event.id);
  recurringEvents.splice(eventIndex, 1);

  res.json({ success: true, deletedRecurringEventId: event.id });
});

app.delete("/events/:id", (req, res) => {
  const event = findEventById(req.params.id);
  const username = requireKnownUser(req.body.username);

  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  if (!username) {
    return res.status(401).json({ error: "A verified name is required." });
  }

  if (event.createdBy !== displayName(username)) {
    return res.status(403).json({
      error: "Only the original event owner can delete this event."
    });
  }

  const eventIndex = events.findIndex((item) => item.id === event.id);
  events.splice(eventIndex, 1);

  res.json({ success: true, deletedEventId: event.id });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
