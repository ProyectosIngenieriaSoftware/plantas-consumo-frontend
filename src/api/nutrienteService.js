import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api/nutrientes`;

export async function listarNutrientes() {
    const respuesta = await axios.get(BASE, {
        params: {
            soloActivas: false
        }
    });
    return respuesta.data;
}

export async function listarNutrientesActivos() {
    const respuesta = await axios.get(BASE, {
        params: {
            soloActivas: true
        }
    });
    return respuesta.data;
}

export async function obtenerNutriente(id) {
    const respuesta = await axios.get(`${BASE}/${id}`);
    return respuesta.data;
}

export async function crearNutriente(datos) {
    const respuesta = await axios.post(BASE, datos);
    return respuesta.data;
}

export async function actualizarNutriente(id, datos) {
    const respuesta = await axios.put(`${BASE}/${id}`, datos);
    return respuesta.data;
}

export async function desactivarNutriente(id) {
    await axios.delete(`${BASE}/${id}`);
}

export async function buscarNutrientesPorNombre(nombre) {
    const respuesta = await axios.get(`${BASE}/buscar`, {
        params: { nombre }
    });
    return respuesta.data;
}

export async function buscarNutrientesPorCategoria(categoria) {
    const respuesta = await axios.get(`${BASE}/categoria/${categoria}`);
    return respuesta.data;
}