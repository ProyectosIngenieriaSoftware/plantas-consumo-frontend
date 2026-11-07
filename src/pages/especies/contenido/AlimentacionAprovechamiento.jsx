import { useNavigate } from "react-router-dom";
import {
    Utensils,
    Sprout,
    Apple,
    HeartPulse,
    CookingPot,
    CalendarDays,
    ArrowRight,
    Layers3,
    Leaf,
    Settings2,
    MousePointerClick,
    Search,
    ClipboardList,
    LayoutGrid,
    CheckCircle2,
    BookOpen
} from "lucide-react";
import "../../../styles/alimentacionAprovechamiento.css";

const modulos = [
    {
        nombre: "Partes comestibles",
        descripcion: "Administra las partes aprovechables o comestibles asociadas a cada especie.",
        icono: Sprout,
        clave: "partes-comestibles",
        clase: "partes",
        etiqueta: "APROVECHAMIENTO"
    },
    {
        nombre: "Aportes nutricionales",
        descripcion: "Registra los nutrientes aportados por las partes comestibles de una especie.",
        icono: Apple,
        clave: "aportes-nutricionales",
        clase: "nutricion",
        etiqueta: "NUTRICIÓN"
    },
    {
        nombre: "Beneficios por parte",
        descripcion: "Relaciona beneficios documentados con una parte comestible específica.",
        icono: HeartPulse,
        clave: "beneficios",
        clase: "beneficios",
        etiqueta: "BENEFICIOS"
    },
    {
        nombre: "Preparaciones",
        descripcion: "Administra formas de preparación, consumo, ingredientes y procedimientos.",
        icono: CookingPot,
        clave: "preparaciones",
        clase: "preparaciones",
        etiqueta: "PREPARACIÓN"
    },
    {
        nombre: "Épocas de cosecha",
        descripcion: "Registra temporadas o períodos de cosecha para las partes aprovechables.",
        icono: CalendarDays,
        clave: "cosecha",
        clase: "cosecha",
        etiqueta: "COSECHA"
    }
];

const resumen = [
    {
        titulo: "5 módulos",
        descripcion: "Áreas de gestión alimenticia",
        icono: Layers3,
        clase: "modulos"
    },
    {
        titulo: "Por especie",
        descripcion: "Información organizada individualmente",
        icono: Leaf,
        clase: "especies"
    },
    {
        titulo: "Gestión integrada",
        descripcion: "Contenido relacionado entre módulos",
        icono: Settings2,
        clase: "gestion"
    }
];

const flujo = [
    {
        numero: "01",
        titulo: "Selecciona el módulo",
        descripcion: "Elige qué tipo de información deseas administrar.",
        icono: MousePointerClick
    },
    {
        numero: "02",
        titulo: "Selecciona la especie",
        descripcion: "Busca la especie activa sobre la que trabajarás.",
        icono: Search
    },
    {
        numero: "03",
        titulo: "Administra el contenido",
        descripcion: "Registra, actualiza o consulta la información correspondiente.",
        icono: ClipboardList
    }
];

function AlimentacionAprovechamiento() {
    const navigate = useNavigate();

    function abrirModulo(clave) {
        navigate("/gestion-especies", {
            state: {
                abrirContenido: clave,
                categoria: "alimentacion",
                rutaRetorno: "/contenido-especies/alimentacion"
            }
        });
    }

    function irGestion() {
        navigate("/gestion-especies");
    }

    return (
        <div className="aa-page">

            <section className="aa-hero">

                <div className="aa-hero-icon">
                    <Utensils size={30} />
                </div>

                <div className="aa-hero-content">

                    <span>
                        CONTENIDO DE ESPECIES
                    </span>

                    <h1>
                        Alimentación y aprovechamiento
                    </h1>

                    <p>
                        Gestiona las partes comestibles, aportes nutricionales,
                        beneficios, preparaciones y períodos de cosecha
                        asociados a las especies del catálogo.
                    </p>

                </div>

            </section>

            <section className="aa-summary">

                {resumen.map(({
                    titulo,
                    descripcion,
                    icono: Icono,
                    clase
                }) => (
                    <article
                        className={`aa-summary-card ${clase}`}
                        key={titulo}
                    >

                        <span className="aa-summary-icon">
                            <Icono size={21} />
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

            <section className="aa-info">

                <div className="aa-info-icon">
                    <Sprout size={20} />
                </div>

                <div>

                    <strong>
                        Información asociada a una especie
                    </strong>

                    <p>
                        Selecciona el tipo de información que deseas administrar.
                        Después podrás elegir la especie correspondiente desde
                        Gestión de especies.
                    </p>

                </div>

            </section>

            <section className="aa-section">

                <div className="aa-section-head">

                    <div>

                        <span>
                            GESTIÓN
                        </span>

                        <h2>
                            Contenido alimenticio
                        </h2>

                        <p>
                            Selecciona una opción para comenzar.
                        </p>

                    </div>

                    <div className="aa-section-count">
                        <LayoutGrid size={16} />
                        <strong>
                            {modulos.length}
                        </strong>
                        <span>
                            módulos
                        </span>
                    </div>

                </div>

                <div className="aa-grid">

                    {modulos.map(({
                        nombre,
                        descripcion,
                        icono: Icono,
                        clave,
                        clase,
                        etiqueta
                    }) => (
                        <button
                            type="button"
                            className={`aa-card ${clase}`}
                            key={clave}
                            onClick={() =>
                                abrirModulo(clave)
                            }
                        >

                            <div className="aa-card-top">

                                <div className="aa-card-icon">
                                    <Icono
                                        size={23}
                                        strokeWidth={1.8}
                                    />
                                </div>

                                <span className="aa-card-tag">
                                    {etiqueta}
                                </span>

                                <ArrowRight
                                    className="aa-card-arrow"
                                    size={19}
                                />

                            </div>

                            <div className="aa-card-body">

                                <h3>
                                    {nombre}
                                </h3>

                                <p>
                                    {descripcion}
                                </p>

                            </div>

                            <div className="aa-card-footer">

                                <span>
                                    Administrar
                                </span>

                                <ArrowRight size={15} />

                            </div>

                        </button>
                    ))}

                </div>

            </section>

            <section className="aa-workflow">

                <div className="aa-workflow-head">

                    <span>
                        FLUJO DE TRABAJO
                    </span>

                    <h2>
                        Cómo administrar el contenido
                    </h2>

                    <p>
                        El proceso se mantiene igual en todos los módulos
                        de alimentación.
                    </p>

                </div>

                <div className="aa-workflow-grid">

                    {flujo.map(({
                        numero,
                        titulo,
                        descripcion,
                        icono: Icono
                    }, indice) => (
                        <article
                            className="aa-workflow-card"
                            key={numero}
                        >

                            <div className="aa-workflow-number">
                                {numero}
                            </div>

                            <div className="aa-workflow-icon">
                                <Icono size={21} />
                            </div>

                            <div className="aa-workflow-copy">

                                <strong>
                                    {titulo}
                                </strong>

                                <p>
                                    {descripcion}
                                </p>

                            </div>

                            {indice < flujo.length - 1 && (
                                <ArrowRight
                                    className="aa-workflow-arrow"
                                    size={18}
                                />
                            )}

                        </article>
                    ))}

                </div>

            </section>

            <section className="aa-bottom-grid">

                <article className="aa-quick">

                    <div className="aa-bottom-icon">
                        <Settings2 size={21} />
                    </div>

                    <div className="aa-bottom-content">

                        <span>
                            ACCESO RÁPIDO
                        </span>

                        <h3>
                            Gestión de especies
                        </h3>

                        <p>
                            Consulta especies registradas, revisa su estado
                            y selecciona una para administrar su contenido.
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={irGestion}
                    >
                        Ir a gestión
                        <ArrowRight size={15} />
                    </button>

                </article>

                <article className="aa-help">

                    <div className="aa-bottom-icon">
                        <BookOpen size={21} />
                    </div>

                    <div className="aa-bottom-content">

                        <span>
                            ORGANIZACIÓN
                        </span>

                        <h3>
                            Información relacionada
                        </h3>

                        <p>
                            Las partes comestibles sirven como base para
                            nutrientes, beneficios, preparaciones y períodos
                            de cosecha.
                        </p>

                    </div>

                    <div className="aa-help-state">
                        <CheckCircle2 size={15} />
                        Integrado
                    </div>

                </article>

            </section>

        </div>
    );
}

export default AlimentacionAprovechamiento;