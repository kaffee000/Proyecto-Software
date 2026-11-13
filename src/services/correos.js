import nodemailer from "nodemailer";

function escaparHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[caracter]);
}

function fechaActividad(fecha) {
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) return "Fecha por confirmar";

    return new Intl.DateTimeFormat("es-CL", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Santiago"
    }).format(valor);
}

function configuracionCorreo() {
    const smtpUser = typeof process.env.SMTP_USER === "string" ? process.env.SMTP_USER.trim() : "";
    const smtpPass = typeof process.env.SMTP_PASS === "string" ? process.env.SMTP_PASS.replace(/\s+/g, "") : "";
    const smtpHost = typeof process.env.SMTP_HOST === "string" && process.env.SMTP_HOST.trim()
        ? process.env.SMTP_HOST.trim()
        : "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const from = typeof process.env.SMTP_FROM === "string" && process.env.SMTP_FROM.trim()
        ? process.env.SMTP_FROM.trim()
        : "Muni Sport Talca <" + smtpUser + ">";

    return { smtpUser, smtpPass, smtpHost, smtpPort, from };
}

export function correoConfigurado() {
    const { smtpUser, smtpPass } = configuracionCorreo();
    return Boolean((smtpUser && smtpPass) || process.env.SMTP_WEBHOOK_URL);
}

async function enviarCorreo({ destinatario, asunto, texto, html }) {
    const { smtpUser, smtpPass, smtpHost, smtpPort, from } = configuracionCorreo();

    if (smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 10000,
            socketTimeout: 20000
        });
        await transporter.sendMail({ from, to: destinatario, subject: asunto, text: texto, html });
        return { enviado: true, modo: "smtp" };
    }

    if (process.env.SMTP_WEBHOOK_URL) {
        const response = await fetch(process.env.SMTP_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ destinatario, asunto, mensaje: texto, html })
        });
        if (!response.ok) throw new Error("No se pudo enviar el correo.");
        return { enviado: true, modo: "webhook" };
    }

    return { enviado: false, sinConfigurar: true };
}

export async function enviarConfirmacionInscripcion({ email, primerNombre, actividad }) {
    const destinatario = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
        throw new Error("No hay un correo vecinal válido para la confirmación.");
    }

    const nombre = typeof primerNombre === "string" && primerNombre.trim()
        ? primerNombre.trim()
        : "vecino/a";
    const nombreActividad = typeof actividad?.nombre === "string" && actividad.nombre.trim()
        ? actividad.nombre.trim()
        : "Actividad municipal";
    const lugar = typeof actividad?.lugar === "string" && actividad.lugar.trim()
        ? actividad.lugar.trim()
        : "Recinto por confirmar";
    const fecha = fechaActividad(actividad?.fecha);
    const asunto = "Inscripción confirmada · Muni Sport";
    const texto = [
        "Hola " + nombre + ",",
        "",
        "Tu cupo quedó reservado para " + nombreActividad + ".",
        "Fecha y hora: " + fecha,
        "Lugar: " + lugar,
        "",
        "Te esperamos. Muni Sport · Municipalidad de Talca"
    ].join("\n");
    const html = [
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;color:#191919;">',
        '<p style="margin:0 0 8px;color:#c92f3c;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Muni Sport · Talca</p>',
        '<h1 style="margin:0 0 18px;font-size:26px;line-height:1.15;">Inscripción confirmada</h1>',
        '<p style="line-height:1.6;">Hola <strong>' + escaparHtml(nombre) + '</strong>, tu cupo quedó reservado.</p>',
        '<div style="margin:20px 0;padding:18px;border:1px solid #e5e5e5;border-radius:12px;">',
        '<p style="margin:0 0 10px;font-size:18px;font-weight:700;">' + escaparHtml(nombreActividad) + '</p>',
        '<p style="margin:0 0 6px;color:#555;">' + escaparHtml(fecha) + '</p>',
        '<p style="margin:0;color:#555;">' + escaparHtml(lugar) + '</p>',
        '</div>',
        '<p style="color:#686868;font-size:13px;line-height:1.5;">Te esperamos. Municipalidad de Talca</p>',
        '</div>'
    ].join("");

    return enviarCorreo({ destinatario, asunto, texto, html });
}

export async function enviarAvisoCupoFavorito({ email, primerNombre, actividad, appUrl }) {
    const destinatario = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
        throw new Error("No hay un correo vecinal válido para el aviso de cupo.");
    }

    const nombre = typeof primerNombre === "string" && primerNombre.trim() ? primerNombre.trim() : "vecino/a";
    const nombreActividad = typeof actividad?.nombre === "string" && actividad.nombre.trim()
        ? actividad.nombre.trim()
        : "Actividad municipal";
    const lugar = typeof actividad?.lugar === "string" && actividad.lugar.trim()
        ? actividad.lugar.trim()
        : "Recinto por confirmar";
    const fecha = fechaActividad(actividad?.fecha);
    const enlace = appUrl.replace(/\/$/, "") + "/inscripciones/" + encodeURIComponent(actividad.id);
    const asunto = "Hay cupos disponibles en una actividad favorita · Muni Sport";
    const texto = [
        "Hola " + nombre + ",",
        "",
        "Se liberó un cupo en la actividad que guardaste en favoritos:",
        nombreActividad,
        "Fecha y hora: " + fecha,
        "Lugar: " + lugar,
        "",
        "El cupo no se reserva automáticamente. Si todavía está disponible, inscríbete desde este enlace:",
        enlace
    ].join("\n");
    const html = [
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;color:#191919;">',
        '<p style="margin:0 0 8px;color:#c92f3c;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Muni Sport · Talca</p>',
        '<h1 style="margin:0 0 18px;font-size:26px;line-height:1.15;">Se liberó un cupo</h1>',
        '<p style="line-height:1.6;">Hola <strong>' + escaparHtml(nombre) + '</strong>, hay disponibilidad en una actividad que guardaste en favoritos.</p>',
        '<div style="margin:20px 0;padding:18px;border:1px solid #e5e5e5;border-radius:12px;">',
        '<p style="margin:0 0 10px;font-size:18px;font-weight:700;">' + escaparHtml(nombreActividad) + '</p>',
        '<p style="margin:0 0 6px;color:#555;">' + escaparHtml(fecha) + '</p>',
        '<p style="margin:0;color:#555;">' + escaparHtml(lugar) + '</p>',
        '</div>',
        '<p style="line-height:1.6;">El cupo no se reserva automáticamente y puede ocuparse. Confirma tu inscripción en la cartelera.</p>',
        '<p><a href="' + escaparHtml(enlace) + '" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#c92f3c;color:#fff;text-decoration:none;font-weight:700;">Ver actividad</a></p>',
        '</div>'
    ].join("");

    return enviarCorreo({ destinatario, asunto, texto, html });
}

export async function enviarRecordatorioAsistencia({ email, primerNombre, actividad, enlace }) {
    const destinatario = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
        throw new Error("No hay un correo vecinal válido para el recordatorio.");
    }

    const nombre = typeof primerNombre === "string" && primerNombre.trim() ? primerNombre.trim() : "vecino/a";
    const nombreActividad = typeof actividad?.nombre === "string" && actividad.nombre.trim()
        ? actividad.nombre.trim()
        : "Actividad municipal";
    const lugar = typeof actividad?.lugar === "string" && actividad.lugar.trim()
        ? actividad.lugar.trim()
        : "Recinto por confirmar";
    const fecha = fechaActividad(actividad?.fecha);
    const asunto = "Confirma tu asistencia de mañana · Muni Sport";
    const texto = [
        "Hola " + nombre + ",",
        "",
        "Mañana tienes una actividad reservada:",
        nombreActividad,
        "Fecha y hora: " + fecha,
        "Lugar: " + lugar,
        "",
        "Confirma si asistirás o libera tu cupo desde este enlace:",
        enlace,
        "",
        "Si no respondes, tu inscripción seguirá reservada."
    ].join("\n");
    const html = [
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;color:#191919;">',
        '<p style="margin:0 0 8px;color:#c92f3c;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Muni Sport · Talca</p>',
        '<h1 style="margin:0 0 18px;font-size:26px;line-height:1.15;">¿Asistirás mañana?</h1>',
        '<p style="line-height:1.6;">Hola <strong>' + escaparHtml(nombre) + '</strong>, recuerda confirmar si asistirás a la actividad que reservaste.</p>',
        '<div style="margin:20px 0;padding:18px;border:1px solid #e5e5e5;border-radius:12px;">',
        '<p style="margin:0 0 10px;font-size:18px;font-weight:700;">' + escaparHtml(nombreActividad) + '</p>',
        '<p style="margin:0 0 6px;color:#555;">' + escaparHtml(fecha) + '</p>',
        '<p style="margin:0;color:#555;">' + escaparHtml(lugar) + '</p>',
        '</div>',
        '<p style="line-height:1.6;">Desde el siguiente enlace puedes confirmar tu asistencia. Si eliges que no asistirás, el cupo quedará disponible para otros vecinos. Si no respondes, tu cupo seguirá reservado.</p>',
        '<p><a href="' + escaparHtml(enlace) + '" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#c92f3c;color:#fff;text-decoration:none;font-weight:700;">Confirmar asistencia</a></p>',
        '</div>'
    ].join("");

    return enviarCorreo({ destinatario, asunto, texto, html });
}
