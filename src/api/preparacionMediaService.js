import axios from "axios";
import { API_URL } from "../config";
import { listarPreparacionesPorEspecie } from "./preparacionConsumoService";

const BASE_PREPARACIONES = `${API_URL}/api/preparaciones-consumo`;

export const TIPOS_MEDIA = [
    { valor: "imagenes", texto: "Imágenes" },
    { valor: "videos", texto: "Videos" }
];

function validarTipo(tipo) {
    if (tipo !== "imagenes" && tipo !== "videos") {
        throw new Error("Tipo de multimedia no válido.");
    }
}

function recurso(tipo) {
    validarTipo(tipo);

    return tipo === "imagenes"
        ? "imagenes-preparacion"
        : "videos-preparacion";
}

export async function listarPreparaciones() {
    const respuesta = await axios.get(
        BASE_PREPARACIONES
    );

    return Array.isArray(respuesta.data)
        ? respuesta.data
        : [];
}

export async function listarPreparacionesDeEspecie(
    idEspecie
) {
    const datos =
        await listarPreparacionesPorEspecie(
            idEspecie,
            false
        );

    return Array.isArray(datos)
        ? datos
        : [];
}

export async function listarMedia(
    idPreparacion,
    tipo
) {
    validarTipo(tipo);

    const respuesta = await axios.get(
        `${BASE_PREPARACIONES}/${idPreparacion}/${tipo}`
    );

    return Array.isArray(respuesta.data)
        ? respuesta.data
        : [];
}

export async function crearMedia(
    idPreparacion,
    tipo,
    datos
) {
    validarTipo(tipo);

    const respuesta = await axios.post(
        `${BASE_PREPARACIONES}/${idPreparacion}/${tipo}`,
        datos
    );

    return respuesta.data;
}

export async function actualizarMedia(
    idMedia,
    tipo,
    datos
) {
    const respuesta = await axios.put(
        `${API_URL}/api/${recurso(tipo)}/${idMedia}`,
        datos
    );

    return respuesta.data;
}

export async function desactivarMedia(
    idMedia,
    tipo
) {
    await axios.delete(
        `${API_URL}/api/${recurso(tipo)}/${idMedia}`
    );
}

export async function activarMedia(
    idMedia,
    tipo
) {
    const respuesta = await axios.patch(
        `${API_URL}/api/${recurso(tipo)}/${idMedia}/activar`
    );

    return respuesta.data;
}

export async function marcarPrincipal(
    idImagen
) {
    const respuesta = await axios.patch(
        `${API_URL}/api/imagenes-preparacion/${idImagen}/marcar-principal`
    );

    return respuesta.data;
}