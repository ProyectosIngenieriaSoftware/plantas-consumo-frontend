import { useEffect, useMemo, useRef, useState } from "react";
import {
    Apple,
    Plus,
    Search,
    Pencil,
    PowerOff,
    X,
    Check,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Layers3,
    CircleCheck,
    CircleOff,
    TriangleAlert
} from "lucide-react";
import Swal from "sweetalert2";
import {
    listarNutrientes,
    crearNutriente,
    actualizarNutriente,
    desactivarNutriente
} from "../../api/nutrienteService";
import "../../styles/nutrientes.css";
import "../../styles/alertas.css";

const CATEGORIAS = [
    "MACRONUTRIENTE",
    "VITAMINA",
    "MINERAL",
    "ENERGIA",
    "FIBRA",
    "OTRO"
];

const NOMBRES = {
    MACRONUTRIENTE: "Macronutriente",
    VITAMINA: "Vitamina",
    MINERAL: "Mineral",
    ENERGIA: "Energía",
    FIBRA: "Fibra",
    OTRO: "Otro"
};

const inicial = {
    nombre: "",
    categoria: "",
    descripcion: ""
};

const POR_PAGINA = 8;

const nombreCategoria = (valor) => {
    return NOMBRES[valor] || valor || "Sin categoría";
};

const claseCategoria = (valor) => {
    return `cat-${(valor || "otro").toLowerCase()}`;
};

const obtenerId = (nutriente) => {
    return nutriente?.id ?? nutriente?.idNutriente;
};

function obtenerMensaje(error) {
    const respuesta = error?.response?.data;

    if (typeof respuesta === "string") {
        return respuesta;
    }

    return respuesta?.mensaje ||
        respuesta?.message ||
        respuesta?.error ||
        "Ocurrió un error al comunicarse con el servidor.";
}

function obtenerValidaciones(error) {
    const respuesta = error?.response?.data;

    if (!respuesta) {
        return null;
    }

    if (respuesta.erroresValidacion) {
        return respuesta.erroresValidacion;
    }

    if (respuesta.errors && typeof respuesta.errors === "object") {
        return respuesta.errors;
    }

    return null;
}

function alertaExito(titulo, mensaje = "") {
    return Swal.fire({
        icon: "success",
        title: titulo,
        text: mensaje,
        timer: 1900,
        timerProgressBar: true,
        showConfirmButton: false,
        customClass: {
            popup: "flora-alert"
        }
    });
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

function alertaValidacion() {
    return Swal.fire({
        icon: "warning",
        title: "Revisa los datos",
        text: "Hay campos que deben corregirse antes de continuar.",
        confirmButtonText: "Entendido",
        buttonsStyling: false,
        customClass: {
            popup: "flora-alert",
            confirmButton: "flora-alert-confirm"
        }
    });
}

function PanelNutriente({
    editando,
    formulario,
    errores,
    guardando,
    onCampo,
    onSubmit,
    onCerrar
}) {
    const cerrarRef = useRef(onCerrar);
    cerrarRef.current = onCerrar;

    useEffect(() => {
        const teclas = (e) => {
            if (e.key === "Escape") {
                cerrarRef.current();
            }
        };

        const previo = document.body.style.overflow;

        document.addEventListener("keydown", teclas);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", teclas);
            document.body.style.overflow = previo;
        };
    }, []);

    const claseCat = claseCategoria(formulario.categoria);

    return (
        <div
            className="np-overlay"
            onMouseDown={onCerrar}
        >
            <form
                className={`np-panel ${claseCat}`}
                onMouseDown={(e) => e.stopPropagation()}
                onSubmit={onSubmit}
                noValidate
                role="dialog"
                aria-modal="true"
                aria-labelledby="np-titulo"
            >
                <div className="np-head">

                    <span className="np-head-icon">
                        <Apple size={22} />
                    </span>

                    <div className="np-head-text">
                        <span>
                            {editando ? "Edición" : "Nuevo registro"}
                        </span>

                        <h2 id="np-titulo">
                            {editando
                                ? "Editar nutriente"
                                : "Nuevo nutriente"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="nt-iconbtn"
                        onClick={onCerrar}
                        aria-label="Cerrar formulario"
                        disabled={guardando}
                    >
                        <X size={18} />
                    </button>

                </div>

                <div className="np-body">

                    <div className="np-preview">
                        <small>Vista previa</small>

                        <div>
                            <span className="nt-avatar">
                                <Apple size={18} />
                            </span>

                            <span className="np-preview-text">
                                <strong>
                                    {formulario.nombre.trim() ||
                                        "Nombre del nutriente"}
                                </strong>

                                <em>
                                    {nombreCategoria(
                                        formulario.categoria
                                    )}
                                </em>
                            </span>
                        </div>
                    </div>

                    <div
                        className={`nt-field ${errores.nombre ? "has-error" : ""
                            }`}
                    >
                        <label htmlFor="np-nombre">
                            Nombre <span>*</span>
                        </label>

                        <input
                            id="np-nombre"
                            type="text"
                            value={formulario.nombre}
                            onChange={(e) =>
                                onCampo(
                                    "nombre",
                                    e.target.value
                                )
                            }
                            maxLength={120}
                            placeholder="Ej. Vitamina C"
                            autoFocus
                        />

                        <div className="nt-field-foot">
                            <small className="nt-err">
                                {errores.nombre || ""}
                            </small>

                            <small>
                                {formulario.nombre.length}/120
                            </small>
                        </div>
                    </div>

                    <div
                        className={`nt-field ${errores.categoria ? "has-error" : ""
                            }`}
                    >
                        <label>
                            Categoría <span>*</span>
                        </label>

                        <div
                            className="nt-chips np-chips"
                            role="radiogroup"
                            aria-label="Categoría del nutriente"
                        >
                            {CATEGORIAS.map((categoria) => (
                                <button
                                    type="button"
                                    key={categoria}
                                    role="radio"
                                    aria-checked={
                                        formulario.categoria ===
                                        categoria
                                    }
                                    className={`nt-chip ${claseCategoria(categoria)
                                        } ${formulario.categoria ===
                                            categoria
                                            ? "on"
                                            : ""
                                        }`}
                                    onClick={() =>
                                        onCampo(
                                            "categoria",
                                            categoria
                                        )
                                    }
                                >
                                    {nombreCategoria(categoria)}
                                </button>
                            ))}
                        </div>

                        <div className="nt-field-foot">
                            <small className="nt-err">
                                {errores.categoria || ""}
                            </small>
                        </div>
                    </div>

                    <div
                        className={`nt-field ${errores.descripcion ? "has-error" : ""
                            }`}
                    >
                        <label htmlFor="np-desc">
                            Descripción <span>*</span>
                        </label>

                        <textarea
                            id="np-desc"
                            rows={5}
                            value={formulario.descripcion}
                            onChange={(e) =>
                                onCampo(
                                    "descripcion",
                                    e.target.value
                                )
                            }
                            placeholder="Describe brevemente el nutriente..."
                        />

                        <div className="nt-field-foot">
                            <small className="nt-err">
                                {errores.descripcion || ""}
                            </small>
                        </div>
                    </div>

                    <div className="np-backend-info">
                        <TriangleAlert size={18} />

                        <div>
                            <strong>
                                Validación del sistema
                            </strong>

                            <span>
                                La información será validada antes de guardarse.
                            </span>
                        </div>
                    </div>

                </div>

                <div className="np-foot">

                    <button
                        type="button"
                        className="nt-btn nt-btn-ghost"
                        onClick={onCerrar}
                        disabled={guardando}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="nt-btn nt-btn-primary"
                        disabled={guardando}
                    >
                        <Check size={16} />

                        {guardando
                            ? "Guardando..."
                            : editando
                                ? "Guardar cambios"
                                : "Registrar nutriente"}
                    </button>

                </div>

            </form>
        </div>
    );
}

function Nutrientes() {
    const [nutrientes, setNutrientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("TODOS");
    const [categoriaFiltro, setCategoriaFiltro] = useState("TODAS");

    const [editor, setEditor] = useState(null);
    const [formulario, setFormulario] = useState(inicial);
    const [errores, setErrores] = useState({});
    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        cargarNutrientes();
    }, []);

    async function cargarNutrientes() {
        try {
            setCargando(true);

            const datos = await listarNutrientes();

            setNutrientes(
                Array.isArray(datos)
                    ? datos
                    : datos?.content || []
            );

        } catch (error) {
            alertaError(
                "No se pudieron cargar los nutrientes",
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

    function abrirEditar(nutriente) {
        const id = obtenerId(nutriente);

        setEditor(id);

        setFormulario({
            nombre: nutriente.nombre || "",
            categoria: nutriente.categoria || "",
            descripcion: nutriente.descripcion || ""
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

    function cambiarCampo(campo, valor) {
        setFormulario((prev) => ({
            ...prev,
            [campo]: valor
        }));

        setErrores((prev) => ({
            ...prev,
            [campo]: ""
        }));
    }

    function validarFrontend() {
        const nuevos = {};

        if (!formulario.nombre.trim()) {
            nuevos.nombre = "El nombre es obligatorio";
        } else if (formulario.nombre.trim().length > 120) {
            nuevos.nombre = "El nombre no puede exceder 120 caracteres";
        }

        if (!formulario.categoria) {
            nuevos.categoria = "La categoría del nutriente es obligatoria";
        } else if (!CATEGORIAS.includes(formulario.categoria)) {
            nuevos.categoria = "La categoría seleccionada no es válida";
        }

        if (!formulario.descripcion.trim()) {
            nuevos.descripcion =
                "La descripción es obligatoria y no puede guardarse vacía o con solo espacios";
        }

        setErrores(nuevos);

        return Object.keys(nuevos).length === 0;
    }

    async function guardar(e) {
        e.preventDefault();

        if (!validarFrontend()) {
            await alertaValidacion();
            return;
        }

        const datos = {
            nombre: formulario.nombre.trim(),
            categoria: formulario.categoria,
            descripcion: formulario.descripcion.trim()
        };

        try {
            setGuardando(true);

            if (editor !== "nuevo") {
                await actualizarNutriente(
                    editor,
                    datos
                );

                setEditor(null);
                setFormulario(inicial);
                setErrores({});

                await cargarNutrientes();

                await alertaExito(
                    "Nutriente actualizado",
                    "Los cambios se guardaron correctamente."
                );

            } else {
                await crearNutriente(datos);

                setEditor(null);
                setFormulario(inicial);
                setErrores({});

                await cargarNutrientes();

                await alertaExito(
                    "Nutriente registrado",
                    "El nutriente fue registrado correctamente."
                );
            }

        } catch (error) {

            const validaciones = obtenerValidaciones(error);

            if (validaciones) {
                setErrores(validaciones);
                await alertaValidacion();
                return;
            }

            await alertaError(
                editor === "nuevo"
                    ? "No se pudo registrar"
                    : "No se pudo actualizar",
                obtenerMensaje(error)
            );

        } finally {
            setGuardando(false);
        }
    }

    async function desactivar(nutriente) {
        const id = obtenerId(nutriente);

        if (id === undefined || id === null) {
            await alertaError(
                "No se pudo desactivar",
                "No se encontró el identificador del nutriente."
            );
            return;
        }

        const resultado = await Swal.fire({
            icon: "warning",
            title: "Desactivar nutriente",
            html: `
                <div class="flora-confirm-text">
                    El nutriente
                    <strong>${nutriente.nombre}</strong>
                    quedará inactivo.
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Desactivar",
            cancelButtonText: "Cancelar",
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

        if (!resultado.isConfirmed) {
            return;
        }

        try {
            await desactivarNutriente(id);

            await cargarNutrientes();

            await alertaExito(
                "Nutriente desactivado",
                `${nutriente.nombre} fue dado de baja correctamente.`
            );

        } catch (error) {
            await alertaError(
                "No se pudo desactivar",
                obtenerMensaje(error)
            );
        }
    }

    const estaActivo = (nutriente) => {
        return nutriente.activo !== false;
    };

    const filtrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();

        return nutrientes.filter((nutriente) => {
            const texto = `
                ${nutriente.nombre || ""}
                ${nutriente.descripcion || ""}
                ${nombreCategoria(nutriente.categoria)}
            `.toLowerCase();

            const coincideBusqueda =
                texto.includes(q);

            const coincideEstado =
                estado === "TODOS" ||
                (
                    estado === "ACTIVOS" &&
                    estaActivo(nutriente)
                ) ||
                (
                    estado === "INACTIVOS" &&
                    !estaActivo(nutriente)
                );

            const coincideCategoria =
                categoriaFiltro === "TODAS" ||
                nutriente.categoria === categoriaFiltro;

            return coincideBusqueda &&
                coincideEstado &&
                coincideCategoria;
        });

    }, [
        nutrientes,
        busqueda,
        estado,
        categoriaFiltro
    ]);

    const conteo = useMemo(() => {
        const resultado = {};

        nutrientes.forEach((nutriente) => {
            const categoria =
                nutriente.categoria || "OTRO";

            resultado[categoria] =
                (resultado[categoria] || 0) + 1;
        });

        return resultado;

    }, [nutrientes]);

    useEffect(() => {
        setPagina(1);
    }, [
        busqueda,
        estado,
        categoriaFiltro
    ]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(filtrados.length / POR_PAGINA)
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
        nutrientes.filter(estaActivo).length;

    const inactivos =
        nutrientes.length - activos;

    const categoriasEnUso =
        Object.keys(conteo).length;

    const stats = [
        {
            clave: "total",
            etiqueta: "Registrados",
            valor: nutrientes.length,
            icono: Apple,
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
            clave: "cat",
            etiqueta: "Categorías en uso",
            valor: categoriasEnUso,
            icono: Layers3
        }
    ];

    return (
        <div className="nt-page">

            <div className="nt-head">

                <div>
                    <span className="nt-crumb">
                        Catálogos <i>/</i> Nutrientes
                    </span>

                    <h1>Nutrientes</h1>

                    <p>
                        Administra los nutrientes asociados
                        a las especies del catálogo botánico.
                    </p>
                </div>

                <button
                    className="nt-btn nt-btn-primary nt-btn-lg"
                    onClick={abrirNuevo}
                >
                    <Plus size={18} />
                    Nuevo nutriente
                </button>

            </div>

            <div className="nt-stats">

                {stats.map((item) => {
                    const Tag = item.filtro
                        ? "button"
                        : "div";

                    const Icono = item.icono;

                    return (
                        <Tag
                            key={item.clave}
                            className={`nt-stat nt-stat-${item.clave}`}
                            {...(
                                item.filtro
                                    ? {
                                        type: "button",
                                        onClick: () =>
                                            setEstado(item.filtro),
                                        "aria-pressed":
                                            estado === item.filtro
                                    }
                                    : {}
                            )}
                        >
                            <span className="nt-stat-icon">
                                <Icono size={20} />
                            </span>

                            <span className="nt-stat-text">
                                <strong>
                                    {item.valor}
                                </strong>

                                <span>
                                    {item.etiqueta}
                                </span>
                            </span>
                        </Tag>
                    );
                })}

            </div>

            <div className="nt-card">

                <div className="nt-toolbar">

                    <label className="nt-search">

                        <Search size={17} />

                        <input
                            value={busqueda}
                            onChange={(e) =>
                                setBusqueda(e.target.value)
                            }
                            placeholder="Buscar por nombre, categoría o descripción..."
                            aria-label="Buscar nutriente"
                        />

                        {busqueda && (
                            <button
                                type="button"
                                className="nt-clear"
                                onClick={() => setBusqueda("")}
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <div
                        className="nt-seg"
                        role="group"
                        aria-label="Estado"
                    >
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
                                onClick={() => setEstado(valor)}
                            >
                                {texto}
                            </button>
                        ))}
                    </div>

                    <button
                        className="nt-iconbtn nt-refresh"
                        onClick={cargarNutrientes}
                        aria-label="Actualizar lista"
                        title="Actualizar"
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

                <div className="nt-cats">

                    <button
                        type="button"
                        className={`nt-fchip ${categoriaFiltro === "TODAS"
                                ? "on"
                                : ""
                            }`}
                        onClick={() =>
                            setCategoriaFiltro("TODAS")
                        }
                    >
                        Todas
                        <em>{nutrientes.length}</em>
                    </button>

                    {CATEGORIAS.map((categoria) => (
                        <button
                            key={categoria}
                            type="button"
                            className={`nt-fchip ${categoriaFiltro === categoria
                                    ? "on"
                                    : ""
                                }`}
                            onClick={() =>
                                setCategoriaFiltro(categoria)
                            }
                        >
                            {nombreCategoria(categoria)}

                            <em>
                                {conteo[categoria] || 0}
                            </em>
                        </button>
                    ))}

                </div>

                <div className="nt-table-wrap">

                    <table className="nt-table">

                        <thead>
                            <tr>
                                <th>Nutriente</th>
                                <th>Categoría</th>
                                <th className="nt-col-desc">
                                    Descripción
                                </th>
                                <th>Estado</th>
                                <th className="nt-col-actions">
                                    Acciones
                                </th>
                            </tr>
                        </thead>

                        <tbody>

                            {cargando ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="nt-state">
                                            <span className="nt-spinner" />
                                            Cargando nutrientes...
                                        </div>
                                    </td>
                                </tr>

                            ) : visibles.length === 0 ? (
                                <tr>
                                    <td colSpan="5">

                                        <div className="nt-state nt-empty">

                                            <Apple size={30} />

                                            <strong>
                                                {nutrientes.length === 0
                                                    ? "Aún no hay nutrientes"
                                                    : "Sin resultados"}
                                            </strong>

                                            <span>
                                                {nutrientes.length === 0
                                                    ? "Registra el primero para empezar."
                                                    : "Prueba con otra búsqueda o cambia los filtros."}
                                            </span>

                                            {nutrientes.length === 0 && (
                                                <button
                                                    className="nt-btn nt-btn-primary"
                                                    onClick={abrirNuevo}
                                                >
                                                    <Plus size={16} />
                                                    Nuevo nutriente
                                                </button>
                                            )}

                                        </div>

                                    </td>
                                </tr>

                            ) : (
                                visibles.map((nutriente) => {

                                    const id =
                                        obtenerId(nutriente);

                                    const activo =
                                        estaActivo(nutriente);

                                    return (
                                        <tr
                                            key={id}
                                            className={`${activo
                                                    ? ""
                                                    : "is-off"
                                                } ${editor === id
                                                    ? "is-editing"
                                                    : ""
                                                }`}
                                        >

                                            <td>
                                                <div className="nt-name">

                                                    <span
                                                        className={`nt-avatar ${claseCategoria(
                                                            nutriente.categoria
                                                        )
                                                            }`}
                                                    >
                                                        <Apple size={18} />
                                                    </span>

                                                    <span>
                                                        <strong>
                                                            {nutriente.nombre}
                                                        </strong>

                                                        <small>
                                                            ID #{id}
                                                        </small>
                                                    </span>

                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`nt-cat ${claseCategoria(
                                                        nutriente.categoria
                                                    )
                                                        }`}
                                                >
                                                    {nombreCategoria(
                                                        nutriente.categoria
                                                    )}
                                                </span>
                                            </td>

                                            <td className="nt-col-desc">
                                                <span className="nt-desc">
                                                    {nutriente.descripcion ||
                                                        "Sin descripción"}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={`nt-status ${activo
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
                                                <div className="nt-actions">

                                                    <button
                                                        title="Editar"
                                                        aria-label={`Editar ${nutriente.nombre}`}
                                                        onClick={() =>
                                                            abrirEditar(
                                                                nutriente
                                                            )
                                                        }
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    {activo && (
                                                        <button
                                                            className="off"
                                                            title="Dar de baja"
                                                            aria-label={`Desactivar ${nutriente.nombre}`}
                                                            onClick={() =>
                                                                desactivar(
                                                                    nutriente
                                                                )
                                                            }
                                                        >
                                                            <PowerOff size={16} />
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

                <div className="nt-pagination">

                    <span>
                        Mostrando{" "}
                        <strong>
                            {filtrados.length === 0
                                ? 0
                                : (paginaActual - 1) * POR_PAGINA + 1}
                        </strong>
                        {" "}a{" "}
                        <strong>
                            {Math.min(
                                paginaActual * POR_PAGINA,
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
                            disabled={paginaActual === 1}
                            onClick={() =>
                                setPagina(paginaActual - 1)
                            }
                            aria-label="Página anterior"
                        >
                            <ChevronLeft size={17} />
                        </button>

                        <span className="nt-page-current">
                            {paginaActual} / {totalPaginas}
                        </span>

                        <button
                            disabled={
                                paginaActual === totalPaginas
                            }
                            onClick={() =>
                                setPagina(paginaActual + 1)
                            }
                            aria-label="Página siguiente"
                        >
                            <ChevronRight size={17} />
                        </button>

                    </div>

                </div>

            </div>

            {editor !== null && (
                <PanelNutriente
                    editando={editor !== "nuevo"}
                    formulario={formulario}
                    errores={errores}
                    guardando={guardando}
                    onCampo={cambiarCampo}
                    onSubmit={guardar}
                    onCerrar={cerrarEditor}
                />
            )}

        </div>
    );
}

export default Nutrientes;