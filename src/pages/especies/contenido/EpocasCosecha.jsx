import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    CalendarDays,
    CheckCircle2,
    CircleOff,
    Clock3,
    Info,
    Leaf,
    Pencil,
    Plus,
    RefreshCcw,
    RotateCcw,
    Save,
    Search,
    Sprout,
    X,
    Layers3,
    ArrowLeft
} from "lucide-react";
import { API_URL } from "../../../config";
import ComboBuscable from "../../../components/ComboBuscable";
import {
    activarEpocaCosecha,
    actualizarEpocaCosecha,
    crearEpocaCosecha,
    desactivarEpocaCosecha,
    listarEpocasPorEspecie
} from "../../../api/epocaCosechaService";
import {
    crearEstadoRegistro,
    obtenerFormularioRetornado
} from "../../../utils/formularioRetorno";
import { listarPartesComestibles } from "../../../api/parteComestibleService";
import "../../../styles/epocasCosecha.css";
import "../../../styles/alertas.css";

const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
];

const FORMULARIO_VACIO = {
    idEspecieParte: "",
    mesInicio: "",
    mesFin: "",
    observacion: ""
};

function obtenerLista(datos) {
    if (Array.isArray(datos)) {
        return datos;
    }

    if (Array.isArray(datos?.content)) {
        return datos.content;
    }

    return [];
}

function obtenerMensajeError(error) {
    const data =
        error?.response?.data;

    if (!data) {
        return "No se pudo conectar con el servidor.";
    }

    if (typeof data === "string") {
        return data;
    }

    if (data.mensaje) {
        return data.mensaje;
    }

    if (data.message) {
        return data.message;
    }

    if (
        data.erroresValidacion &&
        typeof data.erroresValidacion === "object"
    ) {
        return Object.values(
            data.erroresValidacion
        )
            .flat()
            .filter(Boolean)
            .join(" ");
    }

    return data.error ||
        "Ocurrió un error inesperado.";
}

function nombreComunPrincipal(especie) {
    if (especie?.nombreComun) {
        return especie.nombreComun;
    }

    const nombres =
        Array.isArray(
            especie?.nombresComunes
        )
            ? especie.nombresComunes
            : [];

    const principal =
        nombres.find(
            nombre =>
                nombre?.esPrincipal === true ||
                nombre?.principal === true
        );

    return principal?.nombre ||
        nombres[0]?.nombre ||
        "Sin nombre común";
}

function nombreMes(numero) {
    return MESES[
        Number(numero) - 1
    ] || "Mes no definido";
}

function periodoTexto(epoca) {
    const inicio =
        Number(epoca.mesInicio);

    const fin =
        Number(epoca.mesFin);

    if (inicio === fin) {
        return nombreMes(inicio);
    }

    return `${nombreMes(inicio)} – ${nombreMes(fin)}`;
}

function EpocasCosecha() {
    const location = useLocation();
    const navigate = useNavigate();
    const { idEspecie } = useParams();

    const [especie, setEspecie] = useState(
        location.state?.especie || null
    );

    const [partes, setPartes] = useState([]);
    const [epocas, setEpocas] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [accionando, setAccionando] = useState(false);

    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("TODAS");
    const [filtroParte, setFiltroParte] = useState("TODAS");

    const [modalAbierto, setModalAbierto] = useState(
        Boolean(location.state?.abrirFormulario)
    );
    const [epocaEditada, setEpocaEditada] = useState(
        location.state?.contextoFormulario?.epocaEditada ||
        null
    );

    const [formulario, setFormulario] = useState(
        obtenerFormularioRetornado(
            FORMULARIO_VACIO,
            location
        )
    );

    const [errores, setErrores] = useState({});

    useEffect(() => {
        cargarTodo();
    }, [idEspecie]);

    function cambiarEspecie() {
        navigate("/gestion-especies", {
            state: {
                abrirContenido: "cosecha",
                categoria: "alimentacion",
                rutaRetorno:
                    location.state?.rutaRetorno ||
                    "/contenido-especies/alimentacion"
            }
        });
    }

    function registrarParteComestible() {
        navigate(
            `/especies/${idEspecie}/contenido/partes-comestibles`,
            {
                state: {
                    especie,
                    desde: "epocas-cosecha",
                    categoria: "alimentacion",
                    rutaRetorno: location.pathname,
                    ...crearEstadoRegistro(
                        location,
                        "idEspecieParte",
                        formulario,
                        { epocaEditada }
                    )
                }
            }
        );
    }

    async function cargarTodo() {
        try {
            setCargando(true);

            const [
                datosPartes,
                datosEpocas,
                respuestaEspecie
            ] = await Promise.all([
                listarPartesComestibles(
                    idEspecie,
                    false
                ),
                listarEpocasPorEspecie(
                    idEspecie,
                    false
                ),
                axios.get(
                    `${API_URL}/api/especies/${idEspecie}`
                )
            ]);

            setPartes(
                obtenerLista(
                    datosPartes
                )
            );

            setEpocas(
                obtenerLista(
                    datosEpocas
                )
            );

            const datos =
                respuestaEspecie.data;

            setEspecie({
                idEspecie:
                    datos.idEspecie,
                nombreCientifico:
                    datos.nombreCientifico,
                nombreComun:
                    nombreComunPrincipal(
                        datos
                    ),
                familia:
                    datos?.taxonomia?.familia ||
                    null,
                genero:
                    datos?.taxonomia?.genero ||
                    null,
                activa:
                    datos.activa
            });
        } catch (error) {
            await Swal.fire({
                icon: "error",
                title: "No se pudieron cargar los datos",
                text: obtenerMensajeError(
                    error
                ),
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });
        } finally {
            setCargando(false);
        }
    }

    async function recargarEpocas() {
        try {
            const datos =
                await listarEpocasPorEspecie(
                    idEspecie,
                    false
                );

            setEpocas(
                obtenerLista(datos)
            );
        } catch (error) {
            await Swal.fire({
                icon: "error",
                title: "No se pudieron actualizar las épocas",
                text: obtenerMensajeError(
                    error
                ),
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });
        }
    }

    const partesActivas = useMemo(
        () => partes.filter(
            parte =>
                parte.activa !== false
        ),
        [partes]
    );

    const partesPorId = useMemo(
        () => new Map(
            partes.map(
                parte => [
                    String(
                        parte.idEspecieParte
                    ),
                    parte
                ]
            )
        ),
        [partes]
    );

    function nombreParte(
        idEspecieParte
    ) {
        return partesPorId
            .get(
                String(
                    idEspecieParte
                )
            )
            ?.nombreParte ||
            "Parte no disponible";
    }

    const epocasFiltradas = useMemo(() => {
        const texto =
            busqueda
                .trim()
                .toLowerCase();

        return epocas.filter(
            epoca => {
                const coincideEstado =
                    filtroEstado === "TODAS" ||
                    (
                        filtroEstado === "ACTIVAS" &&
                        epoca.activa === true
                    ) ||
                    (
                        filtroEstado === "INACTIVAS" &&
                        epoca.activa === false
                    );

                const coincideParte =
                    filtroParte === "TODAS" ||
                    String(
                        epoca.idEspecieParte
                    ) ===
                    String(
                        filtroParte
                    );

                const contenido = [
                    nombreParte(
                        epoca.idEspecieParte
                    ),
                    periodoTexto(epoca),
                    epoca.observacion
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const coincideTexto =
                    !texto ||
                    contenido.includes(
                        texto
                    );

                return (
                    coincideEstado &&
                    coincideParte &&
                    coincideTexto
                );
            }
        );
    }, [
        epocas,
        filtroEstado,
        filtroParte,
        busqueda,
        partesPorId
    ]);

    const estadisticas = useMemo(
        () => ({
            total:
                epocas.length,
            activas:
                epocas.filter(
                    epoca =>
                        epoca.activa === true
                ).length,
            inactivas:
                epocas.filter(
                    epoca =>
                        epoca.activa === false
                ).length
        }),
        [epocas]
    );

    function abrirCrear() {
        if (
            partesActivas.length === 0
        ) {
            Swal.fire({
                icon: "info",
                title: "Sin partes comestibles",
                text: "Primero debes registrar una parte comestible activa para esta especie.",
                showCancelButton: true,
                confirmButtonText: "Registrar parte",
                cancelButtonText: "Cerrar",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        "flora-alert-confirm",
                    cancelButton:
                        "flora-alert-cancel"
                }
            }).then(resultado => {
                if (resultado.isConfirmed) {
                    registrarParteComestible();
                }
            });

            return;
        }

        setEpocaEditada(null);

        setFormulario({
            ...FORMULARIO_VACIO,
            idEspecieParte:
                partesActivas.length === 1
                    ? String(
                        partesActivas[0]
                            .idEspecieParte
                    )
                    : ""
        });

        setErrores({});
        setModalAbierto(true);
    }

    function abrirEditar(epoca) {
        setEpocaEditada(epoca);

        setFormulario({
            idEspecieParte:
                String(
                    epoca.idEspecieParte ||
                    ""
                ),
            mesInicio:
                String(
                    epoca.mesInicio ||
                    ""
                ),
            mesFin:
                String(
                    epoca.mesFin ||
                    ""
                ),
            observacion:
                epoca.observacion ||
                ""
        });

        setErrores({});
        setModalAbierto(true);
    }

    function cerrarModal() {
        if (guardando) {
            return;
        }

        setModalAbierto(false);
        setEpocaEditada(null);

        setFormulario(
            FORMULARIO_VACIO
        );

        setErrores({});
    }

    function cambiarFormulario(
        campo,
        valor
    ) {
        setFormulario(
            actual => ({
                ...actual,
                [campo]: valor
            })
        );

        setErrores(
            actual => ({
                ...actual,
                [campo]: ""
            })
        );
    }

    function validarFormulario() {
        const nuevos = {};

        if (
            !epocaEditada &&
            !formulario.idEspecieParte
        ) {
            nuevos.idEspecieParte =
                "Selecciona una parte comestible.";
        }

        const mesInicio =
            Number(
                formulario.mesInicio
            );

        const mesFin =
            Number(
                formulario.mesFin
            );

        if (
            !Number.isInteger(
                mesInicio
            ) ||
            mesInicio < 1 ||
            mesInicio > 12
        ) {
            nuevos.mesInicio =
                "Selecciona un mes de inicio válido.";
        }

        if (
            !Number.isInteger(
                mesFin
            ) ||
            mesFin < 1 ||
            mesFin > 12
        ) {
            nuevos.mesFin =
                "Selecciona un mes de fin válido.";
        }

        if (
            formulario.observacion
                .trim()
                .length > 500
        ) {
            nuevos.observacion =
                "La observación no puede superar 500 caracteres.";
        }

        if (
            !nuevos.mesInicio &&
            !nuevos.mesFin
        ) {
            const idParte =
                epocaEditada
                    ? epocaEditada.idEspecieParte
                    : formulario.idEspecieParte;

            const duplicada =
                epocas.some(
                    epoca =>
                        String(
                            epoca.idEspecieParte
                        ) ===
                        String(
                            idParte
                        ) &&
                        Number(
                            epoca.mesInicio
                        ) === mesInicio &&
                        Number(
                            epoca.mesFin
                        ) === mesFin &&
                        (
                            !epocaEditada ||
                            epoca.idEpocaCosecha !==
                            epocaEditada.idEpocaCosecha
                        )
                );

            if (duplicada) {
                nuevos.mesFin =
                    "Esta parte ya tiene registrado ese mismo periodo.";
            }
        }

        setErrores(nuevos);

        return (
            Object.keys(nuevos)
                .length === 0
        );
    }

    async function guardarEpoca(
        evento
    ) {
        evento.preventDefault();

        if (
            guardando ||
            !validarFormulario()
        ) {
            return;
        }

        const datos = {
            mesInicio: Number(
                formulario.mesInicio
            ),
            mesFin: Number(
                formulario.mesFin
            ),
            observacion:
                formulario.observacion
                    .trim() ||
                null
        };

        try {
            setGuardando(true);

            if (epocaEditada) {
                await actualizarEpocaCosecha(
                    epocaEditada
                        .idEpocaCosecha,
                    datos
                );
            } else {
                await crearEpocaCosecha({
                    ...datos,
                    idEspecieParte: Number(
                        formulario.idEspecieParte
                    )
                });
            }

            await Swal.fire({
                icon: "success",
                title: epocaEditada
                    ? "Época actualizada"
                    : "Época registrada",
                text: epocaEditada
                    ? "Los cambios fueron guardados correctamente."
                    : "El periodo de cosecha fue asociado correctamente.",
                timer: 1700,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });

            setModalAbierto(false);
            setEpocaEditada(null);

            setFormulario(
                FORMULARIO_VACIO
            );

            setErrores({});

            await recargarEpocas();
        } catch (error) {
            const validaciones =
                error?.response?.data
                    ?.erroresValidacion;

            if (
                validaciones &&
                typeof validaciones ===
                "object"
            ) {
                setErrores(
                    validaciones
                );
            }

            await Swal.fire({
                icon: "error",
                title: epocaEditada
                    ? "No se pudo actualizar"
                    : "No se pudo registrar",
                text: obtenerMensajeError(
                    error
                ),
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });
        } finally {
            setGuardando(false);
        }
    }

    async function cambiarEstado(
        epoca
    ) {
        const activar =
            epoca.activa === false;

        if (activar) {
            const parte =
                partesPorId.get(
                    String(
                        epoca.idEspecieParte
                    )
                );

            if (
                parte?.activa === false
            ) {
                await Swal.fire({
                    icon: "warning",
                    title: "No se puede reactivar",
                    text: "La parte comestible asociada está inactiva. Primero debes reactivarla.",
                    confirmButtonText: "Entendido",
                    buttonsStyling: false,
                    customClass: {
                        popup: "flora-alert",
                        confirmButton:
                            "flora-alert-confirm"
                    }
                });

                return;
            }
        }

        const resultado =
            await Swal.fire({
                icon: activar
                    ? "question"
                    : "warning",
                title: activar
                    ? "¿Reactivar época?"
                    : "¿Desactivar época?",
                html: activar
                    ? `El periodo <b>${periodoTexto(epoca)}</b> volverá a estar disponible.`
                    : `El periodo <b>${periodoTexto(epoca)}</b> quedará inactivo.`,
                showCancelButton: true,
                confirmButtonText: activar
                    ? "Sí, reactivar"
                    : "Sí, desactivar",
                cancelButtonText:
                    "Cancelar",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton: activar
                        ? "flora-alert-confirm"
                        : "flora-alert-confirm flora-alert-danger",
                    cancelButton:
                        "flora-alert-cancel"
                }
            });

        if (
            !resultado.isConfirmed
        ) {
            return;
        }

        try {
            setAccionando(true);

            if (activar) {
                await activarEpocaCosecha(
                    epoca.idEpocaCosecha
                );
            } else {
                await desactivarEpocaCosecha(
                    epoca.idEpocaCosecha
                );
            }

            await recargarEpocas();

            await Swal.fire({
                icon: "success",
                title: activar
                    ? "Época reactivada"
                    : "Época desactivada",
                timer: 1400,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo cambiar el estado",
                text: obtenerMensajeError(
                    error
                ),
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });
        } finally {
            setAccionando(false);
        }
    }

    return (
        <section className="ec-page">

            <div className="ec-hero">

                <div className="ec-hero-copy">

                    <span className="ec-overline">
                        Contenido / Alimentación / {especie?.nombreComun || "Especie"}
                    </span>

                    <h1>
                        Épocas de cosecha
                    </h1>

                    <p>
                        Administra los periodos de cosecha de las partes comestibles de la especie seleccionada.
                    </p>

                </div>

                <div className="ec-hero-actions">

                    <button
                        type="button"
                        className="ec-refresh ec-change-species"
                        onClick={cambiarEspecie}
                    >
                        <ArrowLeft size={17} />
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="ec-refresh"
                        onClick={cargarTodo}
                        disabled={cargando}
                    >
                        <RefreshCcw
                            size={17}
                            className={
                                cargando
                                    ? "ec-spin"
                                    : ""
                            }
                        />

                        Actualizar
                    </button>

                    <button
                        type="button"
                        className="ec-primary-button"
                        onClick={abrirCrear}
                        disabled={cargando}
                    >
                        <Plus size={17} />
                        Nueva época
                    </button>

                </div>

            </div>

            <div className="ec-selected-species">

                <span className="ec-selected-species-icon">
                    <Leaf size={20} />
                </span>

                <div>

                    <small>
                        ESPECIE SELECCIONADA
                    </small>

                    <strong>
                        {especie?.nombreComun ||
                            "Sin nombre común"
                        }
                    </strong>

                    <em>
                        {especie?.nombreCientifico ||
                            "Sin nombre científico"
                        }
                    </em>

                </div>

                {especie?.familia && (
                    <div className="ec-selected-extra">

                        <small>
                            Familia
                        </small>

                        <strong>
                            {especie.familia}
                        </strong>

                    </div>
                )}

            </div>

            <div className="ec-stats">

                <div className="ec-stat ec-stat-species">

                    <span className="ec-stat-icon">
                        <Layers3 size={21} />
                    </span>

                    <div>
                        <strong>
                            {estadisticas.total}
                        </strong>

                        <span>
                            Épocas registradas
                        </span>
                    </div>

                </div>

                <div className="ec-stat ec-stat-parts">

                    <span className="ec-stat-icon">
                        <Sprout size={21} />
                    </span>

                    <div>
                        <strong>
                            {partesActivas.length}
                        </strong>

                        <span>
                            Partes disponibles
                        </span>
                    </div>

                </div>

                <div className="ec-stat ec-stat-active">

                    <span className="ec-stat-icon">
                        <CheckCircle2 size={21} />
                    </span>

                    <div>
                        <strong>
                            {estadisticas.activas}
                        </strong>

                        <span>
                            Épocas activas
                        </span>
                    </div>

                </div>

                <div className="ec-stat ec-stat-total">

                    <span className="ec-stat-icon">
                        <CircleOff size={21} />
                    </span>

                    <div>
                        <strong>
                            {estadisticas.inactivas}
                        </strong>

                        <span>
                            Épocas inactivas
                        </span>
                    </div>

                </div>

            </div>

            <section className="ec-periods-card">

                <div className="ec-periods-head">

                    <div>
                        <span className="ec-kicker">
                            Información de cosecha
                        </span>

                        <h2>
                            Periodos registrados
                        </h2>

                        <p>
                            Consulta y administra las épocas de cosecha por parte comestible.
                        </p>
                    </div>

                </div>

                <div className="ec-periods-toolbar">

                    <label className="ec-search">

                        <Search size={16} />

                        <input
                            type="search"
                            placeholder="Buscar parte, mes u observación..."
                            value={busqueda}
                            onChange={evento =>
                                setBusqueda(
                                    evento.target.value
                                )
                            }
                        />

                        {busqueda && (
                            <button
                                type="button"
                                className="ec-clear-search"
                                onClick={() =>
                                    setBusqueda("")
                                }
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <ComboBuscable
                        id="ec-filtro-parte"
                        ariaLabel="Filtrar por parte comestible"
                        className="ec-part-filter"
                        value={filtroParte}
                        onChange={evento =>
                            setFiltroParte(
                                evento.target.value
                            )
                        }
                        placeholder="Todas las partes"
                        searchPlaceholder="Buscar parte..."
                        options={[
                            {
                                value: "TODAS",
                                label: "Todas las partes"
                            },
                            ...partes.map(parte => ({
                                value: parte.idEspecieParte,
                                label: parte.nombreParte
                            }))
                        ]}
                    />

                    <div
                        className="ec-filters"
                        aria-label="Filtrar épocas"
                    >

                        {[
                            ["TODAS", "Todas"],
                            ["ACTIVAS", "Activas"],
                            ["INACTIVAS", "Inactivas"]
                        ].map(
                            ([valor, texto]) => (
                                <button
                                    key={valor}
                                    type="button"
                                    className={
                                        filtroEstado === valor
                                            ? "is-active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setFiltroEstado(
                                            valor
                                        )
                                    }
                                >
                                    {texto}
                                </button>
                            )
                        )}

                    </div>

                </div>

                {cargando ? (
                    <div className="ec-state-box">

                        <span className="ec-loader" />

                        <strong>
                            Cargando épocas...
                        </strong>

                        <p>
                            Estamos consultando la información de la especie.
                        </p>

                    </div>
                ) : partes.length === 0 ? (
                    <div className="ec-state-box ec-state-welcome">

                        <Sprout size={34} />

                        <strong>
                            Sin partes comestibles
                        </strong>

                        <p>
                            Primero debes registrar una parte comestible para esta especie.
                        </p>

                        <button
                            type="button"
                            className="ec-empty-action"
                            onClick={registrarParteComestible}
                        >
                            <Plus size={16} />
                            Registrar parte
                        </button>

                    </div>
                ) : epocasFiltradas.length === 0 ? (
                    <div className="ec-state-box">

                        <Clock3 size={34} />

                        <strong>
                            {epocas.length
                                ? "No hay resultados con este filtro"
                                : "Todavía no hay épocas registradas"
                            }
                        </strong>

                        <p>
                            {epocas.length
                                ? "Prueba con otro filtro o término de búsqueda."
                                : "Registra el primer periodo de cosecha para esta especie."
                            }
                        </p>

                        {!epocas.length &&
                            partesActivas.length > 0 && (
                                <button
                                    type="button"
                                    className="ec-empty-action"
                                    onClick={abrirCrear}
                                >
                                    <Plus size={16} />
                                    Registrar época
                                </button>
                            )
                        }

                    </div>
                ) : (
                    <div className="ec-period-grid">

                        {epocasFiltradas.map(
                            epoca => (
                                <article
                                    className={`ec-period-card ${epoca.activa
                                            ? ""
                                            : "is-off"
                                        }`}
                                    key={
                                        epoca.idEpocaCosecha
                                    }
                                >

                                    <div className="ec-period-top">

                                        <span
                                            className={`ec-period-status ${epoca.activa
                                                    ? "on"
                                                    : "off"
                                                }`}
                                        >
                                            {epoca.activa ? (
                                                <CheckCircle2 size={14} />
                                            ) : (
                                                <CircleOff size={14} />
                                            )}

                                            {epoca.activa
                                                ? "Activa"
                                                : "Inactiva"
                                            }
                                        </span>

                                    </div>

                                    <div className="ec-part-chip">

                                        <Sprout size={14} />

                                        {nombreParte(
                                            epoca.idEspecieParte
                                        )}

                                    </div>

                                    <div className="ec-month-badge">

                                        <CalendarDays size={20} />

                                        <div>

                                            <span>
                                                Periodo de cosecha
                                            </span>

                                            <strong>
                                                {periodoTexto(
                                                    epoca
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                    <p
                                        className={`ec-observation ${epoca.observacion
                                                ? ""
                                                : "empty"
                                            }`}
                                    >
                                        {epoca.observacion ||
                                            "Sin observación registrada."
                                        }
                                    </p>

                                    <div className="ec-period-actions">

                                        <button
                                            type="button"
                                            className="ec-edit-button"
                                            disabled={accionando}
                                            onClick={() =>
                                                abrirEditar(
                                                    epoca
                                                )
                                            }
                                        >
                                            <Pencil size={15} />
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            className={`ec-state-button ${epoca.activa
                                                    ? "danger"
                                                    : "success"
                                                }`}
                                            disabled={accionando}
                                            onClick={() =>
                                                cambiarEstado(
                                                    epoca
                                                )
                                            }
                                        >
                                            {epoca.activa ? (
                                                <>
                                                    <CircleOff size={15} />
                                                    Desactivar
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw size={15} />
                                                    Reactivar
                                                </>
                                            )}
                                        </button>

                                    </div>

                                </article>
                            )
                        )}

                    </div>
                )}

            </section>

            {modalAbierto && (
                <div
                    className="ec-modal-backdrop"
                    onMouseDown={cerrarModal}
                >

                    <div
                        className="ec-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ec-modal-title"
                        onMouseDown={evento =>
                            evento.stopPropagation()
                        }
                    >

                        <div className="ec-modal-head">

                            <div className="ec-modal-icon">
                                <CalendarDays size={21} />
                            </div>

                            <div>

                                <span className="ec-kicker">
                                    {epocaEditada
                                        ? "Editar registro"
                                        : "Nuevo registro"
                                    }
                                </span>

                                <h2 id="ec-modal-title">
                                    {epocaEditada
                                        ? "Actualizar época"
                                        : "Registrar época de cosecha"
                                    }
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="ec-close-button"
                                onClick={cerrarModal}
                                disabled={guardando}
                                aria-label="Cerrar formulario"
                            >
                                <X size={19} />
                            </button>

                        </div>

                        <form
                            className="ec-form"
                            onSubmit={guardarEpoca}
                        >

                            <div className="ec-form-scroll">

                                <div className="ec-modal-species">

                                    <span>
                                        <Leaf size={18} />
                                    </span>

                                    <div>

                                        <small>
                                            Especie seleccionada
                                        </small>

                                        <strong>
                                            {especie?.nombreComun ||
                                                "Sin nombre común"
                                            }
                                        </strong>

                                        <em>
                                            {especie?.nombreCientifico ||
                                                "Sin nombre científico"
                                            }
                                        </em>

                                    </div>

                                </div>

                                {epocaEditada ? (
                                    <div className="ec-modal-part">

                                        <small>
                                            Parte comestible
                                        </small>

                                        <div>

                                            <Sprout size={17} />

                                            <strong>
                                                {nombreParte(
                                                    epocaEditada.idEspecieParte
                                                )}
                                            </strong>

                                        </div>

                                        <span>
                                            La parte no puede modificarse durante la edición.
                                        </span>

                                    </div>
                                ) : (
                                    <label className="ec-field">

                                        <span>
                                            Parte comestible *
                                        </span>

                                        <div className="ec-part-select-row">

                                            <ComboBuscable
                                                id="ec-parte-comestible"
                                                ariaLabel="Parte comestible"
                                                value={
                                                    formulario.idEspecieParte
                                                }
                                                className={
                                                    errores.idEspecieParte
                                                        ? "ec-input-error"
                                                        : ""
                                                }
                                                placeholder="Selecciona una parte..."
                                                searchPlaceholder="Buscar parte..."
                                                options={partesActivas.map(
                                                    parte => ({
                                                        value: parte.idEspecieParte,
                                                        label: parte.nombreParte
                                                    })
                                                )}
                                                onChange={evento =>
                                                    cambiarFormulario(
                                                        "idEspecieParte",
                                                        evento.target.value
                                                    )
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="ec-register-part-button"
                                                onClick={registrarParteComestible}
                                            >
                                                <Plus size={15} />
                                                Registrar parte
                                            </button>

                                        </div>

                                        {errores.idEspecieParte && (
                                            <small className="ec-field-error">
                                                {errores.idEspecieParte}
                                            </small>
                                        )}

                                    </label>
                                )}

                                <div className="ec-form-grid">

                                    <label className="ec-field">

                                        <span>
                                            Mes de inicio *
                                        </span>

                                        <select
                                            value={
                                                formulario.mesInicio
                                            }
                                            onChange={evento =>
                                                cambiarFormulario(
                                                    "mesInicio",
                                                    evento.target.value
                                                )
                                            }
                                            className={
                                                errores.mesInicio
                                                    ? "ec-input-error"
                                                    : ""
                                            }
                                        >

                                            <option value="">
                                                Selecciona el mes
                                            </option>

                                            {MESES.map(
                                                (mes, indice) => (
                                                    <option
                                                        key={mes}
                                                        value={
                                                            indice + 1
                                                        }
                                                    >
                                                        {mes}
                                                    </option>
                                                )
                                            )}

                                        </select>

                                        {errores.mesInicio && (
                                            <small className="ec-field-error">
                                                {errores.mesInicio}
                                            </small>
                                        )}

                                    </label>

                                    <label className="ec-field">

                                        <span>
                                            Mes de fin *
                                        </span>

                                        <select
                                            value={
                                                formulario.mesFin
                                            }
                                            onChange={evento =>
                                                cambiarFormulario(
                                                    "mesFin",
                                                    evento.target.value
                                                )
                                            }
                                            className={
                                                errores.mesFin
                                                    ? "ec-input-error"
                                                    : ""
                                            }
                                        >

                                            <option value="">
                                                Selecciona el mes
                                            </option>

                                            {MESES.map(
                                                (mes, indice) => (
                                                    <option
                                                        key={mes}
                                                        value={
                                                            indice + 1
                                                        }
                                                    >
                                                        {mes}
                                                    </option>
                                                )
                                            )}

                                        </select>

                                        {errores.mesFin && (
                                            <small className="ec-field-error">
                                                {errores.mesFin}
                                            </small>
                                        )}

                                    </label>

                                </div>

                                <label className="ec-field">

                                    <span>
                                        Observación
                                        <small>
                                            Opcional
                                        </small>
                                    </span>

                                    <textarea
                                        rows="4"
                                        maxLength="500"
                                        value={
                                            formulario.observacion
                                        }
                                        onChange={evento =>
                                            cambiarFormulario(
                                                "observacion",
                                                evento.target.value
                                            )
                                        }
                                        className={
                                            errores.observacion
                                                ? "ec-input-error"
                                                : ""
                                        }
                                        placeholder="Describe condiciones, recomendaciones o detalles del periodo..."
                                    />

                                    <div className="ec-field-foot">

                                        <small className="ec-field-error">
                                            {errores.observacion || ""}
                                        </small>

                                        <small>
                                            {formulario.observacion.length}/500
                                        </small>

                                    </div>

                                </label>

                                <div className="ec-form-note">

                                    <Info size={16} />

                                    <span>
                                        La misma combinación de meses no puede repetirse para la misma parte comestible.
                                    </span>

                                </div>

                            </div>

                            <div className="ec-modal-actions">

                                <button
                                    type="button"
                                    className="ec-cancel-button"
                                    onClick={cerrarModal}
                                    disabled={guardando}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="ec-primary-button"
                                    disabled={guardando}
                                >
                                    {guardando ? (
                                        <span className="ec-button-loader" />
                                    ) : (
                                        <Save size={16} />
                                    )}

                                    {guardando
                                        ? "Guardando..."
                                        : epocaEditada
                                            ? "Guardar cambios"
                                            : "Registrar época"
                                    }
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

        </section>
    );
}

export default EpocasCosecha;