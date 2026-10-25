/**
 * Normaliza rutas locales de /images/ para que utilicen la extensión .webp.
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
