
const express = require("express");
const session = require("express-session");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;
const ORIGIN = "https://ironchildmc.github.io";

app.set("trust proxy", 1);

if (!process.env.MAILSTORM_SECRET) {
    throw new Error("Falta MAILSTORM_SECRET en Render");
}

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (req.method !== "GET" && req.headers.origin !== ORIGIN) {
        return res.status(403).json({ error: "Origen no permitido" });
    }
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

const loginAttempts = new Map();
const sendTimes = new Map();

function requireLogin(req, res, next) {
    if (req.session.authenticated !== true) {
        return res.status(401).json({ error: "Inicia sesión primero." });
    }
    next();
}

app.get("/", (req, res) => {
    res.send("MailStorm API online");
});

app.post("/api/login", (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    let record = loginAttempts.get(ip);

    if (!record || now - record.started > 15 * 60 * 1000) {
        record = { count: 0, started: now };
    }

    if (record.count >= 5) {
        return res.status(429).json({
            error: "Demasiados intentos. Espera 15 minutos."
        });
    }

    const { username, password } = req.body || {};

    if (
        username !== process.env.MAILSTORM_USER ||
        typeof password !== "string" ||
        password !== process.env.MAILSTORM_PASSWORD
    ) {
        record.count++;
        loginAttempts.set(ip, record);
        return res.status(401).json({
            error: "Usuario o contraseña incorrectos."
        });
    }

    loginAttempts.delete(ip);

    req.session.regenerate((error) => {
        if (error) return next(error);

        req.session.authenticated = true;
        req.session.save((saveError) => {
            if (saveError) return next(saveError);
            res.json({ success: true });
        });
    });
});

app.get("/api/session", (req, res) => {
    res.json({
        authenticated: req.session.authenticated === true
    });
});

app.post("/api/logout", requireLogin, (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("mailstorm_session");
        res.json({ success: true });
    });
});

app.post("/api/send", requireLogin, async (req, res) => {
    try {
        const now = Date.now();
        const sessionId = req.sessionID;
        const previous = sendTimes.get(sessionId) || [];

        const recent = previous.filter(
            time => now - time < 60 * 60 * 1000
        );

        if (recent.length >= 3) {
            return res.status(429).json({
                error: "Has alcanzado el límite de 3 mensajes por hora."
            });
        }

        const { subject, message } = req.body || {};

        if (
            typeof subject !== "string" ||
            typeof message !== "string" ||
            !subject.trim() ||
            !message.trim() ||
            subject.length > 150 ||
            message.length > 5000
        ) {
            return res.status(400).json({
                error: "Asunto o mensaje no válidos."
            });
        }

        const recipient = process.env.ALLOWED_RECIPIENT;

        if (
            !recipient ||
            !process.env.RESEND_API_KEY ||
            !process.env.FROM_EMAIL
        ) {
            return res.status(503).json({
                error: "Falta configurar Resend o el destinatario."
            });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        const result = await resend.emails.send({
            from: process.env.FROM_EMAIL,
            to: [recipient],
            subject: subject.trim(),
            text: message.trim()
        });

        if (result.error) {
            console.error("Resend:", result.error);
            return res.status(502).json({
                error: "El proveedor no pudo enviar el mensaje."
            });
        }

        recent.push(now);
        sendTimes.set(sessionId, recent);

        res.json({ success: true, id: result.data.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

app.listen(PORT, () => {
    console.log("MailStorm API running on port " + PORT);
});
