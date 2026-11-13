import assert from "node:assert/strict";
import { createHash } from "crypto";
import test from "node:test";
import { procesarNotificaciones } from "../../src/services/notificaciones.js";

test("procesa aviso de cupo y recordatorio con token de asistencia hasheado", async () => {
    const llamadas = [];
    const supabase = {
        async rpc(nombre, parametros) {
            llamadas.push({ nombre, parametros });
            if (nombre === "reclamar_notificaciones_cupo") {
                return {
                    data: [{
                        notificacion_id: 11,
                        actividad_id: "actividad-1",
                        user_id: "vecino-1",
                        correo: "vecino@example.cl",
                        primer_nombre: "Camila",
                        actividad_nombre: "Taller de fútbol",
                        actividad_fecha: "2026-11-15T10:00:00-03:00",
                        lugar: "Talca",
                        cupos_totales: 10,
                        cupos_ocupados: 9,
                        actividad_estado: "activo",
                        correo_verificado: true,
                        favorito_activo: true,
                        ya_inscrito: false
                    }],
                    error: null
                };
            }
            if (nombre === "listar_recordatorios_asistencia") {
                return { data: [{ actividad_id: "actividad-2", user_id: "vecino-2" }], error: null };
            }
            if (nombre === "reclamar_recordatorio_asistencia") {
                return {
                    data: [{
                        correo: "vecino2@example.cl",
                        primer_nombre: "Diego",
                        actividad_nombre: "Natación",
                        actividad_fecha: "2026-11-15T10:00:00-03:00",
                        lugar: "Piscina municipal"
                    }],
                    error: null
                };
            }
            return { data: null, error: null };
        }
    };
    const avisos = [];
    const recordatorios = [];

    await procesarNotificaciones({
        supabase,
        appUrl: "https://munisport.example",
        logger: { error: assert.fail },
        ahora: () => new Date("2026-11-14T10:00:00.000Z"),
        enviarAviso: async (datos) => {
            avisos.push(datos);
            return { enviado: true };
        },
        enviarRecordatorio: async (datos) => {
            recordatorios.push(datos);
            return { enviado: true };
        }
    });

    assert.equal(avisos.length, 1);
    assert.equal(avisos[0].appUrl, "https://munisport.example");
    assert.equal(avisos[0].actividad.id, "actividad-1");
    assert.equal(recordatorios.length, 1);
    const ruta = new URL(recordatorios[0].enlace);
    const token = ruta.pathname.split("/").at(-1);
    assert.equal(ruta.origin, "https://munisport.example");
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);

    const claim = llamadas.find((llamada) => llamada.nombre === "reclamar_recordatorio_asistencia");
    assert.equal(claim.parametros.p_actividad_id, "actividad-2");
    assert.equal(claim.parametros.p_token_hash, createHash("sha256").update(token).digest("hex"));
    assert.ok(llamadas.some((llamada) => llamada.nombre === "finalizar_notificacion_cupo"
        && llamada.parametros.p_resultado === "enviado"));
    assert.ok(llamadas.some((llamada) => llamada.nombre === "finalizar_recordatorio_asistencia"
        && llamada.parametros.p_enviado === true));
});

test("no manda aviso si ya no hay cupos o la actividad dejó de ser favorita", async () => {
    const llamadas = [];
    let envios = 0;
    const supabase = {
        async rpc(nombre, parametros) {
            llamadas.push({ nombre, parametros });
            if (nombre === "reclamar_notificaciones_cupo") {
                return {
                    data: [{
                        notificacion_id: 12,
                        actividad_id: "actividad-1",
                        user_id: "vecino-1",
                        actividad_estado: "activo",
                        cupos_totales: 10,
                        cupos_ocupados: 10,
                        favorito_activo: false,
                        ya_inscrito: false
                    }],
                    error: null
                };
            }
            return { data: [], error: null };
        }
    };

    await procesarNotificaciones({
        supabase,
        appUrl: "https://munisport.example",
        logger: { error: assert.fail },
        enviarAviso: async () => { envios += 1; return { enviado: true }; },
        enviarRecordatorio: async () => ({ enviado: true })
    });

    assert.equal(envios, 0);
    assert.ok(llamadas.some((llamada) => llamada.nombre === "finalizar_notificacion_cupo"
        && llamada.parametros.p_resultado === "no_disponible"));
});
