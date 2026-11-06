
const API = "https://mailstorm-m1vc.onrender.com";

const loginPanel = document.getElementById("loginPanel");
const privateArea = document.getElementById("privateArea");
const loginForm = document.getElementById("loginForm");
const mailForm = document.getElementById("mailForm");

const loginButton = document.getElementById("loginButton");
const sendButton = document.getElementById("send");

const loginResult = document.getElementById("loginResult");
const result = document.getElementById("result");

let sent = Number(localStorage.getItem("mailstorm_sent") || 0);
let errors = Number(localStorage.getItem("mailstorm_errors") || 0);

document.getElementById("sent").textContent = sent;
document.getElementById("errors").textContent = errors;

async function request(path, options = {}) {
    const response = await fetch(API + path, {
        credentials: "include",
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Error de conexión.");
    }

    return data;
}

function showPrivateArea(authenticated) {
    loginPanel.hidden = authenticated;
    privateArea.hidden = !authenticated;
}

async function checkSession() {
    try {
        const data = await request("/api/session");
        showPrivateArea(data.authenticated);
    } catch {
        showPrivateArea(false);
        loginResult.textContent = "No se pudo comprobar la sesión.";
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginButton.disabled = true;
    loginResult.textContent = "Verificando acceso...";

    try {
        await request("/api/login", {
            method: "POST",
            body: JSON.stringify({
                username: document.getElementById("username").value,
                password: document.getElementById("password").value
            })
        });

        loginForm.reset();
        loginResult.textContent = "";
        showPrivateArea(true);

    } catch (error) {
        loginResult.textContent = error.message;
    } finally {
        loginButton.disabled = false;
    }
});

mailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const subject = document.getElementById("subject").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!subject || !message) {
        result.textContent = "Completa todos los campos.";
        return;
    }

    sendButton.disabled = true;
    result.textContent = "Enviando mensaje...";

    try {
        await request("/api/send", {
            method: "POST",
            body: JSON.stringify({ subject, message })
        });

        sent++;
        localStorage.setItem("mailstorm_sent", sent);
        document.getElementById("sent").textContent = sent;

        mailForm.reset();
        result.textContent = "Mensaje enviado correctamente.";

    } catch (error) {
        errors++;
        localStorage.setItem("mailstorm_errors", errors);
        document.getElementById("errors").textContent = errors;
        result.textContent = error.message;

        if (error.message.includes("Inicia sesión")) {
            showPrivateArea(false);
        }
    } finally {
        sendButton.disabled = false;
    }
});

document.getElementById("logout").addEventListener("click", async () => {
    try {
        await request("/api/logout", { method: "POST" });
    } catch (error) {
        result.textContent = error.message;
    }

    showPrivateArea(false);
    loginResult.textContent = "Sesión cerrada.";
});

checkSession();
