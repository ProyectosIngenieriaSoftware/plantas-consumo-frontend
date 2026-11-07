import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api/ubicaciones`;

export async function listarUbicacionesEspecie(idEspecie) {
    const respuesta = await axios.get(
        `${BASE}/especie/${idEspecie}`
    );
    return Array.isArray(respuesta.data) ? respuesta.data : [];
}

export async function crearUbicacion(datos) {
    return (await axios.post(BASE, datos)).data;
}

export async function actualizarUbicacion(idUbicacion, datos) {
    return (await axios.put(
        `${BASE}/${idUbicacion}`,
        datos
    )).data;
}

export async function desactivarUbicacion(idUbicacion) {
    await axios.delete(
        `${BASE}/${idUbicacion}`
    );
}

export async function reactivarUbicacion(idUbicacion) {
    return (await axios.patch(
        `${BASE}/${idUbicacion}/activar`
    )).data;
}

export async function listarDepartamentos() {
    const respuesta = await axios.get(
        `${API_URL}/api/departamentos`
    );
    return Array.isArray(respuesta.data) ? respuesta.data : [];
}

export async function listarMunicipios(idDepartamento) {
    const respuesta = await axios.get(
        `${API_URL}/api/municipios`,
        {
            params: {
                idDepartamento
            }
        }
    );
    return Array.isArray(respuesta.data) ? respuesta.data : [];
}