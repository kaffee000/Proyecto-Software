import assert from "node:assert/strict";
import test from "node:test";
import {
    PERMISOS_VECINO,
    crearDesafioVerificacionCorreo,
    crearEstructuraVecino,
    enviarCodigoVerificacionCorreo,
    generarCodigoVerificacion,
    limpiarRegistroVecinosEnMemoria,
    obtenerUltimoCodigoEnviado,
    puedeGestionarEventosVecino,
    registrarIdentidadVecinoEnMemoria,
    validarCorreoReal,
    validarDatosRegistroVecino,
    validarRutChileno,
    validarTelefonoVecino,
    validarTextoNombre,
    verificarCodigoCorreo
} from "../../src/middleware/vecino.js";
import { requireOrganizer } from "../../src/middleware/organizador.js";

test("estructura del usuario vecino prohíbe crear, editar y eliminar eventos", () => {
    const vecino = crearEstructuraVecino({
        userId: "00000000-0000-4000-8000-000000000099",
        rut: "12345678-5",
        primerNombre: "Camila",
        apellidoPaterno: "González",
        apellidoMaterno: "Rojas",
        telefono: "912345678",
        email: "camila.gonzalez@talca.cl",
        emailVerified: true
    });

    assert.equal(vecino.role, "vecino");
    assert.equal(vecino.rut, "12345678-5");
    assert.equal(vecino.primerNombre, "Camila");
    assert.equal(vecino.apellidoPaterno, "González");
    assert.equal(vecino.apellidoMaterno, "Rojas");
    assert.equal(vecino.fullName, "Camila González Rojas");
    assert.equal(vecino.telefono, "912345678");
    assert.equal(vecino.email, "camila.gonzalez@talca.cl");
    assert.equal(vecino.emailVerified, true);
    assert.equal(vecino.initials, "CG");
    assert.deepEqual(vecino.permisos, PERMISOS_VECINO);
    assert.equal(vecino.permisos.crearEventos, false);
    assert.equal(vecino.permisos.editarEventos, false);
    assert.equal(vecino.permisos.eliminarEventos, false);
    assert.equal(puedeGestionarEventosVecino(vecino), false);
});

test("requireOrganizer bloquea con 403 a un usuario vecino que intenta crear o editar eventos", async () => {
    const req = {
        originalUrl: "/admin/actividades/nueva",
        session: {
            residentSession: {
                userId: "00000000-0000-4000-8000-000000000099",
                role: "vecino"
            }
        }
    };

    let statusRecibido = null;
    let vistaRenderizada = null;
    let datosRenderizados = null;
    const res = {
        status(code) {
            statusRecibido = code;
            return this;
        },
        render(view, data) {
            vistaRenderizada = view;
            datosRenderizados = data;
            return this;
        }
    };

    await requireOrganizer(req, res, () => {
        assert.fail("No debe permitir el paso al middleware siguiente para un vecino");
    });

    assert.equal(statusRecibido, 403);
    assert.equal(vistaRenderizada, "error.ejs");
    assert.match(datosRenderizados.message, /vecino no tienen permisos para crear ni editar/i);
});

test("valida RUT chileno correctamente y rechaza RUT en blanco o con dígito verificador inválido", () => {
    assert.deepEqual(validarRutChileno("12.345.678-5"), {
        valido: true,
        rutNormalizado: "12345678-5",
        error: null
    });
    assert.deepEqual(validarRutChileno("11111111-1"), {
        valido: true,
        rutNormalizado: "11111111-1",
        error: null
    });
    assert.equal(validarRutChileno("   ").valido, false);
    assert.equal(validarRutChileno("12.345.678-9").valido, false);
    assert.equal(validarRutChileno("abc").valido, false);
});

test("rechaza primer nombre, apellido paterno o apellido materno en blanco", () => {
    assert.equal(validarTextoNombre("", "El primer nombre").valido, false);
    assert.equal(validarTextoNombre("    ", "El apellido paterno").valido, false);
    assert.equal(validarTextoNombre("   ", "El apellido materno").valido, false);
    assert.equal(validarTextoNombre("Camila", "El primer nombre").valido, true);
    assert.equal(validarTextoNombre("González", "El apellido paterno").valido, true);
    assert.equal(validarTextoNombre("Rojas", "El apellido materno").valido, true);
});

test("valida que el número de teléfono empiece por 9 y tenga exactamente 9 dígitos", () => {
    assert.deepEqual(validarTelefonoVecino("912345678"), {
        valido: true,
        telefonoNormalizado: "912345678",
        error: null
    });
    assert.equal(validarTelefonoVecino("812345678").valido, false);
    assert.equal(validarTelefonoVecino("91234567").valido, false);
    assert.equal(validarTelefonoVecino("9123456789").valido, false);
    assert.equal(validarTelefonoVecino("91234abcd").valido, false);
    assert.equal(validarTelefonoVecino("").valido, false);
});

test("valida que el correo electrónico siga una estructura real", () => {
    assert.equal(validarCorreoReal("vecino@talca.cl").valido, true);
    assert.equal(validarCorreoReal("camila.gonzalez@correo.gob.cl").valido, true);
    assert.equal(validarCorreoReal("").valido, false);
    assert.equal(validarCorreoReal("correo-sin-arroba.cl").valido, false);
    assert.equal(validarCorreoReal("usuario@dominio").valido, false);
    assert.equal(validarCorreoReal("usuario@dominio.c").valido, false);
    assert.equal(validarCorreoReal(".usuario@dominio.cl").valido, false);
    assert.equal(validarCorreoReal("usuario..doble@dominio.cl").valido, false);
    assert.equal(validarCorreoReal("usuario@-dominio.cl").valido, false);
});

test("verifica que todos los campos estén llenados y que el correo no esté registrado por otro usuario", () => {
    limpiarRegistroVecinosEnMemoria();
    registrarIdentidadVecinoEnMemoria({
        email: "ocupado@talca.cl",
        rut: "11111111-1"
    });

    const intentoConCorreoDuplicado = validarDatosRegistroVecino({
        rut: "12.345.678-5",
        primerNombre: "Camila",
        apellidoPaterno: "González",
        apellidoMaterno: "Rojas",
        telefono: "912345678",
        email: "OCUPADO@talca.cl",
        password: "password123",
        passwordConfirmation: "password123"
    });

    assert.equal(intentoConCorreoDuplicado.valido, false);
    assert.ok(
        intentoConCorreoDuplicado.errores.some((err) => /ya se encuentra registrado por otro usuario/i.test(err))
    );

    const intentoConCamposEnBlanco = validarDatosRegistroVecino({
        rut: "",
        primerNombre: "   ",
        apellidoPaterno: "",
        apellidoMaterno: "  ",
        telefono: "71234567",
        email: "correo-invalido"
    });

    assert.equal(intentoConCamposEnBlanco.valido, false);
    assert.equal(intentoConCamposEnBlanco.errores.length, 6);

    const intentoValido = validarDatosRegistroVecino({
        rut: "12.345.678-5",
        primerNombre: "Camila",
        apellidoPaterno: "González",
        apellidoMaterno: "Rojas",
        telefono: "987654321",
        email: "camila.nueva@talca.cl",
        password: "password123",
        passwordConfirmation: "password123"
    });

    assert.equal(intentoValido.valido, true);
    assert.deepEqual(intentoValido.errores, []);
    assert.equal(intentoValido.datos.rut, "12345678-5");
    assert.equal(intentoValido.datos.primerNombre, "Camila");
    assert.equal(intentoValido.datos.apellidoPaterno, "González");
    assert.equal(intentoValido.datos.apellidoMaterno, "Rojas");
    assert.equal(intentoValido.datos.telefono, "987654321");
    assert.equal(intentoValido.datos.email, "camila.nueva@talca.cl");
    limpiarRegistroVecinosEnMemoria();
});

test("genera, envía y verifica el código de verificación de 4 dígitos por correo", async () => {
    limpiarRegistroVecinosEnMemoria();

    const codigo = generarCodigoVerificacion();
    assert.match(codigo, /^\d{4}$/);

    const desafio = crearDesafioVerificacionCorreo(
        {
            rut: "12345678-5",
            primerNombre: "Camila",
            apellidoPaterno: "González",
            apellidoMaterno: "Rojas",
            telefono: "912345678",
            email: "camila@talca.cl"
        },
        { codigo, ahora: 1000, ttlMs: 60000 }
    );

    const envios = [];
    const envio = await enviarCodigoVerificacionCorreo(
        {
            email: desafio.email,
            primerNombre: desafio.datos.primerNombre,
            codigo: desafio.codigo
        },
        {
            transporte: async (payload) => {
                envios.push(payload);
            }
        }
    );

    assert.equal(envio.enviado, true);
    assert.equal(envios.length, 1);
    assert.equal(envios[0].destinatario, "camila@talca.cl");
    assert.equal(envios[0].codigo, codigo);
    assert.equal(obtenerUltimoCodigoEnviado("camila@talca.cl")?.codigo, codigo);

    //Rechaza codigos con formato distinto de 4 digitos
    const formatoInvalido = verificarCodigoCorreo(desafio, "123", { ahora: 2000 });
    assert.equal(formatoInvalido.valido, false);

    // Rechaza codigo de 4 digitos incorrecto
    const codigoIncorrecto = codigo === "0000" ? "9999" : "0000";
    const intentoIncorrecto = verificarCodigoCorreo(desafio, codigoIncorrecto, { ahora: 3000 });
    assert.equal(intentoIncorrecto.valido, false);
    assert.equal(desafio.verificado, false);

    // Rechaza codigo expirado
    const intentoExpirado = verificarCodigoCorreo(desafio, codigo, { ahora: 70000 });
    assert.equal(intentoExpirado.valido, false);
    assert.equal(intentoExpirado.expirado, true);

    // Acepta el codigo correcto de 4 digitos dentro del tiempo de validez
    const resultadoCorrecto = verificarCodigoCorreo(desafio, codigo, { ahora: 5000 });
    assert.equal(resultadoCorrecto.valido, true);
    assert.equal(desafio.verificado, true);
    limpiarRegistroVecinosEnMemoria();
});
