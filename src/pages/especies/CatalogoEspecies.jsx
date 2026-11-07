import {useEffect,useMemo,useState} from "react";
import {useNavigate,useSearchParams} from "react-router-dom";
import {
    Search,
    Leaf,
    X,
    BookOpen,
    MapPin,
    FlaskConical,
    Sprout,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import {listarEspeciesPublicadas} from "../../api/especieService";
import ImagenEspecie from "../../components/especies/ImagenEspecie";
import useImagenesPrincipales from "../../hooks/useImagenesPrincipales";
import "../../styles/catalogoEspecies.css";
import "../../styles/imagenEspecie.css";
import "../../styles/alertas.css";

const POR_PAGINA=9;

function obtenerId(especie){
    return especie?.idEspecie??especie?.id;
}

function obtenerNombrePrincipal(especie){
    const nombres=Array.isArray(especie?.nombresComunes)
        ?especie.nombresComunes
        :[];

    const principal=nombres.find(
        nombre=>
            nombre?.esPrincipal===true||
            nombre?.principal===true
    );

    return principal?.nombre||
        nombres[0]?.nombre||
        "Sin nombre común";
}

function obtenerMensaje(error){
    const data=error?.response?.data;

    if(typeof data==="string"){
        return data;
    }

    return data?.mensaje||
        data?.message||
        data?.error||
        "No fue posible comunicarse con el servidor.";
}

function CatalogoEspecies(){
    const navigate=useNavigate();
    const[searchParams,setSearchParams]=useSearchParams();

    const[especies,setEspecies]=useState([]);
    const[cargando,setCargando]=useState(true);
    const busqueda=searchParams.get("q")||"";
    const[familia,setFamilia]=useState("TODAS");
    const pagina=Math.max(
        1,
        Math.floor(Number(searchParams.get("pagina"))||1)
    );

    const principales=useImagenesPrincipales(especies);

    useEffect(()=>{
        cargar();
    },[]);

    function actualizarParametros(actualizar){
        const nuevos=new URLSearchParams(searchParams);
        actualizar(nuevos);
        setSearchParams(nuevos,{replace:true});
    }

    function setBusqueda(valor){
        actualizarParametros(parametros=>{
            if(valor){
                parametros.set("q",valor);
            }else{
                parametros.delete("q");
            }

            parametros.delete("pagina");
        });
    }

    function setPagina(valor){
        const nuevaPagina=typeof valor==="function"
            ?valor(pagina)
            :valor;

        actualizarParametros(parametros=>{
            if(nuevaPagina>1){
                parametros.set("pagina",String(nuevaPagina));
            }else{
                parametros.delete("pagina");
            }
        });
    }

    function cambiarFamilia(valor){
        setFamilia(valor);
        setPagina(1);
    }

    async function cargar(){
        try{
            setCargando(true);

            const datos=await listarEspeciesPublicadas();

            setEspecies(
                Array.isArray(datos)
                    ?datos
                    :datos?.content||[]
            );
        }catch(error){
            Swal.fire({
                icon:"error",
                title:"No se pudo cargar el catálogo",
                text:obtenerMensaje(error),
                confirmButtonText:"Entendido",
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:"flora-alert-confirm"
                }
            });
        }finally{
            setCargando(false);
        }
    }

    const familias=useMemo(()=>{
        return[
            ...new Set(
                especies
                    .map(e=>e?.taxonomia?.familia)
                    .filter(Boolean)
            )
        ].sort(
            (a,b)=>a.localeCompare(b,"es")
        );
    },[especies]);

    const filtradas=useMemo(()=>{
        const texto=busqueda
            .trim()
            .toLowerCase();

        return especies.filter(especie=>{
            const nombres=Array.isArray(
                especie?.nombresComunes
            )
                ?especie.nombresComunes
                    .map(n=>n?.nombre||"")
                    .join(" ")
                :"";

            const contenido=[
                especie?.nombreCientifico,
                especie?.descripcion,
                especie?.origen,
                especie?.taxonomia?.familia,
                especie?.taxonomia?.genero,
                especie?.taxonomia?.especieTaxonomica,
                nombres
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const coincideBusqueda=
                !texto||
                contenido.includes(texto);

            const coincideFamilia=
                familia==="TODAS"||
                especie?.taxonomia?.familia===familia;

            return coincideBusqueda&&coincideFamilia;
        });
    },[
        especies,
        busqueda,
        familia
    ]);

    const totalPaginas=Math.max(
        1,
        Math.ceil(
            filtradas.length/POR_PAGINA
        )
    );

    const paginaActual=Math.min(
        pagina,
        totalPaginas
    );

    const visibles=filtradas.slice(
        (paginaActual-1)*POR_PAGINA,
        paginaActual*POR_PAGINA
    );

    return(
        <div className="ce-page">

            <section className="ce-hero">

                <div className="ce-hero-content">

                    <span className="ce-eyebrow">
                        <Sprout size={15}/>
                        Catálogo Botánico
                    </span>

                    <h1>
                        Explora nuestras especies
                        <span> vegetales de consumo no tradicional</span>
                    </h1>

                    <p>
                        Consulta información botánica,
                        taxonómica y cultural de las
                        especies publicadas en el catálogo.
                    </p>

                    <label className="ce-search">

                        <Search size={19}/>

                        <input
                            value={busqueda}
                            onChange={e=>
                                setBusqueda(
                                    e.target.value
                                )
                            }
                            placeholder="Buscar por nombre científico, nombre común o familia..."
                        />

                        {busqueda&&(
                            <button
                                type="button"
                                onClick={()=>
                                    setBusqueda("")
                                }
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={15}/>
                            </button>
                        )}

                    </label>

                </div>

                <div className="ce-hero-decoration">
                    <Leaf size={115}/>
                </div>

            </section>

            <section className="ce-section">

                <div className="ce-section-head">

                    <div>

                        <span>
                            Especies disponibles
                        </span>

                        <h2>
                            Catálogo de especies
                        </h2>

                        <p>
                            {filtradas.length}{" "}
                            {filtradas.length===1
                                ?"especie encontrada"
                                :"especies encontradas"
                            }
                        </p>

                    </div>

                    <button
                        type="button"
                        className="ce-refresh"
                        onClick={cargar}
                        title="Actualizar catálogo"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                cargando
                                    ?"ce-spin"
                                    :""
                            }
                        />

                        Actualizar
                    </button>

                </div>

                <div className="ce-filters">

                    <button
                        type="button"
                        className={
                            familia==="TODAS"
                                ?"active"
                                :""
                        }
                        onClick={()=>
                            cambiarFamilia("TODAS")
                        }
                    >
                        Todas

                        <span>
                            {especies.length}
                        </span>
                    </button>

                    {familias.map(item=>{
                        const cantidad=especies.filter(
                            e=>
                                e?.taxonomia?.familia===
                                item
                        ).length;

                        return(
                            <button
                                type="button"
                                key={item}
                                className={
                                    familia===item
                                        ?"active"
                                        :""
                                }
                                onClick={()=>
                                    cambiarFamilia(item)
                                }
                            >
                                {item}

                                <span>
                                    {cantidad}
                                </span>
                            </button>
                        );
                    })}

                </div>

                {cargando?(
                    <div className="ce-loading">

                        <div className="ce-loader"/>

                        <strong>
                            Cargando catálogo...
                        </strong>

                        <span>
                            Obteniendo especies publicadas.
                        </span>

                    </div>
                ):visibles.length===0?(
                    <div className="ce-empty">

                        <Leaf size={40}/>

                        <strong>
                            No encontramos especies
                        </strong>

                        <p>
                            Prueba con otra búsqueda o cambia
                            el filtro seleccionado.
                        </p>

                        <button
                            type="button"
                            onClick={()=>{
                                setBusqueda("");
                                setFamilia("TODAS");
                            }}
                        >
                            Limpiar filtros
                        </button>

                    </div>
                ):(
                    <div className="ce-grid">

                        {visibles.map(especie=>(
                            <article
                                className="ce-card"
                                key={obtenerId(especie)}
                            >

                                <div className="ce-card-cover">

                                    <ImagenEspecie
                                        imagen={
                                            principales[
                                                obtenerId(
                                                    especie
                                                )
                                            ]
                                        }
                                        nombre={
                                            especie.nombreCientifico
                                        }
                                        className="ime-cover-image"
                                        fallback={
                                            <div className="ce-leaf-bg">
                                                <Leaf size={55}/>
                                            </div>
                                        }
                                    />

                                    <span className="ce-family">
                                        {especie
                                            ?.taxonomia
                                            ?.familia||
                                            "Flora"
                                        }
                                    </span>

                                </div>

                                <div className="ce-card-body">

                                    <span className="ce-common-name">
                                        {obtenerNombrePrincipal(
                                            especie
                                        )}
                                    </span>

                                    <h3>
                                        <em className="ce-scientific-name">
                                            {especie.nombreCientifico}
                                        </em>
                                    </h3>

                                    <div className="ce-tax-mini">

                                        <span>
                                            <FlaskConical size={13}/>

                                            {especie
                                                ?.taxonomia
                                                ?.genero||
                                                "Sin género"
                                            }
                                        </span>

                                        {especie?.origen&&(
                                            <span>
                                                <MapPin size={13}/>
                                                {especie.origen}
                                            </span>
                                        )}

                                    </div>

                                    <p>
                                        {especie.descripcion||
                                            "Sin descripción disponible."
                                        }
                                    </p>

                                </div>

                                <div className="ce-card-footer">

                                    <button
                                        type="button"
                                        onClick={()=>navigate(`/catalogo/especie/${obtenerId(especie)}`)}
                                    >
                                        <BookOpen size={16}/>
                                        Ver especie
                                    </button>

                                </div>

                            </article>
                        ))}

                    </div>
                )}

                {!cargando&&
                    filtradas.length>0&&(
                        <div className="ce-pagination">

                            <span>
                                Mostrando{" "}
                                <strong>
                                    {(paginaActual-1)*
                                        POR_PAGINA+1
                                    }
                                </strong>
                                {" "}a{" "}
                                <strong>
                                    {Math.min(
                                        paginaActual*
                                        POR_PAGINA,
                                        filtradas.length
                                    )}
                                </strong>
                                {" "}de{" "}
                                <strong>
                                    {filtradas.length}
                                </strong>
                            </span>

                            <div>

                                <button
                                    type="button"
                                    disabled={
                                        paginaActual===1
                                    }
                                    onClick={()=>
                                        setPagina(
                                            p=>p-1
                                        )
                                    }
                                    aria-label="Página anterior"
                                >
                                    <ChevronLeft size={17}/>
                                </button>

                                <span>
                                    {paginaActual}
                                    {" / "}
                                    {totalPaginas}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        paginaActual===
                                        totalPaginas
                                    }
                                    onClick={()=>
                                        setPagina(
                                            p=>p+1
                                        )
                                    }
                                    aria-label="Página siguiente"
                                >
                                    <ChevronRight size={17}/>
                                </button>

                            </div>

                        </div>
                    )
                }

            </section>
        </div>
    );
}

export default CatalogoEspecies;
