import assert from "node:assert/strict";
import ejs from "ejs";
import test from "node:test";

test("la página ofrece confirmar o liberar el cupo sin ejecutar nada al abrir el enlace", async () => {
    const html = await ejs.renderFile("src/views/asistencia.ejs", {
        title: "Confirmar asistencia - Muni Sport",
        actividad: { nombre: "Taller de fútbol", fecha: "2026-11-15T10:00:00-03:00", lugar: "Talca" },
        estado: "pendiente",
        token: "A".repeat(43),
        csrfToken: "csrf-test",
        isResident: false,
        residentProfile: null,
        isOrganizer: false,
        organizerProfile: null,
        organizerEmail: "",
        mapaLeaflet: false
    });

    assert.match(html, /name="respuesta" value="si"/);
    assert.match(html, /name="respuesta" value="no"/);
    assert.match(html, /Si no respondes, tu inscripción seguirá reservada/);
});
