import assert from "node:assert/strict";
import test from "node:test";
import { normalizarRutaImagenWebp } from "../../src/middleware/rutas-imagen.js";

test("convierte rutas locales JPG, JPEG y PNG a WebP", () => {
    assert.equal(normalizarRutaImagenWebp("/images/actividad.jpg"), "/images/actividad.webp");
    assert.equal(normalizarRutaImagenWebp("/images/actividad.jpeg"), "/images/actividad.webp");
    assert.equal(normalizarRutaImagenWebp("/images/logo.PNG"), "/images/logo.webp");
});

test("mantiene intactas las URL externas y las extensiones no convertibles", () => {
    assert.equal(
        normalizarRutaImagenWebp("https://example.com/actividad.jpg"),
        "https://example.com/actividad.jpg"
    );
    assert.equal(normalizarRutaImagenWebp("/images/animacion.gif"), "/images/animacion.gif");
});

test("no normaliza rutas con traversal y conserva valores ajenos a texto", () => {
    assert.equal(normalizarRutaImagenWebp("/images/../privado/logo.jpg"), "/images/../privado/logo.jpg");
    assert.equal(normalizarRutaImagenWebp(null), null);
    assert.equal(normalizarRutaImagenWebp("   "), "");
});
