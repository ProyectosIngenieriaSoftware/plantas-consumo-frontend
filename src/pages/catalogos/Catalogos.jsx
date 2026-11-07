import {useNavigate} from "react-router-dom";
import{
    Mountain,
    BookOpen,
    Apple,
    HeartPulse,
    Sprout,
    ArrowRight,
    Layers3,
    Database,
    Settings2,
    MousePointerClick,
    ClipboardList,
    Link2,
    LayoutGrid,
    CheckCircle2,
    Search,
    Leaf
}from "lucide-react";
import "../../styles/catalogos.css";

const catalogos=[
    {
        titulo:"Hábitats",
        descripcion:"Administra los ambientes y condiciones donde se desarrollan las especies.",
        ruta:"/catalogos/habitats",
        icono:Mountain,
        clase:"habitats",
        etiqueta:"ENTORNO"
    },
    {
        titulo:"Fuentes",
        descripcion:"Gestiona las referencias bibliográficas y documentales utilizadas en la información registrada.",
        ruta:"/catalogos/fuentes",
        icono:BookOpen,
        clase:"fuentes",
        etiqueta:"DOCUMENTACIÓN"
    },
    {
        titulo:"Potencial nutricional",
        descripcion:"Administra los nutrientes que pueden relacionarse con las partes comestibles de las especies.",
        ruta:"/catalogos/nutrientes",
        icono:Apple,
        clase:"nutrientes",
        etiqueta:"NUTRICIÓN"
    },
    {
        titulo:"Beneficios",
        descripcion:"Gestiona el catálogo de beneficios utilizados para documentar las propiedades de las plantas.",
        ruta:"/catalogos/beneficios",
        icono:HeartPulse,
        clase:"beneficios",
        etiqueta:"BENEFICIOS"
    },
    {
        titulo:"Partes de planta",
        descripcion:"Administra las partes aprovechables o registradas que pueden asociarse a una especie.",
        ruta:"/catalogos/partes-planta",
        icono:Sprout,
        clase:"partes",
        etiqueta:"ESTRUCTURA"
    }
];

const resumen=[
    {
        titulo:"5 catálogos",
        descripcion:"Información base disponible",
        icono:Layers3,
        clase:"modulos"
    },
    {
        titulo:"Datos reutilizables",
        descripcion:"Registros compartidos entre especies",
        icono:Database,
        clase:"datos"
    },
    {
        titulo:"Gestión centralizada",
        descripcion:"Administración desde un solo lugar",
        icono:Settings2,
        clase:"gestion"
    }
];

const flujo=[
    {
        numero:"01",
        titulo:"Selecciona el catálogo",
        descripcion:"Elige el tipo de información base que necesitas administrar.",
        icono:MousePointerClick
    },
    {
        numero:"02",
        titulo:"Administra los registros",
        descripcion:"Registra, actualiza, activa o consulta los elementos disponibles.",
        icono:ClipboardList
    },
    {
        numero:"03",
        titulo:"Relaciona la información",
        descripcion:"Los registros podrán utilizarse posteriormente en las especies.",
        icono:Link2
    }
];

function Catalogos(){
    const navigate=useNavigate();

    function abrirCatalogo(ruta){
        navigate(ruta);
    }

    function irGestionEspecies(){
        navigate("/gestion-especies");
    }

    return(
        <div className="cg-page">

            <section className="cg-hero">

                <div className="cg-hero-icon">
                    <Database size={30}/>
                </div>

                <div className="cg-hero-content">

                    <span>
                        ADMINISTRACIÓN DEL SISTEMA
                    </span>

                    <h1>
                        Catálogos
                    </h1>

                    <p>
                        Administra la información base utilizada en los
                        diferentes módulos del catálogo botánico, como
                        hábitats, fuentes, nutrientes, beneficios y partes
                        de planta.
                    </p>

                </div>

            </section>

            <section className="cg-summary">

                {resumen.map(({
                    titulo,
                    descripcion,
                    icono:Icono,
                    clase
                })=>(
                    <article
                        className={`cg-summary-card ${clase}`}
                        key={titulo}
                    >

                        <span className="cg-summary-icon">
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

            <section className="cg-info">

                <div className="cg-info-icon">
                    <Database size={20}/>
                </div>

                <div>

                    <strong>
                        Información reutilizable en todo el sistema
                    </strong>

                    <p>
                        Los catálogos permiten mantener registros
                        centralizados que posteriormente pueden asociarse
                        a las especies sin necesidad de crear la misma
                        información varias veces.
                    </p>

                </div>

            </section>

            <section className="cg-section">

                <div className="cg-section-head">

                    <div>

                        <span>
                            GESTIÓN
                        </span>

                        <h2>
                            Catálogos disponibles
                        </h2>

                        <p>
                            Selecciona una opción para administrar
                            sus registros.
                        </p>

                    </div>

                    <div className="cg-section-count">
                        <LayoutGrid size={16}/>

                        <strong>
                            {catalogos.length}
                        </strong>

                        <span>
                            catálogos
                        </span>
                    </div>

                </div>

                <div className="cg-grid">

                    {catalogos.map(({
                        titulo,
                        descripcion,
                        ruta,
                        icono:Icono,
                        clase,
                        etiqueta
                    })=>(
                        <button
                            type="button"
                            className={`cg-card ${clase}`}
                            key={ruta}
                            onClick={()=>
                                abrirCatalogo(ruta)
                            }
                        >

                            <div className="cg-card-top">

                                <div className="cg-card-icon">
                                    <Icono
                                        size={23}
                                        strokeWidth={1.8}
                                    />
                                </div>

                                <span className="cg-card-tag">
                                    {etiqueta}
                                </span>

                                <ArrowRight
                                    className="cg-card-arrow"
                                    size={19}
                                />

                            </div>

                            <div className="cg-card-body">

                                <h3>
                                    {titulo}
                                </h3>

                                <p>
                                    {descripcion}
                                </p>

                            </div>

                            <div className="cg-card-footer">

                                <span>
                                    Administrar
                                </span>

                                <ArrowRight size={15}/>

                            </div>

                        </button>
                    ))}

                </div>

            </section>

            <section className="cg-workflow">

                <div className="cg-workflow-head">

                    <span>
                        FLUJO DE TRABAJO
                    </span>

                    <h2>
                        Cómo administrar los catálogos
                    </h2>

                    <p>
                        El procedimiento de gestión mantiene una
                        estructura similar en todos los catálogos.
                    </p>

                </div>

                <div className="cg-workflow-grid">

                    {flujo.map(({
                        numero,
                        titulo,
                        descripcion,
                        icono:Icono
                    })=>(
                        <article
                            className="cg-workflow-card"
                            key={numero}
                        >

                            <div className="cg-workflow-number">
                                {numero}
                            </div>

                            <div className="cg-workflow-icon">
                                <Icono size={21}/>
                            </div>

                            <div className="cg-workflow-copy">

                                <strong>
                                    {titulo}
                                </strong>

                                <p>
                                    {descripcion}
                                </p>

                            </div>

                        </article>
                    ))}

                </div>

            </section>

            <section className="cg-bottom-grid">

                <article className="cg-quick">

                    <div className="cg-bottom-icon">
                        <Leaf size={21}/>
                    </div>

                    <div className="cg-bottom-content">

                        <span>
                            ACCESO RÁPIDO
                        </span>

                        <h3>
                            Gestión de especies
                        </h3>

                        <p>
                            Consulta las especies registradas y utiliza
                            la información disponible en los catálogos.
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={irGestionEspecies}
                    >
                        Ir a gestión
                        <ArrowRight size={15}/>
                    </button>

                </article>

                <article className="cg-help">

                    <div className="cg-bottom-icon">
                        <Search size={21}/>
                    </div>

                    <div className="cg-bottom-content">

                        <span>
                            ORGANIZACIÓN
                        </span>

                        <h3>
                            Información centralizada
                        </h3>

                        <p>
                            Los catálogos mantienen datos comunes
                            disponibles para los diferentes módulos
                            del sistema.
                        </p>

                    </div>

                    <div className="cg-help-state">
                        <CheckCircle2 size={15}/>
                        Integrado
                    </div>

                </article>

            </section>

        </div>
    );
}

export default Catalogos;