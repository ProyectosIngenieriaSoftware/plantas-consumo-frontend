import {useEffect,useState} from "react";
import {
    listarImagenes,
    imagenPrincipal
} from "../api/imagenEspecieService";

function obtenerId(especie){
    return especie?.idEspecie??
        especie?.id??
        null;
}

export default function useImagenesPrincipales(
    especies,
    version=0
){
    const[principales,setPrincipales]=useState({});

    useEffect(()=>{
        let vigente=true;

        async function cargar(){
            const lista=Array.isArray(especies)
                ?especies
                :[];

            if(lista.length===0){
                if(vigente){
                    setPrincipales({});
                }

                return;
            }

            const resultados=await Promise.all(
                lista.map(async especie=>{
                    const id=obtenerId(especie);

                    if(!id){
                        return[
                            null,
                            null
                        ];
                    }

                    try{
                        const imagenes=await listarImagenes(
                            id,
                            false
                        );

                        const principal=
                            imagenPrincipal(
                                imagenes
                            );

                        return[
                            id,
                            principal
                        ];
                    }catch(error){
                        console.error(
                            `No se pudo cargar la imagen principal de la especie ${id}`,
                            error
                        );

                        return[
                            id,
                            null
                        ];
                    }
                })
            );

            if(!vigente){
                return;
            }

            const mapa={};

            resultados.forEach(
                ([id,principal])=>{
                    if(id!=null){
                        mapa[id]=principal;
                    }
                }
            );

            setPrincipales(mapa);
        }

        cargar();

        return()=>{
            vigente=false;
        };
    },[
        especies,
        version
    ]);

    return principales;
}