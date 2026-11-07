import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api`;

export async function listarImagenes(idEspecie, soloActivas = false) {
    const respuesta = await axios.get(
        `${BASE}/especies/${idEspecie}/imagenes`,
        {
            params: { soloActivas }
        }
    );

    return Array.isArray(respuesta.data)
        ? respuesta.data
        : [];
}

export async function crearImagen(idEspecie, datos) {
    const respuesta = await axios.post(
        `${BASE}/especies/${idEspecie}/imagenes`,
        datos
    );

    return respuesta.data;
}

export async function actualizarImagen(idImagen, datos) {
    const respuesta = await axios.put(
        `${BASE}/imagenes-especie/${idImagen}`,
        datos
    );

    return respuesta.data;
}

export async function desactivarImagen(idImagen) {
    await axios.delete(
        `${BASE}/imagenes-especie/${idImagen}`
    );
}

export async function activarImagen(idImagen) {
    const respuesta = await axios.patch(
        `${BASE}/imagenes-especie/${idImagen}/activar`
    );

    return respuesta.data;
}

export async function marcarImagenPrincipal(idImagen) {
    const respuesta = await axios.patch(
        `${BASE}/imagenes-especie/${idImagen}/marcar-principal`
    );

    return respuesta.data;
}

export async function listarPartesImagen(idEspecie) {
    try {
        const respuesta = await axios.get(
            `${BASE}/especies/${idEspecie}/partes-comestibles`,
            {
                params: {
                    soloActivas: true
                }
            }
        );

        return Array.isArray(respuesta.data)
            ? respuesta.data.filter(
                parte => parte.activa !== false
            )
            : [];
    } catch {
        return [];
    }
}

export function imagenPrincipal(imagenes) {
    if (!Array.isArray(imagenes)) {
        return null;
    }

    return imagenes.find(
        imagen =>
            imagen.activa !== false &&
            imagen.esPrincipal === true
    ) || null;
}