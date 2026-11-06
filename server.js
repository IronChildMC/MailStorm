const express = require("express");
const { Resend } = require("resend");

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json({ limit: "20kb" }));

const allowedOrigin = process.env.ALLOWED_ORIGIN;

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && origin !== allowedOrigin) {
        return res.status(403).json({
            error: "Origen no autorizado"
        });
    }

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

let lastSent = 0;

app.get("/", (req, res) => {
    res.send("MailStorm API online");
});

app.post("/api/send", async (req, res) => {
    try {
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

        if (Date.now() - lastSent < 60000) {
            return res.status(429).json({
                error: "Espera antes de enviar otro mensaje"
            });
        }

        if (!process.env.RESEND_API_KEY ||
            !process.env.FROM_EMAIL) {
            return res.status(500).json({
                error: "Falta configurar Resend"
            });
        }

        lastSent = Date.now();

        const result = await resend.emails.send({
            from: process.env.FROM_EMAIL,
            to: [to],
            subject,
            text: message
        });

        if (result.error) {
            return res.status(502).json({
                error: "Resend no pudo enviar el mensaje"
            });
        }

        res.json({
            success: true,
            id: result.data.id
        });

    } catch (error) {
        console.error("MailStorm error:", error);

        res.status(500).json({
            error: "Error interno del servidor"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`MailStorm running on port ${PORT}`);
});
