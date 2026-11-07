import {
    ArrowLeft,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    Leaf,
    MapPin,
    Mountain,
    PlayCircle,
    Sprout,
    Tags,
    Utensils,
    Video,
    X
} from "lucide-react";
import {useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {useNavigate,useParams} from "react-router-dom";
import {CircleMarker,MapContainer,TileLayer,Tooltip,useMap} from "react-leaflet";
import {
    obtenerDetalleCatalogoPublico,
    obtenerImagenPrincipalPublica
} from "../../api/catalogoPublicoService";
import "leaflet/dist/leaflet.css";
import "../../styles/detalleCatalogoEspecie.css";

const MESES=[
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const texto=(...valores)=>valores.find(
    valor=>valor!==undefined&&valor!==null&&String(valor).trim()!==""
);

const urlImagen=imagen=>texto(
    imagen?.urlImagen,
    imagen?.url,
    imagen?.enlace
);

const urlVideo=video=>texto(
    video?.urlVideo,
    video?.url,
    video?.enlace
);

const nombreParte=parte=>texto(
    parte?.nombreParte,
    parte?.partePlanta?.nombre,
    parte?.nombre,
    "Parte comestible"
);

const parteDeId=(partes,id)=>partes.find(
    parte=>String(parte.idEspecieParte)===String(id)
);

const tieneTexto=valor=>
    valor!==undefined&&
    valor!==null&&
    String(valor).trim()!=="";

const videoDirecto=url=>
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(String(url||""));

const numero=valor=>{
    const resultado=Number(valor);
    return Number.isFinite(resultado)?resultado:null;
};

function nombreComunPrincipal(especie){
    if(especie?.nombreComun){
        return especie.nombreComun;
    }

    const nombres=Array.isArray(especie?.nombresComunes)
        ?especie.nombresComunes
        :[];

    return nombres.find(
        nombre=>nombre?.esPrincipal||nombre?.principal
    )?.nombre||nombres[0]?.nombre||"Sin nombre común";
}

function idYoutube(url=""){
    const patrones=[
        /youtube\.com\/watch\?v=([^&]+)/i,
        /youtu\.be\/([^?&/]+)/i,
        /youtube\.com\/embed\/([^?&/]+)/i,
        /youtube\.com\/shorts\/([^?&/]+)/i
    ];

    for(const patron of patrones){
        const coincidencia=String(url).match(patron);
        if(coincidencia?.[1]){
            return coincidencia[1];
        }
    }

    return null;
}

function periodoCosecha(epoca){
    const inicio=Number(epoca?.mesInicio);
    const fin=Number(epoca?.mesFin);

    if(!inicio&&!fin){
        return texto(
            epoca?.periodo,
            epoca?.temporada,
            "Período no especificado"
        );
    }

    if(inicio===fin){
        return MESES[inicio-1]||"";
    }

    return[
        MESES[inicio-1],
        MESES[fin-1]
    ].filter(Boolean).join(" – ");
}

function ModalPublico({children,onCerrar,clase=""}){
    useEffect(()=>{
        const anterior=document.body.style.overflow;
        document.body.style.overflow="hidden";

        const cerrarConEscape=evento=>{
            if(evento.key==="Escape"){
                onCerrar();
            }
        };

        window.addEventListener("keydown",cerrarConEscape);

        return()=>{
            document.body.style.overflow=anterior;
            window.removeEventListener("keydown",cerrarConEscape);
        };
    },[onCerrar]);

    return createPortal(
        <div
            className="dc-viewer-backdrop"
            onMouseDown={onCerrar}
        >
            <div
                className={`dc-viewer ${clase}`}
                onMouseDown={evento=>evento.stopPropagation()}
            >
                <button
                    type="button"
                    className="dc-viewer-close"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                >
                    <X size={20}/>
                </button>

                {children}
            </div>
        </div>,
        document.body
    );
}

function VisorImagen({imagenes=[],indiceInicial=0,onCerrar}){
    const lista=imagenes.filter(urlImagen);

    const[indice,setIndice]=useState(
        Math.min(
            Math.max(indiceInicial,0),
            Math.max(lista.length-1,0)
        )
    );

    if(!lista.length){
        return null;
    }

    const actual=lista[indice];

    const mover=direccion=>{
        setIndice(indiceActual=>
            (indiceActual+direccion+lista.length)%lista.length
        );
    };

    return(
        <ModalPublico
            onCerrar={onCerrar}
            clase="dc-image-viewer"
        >
            <div className="dc-image-viewer-stage">
                <img
                    src={urlImagen(actual)}
                    alt={
                        actual?.textoAlternativo||
                        actual?.titulo||
                        "Imagen ampliada"
                    }
                    referrerPolicy="no-referrer"
                />

                {lista.length>1&&(
                    <>
                        <button
                            type="button"
                            className="dc-viewer-nav prev"
                            onClick={()=>mover(-1)}
                            aria-label="Imagen anterior"
                        >
                            <ChevronLeft size={24}/>
                        </button>

                        <button
                            type="button"
                            className="dc-viewer-nav next"
                            onClick={()=>mover(1)}
                            aria-label="Imagen siguiente"
                        >
                            <ChevronRight size={24}/>
                        </button>
                    </>
                )}
            </div>

            <div className="dc-image-viewer-caption">
                <div>
                    <strong>
                        {actual?.titulo||"Imagen de la especie"}
                    </strong>

                    {actual?.descripcion&&(
                        <p>{actual.descripcion}</p>
                    )}

                    {actual?.creditos&&(
                        <small>
                            Créditos: {actual.creditos}
                        </small>
                    )}
                </div>

                {lista.length>1&&(
                    <span>
                        {indice+1} / {lista.length}
                    </span>
                )}
            </div>
        </ModalPublico>
    );
}

function VisorVideo({video,onCerrar}){
    if(!video){
        return null;
    }

    const enlace=urlVideo(video);
    const youtube=idYoutube(enlace);

    return(
        <ModalPublico
            onCerrar={onCerrar}
            clase="dc-video-viewer"
        >
            <div className="dc-video-viewer-stage">
                {youtube?(
                    <iframe
                        src={`https://www.youtube.com/embed/${youtube}?autoplay=1`}
                        title={video.titulo||"Video de la especie"}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                ):videoDirecto(enlace)?(
                    <video
                        src={enlace}
                        controls
                        autoPlay
                    />
                ):(
                    <div className="dc-video-external">
                        <PlayCircle size={56}/>

                        <strong>
                            {video.titulo||"Video de la especie"}
                        </strong>

                        <p>
                            Este video se encuentra alojado en un sitio externo.
                        </p>

                        {enlace&&(
                            <a
                                href={enlace}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink size={15}/>
                                Abrir video
                            </a>
                        )}
                    </div>
                )}
            </div>

            <div className="dc-video-viewer-copy">
                <h3>
                    {video.titulo||"Video de la especie"}
                </h3>

                {video.descripcion&&(
                    <p>{video.descripcion}</p>
                )}

                {video.creditos&&(
                    <small>
                        Créditos: {video.creditos}
                    </small>
                )}
            </div>
        </ModalPublico>
    );
}

function AjustarMapa({puntos}){
    const map=useMap();

    useEffect(()=>{
        if(!puntos.length){
            return;
        }

        if(puntos.length===1){
            map.setView(
                [puntos[0].lat,puntos[0].lng],
                13
            );
            return;
        }

        map.fitBounds(
            puntos.map(punto=>[
                punto.lat,
                punto.lng
            ]),
            {
                padding:[28,28],
                maxZoom:13
            }
        );
    },[map,puntos]);

    return null;
}

/* =========================================================
   CARRUSEL
   - 1 tarjeta: sin flechas
   - varias tarjetas: reserva espacio lateral
   - nunca tapa texto
   - respeta botones como recetas y videos
   ========================================================= */
function Carrusel({
    children,
    vacio="No hay información disponible."
}){
    const ref=useRef(null);

    const drag=useRef({
        activo:false,
        inicio:0,
        scroll:0
    });

    const items=(
        Array.isArray(children)
            ?children
            :[children]
    ).filter(Boolean);

    const varias=items.length>1;

    if(!items.length){
        return(
            <div className="dc-empty-inline">
                {vacio}
            </div>
        );
    }

    const terminar=()=>{
        drag.current.activo=false;

        ref.current
            ?.classList
            .remove("is-dragging");
    };

    return(
        <div
            className={`dc-carousel-shell ${
                varias
                    ?"has-arrows"
                    :"single-item"
            }`}
        >
            {varias&&(
                <button
                    type="button"
                    className="dc-carousel-arrow left"
                    onClick={()=>
                        ref.current?.scrollBy({
                            left:-360,
                            behavior:"smooth"
                        })
                    }
                    aria-label="Anterior"
                >
                    <ChevronLeft size={19}/>
                </button>
            )}

            <div
                ref={ref}
                className="dc-carousel"
                onPointerDown={evento=>{
                    const interactivo=evento.target.closest(
                        "button,a,input,textarea,select,label,[role='button']"
                    );

                    if(
                        interactivo||
                        evento.pointerType!=="mouse"
                    ){
                        return;
                    }

                    drag.current={
                        activo:true,
                        inicio:evento.clientX,
                        scroll:ref.current.scrollLeft
                    };

                    ref.current
                        .classList
                        .add("is-dragging");

                    ref.current
                        .setPointerCapture?.(
                            evento.pointerId
                        );
                }}
                onPointerMove={evento=>{
                    if(drag.current.activo){
                        ref.current.scrollLeft=
                            drag.current.scroll-
                            (
                                evento.clientX-
                                drag.current.inicio
                            );
                    }
                }}
                onPointerUp={terminar}
                onPointerCancel={terminar}
                onPointerLeave={terminar}
            >
                {items}
            </div>

            {varias&&(
                <button
                    type="button"
                    className="dc-carousel-arrow right"
                    onClick={()=>
                        ref.current?.scrollBy({
                            left:360,
                            behavior:"smooth"
                        })
                    }
                    aria-label="Siguiente"
                >
                    <ChevronRight size={19}/>
                </button>
            )}
        </div>
    );
}

function EncabezadoSeccion({
    icono:Icono,
    titulo,
    descripcion
}){
    return(
        <div className="dc-section-heading">
            <span>
                <Icono size={19}/>
            </span>

            <div>
                <h2>{titulo}</h2>

                {descripcion&&(
                    <p>{descripcion}</p>
                )}
            </div>
        </div>
    );
}

function InfoCard({
    titulo,
    valor,
    alerta=false
}){
    if(!tieneTexto(valor)){
        return null;
    }

    return(
        <article
            className={`dc-info-card ${
                alerta
                    ?"warning"
                    :""
            }`}
        >
            <strong>{titulo}</strong>
            <p>{valor}</p>
        </article>
    );
}

function DetalleCatalogoEspecie(){
    const{idEspecie}=useParams();
    const navigate=useNavigate();

    const[detalle,setDetalle]=useState(null);
    const[cargando,setCargando]=useState(true);
    const[error,setError]=useState("");
    const[pestana,setPestana]=useState("resumen");
    const[portadaAbierta,setPortadaAbierta]=useState(false);

    useEffect(()=>{
        let activo=true;

        async function cargar(){
            try{
                setCargando(true);
                setError("");

                const datos=
                    await obtenerDetalleCatalogoPublico(
                        idEspecie
                    );

                if(activo){
                    setDetalle(datos);
                }
            }catch(errorCarga){
                if(activo){
                    setError(
                        errorCarga?.message||
                        "No se pudo cargar la especie."
                    );
                }
            }finally{
                if(activo){
                    setCargando(false);
                }
            }
        }

        window.scrollTo({
            top:0,
            behavior:"instant"
        });

        cargar();

        return()=>{
            activo=false;
        };
    },[idEspecie]);

    const pestanas=useMemo(()=>{
        if(!detalle){
            return[];
        }

        const alimentacion=detalle.alimentacion;
        const entorno=detalle.entorno;
        const multimedia=detalle.multimedia;

        const resultado=[
            {
                id:"resumen",
                texto:"Resumen",
                icono:BookOpen
            }
        ];

        if(
            alimentacion.partes.length||
            alimentacion.aportes.length||
            alimentacion.beneficios.length||
            alimentacion.preparaciones.length||
            alimentacion.epocas.length
        ){
            resultado.push({
                id:"alimentacion",
                texto:"Alimentación",
                icono:Utensils
            });
        }

        if(
            entorno.habitats.length||
            entorno.ubicaciones.length
        ){
            resultado.push({
                id:"entorno",
                texto:"Entorno",
                icono:MapPin
            });
        }

        if(
            multimedia.imagenes.length||
            multimedia.videos.length||
            multimedia.preparaciones.length
        ){
            resultado.push({
                id:"multimedia",
                texto:"Multimedia",
                icono:ImageIcon
            });
        }

        if(detalle.fuentes.length){
            resultado.push({
                id:"fuentes",
                texto:"Fuentes",
                icono:FileText
            });
        }

        return resultado;
    },[detalle]);

    useEffect(()=>{
        if(
            pestanas.length&&
            !pestanas.some(
                item=>item.id===pestana
            )
        ){
            setPestana("resumen");
        }
    },[pestanas,pestana]);

    if(cargando){
        return(
            <div className="dc-state">
                <div className="dc-loader"/>

                <strong>
                    Cargando ficha de especie...
                </strong>

                <span>
                    Reuniendo la información publicada.
                </span>
            </div>
        );
    }

    if(error||!detalle){
        return(
            <div className="dc-state dc-state-error">
                <Leaf size={44}/>

                <strong>
                    No se pudo abrir la especie
                </strong>

                <span>
                    {error||
                        "La especie no está disponible."}
                </span>

                <button
                    type="button"
                    onClick={()=>
                        navigate("/catalogo")
                    }
                >
                    <ArrowLeft size={17}/>
                    Volver al catálogo
                </button>
            </div>
        );
    }

    const especie=detalle.especie;

    const principal=
        obtenerImagenPrincipalPublica(
            detalle
        );

    const portada=
        urlImagen(principal);

    return(
        <div className="dc-page">
            <button
                type="button"
                className="dc-back"
                onClick={()=>
                    navigate("/catalogo")
                }
            >
                <ArrowLeft size={17}/>
                Volver al catálogo
            </button>

            <section className="dc-hero">
                <div className="dc-hero-image">
                    {portada?(
                        <button
                            type="button"
                            className="dc-hero-image-button"
                            onClick={()=>
                                setPortadaAbierta(true)
                            }
                        >
                            <img
                                src={portada}
                                alt={
                                    principal?.textoAlternativo||
                                    nombreComunPrincipal(especie)
                                }
                                referrerPolicy="no-referrer"
                            />

                            <span>
                                <ImageIcon size={16}/>
                                Ampliar
                            </span>
                        </button>
                    ):(
                        <div className="dc-hero-fallback">
                            <Leaf size={86}/>
                        </div>
                    )}
                </div>

                <div className="dc-hero-copy">
                    <span className="dc-kicker">
                        <Sprout size={15}/>
                        Especie publicada
                    </span>

                    <span className="dc-common">
                        {nombreComunPrincipal(especie)}
                    </span>

                    <h1>
                        <em>
                            {especie.nombreCientifico}
                        </em>
                    </h1>

                    <div className="dc-tags">
                        {especie?.taxonomia?.familia&&(
                            <span>
                                <Tags size={14}/>
                                {especie.taxonomia.familia}
                            </span>
                        )}

                        {especie?.origen&&(
                            <span>
                                <MapPin size={14}/>
                                {especie.origen}
                            </span>
                        )}
                    </div>

                    <p>
                        {especie.descripcion||
                            "Información general de la especie."}
                    </p>
                </div>
            </section>

            <nav className="dc-tabs">
                {pestanas.map(item=>{
                    const Icono=item.icono;

                    return(
                        <button
                            type="button"
                            key={item.id}
                            className={
                                pestana===item.id
                                    ?"active"
                                    :""
                            }
                            onClick={()=>
                                setPestana(item.id)
                            }
                        >
                            <Icono size={16}/>
                            {item.texto}
                        </button>
                    );
                })}
            </nav>

            <main className="dc-content">
                {pestana==="resumen"&&(
                    <Resumen
                        especie={especie}
                    />
                )}

                {pestana==="alimentacion"&&(
                    <Alimentacion
                        datos={detalle.alimentacion}
                        multimediaPreparaciones={
                            detalle.multimedia.preparaciones
                        }
                    />
                )}

                {pestana==="entorno"&&(
                    <Entorno
                        datos={detalle.entorno}
                    />
                )}

                {pestana==="multimedia"&&(
                    <Multimedia
                        datos={detalle.multimedia}
                    />
                )}

                {pestana==="fuentes"&&(
                    <Fuentes
                        datos={detalle.fuentes}
                    />
                )}
            </main>

            {portadaAbierta&&(
                <VisorImagen
                    imagenes={
                        detalle.multimedia.imagenes
                    }
                    indiceInicial={
                        Math.max(
                            detalle.multimedia.imagenes.findIndex(
                                imagen=>imagen===principal
                            ),
                            0
                        )
                    }
                    onCerrar={()=>
                        setPortadaAbierta(false)
                    }
                />
            )}
        </div>
    );
}

function Resumen({especie}){
    const taxonomia=
        especie?.taxonomia||{};

    const nombres=
        Array.isArray(
            especie?.nombresComunes
        )
            ?especie.nombresComunes
            :[];

    const filas=[
        ["Reino",taxonomia.reino||"Plantae"],
        ["Clase",taxonomia.clase],
        ["Orden",taxonomia.ordenTaxonomico],
        ["Familia",taxonomia.familia],
        ["Género",taxonomia.genero],
        [
            "Especie",
            taxonomia.especieTaxonomica||
            especie.nombreCientifico
        ]
    ].filter(([,valor])=>tieneTexto(valor));

    return(
        <>
            <section className="dc-block">
                <EncabezadoSeccion
                    icono={BookOpen}
                    titulo="Información general"
                    descripcion="Datos descriptivos principales de la especie."
                />

                <div className="dc-summary-grid">
                    <InfoCard
                        titulo="Descripción"
                        valor={especie.descripcion}
                    />

                    <InfoCard
                        titulo="Origen"
                        valor={especie.origen}
                    />

                    <InfoCard
                        titulo="Propiedades"
                        valor={especie.propiedades}
                    />

                    <InfoCard
                        titulo="Importancia cultural"
                        valor={especie.importanciaCultural}
                    />

                    <InfoCard
                        titulo="Advertencias"
                        valor={especie.advertencias}
                        alerta
                    />
                </div>
            </section>

            {!!filas.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Tags}
                        titulo="Clasificación taxonómica"
                    />

                    <div className="dc-taxonomy">
                        {filas.map(([nombre,valor])=>(
                            <div key={nombre}>
                                <span>
                                    {nombre}
                                </span>

                                <strong
                                    className={
                                        nombre==="Especie"
                                            ?"scientific"
                                            :""
                                    }
                                >
                                    {valor}
                                </strong>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {!!nombres.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Leaf}
                        titulo="Nombres comunes"
                    />

                    <div className="dc-common-list">
                        {nombres.map((nombre,index)=>(
                            <div
                                key={
                                    nombre.idNombreComun??
                                    nombre.id??
                                    index
                                }
                                className={
                                    nombre.esPrincipal
                                        ?"principal"
                                        :""
                                }
                            >
                                <div>
                                    <strong>
                                        {nombre.nombre}
                                    </strong>

                                    <span>
                                        {nombre.region||
                                            "Región no especificada"}
                                    </span>
                                </div>

                                {nombre.esPrincipal&&(
                                    <em>
                                        Principal
                                    </em>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}

function Alimentacion({
    datos,
    multimediaPreparaciones=[]
}){
    const partes=datos.partes;

    const[receta,setReceta]=useState(null);

    const media=useMemo(()=>{
        if(!receta){
            return{
                imagenes:[],
                videos:[]
            };
        }

        const id=
            receta.idPreparacion??
            receta.id;

        const relacion=
            multimediaPreparaciones.find(
                item=>
                    String(
                        item?.preparacion?.idPreparacion??
                        item?.preparacion?.id
                    )===String(id)
            );

        return{
            imagenes:relacion?.imagenes||[],
            videos:relacion?.videos||[]
        };
    },[
        receta,
        multimediaPreparaciones
    ]);

    return(
        <div className="dc-stack">
            {!!partes.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Sprout}
                        titulo="Partes comestibles"
                        descripcion="Partes de la planta registradas para consumo."
                    />

                    <Carrusel>
                        {partes.map(parte=>(
                            <article
                                className="dc-slide-card"
                                key={parte.idEspecieParte}
                            >
                                <span className="dc-card-icon">
                                    <Leaf size={19}/>
                                </span>

                                <h3>
                                    {nombreParte(parte)}
                                </h3>

                                {parte.descripcion&&(
                                    <p>
                                        {parte.descripcion}
                                    </p>
                                )}

                                {parte.advertencias&&(
                                    <div className="dc-warning">
                                        <CircleAlert size={15}/>
                                        {parte.advertencias}
                                    </div>
                                )}
                            </article>
                        ))}
                    </Carrusel>
                </section>
            )}

            {!!datos.aportes.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Tags}
                        titulo="Aportes nutricionales"
                        descripcion="Nutrientes registrados para las partes comestibles."
                    />

                    <Carrusel>
                        {datos.aportes.map((aporte,index)=>{
                            const nutriente=
                                aporte.nutriente||{};

                            const parte=
                                parteDeId(
                                    partes,
                                    aporte.idEspecieParte
                                );

                            return(
                                <article
                                    className="dc-slide-card"
                                    key={
                                        aporte.idAporte??
                                        index
                                    }
                                >
                                    <span className="dc-card-eyebrow">
                                        {nombreParte(parte)}
                                    </span>

                                    <h3>
                                        {texto(
                                            nutriente.nombre,
                                            aporte.nombreNutriente,
                                            "Nutriente"
                                        )}
                                    </h3>

                                    {nutriente.categoria&&(
                                        <span className="dc-pill">
                                            {nutriente.categoria}
                                        </span>
                                    )}

                                    {aporte.cantidad!=null&&(
                                        <strong className="dc-big-value">
                                            {aporte.cantidad}{" "}
                                            {aporte.unidadMedida||""}
                                        </strong>
                                    )}

                                    {aporte.porcionReferencia&&(
                                        <small>
                                            Porción:{" "}
                                            {aporte.porcionReferencia}
                                        </small>
                                    )}

                                    {aporte.observacion&&(
                                        <p>
                                            {aporte.observacion}
                                        </p>
                                    )}
                                </article>
                            );
                        })}
                    </Carrusel>
                </section>
            )}

            {!!datos.beneficios.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Leaf}
                        titulo="Beneficios"
                        descripcion="Beneficios asociados a las partes comestibles."
                    />

                    <Carrusel>
                        {datos.beneficios.map((relacion,index)=>{
                            const beneficio=
                                relacion.beneficio||{};

                            const parte=
                                parteDeId(
                                    partes,
                                    relacion.idEspecieParte
                                );

                            return(
                                <article
                                    className="dc-slide-card"
                                    key={`${relacion.idEspecieParte}-${relacion.idBeneficio}-${index}`}
                                >
                                    <span className="dc-card-eyebrow">
                                        {nombreParte(parte)}
                                    </span>

                                    <h3>
                                        {texto(
                                            beneficio.nombre,
                                            relacion.nombreBeneficio,
                                            "Beneficio"
                                        )}
                                    </h3>

                                    {beneficio.tipoBeneficio&&(
                                        <span className="dc-pill">
                                            {beneficio.tipoBeneficio}
                                        </span>
                                    )}

                                    {beneficio.descripcion&&(
                                        <p>
                                            {beneficio.descripcion}
                                        </p>
                                    )}

                                    {relacion.observacion&&(
                                        <p className="dc-note">
                                            {relacion.observacion}
                                        </p>
                                    )}
                                </article>
                            );
                        })}
                    </Carrusel>
                </section>
            )}

            {!!datos.preparaciones.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Utensils}
                        titulo="Preparaciones de consumo"
                        descripcion="Toca una preparación para ver la receta completa, imagen y video."
                    />

                    <Carrusel>
                        {datos.preparaciones.map((preparacion,index)=>{
                            const parte=
                                parteDeId(
                                    partes,
                                    preparacion.idEspecieParte
                                );

                            const id=
                                preparacion.idPreparacion??
                                preparacion.id;

                            const relacion=
                                multimediaPreparaciones.find(
                                    item=>
                                        String(
                                            item?.preparacion?.idPreparacion??
                                            item?.preparacion?.id
                                        )===String(id)
                                );

                            const imagen=
                                relacion?.imagenes?.find(
                                    item=>
                                        item?.esPrincipal||
                                        item?.principal
                                )||
                                relacion?.imagenes?.[0];

                            return(
                                <button
                                    type="button"
                                    className="dc-slide-card dc-preparation-card dc-clickable-card"
                                    key={id??index}
                                    aria-haspopup="dialog"
                                    onPointerDown={
                                        evento=>
                                            evento.stopPropagation()
                                    }
                                    onClick={evento=>{
                                        evento.stopPropagation();
                                        setReceta(preparacion);
                                    }}
                                >
                                    {urlImagen(imagen)&&(
                                        <img
                                            className="dc-preparation-thumb"
                                            src={urlImagen(imagen)}
                                            alt={
                                                imagen?.textoAlternativo||
                                                preparacion.nombre||
                                                "Preparación"
                                            }
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    )}

                                    <span className="dc-card-eyebrow">
                                        {nombreParte(parte)}
                                    </span>

                                    <h3>
                                        {preparacion.nombre||
                                            "Preparación"}
                                    </h3>

                                    {preparacion.tipoConsumo&&(
                                        <span className="dc-pill">
                                            {preparacion.tipoConsumo}
                                        </span>
                                    )}

                                    {preparacion.descripcion&&(
                                        <p>
                                            {preparacion.descripcion}
                                        </p>
                                    )}

                                    <span className="dc-open-detail">
                                        <BookOpen size={14}/>
                                        Ver receta completa
                                    </span>
                                </button>
                            );
                        })}
                    </Carrusel>
                </section>
            )}

            {!!datos.epocas.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Leaf}
                        titulo="Épocas de cosecha"
                        descripcion="Períodos registrados para la recolección."
                    />

                    <Carrusel>
                        {datos.epocas.map((epoca,index)=>(
                            <article
                                className="dc-slide-card dc-season-card"
                                key={
                                    epoca.idEpocaCosecha??
                                    epoca.id??
                                    index
                                }
                            >
                                <span className="dc-card-eyebrow">
                                    {nombreParte(
                                        parteDeId(
                                            partes,
                                            epoca.idEspecieParte
                                        )
                                    )}
                                </span>

                                <h3>
                                    {periodoCosecha(epoca)}
                                </h3>

                                {epoca.descripcion&&(
                                    <p>
                                        {epoca.descripcion}
                                    </p>
                                )}

                                {epoca.observacion&&(
                                    <p>
                                        {epoca.observacion}
                                    </p>
                                )}
                            </article>
                        ))}
                    </Carrusel>
                </section>
            )}

            {receta&&(
                <PanelPreparacion
                    preparacion={receta}
                    parte={
                        parteDeId(
                            partes,
                            receta.idEspecieParte
                        )
                    }
                    media={media}
                    onCerrar={()=>
                        setReceta(null)
                    }
                />
            )}
        </div>
    );
}

function PanelPreparacion({
    preparacion,
    parte,
    media,
    onCerrar
}){
    const[
        imagenAbierta,
        setImagenAbierta
    ]=useState(null);

    const[
        videoAbierto,
        setVideoAbierto
    ]=useState(null);

    const principal=
        media.imagenes.find(
            imagen=>
                imagen?.esPrincipal||
                imagen?.principal
        )||
        media.imagenes[0];

    return(
        <>
            <ModalPublico
                onCerrar={onCerrar}
                clase="dc-recipe-viewer"
            >
                <div className="dc-recipe-layout">
                    <div className="dc-recipe-media">
                        {urlImagen(principal)?(
                            <button
                                type="button"
                                className="dc-recipe-main-image"
                                onClick={()=>
                                    setImagenAbierta(0)
                                }
                            >
                                <img
                                    src={urlImagen(principal)}
                                    alt={
                                        principal?.textoAlternativo||
                                        preparacion.nombre||
                                        "Preparación"
                                    }
                                    referrerPolicy="no-referrer"
                                />
                            </button>
                        ):(
                            <div className="dc-recipe-placeholder">
                                <Utensils size={58}/>

                                <span>
                                    Sin imagen del plato
                                </span>
                            </div>
                        )}

                        {media.imagenes.length>1&&(
                            <div className="dc-recipe-thumbs">
                                {media.imagenes.map((imagen,index)=>(
                                    <button
                                        type="button"
                                        key={
                                            imagen.idImagenPreparacion??
                                            imagen.idImagen??
                                            index
                                        }
                                        onClick={()=>
                                            setImagenAbierta(index)
                                        }
                                    >
                                        <img
                                            src={urlImagen(imagen)}
                                            alt={
                                                imagen.textoAlternativo||
                                                imagen.titulo||
                                                preparacion.nombre
                                            }
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {!!media.videos.length&&(
                            <div className="dc-recipe-videos">
                                {media.videos.map((video,index)=>(
                                    <button
                                        type="button"
                                        key={
                                            video.idVideoPreparacion??
                                            video.idVideo??
                                            index
                                        }
                                        onClick={()=>
                                            setVideoAbierto(video)
                                        }
                                    >
                                        <PlayCircle size={20}/>

                                        {video.titulo||
                                            `Video ${index+1}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="dc-recipe-copy">
                        <span className="dc-card-eyebrow">
                            {nombreParte(parte)}
                        </span>

                        <h2>
                            {preparacion.nombre||
                                "Preparación"}
                        </h2>

                        <div className="dc-recipe-badges">
                            {preparacion.tipoConsumo&&(
                                <span>
                                    {preparacion.tipoConsumo}
                                </span>
                            )}

                            {preparacion.tiempoPreparacionMin&&(
                                <span>
                                    {preparacion.tiempoPreparacionMin} min
                                </span>
                            )}

                            {preparacion.numeroPorciones&&(
                                <span>
                                    {preparacion.numeroPorciones} porciones
                                </span>
                            )}

                            {preparacion.requiereCoccion&&(
                                <span>
                                    Requiere cocción
                                </span>
                            )}
                        </div>

                        {preparacion.descripcion&&(
                            <p className="dc-recipe-description">
                                {preparacion.descripcion}
                            </p>
                        )}

                        {preparacion.ingredientes&&(
                            <section>
                                <h3>
                                    Ingredientes
                                </h3>

                                <p>
                                    {preparacion.ingredientes}
                                </p>
                            </section>
                        )}

                        {preparacion.procedimiento&&(
                            <section>
                                <h3>
                                    Procedimiento
                                </h3>

                                <p>
                                    {preparacion.procedimiento}
                                </p>
                            </section>
                        )}

                        {preparacion.fuenteTradicional&&(
                            <section>
                                <h3>
                                    Fuente tradicional
                                </h3>

                                <p>
                                    {preparacion.fuenteTradicional}
                                </p>
                            </section>
                        )}

                        {preparacion.advertencias&&(
                            <div className="dc-warning">
                                <CircleAlert size={16}/>
                                {preparacion.advertencias}
                            </div>
                        )}
                    </div>
                </div>
            </ModalPublico>

            {imagenAbierta!==null&&(
                <VisorImagen
                    imagenes={media.imagenes}
                    indiceInicial={imagenAbierta}
                    onCerrar={()=>
                        setImagenAbierta(null)
                    }
                />
            )}

            {videoAbierto&&(
                <VisorVideo
                    video={videoAbierto}
                    onCerrar={()=>
                        setVideoAbierto(null)
                    }
                />
            )}
        </>
    );
}

function Entorno({datos}){
    const puntos=useMemo(
        ()=>datos.ubicaciones
            .map(ubicacion=>{
                const lat=numero(
                    ubicacion.latitud
                );

                const lng=numero(
                    ubicacion.longitud
                );

                return(
                    lat===null||
                    lng===null
                )
                    ?null
                    :{
                        ubicacion,
                        lat,
                        lng
                    };
            })
            .filter(Boolean),
        [datos.ubicaciones]
    );

    const centro=puntos.length
        ?[
            puntos.reduce(
                (suma,punto)=>
                    suma+punto.lat,
                0
            )/puntos.length,

            puntos.reduce(
                (suma,punto)=>
                    suma+punto.lng,
                0
            )/puntos.length
        ]
        :[
            13.7942,
            -88.8965
        ];

    return(
        <div className="dc-stack">
            {!!datos.habitats.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Mountain}
                        titulo="Hábitats"
                        descripcion="Ambientes donde se encuentra o desarrolla la especie."
                    />

                    <Carrusel>
                        {datos.habitats.map((relacion,index)=>{
                            const habitat=
                                relacion.habitat||{};

                            return(
                                <article
                                    className="dc-slide-card"
                                    key={
                                        relacion.idHabitat??
                                        index
                                    }
                                >
                                    <span className="dc-card-icon">
                                        <Mountain size={19}/>
                                    </span>

                                    <h3>
                                        {texto(
                                            relacion.nombreHabitat,
                                            habitat.nombre,
                                            "Hábitat"
                                        )}
                                    </h3>

                                    {habitat.descripcion&&(
                                        <p>
                                            {habitat.descripcion}
                                        </p>
                                    )}

                                    {relacion.observacion&&(
                                        <p className="dc-note">
                                            {relacion.observacion}
                                        </p>
                                    )}
                                </article>
                            );
                        })}
                    </Carrusel>
                </section>
            )}

            {!!puntos.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={MapPin}
                        titulo="Mapa de ubicaciones"
                        descripcion="Distribución de los registros geográficos de esta especie."
                    />

                    <div className="dc-public-map">
                        <MapContainer
                            center={centro}
                            zoom={8}
                            scrollWheelZoom={false}
                        >
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <AjustarMapa
                                puntos={puntos}
                            />

                            {puntos.map(({
                                ubicacion,
                                lat,
                                lng
                            },index)=>(
                                <CircleMarker
                                    key={
                                        ubicacion.idUbicacion??
                                        index
                                    }
                                    center={[lat,lng]}
                                    radius={8}
                                    pathOptions={{
                                        color:"#1f5c4a",
                                        fillColor:"#3a9468",
                                        fillOpacity:.9,
                                        weight:2
                                    }}
                                >
                                    <Tooltip>
                                        <strong>
                                            {ubicacion.nombreLugar||
                                                "Ubicación"}
                                        </strong>

                                        <br/>

                                        {[
                                            ubicacion.nombreDistrito,
                                            ubicacion.departamentoDistrito
                                        ]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </Tooltip>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    </div>
                </section>
            )}

            {!!datos.ubicaciones.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={MapPin}
                        titulo="Ubicaciones registradas"
                        descripcion="Lugares donde existen registros de esta especie."
                    />

                    <div className="dc-location-grid">
                        {datos.ubicaciones.map((ubicacion,index)=>(
                            <article
                                className="dc-location-card"
                                key={
                                    ubicacion.idUbicacion??
                                    index
                                }
                            >
                                <span>
                                    <MapPin size={18}/>
                                </span>

                                <div>
                                    <h3>
                                        {ubicacion.nombreLugar||
                                            "Ubicación registrada"}
                                    </h3>

                                    <strong>
                                        {[
                                            ubicacion.nombreDistrito,
                                            ubicacion.departamentoDistrito
                                        ]
                                            .filter(Boolean)
                                            .join(", ")||
                                            "Distrito no especificado"}
                                    </strong>

                                    {ubicacion.descripcion&&(
                                        <p>
                                            {ubicacion.descripcion}
                                        </p>
                                    )}

                                    {ubicacion.fechaObservacion&&(
                                        <small>
                                            Observación:{" "}
                                            {ubicacion.fechaObservacion}
                                        </small>
                                    )}

                                    {ubicacion.latitud!==undefined&&
                                        ubicacion.longitud!==undefined&&(
                                        <small>
                                            {ubicacion.latitud},{" "}
                                            {ubicacion.longitud}
                                        </small>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function Multimedia({datos}){
    const[
        imagenAbierta,
        setImagenAbierta
    ]=useState(null);

    const[
        videoAbierto,
        setVideoAbierto
    ]=useState(null);

    return(
        <div className="dc-stack">
            {!!datos.imagenes.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={ImageIcon}
                        titulo="Galería de imágenes"
                        descripcion="Toca una fotografía para verla en tamaño grande."
                    />

                    <div className="dc-gallery">
                        {datos.imagenes.map((imagen,index)=>
                            urlImagen(imagen)&&(
                                <button
                                    type="button"
                                    className="dc-gallery-item"
                                    key={
                                        imagen.idImagenEspecie??
                                        imagen.idImagen??
                                        index
                                    }
                                    onClick={()=>
                                        setImagenAbierta(index)
                                    }
                                >
                                    <img
                                        src={urlImagen(imagen)}
                                        alt={
                                            imagen.textoAlternativo||
                                            imagen.titulo||
                                            "Imagen de la especie"
                                        }
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />

                                    <span className="dc-gallery-zoom">
                                        <ImageIcon size={17}/>
                                        Ver imagen
                                    </span>

                                    <span className="dc-gallery-caption">
                                        <strong>
                                            {imagen.titulo||
                                                "Imagen de la especie"}
                                        </strong>

                                        {imagen.creditos&&(
                                            <small>
                                                Créditos:{" "}
                                                {imagen.creditos}
                                            </small>
                                        )}
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                </section>
            )}

            {!!datos.videos.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={Video}
                        titulo="Videos de la especie"
                        descripcion="Toca un video para reproducirlo en un visor."
                    />

                    <Carrusel>
                        {datos.videos.map((video,index)=>(
                            <VideoCard
                                video={video}
                                onAbrir={()=>
                                    setVideoAbierto(video)
                                }
                                key={
                                    video.idVideoEspecie??
                                    video.idVideo??
                                    index
                                }
                            />
                        ))}
                    </Carrusel>
                </section>
            )}

            {!!datos.preparaciones.length&&(
                <section className="dc-block">
                    <EncabezadoSeccion
                        icono={PlayCircle}
                        titulo="Multimedia de preparaciones"
                        descripcion="Imágenes y videos asociados a formas de consumo."
                    />

                    <div className="dc-prep-media-list">
                        {datos.preparaciones.map(({
                            preparacion,
                            imagenes,
                            videos
                        })=>(
                            <div
                                className="dc-prep-media"
                                key={
                                    preparacion.idPreparacion??
                                    preparacion.id
                                }
                            >
                                <div className="dc-prep-media-head">
                                    <span>
                                        Preparación
                                    </span>

                                    <h3>
                                        {preparacion.nombre||
                                            "Preparación de consumo"}
                                    </h3>
                                </div>

                                <Carrusel>
                                    {[
                                        ...imagenes.map((imagen,index)=>
                                            urlImagen(imagen)&&(
                                                <button
                                                    type="button"
                                                    className="dc-media-slide dc-media-button"
                                                    key={`i-${index}`}
                                                    onClick={()=>
                                                        setImagenAbierta({
                                                            lista:imagenes,
                                                            indice:index
                                                        })
                                                    }
                                                >
                                                    <img
                                                        src={urlImagen(imagen)}
                                                        alt={
                                                            imagen.textoAlternativo||
                                                            imagen.titulo||
                                                            preparacion.nombre
                                                        }
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                    />

                                                    <strong>
                                                        {imagen.titulo||
                                                            preparacion.nombre}
                                                    </strong>
                                                </button>
                                            )
                                        ),

                                        ...videos.map((video,index)=>(
                                            <VideoCard
                                                compacta
                                                video={video}
                                                onAbrir={()=>
                                                    setVideoAbierto(video)
                                                }
                                                key={`v-${index}`}
                                            />
                                        ))
                                    ]}
                                </Carrusel>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {typeof imagenAbierta==="number"&&(
                <VisorImagen
                    imagenes={datos.imagenes}
                    indiceInicial={imagenAbierta}
                    onCerrar={()=>
                        setImagenAbierta(null)
                    }
                />
            )}

            {imagenAbierta&&
                typeof imagenAbierta==="object"&&(
                <VisorImagen
                    imagenes={imagenAbierta.lista}
                    indiceInicial={imagenAbierta.indice}
                    onCerrar={()=>
                        setImagenAbierta(null)
                    }
                />
            )}

            {videoAbierto&&(
                <VisorVideo
                    video={videoAbierto}
                    onCerrar={()=>
                        setVideoAbierto(null)
                    }
                />
            )}
        </div>
    );
}

function VideoCard({
    video,
    compacta=false,
    onAbrir
}){
    const youtube=
        idYoutube(
            urlVideo(video)
        );

    const miniatura=
        youtube
            ?`https://img.youtube.com/vi/${youtube}/hqdefault.jpg`
            :null;

    return(
        <button
            type="button"
            className={`dc-video-card dc-video-button ${
                compacta
                    ?"compact"
                    :""
            }`}
            onClick={onAbrir}
        >
            <div className="dc-video-preview">
                {miniatura?(
                    <img
                        src={miniatura}
                        alt={
                            video.titulo||
                            "Miniatura del video"
                        }
                        loading="lazy"
                    />
                ):(
                    <div>
                        <PlayCircle size={48}/>
                        <span>
                            Video
                        </span>
                    </div>
                )}

                <span className="dc-video-play">
                    <PlayCircle size={36}/>
                </span>
            </div>

            <div className="dc-video-copy">
                <h3>
                    {video.titulo||
                        "Video de la especie"}
                </h3>

                {video.descripcion&&(
                    <p>
                        {video.descripcion}
                    </p>
                )}

                <span className="dc-open-detail">
                    <PlayCircle size={14}/>
                    Reproducir video
                </span>
            </div>
        </button>
    );
}

function Fuentes({datos}){
    return(
        <section className="dc-block">
            <EncabezadoSeccion
                icono={FileText}
                titulo="Fuentes y referencias"
                descripcion="Referencias vinculadas a la información de esta especie."
            />

            <div className="dc-source-list">
                {datos.map((relacion,index)=>{
                    const fuente=
                        relacion.fuente||{};

                    const enlace=
                        texto(
                            fuente.url,
                            fuente.enlace,
                            fuente.doi
                        );

                    return(
                        <article
                            className="dc-source-card"
                            key={
                                fuente.idFuente??
                                relacion.idFuente??
                                index
                            }
                        >
                            <div className="dc-source-number">
                                {String(index+1).padStart(2,"0")}
                            </div>

                            <div>
                                <span>
                                    {texto(
                                        fuente.tipoFuente,
                                        fuente.tipo,
                                        "Referencia"
                                    )}
                                </span>

                                <h3>
                                    {texto(
                                        fuente.titulo,
                                        fuente.nombre,
                                        fuente.referencia,
                                        "Fuente bibliográfica"
                                    )}
                                </h3>

                                <div className="dc-source-meta">
                                    {fuente.autor&&(
                                        <strong>
                                            {fuente.autor}
                                        </strong>
                                    )}

                                    {texto(
                                        fuente.anioPublicacion,
                                        fuente.anio
                                    )&&(
                                        <small>
                                            {texto(
                                                fuente.anioPublicacion,
                                                fuente.anio
                                            )}
                                        </small>
                                    )}

                                    {fuente.editorial&&(
                                        <small>
                                            {fuente.editorial}
                                        </small>
                                    )}
                                </div>

                                {relacion.observacion&&(
                                    <p>
                                        {relacion.observacion}
                                    </p>
                                )}

                                {enlace&&(
                                    <a
                                        href={enlace}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink size={14}/>
                                        Consultar fuente
                                    </a>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

export default DetalleCatalogoEspecie;