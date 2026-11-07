import { api } from "./client";

const BASE = "/api/parte-beneficios";

function rutaAsociacion(idEspecieParte, idBeneficio) {
    return (
        `${BASE}/` +
        `${encodeURIComponent(idEspecieParte)}/` +
        `${encodeURIComponent(idBeneficio)}`
    );
}

export function listarParteBeneficios() {
    return api(BASE);
}

export function listarParteBeneficiosActivas() {
    return api(`${BASE}/activas`);
}

export function obtenerParteBeneficio(
    idEspecieParte,
    idBeneficio
) {
    return api(
        rutaAsociacion(idEspecieParte, idBeneficio)
    );
}


export function crearParteBeneficio(datos) {
    return api(BASE, {
        method: "POST",
        body: {
            idEspecieParte: Number(datos.idEspecieParte),
            idBeneficio: Number(datos.idBeneficio),
            idFuente: Number(datos.idFuente),
            observacion: datos.observacion.trim()
        }
    });
}

export function actualizarParteBeneficio(
    idEspecieParte,
    idBeneficio,
    datos
) {
    const body = {
        idFuente: Number(datos.idFuente),
        observacion: datos.observacion.trim()
    };

    if (typeof datos.activa === "boolean") {
        body.activa = datos.activa;
    }

    return api(
        rutaAsociacion(idEspecieParte, idBeneficio),
        {
            method: "PUT",
            body
        }
    );
}

export function desactivarParteBeneficio(
    idEspecieParte,
    idBeneficio
) {
    return api(
        rutaAsociacion(idEspecieParte, idBeneficio),
        {
            method: "DELETE"
        }
    );
}