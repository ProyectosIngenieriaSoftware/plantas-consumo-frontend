import {useNavigate} from "react-router-dom";
import {
    Images,
    BookOpen,
    Image,
    Video,
    Clapperboard,
    ArrowRight,
    LibraryBig,
    Layers3,
    Leaf,
    Settings2,
    MousePointerClick,
    Search,
    ClipboardList,
    LayoutGrid,
    CheckCircle2,
    FileText,
    Database
} from "lucide-react";
import "../../../styles/documentacionMultimedia.css";

const modulos=[
    {
        nombre:"Fuentes de especie",
        descripcion:"Relaciona fuentes bibliográficas y documentales con la información de cada especie.",
        icono:BookOpen,
        clave:"fuentes",
        clase:"fuentes",
        etiqueta:"FUENTES"
    },
    {
        nombre:"Imágenes de especie",
        descripcion:"Administra fotografías e imágenes asociadas a la especie y a sus partes.",
        icono:Image,
        clave:"imagenes",
        clase:"imagenes",
        etiqueta:"IMÁGENES"
    },
    {
        nombre:"Videos de especie",
        descripcion:"Administra videos y material audiovisual relacionado con cada especie.",
        icono:Video,
        clave:"videos",
        clase:"videos",
        etiqueta:"VIDEOS"
    },
    {
        nombre:"Multimedia de preparación",
        descripcion:"Gestiona imágenes y videos vinculados a las preparaciones de consumo.",
        icono:Clapperboard,
        clave:"multimedia-preparacion",
        clase:"multimedia",
        etiqueta:"MULTIMEDIA"
    }
];

const resumen=[
    {
        titulo:"4 módulos",
        descripcion:"Recursos documentales y multimedia",
        icono:Layers3,
        clase:"modulos"
    },
    {
        titulo:"Por especie",
        descripcion:"Recursos organizados individualmente",
        icono:Leaf,
        clase:"especies"
    },
    {
        titulo:"Contenido respaldado",
        descripcion:"Fuentes y material audiovisual",
        icono:Database,
        clase:"respaldo"
    }
];

const flujo=[
    {
        numero:"01",
        titulo:"Selecciona el recurso",
        descripcion:"Elige fuentes, imágenes, videos o multimedia de preparación.",
        icono:MousePointerClick
    },
    {
        numero:"02",
        titulo:"Selecciona la especie",
        descripcion:"Busca la especie a la que se asociará el recurso.",
        icono:Search
    },
    {
        numero:"03",
        titulo:"Registra el contenido",
        descripcion:"Añade el recurso y administra su información relacionada.",
        icono:ClipboardList
    }
];

function DocumentacionMultimedia(){
    const navigate=useNavigate();

    function abrirModulo(clave){
        navigate("/gestion-especies",{
            state:{
                abrirContenido:clave,
                categoria:"documentacion",
                rutaRetorno:"/contenido-especies/documentacion"
            }
        });
    }

    function irGestion(){
        navigate("/gestion-especies");
    }

    return(
        <div className="dm-page">

            <section className="dm-hero">

                <div className="dm-hero-icon">
                    <Images size={30}/>
                </div>

                <div className="dm-hero-content">

                    <span>
                        CONTENIDO DE ESPECIES
                    </span>

                    <h1>
                        Documentación y multimedia
                    </h1>

                    <p>
                        Administra las fuentes que respaldan la información
                        de las especies y los recursos visuales y audiovisuales
                        asociados al catálogo botánico.
                    </p>

                </div>

            </section>

            <section className="dm-summary">

                {resumen.map(({
                    titulo,
                    descripcion,
                    icono:Icono,
                    clase
                })=>(
                    <article
                        className={`dm-summary-card ${clase}`}
                        key={titulo}
                    >

                        <span className="dm-summary-icon">
                            <Icono size={21}/>
                        </span>

                        <div>
                            <strong>
                                {titulo}
                            </strong>

                            <span>
                                {descripcion}
                            </span>
                        </div>

                    </article>
                ))}

            </section>

            <section className="dm-info">

                <div className="dm-info-icon">
                    <LibraryBig size={20}/>
                </div>

                <div>

                    <strong>
                        Información documental y audiovisual
                    </strong>

                    <p>
                        Selecciona el tipo de contenido que deseas administrar.
                        Después podrás elegir la especie correspondiente desde
                        Gestión de especies.
                    </p>

                </div>

            </section>

            <section className="dm-section">

                <div className="dm-section-head">

                    <div>

                        <span>
                            GESTIÓN
                        </span>

                        <h2>
                            Documentación de especies
                        </h2>

                        <p>
                            Selecciona una opción para comenzar.
                        </p>

                    </div>

                    <div className="dm-section-count">
                        <LayoutGrid size={16}/>
                        <strong>
                            {modulos.length}
                        </strong>
                        <span>
                            módulos
                        </span>
                    </div>

                </div>

                <div className="dm-grid">

                    {modulos.map(({
                        nombre,
                        descripcion,
                        icono:Icono,
                        clave,
                        clase,
                        etiqueta
                    })=>(
                        <button
                            type="button"
                            className={`dm-card ${clase}`}
                            key={clave}
                            onClick={()=>
                                abrirModulo(clave)
                            }
                        >

                            <div className="dm-card-top">

                                <div className="dm-card-icon">
                                    <Icono
                                        size={23}
                                        strokeWidth={1.8}
                                    />
                                </div>

                                <span className="dm-card-tag">
                                    {etiqueta}
                                </span>

                                <ArrowRight
                                    className="dm-card-arrow"
                                    size={19}
                                />

                            </div>

                            <div className="dm-card-body">

                                <h3>
                                    {nombre}
                                </h3>

                                <p>
                                    {descripcion}
                                </p>

                            </div>

                            <div className="dm-card-footer">

                                <span>
                                    Administrar
                                </span>

                                <ArrowRight size={15}/>

                            </div>

                        </button>
                    ))}

                </div>

            </section>

            <section className="dm-workflow">

                <div className="dm-workflow-head">

                    <span>
                        FLUJO DE TRABAJO
                    </span>

                    <h2>
                        Cómo administrar la documentación
                    </h2>

                    <p>
                        Los recursos quedan relacionados directamente
                        con la especie seleccionada.
                    </p>

                </div>

                <div className="dm-workflow-grid">

                    {flujo.map(({
                        numero,
                        titulo,
                        descripcion,
                        icono:Icono
                    },indice)=>(
                        <article
                            className="dm-workflow-card"
                            key={numero}
                        >

                            <div className="dm-workflow-number">
                                {numero}
                            </div>

                            <div className="dm-workflow-icon">
                                <Icono size={21}/>
                            </div>

                            <div className="dm-workflow-copy">

                                <strong>
                                    {titulo}
                                </strong>

                                <p>
                                    {descripcion}
                                </p>

                            </div>

                            {indice<flujo.length-1&&(
                                <ArrowRight
                                    className="dm-workflow-arrow"
                                    size={18}
                                />
                            )}

                        </article>
                    ))}

                </div>

            </section>

            <section className="dm-resource-strip">

                <article className="dm-resource-item fuentes">
                    <BookOpen size={20}/>
                    <div>
                        <strong>
                            Fuentes
                        </strong>
                        <span>
                            Respaldo documental
                        </span>
                    </div>
                </article>

                <article className="dm-resource-item imagenes">
                    <Image size={20}/>
                    <div>
                        <strong>
                            Imágenes
                        </strong>
                        <span>
                            Recursos visuales
                        </span>
                    </div>
                </article>

                <article className="dm-resource-item videos">
                    <Video size={20}/>
                    <div>
                        <strong>
                            Videos
                        </strong>
                        <span>
                            Material audiovisual
                        </span>
                    </div>
                </article>

                <article className="dm-resource-item multimedia">
                    <Clapperboard size={20}/>
                    <div>
                        <strong>
                            Multimedia
                        </strong>
                        <span>
                            Recursos de preparación
                        </span>
                    </div>
                </article>

            </section>

            <section className="dm-bottom-grid">

                <article className="dm-quick">

                    <div className="dm-bottom-icon">
                        <Settings2 size={21}/>
                    </div>

                    <div className="dm-bottom-content">

                        <span>
                            ACCESO RÁPIDO
                        </span>

                        <h3>
                            Gestión de especies
                        </h3>

                        <p>
                            Consulta las especies registradas y selecciona
                            la que deseas documentar.
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={irGestion}
                    >
                        Ir a gestión
                        <ArrowRight size={15}/>
                    </button>

                </article>

                <article className="dm-help">

                    <div className="dm-bottom-icon">
                        <FileText size={21}/>
                    </div>

                    <div className="dm-bottom-content">

                        <span>
                            DOCUMENTACIÓN
                        </span>

                        <h3>
                            Recursos asociados
                        </h3>

                        <p>
                            Las fuentes, imágenes y videos permiten respaldar
                            y complementar la información disponible de cada
                            especie.
                        </p>

                    </div>

                    <div className="dm-help-state">
                        <CheckCircle2 size={15}/>
                        Integrado
                    </div>

                </article>

            </section>

        </div>
    );
}

export default DocumentacionMultimedia;