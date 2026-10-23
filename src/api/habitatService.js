import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api/habitats`;

export async function listarHabitats() {
    const respuesta = await axios.get(BASE);
    return respuesta.data;
}

export async function crearHabitat(datos) {
    const respuesta = await axios.post(
        BASE,
        datos
    );

    return respuesta.data;
}

export async function actualizarHabitat(id, datos) {
    const respuesta = await axios.put(
        `${BASE}/${id}`,
        datos
    );

    return respuesta.data;
}

export async function desactivarHabitat(id) {
    await axios.delete(
        `${BASE}/${id}`
    );
}

export async function activarHabitat(id) {
    const respuesta = await axios.patch(
        `${BASE}/${id}/activar`
    );

    return respuesta.data;
}