import { createClient } from "@supabase/supabase-js";
import { csrfTokenPara } from "./organizador.js";

function crearClienteVecinal(req) {
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
    const nombreCompleto = typeof metadatos.full_name === "string" && metadatos.full_name.trim()
        ? metadatos.full_name.trim()
        : (typeof metadatos.name === "string" && metadatos.name.trim()
            ? metadatos.name.trim()
            : (user.email || "Vecina o vecino").split("@")[0]);
    const candidataAvatar = metadatos.avatar_url || metadatos.picture || "";
    let avatarUrl = "";

    if (typeof candidataAvatar === "string" && candidataAvatar.length <= 1000) {
        try {
            const url = new URL(candidataAvatar);
            if (url.protocol === "https:" && !url.username && !url.password) {
                avatarUrl = url.toString();
            }
        } catch {
            // El usuario sigue teniendo avatar de iniciales cuando no hay una URL válida.
        }
    }

    const iniciales = nombreCompleto
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => Array.from(parte)[0] || "")
        .join("")
        .toLocaleUpperCase("es-CL") || "M";

    return {
        userId: user.id,
        email: user.email || "",
        fullName: nombreCompleto,
        initials: iniciales,
        avatarUrl
    };
}

function sesionVecinalDesdeSupabase(session, user) {
    return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        userId: user.id,
        email: user.email,
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

    return { session: sesionVecinalDesdeSupabase(data.session, data.user) };
}

export async function registrarVecino(req, { fullName, email, password, avatarUrl }) {
    const cliente = crearClienteVecinal(req);
    if (!cliente) {
        return { configuracion: false, error: new Error("Supabase no está configurado.") };
    }

    const { data, error } = await cliente.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                ...(avatarUrl ? { avatar_url: avatarUrl } : {})
            }
        }
    });

    if (error) return { configuracion: true, error };
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
