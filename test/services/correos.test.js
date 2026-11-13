import assert from "node:assert/strict";
import test from "node:test";
import { enviarConfirmacionInscripcion } from "../../src/services/correos.js";

const variablesCorreo = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_WEBHOOK_URL"];

test("no intenta enviar confirmación cuando SMTP no está configurado", async () => {
    const originales = Object.fromEntries(variablesCorreo.map((nombre) => [nombre, process.env[nombre]]));
    variablesCorreo.forEach((nombre) => delete process.env[nombre]);

    try {
        const resultado = await enviarConfirmacionInscripcion({
            email: "vecina@example.cl",
            primerNombre: "Camila",
            actividad: { nombre: "Taller deportivo", fecha: "2026-11-15T10:00:00-03:00", lugar: "Talca" }
        });

        assert.deepEqual(resultado, { enviado: false, sinConfigurar: true });
    } finally {
        for (const nombre of variablesCorreo) {
            if (originales[nombre] === undefined) delete process.env[nombre];
            else process.env[nombre] = originales[nombre];
        }
    }
});

test("rechaza destinatarios inválidos antes de intentar enviar", async () => {
    await assert.rejects(
        enviarConfirmacionInscripcion({
            email: "correo-invalido",
            actividad: { nombre: "Taller deportivo", fecha: "2026-11-15T10:00:00-03:00", lugar: "Talca" }
        }),
        /No hay un correo vecinal válido/
    );
});
