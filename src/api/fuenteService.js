import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api/fuentes`;

export async function listarFuentes(soloActivas = false) {
    const respuesta = await axios.get(BASE, {
        params: { soloActivas }
    });
    return respuesta.data;
}

export async function obtenerFuente(id) {
    const respuesta = await axios.get(`${BASE}/${id}`);
    return respuesta.data;
}

export async function crearFuente(datos) {
    const respuesta = await axios.post(BASE, datos);
    return respuesta.data;
}

export async function actualizarFuente(id, datos) {
    const respuesta = await axios.put(`${BASE}/${id}`, datos);
    return respuesta.data;
}

export async function desactivarFuente(id) {
    await axios.delete(`${BASE}/${id}`);
}
