import express from "express";
import ejs from "ejs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {MongoClient} from "mongodb";

//rutas
import indexRoutes from "./routes/index.js";

//obtiene la ruta de este archivo para facilitar busqueda de arvhivos
const __dirname = dirname(fileURLToPath(import.meta.url));

// Carga de variables de entorno usando la API nativa de Node.js
if (typeof process.loadEnvFile === "function") {
    try {
        process.loadEnvFile();
    } catch (error) {
        if (error.code === "ENOENT") {
            try {
                process.loadEnvFile(join(__dirname, "../.env"));
            } catch (innerError) {
                if (innerError.code !== "ENOENT") {
                    console.error("Error al cargar el archivo .env:", innerError.message);
                }
            }
        } else {
            console.error("Error al cargar el archivo .env:", error.message);
        }
    }
}

const app = express();

//mongo db
//const {MongoClient} = require('mongodb');
const uri = process.env.MONGODB_URI;
const dbName = "webMuni";

//mongo db cosas
async function main() {
    if (!uri) {
        console.error("Error: La variable de entorno MONGODB_URI no está configurada.");
        return;
    }

	try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log("Connected to MongoDB");
        // Perform database operations here
        //mi base de datos
        const db = client.db(dbName);

        // Hacemos disponible la base de datos para las rutas
        app.locals.db = db;
        // Rutas
        app.use(indexRoutes);

        //coleccion de la base de datos
        //const coleccion = db.collection("profesionales");
        //const usuarios = await coleccion.find({}).toArray();
        //console.log('Usuarios encontrados:', usuarios);

    } catch (err) {
        const safeMessage = err?.message
            ? err.message.replace(/mongodb(\+srv)?:\/\/[^@]+@/g, "mongodb$1://<redacted>@")
            : "Error al conectar a MongoDB";
        console.error("Error connecting to MongoDB:", safeMessage);
    }
}
main();

//set es decirle al servidor que vamos a usar
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));
app.use(indexRoutes);
app.use(express.static(join(__dirname, "public")));

//arir o escuchar puerto 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT);
console.log(`Server on port ${PORT}`);