import express from "express";
import ejs from "ejs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";
import {MongoClient} from "mongodb";

//rutas
import indexRoutes from "./routes/index.js";

const app = express();

//mongo db
//const {MongoClient} = require('mongodb');
const uri = "mongodb+srv://admin:1234@cluster0.xwiw86k.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri);

const dbName = "webMuni";

//mongo db cosas
async function main() {
	try {
        await client.connect();
        console.log("Connected to MongoDB");
        // Perform database operations here
        //mi base de datos
        const db = client.db(dbName);
        //coleccion de la base de datos
        const coleccion = db.collection("profesionales");
        const usuarios = await coleccion.find({}).toArray();
        console.log('Usuarios encontrados:', usuarios);

    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
    } finally {
        await client.close();
        console.log("Disconnected from MongoDB");
    }
}
main();

//obtiene la ruta de este archivo para facilitar busqueda de arvhivos
const __dirname = dirname(fileURLToPath(import.meta.url));

//set es decirle al servidor que vamos a usar
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));
app.use(indexRoutes);
app.use(express.static(join(__dirname, "public")));






//arir o escuchar puerto 3000
app.listen(3000)
console.log("Server on port 3000")