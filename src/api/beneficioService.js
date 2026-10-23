import axios from "axios";
import { API_URL } from "../config";

const BASE = `${API_URL}/api/beneficios`;

/**
 * Obtiene el ID del beneficio soportando tanto idBeneficio como id.
 */
export const idDeBeneficio = (beneficio) => beneficio?.idBeneficio ?? beneficio?.id;

/**
 * Listar todos los beneficios registrados en el sistema.
 */
export async function listarBeneficios() {
    const respuesta = await axios.get(BASE);
    return respuesta.data;
}

/**
 * Obtener el detalle de un beneficio por su ID.
 */
export async function obtenerBeneficio(id) {
    const respuesta = await axios.get(`${BASE}/${id}`);
    return respuesta.data;
}

/**
 * Crear un nuevo beneficio.
 * @param {{ nombre: string, tipoBeneficio: string, descripcion: string, activo?: boolean }} datos
 */
export async function crearBeneficio(datos) {
    const respuesta = await axios.post(BASE, datos);
    return respuesta.data;
}

/**
 * Actualizar un beneficio existente.
 * @param {number|string} id
 * @param {{ nombre: string, tipoBeneficio: string, descripcion: string, activo?: boolean }} datos
 */
export async function actualizarBeneficio(id, datos) {
    const respuesta = await axios.put(`${BASE}/${id}`, datos);
    return respuesta.data;
}

/**
 * Eliminar físicamente un beneficio (DELETE /api/beneficios/{id}).
 */
export async function eliminarBeneficio(id) {
    await axios.delete(`${BASE}/${id}`);
}

/**
 * Desactivar un beneficio (baja lógica vía PUT manteniendo sus datos).
 */
export async function desactivarBeneficio(beneficio) {
    const id = idDeBeneficio(beneficio);
    const payload = {
        nombre: beneficio.nombre,
        tipoBeneficio: beneficio.tipoBeneficio,
        descripcion: beneficio.descripcion,
        activo: false
    };
    const respuesta = await axios.put(`${BASE}/${id}`, payload);
    return respuesta.data;
}

/**
 * Reactivar un beneficio (alta lógica vía PUT).
 */
export async function activarBeneficio(beneficio) {
    const id = idDeBeneficio(beneficio);
    const payload = {
        nombre: beneficio.nombre,
        tipoBeneficio: beneficio.tipoBeneficio,
        descripcion: beneficio.descripcion,
        activo: true
    };
    const respuesta = await axios.put(`${BASE}/${id}`, payload);
    return respuesta.data;
}
