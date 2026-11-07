import axios from "axios";
import { API_URL } from "../config";
import { listarPartesComestibles } from "./parteComestibleService";

const BASE = `${API_URL}/api/epocas-cosecha`;

export async function listarEpocasPorEspecie(
    idEspecie,
    soloActivas = false
) {
    try {
        const partes =
            await listarPartesComestibles(
                idEspecie,
                false
            );

        if (
            !Array.isArray(partes) ||
            partes.length === 0
        ) {
            return [];
        }

        const promesas =
            partes.map(
                parte =>
                    listarEpocasCosecha(
                        parte.idEspecieParte,
                        soloActivas
                    ).catch(() => [])
            );

        const resultados =
            await Promise.all(
                promesas
            );

        return resultados.flat();
    } catch {
        return [];
    }
}

export async function listarEpocasCosecha(
    idEspecieParte,
    soloActivas = false
) {
    const respuesta =
        await axios.get(
            BASE,
            {
                params: {
                    idEspecieParte,
                    soloActivas
                }
            }
        );

    return Array.isArray(
        respuesta.data
    )
        ? respuesta.data
        : [];
}

export async function crearEpocaCosecha(
    datos
) {
    const respuesta =
        await axios.post(
            BASE,
            datos
        );

    return respuesta.data;
}

export async function actualizarEpocaCosecha(
    id,
    datos
) {
    const respuesta =
        await axios.put(
            `${BASE}/${id}`,
            datos
        );

    return respuesta.data;
}

export async function desactivarEpocaCosecha(
    id
) {
    await axios.delete(
        `${BASE}/${id}`
    );
}

export async function activarEpocaCosecha(
    id
) {
    const respuesta =
        await axios.patch(
            `${BASE}/${id}/activar`
        );

    return respuesta.data;
}