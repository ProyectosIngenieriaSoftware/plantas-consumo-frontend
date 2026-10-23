import { useEffect, useMemo, useState } from "react";
import {
    Plus,
    Search,
    Pencil,
    Power,
    PowerOff,
    X,
    Mountain,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleOff,
    ListFilter,
    Check
} from "lucide-react";
import Swal from "sweetalert2";
import {
    listarHabitats,
    crearHabitat,
    actualizarHabitat,
    desactivarHabitat,
    activarHabitat
} from "../../api/habitatService";
import "../../styles/habitats.css";
import "../../styles/alertas.css";

const POR_PAGINA = 7;
const MAX_NOMBRE = 120;
const MAX_DESCRIPCION = 250;

const inicial = {
    nombre: "",
    descripcion: ""
};

function obtenerId(habitat) {
    return habitat?.id ??
        habitat?.idHabitat ??
        null;
}

function estaActivo(habitat) {
    return habitat?.activo !== false;
}

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
    return /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(texto);
}

function contieneCaracterControl(texto) {
    return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(texto);
}

function mensajeError(error) {
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

function Habitats() {
    const [habitats, setHabitats] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [procesando, setProcesando] = useState(null);

    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("TODOS");

    const [editor, setEditor] = useState(null);
    const [formulario, setFormulario] = useState(inicial);
    const [errores, setErrores] = useState({});

    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        cargarHabitats();
    }, []);

    async function cargarHabitats() {
        try {
            setCargando(true);

            const datos = await listarHabitats();

            setHabitats(
                Array.isArray(datos)
                    ? datos
                    : datos?.content || []
            );

        } catch (error) {
            await alertaError(
                "No se pudieron cargar los hábitats",
                mensajeError(error)
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

    function abrirEditar(habitat) {
        const id = obtenerId(habitat);

        setEditor(id);

        setFormulario({
            nombre: habitat?.nombre || "",
            descripcion: habitat?.descripcion || ""
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
            nombre: limpiarEspacios(prev.nombre)
        }));
    }

    function existeNombreDuplicado(nombre) {
        const buscado = normalizarComparacion(nombre);

        return habitats.some(habitat => {
            const id = obtenerId(habitat);

            if (
                editor !== "nuevo" &&
                String(id) === String(editor)
            ) {
                return false;
            }

            return normalizarComparacion(
                habitat?.nombre
            ) === buscado;
        });
    }

    function validar() {
        const nuevos = {};

        const nombre =
            limpiarEspacios(formulario.nombre);

        const descripcion =
            formulario.descripcion.trim();

        /* =================================
           NOMBRE - BACKEND + FRONTEND
        ================================= */

        if (!nombre) {
            nuevos.nombre =
                "El nombre es obligatorio.";

        } else if (nombre.length > MAX_NOMBRE) {
            nuevos.nombre =
                `El nombre no puede exceder ${MAX_NOMBRE} caracteres.`;

        } else if (!contieneLetra(nombre)) {
            nuevos.nombre =
                "El nombre debe contener al menos una letra y no puede estar compuesto únicamente por números o símbolos.";

        } else if (contieneCaracterControl(nombre)) {
            nuevos.nombre =
                "El nombre contiene caracteres no permitidos.";

        } else if (existeNombreDuplicado(nombre)) {
            nuevos.nombre =
                "Ya existe un hábitat registrado con este nombre.";
        }

        /* =================================
           DESCRIPCIÓN
        ================================= */

        if (descripcion.length > MAX_DESCRIPCION) {
            nuevos.descripcion =
                `La descripción no puede exceder ${MAX_DESCRIPCION} caracteres.`;

        } else if (
            descripcion &&
            !contieneLetra(descripcion)
        ) {
            nuevos.descripcion =
                "La descripción debe contener al menos una letra.";

        } else if (
            descripcion &&
            contieneCaracterControl(descripcion)
        ) {
            nuevos.descripcion =
                "La descripción contiene caracteres no permitidos.";
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
            validaciones &&
            typeof validaciones === "object" &&
            !Array.isArray(validaciones)
        ) {
            const normalizados = {};

            Object.entries(validaciones).forEach(
                ([campo, mensaje]) => {
                    if (Array.isArray(mensaje)) {
                        normalizados[campo] =
                            mensaje[0] || "Valor inválido.";
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

        return false;
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
            descripcion:
                formulario.descripcion.trim()
        };

        try {
            setGuardando(true);

            if (editor === "nuevo") {
                await crearHabitat(datos);

                await cargarHabitats();

                setEditor(null);
                setFormulario(inicial);
                setErrores({});

                await alertaExito(
                    "Hábitat registrado",
                    "El hábitat se registró correctamente."
                );

                return;
            }

            await actualizarHabitat(
                editor,
                datos
            );

            await cargarHabitats();

            setEditor(null);
            setFormulario(inicial);
            setErrores({});

            await alertaExito(
                "Hábitat actualizado",
                "Los cambios se guardaron correctamente."
            );

        } catch (error) {
            if (aplicarErroresBackend(error)) {
                return;
            }

            await alertaError(
                "No se pudo guardar",
                mensajeError(error)
            );

        } finally {
            setGuardando(false);
        }
    }

    async function desactivar(habitat) {
        const id = obtenerId(habitat);

        if (id == null) {
            await alertaError(
                "No se pudo desactivar",
                "No se encontró el identificador del hábitat."
            );
            return;
        }

        if (procesando !== null) {
            return;
        }

        const resultado = await confirmar({
            titulo: "Desactivar hábitat",
            texto: `El hábitat "${habitat.nombre}" quedará inactivo y dejará de estar disponible para nuevas asociaciones.`,
            boton: "Desactivar",
            peligro: true
        });

        if (!resultado.isConfirmed) {
            return;
        }

        try {
            setProcesando(`desactivar-${id}`);

            await desactivarHabitat(id);

            await cargarHabitats();

            await alertaExito(
                "Hábitat desactivado",
                "El hábitat quedó inactivo correctamente."
            );

        } catch (error) {
            await alertaError(
                "No se pudo desactivar",
                mensajeError(error)
            );
        } finally {
            setProcesando(null);
        }
    }

    async function activar(habitat) {
        const id = obtenerId(habitat);

        if (id == null) {
            await alertaError(
                "No se pudo activar",
                "No se encontró el identificador del hábitat."
            );
            return;
        }

        if (procesando !== null) {
            return;
        }

        const resultado = await confirmar({
            titulo: "Reactivar hábitat",
            texto: `El hábitat "${habitat.nombre}" volverá a estar disponible para nuevas asociaciones.`,
            boton: "Activar"
        });

        if (!resultado.isConfirmed) {
            return;
        }

        try {
            setProcesando(`activar-${id}`);

            await activarHabitat(id);

            await cargarHabitats();

            await alertaExito(
                "Hábitat reactivado",
                "El hábitat volvió a estar disponible."
            );

        } catch (error) {
            await alertaError(
                "No se pudo activar",
                mensajeError(error)
            );
        } finally {
            setProcesando(null);
        }
    }

    const filtrados = useMemo(() => {
        const q = normalizarComparacion(
            busqueda
        );

        return habitats.filter(habitat => {
            const texto = normalizarComparacion(`
                ${habitat?.nombre || ""}
                ${habitat?.descripcion || ""}
            `);

            const coincideBusqueda =
                texto.includes(q);

            const coincideEstado =
                estado === "TODOS" ||
                (
                    estado === "ACTIVOS" &&
                    estaActivo(habitat)
                ) ||
                (
                    estado === "INACTIVOS" &&
                    !estaActivo(habitat)
                );

            return coincideBusqueda &&
                coincideEstado;
        });

    }, [
        habitats,
        busqueda,
        estado
    ]);

    useEffect(() => {
        setPagina(1);
    }, [
        busqueda,
        estado
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

    const activos = habitats
        .filter(estaActivo)
        .length;

    const inactivos =
        habitats.length - activos;

    const stats = [
        {
            clave: "total",
            etiqueta: "Registrados",
            valor: habitats.length,
            icono: Mountain,
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
            clave: "result",
            etiqueta: "Resultados",
            valor: filtrados.length,
            icono: ListFilter
        }
    ];

    return (
        <div className="hb-page">

            <div className="hb-head">

                <div>
                    <span className="hb-crumb">
                        Catálogos
                        <i>/</i>
                        Hábitats
                    </span>

                    <h1>Hábitats</h1>

                    <p>
                        Administra los ambientes donde se
                        desarrollan las especies del catálogo botánico.
                    </p>
                </div>

                <button
                    type="button"
                    className="hb-btn hb-btn-primary hb-btn-lg"
                    onClick={abrirNuevo}
                    disabled={guardando}
                >
                    <Plus size={18} />
                    Nuevo hábitat
                </button>

            </div>

            <div className="hb-stats">

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
                            className={`hb-stat hb-stat-${stat.clave}`}
                            {...(
                                stat.filtro
                                    ? {
                                        type: "button",
                                        onClick: () =>
                                            setEstado(
                                                stat.filtro
                                            ),
                                        "aria-pressed":
                                            estado === stat.filtro
                                    }
                                    : {}
                            )}
                        >

                            <span className="hb-stat-icon">
                                <Icono size={20} />
                            </span>

                            <span className="hb-stat-text">

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

            <div className="hb-card">

                <div className="hb-toolbar">

                    <label className="hb-search">

                        <Search size={17} />

                        <input
                            type="text"
                            value={busqueda}
                            onChange={e =>
                                setBusqueda(
                                    e.target.value
                                )
                            }
                            placeholder="Buscar por nombre o descripción…"
                            aria-label="Buscar hábitat"
                        />

                        {busqueda && (
                            <button
                                type="button"
                                className="hb-clear"
                                onClick={() =>
                                    setBusqueda("")
                                }
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <div className="hb-segmented">

                        {[
                            ["TODOS", "Todos"],
                            ["ACTIVOS", "Activos"],
                            ["INACTIVOS", "Inactivos"]
                        ].map(([valor, texto]) => (
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
                        ))}

                    </div>

                    <button
                        type="button"
                        className="hb-iconbtn hb-refresh"
                        onClick={cargarHabitats}
                        aria-label="Actualizar lista"
                        title="Actualizar"
                        disabled={cargando}
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

                <div className="hb-table-wrap">

                    <table className="hb-table">

                        <thead>
                            <tr>

                                <th>
                                    Hábitat
                                </th>

                                <th className="hb-col-desc">
                                    Descripción
                                </th>

                                <th>
                                    Estado
                                </th>

                                <th className="hb-col-actions">
                                    Acciones
                                </th>

                            </tr>
                        </thead>

                        <tbody>

                            {cargando ? (
                                <tr>
                                    <td colSpan="4">

                                        <div className="hb-state">

                                            <span className="hb-spinner" />

                                            <span>
                                                Cargando hábitats…
                                            </span>

                                        </div>

                                    </td>
                                </tr>
                            ) : visibles.length === 0 ? (
                                <tr>
                                    <td colSpan="4">

                                        <div className="hb-state hb-empty">

                                            <Mountain size={30} />

                                            <strong>
                                                {habitats.length === 0
                                                    ? "Aún no hay hábitats"
                                                    : "Sin resultados"}
                                            </strong>

                                            <span>
                                                {habitats.length === 0
                                                    ? "Registra el primer hábitat para comenzar."
                                                    : "Prueba con otra búsqueda o cambia los filtros."}
                                            </span>

                                            {habitats.length === 0 && (
                                                <button
                                                    type="button"
                                                    className="hb-btn hb-btn-primary"
                                                    onClick={abrirNuevo}
                                                >
                                                    <Plus size={16} />
                                                    Nuevo hábitat
                                                </button>
                                            )}

                                        </div>

                                    </td>
                                </tr>
                            ) : (
                                visibles.map(habitat => {
                                    const id =
                                        obtenerId(habitat);

                                    const activo =
                                        estaActivo(habitat);

                                    const accionando =
                                        procesando === `desactivar-${id}` ||
                                        procesando === `activar-${id}`;

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

                                                <div className="hb-name">

                                                    <span className="hb-avatar">
                                                        <Mountain size={18} />
                                                    </span>

                                                    <span>

                                                        <strong>
                                                            {habitat.nombre}
                                                        </strong>

                                                        <small>
                                                            ID #{id}
                                                        </small>

                                                    </span>

                                                </div>

                                            </td>

                                            <td className="hb-col-desc">

                                                <span className="hb-description">
                                                    {habitat.descripcion ||
                                                        "Sin descripción"}
                                                </span>

                                            </td>

                                            <td>

                                                <span
                                                    className={`hb-status ${activo
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

                                                <div className="hb-actions">

                                                    <button
                                                        type="button"
                                                        className="edit"
                                                        title="Editar"
                                                        aria-label={`Editar ${habitat.nombre}`}
                                                        disabled={
                                                            procesando !== null
                                                        }
                                                        onClick={() =>
                                                            abrirEditar(
                                                                habitat
                                                            )
                                                        }
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    {activo ? (
                                                        <button
                                                            type="button"
                                                            className="off"
                                                            title="Desactivar"
                                                            aria-label={`Desactivar ${habitat.nombre}`}
                                                            disabled={
                                                                procesando !== null
                                                            }
                                                            onClick={() =>
                                                                desactivar(
                                                                    habitat
                                                                )
                                                            }
                                                        >
                                                            {accionando ? (
                                                                <RefreshCw
                                                                    size={15}
                                                                    className="girando"
                                                                />
                                                            ) : (
                                                                <PowerOff size={16} />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="on"
                                                            title="Activar"
                                                            aria-label={`Activar ${habitat.nombre}`}
                                                            disabled={
                                                                procesando !== null
                                                            }
                                                            onClick={() =>
                                                                activar(
                                                                    habitat
                                                                )
                                                            }
                                                        >
                                                            {accionando ? (
                                                                <RefreshCw
                                                                    size={15}
                                                                    className="girando"
                                                                />
                                                            ) : (
                                                                <Power size={16} />
                                                            )}
                                                        </button>
                                                    )}

                                                </div>

                                            </td>

                                        </tr>
                                    );
                                })
                            )}

                        </tbody>

                    </table>

                </div>

                <div className="hb-pagination">

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
                            aria-label="Página anterior"
                        >
                            <ChevronLeft size={17} />
                        </button>

                        <span className="hb-page-current">
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
                            aria-label="Página siguiente"
                        >
                            <ChevronRight size={17} />
                        </button>

                    </div>

                </div>

            </div>

            {editor !== null && (
                <div
                    className="hp-overlay"
                    onMouseDown={cerrarEditor}
                >

                    <form
                        className="hp-panel"
                        onSubmit={guardar}
                        onMouseDown={e =>
                            e.stopPropagation()
                        }
                        noValidate
                    >

                        <div className="hp-head">

                            <span className="hp-head-icon">
                                <Mountain size={21} />
                            </span>

                            <div className="hp-head-text">

                                <span>
                                    {editor === "nuevo"
                                        ? "NUEVO REGISTRO"
                                        : "EDICIÓN"}
                                </span>

                                <h2>
                                    {editor === "nuevo"
                                        ? "Nuevo hábitat"
                                        : "Editar hábitat"}
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="hp-close"
                                onClick={cerrarEditor}
                                disabled={guardando}
                                aria-label="Cerrar"
                            >
                                <X size={19} />
                            </button>

                        </div>

                        <div className="hp-body">

                            <div
                                className={`hb-field ${errores.nombre
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label htmlFor="hb-nombre">
                                    Nombre
                                    <span>*</span>
                                </label>

                                <input
                                    id="hb-nombre"
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
                                    placeholder="Ej. Bosque tropical"
                                    autoComplete="off"
                                    autoFocus
                                    aria-invalid={
                                        Boolean(
                                            errores.nombre
                                        )
                                    }
                                />

                                <div className="hb-field-foot">

                                    <small className="hb-err">
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

                            <div
                                className={`hb-field ${errores.descripcion
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label htmlFor="hb-descripcion">
                                    Descripción
                                    <span className="hb-optional">
                                        Opcional
                                    </span>
                                </label>

                                <textarea
                                    id="hb-descripcion"
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
                                    maxLength={
                                        MAX_DESCRIPCION
                                    }
                                    placeholder="Describe brevemente el hábitat…"
                                    aria-invalid={
                                        Boolean(
                                            errores.descripcion
                                        )
                                    }
                                />

                                <div className="hb-field-foot">

                                    <small className="hb-err">
                                        {errores.descripcion}
                                    </small>

                                    <small>
                                        {
                                            formulario
                                                .descripcion
                                                .length
                                        }/{MAX_DESCRIPCION}
                                    </small>

                                </div>

                            </div>

                            <div className="hp-info">

                                <Mountain size={18} />

                                <p>
                                    El nombre es obligatorio,
                                    debe contener al menos una
                                    letra y no puede repetirse.
                                    Se permiten hasta 120
                                    caracteres. La descripción
                                    es opcional y admite hasta
                                    250 caracteres.
                                </p>

                            </div>

                        </div>

                        <div className="hp-foot">

                            <button
                                type="button"
                                className="hb-btn hb-btn-ghost"
                                onClick={cerrarEditor}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                className="hb-btn hb-btn-primary"
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
                                        ? "Registrar hábitat"
                                        : "Guardar cambios"}
                            </button>

                        </div>

                    </form>

                </div>
            )}

        </div>
    );
}

export default Habitats;