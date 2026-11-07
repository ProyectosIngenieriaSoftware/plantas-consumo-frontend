function limpiarUrl(valor) {
    return String(valor ?? "").trim();
}

function esHttpSeguro(valor) {
    try {
        const url = new URL(valor);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function obtenerIdYoutube(valor) {
    try {
        const url = new URL(valor);
        const host = url.hostname
            .replace(/^www\./, "")
            .toLowerCase();

        if (host === "youtu.be") {
            return url.pathname
                .split("/")
                .filter(Boolean)[0] || null;
        }

        if (
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "music.youtube.com"
        ) {
            if (url.pathname === "/watch") {
                return url.searchParams.get("v");
            }

            const partes = url.pathname
                .split("/")
                .filter(Boolean);

            if (
                partes[0] === "shorts" ||
                partes[0] === "embed" ||
                partes[0] === "live"
            ) {
                return partes[1] || null;
            }
        }

        return null;
    } catch {
        return null;
    }
}

function obtenerIdGoogleDrive(valor) {
    try {
        const url = new URL(valor);

        if (
            !url.hostname
                .toLowerCase()
                .includes("drive.google.com")
        ) {
            return null;
        }

        const coincidencia =
            url.pathname.match(
                /\/file\/d\/([^/]+)/
            );

        if (coincidencia?.[1]) {
            return coincidencia[1];
        }

        const id = url.searchParams.get("id");

        return id || null;
    } catch {
        return null;
    }
}

function esVideoDirecto(valor) {
    try {
        const url = new URL(valor);

        const ruta = url.pathname.toLowerCase();

        return (
            ruta.endsWith(".mp4") ||
            ruta.endsWith(".webm") ||
            ruta.endsWith(".ogg") ||
            ruta.endsWith(".ogv") ||
            ruta.endsWith(".mov")
        );
    } catch {
        return false;
    }
}

export function analizarUrlVideo(valor) {
    const urlOriginal = limpiarUrl(valor);

    if (!urlOriginal) {
        return {
            tipo: "vacio",
            urlOriginal: "",
            embedUrl: null
        };
    }

    if (!esHttpSeguro(urlOriginal)) {
        return {
            tipo: "invalido",
            urlOriginal,
            embedUrl: null
        };
    }

    const idYoutube =
        obtenerIdYoutube(
            urlOriginal
        );

    if (idYoutube) {
        return {
            tipo: "youtube",
            urlOriginal,
            idVideo: idYoutube,
            embedUrl:
                `https://www.youtube.com/embed/${encodeURIComponent(idYoutube)}`
        };
    }

    const idDrive =
        obtenerIdGoogleDrive(
            urlOriginal
        );

    if (idDrive) {
        return {
            tipo: "gdrive",
            urlOriginal,
            idVideo: idDrive,
            embedUrl:
                `https://drive.google.com/file/d/${encodeURIComponent(idDrive)}/preview`
        };
    }

    if (esVideoDirecto(urlOriginal)) {
        return {
            tipo: "direct",
            urlOriginal,
            embedUrl: urlOriginal
        };
    }

    return {
        tipo: "externo",
        urlOriginal,
        embedUrl: null
    };
}

export function formatearDuracion(segundos) {
    const total = Number(segundos);

    if (
        !Number.isFinite(total) ||
        total <= 0
    ) {
        return "0:00";
    }

    const valor = Math.floor(total);

    const horas =
        Math.floor(
            valor / 3600
        );

    const minutos =
        Math.floor(
            (valor % 3600) / 60
        );

    const segundosRestantes =
        valor % 60;

    if (horas > 0) {
        return [
            horas,
            String(minutos).padStart(2, "0"),
            String(segundosRestantes).padStart(2, "0")
        ].join(":");
    }

    return [
        minutos,
        String(segundosRestantes).padStart(2, "0")
    ].join(":");
}

export function validarVideoRequest(datos) {
    const errores = {};

    const titulo =
        String(
            datos?.titulo ?? ""
        ).trim();

    const urlVideo =
        String(
            datos?.urlVideo ?? ""
        ).trim();

    const descripcion =
        datos?.descripcion == null
            ? ""
            : String(datos.descripcion).trim();

    const creditos =
        datos?.creditos == null
            ? ""
            : String(datos.creditos).trim();

    if (!titulo) {
        errores.titulo =
            "El título del video es obligatorio.";
    } else if (titulo.length > 200) {
        errores.titulo =
            "El título no puede superar los 200 caracteres.";
    } else if (/[<>]/.test(titulo)) {
        errores.titulo =
            "El título contiene caracteres no permitidos.";
    }

    if (!urlVideo) {
        errores.urlVideo =
            "La URL del video es obligatoria.";
    } else if (urlVideo.length > 1000) {
        errores.urlVideo =
            "La URL no puede superar los 1000 caracteres.";
    } else if (!esHttpSeguro(urlVideo)) {
        errores.urlVideo =
            "Ingresa una URL válida que comience con http:// o https://.";
    }

    if (
        datos?.duracionSegundos !== null &&
        datos?.duracionSegundos !== undefined &&
        datos?.duracionSegundos !== ""
    ) {
        const duracion =
            Number(
                datos.duracionSegundos
            );

        if (
            !Number.isInteger(duracion) ||
            duracion <= 0
        ) {
            errores.duracionSegundos =
                "La duración debe ser un número entero mayor que cero.";
        } else if (duracion > 14400) {
            errores.duracionSegundos =
                "La duración no puede superar las 4 horas.";
        }
    }

    if (creditos.length > 250) {
        errores.creditos =
            "Los créditos no pueden superar los 250 caracteres.";
    } else if (/[<>]/.test(creditos)) {
        errores.creditos =
            "Los créditos contienen caracteres no permitidos.";
    }

    if (/[<>]/.test(descripcion)) {
        errores.descripcion =
            "La descripción contiene caracteres no permitidos.";
    }

    if (
        datos?.idEspecieParte !== null &&
        datos?.idEspecieParte !== undefined &&
        datos?.idEspecieParte !== ""
    ) {
        const id =
            Number(
                datos.idEspecieParte
            );

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            errores.idEspecieParte =
                "La parte seleccionada no es válida.";
        }
    }

    return {
        esValido:
            Object.keys(errores).length === 0,
        errores
    };
}