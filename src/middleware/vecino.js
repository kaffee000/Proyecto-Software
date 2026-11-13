import { createClient } from "@supabase/supabase-js";
import { randomInt, timingSafeEqual } from "crypto";
import nodemailer from "nodemailer";
import { csrfTokenPara } from "./organizador.js";

export const PERMISOS_VECINO = Object.freeze({
    crearEventos: false,
    editarEventos: false,
    eliminarEventos: false,
    inscribirse: true,
    guardarFavoritos: true
});

const correosRegistradosEnMemoria = new Set();
const rutsRegistradosEnMemoria = new Set();
const bandejaCodigosEnviados = new Map();

function crearClienteVecinal(req) {
    const config = req?.app?.locals?.supabaseConfig;
    if (!config) return null;

    return createClient(config.url, config.key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });
}

//Normalizacion y validacion de RUT usando el algoritmo Módulo 11.
export function validarRutChileno(rutInput) {
    if (typeof rutInput !== "string") {
        return { valido: false, rutNormalizado: "", error: "Ingresa tu RUT." };
    }

    const limpio = rutInput
        .trim()
        .replace(/\./g, "")
        .replace(/\s+/g, "")
        .toUpperCase();

    if (!limpio) {
        return { valido: false, rutNormalizado: "", error: "El RUT no puede estar en blanco." };
    }

    const sinGuion = limpio.replace(/-/g, "");
    if (!/^\d{7,8}[0-9K]$/.test(sinGuion)) {
        return {
            valido: false,
            rutNormalizado: limpio,
            error: "Ingresa un RUT válido (por ejemplo, 12.345.678-5)."
        };
    }

    const cuerpo = sinGuion.slice(0, -1);
    const dvIngresado = sinGuion.slice(-1);

    if (Number(cuerpo) < 1000000) {
        return {
            valido: false,
            rutNormalizado: `${cuerpo}-${dvIngresado}`,
            error: "Ingresa un RUT válido."
        };
    }

    let suma = 0;
    let multiplicador = 2;
    for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
        suma += Number(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resto = 11 - (suma % 11);
    const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
    const rutNormalizado = `${cuerpo}-${dvIngresado}`;

    if (dvIngresado !== dvEsperado) {
        return {
            valido: false,
            rutNormalizado,
            error: "El RUT ingresado no es válido (dígito verificador incorrecto)."
        };
    }

    return { valido: true, rutNormalizado, error: null };
}


//Verifica que un nombre o apellido no este en blanco y contenga caracteres validos
export function validarTextoNombre(valor, etiqueta = "El nombre") {
    if (typeof valor !== "string") {
        return { valido: false, valorNormalizado: "", error: `${etiqueta} no puede estar en blanco.` };
    }

    const limpio = valor.replace(/\s+/g, " ").trim();
    if (!limpio) {
        return { valido: false, valorNormalizado: "", error: `${etiqueta} no puede estar en blanco.` };
    }

    if (limpio.length > 60) {
        return {
            valido: false,
            valorNormalizado: limpio,
            error: `${etiqueta} debe tener hasta 60 caracteres.`
        };
    }

    if (!/^[\p{L}\p{M}'\- ]+$/u.test(limpio) || !/\p{L}/u.test(limpio)) {
        return {
            valido: false,
            valorNormalizado: limpio,
            error: `${etiqueta} solo debe contener letras.`
        };
    }

    return { valido: true, valorNormalizado: limpio, error: null };
}


//Verifica que el numero de telefono empiece por 9 y tenga exactamente 9 digitos
export function validarTelefonoVecino(telefonoInput) {
    if (typeof telefonoInput !== "string" && typeof telefonoInput !== "number") {
        return {
            valido: false,
            telefonoNormalizado: "",
            error: "Digite un numero valido porfavor."
        };
    }

    const limpio = String(telefonoInput).trim().replace(/\s+/g, "");
    if (!/^9\d{8}$/.test(limpio)) {
        return {
            valido: false,
            telefonoNormalizado: limpio,
            error: "Digite un numero valido porfavor."
        };
    }

    return { valido: true, telefonoNormalizado: limpio, error: null };
}


//Verificacion del correo electronico, que siga una estructura real
export function validarCorreoReal(correoInput) {
    if (typeof correoInput !== "string") {
        return { valido: false, correoNormalizado: "", error: "Ingresa un correo electrónico válido." };
    }

    const limpio = correoInput.trim().toLowerCase();
    if (!limpio || limpio.length > 254) {
        return { valido: false, correoNormalizado: limpio, error: "Ingresa un correo electrónico válido." };
    }

    const partes = limpio.split("@");
    if (partes.length !== 2) {
        return { valido: false, correoNormalizado: limpio, error: "Ingresa un correo electrónico válido." };
    }

    const [local, dominio] = partes;
    if (
        !local ||
        local.length > 64 ||
        local.startsWith(".") ||
        local.endsWith(".") ||
        local.includes("..") ||
        !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)
    ) {
        return { valido: false, correoNormalizado: limpio, error: "Ingresa un correo electrónico válido." };
    }

    if (!dominio || dominio.length > 253 || dominio.includes("..")) {
        return { valido: false, correoNormalizado: limpio, error: "Ingresa un correo electrónico válido." };
    }

    const etiquetasDominio = dominio.split(".");
    if (etiquetasDominio.length < 2) {
        return { valido: false, correoNormalizado: limpio, error: "Ingresa un correo electrónico válido." };
    }

    const etiquetasValidas = etiquetasDominio.every(
        (etiqueta) => etiqueta.length >= 1 &&
            etiqueta.length <= 63 &&
            /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(etiqueta)
    );
    const tld = etiquetasDominio[etiquetasDominio.length - 1];
    const tldValido = /^[a-z]{2,24}$/i.test(tld);

    if (!etiquetasValidas || !tldValido) {
        return { valido: false, correoNormalizado: limpio, error: "Ingresa un correo electrónico válido." };
    }

    return { valido: true, correoNormalizado: limpio, error: null };
}

export function registrarIdentidadVecinoEnMemoria({ email, rut } = {}) {
    if (typeof email === "string" && email.trim()) {
        correosRegistradosEnMemoria.add(email.trim().toLowerCase());
    }
    if (typeof rut === "string" && rut.trim()) {
        const validacionRut = validarRutChileno(rut);
        rutsRegistradosEnMemoria.add(
            validacionRut.valido ? validacionRut.rutNormalizado : rut.trim().toUpperCase()
        );
    }
}

export function limpiarRegistroVecinosEnMemoria() {
    correosRegistradosEnMemoria.clear();
    rutsRegistradosEnMemoria.clear();
    bandejaCodigosEnviados.clear();
}

export function estaCorreoRegistradoEnMemoria(email) {
    if (typeof email !== "string" || !email.trim()) return false;
    return correosRegistradosEnMemoria.has(email.trim().toLowerCase());
}


//Valida todos los campos requeridos antes de permitir el registro del usuario vecino
export function validarDatosRegistroVecino(
    entrada = {},
    { correosRegistrados = null, rutsRegistrados = null, exigirPassword = false } = {}
) {
    const errores = [];

    const resultadoRut = validarRutChileno(entrada.rut ?? "");
    const resultadoNombre = validarTextoNombre(entrada.primerNombre ?? "", "El primer nombre");
    const resultadoPaterno = validarTextoNombre(entrada.apellidoPaterno ?? "", "El apellido paterno");
    const resultadoMaterno = validarTextoNombre(entrada.apellidoMaterno ?? "", "El apellido materno");
    const resultadoTelefono = validarTelefonoVecino(entrada.telefono ?? "");
    const correoEntrada = entrada.email !== undefined ? entrada.email : (entrada.correo ?? "");
    const resultadoCorreo = validarCorreoReal(correoEntrada);

    if (!resultadoRut.valido) errores.push(resultadoRut.error);
    if (!resultadoNombre.valido) errores.push(resultadoNombre.error);
    if (!resultadoPaterno.valido) errores.push(resultadoPaterno.error);
    if (!resultadoMaterno.valido) errores.push(resultadoMaterno.error);
    if (!resultadoTelefono.valido) errores.push(resultadoTelefono.error);
    if (!resultadoCorreo.valido) errores.push(resultadoCorreo.error);

    if (resultadoCorreo.valido) {
        const setCorreos = correosRegistrados instanceof Set
            ? new Set(Array.from(correosRegistrados, (c) => String(c).trim().toLowerCase()))
            : Array.isArray(correosRegistrados)
                ? new Set(correosRegistrados.map((c) => String(c).trim().toLowerCase()))
                : null;

        const yaExisteCorreo = (setCorreos && setCorreos.has(resultadoCorreo.correoNormalizado)) ||
            correosRegistradosEnMemoria.has(resultadoCorreo.correoNormalizado);

        if (yaExisteCorreo) {
            errores.push("El correo electrónico ya se encuentra registrado por otro usuario.");
        }
    }

    if (resultadoRut.valido) {
        const setRuts = rutsRegistrados instanceof Set
            ? new Set(Array.from(rutsRegistrados, (r) => String(r).trim().toUpperCase()))
            : Array.isArray(rutsRegistrados)
                ? new Set(rutsRegistrados.map((r) => String(r).trim().toUpperCase()))
                : null;

        const yaExisteRut = (setRuts && setRuts.has(resultadoRut.rutNormalizado)) ||
            rutsRegistradosEnMemoria.has(resultadoRut.rutNormalizado);

        if (yaExisteRut) {
            errores.push("El RUT ya se encuentra registrado por otro usuario.");
        }
    }

    const password = typeof entrada.password === "string" ? entrada.password : "";
    const passwordConfirmation = typeof entrada.passwordConfirmation === "string" ? entrada.passwordConfirmation : "";
    if (exigirPassword || entrada.password !== undefined || entrada.passwordConfirmation !== undefined) {
        if (password.length < 8 || password.length > 72) {
            errores.push("La contraseña debe tener entre 8 y 72 caracteres.");
        }
        if (entrada.passwordConfirmation !== undefined && password !== passwordConfirmation) {
            errores.push("Las contraseñas no coinciden.");
        }
    }

    const avatarUrl = typeof entrada.avatarUrl === "string" ? entrada.avatarUrl.trim() : "";
    if (avatarUrl) {
        try {
            const avatar = new URL(avatarUrl);
            if (avatar.protocol !== "https:" || avatar.username || avatar.password || avatarUrl.length > 1000) {
                errores.push("La foto de perfil debe tener una URL HTTPS válida.");
            }
        } catch {
            errores.push("La foto de perfil debe tener una URL HTTPS válida.");
        }
    }

    const fullName = [
        resultadoNombre.valorNormalizado,
        resultadoPaterno.valorNormalizado,
        resultadoMaterno.valorNormalizado
    ].filter(Boolean).join(" ");

    return {
        valido: errores.length === 0,
        errores,
        datos: {
            rut: resultadoRut.rutNormalizado,
            primerNombre: resultadoNombre.valorNormalizado,
            apellidoPaterno: resultadoPaterno.valorNormalizado,
            apellidoMaterno: resultadoMaterno.valorNormalizado,
            fullName,
            telefono: resultadoTelefono.telefonoNormalizado,
            email: resultadoCorreo.correoNormalizado,
            avatarUrl
        }
    };
}


//Construye la entidad estructurada del usuario "vecino"
export function crearEstructuraVecino(datos = {}) {
    const primerNombre = typeof datos.primerNombre === "string" ? datos.primerNombre.trim() : "";
    const apellidoPaterno = typeof datos.apellidoPaterno === "string" ? datos.apellidoPaterno.trim() : "";
    const apellidoMaterno = typeof datos.apellidoMaterno === "string" ? datos.apellidoMaterno.trim() : "";
    const nombreCompuesto = [primerNombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");
    const fullName = nombreCompuesto ||
        (typeof datos.fullName === "string" && datos.fullName.trim() ? datos.fullName.trim() : "Vecina o vecino");

    const iniciales = [primerNombre, apellidoPaterno]
        .filter(Boolean)
        .map((parte) => Array.from(parte)[0] || "")
        .join("")
        .toLocaleUpperCase("es-CL") ||
        fullName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((parte) => Array.from(parte)[0] || "")
            .join("")
            .toLocaleUpperCase("es-CL") ||
        "V";

    return {
        userId: datos.userId || null,
        role: "vecino",
        rut: datos.rut || "",
        primerNombre,
        apellidoPaterno,
        apellidoMaterno,
        fullName,
        telefono: datos.telefono || "",
        email: typeof datos.email === "string" ? datos.email.trim().toLowerCase() : "",
        emailVerified: Boolean(datos.emailVerified),
        initials: iniciales,
        avatarUrl: datos.avatarUrl || "",
        permisos: PERMISOS_VECINO
    };
}


//Verifica que el usuario con rol "vecino" no pueda crear ni editar eventos
export function puedeGestionarEventosVecino(usuario) {
    if (!usuario || usuario.role === "vecino") {
        return false;
    }
    return Boolean(usuario.permisos?.crearEventos && usuario.permisos?.editarEventos);
}


//Genera un codigo numerico aleatorio de 4 digitos
export function generarCodigoVerificacion() {
    return String(randomInt(0, 10000)).padStart(4, "0");
}


//Crea la verificacion por correo de 4 digitos previo a completar el registro
export function crearDesafioVerificacionCorreo(
    datos,
    { codigo = generarCodigoVerificacion(), ahora = Date.now(), ttlMs = 10 * 60 * 1000 } = {}
) {
    const codigoNormalizado = String(codigo).trim();
    if (!/^\d{4}$/.test(codigoNormalizado)) {
        throw new Error("El código de verificación debe tener exactamente 4 dígitos.");
    }

    return {
        email: String(datos.email || datos.correo || "").trim().toLowerCase(),
        codigo: codigoNormalizado,
        datos: { ...datos },
        createdAt: ahora,
        expiresAt: ahora + ttlMs,
        intentos: 0,
        maxIntentos: 5,
        verificado: false
    };
}

//Verifica el codigo de 4 digitos ingresado por el vecino
export function verificarCodigoCorreo(desafio, codigoIngresado, { ahora = Date.now() } = {}) {
    if (!desafio || typeof desafio.codigo !== "string") {
        return {
            valido: false,
            error: "No hay una verificación pendiente. Completa tus datos nuevamente."
        };
    }

    if (ahora > desafio.expiresAt) {
        return {
            valido: false,
            expirado: true,
            error: "El código de verificación venció. Solicita un nuevo código."
        };
    }

    if (desafio.intentos >= (desafio.maxIntentos || 5)) {
        return {
            valido: false,
            bloqueado: true,
            error: "Superaste el número máximo de intentos. Solicita un nuevo código de 4 dígitos."
        };
    }

    const limpio = typeof codigoIngresado === "string" || typeof codigoIngresado === "number"
        ? String(codigoIngresado).trim()
        : "";

    if (!/^\d{4}$/.test(limpio)) {
        desafio.intentos += 1;
        return {
            valido: false,
            error: "Ingresa el código de verificación de 4 dígitos enviado a tu correo."
        };
    }

    const esperadoBuf = Buffer.from(desafio.codigo, "utf8");
    const recibidoBuf = Buffer.from(limpio, "utf8");
    const coincide = esperadoBuf.length === recibidoBuf.length && timingSafeEqual(esperadoBuf, recibidoBuf);

    if (!coincide) {
        desafio.intentos += 1;
        return {
            valido: false,
            error: "El código de verificación es incorrecto. Revisa tu correo e inténtalo nuevamente."
        };
    }

    desafio.verificado = true;
    return { valido: true, error: null };
}


//Envia el codigo de verificación de 4 digitos al correo del vecino
export async function enviarCodigoVerificacionCorreo(
    { email, primerNombre, codigo },
    { transporte = null } = {}
) {
    const validacionCorreo = validarCorreoReal(email);
    if (!validacionCorreo.valido) {
        throw new Error(validacionCorreo.error);
    }

    const codigoTexto = String(codigo ?? "").trim();
    if (!/^\d{4}$/.test(codigoTexto)) {
        throw new Error("El código de verificación debe tener 4 dígitos.");
    }

    const nombreSaludo = typeof primerNombre === "string" && primerNombre.trim()
        ? primerNombre.trim()
        : "vecino/a";
    const asunto = `Tu código de verificación Muni Sport: ${codigoTexto}`;
    const mensaje = [
        `Hola ${nombreSaludo},`,
        "",
        `Tu código de verificación de 4 dígitos para confirmar tu correo en Muni Sport es: ${codigoTexto}`,
        "",
        "Este código tiene una validez de 10 minutos."
    ].join("\n");

    const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px;">
            <h2 style="margin-top: 0; color: #191919;">Muni Sport · Talca</h2>
            <p style="color: #444; line-height: 1.5;">Hola <strong>${nombreSaludo}</strong>,</p>
            <p style="color: #444; line-height: 1.5;">Usa el siguiente código de verificación de 4 dígitos para confirmar tu correo electrónico y finalizar tu registro vecinal:</p>
            <div style="margin: 24px 0; padding: 16px; background: #fff1f2; border: 1px solid #ffe1e4; border-radius: 12px; text-align: center;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #c92f3c;">${codigoTexto}</span>
            </div>
            <p style="color: #686868; font-size: 12px;">Este código vence en 10 minutos. Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
        </div>
    `;

    const registroEnvio = {
        destinatario: validacionCorreo.correoNormalizado,
        codigo: codigoTexto,
        asunto,
        mensaje,
        enviadoEn: new Date().toISOString()
    };

    if (typeof transporte === "function") {
        await transporte(registroEnvio);
        bandejaCodigosEnviados.set(registroEnvio.destinatario, registroEnvio);
        return { enviado: true, modo: "personalizado", ...registroEnvio };
    }

    const smtpUser = typeof process.env.SMTP_USER === "string" ? process.env.SMTP_USER.trim() : "";
    const smtpPass = typeof process.env.SMTP_PASS === "string" ? process.env.SMTP_PASS.replace(/\s+/g, "") : "";
    const smtpHost = (typeof process.env.SMTP_HOST === "string" && process.env.SMTP_HOST.trim())
        ? process.env.SMTP_HOST.trim()
        : "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpFrom = (typeof process.env.SMTP_FROM === "string" && process.env.SMTP_FROM.trim())
        ? process.env.SMTP_FROM.trim()
        : `Muni Sport Talca <${smtpUser}>`;

    if (smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        await transporter.sendMail({
            from: smtpFrom,
            to: registroEnvio.destinatario,
            subject: asunto,
            text: mensaje,
            html
        });

        bandejaCodigosEnviados.set(registroEnvio.destinatario, registroEnvio);
        return { enviado: true, modo: "smtp", ...registroEnvio };
    }

    if (process.env.SMTP_WEBHOOK_URL) {
        const respuesta = await fetch(process.env.SMTP_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registroEnvio)
        });
        if (!respuesta.ok) {
            throw new Error("No se pudo enviar el correo de verificación.");
        }
        bandejaCodigosEnviados.set(registroEnvio.destinatario, registroEnvio);
        return { enviado: true, modo: "webhook", ...registroEnvio };
    }

    bandejaCodigosEnviados.set(registroEnvio.destinatario, registroEnvio);
    if (process.env.NODE_ENV !== "test") {
        console.warn(
            "[Muni Sport Correo] SMTP_USER y SMTP_PASS no están configurados; el código no se envió por correo."
        );
    }

    return {
        enviado: false,
        sinConfigurarSmtp: true,
        modo: "consola",
        ...registroEnvio
    };
}

export function obtenerUltimoCodigoEnviado(email) {
    if (typeof email !== "string" || !email.trim()) return null;
    return bandejaCodigosEnviados.get(email.trim().toLowerCase()) || null;
}


//Consulta si el correo o el RUT ya estan registrados por otro usuario en memoria o en Supabase
export async function verificarDisponibilidadVecino(req, { email, rut }) {
    const correoLimpio = typeof email === "string" ? email.trim().toLowerCase() : "";
    const rutLimpio = typeof rut === "string" ? rut.trim().toUpperCase() : "";
    const errores = [];

    let correoRegistrado = correoLimpio ? correosRegistradosEnMemoria.has(correoLimpio) : false;
    let rutRegistrado = rutLimpio ? rutsRegistradosEnMemoria.has(rutLimpio) : false;

    const cliente = crearClienteVecinal(req);
    if (cliente && (!correoRegistrado || !rutRegistrado)) {
        try {
            const { data, error } = await cliente.rpc("verificar_disponibilidad_vecino", {
                p_correo: correoLimpio,
                p_rut: rutLimpio
            });

            if (!error && data) {
                if (data.correo_registrado) correoRegistrado = true;
                if (data.rut_registrado) rutRegistrado = true;
            }
        } catch {
            // Si la migracion aún no esta aplicada en Supabase, continua con la validacion local y de signUp.
        }
    }

    if (correoRegistrado) {
        errores.push("El correo electrónico ya se encuentra registrado por otro usuario.");
    }
    if (rutRegistrado) {
        errores.push("El RUT ya se encuentra registrado por otro usuario.");
    }

    return {
        disponible: errores.length === 0,
        correoRegistrado,
        rutRegistrado,
        errores
    };
}

function perfilDesdeUsuario(user) {
    const metadatos = user.user_metadata || {};
    const primerNombre = typeof metadatos.primer_nombre === "string" ? metadatos.primer_nombre.trim() : "";
    const apellidoPaterno = typeof metadatos.apellido_paterno === "string" ? metadatos.apellido_paterno.trim() : "";
    const apellidoMaterno = typeof metadatos.apellido_materno === "string" ? metadatos.apellido_materno.trim() : "";
    const rut = typeof metadatos.rut === "string" ? metadatos.rut.trim().toUpperCase() : "";
    const telefono = typeof metadatos.telefono === "string" ? metadatos.telefono.trim() : "";

    const nombrePorPartes = [primerNombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");
    const nombreCompleto = nombrePorPartes ||
        (typeof metadatos.full_name === "string" && metadatos.full_name.trim()
            ? metadatos.full_name.trim()
            : (typeof metadatos.name === "string" && metadatos.name.trim()
                ? metadatos.name.trim()
                : (user.email || "Vecina o vecino").split("@")[0]));

    const candidataAvatar = metadatos.avatar_url || metadatos.picture || "";
    let avatarUrl = "";

    if (typeof candidataAvatar === "string" && candidataAvatar.length <= 1000) {
        try {
            const url = new URL(candidataAvatar);
            if (url.protocol === "https:" && !url.username && !url.password) {
                avatarUrl = url.toString();
            }
        } catch {
            // El usuario sigue teniendo avatar de iniciales cuando no hay una URL valida.
        }
    }

    return crearEstructuraVecino({
        userId: user.id,
        rut,
        primerNombre,
        apellidoPaterno,
        apellidoMaterno,
        fullName: nombreCompleto,
        telefono,
        email: user.email || "",
        emailVerified: Boolean(metadatos.correo_verificado || user.email_confirmed_at),
        avatarUrl
    });
}

function sesionVecinalDesdeSupabase(session, user) {
    return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        userId: user.id,
        email: user.email,
        role: "vecino",
        profile: perfilDesdeUsuario(user)
    };
}

export async function iniciarSesionVecinal(req, email, password) {
    const cliente = crearClienteVecinal(req);
    if (!cliente) {
        return { configuracion: false, error: new Error("Supabase no está configurado.") };
    }

    const { data, error } = await cliente.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
        return { configuracion: true, error: error || new Error("No se pudo iniciar sesión.") };
    }

    registrarIdentidadVecinoEnMemoria({
        email: data.user.email,
        rut: data.user.user_metadata?.rut
    });

    let organizerSession = null;
    try {
        const { data: organizador } = await cliente
            .from("organizadores")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (organizador) {
            organizerSession = {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                userId: data.user.id,
                email: data.user.email,
                profile: perfilDesdeUsuario(data.user)
            };
        }
    } catch {
        // Si falla la consulta de organizador, no impide el inicio de sesión vecinal.
    }

    return {
        session: sesionVecinalDesdeSupabase(data.session, data.user),
        organizerSession,
        isOrganizer: Boolean(organizerSession)
    };
}

export async function registrarVecino(
    req,
    {
        rut,
        primerNombre,
        apellidoPaterno,
        apellidoMaterno,
        telefono,
        fullName,
        email,
        password,
        avatarUrl,
        emailVerified = true
    }
) {
    const cliente = crearClienteVecinal(req);
    if (!cliente) {
        return { configuracion: false, error: new Error("Supabase no está configurado.") };
    }

    const disponibilidad = await verificarDisponibilidadVecino(req, { email, rut });
    if (!disponibilidad.disponible) {
        return {
            configuracion: true,
            duplicado: true,
            error: new Error(disponibilidad.errores[0])
        };
    }

    const nombreCompleto = fullName || [primerNombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ");

    const { data, error } = await cliente.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: "vecino",
                rut,
                primer_nombre: primerNombre,
                apellido_paterno: apellidoPaterno,
                apellido_materno: apellidoMaterno,
                full_name: nombreCompleto,
                telefono,
                correo_verificado: Boolean(emailVerified),
                ...(avatarUrl ? { avatar_url: avatarUrl } : {})
            }
        }
    });

    if (error) {
        const mensajeError = String(error.message || "").toLowerCase();
        if (mensajeError.includes("already registered") || mensajeError.includes("already been registered")) {
            registrarIdentidadVecinoEnMemoria({ email });
            return {
                configuracion: true,
                duplicado: true,
                error: new Error("El correo electrónico ya se encuentra registrado por otro usuario.")
            };
        }
        return { configuracion: true, error };
    }

    // Supabase devuelve identities vacío cuando el correo ya existe y tiene protección contra enumeración.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        registrarIdentidadVecinoEnMemoria({ email });
        return {
            configuracion: true,
            duplicado: true,
            error: new Error("El correo electrónico ya se encuentra registrado por otro usuario.")
        };
    }

    if (data.user) {
        registrarIdentidadVecinoEnMemoria({ email, rut });
    }

    if (data.session && data.user && rut && primerNombre && apellidoPaterno && apellidoMaterno && telefono) {
        try {
            const clienteAutenticado = createClient(
                req.app.locals.supabaseConfig.url,
                req.app.locals.supabaseConfig.key,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                        detectSessionInUrl: false
                    }
                }
            );
            await clienteAutenticado.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            });
            await clienteAutenticado.from("vecinos").upsert(
                {
                    user_id: data.user.id,
                    rut,
                    primer_nombre: primerNombre,
                    apellido_paterno: apellidoPaterno,
                    apellido_materno: apellidoMaterno,
                    telefono,
                    correo: email.toLowerCase(),
                    correo_verificado: Boolean(emailVerified),
                    rol: "vecino"
                },
                { onConflict: "user_id" }
            );
        } catch {
            // El trigger en auth.users tambien sincroniza public.vecinos cuando la migracion esta activa.
        }
    }

    return {
        session: data.session && data.user ? sesionVecinalDesdeSupabase(data.session, data.user) : null,
        user: data.user
    };
}

export async function clienteVecinalDeSesion(req) {
    const sesion = req.session?.residentSession;
    const cliente = crearClienteVecinal(req);
    if (!sesion || !cliente) return null;

    const { data, error } = await cliente.auth.setSession({
        access_token: sesion.access_token,
        refresh_token: sesion.refresh_token
    });
    if (error || !data.session) return null;

    req.session.residentSession = {
        ...sesion,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
    };
    return cliente;
}

export async function requireResident(req, res, next) {
    const esAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest" || req.headers.accept?.includes("application/json");

    if (!req.session?.residentSession) {
        if (esAjax) {
            return res.status(401).json({ ok: false, error: "Debes iniciar sesión.", redirect: `/login?next=${encodeURIComponent(req.originalUrl)}` });
        }
        return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
    }

    try {
        const cliente = await clienteVecinalDeSesion(req);
        if (!cliente) {
            delete req.session.residentSession;
            if (esAjax) {
                return res.status(401).json({ ok: false, error: "Tu sesión venció.", redirect: "/login?expired=1" });
            }
            return res.redirect("/login?expired=1");
        }

        const { data, error } = await cliente.auth.getUser();
        if (error || !data.user) {
            delete req.session.residentSession;
            if (esAjax) {
                return res.status(401).json({ ok: false, error: "Tu sesión venció.", redirect: "/login?expired=1" });
            }
            return res.redirect("/login?expired=1");
        }

        req.session.residentSession = sesionVecinalDesdeSupabase(
            req.session.residentSession,
            data.user
        );
        req.supabaseResident = cliente;
        res.locals.isResident = true;
        res.locals.residentProfile = req.session.residentSession.profile;
        res.locals.csrfToken = csrfTokenPara(req);
        res.set("Cache-Control", "no-store");
        next();
    } catch (error) {
        next(error);
    }
}
