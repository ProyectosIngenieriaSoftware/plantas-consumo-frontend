import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api/partes-planta`;

export async function listarPartesPlanta(soloActivas = false) {
    const respuesta = await axios.get(BASE, {
        params: { soloActivas }
    });
    return respuesta.data;
}

export async function buscarPartesPlanta(nombre) {
    const respuesta = await axios.get(`${BASE}/buscar`, {
        params: { nombre }
    });
    return respuesta.data;
}

export async function obtenerPartePlanta(id) {
    const respuesta = await axios.get(`${BASE}/${id}`);
    return respuesta.data;
}

export async function crearPartePlanta(datos) {
    const respuesta = await axios.post(BASE, datos);
    return respuesta.data;
}

export async function actualizarPartePlanta(id, datos) {
    const respuesta = await axios.put(`${BASE}/${id}`, datos);
    return respuesta.data;
}

export async function desactivarPartePlanta(id) {
    await axios.delete(`${BASE}/${id}`);
}
