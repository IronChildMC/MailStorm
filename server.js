
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ORIGIN = "https://ironchildmc.github.io";

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use(express.json({ limit: "10kb" }));

app.use(session({
    name: "mailstorm_session",
    secret: process.env.MAILSTORM_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 60 * 1000
    }
}));

let attempts = new Map();

app.get("/", (req, res) => {
    res.send("MailStorm API online");
});

app.post("/api/login", async (req, res) => {
    const ip = req.ip;
    const now = Date.now();
    const record = attempts.get(ip) || { count: 0, time: now };

    if (now - record.time > 15 * 60 * 1000) {
        record.count = 0;
        record.time = now;
    }

    if (record.count >= 5) {
        return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos." });
    }

    const { username, password } = req.body || {};

    const validUser = username === process.env.MAILSTORM_USER;
    const validPassword = typeof password === "string" &&
        password === process.env.MAILSTORM_PASSWORD;

    if (!validUser || !validPassword) {
        record.count++;
        attempts.set(ip, record);
        return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    attempts.delete(ip);

    req.session.authenticated = true;

    res.json({ success: true });
});

app.get("/api/session", (req, res) => {
    res.json({ authenticated: req.session.authenticated === true });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("mailstorm_session");
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log("MailStorm API running on port " + PORT);
});
