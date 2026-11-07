import {useNavigate} from "react-router-dom";
import {
    MapPinned,
    Mountain,
    MapPin,
    ArrowRight,
    Leaf,
    Layers3,
    Globe2,
    Settings2,
    MousePointerClick,
    Search,
    ClipboardList,
    LayoutGrid,
    CheckCircle2,
    Map,
    Route,
    Navigation
} from "lucide-react";
import "../../../styles/entornoLocalizacion.css";

const modulos=[
    {
        nombre:"Hábitats de especie",
        descripcion:"Relaciona cada especie con los hábitats donde puede desarrollarse.",
        icono:Mountain,
        clave:"habitats",
        clase:"habitats",
        etiqueta:"HÁBITAT"
    },
    {
        nombre:"Ubicaciones",
        descripcion:"Registra lugares, coordenadas y observaciones territoriales de las especies.",
        icono:MapPin,
        clave:"ubicaciones",
        clase:"ubicaciones",
        etiqueta:"LOCALIZACIÓN"
    }
];

const resumen=[
    {
        titulo:"2 módulos",
        descripcion:"Gestión territorial disponible",
        icono:Layers3,
        clase:"modulos"
    },
    {
        titulo:"Por especie",
        descripcion:"Hábitats y ubicaciones relacionadas",
        icono:Leaf,
        clase:"especies"
    },
    {
        titulo:"Territorio",
        descripcion:"Información geográfica organizada",
        icono:Globe2,
        clase:"territorio"
    }
];

const flujo=[
    {
        numero:"01",
        titulo:"Selecciona el módulo",
        descripcion:"Elige si administrarás hábitats o ubicaciones.",
        icono:MousePointerClick
    },
    {
        numero:"02",
        titulo:"Selecciona la especie",
        descripcion:"Busca la especie sobre la que deseas trabajar.",
        icono:Search
    },
    {
        numero:"03",
        titulo:"Registra el entorno",
        descripcion:"Asocia hábitats o registra puntos geográficos.",
        icono:ClipboardList
    }
];

function EntornoLocalizacion(){
    const navigate=useNavigate();

    function abrirModulo(clave){
        navigate("/gestion-especies",{
            state:{
                abrirContenido:clave,
                categoria:"entorno",
                rutaRetorno:"/contenido-especies/entorno"
            }
        });
    }

    function irGestion(){
        navigate("/gestion-especies");
    }

    return(
        <div className="el-page">

            <section className="el-hero">

                <div className="el-hero-icon">
                    <MapPinned size={30}/>
                </div>

                <div className="el-hero-content">

                    <span>
                        CONTENIDO DE ESPECIES
                    </span>

                    <h1>
                        Entorno y localización
                    </h1>

                    <p>
                        Gestiona los hábitats asociados a cada especie
                        y registra los lugares donde ha sido observada
                        dentro del territorio.
                    </p>

                </div>

            </section>

            <section className="el-summary">

                {resumen.map(({
                    titulo,
                    descripcion,
                    icono:Icono,
                    clase
                })=>(
                    <article
                        className={`el-summary-card ${clase}`}
                        key={titulo}
                    >

                        <span className="el-summary-icon">
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

            <section className="el-info">

                <div className="el-info-icon">
                    <Leaf size={20}/>
                </div>

                <div>

                    <strong>
                        Información territorial
                    </strong>

                    <p>
                        Selecciona el tipo de información que deseas
                        administrar. Después podrás elegir la especie
                        correspondiente desde Gestión de especies.
                    </p>

                </div>

            </section>

            <section className="el-section">

                <div className="el-section-head">

                    <div>

                        <span>
                            GESTIÓN
                        </span>

                        <h2>
                            Entorno de las especies
                        </h2>

                        <p>
                            Selecciona una opción para comenzar.
                        </p>

                    </div>

                    <div className="el-section-count">
                        <LayoutGrid size={16}/>
                        <strong>
                            {modulos.length}
                        </strong>
                        <span>
                            módulos
                        </span>
                    </div>

                </div>

                <div className="el-grid">

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
                            className={`el-card ${clase}`}
                            key={clave}
                            onClick={()=>
                                abrirModulo(clave)
                            }
                        >

                            <div className="el-card-top">

                                <div className="el-card-icon">
                                    <Icono
                                        size={25}
                                        strokeWidth={1.8}
                                    />
                                </div>

                                <span className="el-card-tag">
                                    {etiqueta}
                                </span>

                                <ArrowRight
                                    className="el-card-arrow"
                                    size={19}
                                />

                            </div>

                            <div className="el-card-body">

                                <h3>
                                    {nombre}
                                </h3>

                                <p>
                                    {descripcion}
                                </p>

                            </div>

                            <div className="el-card-footer">

                                <span>
                                    Administrar
                                </span>

                                <ArrowRight size={15}/>

                            </div>

                        </button>
                    ))}

                </div>

            </section>

            <section className="el-territorial">

                <div className="el-territorial-head">

                    <span>
                        INFORMACIÓN TERRITORIAL
                    </span>

                    <h2>
                        Del ambiente a la ubicación
                    </h2>

                    <p>
                        El entorno de una especie puede documentarse desde
                        su ambiente natural hasta el punto donde fue observada.
                    </p>

                </div>

                <div className="el-territorial-grid">

                    <article className="el-territorial-card habitat">

                        <div className="el-territorial-icon">
                            <Mountain size={22}/>
                        </div>

                        <div>
                            <strong>
                                Hábitat
                            </strong>

                            <span>
                                Ambiente natural
                            </span>
                        </div>

                    </article>

                    <ArrowRight
                        className="el-territorial-arrow"
                        size={19}
                    />

                    <article className="el-territorial-card location">

                        <div className="el-territorial-icon">
                            <MapPin size={22}/>
                        </div>

                        <div>
                            <strong>
                                Localización
                            </strong>

                            <span>
                                Punto geográfico
                            </span>
                        </div>

                    </article>

                    <ArrowRight
                        className="el-territorial-arrow"
                        size={19}
                    />

                    <article className="el-territorial-card map">

                        <div className="el-territorial-icon">
                            <Map size={22}/>
                        </div>

                        <div>
                            <strong>
                                Mapa
                            </strong>

                            <span>
                                Visualización territorial
                            </span>
                        </div>

                    </article>

                </div>

            </section>

            <section className="el-workflow">

                <div className="el-workflow-head">

                    <span>
                        FLUJO DE TRABAJO
                    </span>

                    <h2>
                        Cómo registrar el entorno
                    </h2>

                    <p>
                        Mantén organizada la información territorial
                        asociada a cada especie.
                    </p>

                </div>

                <div className="el-workflow-grid">

                    {flujo.map(({
                        numero,
                        titulo,
                        descripcion,
                        icono:Icono
                    },indice)=>(
                        <article
                            className="el-workflow-card"
                            key={numero}
                        >

                            <div className="el-workflow-number">
                                {numero}
                            </div>

                            <div className="el-workflow-icon">
                                <Icono size={21}/>
                            </div>

                            <div className="el-workflow-copy">

                                <strong>
                                    {titulo}
                                </strong>

                                <p>
                                    {descripcion}
                                </p>

                            </div>

                            {indice<flujo.length-1&&(
                                <ArrowRight
                                    className="el-workflow-arrow"
                                    size={18}
                                />
                            )}

                        </article>
                    ))}

                </div>

            </section>

            <section className="el-bottom-grid">

                <article className="el-quick">

                    <div className="el-bottom-icon">
                        <Settings2 size={21}/>
                    </div>

                    <div className="el-bottom-content">

                        <span>
                            ACCESO RÁPIDO
                        </span>

                        <h3>
                            Gestión de especies
                        </h3>

                        <p>
                            Consulta las especies registradas y selecciona
                            una para administrar su información territorial.
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

                <article className="el-help">

                    <div className="el-bottom-icon">
                        <Navigation size={21}/>
                    </div>

                    <div className="el-bottom-content">

                        <span>
                            LOCALIZACIÓN
                        </span>

                        <h3>
                            Información relacionada
                        </h3>

                        <p>
                            Los hábitats describen el ambiente y las ubicaciones
                            permiten registrar puntos concretos de observación.
                        </p>

                    </div>

                    <div className="el-help-state">
                        <CheckCircle2 size={15}/>
                        Integrado
                    </div>

                </article>

            </section>

        </div>
    );
}

export default EntornoLocalizacion;