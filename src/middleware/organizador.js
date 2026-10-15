import { createClient } from "@supabase/supabase-js";
import { randomBytes, timingSafeEqual } from "crypto";

export function csrfTokenPara(req) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = randomBytes(32).toString("hex");
    }

    return req.session.csrfToken;
}

export function validarCsrf(req, res, next) {
    const esperado = req.session?.csrfToken;
    const recibido = typeof req.body?.csrfToken === "string" ? req.body.csrfToken : "";

    if (!esperado || !recibido) {
        return res.status(403).render("error.ejs", {
            title: "Solicitud no válida - Muni Sport",
            status: 403,
            message: "No pudimos validar este formulario. Vuelve a la página anterior e inténtalo otra vez."
        });
    }

    const esperadoBuffer = Buffer.from(esperado);
    const recibidoBuffer = Buffer.from(recibido);
    if (esperadoBuffer.length !== recibidoBuffer.length || !timingSafeEqual(esperadoBuffer, recibidoBuffer)) {
        return res.status(403).render("error.ejs", {
            title: "Solicitud no válida - Muni Sport",
            status: 403,
            message: "El formulario venció. Vuelve a cargar la página e inténtalo otra vez."
        });
    }

    next();
}

function crearClienteAnonimo(req) {
    const config = req.app.locals.supabaseConfig;
    if (!config) return null;

    return createClient(config.url, config.key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });
}

function perfilDesdeUsuario(user) {
    const metadatos = user.user_metadata || {};
    const fullName = typeof metadatos.full_name === "string" && metadatos.full_name.trim()
        ? metadatos.full_name.trim()
        : (typeof metadatos.name === "string" && metadatos.name.trim()
            ? metadatos.name.trim()
            : (user.email || "Organizador").split("@")[0]);
    const candidataAvatar = metadatos.avatar_url || metadatos.picture || "";
    let avatarUrl = "";

    if (typeof candidataAvatar === "string" && candidataAvatar.length <= 1000) {
        try {
            const url = new URL(candidataAvatar);
            if (url.protocol === "https:" && !url.username && !url.password) {
                avatarUrl = url.toString();
            }
        } catch {
            // Si no hay una URL segura, el encabezado muestra las iniciales.
        }
    }

    const initials = fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => Array.from(parte)[0] || "")
        .join("")
        .toLocaleUpperCase("es-CL") || "O";

    return { userId: user.id, email: user.email || "", fullName, initials, avatarUrl };
}

export async function iniciarSesionOrganizador(req, email, password) {
    const cliente = crearClienteAnonimo(req);
    if (!cliente) {
        return { error: new Error("Supabase no está configurado."), configuracion: false };
    }

    const { data, error } = await cliente.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
        return { error: error || new Error("No se pudo iniciar sesión."), configuracion: true };
    }

    const { data: organizador, error: rolError } = await cliente
        .from("organizadores")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (rolError) {
        await cliente.auth.signOut();
        return { error: rolError, configuracion: true, setup: true };
    }

    if (!organizador) {
        await cliente.auth.signOut();
        return { error: new Error("Esta cuenta no tiene permisos de organización."), sinPermiso: true };
    }

    return {
        session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            userId: data.user.id,
            email: data.user.email,
            profile: perfilDesdeUsuario(data.user)
        }
    };
}

export async function requireOrganizer(req, res, next) {
    if (!req.session?.supabaseSession) {
        const destino = encodeURIComponent(req.originalUrl);
        return res.redirect(`/admin/login?next=${destino}`);
    }

    try {
        const cliente = crearClienteAnonimo(req);
        if (!cliente) {
            return res.status(503).render("admin/actividades.ejs", {
                title: "Gestión de actividades - Muni Sport",
                actividades: [],
                dbError: "Configura Supabase para abrir el panel de actividades.",
                csrfToken: csrfTokenPara(req),
                organizerEmail: req.session.supabaseSession.email
            });
        }

        const { data: sessionData, error: sessionError } = await cliente.auth.setSession({
            access_token: req.session.supabaseSession.access_token,
            refresh_token: req.session.supabaseSession.refresh_token
        });

        if (sessionError || !sessionData.session) {
            delete req.session.supabaseSession;
            return res.redirect("/admin/login?expired=1");
        }

        req.session.supabaseSession = {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
            userId: sessionData.session.user.id,
            email: sessionData.session.user.email,
            profile: perfilDesdeUsuario(sessionData.session.user)
        };

        const { data: userData, error: userError } = await cliente.auth.getUser();
        if (userError || !userData.user) {
            delete req.session.supabaseSession;
            return res.redirect("/admin/login?expired=1");
        }

        const { data: organizador, error: roleError } = await cliente
            .from("organizadores")
            .select("user_id")
            .eq("user_id", userData.user.id)
            .maybeSingle();

        if (roleError || !organizador) {
            delete req.session.supabaseSession;
            return res.status(403).render("error.ejs", {
                title: "Acceso restringido - Muni Sport",
                status: 403,
                message: "Esta cuenta ya no tiene permisos para gestionar actividades."
            });
        }

        req.supabaseOrganizer = cliente;
        res.locals.isOrganizer = true;
        res.locals.organizerEmail = userData.user.email;
        res.locals.organizerProfile = perfilDesdeUsuario(userData.user);
        res.locals.csrfToken = req.session.csrfToken || null;
        next();
    } catch (error) {
        next(error);
    }
}
