import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    ChevronRight,
    Edit3,
    Info,
    Plus,
    Power,
    PowerOff,
    RefreshCw,
    Search,
    Sprout,
    X
} from "lucide-react";
import Swal from "sweetalert2";
import {
    actualizarPartePlanta,
    activarPartePlanta,
    buscarPartesPlanta,
    crearPartePlanta,
    desactivarPartePlanta,
    listarPartesPlanta,
    obtenerPartePlanta
} from "../../api/partePlantaService";
import { volverAlFormulario } from "../../utils/formularioRetorno";
import "../../styles/partesPlanta.css";

const inicial = {
    nombre: "",
    descripcion: ""
};

const porPagina = 7;
const MAX_NOMBRE = 80;
const MAX_DESCRIPCION = 250;

function listaRespuesta(datos) {
    return Array.isArray(datos) ? datos : datos?.content || [];
}

function contieneCaracterControl(texto) {
    return [...texto].some(caracter => {
        const codigo = caracter.charCodeAt(0);

        return (
            codigo <= 8 ||
            codigo === 11 ||
            codigo === 12 ||
            (codigo >= 14 && codigo <= 31) ||
            codigo === 127
        );
    });
}

function ordenarPartes(datos) {
    return [...datos].sort((a, b) => {
        const idA = Number(a.idPartePlanta);
        const idB = Number(b.idPartePlanta);

        if (Number.isFinite(idA) && Number.isFinite(idB)) {
            return idA - idB;
        }

        return String(a.nombre ?? "").localeCompare(
            String(b.nombre ?? ""),
            "es",
            { sensitivity: "base", numeric: true }
        );
    });
}

function obtenerMensaje(error) {
    const data = error?.response?.data;

    return data?.mensaje ||
        data?.message ||
        data?.error ||
        "Ocurrió un error al comunicarse con el servidor.";
}

function erroresBackend(error) {
    const data = error?.response?.data;
    const validaciones =
        data?.erroresValidacion ||
        data?.errors ||
        data?.errores;

    if (Array.isArray(validaciones)) {
        const erroresNormalizados = validaciones.reduce((resultado, validacion) => {
            const campo = validacion?.field || validacion?.campo;
            const mensaje =
                validacion?.defaultMessage ||
                validacion?.message ||
                validacion?.mensaje;

            if (
                (campo === "nombre" || campo === "descripcion") &&
                mensaje
            ) {
                resultado[campo] = mensaje;
            }

            return resultado;
        }, {});

        return Object.keys(erroresNormalizados).length
            ? erroresNormalizados
            : null;
    }

    if (!validaciones || typeof validaciones !== "object") {
        return null;
    }

    const erroresNormalizados = Object.entries(validaciones).reduce(
        (resultado, [campo, valor]) => {
            const campoFormulario = campo.toLowerCase();

            if (
                campoFormulario !== "nombre" &&
                campoFormulario !== "descripcion"
            ) {
                return resultado;
            }

            const mensaje = Array.isArray(valor)
                ? valor[0]
                : typeof valor === "object" && valor !== null
                    ? valor.defaultMessage ||
                    valor.message ||
                    valor.mensaje
                    : valor;

            if (mensaje) {
                resultado[campoFormulario] = String(mensaje);
            }

            return resultado;
        },
        {}
    );

    return Object.keys(erroresNormalizados).length
        ? erroresNormalizados
        : null;
}

function esParteInactiva(error) {
    const mensaje = obtenerMensaje(error).toLowerCase();

    return mensaje.includes("está desactivada") ||
        mensaje.includes("esta desactivada") ||
        mensaje.includes("está inactiva") ||
        mensaje.includes("esta inactiva");
}

function PartesPlanta() {
    const location = useLocation();
    const navigate = useNavigate();
    const [partes, setPartes] = useState([]);
    const [catalogoCompleto, setCatalogoCompleto] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [consultando, setConsultando] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("TODOS");
    const [pagina, setPagina] = useState(1);
    const [modal, setModal] = useState(
        Boolean(location.state?.abrirFormulario)
    );
    const [editando, setEditando] = useState(null);
    const [formulario, setFormulario] = useState(inicial);
    const [errores, setErrores] = useState({});
    const solicitudActual = useRef(0);
    const nombreRef = useRef(null);
    const focoPrevioRef = useRef(null);
    const catalogoRef = useRef([]);
    const catalogoCargado = useRef(false);

    const cargarPartes = useCallback(async () => {
        const solicitud = ++solicitudActual.current;

        try {
            setCargando(true);

            if (!catalogoCargado.current) {
                const todas = ordenarPartes(
                    listaRespuesta(await listarPartesPlanta(false))
                );

                if (solicitud !== solicitudActual.current) return;

                catalogoRef.current = todas;
                catalogoCargado.current = true;
                setCatalogoCompleto(todas);
            }

            let datos;

            if (busqueda.trim()) {
                datos = ordenarPartes(
                    listaRespuesta(await buscarPartesPlanta(busqueda.trim()))
                );
            } else {
                datos = catalogoRef.current.filter(parte => {
                    if (estado === "ACTIVOS") {
                        return parte.activo !== false;
                    }

                    if (estado === "INACTIVOS") {
                        return parte.activo === false;
                    }

                    return true;
                });
            }

            if (solicitud !== solicitudActual.current) return;

            setErrorCarga("");
            setPartes(datos);

            const paginasDisponibles = Math.max(
                1,
                Math.ceil(datos.length / porPagina)
            );

            setPagina(actual => Math.min(actual, paginasDisponibles));
        } catch {
            if (solicitud !== solicitudActual.current) return;

            setPartes([]);
            setCatalogoCompleto([]);
            setErrorCarga(
                "Ocurrió un inconveniente. Intenta nuevamente en unos instantes."
            );
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

    function reintentarCarga() {
        catalogoCargado.current = false;
        cargarPartes();
    }

    function abrirNuevo() {
        focoPrevioRef.current = document.activeElement;
        setEditando(null);
        setFormulario(inicial);
        setErrores({});
        setModal(true);
    }

    async function abrirEditar(parte) {
        focoPrevioRef.current = document.activeElement;

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

    const hayCambiosSinGuardar = useCallback(() => {
        const nombreOriginal = editando?.nombre || "";
        const descripcionOriginal = editando?.descripcion || "";

        return formulario.nombre !== nombreOriginal ||
            formulario.descripcion !== descripcionOriginal;
    }, [formulario, editando]);

    const cerrarModal = useCallback(async () => {
        if (guardando) return;

        if (hayCambiosSinGuardar()) {
            const confirmacion = await Swal.fire({
                icon: "warning",
                title: "¿Descartar cambios?",
                text: "Hay información sin guardar. Si cierras ahora, se perderá.",
                showCancelButton: true,
                confirmButtonText: "Descartar cambios",
                cancelButtonText: "Seguir editando",
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm flora-alert-danger",
                    cancelButton: "flora-alert-cancel"
                },
                buttonsStyling: false
            });

            if (!confirmacion.isConfirmed) return;
        }

        setModal(false);
        setEditando(null);
        setFormulario(inicial);
        setErrores({});
    }, [guardando, hayCambiosSinGuardar]);

    useEffect(() => {
        if (!modal) return undefined;

        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const frame = requestAnimationFrame(() => {
            nombreRef.current?.focus();
        });

        return () => {
            cancelAnimationFrame(frame);
            document.body.style.overflow = overflowAnterior;

            if (
                focoPrevioRef.current instanceof HTMLElement &&
                focoPrevioRef.current.isConnected
            ) {
                focoPrevioRef.current.focus();
            }
        };
    }, [modal]);

    function manejarTecladoModal(evento) {
        if (evento.key === "Escape") {
            evento.preventDefault();
            cerrarModal();
            return;
        }

        if (evento.key !== "Tab") return;

        const elementos = Array.from(
            evento.currentTarget.querySelectorAll(
                "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])"
            )
        ).filter(elemento => elemento.getClientRects().length > 0);

        if (elementos.length === 0) return;

        const primero = elementos[0];
        const ultimo = elementos[elementos.length - 1];

        if (
            evento.shiftKey &&
            (
                document.activeElement === primero ||
                !evento.currentTarget.contains(document.activeElement)
            )
        ) {
            evento.preventDefault();
            ultimo.focus();
        } else if (
            !evento.shiftKey &&
            (
                document.activeElement === ultimo ||
                !evento.currentTarget.contains(document.activeElement)
            )
        ) {
            evento.preventDefault();
            primero.focus();
        }
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
        } else if (!/\p{L}/u.test(nombre)) {
            nuevos.nombre = "El nombre debe contener al menos una letra";
        } else if (nombre.length > MAX_NOMBRE) {
            nuevos.nombre =
                `El nombre no puede exceder ${MAX_NOMBRE} caracteres`;
        } else if (contieneCaracterControl(nombre)) {
            nuevos.nombre = "El nombre contiene caracteres no permitidos";
        }

        if (descripcion.length > MAX_DESCRIPCION) {
            nuevos.descripcion =
                `La descripción no puede exceder ${MAX_DESCRIPCION} caracteres`;
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
        let parteCreada;

        try {
            setGuardando(true);

            if (editando) {
                await actualizarPartePlanta(
                    editando.idPartePlanta,
                    datos
                );
            } else {
                parteCreada = await crearPartePlanta(datos);
            }

            const tituloExito = editando
                ? "Parte actualizada"
                : "Parte registrada";

            setModal(false);
            setEditando(null);
            setFormulario(inicial);
            setErrores({});

            catalogoCargado.current = false;
            await cargarPartes();

            if (
                !editando &&
                volverAlFormulario(
                    navigate,
                    location.state?.retornoFormulario,
                    parteCreada,
                    ["idPartePlanta", "id"]
                )
            ) {
                return;
            }

            await Swal.fire({
                icon: "success",
                title: tituloExito,
                text: "La información se guardó correctamente.",
                timer: 1700,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                },
                buttonsStyling: false
            });
        } catch (error) {
            if (esParteInactiva(error)) {
                const nombre = formulario.nombre.trim();

                setErrores(prev => ({
                    ...prev,
                    nombre: `La parte "${nombre}" ya existe, pero está inactiva. Reactívala desde el filtro "Inactivas".`
                }));

                await Swal.fire({
                    icon: "info",
                    title: "La parte ya existe",
                    text: `La parte "${nombre}" está inactiva. Búscala en el filtro "Inactivas" y pulsa "Reactivar".`,
                    customClass: {
                        popup: "flora-alert",
                        confirmButton: "flora-alert-confirm"
                    },
                    buttonsStyling: false
                });

                return;
            }

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
            text: `La parte "${parte.nombre}" dejará de estar disponible.`,
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

            catalogoCargado.current = false;
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

    async function activar(parte) {
        const confirmacion = await Swal.fire({
            icon: "question",
            title: "¿Reactivar esta parte?",
            text: `La parte «${parte.nombre}» volverá a estar disponible.`,
            showCancelButton: true,
            confirmButtonText: "Sí, reactivar",
            cancelButtonText: "Cancelar",
            customClass: {
                popup: "flora-alert",
                confirmButton: "flora-alert-confirm",
                cancelButton: "flora-alert-cancel"
            },
            buttonsStyling: false
        });

        if (!confirmacion.isConfirmed) return;

        try {
            await activarPartePlanta(parte.idPartePlanta);

            await Swal.fire({
                icon: "success",
                title: "Parte reactivada",
                text: "La parte volvió a estar disponible.",
                timer: 1600,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                },
                buttonsStyling: false
            });

            catalogoCargado.current = false;
            await cargarPartes();
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "No se pudo reactivar",
                text: error?.response?.status === 404
                    ? "La parte ya no existe o no está disponible."
                    : "No se pudo completar la reactivación. Verifica tu conexión e inténtalo de nuevo.",
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
                        <strong>{errorCarga ? "—" : catalogoCompleto.length}</strong>
                        <span>{errorCarga ? "Información no disponible" : "Partes registradas"}</span>
                    </div>
                </div>

                <div className="partes-metric partes-metric-active">
                    <div className="partes-metric-icon">
                        <Sprout size={21} />
                    </div>

                    <div>
                        <strong>{errorCarga ? "—" : activos}</strong>
                        <span>{errorCarga ? "Información no disponible" : "Activas"}</span>
                    </div>
                </div>

                <div className="partes-metric partes-metric-inactive">
                    <div className="partes-metric-icon">
                        <PowerOff size={20} />
                    </div>

                    <div>
                        <strong>{errorCarga ? "—" : inactivos}</strong>
                        <span>{errorCarga ? "Información no disponible" : "Inactivas"}</span>
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
                        onClick={reintentarCarga}
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
                            ) : errorCarga ? (
                                <tr>
                                    <td colSpan="4">
                                        <div className="partes-table-state partes-table-error">
                                            <Info size={31} />
                                            <strong>No pudimos cargar las partes</strong>
                                            <span>{errorCarga}</span>
                                            <button
                                                type="button"
                                                className="partes-retry"
                                                onClick={reintentarCarga}
                                            >
                                                Intentar de nuevo
                                            </button>
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
                                                    <strong title={parte.nombre}>
                                                        {parte.nombre}
                                                    </strong>
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

                                                {parte.activo !== false ? (
                                                    <button
                                                        type="button"
                                                        className="deactivate"
                                                        title="Dar de baja"
                                                        aria-label={`Dar de baja ${parte.nombre}`}
                                                        onClick={() =>
                                                            desactivar(parte)
                                                        }
                                                    >
                                                        <PowerOff size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="activate"
                                                        title="Reactivar"
                                                        aria-label={`Reactivar ${parte.nombre}`}
                                                        onClick={() => activar(parte)}
                                                    >
                                                        <Power size={16} />
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
                    ) : errorCarga ? (
                        <div className="partes-mobile-state partes-table-error">
                            <Info size={31} />
                            <strong>No pudimos cargar las partes</strong>
                            <span>{errorCarga}</span>
                            <button
                                type="button"
                                className="partes-retry"
                                onClick={reintentarCarga}
                            >
                                Intentar de nuevo
                            </button>
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
                                            <strong title={parte.nombre}>
                                                {parte.nombre}
                                            </strong>
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

                                        {parte.activo !== false ? (
                                            <button
                                                type="button"
                                                className="deactivate"
                                                title="Dar de baja"
                                                aria-label={`Dar de baja ${parte.nombre}`}
                                                onClick={() => desactivar(parte)}
                                            >
                                                <PowerOff size={17} />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="activate"
                                                title="Reactivar"
                                                aria-label={`Reactivar ${parte.nombre}`}
                                                onClick={() => activar(parte)}
                                            >
                                                <Power size={17} />
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
                            {paginaActual} / {totalPaginas}
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
                        onKeyDown={manejarTecladoModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="parte-modal-title"
                    >
                        <div className="partes-modal-header">
                            <div>
                                <span>
                                    {editando ? "EDICIÓN" : "NUEVO REGISTRO"}
                                </span>

                                <h2 id="parte-modal-title">
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

                        <form noValidate onSubmit={guardar}>
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
                                                ref={nombreRef}
                                                value={formulario.nombre}
                                                onChange={cambiarCampo}
                                                maxLength={MAX_NOMBRE}
                                                placeholder="Ej. Hoja"
                                                required
                                                aria-invalid={Boolean(
                                                    errores.nombre
                                                )}
                                                aria-describedby="parte-nombre-error parte-nombre-count"
                                                className={errores.nombre
                                                    ? "input-error"
                                                    : ""}
                                            />

                                            <div className="partes-field-line">
                                                <small
                                                    id="parte-nombre-error"
                                                    className="partes-field-error"
                                                    aria-live="polite"
                                                >
                                                    {errores.nombre}
                                                </small>

                                                <small id="parte-nombre-count">
                                                    {formulario.nombre.length}/{MAX_NOMBRE}
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
                                                maxLength={MAX_DESCRIPCION}
                                                rows={6}
                                                placeholder="Describe brevemente esta parte de la planta..."
                                                aria-invalid={Boolean(
                                                    errores.descripcion
                                                )}
                                                aria-describedby="parte-descripcion-error parte-descripcion-count"
                                                className={errores.descripcion
                                                    ? "input-error"
                                                    : ""}
                                            />

                                            <div className="partes-field-line">
                                                <small
                                                    id="parte-descripcion-error"
                                                    className="partes-field-error"
                                                    aria-live="polite"
                                                >
                                                    {errores.descripcion}
                                                </small>

                                                <small id="parte-descripcion-count">
                                                    {formulario.descripcion.length}/{MAX_DESCRIPCION}
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
