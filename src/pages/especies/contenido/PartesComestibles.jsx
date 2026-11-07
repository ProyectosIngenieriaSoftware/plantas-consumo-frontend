import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    Search,
    RefreshCw,
    Plus,
    Pencil,
    PowerOff,
    RotateCcw,
    X,
    Sprout,
    Leaf,
    Save,
    Info,
    TriangleAlert,
    Layers3,
    CheckCircle2,
    Ban,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ChevronDown,
    Check
} from "lucide-react";
import { API_URL } from "../../../config";
import {
    listarPartesComestibles,
    crearParteComestible,
    actualizarParteComestible,
    desactivarParteComestible,
    activarParteComestible
} from "../../../api/parteComestibleService";
import { listarPartesPlanta } from "../../../api/partePlantaService";
import {
    crearEstadoRegistro,
    obtenerFormularioRetornado,
    volverAlFormulario
} from "../../../utils/formularioRetorno";
import "../../../styles/partesComestibles.css";
import "../../../styles/alertas.css";

const FORMULARIO_INICIAL = {
    idPartePlanta: "",
    descripcion: "",
    advertencias: ""
};

const POR_PAGINA = 7;
const MAX_CARACTERES_TEXTO = 1000;
const PATRON_EMOJI =
    /[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u20E3]/u;
const PATRON_CARACTER_CONTROL = /[\p{Cc}\p{Cf}]/u;

function obtenerLista(datos) {
    if (Array.isArray(datos)) {
        return datos;
    }

    if (Array.isArray(datos?.content)) {
        return datos.content;
    }

    return [];
}

function idParteCatalogo(parte) {
    return parte?.idPartePlanta ?? parte?.id;
}

function nombreParteCatalogo(parte) {
    return parte?.nombre ??
        parte?.nombreParte ??
        "Sin nombre";
}

function normalizarBusqueda(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function estaActivaCatalogo(parte) {
    if (parte?.activo !== undefined) {
        return parte.activo !== false;
    }

    if (parte?.activa !== undefined) {
        return parte.activa !== false;
    }

    return true;
}

function obtenerMensaje(error) {
    const data = error?.response?.data;

    if (typeof data === "string") {
        return data;
    }

    return data?.mensaje ||
        data?.message ||
        data?.error ||
        "Ocurrió un error al comunicarse con el servidor.";
}

function obtenerErrores(error) {
    const datos =
        error?.response?.data?.erroresValidacion;

    if (
        datos &&
        typeof datos === "object" &&
        !Array.isArray(datos)
    ) {
        return datos;
    }

    return null;
}

function tieneCaracterControl(texto) {
    return Array.from(texto).some(caracter => {
        return (
            PATRON_CARACTER_CONTROL.test(caracter) &&
            caracter !== "\t" &&
            caracter !== "\n" &&
            caracter !== "\r"
        );
    });
}

function validarTextoOpcional(valor, nombreCampo) {
    const texto = String(valor ?? "");

    if (texto.length > MAX_CARACTERES_TEXTO) {
        return `El campo ${nombreCampo} no puede superar ${MAX_CARACTERES_TEXTO} caracteres.`;
    }

    if (PATRON_EMOJI.test(texto)) {
        return `El campo ${nombreCampo} no puede contener emojis.`;
    }

    if (tieneCaracterControl(texto)) {
        return `El campo ${nombreCampo} contiene caracteres no permitidos.`;
    }

    return "";
}

function nombreComunPrincipal(especie) {
    if (especie?.nombreComun) {
        return especie.nombreComun;
    }

    const nombres = Array.isArray(
        especie?.nombresComunes
    )
        ? especie.nombresComunes
        : [];

    const principal = nombres.find(
        nombre =>
            nombre?.esPrincipal === true ||
            nombre?.principal === true
    );

    return principal?.nombre ||
        nombres[0]?.nombre ||
        "Sin nombre común";
}

function PartesComestibles() {
    const location = useLocation();
    const navigate = useNavigate();
    const { idEspecie } = useParams();

    const [especie, setEspecie] = useState(
        location.state?.especie || null
    );

    const [partes, setPartes] = useState([]);
    const [catalogoPartes, setCatalogoPartes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [accionando, setAccionando] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("TODAS");
    const [pagina, setPagina] = useState(1);
    const [modal, setModal] = useState(
        Boolean(location.state?.abrirFormulario)
    );
    const [editando, setEditando] = useState(
        location.state?.contextoFormulario?.editando ||
        null
    );
    const [comboParteAbierto, setComboParteAbierto] =
        useState(false);
    const [busquedaParte, setBusquedaParte] =
        useState("");
    const [indiceParteActivo, setIndiceParteActivo] =
        useState(-1);

    const [formulario, setFormulario] = useState(
        obtenerFormularioRetornado(
            FORMULARIO_INICIAL,
            location
        )
    );

    const [errores, setErrores] = useState({});

    useEffect(() => {
        cargarTodo();
    }, [idEspecie]);

    useEffect(() => {
        setPagina(1);
    }, [busqueda, estado]);

    function cambiarEspecie() {
        navigate(
            "/gestion-especies",
            {
                state: {
                    abrirContenido: "partes-comestibles",
                    categoria: "alimentacion",
                    rutaRetorno:
                        location.state?.rutaRetorno ||
                        "/contenido-especies/alimentacion"
                }
            }
        );
    }

    function registrarNuevaParte() {
        navigate(
            "/catalogos/partes-planta",
            {
                state: {
                    desde: "partes-comestibles",
                    idEspecie: Number(idEspecie),
                    especie,
                    categoria: "alimentacion",
                    abrirContenido: "partes-comestibles",
                    rutaRetorno:
                        location.pathname,
                    ...crearEstadoRegistro(
                        location,
                        "idPartePlanta",
                        formulario,
                        { editando }
                    )
                }
            }
        );
    }

    async function cargarTodo() {
        try {
            setCargando(true);

            const [
                partesRespuesta,
                catalogoRespuesta
            ] = await Promise.all([
                listarPartesComestibles(
                    idEspecie
                ),
                listarPartesPlanta(true)
            ]);

            setPartes(
                obtenerLista(
                    partesRespuesta
                )
            );

            setCatalogoPartes(
                obtenerLista(
                    catalogoRespuesta
                )
            );

            if (!especie) {
                const respuesta =
                    await axios.get(
                        `${API_URL}/api/especies/${idEspecie}`
                    );

                const datos =
                    respuesta.data;

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
                        null
                });
            }
        } catch (error) {
            await Swal.fire({
                icon: "error",
                title: "No se pudieron cargar los datos",
                text: obtenerMensaje(error),
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

    const partesDisponibles = useMemo(
        () => {
            const asociadas =
                new Set(
                    partes.map(
                        parte =>
                            Number(
                                parte.idPartePlanta
                            )
                    )
                );

            return catalogoPartes.filter(
                parte => {
                    const id =
                        Number(
                            idParteCatalogo(
                                parte
                            )
                        );

                    return (
                        estaActivaCatalogo(
                            parte
                        ) &&
                        !asociadas.has(id)
                    );
                }
            );
        },
        [
            catalogoPartes,
            partes
        ]
    );

    const filtradas = useMemo(
        () => {
            const consulta =
                busqueda
                    .trim()
                    .toLowerCase();

            return partes.filter(
                parte => {
                    const texto = [
                        parte.nombreParte,
                        parte.descripcion,
                        parte.advertencias
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    const coincideBusqueda =
                        !consulta ||
                        texto.includes(
                            consulta
                        );

                    const activa =
                        parte.activa !== false;

                    const coincideEstado =
                        estado === "TODAS" ||
                        (
                            estado === "ACTIVAS" &&
                            activa
                        ) ||
                        (
                            estado === "INACTIVAS" &&
                            !activa
                        );

                    return (
                        coincideBusqueda &&
                        coincideEstado
                    );
                }
            );
        },
        [
            partes,
            busqueda,
            estado
        ]
    );

    const activas = useMemo(
        () => partes.filter(
            parte =>
                parte.activa !== false
        ).length,
        [partes]
    );

    const inactivas =
        partes.length - activas;

    const totalPaginas = Math.max(
        1,
        Math.ceil(
            filtradas.length /
            POR_PAGINA
        )
    );

    const paginaActual = Math.min(
        pagina,
        totalPaginas
    );

    const visibles = filtradas.slice(
        (paginaActual - 1) *
        POR_PAGINA,
        paginaActual *
        POR_PAGINA
    );

    function abrirNuevo() {
        if (
            partesDisponibles.length === 0
        ) {
            Swal.fire({
                icon: "info",
                title: "No hay partes disponibles",
                text: "Todas las partes activas del catálogo ya están asociadas a esta especie. Si necesitas otra parte, puedes registrarla en el catálogo.",
                showCancelButton: true,
                confirmButtonText:
                    "Registrar parte",
                cancelButtonText:
                    "Cerrar",
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
                    registrarNuevaParte();
                }
            });

            return;
        }

        setEditando(null);

        setFormulario(
            FORMULARIO_INICIAL
        );

        setErrores({});
        setModal(true);
    }

    function abrirEditar(parte) {
        setEditando(parte);

        setFormulario({
            idPartePlanta:
                String(
                    parte.idPartePlanta ||
                    ""
                ),
            descripcion:
                parte.descripcion ||
                "",
            advertencias:
                parte.advertencias ||
                ""
        });

        setErrores({});
        setModal(true);
    }

    function cerrarModal() {
        if (guardando) {
            return;
        }

        setModal(false);
        setEditando(null);

        setFormulario(
            FORMULARIO_INICIAL
        );

        setErrores({});
    }

    function cambiarCampo(evento) {
        const {
            name,
            value
        } = evento.target;

        setFormulario(
            anterior => ({
                ...anterior,
                [name]: value
            })
        );

        setErrores(
            anterior => ({
                ...anterior,
                [name]: ""
            })
        );
    }

    function validar() {
        const nuevos = {};
        const numeroEspecie = Number(idEspecie);

        if (
            !Number.isSafeInteger(numeroEspecie) ||
            numeroEspecie <= 0
        ) {
            nuevos.general =
                "No se pudo identificar correctamente la especie.";
        }

        if (!editando) {
            const idSeleccionado =
                Number(formulario.idPartePlanta);

            if (
                !formulario.idPartePlanta ||
                !Number.isSafeInteger(idSeleccionado) ||
                idSeleccionado <= 0 ||
                !partesDisponibles.some(
                    parte =>
                        Number(idParteCatalogo(parte)) ===
                        idSeleccionado
                )
            ) {
                nuevos.idPartePlanta =
                    "Selecciona una parte activa disponible del catálogo.";
            }
        }

        const errorDescripcion = validarTextoOpcional(
            formulario.descripcion,
            "descripción"
        );
        if (errorDescripcion) {
            nuevos.descripcion = errorDescripcion;
        }

        const errorAdvertencias = validarTextoOpcional(
            formulario.advertencias,
            "advertencias"
        );
        if (errorAdvertencias) {
            nuevos.advertencias = errorAdvertencias;
        }

        setErrores(nuevos);

        return (
            Object.keys(
                nuevos
            ).length === 0
        );
    }

    async function guardar(evento) {
        evento.preventDefault();

        if (
            guardando ||
            !validar()
        ) {
            return;
        }

        try {
            setGuardando(true);

            let parteCreada;

            if (editando) {
                await actualizarParteComestible(
                    editando.idEspecieParte,
                    {
                        descripcion:
                            formulario.descripcion,
                        advertencias:
                            formulario.advertencias
                    }
                );
            } else {
                parteCreada = await crearParteComestible({
                    idEspecie:
                        Number(idEspecie),
                    idPartePlanta:
                        Number(
                            formulario.idPartePlanta
                        ),
                    descripcion:
                        formulario.descripcion,
                    advertencias:
                        formulario.advertencias
                });
            }

            if (
                !editando &&
                volverAlFormulario(
                    navigate,
                    location.state?.retornoFormulario,
                    parteCreada,
                    ["idEspecieParte", "id"]
                )
            ) {
                return;
            }

            await Swal.fire({
                icon: "success",
                title: editando
                    ? "Parte actualizada"
                    : "Parte comestible registrada",
                text: editando
                    ? "Los cambios fueron guardados correctamente."
                    : "La parte fue asociada correctamente a la especie.",
                timer: 1700,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });

            setModal(false);
            setEditando(null);

            setFormulario(
                FORMULARIO_INICIAL
            );

            setErrores({});

            await cargarTodo();
        } catch (error) {
            const erroresBackend =
                obtenerErrores(error);

            if (erroresBackend) {
                setErrores(
                    erroresBackend
                );

                return;
            }

            await Swal.fire({
                icon: "error",
                title: "No se pudo guardar",
                text: obtenerMensaje(error),
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

    async function desactivar(parte) {
        const confirmacion =
            await Swal.fire({
                icon: "warning",
                title: "¿Desactivar parte?",
                html:
                    `La parte <b>${parte.nombreParte}</b> quedará inactiva para esta especie.`,
                showCancelButton: true,
                confirmButtonText:
                    "Sí, desactivar",
                cancelButtonText:
                    "Cancelar",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        "flora-alert-confirm flora-alert-danger",
                    cancelButton:
                        "flora-alert-cancel"
                }
            });

        if (
            !confirmacion.isConfirmed
        ) {
            return;
        }

        try {
            setAccionando(true);

            await desactivarParteComestible(
                parte.idEspecieParte
            );

            await cargarTodo();

            await Swal.fire({
                icon: "success",
                title: "Parte desactivada",
                timer: 1500,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo desactivar",
                text: obtenerMensaje(error),
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

    async function activar(parte) {
        const confirmacion =
            await Swal.fire({
                icon: "question",
                title: "¿Reactivar parte?",
                html:
                    `La parte <b>${parte.nombreParte}</b> volverá a estar disponible.`,
                showCancelButton: true,
                confirmButtonText:
                    "Sí, reactivar",
                cancelButtonText:
                    "Cancelar",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        "flora-alert-confirm",
                    cancelButton:
                        "flora-alert-cancel"
                }
            });

        if (
            !confirmacion.isConfirmed
        ) {
            return;
        }

        try {
            setAccionando(true);

            await activarParteComestible(
                parte.idEspecieParte
            );

            await cargarTodo();

            await Swal.fire({
                icon: "success",
                title: "Parte reactivada",
                timer: 1500,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo reactivar",
                text: obtenerMensaje(error),
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

    const parteSeleccionada =
        catalogoPartes.find(
            parte =>
                Number(
                    idParteCatalogo(
                        parte
                    )
                ) ===
                Number(
                    formulario.idPartePlanta
                )
        );

    const partesFiltradas = partesDisponibles.filter(
        parte =>
            normalizarBusqueda(
                nombreParteCatalogo(parte)
            ).includes(normalizarBusqueda(busquedaParte))
    );

    function seleccionarParte(parte) {
        cambiarCampo({
            target: {
                name: "idPartePlanta",
                value: String(idParteCatalogo(parte))
            }
        });
        setBusquedaParte("");
        setIndiceParteActivo(-1);
        setComboParteAbierto(false);
    }

    function manejarTecladoCombo(evento) {
        if (evento.key === "ArrowDown") {
            evento.preventDefault();
            setComboParteAbierto(true);
            setIndiceParteActivo(indice =>
                Math.min(indice + 1, partesFiltradas.length - 1)
            );
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            setComboParteAbierto(true);
            setIndiceParteActivo(indice =>
                Math.max(indice - 1, 0)
            );
        } else if (
            evento.key === "Enter" &&
            comboParteAbierto &&
            partesFiltradas[indiceParteActivo]
        ) {
            evento.preventDefault();
            seleccionarParte(partesFiltradas[indiceParteActivo]);
        } else if (evento.key === "Escape") {
            setComboParteAbierto(false);
            setBusquedaParte("");
            setIndiceParteActivo(-1);
        }

        if (
            evento.key === "Enter" &&
            comboParteAbierto &&
            partesFiltradas.length === 1
        ) {
            evento.preventDefault();
            seleccionarParte(partesFiltradas[0]);
        }
    }

    return (
        <div className="pc-page partes-comestibles-page">

            <section className="pc-head">

                <div>

                    <span className="pc-crumb">
                        Contenido
                        <i>/</i>
                        Alimentación
                        <i>/</i>
                        {especie?.nombreComun ||
                            "Especie"
                        }
                    </span>

                    <h1>
                        Partes comestibles
                    </h1>

                    <p>
                        Administra las partes aprovechables o comestibles asociadas a la especie seleccionada.
                    </p>

                </div>

                <div className="pc-head-actions">

                    <button
                        type="button"
                        className="pc-btn pc-btn-change pc-btn-lg"
                        onClick={cambiarEspecie}
                    >
                        <ArrowLeft size={17} />
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="pc-btn pc-btn-primary pc-btn-lg"
                        onClick={abrirNuevo}
                    >
                        <Plus size={18} />
                        Nueva parte
                    </button>

                </div>

            </section>

            <section className="pc-species">

                <span className="pc-species-avatar">
                    <Leaf size={21} />
                </span>

                <div className="pc-species-text">

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
                    <div className="pc-species-extra">

                        <small>
                            Familia
                        </small>

                        <strong>
                            {especie.familia}
                        </strong>

                    </div>
                )}

            </section>

            <section className="pc-stats">

                <button
                    type="button"
                    className="pc-stat pc-stat-total"
                    aria-pressed={
                        estado === "TODAS"
                    }
                    onClick={() =>
                        setEstado(
                            "TODAS"
                        )
                    }
                >

                    <span className="pc-stat-icon">
                        <Layers3 size={22} />
                    </span>

                    <span className="pc-stat-text">

                        <strong>
                            {partes.length}
                        </strong>

                        <span>
                            Registradas
                        </span>

                    </span>

                </button>

                <button
                    type="button"
                    className="pc-stat pc-stat-ok"
                    aria-pressed={
                        estado === "ACTIVAS"
                    }
                    onClick={() =>
                        setEstado(
                            "ACTIVAS"
                        )
                    }
                >

                    <span className="pc-stat-icon">
                        <CheckCircle2 size={22} />
                    </span>

                    <span className="pc-stat-text">

                        <strong>
                            {activas}
                        </strong>

                        <span>
                            Activas
                        </span>

                    </span>

                </button>

                <button
                    type="button"
                    className="pc-stat pc-stat-off"
                    aria-pressed={
                        estado === "INACTIVAS"
                    }
                    onClick={() =>
                        setEstado(
                            "INACTIVAS"
                        )
                    }
                >

                    <span className="pc-stat-icon">
                        <Ban size={22} />
                    </span>

                    <span className="pc-stat-text">

                        <strong>
                            {inactivas}
                        </strong>

                        <span>
                            Inactivas
                        </span>

                    </span>

                </button>

                <button
                    type="button"
                    className="pc-stat pc-stat-cat"
                    onClick={abrirNuevo}
                >

                    <span className="pc-stat-icon">
                        <Sprout size={22} />
                    </span>

                    <span className="pc-stat-text">

                        <strong>
                            {partesDisponibles.length}
                        </strong>

                        <span>
                            Disponibles
                        </span>

                    </span>

                </button>

            </section>

            <section className="pc-card">

                <div className="pc-toolbar">

                    <label className="pc-search">

                        <Search size={18} />

                        <input
                            type="search"
                            value={busqueda}
                            onChange={evento =>
                                setBusqueda(
                                    evento.target.value
                                )
                            }
                            placeholder="Buscar por parte, descripción o advertencia..."
                        />

                        {busqueda && (
                            <button
                                type="button"
                                className="pc-clear"
                                onClick={() =>
                                    setBusqueda("")
                                }
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <div className="pc-seg">

                        {[
                            ["TODAS", "Todas"],
                            ["ACTIVAS", "Activas"],
                            ["INACTIVAS", "Inactivas"]
                        ].map(
                            ([valor, texto]) => (
                                <button
                                    type="button"
                                    key={valor}
                                    className={
                                        estado === valor
                                            ? "on"
                                            : ""
                                    }
                                    onClick={() =>
                                        setEstado(
                                            valor
                                        )
                                    }
                                >
                                    {texto}
                                </button>
                            )
                        )}

                    </div>

                    <button
                        type="button"
                        className="pc-iconbtn pc-refresh"
                        title="Actualizar"
                        disabled={
                            cargando ||
                            accionando
                        }
                        onClick={cargarTodo}
                    >

                        <RefreshCw
                            size={18}
                            className={
                                cargando
                                    ? "girando"
                                    : ""
                            }
                        />

                    </button>

                </div>

                <div className="pc-table-wrap">

                    <table className="pc-table">

                        <thead>

                            <tr>

                                <th>
                                    Parte comestible
                                </th>

                                <th className="pc-col-desc">
                                    Descripción
                                </th>

                                <th className="pc-col-warning">
                                    Advertencias
                                </th>

                                <th>
                                    Estado
                                </th>

                                <th className="pc-col-actions">
                                    Acciones
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {cargando ? (
                                <tr>

                                    <td colSpan="5">

                                        <div className="pc-state">

                                            <span className="pc-spinner" />

                                            <strong>
                                                Cargando partes...
                                            </strong>

                                        </div>

                                    </td>

                                </tr>
                            ) : visibles.length === 0 ? (
                                <tr>

                                    <td colSpan="5">

                                        <div className="pc-state pc-empty">

                                            <Sprout size={35} />

                                            <strong>
                                                No hay partes para mostrar
                                            </strong>

                                            <span>
                                                {partes.length === 0
                                                    ? "Esta especie todavía no tiene partes comestibles registradas."
                                                    : "No hay resultados para los filtros seleccionados."
                                                }
                                            </span>

                                            {partes.length === 0 && (
                                                <button
                                                    type="button"
                                                    className="pc-btn pc-btn-primary"
                                                    onClick={abrirNuevo}
                                                >
                                                    <Plus size={16} />
                                                    Registrar primera parte
                                                </button>
                                            )}

                                        </div>

                                    </td>

                                </tr>
                            ) : (
                                visibles.map(
                                    parte => (
                                        <tr
                                            key={
                                                parte.idEspecieParte
                                            }
                                            className={
                                                parte.activa === false
                                                    ? "is-off"
                                                    : ""
                                            }
                                        >

                                            <td>

                                                <div className="pc-name">

                                                    <span className="pc-avatar">
                                                        <Sprout size={20} />
                                                    </span>

                                                    <span>

                                                        <strong>
                                                            {parte.nombreParte}
                                                        </strong>

                                                    </span>

                                                </div>

                                            </td>

                                            <td className="pc-col-desc">

                                                <span className="pc-desc">
                                                    {parte.descripcion ||
                                                        "Sin descripción"
                                                    }
                                                </span>

                                            </td>

                                            <td className="pc-col-warning">

                                                {parte.advertencias ? (
                                                    <span className="pc-warning-text">

                                                        <TriangleAlert size={14} />

                                                        {parte.advertencias}

                                                    </span>
                                                ) : (
                                                    <span className="pc-muted">
                                                        Sin advertencias
                                                    </span>
                                                )}

                                            </td>

                                            <td>

                                                <span
                                                    className={`pc-status ${parte.activa === false
                                                            ? "inactive"
                                                            : "active"
                                                        }`}
                                                >
                                                    <i />

                                                    {parte.activa === false
                                                        ? "Inactiva"
                                                        : "Activa"
                                                    }
                                                </span>

                                            </td>

                                            <td className="pc-col-actions">

                                                <div className="pc-actions">

                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        disabled={accionando}
                                                        onClick={() =>
                                                            abrirEditar(
                                                                parte
                                                            )
                                                        }
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    {parte.activa === false ? (
                                                        <button
                                                            type="button"
                                                            className="on"
                                                            title="Reactivar"
                                                            disabled={accionando}
                                                            onClick={() =>
                                                                activar(
                                                                    parte
                                                                )
                                                            }
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="off"
                                                            title="Desactivar"
                                                            disabled={accionando}
                                                            onClick={() =>
                                                                desactivar(
                                                                    parte
                                                                )
                                                            }
                                                        >
                                                            <PowerOff size={16} />
                                                        </button>
                                                    )}

                                                </div>

                                            </td>

                                        </tr>
                                    )
                                )
                            )}

                        </tbody>

                    </table>

                </div>

                <div className="pc-pagination">

                    <span>
                        Mostrando{" "}
                        <strong>
                            {filtradas.length === 0
                                ? 0
                                : (paginaActual - 1) *
                                POR_PAGINA + 1
                            }
                        </strong>
                        {" "}a{" "}
                        <strong>
                            {Math.min(
                                paginaActual *
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
                                paginaActual === 1
                            }
                            onClick={() =>
                                setPagina(
                                    anterior =>
                                        anterior - 1
                                )
                            }
                        >
                            <ChevronLeft size={17} />
                        </button>

                        <span className="pc-page-current">
                            {paginaActual} / {totalPaginas}
                        </span>

                        <button
                            type="button"
                            disabled={
                                paginaActual ===
                                totalPaginas
                            }
                            onClick={() =>
                                setPagina(
                                    anterior =>
                                        anterior + 1
                                )
                            }
                        >
                            <ChevronRight size={17} />
                        </button>

                    </div>

                </div>

            </section>

            {modal && (
                <div
                    className="pc-overlay"
                    onMouseDown={cerrarModal}
                >

                    <section
                        className="pc-panel"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={evento =>
                            evento.stopPropagation()
                        }
                    >

                        <div className="pc-modal-head">

                            <span className="pc-modal-head-icon">
                                <Sprout size={22} />
                            </span>

                            <div className="pc-modal-head-text">

                                <span>
                                    {editando
                                        ? "Editar registro"
                                        : "Nueva asociación"
                                    }
                                </span>

                                <h2>
                                    {editando
                                        ? "Editar parte comestible"
                                        : "Nueva parte comestible"
                                    }
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="pc-iconbtn"
                                disabled={guardando}
                                onClick={cerrarModal}
                            >
                                <X size={19} />
                            </button>

                        </div>

                        <form onSubmit={guardar} noValidate>

                            <div className="pc-modal-body">

                                {errores.general && (
                                    <div
                                        className="pc-form-error"
                                        role="alert"
                                    >
                                        {errores.general}
                                    </div>
                                )}

                                <div className="pc-preview">

                                    <small>
                                        Especie seleccionada
                                    </small>

                                    <div>

                                        <span className="pc-preview-avatar">
                                            <Leaf size={20} />
                                        </span>

                                        <span className="pc-preview-text">

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

                                        </span>

                                    </div>

                                </div>

                                {editando ? (
                                    <div className="pc-preview">

                                        <small>
                                            Parte de planta
                                        </small>

                                        <div>

                                            <span className="pc-preview-avatar">
                                                <Sprout size={20} />
                                            </span>

                                            <span className="pc-preview-text">

                                                <strong>
                                                    {editando.nombreParte}
                                                </strong>

                                                <em>
                                                    La parte asociada no puede cambiarse durante la edición.
                                                </em>

                                            </span>

                                        </div>

                                    </div>
                                ) : (
                                    <div
                                        className={`pc-field ${errores.idPartePlanta
                                                ? "has-error"
                                                : ""
                                            }`}
                                    >

                                        <label htmlFor="pc-parte">
                                            Parte de planta
                                            <span> *</span>
                                        </label>

                                        <div className="pc-part-select-row">

                                            <div className="pc-part-combo">
                                                <div
                                                    className={`pc-part-combo-control${comboParteAbierto ? " is-open" : ""}`}
                                                >
                                                    <Search
                                                        size={17}
                                                        aria-hidden="true"
                                                    />
                                                    <input
                                                        id="pc-parte"
                                                        type="text"
                                                        role="combobox"
                                                        autoComplete="off"
                                                        value={
                                                            comboParteAbierto
                                                                ? busquedaParte
                                                                : parteSeleccionada
                                                                    ? nombreParteCatalogo(
                                                                        parteSeleccionada
                                                                    )
                                                                    : ""
                                                        }
                                                        placeholder={
                                                            comboParteAbierto
                                                                ? "Buscar parte de planta..."
                                                                : "Selecciona una parte..."
                                                        }
                                                        onFocus={() => {
                                                            setBusquedaParte("");
                                                            setIndiceParteActivo(-1);
                                                            setComboParteAbierto(true);
                                                        }}
                                                        onChange={evento => {
                                                            setBusquedaParte(
                                                                evento.target.value
                                                            );
                                                            setIndiceParteActivo(0);
                                                            setComboParteAbierto(true);
                                                        }}
                                                        onKeyDown={
                                                            manejarTecladoCombo
                                                        }
                                                        onBlur={() => {
                                                            setComboParteAbierto(false);
                                                            setBusquedaParte("");
                                                        }}
                                                        aria-label="Buscar parte de planta"
                                                        aria-autocomplete="list"
                                                        aria-expanded={
                                                            comboParteAbierto
                                                        }
                                                        aria-controls="pc-parte-opciones"
                                                        aria-activedescendant={
                                                            comboParteAbierto &&
                                                            partesFiltradas[indiceParteActivo]
                                                                ? `pc-parte-opcion-${idParteCatalogo(partesFiltradas[indiceParteActivo])}`
                                                                : undefined
                                                        }
                                                        aria-invalid={Boolean(
                                                            errores.idPartePlanta
                                                        )}
                                                        aria-describedby="pc-parte-error"
                                                        required
                                                    />
                                                    <ChevronDown
                                                        size={17}
                                                        className={
                                                            comboParteAbierto
                                                                ? "is-open"
                                                                : ""
                                                        }
                                                        aria-hidden="true"
                                                    />
                                                </div>

                                                {comboParteAbierto && (
                                                    <div
                                                        id="pc-parte-opciones"
                                                        className="pc-part-combo-options"
                                                        role="listbox"
                                                        aria-label="Partes de planta disponibles"
                                                    >
                                                        {partesFiltradas.length > 0
                                                            ? partesFiltradas.map(
                                                                parte => {
                                                                    const idParte =
                                                                        idParteCatalogo(
                                                                            parte
                                                                        );
                                                                    const seleccionada =
                                                                        String(idParte) ===
                                                                        formulario.idPartePlanta;

                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            tabIndex={-1}
                                                                            id={`pc-parte-opcion-${idParte}`}
                                                                            role="option"
                                                                            aria-selected={
                                                                                seleccionada
                                                                            }
                                                                            key={idParte}
                                                                            onMouseEnter={() =>
                                                                                setIndiceParteActivo(
                                                                                    partesFiltradas.findIndex(
                                                                                        opcion =>
                                                                                            Number(
                                                                                                idParteCatalogo(opcion)
                                                                                            ) ===
                                                                                            Number(idParte)
                                                                                    )
                                                                                )
                                                                            }
                                                                            onMouseDown={evento =>
                                                                                evento.preventDefault()
                                                                            }
                                                                            onClick={() =>
                                                                                seleccionarParte(
                                                                                    parte
                                                                                )
                                                                            }
                                                                        >
                                                                            <span>
                                                                                {nombreParteCatalogo(
                                                                                    parte
                                                                                )}
                                                                            </span>
                                                                            {seleccionada && (
                                                                                <Check
                                                                                    size={16}
                                                                                    aria-hidden="true"
                                                                                />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                }
                                                            )
                                                            : (
                                                                <p role="status">
                                                                    No se encontraron partes.
                                                                </p>
                                                            )}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                className="pc-register-part-btn"
                                                onClick={registrarNuevaParte}
                                                title="Registrar una nueva parte de planta"
                                            >
                                                <Plus size={16} />
                                                <span>
                                                    Registrar parte
                                                </span>
                                            </button>

                                        </div>

                                        <div className="pc-field-foot">

                                            <small
                                                id="pc-parte-error"
                                                className="pc-err"
                                                role="alert"
                                            >
                                                {errores.idPartePlanta || ""}
                                            </small>

                                        </div>

                                    </div>
                                )}

                                {!editando &&
                                    parteSeleccionada && (
                                        <div className="pc-selection-preview">

                                            <span className="pc-preview-avatar">
                                                <Sprout size={19} />
                                            </span>

                                            <span className="pc-preview-text">

                                                <strong>
                                                    {nombreParteCatalogo(
                                                        parteSeleccionada
                                                    )}
                                                </strong>

                                                <em>
                                                    {parteSeleccionada.descripcion ||
                                                        "Parte disponible en el catálogo."
                                                    }
                                                </em>

                                            </span>

                                        </div>
                                    )
                                }

                                <div className="pc-validation-note">
                                    Descripción y advertencias son opcionales; cada campo admite hasta {MAX_CARACTERES_TEXTO} caracteres. No se permiten emojis ni caracteres de control.
                                </div>

                                <div
                                    className={`pc-field ${errores.descripcion
                                            ? "has-error"
                                            : ""
                                        }`}
                                >

                                    <label htmlFor="pc-descripcion">
                                        Descripción
                                    </label>

                                    <textarea
                                        id="pc-descripcion"
                                        name="descripcion"
                                        rows={4}
                                        maxLength={MAX_CARACTERES_TEXTO}
                                        value={
                                            formulario.descripcion
                                        }
                                        onChange={cambiarCampo}
                                        placeholder="Describe cómo se aprovecha o consume esta parte..."
                                        aria-invalid={Boolean(
                                            errores.descripcion
                                        )}
                                        aria-describedby="pc-descripcion-error pc-descripcion-count"
                                    />

                                    <div className="pc-field-foot">

                                        <small
                                            id="pc-descripcion-error"
                                            className="pc-err"
                                            role="alert"
                                        >
                                            {errores.descripcion || ""}
                                        </small>

                                        <small id="pc-descripcion-count">
                                            {formulario.descripcion.length}/{MAX_CARACTERES_TEXTO}
                                        </small>

                                    </div>

                                </div>

                                <div
                                    className={`pc-field ${errores.advertencias
                                            ? "has-error"
                                            : ""
                                        }`}
                                >

                                    <label htmlFor="pc-advertencias">
                                        Advertencias
                                    </label>

                                    <textarea
                                        id="pc-advertencias"
                                        name="advertencias"
                                        rows={4}
                                        maxLength={MAX_CARACTERES_TEXTO}
                                        value={
                                            formulario.advertencias
                                        }
                                        onChange={cambiarCampo}
                                        placeholder="Indica precauciones o condiciones de consumo..."
                                        aria-invalid={Boolean(
                                            errores.advertencias
                                        )}
                                        aria-describedby="pc-advertencias-error pc-advertencias-count"
                                    />

                                    <div className="pc-field-foot">

                                        <small
                                            id="pc-advertencias-error"
                                            className="pc-err"
                                            role="alert"
                                        >
                                            {errores.advertencias || ""}
                                        </small>

                                        <small id="pc-advertencias-count">
                                            {formulario.advertencias.length}/{MAX_CARACTERES_TEXTO}
                                        </small>

                                    </div>

                                </div>

                                <div className="pc-backend-info">

                                    <Info size={18} />

                                    <div>

                                        <strong>
                                            Asociación con la especie
                                        </strong>

                                        <span>
                                            La especie ya está seleccionada. Aquí solo se relaciona una parte del catálogo y se registran sus características de aprovechamiento.
                                        </span>

                                    </div>

                                </div>

                            </div>

                            <div className="pc-modal-foot">

                                <button
                                    type="button"
                                    className="pc-btn pc-btn-ghost"
                                    disabled={guardando}
                                    onClick={cerrarModal}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="pc-btn pc-btn-primary"
                                    disabled={guardando}
                                >

                                    {guardando ? (
                                        <RefreshCw
                                            size={16}
                                            className="girando"
                                        />
                                    ) : (
                                        <Save size={16} />
                                    )}

                                    {guardando
                                        ? "Guardando..."
                                        : editando
                                            ? "Guardar cambios"
                                            : "Registrar parte"
                                    }

                                </button>

                            </div>

                        </form>

                    </section>

                </div>
            )}

        </div>
    );
}

export default PartesComestibles;