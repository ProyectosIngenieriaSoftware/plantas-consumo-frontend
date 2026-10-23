import { useEffect, useMemo, useState } from "react";
import {
    HeartPulse,
    Plus,
    Search,
    Pencil,
    Power,
    PowerOff,
    Trash2,
    X,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleOff,
    ListFilter,
    Check,
    Info,
    Tags
} from "lucide-react";
import Swal from "sweetalert2";
import {
    listarBeneficios,
    crearBeneficio,
    actualizarBeneficio,
    desactivarBeneficio,
    activarBeneficio,
    eliminarBeneficio,
    idDeBeneficio
} from "../../api/beneficioService";
import "../../styles/beneficios.css";

const POR_PAGINA = 7;
const MAX_NOMBRE = 150;

const TIPOS_BENEFICIO = [
    {
        valor: "NUTRICIONAL",
        etiqueta: "Nutricional",
        descripcion: "Aporte de nutrientes, vitaminas y minerales."
    },
    {
        valor: "FUNCIONAL",
        etiqueta: "Funcional",
        descripcion: "Propiedades digestivas, medicinales o preventivas."
    },
    {
        valor: "OTRO",
        etiqueta: "Otro",
        descripcion: "Otros beneficios o propiedades de uso."
    }
];

const TIPOS_VALIDOS = TIPOS_BENEFICIO.map(
    tipo => tipo.valor
);

const inicial = {
    nombre: "",
    tipoBeneficio: "NUTRICIONAL",
    descripcion: "",
    activo: true
};

function limpiarEspacios(texto) {
    return String(texto ?? "")
        .trim()
        .replace(/\s+/g, " ");
}

function normalizarComparacion(texto) {
    return limpiarEspacios(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function contieneLetra(texto) {
    return /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(
        texto
    );
}

function contieneCaracterControl(texto) {
    return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(
        texto
    );
}

function estaActivo(beneficio) {
    return beneficio?.activo !== false;
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

function alertaError(titulo, mensaje) {
    return Swal.fire({
        icon: "error",
        title: titulo,
        text: mensaje,
        confirmButtonText: "Entendido",
        buttonsStyling: false,
        customClass: {
            popup: "flora-alert",
            confirmButton: "flora-alert-confirm"
        }
    });
}

function alertaExito(titulo, mensaje = "") {
    return Swal.fire({
        icon: "success",
        title: titulo,
        text: mensaje,
        timer: 1700,
        timerProgressBar: true,
        showConfirmButton: false,
        customClass: {
            popup: "flora-alert"
        }
    });
}

function confirmar({
    titulo,
    texto,
    boton,
    peligro = false
}) {
    return Swal.fire({
        icon: peligro ? "warning" : "question",
        title: titulo,
        text: texto,
        showCancelButton: true,
        confirmButtonText: boton,
        cancelButtonText: "Cancelar",
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            popup: "flora-alert",
            confirmButton: peligro
                ? "flora-alert-confirm flora-alert-danger"
                : "flora-alert-confirm",
            cancelButton: "flora-alert-cancel"
        }
    });
}

function Beneficios() {
    const [beneficios, setBeneficios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [procesando, setProcesando] = useState(null);

    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("TODOS");
    const [tipoFiltro, setTipoFiltro] = useState("TODOS");

    const [editor, setEditor] = useState(null);
    const [formulario, setFormulario] = useState(inicial);
    const [errores, setErrores] = useState({});

    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        cargarBeneficios();
    }, []);

    async function cargarBeneficios() {
        try {
            setCargando(true);

            const datos = await listarBeneficios();

            const lista = Array.isArray(datos)
                ? datos
                : datos?.content || [];

            setBeneficios(
                [...lista].sort(
                    (a, b) =>
                        Number(idDeBeneficio(a) || 0) -
                        Number(idDeBeneficio(b) || 0)
                )
            );

        } catch (error) {
            await alertaError(
                "No se pudieron cargar los beneficios",
                obtenerMensaje(error)
            );
        } finally {
            setCargando(false);
        }
    }

    function abrirNuevo() {
        setEditor("nuevo");
        setFormulario(inicial);
        setErrores({});
    }

    function abrirEditar(beneficio) {
        const id = idDeBeneficio(beneficio);

        setEditor(id);

        setFormulario({
            nombre: beneficio?.nombre || "",
            tipoBeneficio:
                beneficio?.tipoBeneficio ||
                "NUTRICIONAL",
            descripcion:
                beneficio?.descripcion || "",
            activo:
                beneficio?.activo !== false
        });

        setErrores({});
    }

    function cerrarEditor() {
        if (guardando) {
            return;
        }

        setEditor(null);
        setFormulario(inicial);
        setErrores({});
    }

    function onCampo(campo, valor) {
        setFormulario(prev => ({
            ...prev,
            [campo]: valor
        }));

        setErrores(prev => ({
            ...prev,
            [campo]: ""
        }));
    }

    function normalizarNombreAlSalir() {
        setFormulario(prev => ({
            ...prev,
            nombre: limpiarEspacios(
                prev.nombre
            )
        }));
    }

    function existeDuplicado(nombre) {
        const comparado =
            normalizarComparacion(nombre);

        return beneficios.some(
            beneficio => {
                const id =
                    idDeBeneficio(beneficio);

                if (
                    editor !== "nuevo" &&
                    String(id) === String(editor)
                ) {
                    return false;
                }

                return normalizarComparacion(
                    beneficio?.nombre
                ) === comparado;
            }
        );
    }

    function validar() {
        const nuevos = {};

        const nombre =
            limpiarEspacios(
                formulario.nombre
            );

        const descripcion =
            formulario.descripcion.trim();

        /* Nombre */

        if (!nombre) {
            nuevos.nombre =
                "El nombre del beneficio es obligatorio.";

        } else if (
            nombre.length > MAX_NOMBRE
        ) {
            nuevos.nombre =
                `El nombre del beneficio no puede superar los ${MAX_NOMBRE} caracteres.`;

        } else if (
            !contieneLetra(nombre)
        ) {
            nuevos.nombre =
                "El nombre debe contener al menos una letra.";

        } else if (
            contieneCaracterControl(nombre)
        ) {
            nuevos.nombre =
                "El nombre contiene caracteres no permitidos.";

        } else if (
            existeDuplicado(nombre)
        ) {
            nuevos.nombre =
                "Ya existe un beneficio registrado con este nombre.";
        }

        /* Tipo */

        if (!formulario.tipoBeneficio) {
            nuevos.tipoBeneficio =
                "El tipo de beneficio es obligatorio.";

        } else if (
            !TIPOS_VALIDOS.includes(
                formulario.tipoBeneficio
            )
        ) {
            nuevos.tipoBeneficio =
                "Selecciona un tipo de beneficio válido.";
        }

        /* Descripción */

        if (!descripcion) {
            nuevos.descripcion =
                "La descripción es obligatoria.";

        } else if (
            !contieneLetra(descripcion)
        ) {
            nuevos.descripcion =
                "La descripción debe contener al menos una letra.";

        } else if (
            contieneCaracterControl(
                descripcion
            )
        ) {
            nuevos.descripcion =
                "La descripción contiene caracteres no permitidos.";
        }

        /* Estado */

        if (
            typeof formulario.activo !==
            "boolean"
        ) {
            nuevos.activo =
                "El estado del beneficio no es válido.";
        }

        setErrores(nuevos);

        return Object.keys(nuevos).length === 0;
    }

    function aplicarErroresBackend(error) {
        const data = error?.response?.data;

        const validaciones =
            data?.erroresValidacion ||
            data?.errors ||
            data?.errores;

        if (
            !validaciones ||
            typeof validaciones !== "object" ||
            Array.isArray(validaciones)
        ) {
            return false;
        }

        const normalizados = {};

        Object.entries(validaciones).forEach(
            ([campo, mensaje]) => {
                if (Array.isArray(mensaje)) {
                    normalizados[campo] =
                        mensaje[0] ||
                        "Valor inválido.";

                } else if (
                    typeof mensaje === "object" &&
                    mensaje !== null
                ) {
                    normalizados[campo] =
                        mensaje.defaultMessage ||
                        mensaje.message ||
                        "Valor inválido.";

                } else {
                    normalizados[campo] =
                        String(mensaje);
                }
            }
        );

        setErrores(prev => ({
            ...prev,
            ...normalizados
        }));

        return true;
    }

    async function guardar(e) {
        e.preventDefault();

        if (guardando) {
            return;
        }

        if (!validar()) {
            return;
        }

        const datos = {
            nombre: limpiarEspacios(
                formulario.nombre
            ),
            tipoBeneficio:
                formulario.tipoBeneficio,
            descripcion:
                formulario.descripcion.trim(),
            activo: Boolean(
                formulario.activo
            )
        };

        try {
            setGuardando(true);

            if (editor === "nuevo") {
                await crearBeneficio(datos);

                await cargarBeneficios();

                setEditor(null);
                setFormulario(inicial);
                setErrores({});

                await alertaExito(
                    "Beneficio registrado",
                    "El beneficio se registró correctamente."
                );

                return;
            }

            await actualizarBeneficio(
                editor,
                datos
            );

            await cargarBeneficios();

            setEditor(null);
            setFormulario(inicial);
            setErrores({});

            await alertaExito(
                "Beneficio actualizado",
                "Los cambios se guardaron correctamente."
            );

        } catch (error) {
            if (aplicarErroresBackend(error)) {
                await Swal.fire({
                    icon: "warning",
                    title: "Revisa los campos",
                    text: "Hay información que debe corregirse antes de continuar.",
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

            const mensaje =
                obtenerMensaje(error);

            if (
                error?.response?.status === 409 ||
                mensaje
                    .toLowerCase()
                    .includes("ya existe")
            ) {
                setErrores(prev => ({
                    ...prev,
                    nombre: mensaje
                }));

                await Swal.fire({
                    icon: "warning",
                    title: "Beneficio duplicado",
                    text: mensaje,
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

            await alertaError(
                editor === "nuevo"
                    ? "No se pudo registrar"
                    : "No se pudo actualizar",
                mensaje
            );

        } finally {
            setGuardando(false);
        }
    }

    async function cambiarEstado(
        beneficio
    ) {
        if (procesando !== null) {
            return;
        }

        const id =
            idDeBeneficio(beneficio);

        if (id == null) {
            await alertaError(
                "No se pudo realizar la acción",
                "No se encontró el identificador del beneficio."
            );
            return;
        }

        const activo =
            estaActivo(beneficio);

        const resultado =
            await confirmar({
                titulo: activo
                    ? "Desactivar beneficio"
                    : "Reactivar beneficio",

                texto: activo
                    ? `El beneficio "${beneficio.nombre}" quedará inactivo y dejará de estar disponible para nuevas asociaciones.`
                    : `El beneficio "${beneficio.nombre}" volverá a estar disponible.`,

                boton: activo
                    ? "Desactivar"
                    : "Activar",

                peligro: activo
            });

        if (!resultado.isConfirmed) {
            return;
        }

        try {
            setProcesando(
                `${activo ? "desactivar" : "activar"}-${id}`
            );

            if (activo) {
                await desactivarBeneficio(
                    beneficio
                );
            } else {
                await activarBeneficio(
                    beneficio
                );
            }

            await cargarBeneficios();

            await alertaExito(
                activo
                    ? "Beneficio desactivado"
                    : "Beneficio reactivado",
                activo
                    ? "El beneficio quedó inactivo correctamente."
                    : "El beneficio volvió a estar disponible."
            );

        } catch (error) {
            await alertaError(
                activo
                    ? "No se pudo desactivar"
                    : "No se pudo activar",
                obtenerMensaje(error)
            );

        } finally {
            setProcesando(null);
        }
    }

    async function eliminar(
        beneficio
    ) {
        if (procesando !== null) {
            return;
        }

        const id =
            idDeBeneficio(beneficio);

        if (id == null) {
            await alertaError(
                "No se pudo eliminar",
                "No se encontró el identificador del beneficio."
            );
            return;
        }

        const resultado =
            await confirmar({
                titulo: "Eliminar beneficio",
                texto: `El beneficio "${beneficio.nombre}" será eliminado permanentemente. Esta acción no se puede deshacer.`,
                boton: "Eliminar",
                peligro: true
            });

        if (!resultado.isConfirmed) {
            return;
        }

        try {
            setProcesando(
                `eliminar-${id}`
            );

            await eliminarBeneficio(id);

            await cargarBeneficios();

            await alertaExito(
                "Beneficio eliminado",
                "El registro fue eliminado correctamente."
            );

        } catch (error) {
            await alertaError(
                "No se pudo eliminar",
                obtenerMensaje(error)
            );

        } finally {
            setProcesando(null);
        }
    }

    const filtrados = useMemo(() => {
        const q =
            normalizarComparacion(
                busqueda
            );

        return beneficios.filter(
            beneficio => {
                const texto =
                    normalizarComparacion(`
                        ${beneficio?.nombre || ""}
                        ${beneficio?.descripcion || ""}
                        ${beneficio?.tipoBeneficio || ""}
                    `);

                const coincideBusqueda =
                    texto.includes(q);

                const coincideEstado =
                    estado === "TODOS" ||
                    (
                        estado === "ACTIVOS" &&
                        estaActivo(beneficio)
                    ) ||
                    (
                        estado === "INACTIVOS" &&
                        !estaActivo(beneficio)
                    );

                const coincideTipo =
                    tipoFiltro === "TODOS" ||
                    beneficio?.tipoBeneficio ===
                    tipoFiltro;

                return (
                    coincideBusqueda &&
                    coincideEstado &&
                    coincideTipo
                );
            }
        );

    }, [
        beneficios,
        busqueda,
        estado,
        tipoFiltro
    ]);

    useEffect(() => {
        setPagina(1);
    }, [
        busqueda,
        estado,
        tipoFiltro
    ]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(
            filtrados.length / POR_PAGINA
        )
    );

    const paginaActual = Math.min(
        pagina,
        totalPaginas
    );

    const visibles = filtrados.slice(
        (paginaActual - 1) * POR_PAGINA,
        paginaActual * POR_PAGINA
    );

    const activos =
        beneficios.filter(
            estaActivo
        ).length;

    const inactivos =
        beneficios.length - activos;

    const tiposEnUso =
        new Set(
            beneficios
                .map(
                    beneficio =>
                        beneficio?.tipoBeneficio
                )
                .filter(Boolean)
        ).size;

    const stats = [
        {
            clave: "total",
            etiqueta: "Registrados",
            valor: beneficios.length,
            icono: HeartPulse,
            filtro: "TODOS"
        },
        {
            clave: "ok",
            etiqueta: "Activos",
            valor: activos,
            icono: CircleCheck,
            filtro: "ACTIVOS"
        },
        {
            clave: "off",
            etiqueta: "Inactivos",
            valor: inactivos,
            icono: CircleOff,
            filtro: "INACTIVOS"
        },
        {
            clave: "tipo",
            etiqueta: "Tipos en uso",
            valor: `${tiposEnUso}/3`,
            icono: Tags
        }
    ];

    return (
        <div className="be-page">

            {/* Banner */}

            <div className="be-head">

                <div>
                    <span className="be-crumb">
                        Catálogos
                        <i>/</i>
                        Beneficios
                    </span>

                    <h1>
                        Beneficios
                    </h1>

                    <p>
                        Administra los beneficios
                        nutricionales y funcionales
                        asociados a las especies del
                        catálogo botánico.
                    </p>
                </div>

                <button
                    type="button"
                    className="be-btn be-btn-primary be-btn-lg"
                    onClick={abrirNuevo}
                >
                    <Plus size={18} />
                    Nuevo beneficio
                </button>

            </div>

            {/* Estadísticas */}

            <div className="be-stats">

                {stats.map(stat => {
                    const Tag =
                        stat.filtro
                            ? "button"
                            : "div";

                    const Icono =
                        stat.icono;

                    return (
                        <Tag
                            key={stat.clave}
                            className={`be-stat be-stat-${stat.clave}`}
                            {...(
                                stat.filtro
                                    ? {
                                        type: "button",
                                        onClick: () =>
                                            setEstado(
                                                stat.filtro
                                            ),
                                        "aria-pressed":
                                            estado ===
                                            stat.filtro
                                    }
                                    : {}
                            )}
                        >

                            <span className="be-stat-icon">
                                <Icono size={20} />
                            </span>

                            <span className="be-stat-text">

                                <strong>
                                    {stat.valor}
                                </strong>

                                <span>
                                    {stat.etiqueta}
                                </span>

                            </span>

                        </Tag>
                    );
                })}

            </div>

            {/* Panel */}

            <div className="be-card">

                <div className="be-toolbar">

                    <label className="be-search">

                        <Search size={17} />

                        <input
                            type="text"
                            value={busqueda}
                            onChange={e =>
                                setBusqueda(
                                    e.target.value
                                )
                            }
                            placeholder="Buscar por nombre, tipo o descripción…"
                            aria-label="Buscar beneficio"
                        />

                        {busqueda && (
                            <button
                                type="button"
                                className="be-clear"
                                onClick={() =>
                                    setBusqueda("")
                                }
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <div className="be-segmented">

                        {[
                            ["TODOS", "Todos"],
                            ["ACTIVOS", "Activos"],
                            ["INACTIVOS", "Inactivos"]
                        ].map(
                            ([valor, texto]) => (
                                <button
                                    key={valor}
                                    type="button"
                                    className={
                                        estado === valor
                                            ? "on"
                                            : ""
                                    }
                                    onClick={() =>
                                        setEstado(valor)
                                    }
                                >
                                    {texto}
                                </button>
                            )
                        )}

                    </div>

                    <select
                        className="be-type-filter"
                        value={tipoFiltro}
                        onChange={e =>
                            setTipoFiltro(
                                e.target.value
                            )
                        }
                        aria-label="Filtrar por tipo"
                    >
                        <option value="TODOS">
                            Todos los tipos
                        </option>

                        {TIPOS_BENEFICIO.map(
                            tipo => (
                                <option
                                    key={tipo.valor}
                                    value={tipo.valor}
                                >
                                    {tipo.etiqueta}
                                </option>
                            )
                        )}

                    </select>

                    <button
                        type="button"
                        className="be-iconbtn be-refresh"
                        onClick={cargarBeneficios}
                        disabled={cargando}
                        title="Actualizar"
                        aria-label="Actualizar lista"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                cargando
                                    ? "girando"
                                    : ""
                            }
                        />
                    </button>

                </div>

                {/* Tabla */}

                <div className="be-table-wrap">

                    <table className="be-table">

                        <thead>
                            <tr>
                                <th>
                                    Beneficio
                                </th>

                                <th>
                                    Tipo
                                </th>

                                <th className="be-col-desc">
                                    Descripción
                                </th>

                                <th>
                                    Estado
                                </th>

                                <th className="be-col-actions">
                                    Acciones
                                </th>
                            </tr>
                        </thead>

                        <tbody>

                            {cargando ? (
                                <tr>
                                    <td colSpan="5">

                                        <div className="be-state">

                                            <span className="be-spinner" />

                                            <span>
                                                Cargando beneficios…
                                            </span>

                                        </div>

                                    </td>
                                </tr>

                            ) : visibles.length === 0 ? (
                                <tr>
                                    <td colSpan="5">

                                        <div className="be-state be-empty">

                                            <HeartPulse size={30} />

                                            <strong>
                                                {beneficios.length === 0
                                                    ? "Aún no hay beneficios"
                                                    : "Sin resultados"}
                                            </strong>

                                            <span>
                                                {beneficios.length === 0
                                                    ? "Registra el primer beneficio para comenzar."
                                                    : "Prueba con otra búsqueda o cambia los filtros."}
                                            </span>

                                            {beneficios.length === 0 && (
                                                <button
                                                    type="button"
                                                    className="be-btn be-btn-primary"
                                                    onClick={abrirNuevo}
                                                >
                                                    <Plus size={16} />
                                                    Nuevo beneficio
                                                </button>
                                            )}

                                        </div>

                                    </td>
                                </tr>

                            ) : (
                                visibles.map(
                                    beneficio => {
                                        const id =
                                            idDeBeneficio(
                                                beneficio
                                            );

                                        const activo =
                                            estaActivo(
                                                beneficio
                                            );

                                        const accionando =
                                            procesando ===
                                            `desactivar-${id}` ||
                                            procesando ===
                                            `activar-${id}` ||
                                            procesando ===
                                            `eliminar-${id}`;

                                        const tipo =
                                            TIPOS_BENEFICIO.find(
                                                item =>
                                                    item.valor ===
                                                    beneficio.tipoBeneficio
                                            );

                                        return (
                                            <tr
                                                key={id}
                                                className={
                                                    activo
                                                        ? ""
                                                        : "is-off"
                                                }
                                            >

                                                <td>

                                                    <div className="be-name">

                                                        <span className="be-avatar">
                                                            <HeartPulse size={18} />
                                                        </span>

                                                        <span>

                                                            <strong>
                                                                {beneficio.nombre}
                                                            </strong>

                                                            <small>
                                                                ID #{id}
                                                            </small>

                                                        </span>

                                                    </div>

                                                </td>

                                                <td>

                                                    <span
                                                        className={`be-type be-type-${(
                                                                beneficio.tipoBeneficio ||
                                                                "OTRO"
                                                            ).toLowerCase()
                                                            }`}
                                                    >
                                                        {tipo?.etiqueta ||
                                                            beneficio.tipoBeneficio ||
                                                            "Sin tipo"}
                                                    </span>

                                                </td>

                                                <td className="be-col-desc">

                                                    <span
                                                        className="be-description"
                                                        title={
                                                            beneficio.descripcion
                                                        }
                                                    >
                                                        {beneficio.descripcion}
                                                    </span>

                                                </td>

                                                <td>

                                                    <span
                                                        className={`be-status ${activo
                                                                ? "active"
                                                                : "inactive"
                                                            }`}
                                                    >
                                                        <i />

                                                        {activo
                                                            ? "Activo"
                                                            : "Inactivo"}
                                                    </span>

                                                </td>

                                                <td>

                                                    <div className="be-actions">

                                                        <button
                                                            type="button"
                                                            className="edit"
                                                            title="Editar"
                                                            disabled={
                                                                procesando !== null
                                                            }
                                                            onClick={() =>
                                                                abrirEditar(
                                                                    beneficio
                                                                )
                                                            }
                                                        >
                                                            <Pencil size={16} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className={
                                                                activo
                                                                    ? "off"
                                                                    : "on"
                                                            }
                                                            title={
                                                                activo
                                                                    ? "Desactivar"
                                                                    : "Reactivar"
                                                            }
                                                            disabled={
                                                                procesando !== null
                                                            }
                                                            onClick={() =>
                                                                cambiarEstado(
                                                                    beneficio
                                                                )
                                                            }
                                                        >

                                                            {accionando &&
                                                                !procesando?.startsWith(
                                                                    "eliminar"
                                                                ) ? (
                                                                <RefreshCw
                                                                    size={15}
                                                                    className="girando"
                                                                />
                                                            ) : activo ? (
                                                                <PowerOff size={16} />
                                                            ) : (
                                                                <Power size={16} />
                                                            )}

                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete"
                                                            title="Eliminar permanentemente"
                                                            disabled={
                                                                procesando !== null
                                                            }
                                                            onClick={() =>
                                                                eliminar(
                                                                    beneficio
                                                                )
                                                            }
                                                        >

                                                            {procesando ===
                                                                `eliminar-${id}` ? (
                                                                <RefreshCw
                                                                    size={15}
                                                                    className="girando"
                                                                />
                                                            ) : (
                                                                <Trash2 size={16} />
                                                            )}

                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>
                                        );
                                    }
                                )
                            )}

                        </tbody>

                    </table>

                </div>

                {/* Paginación */}

                <div className="be-pagination">

                    <span>
                        Mostrando{" "}

                        <strong>
                            {filtrados.length === 0
                                ? 0
                                : (paginaActual - 1) *
                                POR_PAGINA + 1}
                        </strong>

                        {" "}a{" "}

                        <strong>
                            {Math.min(
                                paginaActual *
                                POR_PAGINA,
                                filtrados.length
                            )}
                        </strong>

                        {" "}de{" "}

                        <strong>
                            {filtrados.length}
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
                                    p => Math.max(
                                        1,
                                        p - 1
                                    )
                                )
                            }
                        >
                            <ChevronLeft size={17} />
                        </button>

                        <span className="be-page-current">
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
                                    p => Math.min(
                                        totalPaginas,
                                        p + 1
                                    )
                                )
                            }
                        >
                            <ChevronRight size={17} />
                        </button>

                    </div>

                </div>

            </div>

            {/* Modal */}

            {editor !== null && (
                <div
                    className="bp-overlay"
                    onMouseDown={cerrarEditor}
                >

                    <form
                        className="bp-panel"
                        onSubmit={guardar}
                        onMouseDown={e =>
                            e.stopPropagation()
                        }
                        noValidate
                    >

                        <div className="bp-head">

                            <span className="bp-head-icon">
                                <HeartPulse size={21} />
                            </span>

                            <div className="bp-head-text">

                                <span>
                                    {editor === "nuevo"
                                        ? "NUEVO REGISTRO"
                                        : "EDICIÓN"}
                                </span>

                                <h2>
                                    {editor === "nuevo"
                                        ? "Nuevo beneficio"
                                        : "Editar beneficio"}
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="bp-close"
                                onClick={cerrarEditor}
                                disabled={guardando}
                                aria-label="Cerrar"
                            >
                                <X size={19} />
                            </button>

                        </div>

                        <div className="bp-body">

                            {/* Nombre */}

                            <div
                                className={`be-field ${errores.nombre
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label htmlFor="be-nombre">
                                    Nombre del beneficio
                                    <span>*</span>
                                </label>

                                <input
                                    id="be-nombre"
                                    type="text"
                                    value={
                                        formulario.nombre
                                    }
                                    onChange={e =>
                                        onCampo(
                                            "nombre",
                                            e.target.value
                                        )
                                    }
                                    onBlur={
                                        normalizarNombreAlSalir
                                    }
                                    maxLength={
                                        MAX_NOMBRE
                                    }
                                    placeholder="Ej. Antioxidante natural"
                                    autoComplete="off"
                                    autoFocus
                                />

                                <div className="be-field-foot">

                                    <small className="be-err">
                                        {errores.nombre}
                                    </small>

                                    <small>
                                        {
                                            formulario
                                                .nombre
                                                .length
                                        }/{MAX_NOMBRE}
                                    </small>

                                </div>

                            </div>

                            {/* Tipo */}

                            <div
                                className={`be-field ${errores.tipoBeneficio
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label>
                                    Tipo de beneficio
                                    <span>*</span>
                                </label>

                                <div className="be-type-options">

                                    {TIPOS_BENEFICIO.map(
                                        tipo => (
                                            <button
                                                key={tipo.valor}
                                                type="button"
                                                className={
                                                    formulario.tipoBeneficio ===
                                                        tipo.valor
                                                        ? "selected"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    onCampo(
                                                        "tipoBeneficio",
                                                        tipo.valor
                                                    )
                                                }
                                            >
                                                {tipo.etiqueta}
                                            </button>
                                        )
                                    )}

                                </div>

                                <div className="be-field-foot">

                                    <small className="be-err">
                                        {errores.tipoBeneficio}
                                    </small>

                                    <small>
                                        {
                                            TIPOS_BENEFICIO.find(
                                                tipo =>
                                                    tipo.valor ===
                                                    formulario.tipoBeneficio
                                            )?.descripcion
                                        }
                                    </small>

                                </div>

                            </div>

                            {/* Descripción */}

                            <div
                                className={`be-field ${errores.descripcion
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label htmlFor="be-descripcion">
                                    Descripción
                                    <span>*</span>
                                </label>

                                <textarea
                                    id="be-descripcion"
                                    rows={6}
                                    value={
                                        formulario.descripcion
                                    }
                                    onChange={e =>
                                        onCampo(
                                            "descripcion",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Describe cómo actúa este beneficio o sus propiedades…"
                                />

                                <div className="be-field-foot">

                                    <small className="be-err">
                                        {errores.descripcion}
                                    </small>

                                    <small>
                                        {
                                            formulario
                                                .descripcion
                                                .length
                                        } caracteres
                                    </small>

                                </div>

                            </div>

                            {/* Estado al editar */}

                            {editor !== "nuevo" && (
                                <label className="be-active-control">

                                    <input
                                        type="checkbox"
                                        checked={
                                            formulario.activo
                                        }
                                        onChange={e =>
                                            onCampo(
                                                "activo",
                                                e.target.checked
                                            )
                                        }
                                    />

                                    <span>
                                        Beneficio activo en el catálogo
                                    </span>

                                </label>
                            )}

                            <div className="bp-info">

                                <Info size={18} />

                                <div>
                                    <strong>
                                        Asociación botánica
                                    </strong>

                                    <p>
                                        Los beneficios activos
                                        podrán ser asociados con
                                        las especies durante el
                                        registro correspondiente.
                                    </p>
                                </div>

                            </div>

                        </div>

                        <div className="bp-foot">

                            <button
                                type="button"
                                className="be-btn be-btn-ghost"
                                onClick={cerrarEditor}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                className="be-btn be-btn-primary"
                                disabled={guardando}
                            >

                                {guardando ? (
                                    <RefreshCw
                                        size={16}
                                        className="girando"
                                    />
                                ) : (
                                    <Check size={16} />
                                )}

                                {guardando
                                    ? "Guardando…"
                                    : editor === "nuevo"
                                        ? "Registrar beneficio"
                                        : "Guardar cambios"}
                            </button>

                        </div>

                    </form>

                </div>
            )}

        </div>
    );
}

export default Beneficios;