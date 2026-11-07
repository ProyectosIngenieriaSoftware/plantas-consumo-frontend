import axios from "axios";
import { API_URL } from "../config";

function obtenerUrl(idEspecie) {
    return `${API_URL}/api/especies/${idEspecie}/fuentes`;
}

export async function listarFuentesDeEspecie(idEspecie) {
    const respuesta = await axios.get(obtenerUrl(idEspecie));
    return respuesta.data;
}

export async function vincularFuenteAEspecie(idEspecie, datos) {
    const respuesta = await axios.post(obtenerUrl(idEspecie), datos);
    return respuesta.data;
}

export async function actualizarFuenteDeEspecie(idEspecie, idFuente, datos) {
    const respuesta = await axios.put(
        `${obtenerUrl(idEspecie)}/${idFuente}`,
        datos
    );
    return respuesta.data;
}

export async function desvincularFuenteDeEspecie(idEspecie, idFuente) {
    await axios.delete(`${obtenerUrl(idEspecie)}/${idFuente}`);
}
