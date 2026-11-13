import assert from "node:assert/strict";
import test from "node:test";
import router from "../../src/routes/index.js";

function obtenerHandler(path, method) {
    const layer = router.stack.find((item) => item.route?.path === path && item.route.methods[method]);
    assert.ok(layer, `Ruta ${method.toUpperCase()} ${path} no encontrada`);
    return layer.route.stack.at(-1).handle;
}

function crearRespuesta() {
    const resultado = { headers: {} };
    const res = {
        status(codigo) {
            resultado.status = codigo;
            return this;
        },
        set(nombre, valor) {
            resultado.headers[nombre] = valor;
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
    };

    return { res, resultado };
}

test("solicita recuperación con respuesta genérica y URL de retorno permitida", async () => {
    let solicitudRecibida = null;
    const handler = obtenerHandler("/password/recuperar", "post");
    const req = {
        body: { email: " Vecina@Example.CL " },
        session: { csrfToken: "csrf-test" },
        app: {
            locals: {
                publicUrl: "https://munisport.example",
                supabase: {
                    auth: {
                        async resetPasswordForEmail(email, options) {
                            solicitudRecibida = { email, options };
                            return { error: null };
                        }
                    }
                }
            }
        }
    };
    const { res, resultado } = crearRespuesta();

    await handler(req, res);

    assert.deepEqual(solicitudRecibida, {
        email: "vecina@example.cl",
        options: { redirectTo: "https://munisport.example/password/restablecer" }
    });
    assert.equal(resultado.status, 200);
    assert.equal(resultado.vista, "password-recover.ejs");
    assert.match(resultado.datos.notice, /Si el correo corresponde a una cuenta vecinal/);
    assert.equal(resultado.headers["Cache-Control"], "no-store");
});

test("rechaza un correo inválido sin llamar a Supabase", async () => {
    let llamadaSupabase = false;
    const handler = obtenerHandler("/password/recuperar", "post");
    const req = {
        body: { email: "no-es-un-correo" },
        session: { csrfToken: "csrf-test" },
        app: { locals: { publicUrl: "https://munisport.example", supabase: { auth: {
            async resetPasswordForEmail() { llamadaSupabase = true; }
        } } } }
    };
    const { res, resultado } = crearRespuesta();

    await handler(req, res);

    assert.equal(llamadaSupabase, false);
    assert.equal(resultado.status, 422);
    assert.equal(resultado.vista, "password-recover.ejs");
    assert.ok(resultado.datos.error);
});

test("rechaza tokens de recuperación inválidos antes de crear sesión", async () => {
    const handler = obtenerHandler("/password/restablecer", "post");
    const req = {
        body: {
            accessToken: "short",
            refreshToken: "short",
            recoveryType: "recovery",
            password: "Password1!",
            passwordConfirmation: "Password1!"
        },
        session: { csrfToken: "csrf-test" },
        app: { locals: { supabaseConfig: { url: "https://munisport.example", key: "anon" } } }
    };
    const { res, resultado } = crearRespuesta();

    await handler(req, res);

    assert.equal(resultado.status, 400);
    assert.equal(resultado.vista, "password-reset.ejs");
    assert.match(resultado.datos.error, /enlace de recuperación no es válido o venció/);
    assert.equal(resultado.datos.resetReady, false);
});
