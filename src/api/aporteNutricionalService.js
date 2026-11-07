import axios from "axios";
import { API_URL } from "../config";
import { listarPartesComestibles } from "./parteComestibleService";

const BASE = `${API_URL}/api/aportes-nutricionales`;

export async function listarAportesPorEspecie(idEspecie) {
    try {
        const partes = await listarPartesComestibles(
            idEspecie,
            false
        );

        if (
            !Array.isArray(partes) ||
            partes.length === 0
        ) {
            return [];
        }

        const promesas = partes.map(
            parte =>
                listarAportesPorEspecieParte(
                    parte.idEspecieParte
                ).catch(() => [])
        );

        const resultados =
            await Promise.all(promesas);

        return resultados.flat();
    } catch {
        return [];
    }
}

export async function listarAportesPorEspecieParte(
    idEspecieParte
) {
    const respuesta = await axios.get(
        `${BASE}/especie-parte/${idEspecieParte}`
    );

    return Array.isArray(respuesta.data)
        ? respuesta.data
        : [];
}

export async function obtenerAporte(id) {
    const respuesta = await axios.get(
        `${BASE}/${id}`
    );

    return respuesta.data;
}

export async function crearAporte(datos) {
    const respuesta = await axios.post(
        BASE,
        datos
    );

    return respuesta.data;
}

export async function actualizarAporte(
    id,
    datos
) {
    const respuesta = await axios.put(
        `${BASE}/${id}`,
        datos
    );

    return respuesta.data;
}

export async function eliminarAporte(id) {
    await axios.delete(
        `${BASE}/${id}`
    );
}