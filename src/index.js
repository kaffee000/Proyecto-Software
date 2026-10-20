import express from "express";
import { createClient } from "@supabase/supabase-js";
import session from "express-session";
import { randomBytes } from "crypto";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import indexRoutes from "./routes/index.js";
import { csrfTokenPara } from "./middleware/organizador.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carga el archivo .env local cuando se ejecuta con Node.js 20.6 o superior.
if (typeof process.loadEnvFile === "function") {
    try {
        process.loadEnvFile(join(__dirname, "../.env"));
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error("Error al cargar el archivo .env:", error.message);
        }
    }
}

const app = express();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const sessionSecret = process.env.SESSION_SECRET || (
    process.env.NODE_ENV === "production" ? null : randomBytes(32).toString("hex")
);

if (!sessionSecret) {
    throw new Error("Define SESSION_SECRET antes de iniciar Muni Sport en producción.");
}

app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(session({
    name: "munisport.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 8 * 60 * 60 * 1000
    }
}));

if (supabaseUrl && supabaseKey) {
    app.locals.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
} else {
    app.locals.supabase = null;
    console.warn("Supabase no está configurado. Completa SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en .env.");
}

app.locals.supabaseConfig = supabaseUrl && supabaseKey
    ? { url: supabaseUrl, key: supabaseKey }
    : null;

app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));
app.use(express.static(join(__dirname, "public")));
app.use(async (req, res, next) => {
    if (req.session?.residentSession?.userId && !req.session?.supabaseSession && req.session.organizerChecked !== true) {
        req.session.organizerChecked = true;
        try {
            const config = req.app.locals.supabaseConfig;
            if (config && req.session.residentSession.access_token) {
                const cliente = createClient(config.url, config.key, {
                    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
                });
                await cliente.auth.setSession({
                    access_token: req.session.residentSession.access_token,
                    refresh_token: req.session.residentSession.refresh_token
                });
                const { data: org } = await cliente
                    .from("organizadores")
                    .select("user_id")
                    .eq("user_id", req.session.residentSession.userId)
                    .maybeSingle();

                if (org) {
                    req.session.supabaseSession = { ...req.session.residentSession };
                }
            }
        } catch {
            // Silencioso ante errores temporales de conexión
        }
    }

    res.locals.isOrganizer = Boolean(req.session?.supabaseSession?.userId);
    res.locals.isResident = Boolean(req.session?.residentSession?.userId);
    res.locals.residentProfile = req.session?.residentSession?.profile || null;
    res.locals.organizerProfile = req.session?.supabaseSession?.profile || null;
    res.locals.organizerEmail = req.session?.supabaseSession?.email || "";
    res.locals.csrfToken = (res.locals.isOrganizer || res.locals.isResident)
        ? csrfTokenPara(req)
        : (req.session?.csrfToken || null);
    next();
});
app.use(indexRoutes);
app.use((req, res) => {
    res.status(404).render("error.ejs", {
        title: "Página no encontrada - Muni Sport",
        status: 404,
        message: "La dirección puede haber cambiado. Vuelve a la cartelera para encontrar las actividades municipales."
    });
});
app.use((error, req, res, next) => {
    console.error("Error atendiendo la solicitud:", error.message || error);
    if (res.headersSent) return next(error);
    res.status(500).render("error.ejs", {
        title: "No se pudo completar la solicitud - Muni Sport",
        status: 500,
        message: "Ocurrió un problema al cargar esta página. Inténtalo nuevamente en unos minutos."
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});
