import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import {
    ChevronLeft,
    ChevronRight,
    Edit3,
    Info,
    Plus,
    PowerOff,
    RefreshCw,
    Search,
    Sprout,
    X
} from "lucide-react";
import Swal from "sweetalert2";
import {
    actualizarPartePlanta,
    buscarPartesPlanta,
    crearPartePlanta,
    desactivarPartePlanta,
    listarPartesPlanta,
    obtenerPartePlanta
} from "../../api/partePlantaService";
import "../../styles/partesPlanta.css";

const inicial = {
    nombre: "",
    descripcion: ""
};

const porPagina = 7;

function listaRespuesta(datos) {
    return Array.isArray(datos) ? datos : datos?.content || [];
}

function obtenerMensaje(error) {
    const data = error?.response?.data;

    return data?.mensaje ||
        data?.message ||
        data?.error ||
        "Ocurrió un error al comunicarse con el servidor.";
}

function erroresBackend(error) {
    const validaciones = error?.response?.data?.erroresValidacion;

    return validaciones && typeof validaciones === "object"
        ? validaciones
        : null;
}

function PartesPlanta() {
    const [partes, setPartes] = useState([]);
    const [catalogoCompleto, setCatalogoCompleto] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [consultando, setConsultando] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("TODOS");
    const [pagina, setPagina] = useState(1);
    const [modal, setModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [formulario, setFormulario] = useState(inicial);
    const [errores, setErrores] = useState({});
    const solicitudActual = useRef(0);

    const cargarPartes = useCallback(async () => {
        const solicitud = ++solicitudActual.current;

        try {
            setCargando(true);

            const todas = listaRespuesta(
                await listarPartesPlanta(false)
            );

            if (solicitud !== solicitudActual.current) return;

            setCatalogoCompleto(todas);

            let datos = todas;

            if (busqueda.trim()) {
                datos = listaRespuesta(
                    await buscarPartesPlanta(busqueda.trim())
                );
            } else if (estado === "ACTIVOS") {
                datos = listaRespuesta(
                    await listarPartesPlanta(true)
                );
            }

            if (solicitud !== solicitudActual.current) return;

            setPartes(datos);
            setPagina(1);
        } catch (error) {
            if (solicitud !== solicitudActual.current) return;

            Swal.fire({
                icon: "error",
                title: "No se pudieron cargar las partes",
                text: obtenerMensaje(error),
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                },
                buttonsStyling: false
            });
        } finally {
            if (solicitud === solicitudActual.current) {
                setCargando(false);
            }
        }
    }, [busqueda, estado]);

    useEffect(() => {
        const temporizador = setTimeout(cargarPartes, 250);

        return () => clearTimeout(temporizador);
    }, [cargarPartes]);

    function abrirNuevo() {
        setEditando(null);
        setFormulario(inicial);
        setErrores({});
        setModal(true);
    }

    async function abrirEditar(parte) {
        try {
            setConsultando(true);

            const detalle = await obtenerPartePlanta(
                parte.idPartePlanta
            );

            setEditando(detalle);
            setFormulario({
                nombre: detalle.nombre || "",
                descripcion: detalle.descripcion || ""
            });
            setErrores({});
            setModal(true);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "No se pudo abrir la parte",
                text: obtenerMensaje(error),
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                },
                buttonsStyling: false
            });
        } finally {
            setConsultando(false);
        }
    }

    function cerrarModal() {
        if (guardando) return;

        setModal(false);
        setEditando(null);
        setFormulario(inicial);
        setErrores({});
    }

    function cambiarCampo(evento) {
        const { name, value } = evento.target;

        setFormulario(prev => ({
            ...prev,
            [name]: value
        }));

        setErrores(prev => ({
            ...prev,
            [name]: ""
        }));
    }

    function validar() {
        const nuevos = {};
        const nombre = formulario.nombre.trim();
        const descripcion = formulario.descripcion.trim();

        if (!nombre) {
            nuevos.nombre = "El nombre es obligatorio";
        } else if (nombre.length > 80) {
            nuevos.nombre =
                "El nombre no puede exceder 80 caracteres";
        }

        if (descripcion.length > 250) {
            nuevos.descripcion =
                "La descripción no puede exceder 250 caracteres";
        }

        setErrores(nuevos);

        return Object.keys(nuevos).length === 0;
    }

    async function guardar(evento) {
        evento.preventDefault();

        if (!validar()) return;

        const datos = {
            nombre: formulario.nombre.trim(),
            descripcion: formulario.descripcion.trim() || null
        };

        try {
            setGuardando(true);

            if (editando) {
                await actualizarPartePlanta(
                    editando.idPartePlanta,
                    datos
                );
            } else {
                await crearPartePlanta(datos);
            }

            await Swal.fire({
                icon: "success",
                title: editando
                    ? "Parte actualizada"
                    : "Parte registrada",
                text: "La información se guardó correctamente.",
                timer: 1700,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                },
                buttonsStyling: false
            });

            setModal(false);
            setEditando(null);
            setFormulario(inicial);
            setErrores({});
            await cargarPartes();
        } catch (error) {
            const validaciones = erroresBackend(error);

            if (validaciones) {
                setErrores(validaciones);
            } else {
                Swal.fire({
                    icon: "error",
                    title: "No se pudo guardar",
                    text: obtenerMensaje(error),
                    customClass: {
                        popup: "flora-alert",
                        confirmButton: "flora-alert-confirm"
                    },
                    buttonsStyling: false
                });
            }
        } finally {
            setGuardando(false);
        }
    }

    async function desactivar(parte) {
        const confirmacion = await Swal.fire({
            icon: "warning",
            title: "¿Dar de baja esta parte?",
            html: `La parte <b>${parte.nombre}</b> dejará de estar disponible.`,
            showCancelButton: true,
            confirmButtonText: "Sí, dar de baja",
            cancelButtonText: "Cancelar",
            customClass: {
                popup: "flora-alert",
                confirmButton: "flora-alert-confirm flora-alert-danger",
                cancelButton: "flora-alert-cancel"
            },
            buttonsStyling: false
        });

        if (!confirmacion.isConfirmed) return;

        try {
            await desactivarPartePlanta(parte.idPartePlanta);

            await Swal.fire({
                icon: "success",
                title: "Parte desactivada",
                text: "La baja lógica se realizó correctamente.",
                timer: 1600,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                },
                buttonsStyling: false
            });

            await cargarPartes();
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "No se pudo dar de baja",
                text: obtenerMensaje(error),
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                },
                buttonsStyling: false
            });
        }
    }

    const filtradas = useMemo(() => {
        return partes.filter(parte => {
            if (estado === "ACTIVOS" && parte.activo === false) {
                return false;
            }

            if (estado === "INACTIVOS" && parte.activo !== false) {
                return false;
            }

            return true;
        });
    }, [partes, estado]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(filtradas.length / porPagina)
    );

    const paginaActual = Math.min(pagina, totalPaginas);
    const visibles = filtradas.slice(
        (paginaActual - 1) * porPagina,
        paginaActual * porPagina
    );

    const activos = catalogoCompleto.filter(
        parte => parte.activo !== false
    ).length;
    const inactivos = catalogoCompleto.filter(
        parte => parte.activo === false
    ).length;

    return (
        <div className="partes-page">
            <div className="partes-hero">
                <div className="partes-hero-copy">
                    <span className="partes-crumb">
                        Catálogos <i>/</i> Partes de planta
                    </span>

                    <h1>Partes de planta</h1>

                    <p>
                        Administra las partes aprovechables o registradas de
                        una planta.
                    </p>
                </div>

                <button
                    className="partes-hero-new"
                    onClick={abrirNuevo}
                    type="button"
                >
                    <Plus size={18} />
                    Nueva parte
                </button>
            </div>

            <div className="partes-metrics">
                <div className="partes-metric partes-metric-total">
                    <div className="partes-metric-icon">
                        <Sprout size={21} />
                    </div>

                    <div>
                        <strong>{catalogoCompleto.length}</strong>
                        <span>Partes registradas</span>
                    </div>
                </div>

                <div className="partes-metric partes-metric-active">
                    <div className="partes-metric-icon">
                        <Sprout size={21} />
                    </div>

                    <div>
                        <strong>{activos}</strong>
                        <span>Activas</span>
                    </div>
                </div>

                <div className="partes-metric partes-metric-inactive">
                    <div className="partes-metric-icon">
                        <PowerOff size={20} />
                    </div>

                    <div>
                        <strong>{inactivos}</strong>
                        <span>Inactivas</span>
                    </div>
                </div>
            </div>

            <div className="partes-panel">
                <div className="partes-toolbar">
                    <div className="partes-search">
                        <Search size={18} />

                        <input
                            value={busqueda}
                            onChange={evento => {
                                setBusqueda(evento.target.value);
                                setPagina(1);
                            }}
                            placeholder="Buscar por nombre..."
                            aria-label="Buscar partes de planta"
                        />
                    </div>

                    <div className="partes-segmented" aria-label="Filtrar por estado">
                        {[
                            ["TODOS", "Todas"],
                            ["ACTIVOS", "Activas"],
                            ["INACTIVOS", "Inactivas"]
                        ].map(([valor, etiqueta]) => (
                            <button
                                key={valor}
                                type="button"
                                className={estado === valor ? "on" : ""}
                                aria-pressed={estado === valor}
                                onClick={() => {
                                    setEstado(valor);
                                    setPagina(1);
                                }}
                            >
                                {etiqueta}
                            </button>
                        ))}
                    </div>

                    <button
                        className="partes-refresh"
                        onClick={cargarPartes}
                        type="button"
                        title="Actualizar catálogo"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div className="partes-table-wrapper">
                    <table className="partes-table">
                        <thead>
                            <tr>
                                <th>Parte de planta</th>
                                <th>Descripción</th>
                                <th>Estado</th>
                                <th className="partes-col-actions">
                                    Acciones
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan="4">
                                        <div className="partes-table-state">
                                            <span className="partes-spinner" />
                                            Cargando partes de planta...
                                        </div>
                                    </td>
                                </tr>
                            ) : visibles.length === 0 ? (
                                <tr>
                                    <td colSpan="4">
                                        <div className="partes-table-empty">
                                            <Sprout size={31} />
                                            <strong>
                                                No hay partes para mostrar
                                            </strong>
                                            <span>
                                                Prueba con otro texto o registra
                                                una nueva parte.
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                visibles.map(parte => (
                                    <tr
                                        key={parte.idPartePlanta}
                                        className={parte.activo === false ? "is-off" : ""}
                                    >
                                        <td>
                                            <div className="parte-name">
                                                <div className="parte-avatar">
                                                    <Sprout size={18} />
                                                </div>

                                                <div>
                                                    <strong>{parte.nombre}</strong>
                                                    <span>
                                                        ID #{parte.idPartePlanta}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="parte-description">
                                                {parte.descripcion ||
                                                    "Sin descripción"}
                                            </span>
                                        </td>

                                        <td>
                                            <span className={`parte-status ${parte.activo === false
                                                ? "inactive"
                                                : "active"
                                                }`}>
                                                <i />
                                                {parte.activo === false
                                                    ? "Inactiva"
                                                    : "Activa"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="parte-actions">
                                                <button
                                                    type="button"
                                                    title="Editar"
                                                    onClick={() =>
                                                        abrirEditar(parte)
                                                    }
                                                    disabled={consultando}
                                                >
                                                    <Edit3 size={16} />
                                                </button>

                                                {parte.activo !== false && (
                                                    <button
                                                        type="button"
                                                        className="deactivate"
                                                        title="Dar de baja"
                                                        onClick={() =>
                                                            desactivar(parte)
                                                        }
                                                    >
                                                        <PowerOff size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div
                    className="partes-mobile-list"
                    aria-label="Lista de partes de planta"
                >
                    {cargando ? (
                        <div className="partes-mobile-state">
                            <span className="partes-spinner" />
                            Cargando partes de planta...
                        </div>
                    ) : visibles.length === 0 ? (
                        <div className="partes-mobile-empty">
                            <Sprout size={31} />
                            <strong>No hay partes para mostrar</strong>
                            <span>
                                Prueba con otro texto o registra una nueva parte.
                            </span>
                        </div>
                    ) : (
                        visibles.map(parte => (
                            <article
                                className="parte-mobile-card"
                                key={parte.idPartePlanta}
                            >
                                <div className="parte-mobile-card-header">
                                    <div className="parte-name">
                                        <div className="parte-avatar">
                                            <Sprout size={18} />
                                        </div>

                                        <div>
                                            <strong>{parte.nombre}</strong>
                                            <span>ID #{parte.idPartePlanta}</span>
                                        </div>
                                    </div>

                                    <span className={`parte-status ${parte.activo === false
                                        ? "inactive"
                                        : "active"
                                        }`}>
                                        <i />
                                        {parte.activo === false
                                            ? "Inactiva"
                                            : "Activa"}
                                    </span>
                                </div>

                                <p className="parte-mobile-description">
                                    {parte.descripcion || "Sin descripción"}
                                </p>

                                <div className="parte-mobile-card-footer">
                                    <span>Acciones</span>

                                    <div className="parte-actions">
                                        <button
                                            type="button"
                                            title="Editar"
                                            aria-label={`Editar ${parte.nombre}`}
                                            onClick={() => abrirEditar(parte)}
                                            disabled={consultando}
                                        >
                                            <Edit3 size={17} />
                                        </button>

                                        {parte.activo !== false && (
                                            <button
                                                type="button"
                                                className="deactivate"
                                                title="Dar de baja"
                                                aria-label={`Dar de baja ${parte.nombre}`}
                                                onClick={() => desactivar(parte)}
                                            >
                                                <PowerOff size={17} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>

                <div className="partes-pagination">
                    <span>
                        Mostrando{" "}
                        <strong>
                            {filtradas.length === 0
                                ? 0
                                : (paginaActual - 1) * porPagina + 1}
                        </strong>{" "}a{" "}
                        <strong>
                            {Math.min(
                                paginaActual * porPagina,
                                filtradas.length
                            )}
                        </strong>{" "}de{" "}
                        <strong>{filtradas.length}</strong>
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={paginaActual === 1}
                            onClick={() => setPagina(paginaActual - 1)}
                            aria-label="Página anterior"
                        >
                            <ChevronLeft size={17} />
                        </button>

                        <span className="partes-page-current">
                            {paginaActual}
                        </span>

                        <button
                            type="button"
                            disabled={paginaActual === totalPaginas}
                            onClick={() => setPagina(paginaActual + 1)}
                            aria-label="Página siguiente"
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>
                </div>
            </div>

            {modal && (
                <div
                    className="partes-modal-overlay"
                    onMouseDown={cerrarModal}
                >
                    <div
                        className="partes-modal"
                        onMouseDown={evento => evento.stopPropagation()}
                    >
                        <div className="partes-modal-header">
                            <div>
                                <span>
                                    {editando ? "EDICIÓN" : "NUEVO REGISTRO"}
                                </span>

                                <h2>
                                    {editando
                                        ? "Editar parte de planta"
                                        : "Nueva parte de planta"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="partes-modal-close"
                                onClick={cerrarModal}
                                aria-label="Cerrar formulario"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={guardar}>
                            <div className="partes-modal-body">
                                <div className="partes-form-layout">
                                    <div>
                                        <div className="partes-form-group">
                                            <label htmlFor="parte-nombre">
                                                Nombre <span>*</span>
                                            </label>

                                            <input
                                                id="parte-nombre"
                                                name="nombre"
                                                value={formulario.nombre}
                                                onChange={cambiarCampo}
                                                maxLength={80}
                                                placeholder="Ej. Hoja"
                                                required
                                                aria-invalid={Boolean(
                                                    errores.nombre
                                                )}
                                                className={errores.nombre
                                                    ? "input-error"
                                                    : ""}
                                            />

                                            <div className="partes-field-line">
                                                <small className="partes-field-error">
                                                    {errores.nombre}
                                                </small>

                                                <small>
                                                    {formulario.nombre.length}/80
                                                </small>
                                            </div>
                                        </div>

                                        <div className="partes-form-group">
                                            <label htmlFor="parte-descripcion">
                                                Descripción
                                            </label>

                                            <textarea
                                                id="parte-descripcion"
                                                name="descripcion"
                                                value={formulario.descripcion}
                                                onChange={cambiarCampo}
                                                maxLength={250}
                                                rows={6}
                                                placeholder="Describe brevemente esta parte de la planta..."
                                                aria-invalid={Boolean(
                                                    errores.descripcion
                                                )}
                                                className={errores.descripcion
                                                    ? "input-error"
                                                    : ""}
                                            />

                                            <div className="partes-field-line">
                                                <small className="partes-field-error">
                                                    {errores.descripcion}
                                                </small>

                                                <small>
                                                    {formulario.descripcion.length}/250
                                                </small>
                                            </div>
                                        </div>

                                        <div className="partes-form-info">
                                            <Info size={18} />
                                            <p>
                                                El nombre debe ser único en el
                                                catálogo.
                                            </p>
                                        </div>
                                    </div>

                                    <aside className="partes-preview">
                                        <div className="partes-preview-head">
                                            <Sprout size={19} />
                                            <div>
                                                <strong>Vista previa</strong>
                                                <span>
                                                    Así se mostrará en el catálogo.
                                                </span>
                                            </div>
                                        </div>

                                        <div className="partes-preview-card">
                                            <div className="partes-preview-icon">
                                                <Sprout size={25} />
                                            </div>

                                            <h3>
                                                {formulario.nombre.trim() ||
                                                    "Nombre de la parte"}
                                            </h3>

                                            <p>
                                                {formulario.descripcion.trim() ||
                                                    "La descripción aparecerá aquí mientras completas el formulario."}
                                            </p>

                                            <span className={`partes-preview-status ${editando?.activo === false
                                                ? "inactive"
                                                : "active"
                                                }`}>
                                                <i />
                                                {editando?.activo === false
                                                    ? "Inactiva"
                                                    : "Activa"}
                                            </span>
                                        </div>
                                    </aside>
                                </div>
                            </div>

                            <div className="partes-modal-footer">
                                <button
                                    type="button"
                                    className="partes-btn-cancel"
                                    onClick={cerrarModal}
                                    disabled={guardando}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="partes-btn-save"
                                    disabled={guardando}
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : editando
                                            ? "Guardar cambios"
                                            : "Registrar parte"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PartesPlanta;
