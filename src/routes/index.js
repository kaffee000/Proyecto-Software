//enviar html que este en index.ejs
//enrutar tambien
import { Router } from "express";
const router = Router();

router.get("/", (req, res) => res.render("index.ejs", {title: "Bienvenido"}));

//router.get("/event", (req, res) => res.render("event.ejs", {title: "Eventos disponibles"}));
router.get("/event", (req, res) => {
    const categoria = req.query.categoria;
    // Por ahora, actividades de ejemplo
    const actividades = [
        {
            nombre: "Actividad deportiva",
            descripcion: "Actividad relacionada con el deporte",
            categoria: "Deportes",
            fecha: "2026-09-13T15:00:00",
            estado: "activo"
        },
        {
            nombre: "Taller de salud",
            descripcion: "Taller relacionado con la salud",
            categoria: "Salud",
            fecha: "2026-09-13T15:00:00",
            estado: "activo"
        },
        {
            nombre: "Taller comunitario",
            descripcion: "Actividad para la comunidad",
            categoria: "Sociales",
            fecha: "2026-09-13T15:00:00",
            estado: "activo"
        }
    ];
    let actividadesFiltradas = actividades;
    // Si se seleccionó una categoría
    if (categoria && categoria !== "todas") {
        actividadesFiltradas = actividades.filter(
            actividad => actividad.categoria === categoria
        );
    }
    res.render("event.ejs", {
        title: "Bienvenido",
        actividades: actividadesFiltradas,
        categoria: categoria
    });
});


router.get("/contact", (req, res) => res.render("contact.ejs", {title: "Contacto"}));

//router.get("/personal", (req, res) => res.render("personal.ejs", {title: "Personal"}));
router.get("/personal", async (req, res) => {
    try {
        const db = req.app.locals.db;
        //busca en la base de datos la coleccion profesionales
        const profesionales = await db
            .collection("profesionales")
            .find({})
            .toArray();

        res.render("personal.ejs", {
            title: "Personal",
            profesionales: profesionales
        });

    } catch (error) {
        console.error("Error obteniendo profesionales:", error);
        res.status(500).send("Error al obtener los profesionales");
    }
});

router.get("/sport", (req, res) => res.render("sport.ejs", {title: "Deportes"}));

router.get("/login", (req, res) => res.render("login.ejs", {title: "Iniciar sesión"}));

router.get("/register", (req, res) => res.render("register.ejs", {title: "Registrate"}));

router.get("/pagos", (req, res) => res.render("pagos.ejs", {title: "Pago"}));


export default router;