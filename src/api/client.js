import { API_URL } from '../config';

// Error con el formato estándar del backend: estado, error, mensaje, ruta, erroresValidacion
export class ApiError extends Error {
    constructor(status, body) {
        super(body?.mensaje || 'No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
        this.status = status;
        this.body = body;
        this.errores = body?.erroresValidacion || {}; // { "taxonomia.genero": "...", "nombresComunes[1].nombre": "..." }
    }
}

export async function api(path, { method = 'GET', body, params } = {}) {
    const url = new URL(API_URL + path);
    if (params) {
        Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.set(k, v));
    }
    let res;
    try {
        res = await fetch(url, {
            method,
            headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError(0, null);
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
}

// Acepta arreglo simple o respuesta paginada ({ content: [...] })
export const lista = (d) => (Array.isArray(d) ? d : d?.content ?? []);

// Quita strings vacíos y null para no enviar campos opcionales en blanco
export function limpiar(valor) {
    if (Array.isArray(valor)) return valor.map(limpiar);
    if (valor && typeof valor === 'object') {
        return Object.fromEntries(
            Object.entries(valor)
                .filter(([, v]) => v !== '' && v !== null && v !== undefined)
                .map(([k, v]) => [k, limpiar(v)])
        );
    }
    return valor;
}