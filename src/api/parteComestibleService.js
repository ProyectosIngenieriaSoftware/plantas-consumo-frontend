import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api/partes-comestibles`;

export async function listarPartesComestibles(
    idEspecie,
    soloActivas = false
) {
    const respuesta = await axios.get(
        `${API_URL}/api/especies/${idEspecie}/partes-comestibles`,
        {
            params: {
                soloActivas
            }
        }
    );

    return Array.isArray(respuesta.data)
        ? respuesta.data
        : [];
}

export async function obtenerParteComestible(
    idEspecieParte
) {
    const respuesta = await axios.get(
        `${BASE}/${idEspecieParte}`
    );

    return respuesta.data;
}

export async function crearParteComestible(datos) {
    const respuesta = await axios.post(
        `${API_URL}/api/especies/${datos.idEspecie}/partes-comestibles`,
        {
            idPartePlanta: Number(
                datos.idPartePlanta
            ),
            descripcion:
                datos.descripcion?.trim() || null,
            advertencias:
                datos.advertencias?.trim() || null
        }
    );

    return respuesta.data;
}

export async function actualizarParteComestible(
    idEspecieParte,
    datos
) {
    const respuesta = await axios.put(
        `${BASE}/${idEspecieParte}`,
        {
            descripcion:
                datos.descripcion?.trim() || null,
            advertencias:
                datos.advertencias?.trim() || null
        }
    );

    return respuesta.data;
}

export async function desactivarParteComestible(
    idEspecieParte
) {
    await axios.delete(
        `${BASE}/${idEspecieParte}`
    );
}

export async function activarParteComestible(
    idEspecieParte
) {
    const respuesta = await axios.patch(
        `${BASE}/${idEspecieParte}/activar`
    );

    return respuesta.data;
}