//enviar html que este en index.ejs
//enrutar tambien
import { Router } from "express";
const router = Router();

// Actividades de ejemplo para el catalogo comunitario de Talca
const actividadesBase = [
    {
        id: "act-1",
        nombre: "Taller formativo de básquetbol y deporte",
        descripcion: "Entrenamiento dinámico para el desarrollo de fundamentos técnicos, trabajo en equipo y acondicionamiento físico.",
        categoria: "Deportes",
        fecha: "2026-10-18T10:00:00",
        lugar: "Polideportivo Municipal Talca",
        cupos: "18 cupos libres",
        estado: "activo",
        imagen: "/images/actividad de deporte.jpg"
    },
    {
        id: "act-2",
        nombre: "Baile entretenido y vida activa",
        descripcion: "Sesiones guiadas de acondicionamiento aeróbico, ritmo y vitalidad en comunidad aptas para todas las edades.",
        categoria: "Salud",
        fecha: "2026-10-19T09:30:00",
        lugar: "Parque Costanera Río Claro",
        cupos: "24 cupos libres",
        estado: "activo",
        imagen: "/images/actividad baile entretenido.jpg"
    },
    {
        id: "act-3",
        nombre: "Encuentro y actividades para adulto mayor",
        descripcion: "Jornada de integración vecinal con ejercicios de estiramiento, pausas activas y dinámicas participativas.",
        categoria: "Sociales",
        fecha: "2026-10-20T16:00:00",
        lugar: "Centro Comunitario Las Américas",
        cupos: "40 cupos libres",
        estado: "activo",
        imagen: "/images/actividades adulto mayor.jpeg"
    },
    {
        id: "act-4",
        nombre: "Talleres deportivos de invierno y juventud",
        descripcion: "Espacios recreativos para niñas, niños y jóvenes durante temporadas de descanso escolar en recintos locales.",
        categoria: "Deportes",
        fecha: "2026-10-21T15:00:00",
        lugar: "Estadio Sur Talca",
        cupos: "25 cupos libres",
        estado: "activo",
        imagen: "/images/actividad vacaciones de invierno.jpeg"
    },
    {
        id: "act-5",
        nombre: "Jornada formativa infanto-juvenil",
        descripcion: "Práctica de habilidades motrices, juegos colectivos y orientación en salud física preventiva.",
        categoria: "Salud",
        fecha: "2026-10-22T11:00:00",
        lugar: "Gimnasio Regional de Talca",
        cupos: "30 cupos libres",
        estado: "activo",
        imagen: "/images/actividad vacaciones de invierno 2.jpeg"
    },
    {
        id: "act-6",
        nombre: "Hidrogimnasia y bienestar acuático",
        descripcion: "Sesiones guiadas en piscina temperada para fortalecimiento cardiovascular, bajo impacto articular y bienestar comunitario.",
        categoria: "Salud",
        fecha: "2026-10-23T11:00:00",
        lugar: "Piscina Municipal de Talca",
        cupos: "20 cupos libres",
        estado: "activo",
        imagen: "/images/actividad baile en piscina.jpeg"
    }
];

function obtenerActividadesFiltradas(categoria) {
    if (categoria && categoria !== "todas") {
        return actividadesBase.filter(
            actividad => actividad.categoria.toLowerCase() === categoria.toLowerCase()
        );
    }
    return actividadesBase;
}

// Ruta principal con catálogo integrado (RF-01, AC-01)
router.get("/", (req, res) => {
    const categoria = req.query.categoria || "todas";
    const actividadesFiltradas = obtenerActividadesFiltradas(categoria);
    res.render("index.ejs", {
        title: "Muni Sport - Portal Comunitario de Actividades en Talca",
        actividades: actividadesFiltradas,
        categoria: categoria
    });
});

// Catálogo de eventos y actividades (RF-02)
router.get("/event", (req, res) => {
    const categoria = req.query.categoria || "todas";
    const actividadesFiltradas = obtenerActividadesFiltradas(categoria);
    res.render("event.ejs", {
        title: "Catálogo de Actividades - Muni Sport",
        actividades: actividadesFiltradas,
        categoria: categoria
    });
});

router.get("/contact", (req, res) => res.render("contact.ejs", {
    title: "Contacto y Atención Ciudadana - Muni Sport"
}));

router.get("/personal", async (req, res) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            return res.render("personal.ejs", {
                title: "Equipo Profesional - Muni Sport",
                profesionales: [],
                dbConnected: false
            });
        }

        const profesionales = await db
            .collection("profesionales")
            .find({})
            .toArray();

        res.render("personal.ejs", {
            title: "Equipo Profesional - Muni Sport",
            profesionales: profesionales,
            dbConnected: true
        });

    } catch (error) {
        console.error("Error obteniendo profesionales:", error.message || error);
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

router.get("/login", (req, res) => res.render("login.ejs", {
    title: "Acceso Vecinal - Muni Sport"
}));

router.get("/register", (req, res) => res.render("register.ejs", {
    title: "Registro Ciudadano - Muni Sport"
}));

router.get("/pagos", (req, res) => res.render("pagos.ejs", {
    title: "Inscripción en Proceso - Muni Sport"
}));

export default router;