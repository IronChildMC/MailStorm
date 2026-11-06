const express = require("express");
const { Resend } = require("resend");
const crypto = require("crypto");

const app = express();

app.use(express.json({ limit: "20kb" }));

const PORT = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);

const API_SECRET = process.env.MAILSTORM_SECRET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const FROM_EMAIL = process.env.FROM_EMAIL;

const lastRequests = new Map();

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && origin !== ALLOWED_ORIGIN) {
        return res.status(403).json({
            error: "Origen no autorizado"
        });
    }

    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-MailStorm-Key");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.get("/", (req, res) => {
    res.send("MailStorm API online");
});

app.post("/api/send", async (req, res) => {
    try {
        if (!API_SECRET || !process.env.RESEND_API_KEY || !FROM_EMAIL) {
            return res.status(503).json({
                error: "Servidor sin configurar"
            });
        }

        const supplied = req.headers["x-mailstorm-key"];

        if (
            typeof supplied !== "string" ||
            supplied.length !== API_SECRET.length ||
            !crypto.timingSafeEqual(
                Buffer.from(supplied),
                Buffer.from(API_SECRET)
            )
        ) {
            return res.status(401).json({
                error: "Acceso no autorizado"
            });
        }

        const { to, subject, message } = req.body;

        if (
            typeof to !== "string" ||
            typeof subject !== "string" ||
            typeof message !== "string" ||
            to.length > 254 ||
            subject.length > 150 ||
            message.length > 10000 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
            !subject.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                error: "Datos no válidos"
            });
        }

        const now = Date.now();
        const previous = lastRequests.get(supplied) || 0;

        if (now - previous < 60000) {
            return res.status(429).json({
                error: "Espera antes de enviar otro mensaje"
            });
        }

        lastRequests.set(supplied, now);

        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: subject,
            text: message
        });

        if (result.error) {
            return res.status(502).json({
                error: "Error de Resend"
            });
        }

        return res.json({
            success: true,
            id: result.data.id
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Error interno"
        });
    }
});

app.listen(PORT, () => {
    console.log(`MailStorm running on port ${PORT}`);
});
