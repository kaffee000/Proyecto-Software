import { createHash, randomBytes } from "crypto";
import {
    correoConfigurado,
    enviarAvisoCupoFavorito,
    enviarRecordatorioAsistencia
} from "./correos.js";

const INTERVALO_NOTIFICACIONES_MS = 60_000;

function lanzarErrorSiExiste(error, operacion) {
    if (error) throw new Error(operacion + ": " + (error.message || "falló la operación"));
}

async function procesarAvisosDeCupos({ supabase, appUrl, logger, enviarAviso }) {
    const { data: notificaciones, error } = await supabase.rpc("reclamar_notificaciones_cupo", {
        p_limite: 50
    });
    lanzarErrorSiExiste(error, "No se pudo reclamar la cola de cupos");

    for (const notificacion of notificaciones || []) {
        let resultado = "error";
        let detalleError = null;
        try {
            const hayCupos = notificacion.actividad_estado === "activo"
                && Number(notificacion.cupos_ocupados) < Number(notificacion.cupos_totales);
            if (!hayCupos || notificacion.correo_verificado !== true || !notificacion.favorito_activo || notificacion.ya_inscrito) {
                resultado = "no_disponible";
            } else {
                const envio = await enviarAviso({
                    email: notificacion.correo,
                    primerNombre: notificacion.primer_nombre,
                    actividad: {
                        id: notificacion.actividad_id,
                        nombre: notificacion.actividad_nombre,
                        fecha: notificacion.actividad_fecha,
                        lugar: notificacion.lugar
                    },
                    appUrl
                });
                if (!envio.enviado) throw new Error("El correo saliente no está configurado.");
                resultado = "enviado";
            }
        } catch (errorEnvio) {
            detalleError = errorEnvio.message || "No se pudo entregar el correo.";
        }

        const { error: errorFinalizacion } = await supabase.rpc("finalizar_notificacion_cupo", {
            p_notificacion_id: notificacion.notificacion_id,
            p_resultado: resultado,
            p_error: detalleError
        });
        if (errorFinalizacion) {
            logger.error("No se pudo cerrar una notificación de cupo:", errorFinalizacion.message || errorFinalizacion);
        } else if (detalleError) {
            logger.error("No se pudo enviar una notificación de cupo:", detalleError);
        }
    }
}

async function procesarRecordatoriosAsistencia({ supabase, appUrl, logger, ahora, enviarRecordatorio }) {
    const hasta = new Date(ahora().getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data: candidatos, error } = await supabase.rpc("listar_recordatorios_asistencia", {
        p_hasta: hasta
    });
    lanzarErrorSiExiste(error, "No se pudieron buscar los recordatorios de asistencia");

    for (const candidato of candidatos || []) {
        const token = randomBytes(32).toString("base64url");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const { data: reclamado, error: errorReclamo } = await supabase.rpc("reclamar_recordatorio_asistencia", {
            p_actividad_id: candidato.actividad_id,
            p_user_id: candidato.user_id,
            p_token_hash: tokenHash
        });
        lanzarErrorSiExiste(errorReclamo, "No se pudo reclamar un recordatorio de asistencia");

        const datos = Array.isArray(reclamado) ? reclamado[0] : null;
        if (!datos) continue;

        let enviado = false;
        let detalleError = null;
        try {
            const resultado = await enviarRecordatorio({
                email: datos.correo,
                primerNombre: datos.primer_nombre,
                actividad: {
                    nombre: datos.actividad_nombre,
                    fecha: datos.actividad_fecha,
                    lugar: datos.lugar
                },
                enlace: appUrl.replace(/\/$/, "") + "/asistencia/" + token
            });
            if (!resultado.enviado) throw new Error("El correo saliente no está configurado.");
            enviado = true;
        } catch (errorEnvio) {
            detalleError = errorEnvio.message || "No se pudo entregar el correo.";
        }

        const { error: errorFinalizacion } = await supabase.rpc("finalizar_recordatorio_asistencia", {
            p_actividad_id: candidato.actividad_id,
            p_user_id: candidato.user_id,
            p_enviado: enviado,
            p_error: detalleError
        });
        if (errorFinalizacion) {
            logger.error("No se pudo cerrar un recordatorio de asistencia:", errorFinalizacion.message || errorFinalizacion);
        } else if (detalleError) {
            logger.error("No se pudo enviar un recordatorio de asistencia:", detalleError);
        }
    }
}

export async function procesarNotificaciones({
    supabase,
    appUrl,
    logger = console,
    ahora = () => new Date(),
    enviarAviso = enviarAvisoCupoFavorito,
    enviarRecordatorio = enviarRecordatorioAsistencia
}) {
    await procesarAvisosDeCupos({ supabase, appUrl, logger, enviarAviso });
    await procesarRecordatoriosAsistencia({ supabase, appUrl, logger, ahora, enviarRecordatorio });
}

export function iniciarTrabajadorNotificaciones({ supabase, appUrl, logger = console }) {
    if (!supabase || !appUrl || !correoConfigurado()) return null;

    let procesando = false;
    const ejecutar = async () => {
        if (procesando) return;
        procesando = true;
        try {
            await procesarNotificaciones({ supabase, appUrl, logger });
        } catch (error) {
            logger.error("No se pudo procesar la cola de correos vecinales:", error.message || error);
        } finally {
            procesando = false;
        }
    };

    void ejecutar();
    const temporizador = setInterval(() => void ejecutar(), INTERVALO_NOTIFICACIONES_MS);
    temporizador.unref?.();
    return temporizador;
}
