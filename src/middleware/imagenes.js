import multer from "multer";
import sharp from "sharp";
import { randomBytes } from "crypto";
import { writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const directorioImagenes = join(__dirname, "../public/images");

const tiposMimePermitidos = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/tiff"
]);

const uploadMemoria = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 1,
        fields: 20,
        fieldSize: 32 * 1024
    },
    fileFilter: (_req, file, cb) => {
        if (tiposMimePermitidos.has((file.mimetype || "").toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error("FORMATO_IMAGEN_NO_SOPORTADO"));
        }
    }
});

/**
 * Middleware para procesar formularios multipart/form-data de actividades.
 * Pobla req.body (incluyendo csrfToken) y req.file antes de validarCsrf.
 */
export function procesarSubidaImagen(req, res, next) {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
        return next();
    }

    uploadMemoria.single("imagenArchivo")(req, res, (error) => {
        if (error) {
            if (error.code === "LIMIT_FILE_SIZE") {
                req.errorArchivoImagen = "El archivo de imagen no debe superar los 10 MB.";
            } else if (error.message === "FORMATO_IMAGEN_NO_SOPORTADO") {
                req.errorArchivoImagen = "Sube una imagen válida (JPG, PNG, WebP, GIF o AVIF).";
            } else {
                req.errorArchivoImagen = "No se pudo procesar el archivo de imagen adjunto.";
            }
        }
        next();
    });
}

/**
 * Convierte cualquier imagen subida a formato .webp optimizado y la guarda en /public/images.
 */
export async function convertirYGuardarImagenWebp(buffer) {
    const webpBuffer = await sharp(buffer)
        .rotate()
        .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true
        })
        .webp({ quality: 82 })
        .toBuffer();

    const nombreArchivo = `actividad-${Date.now()}-${randomBytes(4).toString("hex")}.webp`;
    const rutaDestino = join(directorioImagenes, nombreArchivo);
    await writeFile(rutaDestino, webpBuffer);

    return `/images/${nombreArchivo}`;
}

/**
 * Normaliza rutas locales de /images/ para que siempre utilicen extensión .webp.
 */
export function normalizarRutaImagenWebp(imagen) {
    if (typeof imagen !== "string") return imagen;
    const limpia = imagen.trim();
    if (!limpia) return "";
    if (limpia.startsWith("/images/") && !limpia.includes("..")) {
        return limpia.replace(/\.(?:jpg|jpeg|png)$/i, ".webp");
    }
    return limpia;
}
