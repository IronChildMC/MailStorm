const express = require("express");
const { Resend } = require("resend");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;
const ORIGIN = "https://ironchildmc.github.io";

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-MailStorm-Key"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
    res.send("MailStorm API online");
});

app.post("/api/send", async (req, res) => {
    try {
        const secret = process.env.MAILSTORM_SECRET;
        const supplied = req.headers["x-mailstorm-key"];

        if (
            !secret ||
            typeof supplied !== "string" ||
            Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
            !crypto.timingSafeEqual(
                Buffer.from(secret),
                Buffer.from(supplied)
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
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
            !subject.trim() ||
            !message.trim() ||
            subject.length > 150 ||
            message.length > 10000
        ) {
            return res.status(400).json({
                error: "Datos no válidos"
            });
        }

        if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
            return res.status(503).json({
                error: "Resend no está configurado"
            });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        const result = await resend.emails.send({
            from: process.env.FROM_EMAIL,
            to: [to],
            subject,
            text: message
        });

        if (result.error) {
            return res.status(502).json({
                error: "Error de Resend"
            });
        }

        res.json({
            success: true,
            id: result.data.id
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error interno"
        });
    }
});

app.listen(PORT, () => {
    console.log("MailStorm API running on port " + PORT);
});
