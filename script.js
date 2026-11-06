const API_URL = "https://mailstorm-m1vc.onrender.com/api/send";

const form = document.getElementById("mailForm");
const button = document.getElementById("send");
const result = document.getElementById("result");

let sent = 0;
let errors = 0;

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    button.disabled = true;
    result.textContent = "Sending message...";

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
            throw new Error(data.error || "Sending failed");
        }

        sent++;
        document.getElementById("sent").textContent = sent;
        result.textContent = "Message sent successfully.";

        form.reset();

    } catch (error) {
        errors++;
        document.getElementById("errors").textContent = errors;
        result.textContent = "Error: " + error.message;

    } finally {
        button.disabled = false;
    }
});
