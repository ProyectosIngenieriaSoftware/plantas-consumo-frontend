import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api`;

export async function listarVideosPorEspecie(idEspecie, soloActivos = false) {
    const respuesta = await axios.get(
        `${BASE}/especies/${idEspecie}/videos`,
        {
            params: { soloActivos }
        }
    );
    return Array.isArray(respuesta.data)
        ? respuesta.data
        : [];
}

export async function crearVideoEspecie(idEspecie, datos) {
    const respuesta = await axios.post(
        `${BASE}/especies/${idEspecie}/videos`,
        datos
    );
    return respuesta.data;
}

export async function obtenerVideoEspecie(idVideo) {
    const respuesta = await axios.get(
        `${BASE}/videos-especie/${idVideo}`
    );
    return respuesta.data;
}

export async function actualizarVideoEspecie(idVideo, datos) {
    const respuesta = await axios.put(
        `${BASE}/videos-especie/${idVideo}`,
        datos
    );
    return respuesta.data;
}

export async function desactivarVideoEspecie(idVideo) {
    await axios.delete(
        `${BASE}/videos-especie/${idVideo}`
    );
}

export async function activarVideoEspecie(idVideo) {
    const respuesta = await axios.patch(
        `${BASE}/videos-especie/${idVideo}/activar`
    );
    return respuesta.data;
}

export async function listarPartesDeEspecie(idEspecie) {
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
            ? respuesta.data
            : [];
    } catch {
        return [];
    }
}