import { Router } from "express";
import {
    csrfTokenPara,
    iniciarSesionOrganizador,
    requireOrganizer,
    validarCsrf
} from "../middleware/organizador.js";
import {
    clienteVecinalDeSesion,
    iniciarSesionVecinal,
    registrarVecino,
    requireResident
} from "../middleware/vecino.js";
import {
    convertirYGuardarImagenWebp,
    normalizarRutaImagenWebp,
    procesarSubidaImagen
} from "../middleware/imagenes.js";

const router = Router();

const categorias = new Map([
    ["deportes", "Deportes"],
    ["salud", "Salud"],
    ["sociales", "Sociales"]
]);
const categoriasPermitidas = new Set(["Deportes", "Salud", "Sociales"]);
const estadosPermitidos = new Set(["activo", "pausado", "finalizado", "cancelado"]);
const idValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function obtenerActividades(supabase, categoria) {
    if (!supabase) {
        throw new Error("Supabase no está configurado.");
    }

    let consulta = supabase
        .from("actividades")
        .select("id,nombre,descripcion,categoria,fecha,lugar,cupos_totales,cupos_ocupados,estado,imagen")
        .order("fecha", { ascending: true });

    const categoriaNormalizada = categorias.get(categoria.toLowerCase());
    if (categoria.toLowerCase() !== "todas") {
        consulta = consulta.eq("categoria", categoriaNormalizada || categoria);
    }

    const { data, error } = await consulta;
    if (error) {
        throw error;
    }

    return (data || []).map((item) => ({
        ...item,
        imagen: normalizarRutaImagenWebp(item.imagen)
    }));
}

function normalizarTextoBusqueda(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es-CL");
}

function destinoVecinalSeguro(value, fallback = "/") {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
        return fallback;
    }

    try {
        const destino = new URL(value, "http://munisport.local");
        if (destino.origin !== "http://munisport.local") return fallback;
        const rutaInscripcion = /^\/inscripciones\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(destino.pathname);
        if (!["/", "/event", "/favoritos", "/inscripciones"].includes(destino.pathname) && !rutaInscripcion) return fallback;
        return `${destino.pathname}${destino.search}${destino.hash}`;
    } catch {
        return fallback;
    }
}

function guardarSesionVecinal(req, res, next, session, destination, organizerSession = null) {
    const sesionOrganizador = organizerSession || req.session?.supabaseSession;
    req.session.regenerate((sessionError) => {
        if (sessionError) return next(sessionError);

        if (sesionOrganizador) {
            req.session.supabaseSession = sesionOrganizador;
        }
        req.session.residentSession = session;
        req.session.organizerChecked = true;
        req.session.csrfToken = csrfTokenPara(req);
        req.session.save((saveError) => {
            if (saveError) return next(saveError);
            res.redirect(303, destination);
        });
    });
}

async function obtenerEstadoVecinal(req) {
    if (!req.session?.residentSession) return { favoriteIds: [], enrolledIds: [] };

    try {
        const cliente = await clienteVecinalDeSesion(req);
        if (!cliente) return { favoriteIds: [], enrolledIds: [] };

        const [favoritosResult, inscripcionesResult] = await Promise.all([
            cliente.from("actividad_favoritos").select("actividad_id"),
            cliente.from("inscripciones").select("actividad_id")
        ]);

        const favoriteIds = !favoritosResult.error && favoritosResult.data
            ? favoritosResult.data.map((favorito) => favorito.actividad_id)
            : [];
        const enrolledIds = !inscripcionesResult.error && inscripcionesResult.data
            ? inscripcionesResult.data.map((inscripcion) => inscripcion.actividad_id)
            : [];

        if (favoritosResult.error) {
            console.error("No se pudieron consultar los favoritos vecinales:", favoritosResult.error.message || favoritosResult.error);
        }
        if (inscripcionesResult.error) {
            console.error("No se pudieron consultar las inscripciones vecinales:", inscripcionesResult.error.message || inscripcionesResult.error);
        }

        return { favoriteIds, enrolledIds };
    } catch (error) {
        console.error("No se pudo consultar el estado vecinal:", error.message || error);
        return { favoriteIds: [], enrolledIds: [] };
    }
}

async function renderizarCatalogo(req, res, vista, title) {
    const categoria = typeof req.query.categoria === "string"
        ? req.query.categoria
        : "todas";
    const buscar = typeof req.query.buscar === "string"
        ? req.query.buscar.trim().slice(0, 100)
        : "";
    const csrfToken = (req.session?.residentSession || req.session?.supabaseSession)
        ? csrfTokenPara(req)
        : null;

    try {
        let actividades = await obtenerActividades(req.app.locals.supabase, categoria);
        if (buscar) {
            const terminos = normalizarTextoBusqueda(buscar);
            actividades = actividades.filter((actividad) => normalizarTextoBusqueda([
                actividad.nombre,
                actividad.descripcion,
                actividad.categoria,
                actividad.lugar
            ].filter(Boolean).join(" ")).includes(terminos));
        }
        const { favoriteIds, enrolledIds } = await obtenerEstadoVecinal(req);
        res.render(vista, {
            title,
            actividades,
            categoria,
            buscar,
            favoriteIds,
            enrolledIds,
            csrfToken,
            currentPath: req.originalUrl,
            favoritoError: req.query.error === "guardar",
            reintentarUrl: req.originalUrl,
            catalogoError: false
        });
    } catch (error) {
        console.error("Error consultando actividades en Supabase:", error.message || error);
        res.status(503).render(vista, {
            title,
            actividades: [],
            categoria,
            buscar,
            favoriteIds: [],
            enrolledIds: [],
            csrfToken,
            currentPath: req.originalUrl,
            favoritoError: req.query.error === "guardar",
            reintentarUrl: req.originalUrl,
            catalogoError: true
        });
    }
}

function formatDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value || "";

    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function fechaLocalTalcaAISO(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;

    const targetAsUtc = Date.parse(`${value}:00Z`);
    if (!Number.isFinite(targetAsUtc)) return null;

    let timestamp = targetAsUtc;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }).formatToParts(new Date(timestamp));
        const part = (type) => Number(parts.find((item) => item.type === type)?.value);
        const equivalentLocalAsUtc = Date.UTC(
            part("year"), part("month") - 1, part("day"),
            part("hour"), part("minute"), part("second")
        );
        timestamp = targetAsUtc - (equivalentLocalAsUtc - timestamp);
    }

    const result = new Date(timestamp);
    return formatDateTimeLocal(result.toISOString()) === value ? result.toISOString() : null;
}

function actividadDesdeFormulario(body) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const descripcion = typeof body.descripcion === "string" ? body.descripcion.trim() : "";
    const categoria = typeof body.categoria === "string" ? body.categoria : "";
    const fecha = fechaLocalTalcaAISO(body.fechaLocal);
    const lugar = typeof body.lugar === "string" ? body.lugar.trim() : "";
    const cuposTotalesTexto = typeof body.cuposTotales === "string" ? body.cuposTotales.trim() : "";
    const cuposTotales = /^\d+$/.test(cuposTotalesTexto) ? Number(cuposTotalesTexto) : NaN;
    const estado = typeof body.estado === "string" ? body.estado : "";
    const imagen = typeof body.imagen === "string" ? body.imagen.trim() : "";
    const errores = [];

    if (!nombre || nombre.length > 120) errores.push("El nombre es obligatorio y debe tener hasta 120 caracteres.");
    if (!descripcion || descripcion.length > 2000) errores.push("La descripción es obligatoria y debe tener hasta 2.000 caracteres.");
    if (!categoriasPermitidas.has(categoria)) errores.push("Elige una categoría válida.");
    if (!fecha) errores.push("Indica una fecha y hora válidas para Talca.");
    if (!lugar || lugar.length > 180) errores.push("El lugar es obligatorio y debe tener hasta 180 caracteres.");
    if (!Number.isSafeInteger(cuposTotales) || cuposTotales < 0 || cuposTotales > 1000000) {
        errores.push("Indica una capacidad total entre 0 y 1.000.000 cupos.");
    }
    if (!estadosPermitidos.has(estado)) errores.push("Elige un estado válido.");

    let imagenSegura = null;
    if (imagen) {
        if (imagen.startsWith("/images/") && !imagen.includes("..")) {
            imagenSegura = normalizarRutaImagenWebp(imagen);
        } else {
            try {
                const url = new URL(imagen);
                if (url.protocol === "https:" && !url.username && !url.password) {
                    imagenSegura = url.toString();
                }
            } catch {
                // El error se explica junto al campo para que el organizador pueda corregirlo.
            }
        }
        if (!imagenSegura) errores.push("La imagen debe ser una ruta local de /images o una dirección HTTPS.");
    }

    return {
        errores,
        actividad: {
            nombre,
            descripcion,
            categoria,
            fecha,
            lugar,
            cupos_totales: cuposTotales,
            estado,
            imagen: imagenSegura
        }
    };
}

function valoresDeFormulario(body = {}) {
    return {
        ...body,
        fechaLocal: typeof body.fechaLocal === "string" ? body.fechaLocal : "",
        cuposTotales: typeof body.cuposTotales === "string" ? body.cuposTotales : "",
        imagen: typeof body.imagen === "string" ? body.imagen : ""
    };
}

async function renderFormularioActividad(req, res, { activity = {}, editing = false, errors = [], status = 200 }) {
    return res.status(status).render("admin/actividad-form.ejs", {
        title: editing ? "Editar actividad - Muni Sport" : "Nueva actividad - Muni Sport",
        activity: {
            ...activity,
            fechaLocal: activity.fechaLocal || formatDateTimeLocal(activity.fecha),
            imagen: normalizarRutaImagenWebp(activity.imagen)
        },
        editing,
        errors,
        csrfToken: csrfTokenPara(req)
    });
}

function adminNext(value) {
    return typeof value === "string" && value.startsWith("/admin/actividades") && !value.startsWith("//")
        ? value
        : "/admin/actividades";
}

// Página principal con catálogo de actividades cargado desde Supabase.
router.get("/", (req, res) => renderizarCatalogo(
    req,
    res,
    "index.ejs",
    "Muni Sport - Portal Comunitario de Actividades en Talca"
));

// Catálogo de eventos y actividades.
router.get("/event", (req, res) => renderizarCatalogo(
    req,
    res,
    "event.ejs",
    "Catálogo de Actividades - Muni Sport"
));

router.get("/contact", (req, res) => res.render("contact.ejs", {
    title: "Contacto y Atención Ciudadana - Muni Sport"
}));

router.get("/personal", async (req, res) => {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
        return res.render("personal.ejs", {
            title: "Equipo Profesional - Muni Sport",
            profesionales: [],
            dbConnected: false
        });
    }

    try {
        const { data, error } = await supabase
            .from("profesionales")
            .select("nombre,profesion,email")
            .order("nombre", { ascending: true });

        if (error) {
            throw error;
        }

        res.render("personal.ejs", {
            title: "Equipo Profesional - Muni Sport",
            profesionales: data || [],
            dbConnected: true
        });
    } catch (error) {
        console.error("Error obteniendo profesionales desde Supabase:", error.message || error);
        res.render("personal.ejs", {
            title: "Equipo Profesional - Muni Sport",
            profesionales: [],
            dbConnected: false
        });
    }
});

router.get("/sport", (req, res) => res.render("sport.ejs", {
    title: "Disciplinas Deportivas - Muni Sport"
}));

router.get("/login", (req, res) => {
    if (req.session?.residentSession) return res.redirect("/");
    res.set("Cache-Control", "no-store");
    res.render("login.ejs", {
        title: "Acceso Vecinal - Muni Sport",
        csrfToken: csrfTokenPara(req),
        next: destinoVecinalSeguro(req.query.next),
        error: null,
        notice: req.query.registro === "pendiente"
            ? "Te enviamos un correo para confirmar tu cuenta. Después podrás iniciar sesión."
            : req.query.expired === "1"
                ? "Tu sesión venció. Inicia sesión nuevamente para continuar."
                : null
    });
});

router.post("/login", validarCsrf, async (req, res, next) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const destination = destinoVecinalSeguro(req.body.next);

    if (!email || !password) {
        return res.status(400).render("login.ejs", {
            title: "Acceso Vecinal - Muni Sport",
            csrfToken: csrfTokenPara(req),
            next: destination,
            error: "Escribe tu correo y contraseña para continuar.",
            notice: null
        });
    }

    try {
        const result = await iniciarSesionVecinal(req, email, password);
        if (!result.session) {
            return res.status(result.configuracion === false ? 503 : 401).render("login.ejs", {
                title: "Acceso Vecinal - Muni Sport",
                csrfToken: csrfTokenPara(req),
                next: destination,
                error: result.configuracion === false
                    ? "Supabase no está configurado en este proyecto."
                    : "No pudimos iniciar sesión. Revisa tus datos y confirma tu cuenta si acabas de registrarte.",
                notice: null
            });
        }

        guardarSesionVecinal(req, res, next, result.session, destination, result.organizerSession);
    } catch (error) {
        next(error);
    }
});

router.get("/register", (req, res) => {
    if (req.session?.residentSession) return res.redirect("/");
    res.set("Cache-Control", "no-store");
    res.render("register.ejs", {
        title: "Crear cuenta vecinal - Muni Sport",
        csrfToken: csrfTokenPara(req),
        next: destinoVecinalSeguro(req.query.next),
        errors: [],
        values: { fullName: "", email: "", avatarUrl: "" }
    });
});

router.post("/register", validarCsrf, async (req, res, next) => {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const passwordConfirmation = typeof req.body.passwordConfirmation === "string" ? req.body.passwordConfirmation : "";
    const avatarUrl = typeof req.body.avatarUrl === "string" ? req.body.avatarUrl.trim() : "";
    const destination = destinoVecinalSeguro(req.body.next);
    const values = { fullName, email, avatarUrl };
    const errors = [];

    if (fullName.length < 2 || fullName.length > 80) errors.push("Escribe tu nombre (entre 2 y 80 caracteres).");
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Escribe un correo válido.");
    if (password.length < 8 || password.length > 72) errors.push("La contraseña debe tener entre 8 y 72 caracteres.");
    if (password !== passwordConfirmation) errors.push("Las contraseñas no coinciden.");

    if (avatarUrl) {
        try {
            const avatar = new URL(avatarUrl);
            if (avatar.protocol !== "https:" || avatar.username || avatar.password || avatarUrl.length > 1000) {
                errors.push("La foto de perfil debe tener una URL HTTPS válida.");
            }
        } catch {
            errors.push("La foto de perfil debe tener una URL HTTPS válida.");
        }
    }

    if (errors.length) {
        return res.status(422).render("register.ejs", {
            title: "Crear cuenta vecinal - Muni Sport",
            csrfToken: csrfTokenPara(req),
            next: destination,
            errors,
            values
        });
    }

    try {
        const result = await registrarVecino(req, { fullName, email, password, avatarUrl });
        if (result.configuracion === false) {
            return res.status(503).render("register.ejs", {
                title: "Crear cuenta vecinal - Muni Sport",
                csrfToken: csrfTokenPara(req),
                next: destination,
                errors: ["Supabase no está configurado en este proyecto."],
                values
            });
        }
        if (result.error || !result.user) {
            console.error("No se pudo registrar la cuenta vecinal:", result.error?.message || "Respuesta sin usuario");
            return res.status(400).render("register.ejs", {
                title: "Crear cuenta vecinal - Muni Sport",
                csrfToken: csrfTokenPara(req),
                next: destination,
                errors: ["No pudimos crear la cuenta. Revisa los datos e inténtalo nuevamente o inicia sesión si ya tienes una cuenta."],
                values
            });
        }

        if (!result.session) {
            const query = new URLSearchParams({ registro: "pendiente" });
            if (destination !== "/") query.set("next", destination);
            return res.redirect(303, `/login?${query.toString()}`);
        }
        guardarSesionVecinal(req, res, next, result.session, destination);
    } catch (error) {
        next(error);
    }
});

router.post("/logout", requireResident, validarCsrf, async (req, res, next) => {
    try {
        await req.supabaseResident.auth.signOut({ scope: "local" });
    } catch (error) {
        console.error("No se pudo cerrar la sesión vecinal de Supabase:", error.message || error);
    }

    delete req.session.residentSession;
    delete req.session.supabaseSession;
    return req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("munisport.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });
        res.redirect(303, "/");
    });
});

router.get("/favoritos", requireResident, async (req, res, next) => {
    try {
        const [{ data: favoritos, error: favoritosError }, { data: inscripciones }] = await Promise.all([
            req.supabaseResident.from("actividad_favoritos").select("actividad_id"),
            req.supabaseResident.from("inscripciones").select("actividad_id")
        ]);
        if (favoritosError) throw favoritosError;

        const favoriteIds = (favoritos || []).map((favorito) => favorito.actividad_id);
        const enrolledIds = (inscripciones || []).map((inscripcion) => inscripcion.actividad_id);
        let actividades = [];
        if (favoriteIds.length) {
            const { data, error } = await req.supabaseResident
                .from("actividades")
                .select("id,nombre,descripcion,categoria,fecha,lugar,cupos_totales,cupos_ocupados,estado,imagen")
                .in("id", favoriteIds)
                .order("fecha", { ascending: true });
            if (error) throw error;
            actividades = data || [];
        }

        res.render("favoritos.ejs", {
            title: "Mis favoritos - Muni Sport",
            actividades,
            categoria: "todas",
            buscar: "",
            favoriteIds,
            enrolledIds,
            csrfToken: csrfTokenPara(req),
            currentPath: req.originalUrl,
            reintentarUrl: "/favoritos",
            catalogoError: false,
            favoritoError: req.query.error === "guardar"
        });
    } catch (error) {
        console.error("No se pudieron cargar los favoritos:", error.message || error);
        res.status(503).render("favoritos.ejs", {
            title: "Mis favoritos - Muni Sport",
            actividades: [],
            categoria: "todas",
            buscar: "",
            favoriteIds: [],
            enrolledIds: [],
            csrfToken: csrfTokenPara(req),
            currentPath: req.originalUrl,
            reintentarUrl: "/favoritos",
            catalogoError: true,
            favoritoError: false
        });
    }
});

router.post("/favoritos/:id", requireResident, validarCsrf, async (req, res, next) => {
    const destination = destinoVecinalSeguro(req.body.returnTo, "/favoritos");
    const esAjax = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest" || req.headers.accept?.includes("application/json");

    if (!idValido.test(req.params.id)) {
        if (esAjax) {
            return res.status(404).json({ ok: false, error: "Actividad no válida o no encontrada." });
        }
        return res.status(404).render("error.ejs", {
            title: "Actividad no encontrada - Muni Sport",
            status: 404,
            message: "La actividad que buscas no existe o ya no está disponible."
        });
    }

    try {
        let error;
        if (req.body.action === "remove") {
            ({ error } = await req.supabaseResident
                .from("actividad_favoritos")
                .delete()
                .eq("actividad_id", req.params.id));
        } else {
            ({ error } = await req.supabaseResident
                .from("actividad_favoritos")
                .upsert(
                    { actividad_id: req.params.id },
                    { onConflict: "user_id,actividad_id", ignoreDuplicates: true }
                ));
        }
        if (error) throw error;

        if (esAjax) {
            return res.json({
                ok: true,
                action: req.body.action === "remove" ? "removed" : "added",
                actividadId: req.params.id
            });
        }

        res.redirect(303, destination);
    } catch (error) {
        console.error("No se pudo actualizar un favorito:", error.message || error);
        if (esAjax) {
            return res.status(500).json({ ok: false, error: "No se pudo actualizar el favorito." });
        }
        const separator = destination.includes("?") ? "&" : "?";
        res.redirect(303, `${destination}${separator}error=guardar`);
    }
});

router.get("/inscripciones", requireResident, async (req, res) => {
    try {
        const [{ data: inscripciones, error: inscripcionesError }, { data: favoritos }] = await Promise.all([
            req.supabaseResident.from("inscripciones").select("actividad_id"),
            req.supabaseResident.from("actividad_favoritos").select("actividad_id")
        ]);
        if (inscripcionesError) throw inscripcionesError;

        const enrolledIds = (inscripciones || []).map((inscripcion) => inscripcion.actividad_id);
        const favoriteIds = (favoritos || []).map((favorito) => favorito.actividad_id);
        let actividades = [];
        if (enrolledIds.length) {
            const { data, error } = await req.supabaseResident
                .from("actividades")
                .select("id,nombre,descripcion,categoria,fecha,lugar,cupos_totales,cupos_ocupados,estado,imagen")
                .in("id", enrolledIds)
                .order("fecha", { ascending: true });
            if (error) throw error;
            actividades = data || [];
        }

        res.render("inscripciones.ejs", {
            title: "Mis inscripciones - Muni Sport",
            actividades,
            categoria: "todas",
            buscar: "",
            favoriteIds,
            enrolledIds,
            csrfToken: csrfTokenPara(req),
            currentPath: req.originalUrl,
            reintentarUrl: "/inscripciones",
            catalogoError: false,
            favoritoError: req.query.error === "guardar"
        });
    } catch (error) {
        console.error("No se pudieron cargar las inscripciones:", error.message || error);
        res.status(503).render("inscripciones.ejs", {
            title: "Mis inscripciones - Muni Sport",
            actividades: [],
            categoria: "todas",
            buscar: "",
            favoriteIds: [],
            enrolledIds: [],
            csrfToken: csrfTokenPara(req),
            currentPath: req.originalUrl,
            reintentarUrl: "/inscripciones",
            catalogoError: true,
            favoritoError: false
        });
    }
});

router.get("/inscripciones/:id", requireResident, async (req, res, next) => {
    if (!idValido.test(req.params.id)) {
        return res.status(404).render("error.ejs", {
            title: "Actividad no encontrada - Muni Sport",
            status: 404,
            message: "La actividad que buscas no existe o ya no está disponible."
        });
    }

    try {
        const { data: actividad, error: actividadError } = await req.supabaseResident
            .from("actividades")
            .select("id,nombre,descripcion,categoria,fecha,lugar,cupos_totales,cupos_ocupados,estado,imagen")
            .eq("id", req.params.id)
            .maybeSingle();
        if (actividadError) throw actividadError;
        if (!actividad) {
            return res.status(404).render("error.ejs", {
                title: "Actividad no encontrada - Muni Sport",
                status: 404,
                message: "La actividad que buscas no existe o ya no está disponible."
            });
        }

        const { data: inscripcion, error: inscripcionError } = await req.supabaseResident
            .from("inscripciones")
            .select("created_at")
            .eq("actividad_id", actividad.id)
            .maybeSingle();
        if (inscripcionError) throw inscripcionError;

        const estados = {
            confirmada: { tipo: "success", mensaje: "Tu inscripción quedó confirmada. Tu cupo está reservado." },
            cancelada: { tipo: "info", mensaje: "Cancelaste tu inscripción y el cupo quedó liberado." },
            duplicada: { tipo: "info", mensaje: "Ya estás inscrito en esta actividad." },
            no_inscrito: { tipo: "info", mensaje: "No tienes una inscripción activa en esta actividad." },
            sin_cupos: { tipo: "error", mensaje: "La actividad ya no tiene cupos disponibles." },
            inscripcion_cerrada: { tipo: "error", mensaje: "Las inscripciones para esta actividad están cerradas." },
            error: { tipo: "error", mensaje: "No pudimos confirmar la inscripción. Inténtalo nuevamente." },
            error_cancelar: { tipo: "error", mensaje: "No pudimos cancelar la inscripción. Verifica que la migración de cancelación esté aplicada en Supabase e inténtalo nuevamente." }
        };

        res.render("inscripcion.ejs", {
            title: `Inscripción - ${actividad.nombre} - Muni Sport`,
            actividad,
            inscripcion,
            cuposDisponibles: Math.max(0, actividad.cupos_totales - actividad.cupos_ocupados),
            estadoInscripcion: estados[req.query.estado] || null,
            csrfToken: csrfTokenPara(req)
        });
    } catch (error) {
        next(error);
    }
});

router.post("/inscripciones/:id", requireResident, validarCsrf, async (req, res, next) => {
    if (!idValido.test(req.params.id)) {
        return res.status(404).render("error.ejs", {
            title: "Actividad no encontrada - Muni Sport",
            status: 404,
            message: "La actividad que buscas no existe o ya no está disponible."
        });
    }

    try {
        const { data, error } = await req.supabaseResident.rpc("inscribir_en_actividad", {
            p_actividad_id: req.params.id
        });
        if (error) throw error;

        const estado = data?.status === "confirmada"
            ? "confirmada"
            : data?.status === "duplicada"
                ? "duplicada"
                : data?.status === "sin_cupos"
                    ? "sin_cupos"
                    : data?.status === "inscripcion_cerrada"
                        ? "inscripcion_cerrada"
                        : data?.status === "actividad_no_encontrada"
                            ? null
                            : "error";

        if (data?.status === "actividad_no_encontrada") {
            return res.status(404).render("error.ejs", {
                title: "Actividad no encontrada - Muni Sport",
                status: 404,
                message: "La actividad que buscas no existe o ya no está disponible."
            });
        }

        res.redirect(303, `/inscripciones/${req.params.id}${estado ? `?estado=${estado}` : ""}`);
    } catch (error) {
        console.error("No se pudo procesar la inscripción:", error.message || error);
        res.redirect(303, `/inscripciones/${req.params.id}?estado=error`);
    }
});

router.post("/inscripciones/:id/cancelar", requireResident, validarCsrf, async (req, res) => {
    if (!idValido.test(req.params.id)) {
        return res.status(404).render("error.ejs", {
            title: "Actividad no encontrada - Muni Sport",
            status: 404,
            message: "La actividad que buscas no existe o ya no está disponible."
        });
    }

    try {
        const { data, error } = await req.supabaseResident.rpc("cancelar_inscripcion_actividad", {
            p_actividad_id: req.params.id
        });
        if (error) throw error;

        if (data?.status === "actividad_no_encontrada") {
            return res.status(404).render("error.ejs", {
                title: "Actividad no encontrada - Muni Sport",
                status: 404,
                message: "La actividad que buscas no existe o ya no está disponible."
            });
        }

        const estado = data?.status === "cancelada"
            ? "cancelada"
            : data?.status === "no_inscrito"
                ? "no_inscrito"
                : "error_cancelar";

        res.redirect(303, `/inscripciones/${req.params.id}?estado=${estado}`);
    } catch (error) {
        console.error("No se pudo cancelar la inscripción:", error.message || error);
        res.redirect(303, `/inscripciones/${req.params.id}?estado=error_cancelar`);
    }
});

router.get("/pagos", (req, res) => res.render("pagos.ejs", {
    title: "Inscripciones - Muni Sport"
}));

router.use("/admin", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

// Inicio de sesión exclusivo para cuentas autorizadas como organizadores.
router.get("/admin/login", (req, res) => res.render("admin/login.ejs", {
    title: "Acceso de organizadores - Muni Sport",
    csrfToken: csrfTokenPara(req),
    next: adminNext(req.query.next),
    expired: req.query.expired === "1",
    error: null
}));

router.post("/admin/login", validarCsrf, async (req, res, next) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const destination = adminNext(req.body.next);

    if (!email || !password) {
        return res.status(400).render("admin/login.ejs", {
            title: "Acceso de organizadores - Muni Sport",
            csrfToken: csrfTokenPara(req),
            next: destination,
            expired: false,
            error: "Escribe tu correo y contraseña para continuar."
        });
    }

    try {
        const result = await iniciarSesionOrganizador(req, email, password);
        if (!result.session) {
            const status = result.configuracion === false ? 503 : (result.sinPermiso ? 403 : 401);
            const message = result.configuracion === false
                ? "Supabase no está configurado en este proyecto."
                : (result.setup
                    ? "No pudimos verificar tu permiso. Confirma que ejecutaste la migración de organizadores en Supabase."
                : (result.sinPermiso
                    ? result.error.message
                    : "No pudimos iniciar sesión. Revisa tus datos y que tu cuenta de organizador esté habilitada."));

            return res.status(status).render("admin/login.ejs", {
                title: "Acceso de organizadores - Muni Sport",
                csrfToken: csrfTokenPara(req),
                next: destination,
                expired: false,
                error: message
            });
        }

        const sesionVecinal = req.session?.residentSession || result.session;
        req.session.regenerate((sessionError) => {
            if (sessionError) return next(sessionError);

            if (sesionVecinal) {
                req.session.residentSession = sesionVecinal;
            }
            req.session.supabaseSession = result.session;
            req.session.organizerChecked = true;
            req.session.csrfToken = csrfTokenPara(req);
            req.session.save((saveError) => {
                if (saveError) return next(saveError);
                res.redirect(303, destination);
            });
        });
    } catch (error) {
        next(error);
    }
});

router.get("/admin/actividades", requireOrganizer, async (req, res, next) => {
    try {
        const { data, error } = await req.supabaseOrganizer
            .from("actividades")
            .select("id,nombre,descripcion,categoria,fecha,lugar,cupos_totales,cupos_ocupados,estado,imagen")
            .order("fecha", { ascending: true });

        if (error) throw error;

        res.render("admin/actividades.ejs", {
            title: "Gestión de actividades - Muni Sport",
            actividades: (data || []).map((item) => ({ ...item, imagen: normalizarRutaImagenWebp(item.imagen) })),
            dbError: null,
            csrfToken: csrfTokenPara(req),
            organizerEmail: res.locals.organizerEmail,
            notice: req.query.aviso === "guardada"
                ? "La actividad quedó guardada."
                : req.query.aviso === "eliminada"
                    ? "La actividad se eliminó de la cartelera."
                    : null
        });
    } catch (error) {
        console.error("Error cargando el panel de actividades:", error.message || error);
        res.status(503).render("admin/actividades.ejs", {
            title: "Gestión de actividades - Muni Sport",
            actividades: [],
            dbError: "No pudimos cargar las actividades. Revisa Supabase y vuelve a intentarlo.",
            csrfToken: csrfTokenPara(req),
            organizerEmail: res.locals.organizerEmail,
            notice: null
        });
    }
});

router.get("/admin/actividades/nueva", requireOrganizer, (req, res) => renderFormularioActividad(req, res, {}));

router.post("/admin/actividades", requireOrganizer, procesarSubidaImagen, validarCsrf, async (req, res, next) => {
    const { actividad, errores } = actividadDesdeFormulario(req.body);
    if (req.errorArchivoImagen) {
        errores.push(req.errorArchivoImagen);
    }
    if (!errores.length && req.file?.buffer) {
        try {
            actividad.imagen = await convertirYGuardarImagenWebp(req.file.buffer);
        } catch {
            errores.push("No pudimos procesar la imagen subida. Asegúrate de subir un archivo de imagen válido.");
        }
    }
    if (errores.length) {
        return renderFormularioActividad(req, res, {
            activity: valoresDeFormulario(req.body),
            errors: errores,
            status: 422
        });
    }

    try {
        const { error } = await req.supabaseOrganizer.from("actividades").insert(actividad);
        if (error) throw error;
        res.redirect(303, "/admin/actividades?aviso=guardada");
    } catch (error) {
        console.error("Error creando actividad:", error.message || error);
        return renderFormularioActividad(req, res, {
            activity: valoresDeFormulario(req.body),
            errors: ["No se pudo guardar la actividad. Revisa Supabase y vuelve a intentarlo."],
            status: 503
        });
    }
});

router.get("/admin/actividades/:id/editar", requireOrganizer, async (req, res, next) => {
    if (!idValido.test(req.params.id)) {
        return res.status(404).render("error.ejs", {
            title: "Actividad no encontrada - Muni Sport",
            status: 404,
            message: "La actividad que buscas no existe o ya no está disponible."
        });
    }

    try {
        const { data, error } = await req.supabaseOrganizer
            .from("actividades")
            .select("id,nombre,descripcion,categoria,fecha,lugar,cupos_totales,cupos_ocupados,estado,imagen")
            .eq("id", req.params.id)
            .maybeSingle();
        if (error) throw error;
        if (!data) {
            return res.status(404).render("error.ejs", {
                title: "Actividad no encontrada - Muni Sport",
                status: 404,
                message: "La actividad que buscas no existe o ya no está disponible."
            });
        }
        return renderFormularioActividad(req, res, { activity: data, editing: true });
    } catch (error) {
        next(error);
    }
});

router.post("/admin/actividades/:id/editar", requireOrganizer, procesarSubidaImagen, validarCsrf, async (req, res, next) => {
    if (!idValido.test(req.params.id)) {
        return res.status(404).render("error.ejs", {
            title: "Actividad no encontrada - Muni Sport",
            status: 404,
            message: "La actividad que buscas no existe o ya no está disponible."
        });
    }

    const { actividad, errores } = actividadDesdeFormulario(req.body);
    if (req.errorArchivoImagen) {
        errores.push(req.errorArchivoImagen);
    }
    if (!errores.length && req.file?.buffer) {
        try {
            actividad.imagen = await convertirYGuardarImagenWebp(req.file.buffer);
        } catch {
            errores.push("No pudimos procesar la imagen subida. Asegúrate de subir un archivo de imagen válido.");
        }
    }
    if (errores.length) {
        return renderFormularioActividad(req, res, {
            activity: { ...valoresDeFormulario(req.body), id: req.params.id },
            editing: true,
            errors: errores,
            status: 422
        });
    }

    try {
        const { data, error } = await req.supabaseOrganizer
            .from("actividades")
            .update(actividad)
            .eq("id", req.params.id)
            .select("id")
            .maybeSingle();
        if (error) throw error;
        if (!data) {
            return res.status(404).render("error.ejs", {
                title: "Actividad no encontrada - Muni Sport",
                status: 404,
                message: "La actividad que buscas no existe o ya no está disponible."
            });
        }
        res.redirect(303, "/admin/actividades?aviso=guardada");
    } catch (error) {
        console.error("Error editando actividad:", error.message || error);
        return renderFormularioActividad(req, res, {
            activity: { ...valoresDeFormulario(req.body), id: req.params.id },
            editing: true,
            errors: [error.code === "23514"
                ? "La capacidad total no puede ser menor que la cantidad de inscripciones confirmadas."
                : "No se pudo actualizar la actividad. Revisa Supabase y vuelve a intentarlo."],
            status: error.code === "23514" ? 422 : 503
        });
    }
});

router.get("/admin/actividades/:id/eliminar", requireOrganizer, async (req, res, next) => {
    if (!idValido.test(req.params.id)) {
        return res.status(404).render("error.ejs", {
            title: "Actividad no encontrada - Muni Sport",
            status: 404,
            message: "La actividad que buscas no existe o ya no está disponible."
        });
    }

    try {
        const { data, error } = await req.supabaseOrganizer
            .from("actividades")
            .select("id,nombre,fecha,lugar")
            .eq("id", req.params.id)
            .maybeSingle();
        if (error) throw error;
        if (!data) {
            return res.status(404).render("error.ejs", {
                title: "Actividad no encontrada - Muni Sport",
                status: 404,
                message: "La actividad que buscas no existe o ya no está disponible."
            });
        }

        return res.render("admin/actividad-eliminar.ejs", {
            title: "Eliminar actividad - Muni Sport",
            activity: data,
            csrfToken: csrfTokenPara(req)
        });
    } catch (error) {
        next(error);
    }
});

router.post("/admin/actividades/:id/eliminar", requireOrganizer, validarCsrf, async (req, res, next) => {
    if (!idValido.test(req.params.id)) {
        return res.status(404).render("error.ejs", {
            title: "Actividad no encontrada - Muni Sport",
            status: 404,
            message: "La actividad que buscas no existe o ya no está disponible."
        });
    }

    try {
        const { data, error } = await req.supabaseOrganizer
            .from("actividades")
            .delete()
            .eq("id", req.params.id)
            .select("id")
            .maybeSingle();
        if (error) throw error;
        if (!data) {
            return res.status(404).render("error.ejs", {
                title: "Actividad no encontrada - Muni Sport",
                status: 404,
                message: "La actividad que buscas no existe o ya no está disponible."
            });
        }
        res.redirect(303, "/admin/actividades?aviso=eliminada");
    } catch (error) {
        console.error("Error eliminando actividad:", error.message || error);
        return res.status(503).render("error.ejs", {
            title: "No se pudo eliminar - Muni Sport",
            status: 503,
            message: "No pudimos eliminar esta actividad. Revisa Supabase y vuelve a intentarlo."
        });
    }
});

router.post("/admin/logout", requireOrganizer, validarCsrf, async (req, res, next) => {
    try {
        await req.supabaseOrganizer.auth.signOut({ scope: "local" });
    } catch (error) {
        console.error("No se pudo cerrar la sesión de Supabase:", error.message || error);
    }

    delete req.session.supabaseSession;
    delete req.session.residentSession;
    return req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("munisport.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });
        res.redirect(303, "/");
    });
});

export default router;
