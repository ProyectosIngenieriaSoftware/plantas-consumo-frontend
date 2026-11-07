import axios from "axios";
import { API_URL } from "../config";

const BASE_HABITATS = `${API_URL}/api/habitats`;

const base = idEspecie =>
    `${API_URL}/api/especies/${idEspecie}/habitats`;

export async function listarHabitatsDisponibles() {
    const respuesta = await axios.get(
        BASE_HABITATS,
        {
            params: {
                soloActivos: true
            }
        }
    );

    return Array.isArray(respuesta.data)
        ? respuesta.data
        : [];
}

export async function listarHabitatsDeEspecie(
    idEspecie
) {
    const respuesta = await axios.get(
        base(idEspecie)
    );

    return Array.isArray(respuesta.data)
        ? respuesta.data
        : [];
}

export async function asignarHabitat(
    idEspecie,
    datos
) {
    const respuesta = await axios.post(
        base(idEspecie),
        {
            idHabitat: Number(
                datos.idHabitat
            ),
            observacion:
                datos.observacion?.trim() ||
                null
        }
    );

    return respuesta.data;
}

export async function actualizarObservacion(
    idEspecie,
    idHabitat,
    observacion
) {
    const respuesta = await axios.put(
        `${base(idEspecie)}/${idHabitat}`,
        {
            observacion:
                observacion?.trim() ||
                null
        }
    );

    return respuesta.data;
}

export async function quitarHabitat(
    idEspecie,
    idHabitat
) {
    await axios.delete(
        `${base(idEspecie)}/${idHabitat}`
    );
}