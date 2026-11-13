(() => {
    const form = document.getElementById("password-reset-form");
    if (!form) return;

    const status = document.getElementById("password-reset-status");
    const accessInput = document.getElementById("accessToken");
    const refreshInput = document.getElementById("refreshToken");
    const typeInput = document.getElementById("recoveryType");
    if (!accessInput || !refreshInput || !typeInput) return;

    const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = fragmento.get("access_token") || "";
    const refreshToken = fragmento.get("refresh_token") || "";
    const tipo = fragmento.get("type") || "";
    const error = fragmento.get("error_description");

    if (error) {
        if (status) status.textContent = "El enlace venció o ya fue utilizado. Solicita uno nuevo para cambiar tu contraseña.";
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        return;
    }

    if (accessToken && refreshToken && tipo === "recovery") {
        accessInput.value = accessToken;
        refreshInput.value = refreshToken;
        typeInput.value = tipo;
        form.hidden = false;
        if (status) status.textContent = "Enlace confirmado. Elige una contraseña nueva.";
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        return;
    }

    if (form.dataset.resetReady === "true") return;
    if (status?.dataset.serverError === "true") return;
    if (status) status.textContent = "Abre el enlace de recuperación que enviamos a tu correo para continuar.";
})();
