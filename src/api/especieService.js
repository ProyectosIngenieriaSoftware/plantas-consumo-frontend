import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api/especies`;

export async function listarEspecies(estado = null) {
    const respuesta = await axios.get(BASE, {
        params: estado ? { estado } : {}
    });
    return respuesta.data;
}

export async function listarEspeciesPublicadas() {
    const respuesta = await axios.get(`${BASE}/publicadas`);
    return respuesta.data;
}

export async function obtenerEspecie(id) {
    const respuesta = await axios.get(`${BASE}/${id}`);
    return respuesta.data;
}

export async function crearEspecie(datos) {
    const respuesta = await axios.post(BASE, datos);
    return respuesta.data;
}

export async function actualizarEspecie(id, datos) {
    const respuesta = await axios.put(`${BASE}/${id}`, datos);
    return respuesta.data;
}

export async function actualizarTaxonomia(id, datos) {
    const respuesta = await axios.patch(
        `${BASE}/${id}/taxonomia`,
        datos
    );
    return respuesta.data;
}

export async function enviarARevision(id) {
    const respuesta = await axios.patch(
        `${BASE}/${id}/enviar-revision`
    );
    return respuesta.data;
}

export async function validarEspecie(id, idValidador) {
    const respuesta = await axios.patch(
        `${BASE}/${id}/validar`,
        null,
        {
            params: { idValidador }
        }
    );
    return respuesta.data;
}

export async function publicarEspecie(id, idPublicador) {
    const respuesta = await axios.patch(
        `${BASE}/${id}/publicar`,
        null,
        {
            params: { idPublicador }
        }
    );
    return respuesta.data;
}

export async function rechazarEspecie(id) {
    const respuesta = await axios.patch(
        `${BASE}/${id}/rechazar`
    );
    return respuesta.data;
}

export async function desactivarEspecie(id) {
    await axios.delete(`${BASE}/${id}`);
}