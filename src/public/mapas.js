(() => {
    const centroTalca = [-35.4264, -71.6554];
    const estadoMapaCatalogo = { mapa: null, marcadores: new Map() };

    function coordenadaValida(latitud, longitud) {
        return Number.isFinite(latitud)
            && Number.isFinite(longitud)
            && latitud >= -90
            && latitud <= 90
            && longitud >= -180
            && longitud <= 180;
    }

    function crearMapa(elemento, centro, zoom) {
        const mapa = L.map(elemento, {
            scrollWheelZoom: true,
            keyboard: true
        }).setView(centro, zoom);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
        }).addTo(mapa);

        return mapa;
    }

    function crearIconoMarcador() {
        return L.divIcon({
            className: "muni-map-marker-wrap",
            html: '<span class="muni-map-marker" aria-hidden="true"></span>',
            iconSize: [24, 32],
            iconAnchor: [12, 32],
            popupAnchor: [0, -30]
        });
    }

    function leerPuntosCatalogo() {
        const datos = document.getElementById("activity-map-data");
        if (!datos) return [];

        try {
            const puntos = JSON.parse(datos.textContent || "[]");
            return Array.isArray(puntos) ? puntos.filter((punto) => (
                coordenadaValida(Number(punto.latitud), Number(punto.longitud))
            )) : [];
        } catch {
            return [];
        }
    }

    function crearPopup(punto) {
        const contenido = document.createElement("div");
        contenido.className = "activity-map-popup";

        const categoria = document.createElement("p");
        categoria.className = "activity-map-popup__category";
        categoria.textContent = punto.categoria || "Actividad municipal";

        const nombre = document.createElement("p");
        nombre.className = "activity-map-popup__name";
        nombre.textContent = punto.nombre || "Actividad";

        const lugar = document.createElement("p");
        lugar.className = "activity-map-popup__place";
        lugar.textContent = punto.lugar || "Talca";

        const enlace = document.createElement("a");
        enlace.href = "#actividad-" + encodeURIComponent(punto.id);
        enlace.textContent = "Ver en la cartelera";
        enlace.className = "activity-map-popup__link";

        contenido.append(categoria, nombre, lugar, enlace);
        return contenido;
    }

    function renderizarMapaActividades() {
        const elemento = document.getElementById("activity-map");
        if (estadoMapaCatalogo.mapa) {
            estadoMapaCatalogo.mapa.remove();
            estadoMapaCatalogo.mapa = null;
            estadoMapaCatalogo.marcadores.clear();
        }
        if (!elemento) return;
        if (!window.L) {
            const estado = document.getElementById("activity-map-status");
            if (estado) estado.textContent = "No pudimos cargar el mapa de muestra en este momento.";
            return;
        }

        const puntos = leerPuntosCatalogo();
        estadoMapaCatalogo.mapa = crearMapa(elemento, centroTalca, 13);
        if (!puntos.length) {
            const estado = document.getElementById("activity-map-status");
            if (estado) estado.textContent = "Aún no hay actividades con un marcador guardado.";
            requestAnimationFrame(() => estadoMapaCatalogo.mapa?.invalidateSize());
            return;
        }

        const bounds = [];
        puntos.forEach((punto) => {
            const coordenadas = [Number(punto.latitud), Number(punto.longitud)];
            const marcador = L.marker(coordenadas, {
                title: punto.nombre || "Ubicación de actividad",
                alt: "Ubicación de " + (punto.nombre || "una actividad"),
                icon: crearIconoMarcador()
            }).addTo(estadoMapaCatalogo.mapa);
            marcador.bindPopup(crearPopup(punto));
            estadoMapaCatalogo.marcadores.set(String(punto.id), marcador);
            bounds.push(coordenadas);
        });

        if (bounds.length === 1) {
            estadoMapaCatalogo.mapa.setView(bounds[0], 15);
        } else {
            estadoMapaCatalogo.mapa.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
        }
        const estado = document.getElementById("activity-map-status");
        if (estado) estado.textContent = "Selecciona un marcador para consultar la actividad. Mapa © OpenStreetMap.";
        requestAnimationFrame(() => estadoMapaCatalogo.mapa?.invalidateSize());
    }

    function actualizarMarcadorEditor(mapa, marcadorActual, latitudInput, longitudInput, estado) {
        const latitudTexto = latitudInput.value.trim();
        const longitudTexto = longitudInput.value.trim();
        const latitud = latitudTexto === "" ? NaN : Number(latitudTexto);
        const longitud = longitudTexto === "" ? NaN : Number(longitudTexto);

        if (!coordenadaValida(latitud, longitud)) {
            if (marcadorActual) marcadorActual.remove();
            if (estado) estado.textContent = "Haz clic en el mapa para ubicar el recinto.";
            return null;
        }

        const punto = [latitud, longitud];
        if (marcadorActual) {
            marcadorActual.setLatLng(punto);
        } else {
            marcadorActual = L.marker(punto, {
                draggable: true,
                title: "Marcador de la actividad",
                alt: "Marcador editable de la actividad",
                icon: crearIconoMarcador()
            }).addTo(mapa);
            marcadorActual.on("dragend", (evento) => {
                const nuevaUbicacion = evento.target.getLatLng();
                latitudInput.value = nuevaUbicacion.lat.toFixed(6);
                longitudInput.value = nuevaUbicacion.lng.toFixed(6);
                if (estado) estado.textContent = "Ubicación lista para guardar.";
            });
        }

        if (estado) estado.textContent = "Marcador listo. Puedes arrastrarlo para ajustar el punto.";
        return marcadorActual;
    }

    function iniciarEditorUbicacion() {
        const elemento = document.getElementById("activity-location-map");
        const latitudInput = document.getElementById("latitud");
        const longitudInput = document.getElementById("longitud");
        if (!elemento || !latitudInput || !longitudInput) return;
        if (!window.L) {
            const estado = document.getElementById("activity-location-map-status");
            if (estado) estado.textContent = "No pudimos cargar el mapa. Puedes ingresar las coordenadas directamente.";
            return;
        }

        const latitud = latitudInput.value.trim() === "" ? NaN : Number(latitudInput.value);
        const longitud = longitudInput.value.trim() === "" ? NaN : Number(longitudInput.value);
        const tieneCoordenadas = coordenadaValida(latitud, longitud);
        const mapa = crearMapa(elemento, tieneCoordenadas ? [latitud, longitud] : centroTalca, tieneCoordenadas ? 15 : 13);
        const estado = document.getElementById("activity-location-map-status");
        let marcador = tieneCoordenadas
            ? L.marker([latitud, longitud], {
                draggable: true,
                title: "Marcador de la actividad",
                alt: "Marcador editable de la actividad",
                icon: crearIconoMarcador()
            }).addTo(mapa)
            : null;

        if (marcador) {
            marcador.on("dragend", (evento) => {
                const ubicacion = evento.target.getLatLng();
                latitudInput.value = ubicacion.lat.toFixed(6);
                longitudInput.value = ubicacion.lng.toFixed(6);
                if (estado) estado.textContent = "Ubicación lista para guardar.";
            });
        }

        mapa.on("click", (evento) => {
            latitudInput.value = evento.latlng.lat.toFixed(6);
            longitudInput.value = evento.latlng.lng.toFixed(6);
            marcador = actualizarMarcadorEditor(mapa, marcador, latitudInput, longitudInput, estado);
        });

        [latitudInput, longitudInput].forEach((input) => {
            input.addEventListener("change", () => {
                marcador = actualizarMarcadorEditor(mapa, marcador, latitudInput, longitudInput, estado);
                const latText = latitudInput.value.trim();
                const lngText = longitudInput.value.trim();
                const lat = latText === "" ? NaN : Number(latText);
                const lng = lngText === "" ? NaN : Number(lngText);
                if (coordenadaValida(lat, lng)) mapa.panTo([lat, lng]);
            });
        });

        requestAnimationFrame(() => mapa.invalidateSize());
    }

    function iniciarMapaDetalleActividad() {
        const elemento = document.getElementById("activity-detail-map");
        if (!elemento) return;
        if (!window.L) {
            const estado = document.getElementById("activity-detail-map-status");
            if (estado) estado.textContent = "No pudimos cargar el mapa. Puedes abrir OpenStreetMap para ver el recinto.";
            return;
        }

        const latitud = Number(elemento.dataset.latitud);
        const longitud = Number(elemento.dataset.longitud);
        if (!coordenadaValida(latitud, longitud)) return;

        const nombre = elemento.dataset.nombre || "Actividad";
        const lugar = elemento.dataset.lugar || "Talca";
        const mapa = crearMapa(elemento, [latitud, longitud], 15);
        const popup = document.createElement("p");
        popup.textContent = nombre + " · " + lugar;
        L.marker([latitud, longitud], {
            title: "Ubicación de " + nombre,
            alt: "Ubicación de " + nombre,
            icon: crearIconoMarcador()
        }).addTo(mapa).bindPopup(popup);
        requestAnimationFrame(() => mapa.invalidateSize());
    }

    document.addEventListener("click", (evento) => {
        const enlace = evento.target.closest("[data-map-focus]");
        if (!enlace) return;
        const marcador = estadoMapaCatalogo.marcadores.get(String(enlace.dataset.mapFocus));
        if (!marcador || !estadoMapaCatalogo.mapa) return;

        evento.preventDefault();
        document.getElementById("activity-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
        estadoMapaCatalogo.mapa.flyTo(marcador.getLatLng(), 16, { duration: 0.6 });
        window.setTimeout(() => marcador.openPopup(), 350);
    });

    window.MuniSportMaps = {
        renderActivityMap: renderizarMapaActividades
    };

    document.addEventListener("DOMContentLoaded", () => {
        renderizarMapaActividades();
        iniciarEditorUbicacion();
        iniciarMapaDetalleActividad();
    });
})();
