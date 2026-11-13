import assert from "node:assert/strict";
import { createHash } from "crypto";
import test from "node:test";
import router from "../../src/routes/index.js";

function obtenerHandler(method) {
    const layer = router.stack.find((item) => item.route?.path === "/asistencia/:token" && item.route.methods[method]);
    assert.ok(layer, `Ruta ${method.toUpperCase()} /asistencia/:token no encontrada`);
    return layer.route.stack.at(-1).handle;
}

function crearRespuesta() {
    const resultado = { headers: {} };
    return {
        resultado,
        res: {
            set(nombre, valor) {
                resultado.headers[nombre] = valor;
                return this;
            },
            status(codigo) {
                resultado.status = codigo;
                return this;
            },
            render(vista, datos) {
                resultado.vista = vista;
                resultado.datos = datos;
                return this;
            },
            redirect(codigo, destino) {
                resultado.status = codigo;
                resultado.destino = destino;
                return this;
            }
        }
    };
}

test("el enlace de asistencia presenta la actividad y pide una respuesta", async () => {
    const token = "A".repeat(43);
    const actividad = { nombre: "Taller de fútbol", fecha: "2026-11-15T10:00:00-03:00", lugar: "Talca" };
    const req = {
        params: { token },
        query: {},
        session: {},
        supabaseService: {
            from(tabla) {
                assert.equal(tabla, "inscripciones");
                return {
                    select(campo) {
                        assert.match(campo, /asistencia_estado/);
                        return this;
                    },
                    eq(campo, valor) {
                        assert.equal(campo, "asistencia_token_hash");
                        assert.equal(valor, createHash("sha256").update(token).digest("hex"));
                        return this;
                    },
                    async maybeSingle() {
                        return {
                            data: {
                                asistencia_estado: "pendiente",
                                asistencia_token_expira_at: "2026-11-16T00:00:00.000Z",
                                actividades: actividad
                            },
                            error: null
                        };
                    }
                };
            }
        }
    };
    const { res, resultado } = crearRespuesta();

    await obtenerHandler("get")(req, res);

    assert.equal(resultado.status, 200);
    assert.equal(resultado.vista, "asistencia.ejs");
    assert.equal(resultado.datos.estado, "pendiente");
    assert.equal(resultado.datos.actividad.nombre, actividad.nombre);
    assert.equal(resultado.headers["Cache-Control"], "no-store");
});

test("rechazar asistencia usa el RPC atómico y libera el cupo", async () => {
    const token = "B".repeat(43);
    let llamadaRpc = null;
    const req = {
        params: { token },
        body: { respuesta: "no" },
        supabaseService: {
            async rpc(nombre, parametros) {
                llamadaRpc = { nombre, parametros };
                return { data: { status: "cupo_liberado" }, error: null };
            }
        }
    };
    const { res, resultado } = crearRespuesta();

    await obtenerHandler("post")(req, res);

    assert.deepEqual(llamadaRpc, {
        nombre: "responder_confirmacion_asistencia",
        parametros: {
            p_token_hash: createHash("sha256").update(token).digest("hex"),
            p_respuesta: "no"
        }
    });
    assert.equal(resultado.status, 303);
    assert.equal(resultado.destino, "/asistencia/" + token + "?resultado=liberado");
});
