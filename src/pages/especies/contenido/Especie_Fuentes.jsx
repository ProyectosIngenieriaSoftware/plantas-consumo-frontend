import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    BookOpen,
    Check,
    ChevronDown,
    Leaf,
    Link2,
    LoaderCircle,
    Plus,
    Search,
    Trash2,
    X
} from "lucide-react";
import Swal from "sweetalert2";
import { listarEspecies } from "../../../api/especieService";
import {
    actualizarFuenteDeEspecie,
    desvincularFuenteDeEspecie,
    listarFuentesDeEspecie,
    vincularFuenteAEspecie
} from "../../../api/especiesFuentesService";
import { listarFuentes } from "../../../api/fuenteService";
import "../../../styles/nutrientes.css";
import "../../../styles/alertas.css";
import "../../../styles/especiesFuentes.css";

const MAX_OBSERVACION = 2000;

function obtenerMensaje(error) {
    const respuesta = error?.response?.data;

    if (typeof respuesta === "string") {
        return respuesta;
    }

    return respuesta?.mensaje ||
        respuesta?.message ||
        respuesta?.error ||
        error?.message ||
        "No fue posible comunicarse con el servidor.";
}

function obtenerElementos(respuesta) {
    if (Array.isArray(respuesta)) {
        return respuesta;
    }

    return Array.isArray(respuesta?.content) ? respuesta.content : [];
}

function obtenerIdEspecie(especie) {
    return especie?.idEspecie ?? especie?.id;
}

function obtenerNombreEspecie(especie) {
    const cientifico = especie?.nombreCientifico?.trim();
    const nombres = Array.isArray(especie?.nombresComunes)
        ? especie.nombresComunes
        : [];
    const principal = nombres.find(
        nombre => nombre?.esPrincipal === true || nombre?.principal === true
    );
    const nombreComun = principal?.nombre || nombres[0]?.nombre;

    if (cientifico && nombreComun) {
        return `${cientifico} · ${nombreComun}`;
    }

    return cientifico || nombreComun || `Especie ${obtenerIdEspecie(especie)}`;
}

function nombreTipo(tipo) {
    const nombres = {
        LIBRO: "Libro",
        ARTICULO: "Artículo",
        SITIO_WEB: "Sitio web",
        ENTREVISTA: "Entrevista",
        TESIS: "Tesis",
        INFORME: "Informe",
        CONOCIMIENTO_ANCESTRAL: "Conocimiento ancestral",
        OTRO: "Otro"
    };

    return nombres[tipo] || "Sin tipo";
}

function mostrarError(titulo, error) {
    return Swal.fire({
        icon: "error",
        title: titulo,
        text: obtenerMensaje(error),
        confirmButtonText: "Entendido",
        buttonsStyling: false,
        customClass: {
            popup: "flora-alert",
            confirmButton: "flora-alert-confirm"
        }
    });
}

function EspecieFuentes() {
    const { idEspecie: idEspecieRuta } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [especies, setEspecies] = useState([]);
    const [fuentes, setFuentes] = useState([]);
    const [relaciones, setRelaciones] = useState([]);
    const [idEspecie, setIdEspecie] = useState(idEspecieRuta || "");
    const [idFuente, setIdFuente] = useState("");
    const [busquedaFuentes, setBusquedaFuentes] = useState("");
    const [filtroFuentes, setFiltroFuentes] = useState("NO_VINCULADAS");
    const [observacion, setObservacion] = useState("");
    const [vistaVinculoAbierta, setVistaVinculoAbierta] = useState(false);
    const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
    const [cargandoRelaciones, setCargandoRelaciones] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [eliminando, setEliminando] = useState(null);
    const vistaVinculoRef = useRef(null);
    const idFuenteActual = useRef(idFuente);

    useEffect(() => {
        let vigente = true;

        async function cargarCatalogos() {
            try {
                const [respuestaEspecies, respuestaFuentes] = await Promise.all([
                    listarEspecies(),
                    listarFuentes(true)
                ]);

                if (!vigente) {
                    return;
                }

                setEspecies(
                    obtenerElementos(respuestaEspecies)
                        .filter(especie =>
                            obtenerIdEspecie(especie) != null &&
                            especie?.activa !== false &&
                            (
                                String(obtenerIdEspecie(especie)) === idEspecieRuta ||
                                String(especie?.estadoPublicacion || "")
                                    .toUpperCase() !== "PUBLICADA"
                            )
                        )
                        .sort((a, b) =>
                            obtenerNombreEspecie(a).localeCompare(
                                obtenerNombreEspecie(b),
                                "es"
                            )
                        )
                );
                setFuentes(
                    obtenerElementos(respuestaFuentes)
                        .filter(fuente =>
                            fuente?.idFuente != null && fuente?.activa !== false
                        )
                        .sort((a, b) =>
                            (a?.titulo || "").localeCompare(b?.titulo || "", "es")
                        )
                );
            } catch (error) {
                if (vigente) {
                    await mostrarError(
                        "No se pudieron cargar las especies y fuentes",
                        error
                    );
                }
            } finally {
                if (vigente) {
                    setCargandoCatalogos(false);
                }
            }
        }

        cargarCatalogos();

        return () => {
            vigente = false;
        };
    }, [idEspecieRuta]);

    useEffect(() => {
        setIdEspecie(idEspecieRuta || "");
    }, [idEspecieRuta]);

    useEffect(() => {
        if (!idEspecie) {
            return undefined;
        }

        let vigente = true;

        async function cargarRelaciones() {
            try {
                const datos = await listarFuentesDeEspecie(idEspecie);

                if (vigente) {
                    const nuevasRelaciones = obtenerElementos(datos);
                    setRelaciones(nuevasRelaciones);
                    setObservacion(
                        nuevasRelaciones.find(
                            relacion =>
                                    String(relacion.idFuente) === String(idFuenteActual.current)
                        )?.observacion || ""
                    );
                }
            } catch (error) {
                if (vigente) {
                    await mostrarError(
                        "No se pudieron cargar las fuentes vinculadas",
                        error
                    );
                }
            } finally {
                if (vigente) {
                    setCargandoRelaciones(false);
                }
            }
        }

        cargarRelaciones();

        return () => {
            vigente = false;
        };
    }, [idEspecie]);

    const especieSeleccionada = useMemo(
        () => especies.find(especie =>
            String(obtenerIdEspecie(especie)) === String(idEspecie)
        ),
        [especies, idEspecie]
    );

    const fuenteSeleccionada = useMemo(
        () => fuentes.find(fuente =>
            String(fuente.idFuente) === String(idFuente)
        ),
        [fuentes, idFuente]
    );

    const relacionSeleccionada = useMemo(
        () => relaciones.find(relacion =>
            String(relacion.idFuente) === String(idFuente)
        ),
        [relaciones, idFuente]
    );

    const fuentesFiltradas = useMemo(() => {
        const termino = busquedaFuentes.trim().toLocaleLowerCase("es");

        return fuentes.filter(fuente =>
            {
                const vinculada = relaciones.some(
                    relacion =>
                        String(relacion.idFuente) === String(fuente.idFuente)
                );
                const coincideEstado = filtroFuentes === "VINCULADAS"
                    ? vinculada
                    : !vinculada;
                const coincideBusqueda = !termino ||
                    [
                        fuente.titulo,
                        fuente.autor,
                        nombreTipo(fuente.tipoFuente)
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLocaleLowerCase("es")
                        .includes(termino);

                return coincideEstado && coincideBusqueda;
            }
        );
    }, [fuentes, busquedaFuentes, relaciones, filtroFuentes]);

    const cantidadFuentesVinculadas = fuentes.filter(fuente =>
        relaciones.some(
            relacion => String(relacion.idFuente) === String(fuente.idFuente)
        )
    ).length;
    const cantidadFuentesNoVinculadas =
        fuentes.length - cantidadFuentesVinculadas;

    const conectado = Boolean(idEspecie && idFuente);

    useEffect(() => {
        if (!vistaVinculoAbierta) {
            return undefined;
        }

        function cerrarConEscape(evento) {
            if (evento.key === "Escape" && !guardando) {
                setVistaVinculoAbierta(false);
            }
        }

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", cerrarConEscape);

        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", cerrarConEscape);
        };
    }, [vistaVinculoAbierta, guardando]);

    function seleccionarFuente(fuente) {
        const mismoId = String(fuente.idFuente) === String(idFuente);
        const relacion = relaciones.find(
            item => String(item.idFuente) === String(fuente.idFuente)
        );

        const siguienteId = mismoId ? "" : String(fuente.idFuente);
        idFuenteActual.current = siguienteId;
        setIdFuente(siguienteId);
        setObservacion(mismoId ? "" : relacion?.observacion || "");
    }

    function seleccionarRelacion(relacion) {
        idFuenteActual.current = String(relacion.idFuente);
        setIdFuente(String(relacion.idFuente));
        setObservacion(relacion.observacion || "");
        setVistaVinculoAbierta(true);
    }

    function cambiarEspecie() {
        navigate("/gestion-especies", {
            state: {
                abrirContenido: "fuentes",
                categoria: "documentacion",
                rutaRetorno: location.state?.rutaRetorno || "/contenido-especies/documentacion"
            }
        });
    }

    async function guardarVinculo(evento) {
        evento.preventDefault();

        if (!idEspecie || !fuenteSeleccionada) {
            return;
        }

        const textoObservacion = observacion.trim();
        if (textoObservacion.length > MAX_OBSERVACION) {
            await Swal.fire({
                icon: "warning",
                title: "Observación demasiado larga",
                text: `La observación no puede exceder ${MAX_OBSERVACION} caracteres.`,
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                }
            });
            return;
        }

        const datos = {
            idFuente: Number(idFuente),
            observacion: textoObservacion || null
        };

        try {
            setGuardando(true);
            const guardada = relacionSeleccionada
                ? await actualizarFuenteDeEspecie(
                    idEspecie,
                    idFuente,
                    datos
                )
                : await vincularFuenteAEspecie(idEspecie, datos);

            setRelaciones(actuales => {
                const existe = actuales.some(
                    relacion =>
                        String(relacion.idFuente) === String(guardada.idFuente)
                );

                return existe
                    ? actuales.map(relacion =>
                        String(relacion.idFuente) === String(guardada.idFuente)
                            ? guardada
                            : relacion
                    )
                    : [...actuales, guardada];
            });

            setGuardando(false);
            setVistaVinculoAbierta(false);

            await Swal.fire({
                icon: "success",
                title: relacionSeleccionada
                    ? "Relación actualizada"
                    : "Fuente vinculada",
                text: relacionSeleccionada
                    ? "La observación se guardó correctamente."
                    : "La fuente quedó asociada a la especie.",
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                }
            });
        } catch (error) {
            await mostrarError(
                relacionSeleccionada
                    ? "No se pudo actualizar la relación"
                    : "No se pudo vincular la fuente",
                error
            );
        } finally {
            setGuardando(false);
        }
    }

    async function quitarVinculo(relacion) {
        const confirmacion = await Swal.fire({
            icon: "warning",
            title: "¿Desvincular fuente?",
            text: `Se eliminará el vínculo de «${relacion.tituloFuente}» con esta especie. El registro del catálogo se conservará.`,
            showCancelButton: true,
            confirmButtonText: "Sí, desvincular",
            cancelButtonText: "Cancelar",
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: "flora-alert",
                confirmButton: "flora-alert-confirm flora-alert-danger",
                cancelButton: "flora-alert-cancel"
            }
        });

        if (!confirmacion.isConfirmed) {
            return;
        }

        try {
            setEliminando(relacion.idFuente);
            await desvincularFuenteDeEspecie(idEspecie, relacion.idFuente);
            setRelaciones(actuales =>
                actuales.filter(
                    elemento =>
                        String(elemento.idFuente) !== String(relacion.idFuente)
                )
            );

            if (String(idFuente) === String(relacion.idFuente)) {
                setObservacion("");
            }

            await Swal.fire({
                icon: "success",
                title: "Fuente desvinculada",
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                }
            });
        } catch (error) {
            await mostrarError("No se pudo desvincular la fuente", error);
        } finally {
            setEliminando(null);
        }
    }

    return (
        <main className="nt-page ef-page">
            <header className="nt-head ef-head">
                <div>
                    <span className="nt-crumb">ADMINISTRACIÓN <i>/</i> REFERENCIAS</span>
                    <h1>Fuentes por especie</h1>
                    <p>Consulta las fuentes ya vinculadas o abre la vista para crear una relación.</p>
                </div>
                <div className="ef-head-actions">
                    <button
                        type="button"
                        className="ef-change-species"
                        onClick={cambiarEspecie}
                        disabled={guardando}
                    >
                        <ArrowLeft size={16} />
                        Cambiar especie
                    </button>
                    <span className="ef-head-count">
                        <Leaf size={17} />
                        {especies.length} especies
                        <span aria-hidden="true">·</span>
                        <BookOpen size={17} />
                        {fuentes.length} fuentes
                    </span>
                    <button
                        type="button"
                        className="ef-create-trigger"
                        onClick={() => {
                            idFuenteActual.current = "";
                            setIdFuente("");
                            setObservacion("");
                            setVistaVinculoAbierta(true);
                        }}
                        disabled={cargandoCatalogos || !idEspecie || especies.length === 0 || guardando}
                    >
                        <Plus size={16} />
                        Crear vínculo
                    </button>
                </div>
            </header>

            <section className="ef-current-species">
                <span className="ef-current-label">Fuentes vinculadas de la especie</span>
                <strong className="ef-current-name">
                    {especieSeleccionada
                        ? obtenerNombreEspecie(especieSeleccionada)
                        : cargandoCatalogos
                            ? "Cargando especie..."
                            : "Ninguna especie seleccionada"}
                </strong>
                {especieSeleccionada?.estadoPublicacion && (
                    <span className="ef-current-status">
                        {especieSeleccionada.estadoPublicacion}
                    </span>
                )}
            </section>

            {idEspecie && (
                <section className="ef-existing-relations">
                    <header>
                        <div>
                            <span className="ef-panel-overline">REGISTROS GUARDADOS</span>
                            <h2>Fuentes vinculadas a esta especie</h2>
                        </div>
                        <span className="ef-panel-count">{relaciones.length}</span>
                    </header>
                    {cargandoRelaciones ? (
                        <div className="ef-relations-empty">
                            <LoaderCircle className="ef-spinner" size={18} />
                            Cargando vínculos...
                        </div>
                    ) : relaciones.length === 0 ? (
                        <p className="ef-relations-empty">
                            Esta especie todavía no tiene fuentes vinculadas.
                        </p>
                    ) : (
                        <ul>
                            {relaciones.map(relacion => (
                                <li key={`${relacion.idEspecie}-${relacion.idFuente}`}>
                                    <span className="ef-relation-icon"><BookOpen size={16} /></span>
                                    <span className="ef-relation-copy">
                                        <strong>{relacion.tituloFuente}</strong>
                                        <small>
                                            {nombreTipo(relacion.tipoFuente)}
                                            {relacion.observacion
                                                ? ` · ${relacion.observacion}`
                                                : ""}
                                        </small>
                                    </span>
                                    <button
                                        type="button"
                                        className="ef-unlink-icon"
                                        onClick={() => seleccionarRelacion(relacion)}
                                        aria-label={`Editar observación de ${relacion.tituloFuente}`}
                                        title="Editar observación"
                                    >
                                        <ChevronDown size={17} />
                                    </button>
                                    <button
                                        type="button"
                                        className="ef-unlink-icon is-danger"
                                        onClick={() => quitarVinculo(relacion)}
                                        disabled={eliminando === relacion.idFuente}
                                        aria-label={`Desvincular ${relacion.tituloFuente}`}
                                        title="Desvincular fuente"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {vistaVinculoAbierta && createPortal(
                <div
                    className="ef-link-view-backdrop"
                    onMouseDown={evento => {
                        if (
                            evento.target === evento.currentTarget &&
                            !guardando
                        ) {
                            setVistaVinculoAbierta(false);
                        }
                    }}
                >
                    <section
                        className="ef-link-view"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ef-link-view-title"
                        ref={vistaVinculoRef}
                        tabIndex={-1}
                    >
                        <header className="ef-link-view-header">
                            <div>
                                <span className="ef-panel-overline">NUEVO REGISTRO</span>
                                <h2 id="ef-link-view-title">Crear vínculo entre especie y fuente</h2>
                                <p>La especie actual ya está seleccionada. Elige la fuente que deseas asociar.</p>
                            </div>
                            <button
                                type="button"
                                className="ef-link-view-close"
                                onClick={() => setVistaVinculoAbierta(false)}
                                disabled={guardando}
                                aria-label="Cerrar vista de vinculación"
                            >
                                <X size={19} />
                            </button>
                        </header>

            <section className="ef-workspace" aria-label="Especie actual y selector de fuentes">
                <article className={`ef-pick-panel ef-species-panel ${idEspecie ? "is-selected" : ""}`}>
                    <header className="ef-panel-header">
                        <span className="ef-panel-icon"><Leaf size={19} /></span>
                        <div>
                            <span className="ef-panel-overline">LADO 01</span>
                            <h2>Especie seleccionada</h2>
                            <p>El vínculo se creará únicamente para esta especie.</p>
                        </div>
                        <span className="ef-panel-count">{idEspecie ? 1 : 0}</span>
                    </header>
                    <div className="ef-selected-species" aria-live="polite">
                        {cargandoCatalogos ? (
                            <>
                                <LoaderCircle className="ef-spinner" size={18} />
                                <span>Cargando especie...</span>
                            </>
                        ) : especieSeleccionada ? (
                            <>
                                <span className="ef-option-mark"><Check size={16} /></span>
                                <span className="ef-option-copy">
                                    <strong>{obtenerNombreEspecie(especieSeleccionada)}</strong>
                                    <small>
                                        {especieSeleccionada.estadoPublicacion || "Estado no indicado"}
                                    </small>
                                </span>
                            </>
                        ) : (
                            <span>No hay una especie seleccionada. Usa “Cambiar especie” para elegirla.</span>
                        )}
                    </div>
                    <div className="ef-link-preview" aria-live="polite">
                        <span className="ef-preview-icon"><BookOpen size={16} /></span>
                        <span className="ef-preview-copy">
                            <strong>
                                {fuenteSeleccionada?.titulo || "Vista previa de la fuente"}
                            </strong>
                            <small>
                                {fuenteSeleccionada
                                    ? nombreTipo(fuenteSeleccionada.tipoFuente)
                                    : "Selecciona una fuente para previsualizarla"}
                            </small>
                        </span>
                    </div>
                    <footer className="ef-panel-footer">
                        {especieSeleccionada
                            ? "Esta especie se usará para el vínculo"
                            : "No hay una especie seleccionada"}
                    </footer>
                </article>

                <div
                    className={`ef-branch-bridge ${conectado ? "is-connected" : ""}`}
                    aria-label={conectado ? "Especie y fuente seleccionadas" : "Elige una especie y una fuente"}
                >
                    <svg className="ef-branch-svg" viewBox="0 0 120 240" aria-hidden="true">
                        <path className="ef-branch-muted" d="M0 30 C40 30 38 120 60 120 M0 75 C38 75 40 120 60 120 M0 165 C40 165 38 120 60 120 M0 210 C38 210 40 120 60 120" />
                        <path className="ef-branch-muted" d="M60 120 C82 120 80 30 120 30 M60 120 C80 120 82 75 120 75 M60 120 C80 120 82 165 120 165 M60 120 C82 120 80 210 120 210" />
                        <path className="ef-branch-active" d="M0 30 C40 30 38 120 60 120 M0 75 C38 75 40 120 60 120 M0 165 C40 165 38 120 60 120 M0 210 C38 210 40 120 60 120" />
                        <path className="ef-branch-active" d="M60 120 C82 120 80 30 120 30 M60 120 C80 120 82 75 120 75 M60 120 C80 120 82 165 120 165 M60 120 C82 120 80 210 120 210" />
                        <circle className="ef-branch-node" cx="60" cy="120" r="13" />
                        <circle className="ef-branch-core" cx="60" cy="120" r="5" />
                    </svg>
                    <span className="ef-bridge-label">
                        {conectado ? "LISTO" : "CONECTA"}
                    </span>
                    <span className="ef-bridge-icon">
                        {conectado ? <Check size={19} /> : <Link2 size={19} />}
                    </span>
                    <span className="ef-bridge-hint">
                        {conectado ? "selección completa" : "elige ambos"}
                    </span>
                </div>

                <article className={`ef-pick-panel ef-source-panel ${idFuente ? "is-selected" : ""}`}>
                    <header className="ef-panel-header">
                        <span className="ef-panel-icon"><BookOpen size={19} /></span>
                        <div>
                            <span className="ef-panel-overline">LADO 02</span>
                            <h2>Fuentes</h2>
                            <p>Selecciona la referencia que respalda la especie.</p>
                        </div>
                        <span className="ef-panel-count">{fuentes.length}</span>
                    </header>
                    <label className="ef-list-search">
                        <Search size={16} />
                        <input
                            value={busquedaFuentes}
                            onChange={evento => setBusquedaFuentes(evento.target.value)}
                            placeholder="Buscar título, autor o tipo..."
                            aria-label="Buscar fuentes"
                        />
                    </label>
                    <div className="ef-source-filters" aria-label="Filtrar fuentes por vínculo">
                        <button
                            type="button"
                            className={filtroFuentes === "VINCULADAS" ? "is-active" : ""}
                            onClick={() => setFiltroFuentes("VINCULADAS")}
                            aria-pressed={filtroFuentes === "VINCULADAS"}
                        >
                            Vinculadas
                            <span>{cantidadFuentesVinculadas}</span>
                        </button>
                        <button
                            type="button"
                            className={filtroFuentes === "NO_VINCULADAS" ? "is-active" : ""}
                            onClick={() => setFiltroFuentes("NO_VINCULADAS")}
                            aria-pressed={filtroFuentes === "NO_VINCULADAS"}
                        >
                            No vinculadas
                            <span>{cantidadFuentesNoVinculadas}</span>
                        </button>
                    </div>
                    <div className="ef-option-list" role="listbox" aria-label="Lista de fuentes">
                        {cargandoCatalogos ? (
                            <div className="ef-list-state">
                                <LoaderCircle className="ef-spinner" size={20} />
                                <span>Cargando fuentes...</span>
                            </div>
                        ) : !idEspecie ? (
                            <div className="ef-list-state ef-list-prompt">
                                <ChevronDown size={20} />
                                <span>Elige primero una especie.</span>
                            </div>
                        ) : fuentesFiltradas.length === 0 ? (
                            <div className="ef-list-state">
                                <span>
                                    {filtroFuentes === "VINCULADAS"
                                        ? "No hay fuentes vinculadas para esta especie."
                                        : "No hay fuentes disponibles sin vínculo."}
                                </span>
                            </div>
                        ) : fuentesFiltradas.map(fuente => {
                            const id = String(fuente.idFuente);
                            const seleccionado = id === String(idFuente);
                            const vinculada = relaciones.some(
                                relacion => String(relacion.idFuente) === id
                            );

                            return (
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={seleccionado}
                                    key={id}
                                    className={`ef-option ${seleccionado ? "is-selected" : ""}`}
                                    onClick={() => seleccionarFuente(fuente)}
                                    disabled={!idEspecie}
                                >
                                    <span className="ef-option-mark">
                                        {seleccionado ? <Check size={16} /> : <BookOpen size={16} />}
                                    </span>
                                    <span className="ef-option-copy">
                                        <strong>{fuente.titulo}</strong>
                                        <small>
                                            {[nombreTipo(fuente.tipoFuente), fuente.autor]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </small>
                                    </span>
                                    {vinculada && (
                                        <span className="ef-linked-tag">
                                            {seleccionado ? "Vinculada" : <Link2 size={13} />}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <footer className="ef-panel-footer">
                        {fuenteSeleccionada
                            ? nombreTipo(fuenteSeleccionada.tipoFuente)
                            : "Selecciona una fuente"}
                    </footer>
                    <form
                        className="ef-modal-link-form"
                        onSubmit={guardarVinculo}
                    >
                        <label className="ef-observation-field">
                            <span>
                                Observación{" "}
                                <small>opcional · máximo {MAX_OBSERVACION} caracteres</small>
                            </span>
                            <textarea
                                value={observacion}
                                onChange={evento => setObservacion(evento.target.value)}
                                maxLength={MAX_OBSERVACION}
                                rows={2}
                                disabled={!conectado || guardando}
                                placeholder="¿Qué información de la especie respalda esta fuente?"
                            />
                            <small className="ef-character-count">
                                {observacion.length}/{MAX_OBSERVACION}
                            </small>
                        </label>
                        <button
                            type="submit"
                            className="ef-connect-button"
                            disabled={!conectado || guardando || Boolean(eliminando)}
                        >
                            {guardando ? (
                                <LoaderCircle className="ef-spinner" size={17} />
                            ) : relacionSeleccionada ? (
                                <Check size={17} />
                            ) : (
                                <Link2 size={17} />
                            )}
                            {guardando
                                ? "Guardando..."
                                : relacionSeleccionada
                                    ? "Actualizar observación"
                                    : "Confirmar vínculo"}
                        </button>
                    </form>
                </article>
            </section>

                    </section>
                </div>,
                document.body
            )}
        </main>
    );
}

export default EspecieFuentes;
