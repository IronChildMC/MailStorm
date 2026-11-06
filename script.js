const form = document.getElementById("mailForm");
const button = document.getElementById("send");
const result = document.getElementById("result");

let sent = 0;
let errors = 0;

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    button.disabled = true;
    result.textContent = "Procesando mensaje...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                to: document.getElementById("to").value,
                subject: document.getElementById("subject").value,
                message: document.getElementById("message").value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo enviar");
        }

        sent++;
        document.getElementById("sent").textContent = sent;
        result.textContent = "Correo enviado correctamente.";

        form.reset();
    } catch (error) {
        errors++;
        document.getElementById("errors").textContent = errors;
        result.textContent = "Error: " + error.message;
    } finally {
        button.disabled = false;
    }
});
