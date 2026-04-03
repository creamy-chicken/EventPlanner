const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = 3000;
const publicDir = path.join(__dirname, "public");
let nextEventId = 1;

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

app.use(
  session({
    secret: "simple-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true
    }
  })
);

// In-memory user store for the demo
const users = [
  {
    username: "test",
    password: "1234"
  }
];
const events = [];

function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.redirect("/");
  }
  next();
}

app.get("/", (req, res) => {
  if (req.session.username) {
    return res.redirect("/dashboard");
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Login</title>
    </head>
    <body>
      <h1>Login</h1>
      <form method="POST" action="/login">
        <div>
          <label>Username:</label>
          <input type="text" name="username" required />
        </div>
        <br />
        <div>
          <label>Password:</label>
          <input type="password" name="password" required />
        </div>
        <br />
        <button type="submit">Log in</button>
      </form>

      <p>Sign in with username <strong>test</strong> and password <strong>1234</strong>.</p>
    </body>
    </html>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).send(`
      <h1>Login failed</h1>
      <p>Wrong username or password.</p>
      <a href="/">Try again</a>
    `);
  }

  req.session.username = user.username;
  res.redirect("/dashboard");
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});

app.get("/me", requireLogin, (req, res) => {
  const user = users.find((u) => u.username === req.session.username);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    username: user.username
  });
});

app.get("/events", requireLogin, (req, res) => {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ events: sortedEvents });
});

app.post("/events", requireLogin, (req, res) => {
  const { title, when, where, extraInfo } = req.body;

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

  const newEvent = {
    id: nextEventId++,
    title: String(title).trim(),
    when: normalizeLocalDateTime(when),
    where: String(where).trim(),
    extraInfo: String(extraInfo || "").trim(),
    createdBy: req.session.username,
    createdAt: new Date().toISOString(),
    replies: []
  };

  events.push(newEvent);
  res.status(201).json({ event: newEvent });
});

app.post("/events/:id/replies", requireLogin, (req, res) => {
  const event = findEventById(req.params.id);

  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  if (event.createdBy !== req.session.username) {
    return res.status(403).json({
      error: "Only the original event owner can reply here."
    });
  }

  const body = String(req.body.body || "").trim();

  if (!body) {
    return res.status(400).json({ error: "Reply text is required." });
  }

  const reply = {
    id: Date.now(),
    username: req.session.username,
    body,
    createdAt: new Date().toISOString()
  };

  event.replies.push(reply);
  res.status(201).json({ reply, event });
});

app.post("/logout", requireLogin, (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log("Server running at http://localhost:3000");
});
