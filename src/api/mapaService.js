import axios from "axios";
import {API_URL} from "../config";

const BASE=`${API_URL}/api`;

export async function obtenerDepartamentosMapa(){
    const respuesta=await axios.get(
        `${BASE}/departamentos`
    );

    return Array.isArray(respuesta.data)
        ?respuesta.data
        :[];
}

export async function obtenerMunicipiosMapa(idDepartamento){
    const respuesta=await axios.get(
        `${BASE}/municipios`,
        {
            params:{
                idDepartamento
            }
        }
    );

    return Array.isArray(respuesta.data)
        ?respuesta.data
        :[];
}

export async function obtenerEspeciesMapa(){
    const respuesta=await axios.get(
        `${BASE}/especies`
    );

    const datos=respuesta.data;

    return Array.isArray(datos)
        ?datos
        :Array.isArray(datos?.content)
            ?datos.content
            :[];
}

export async function obtenerUbicacionesEspecieMapa(idEspecie){
    const respuesta=await axios.get(
        `${BASE}/ubicaciones/especie/${idEspecie}`
    );

    return Array.isArray(respuesta.data)
        ?respuesta.data
        :[];
}

export async function obtenerImagenesEspecieMapa(
    idEspecie,
    soloActivas=true
){
    const respuesta=await axios.get(
        `${BASE}/especies/${idEspecie}/imagenes`,
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

export function seleccionarImagenPrincipalMapa(imagenes){
    if(!Array.isArray(imagenes)){
        return null;
    }

    const activas=imagenes.filter(
        imagen=>
            imagen?.activa!==false&&
            Boolean(
                imagen?.urlImagen||
                imagen?.url||
                imagen?.enlace
            )
    );

    if(activas.length===0){
        return null;
    }

    return activas.find(
        imagen=>
            imagen?.esPrincipal===true||
            imagen?.principal===true
    )||activas[0];
}

export async function obtenerImagenPrincipalMapa(idEspecie){
    try{
        const imagenes=
            await obtenerImagenesEspecieMapa(
                idEspecie,
                true
            );

        return seleccionarImagenPrincipalMapa(
            imagenes
        );
    }catch{
        return null;
    }
}

export async function cargarUbicacionesMapa(
    especies,
    onProgress
){
    const listaEspecies=
        Array.isArray(especies)
            ?especies
            :[];

    const ubicaciones=[];
    const fallidas=[];

    let indice=0;
    let completadas=0;

    const cantidadWorkers=
        Math.min(
            5,
            listaEspecies.length
        );

    const workers=Array.from(
        {
            length:cantidadWorkers
        },
        async()=>{
            while(indice<listaEspecies.length){
                const especie=
                    listaEspecies[indice++];

                const idEspecie=
                    especie?.idEspecie;

                try{
                    const[
                        datosUbicaciones,
                        imagenPrincipal
                    ]=await Promise.all([
                        obtenerUbicacionesEspecieMapa(
                            idEspecie
                        ),
                        obtenerImagenPrincipalMapa(
                            idEspecie
                        )
                    ]);

                    const especieMapa={
                        ...especie,
                        imagenPrincipal:
                            imagenPrincipal||null
                    };

                    for(
                        const ubicacion
                        of datosUbicaciones
                    ){
                        const lat=
                            Number(
                                ubicacion.latitud
                            );

                        const lng=
                            Number(
                                ubicacion.longitud
                            );

                        if(
                            ubicacion.activa!==false&&
                            Number.isFinite(lat)&&
                            Number.isFinite(lng)&&
                            lat>=13.1&&
                            lat<=14.5&&
                            lng>=-90.2&&
                            lng<=-87.6
                        ){
                            ubicaciones.push({
                                ...ubicacion,
                                lat,
                                lng,
                                especie:especieMapa
                            });
                        }
                    }
                }catch{
                    fallidas.push(
                        idEspecie
                    );
                }

                completadas++;

                onProgress?.(
                    completadas,
                    listaEspecies.length
                );
            }
        }
    );

    await Promise.all(workers);

    return{
        ubicaciones,
        fallidas
    };
}