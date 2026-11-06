
const API_URL = "https://mailstorm-m1vc.onrender.com/";

const form = document.getElementById("mailForm");
const button = document.getElementById("send");
const result = document.getElementById("result");

let sent = Number(localStorage.getItem("mailstorm_sent") || 0);
let errors = Number(localStorage.getItem("mailstorm_errors") || 0);

document.getElementById("sent").textContent = sent;
document.getElementById("errors").textContent = errors;

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const to = document.getElementById("to").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!to || !subject || !message) {
        result.textContent = "Completa todos los campos.";
        return;
    }

    button.disabled = true;
    result.textContent = "Comprobando conexión...";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("El servidor no está disponible.");
        }

        result.textContent =
            "Conexión correcta. MailStorm API está funcionando. El envío requiere autenticación segura.";

    } catch (error) {
        errors++;
        localStorage.setItem("mailstorm_errors", errors);
        document.getElementById("errors").textContent = errors;
        result.textContent = error.message;

    } finally {
        button.disabled = false;
    }
});

