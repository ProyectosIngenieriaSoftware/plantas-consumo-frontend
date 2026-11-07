import axios from "axios";
import {API_URL} from "../config";
import {listarPartesComestibles} from "./parteComestibleService";

const BASE=`${API_URL}/api/preparaciones-consumo`;

export const TIPOS_CONSUMO=[
    {valor:"CRUDO",texto:"Crudo"},
    {valor:"COCIDO",texto:"Cocido"},
    {valor:"ASADO",texto:"Asado"},
    {valor:"FRITO",texto:"Frito"},
    {valor:"BEBIDA",texto:"Bebida"},
    {valor:"INFUSION",texto:"Infusión"},
    {valor:"OTRO",texto:"Otro"}
];

export function textoTipoConsumo(valor){
    return TIPOS_CONSUMO.find(
        tipo=>tipo.valor===valor
    )?.texto||valor||"—";
}

export async function listarPreparaciones(
    soloActivas=false
){
    const respuesta=await axios.get(
        BASE,
        {
            params:{
                soloActivas
            }
        }
    );

    return Array.isArray(respuesta.data)
        ?respuesta.data
        :[];
}

export async function listarPreparacionesPorParte(
    idEspecieParte,
    soloActivas=false
){
    const respuesta=await axios.get(
        `${BASE}/parte/${idEspecieParte}`,
        {
            params:{
                soloActivas
            }
        }
    );

    return Array.isArray(respuesta.data)
        ?respuesta.data
        :[];
}

export async function listarPreparacionesPorEspecie(
    idEspecie,
    soloActivas=false
){
    try{
        const partes=
            await listarPartesComestibles(
                idEspecie,
                false
            );

        if(
            !Array.isArray(partes)||
            partes.length===0
        ){
            return [];
        }

        const resultados=
            await Promise.all(
                partes.map(
                    parte=>
                        listarPreparacionesPorParte(
                            parte.idEspecieParte,
                            soloActivas
                        ).catch(()=>[])
                )
            );

        return resultados.flat();
    }catch{
        return [];
    }
}

export async function obtenerPreparacion(
    id
){
    const respuesta=
        await axios.get(
            `${BASE}/${id}`
        );

    return respuesta.data;
}

export async function crearPreparacion(
    datos
){
    const respuesta=
        await axios.post(
            BASE,
            datos
        );

    return respuesta.data;
}

export async function actualizarPreparacion(
    id,
    datos
){
    const respuesta=
        await axios.put(
            `${BASE}/${id}`,
            datos
        );

    return respuesta.data;
}

export async function desactivarPreparacion(
    id
){
    await axios.delete(
        `${BASE}/${id}`
    );
}

export async function activarPreparacion(
    id,
    datos
){
    const respuesta=
        await axios.put(
            `${BASE}/${id}`,
            {
                ...datos,
                activa:true
            }
        );

    return respuesta.data;
}