import {useEffect,useState} from "react";
import {ImageOff} from "lucide-react";

export default function ImagenEspecie({
    imagen,
    nombre,
    className="",
    fallback=null
}){
    const[error,setError]=useState(false);

    const url=imagen?.urlImagen||"";

    useEffect(()=>{
        setError(false);
    },[url]);

    if(!url||error){
        if(fallback){
            return fallback;
        }

        return(
            <div className={`ime-cover-fallback ${className}`.trim()}>
                <ImageOff size={26}/>
                <span>Sin imagen principal</span>
            </div>
        );
    }

    return(
        <img
            src={url}
            className={className}
            alt={
                imagen?.textoAlternativo||
                imagen?.titulo||
                nombre||
                "Imagen de especie"
            }
            loading="lazy"
            onError={()=>setError(true)}
        />
    );
}