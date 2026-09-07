//enviar html que este en index.ejs
//enrutar tambien
import { Router } from "express";
const router = Router();

router.get("/", (req, res) => res.render("index.ejs", {title: "Bienvenido"}));

router.get("/event", (req, res) => res.render("event.ejs", {title: "Eventos disponibles"}));

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

export default router;
