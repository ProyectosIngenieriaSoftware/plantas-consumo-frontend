import { useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    BookMarked,
    CircleCheck,
    CircleOff,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Plus,
    PowerOff,
    RefreshCw,
    Search,
    X,
    Pencil
} from "lucide-react";
import Swal from "sweetalert2";
import {
    actualizarFuente,
    crearFuente,
    desactivarFuente,
    listarFuentes
} from "../../api/fuenteService";
import "../../styles/nutrientes.css";
import "../../styles/alertas.css";

const POR_PAGINA = 8;
const ANIO_ACTUAL = new Date().getFullYear();

const MAX_TITULO = 300;
const MAX_AUTOR = 250;
const MAX_URL = 1000;

const TIPOS_FUENTE = [
    "LIBRO",
    "ARTICULO",
    "SITIO_WEB",
    "ENTREVISTA",
    "TESIS",
    "INFORME",
    "CONOCIMIENTO_ANCESTRAL",
    "OTRO"
];

const INICIAL = {
    titulo: "",
    autor: "",
    anio: "",
    tipoFuente: "",
    url: "",
    referenciaBibliografica: ""
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
    return /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(texto);
}

function contieneCaracterControl(texto) {
    return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(texto);
}

function urlValida(texto) {
    try {
        const url = new URL(texto);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    } catch {
        return false;
    }
}

function obtenerMensaje(error) {
    const respuesta = error?.response?.data;

    if (typeof respuesta === "string") {
        return respuesta;
    }

    return (
        respuesta?.mensaje ||
        respuesta?.message ||
        respuesta?.error ||
        error?.message ||
        "Ocurrió un error al comunicarse con el servidor."
    );
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

function estaActiva(fuente) {
    return fuente?.activa !== false;
}

async function obtenerFuentes() {
    const fuentes = await listarFuentes(false);

    if (!Array.isArray(fuentes)) {
        throw new Error(
            "El servidor devolvió un listado de fuentes inválido."
        );
    }

    return fuentes;
}

function mostrarErrorCarga(error) {
    return Swal.fire({
        icon: "error",
        title: "No se pudieron cargar las fuentes",
        text: obtenerMensaje(error),
        confirmButtonText: "Entendido",
        buttonsStyling: false,
        customClass: {
            popup: "flora-alert",
            confirmButton: "flora-alert-confirm"
        }
    });
}

function Fuentes() {
    const [fuentes, setFuentes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [procesando, setProcesando] = useState(null);

    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("TODOS");

    const [modal, setModal] = useState(false);
    const [editando, setEditando] = useState(null);

    const [formulario, setFormulario] = useState(INICIAL);
    const [errores, setErrores] = useState({});

    const [pagina, setPagina] = useState(1);

    async function cargarFuentes() {
        try {
            setCargando(true);

            const datos = await obtenerFuentes();

            setFuentes(datos);

        } catch (error) {
            await mostrarErrorCarga(error);

        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarFuentes();
    }, []);

    useEffect(() => {
        if (!modal) {
            return undefined;
        }

        const anterior =
            document.body.style.overflow;

        function cerrarConEscape(evento) {
            if (
                evento.key === "Escape" &&
                !guardando
            ) {
                cerrarModal();
            }
        }

        document.body.style.overflow = "hidden";

        document.addEventListener(
            "keydown",
            cerrarConEscape
        );

        return () => {
            document.body.style.overflow =
                anterior;

            document.removeEventListener(
                "keydown",
                cerrarConEscape
            );
        };

    }, [modal, guardando]);

    function abrirNueva() {
        setEditando(null);
        setFormulario(INICIAL);
        setErrores({});
        setModal(true);
    }

    function abrirEdicion(fuente) {
        setEditando(fuente);

        setFormulario({
            titulo: fuente?.titulo || "",
            autor: fuente?.autor || "",
            anio:
                fuente?.anio == null
                    ? ""
                    : String(fuente.anio),
            tipoFuente:
                fuente?.tipoFuente || "",
            url: fuente?.url || "",
            referenciaBibliografica:
                fuente?.referenciaBibliografica ||
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
        setFormulario(INICIAL);
        setErrores({});
    }

    function cambiarCampo(evento) {
        const { name, value } = evento.target;

        setFormulario(actual => ({
            ...actual,
            [name]: value
        }));

        setErrores(actuales => ({
            ...actuales,
            [name]: ""
        }));
    }

    function normalizarCampo(nombre) {
        setFormulario(actual => ({
            ...actual,
            [nombre]:
                limpiarEspacios(
                    actual[nombre]
                )
        }));
    }

    function cambiarBusqueda(valor) {
        setBusqueda(valor);
        setPagina(1);
    }

    function cambiarEstado(valor) {
        setEstado(valor);
        setPagina(1);
    }

    function existeTituloDuplicado(titulo) {
        const buscado =
            normalizarComparacion(titulo);

        return fuentes.some(fuente => {
            if (
                editando &&
                String(fuente.idFuente) ===
                String(editando.idFuente)
            ) {
                return false;
            }

            return (
                normalizarComparacion(
                    fuente?.titulo
                ) === buscado
            );
        });
    }

    function validar() {
        const nuevosErrores = {};

        const titulo =
            limpiarEspacios(
                formulario.titulo
            );

        const autor =
            limpiarEspacios(
                formulario.autor
            );

        const anio =
            String(
                formulario.anio ?? ""
            ).trim();

        const tipo =
            formulario.tipoFuente;

        const url =
            String(
                formulario.url ?? ""
            ).trim();

        const referencia =
            limpiarEspacios(
                formulario
                    .referenciaBibliografica
            );

        /*
         * TÍTULO
         */

        if (!titulo) {
            nuevosErrores.titulo =
                "El título es obligatorio.";

        } else if (
            titulo.length > MAX_TITULO
        ) {
            nuevosErrores.titulo =
                `El título no puede exceder ${MAX_TITULO} caracteres.`;

        } else if (
            !contieneLetra(titulo)
        ) {
            nuevosErrores.titulo =
                "El título debe contener al menos una letra.";

        } else if (
            contieneCaracterControl(titulo)
        ) {
            nuevosErrores.titulo =
                "El título contiene caracteres no permitidos.";

        } else if (
            existeTituloDuplicado(titulo)
        ) {
            nuevosErrores.titulo =
                "Ya existe una fuente registrada con este título.";
        }

        /*
         * AUTOR
         * Campo opcional
         */

        if (autor.length > MAX_AUTOR) {
            nuevosErrores.autor =
                `El autor no puede exceder ${MAX_AUTOR} caracteres.`;

        } else if (
            autor &&
            !contieneLetra(autor)
        ) {
            nuevosErrores.autor =
                "El autor debe contener al menos una letra.";

        } else if (
            autor &&
            contieneCaracterControl(autor)
        ) {
            nuevosErrores.autor =
                "El autor contiene caracteres no permitidos.";
        }

        /*
         * TIPO DE FUENTE
         */

        if (!tipo) {
            nuevosErrores.tipoFuente =
                "El tipo de fuente es obligatorio.";

        } else if (
            !TIPOS_FUENTE.includes(tipo)
        ) {
            nuevosErrores.tipoFuente =
                "Selecciona un tipo de fuente válido.";
        }

        /*
         * AÑO
         * Campo opcional
         */

        if (anio) {

            if (!/^\d{4}$/.test(anio)) {
                nuevosErrores.anio =
                    "Ingresa un año válido de 4 dígitos.";

            } else {
                const numero =
                    Number(anio);

                if (
                    numero < 1000 ||
                    numero > ANIO_ACTUAL
                ) {
                    nuevosErrores.anio =
                        `Ingresa un año entre 1000 y ${ANIO_ACTUAL}.`;
                }
            }
        }

        /*
         * URL
         */

        if (url.length > MAX_URL) {
            nuevosErrores.url =
                `La URL no puede exceder ${MAX_URL} caracteres.`;

        } else if (
            tipo === "SITIO_WEB" &&
            !url
        ) {
            nuevosErrores.url =
                "La URL es obligatoria para una fuente de tipo Sitio web.";

        } else if (
            url &&
            !urlValida(url)
        ) {
            nuevosErrores.url =
                "Ingresa una URL válida que comience con http:// o https://.";

        } else if (
            url &&
            contieneCaracterControl(url)
        ) {
            nuevosErrores.url =
                "La URL contiene caracteres no permitidos.";
        }

        /*
         * REFERENCIA BIBLIOGRÁFICA
         * Campo opcional
         */

        if (
            referencia &&
            !contieneLetra(referencia)
        ) {
            nuevosErrores
                .referenciaBibliografica =
                "La referencia bibliográfica debe contener al menos una letra.";

        } else if (
            referencia &&
            contieneCaracterControl(
                referencia
            )
        ) {
            nuevosErrores
                .referenciaBibliografica =
                "La referencia bibliográfica contiene caracteres no permitidos.";
        }

        setErrores(nuevosErrores);

        return (
            Object.keys(
                nuevosErrores
            ).length === 0
        );
    }

    function aplicarErroresBackend(error) {
        const data =
            error?.response?.data;

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

        Object.entries(
            validaciones
        ).forEach(
            ([campo, mensaje]) => {

                if (
                    Array.isArray(mensaje)
                ) {
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

        setErrores(actuales => ({
            ...actuales,
            ...normalizados
        }));

        return true;
    }

    async function guardar(evento) {
        evento.preventDefault();

        if (guardando) {
            return;
        }

        if (!validar()) {
            return;
        }

        const esEdicion =
            Boolean(editando);

        const datos = {
            titulo:
                limpiarEspacios(
                    formulario.titulo
                ),

            autor:
                limpiarEspacios(
                    formulario.autor
                ) || null,

            anio:
                formulario.anio.trim()
                    ? Number(
                        formulario.anio
                    )
                    : null,

            tipoFuente:
                formulario.tipoFuente,

            url:
                formulario.url.trim() ||
                null,

            referenciaBibliografica:
                limpiarEspacios(
                    formulario
                        .referenciaBibliografica
                ) || null
        };

        try {
            setGuardando(true);

            if (esEdicion) {
                await actualizarFuente(
                    editando.idFuente,
                    datos
                );

            } else {
                await crearFuente(
                    datos
                );
            }

            await cargarFuentes();

            setModal(false);
            setEditando(null);
            setFormulario(INICIAL);
            setErrores({});

            await Swal.fire({
                icon: "success",

                title: esEdicion
                    ? "Fuente actualizada"
                    : "Fuente registrada",

                text: esEdicion
                    ? "Los cambios se guardaron correctamente."
                    : "La fuente se registró correctamente.",

                timer: 1800,

                timerProgressBar: true,

                showConfirmButton: false,

                customClass: {
                    popup: "flora-alert"
                }
            });

        } catch (error) {

            if (
                aplicarErroresBackend(
                    error
                )
            ) {
                await Swal.fire({
                    icon: "warning",

                    title: "Revisa los datos",

                    text:
                        "Hay campos que deben corregirse antes de continuar.",

                    confirmButtonText:
                        "Entendido",

                    buttonsStyling: false,

                    customClass: {
                        popup:
                            "flora-alert",

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
                    .includes("ya existe") ||
                mensaje
                    .toLowerCase()
                    .includes("duplic")
            ) {
                setErrores(actuales => ({
                    ...actuales,
                    titulo: mensaje
                }));

                await Swal.fire({
                    icon: "warning",

                    title:
                        "Fuente duplicada",

                    text: mensaje,

                    confirmButtonText:
                        "Entendido",

                    buttonsStyling: false,

                    customClass: {
                        popup:
                            "flora-alert",

                        confirmButton:
                            "flora-alert-confirm"
                    }
                });

                return;
            }

            await Swal.fire({
                icon: "error",

                title: esEdicion
                    ? "No se pudo actualizar"
                    : "No se pudo registrar",

                text: mensaje,

                confirmButtonText:
                    "Entendido",

                buttonsStyling: false,

                customClass: {
                    popup:
                        "flora-alert",

                    confirmButton:
                        "flora-alert-confirm"
                }
            });

        } finally {
            setGuardando(false);
        }
    }

    async function desactivar(fuente) {
        if (procesando !== null) {
            return;
        }

        if (!fuente?.idFuente) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo desactivar",
                text:
                    "No se encontró el identificador de la fuente.",
                confirmButtonText:
                    "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });

            return;
        }

        const resultado =
            await Swal.fire({
                icon: "warning",

                title: "¿Desactivar fuente?",

                text:
                    `"${fuente.titulo}" dejará de estar disponible como fuente activa.`,

                showCancelButton: true,

                confirmButtonText:
                    "Sí, desactivar",

                cancelButtonText:
                    "Cancelar",

                reverseButtons: true,

                buttonsStyling: false,

                customClass: {
                    popup:
                        "flora-alert",

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
            setProcesando(
                fuente.idFuente
            );

            await desactivarFuente(
                fuente.idFuente
            );

            await cargarFuentes();

            await Swal.fire({
                icon: "success",

                title:
                    "Fuente desactivada",

                text:
                    `${fuente.titulo} fue dada de baja correctamente.`,

                timer: 1700,

                timerProgressBar: true,

                showConfirmButton: false,

                customClass: {
                    popup: "flora-alert"
                }
            });

        } catch (error) {

            await Swal.fire({
                icon: "error",

                title:
                    "No se pudo desactivar",

                text:
                    obtenerMensaje(error),

                confirmButtonText:
                    "Entendido",

                buttonsStyling: false,

                customClass: {
                    popup:
                        "flora-alert",

                    confirmButton:
                        "flora-alert-confirm"
                }
            });

        } finally {
            setProcesando(null);
        }
    }

    const filtradas =
        useMemo(() => {

            const consulta =
                normalizarComparacion(
                    busqueda
                );

            return fuentes.filter(
                fuente => {

                    const texto =
                        normalizarComparacion(
                            [
                                fuente?.titulo,
                                fuente?.autor,
                                fuente?.anio,
                                nombreTipo(
                                    fuente?.tipoFuente
                                ),
                                fuente
                                    ?.referenciaBibliografica,
                                fuente?.url
                            ]
                                .filter(Boolean)
                                .join(" ")
                        );

                    const coincideBusqueda =
                        texto.includes(
                            consulta
                        );

                    const coincideEstado =
                        estado === "TODOS" ||
                        (
                            estado === "ACTIVAS" &&
                            estaActiva(fuente)
                        ) ||
                        (
                            estado === "INACTIVAS" &&
                            !estaActiva(fuente)
                        );

                    return (
                        coincideBusqueda &&
                        coincideEstado
                    );
                }
            );

        }, [
            fuentes,
            busqueda,
            estado
        ]);

    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                filtradas.length /
                POR_PAGINA
            )
        );

    const paginaActual =
        Math.min(
            pagina,
            totalPaginas
        );

    const visibles =
        filtradas.slice(
            (
                paginaActual - 1
            ) * POR_PAGINA,
            paginaActual *
            POR_PAGINA
        );

    const activas =
        fuentes.filter(
            estaActiva
        ).length;

    const inactivas =
        fuentes.length - activas;

    const tiposRegistrados =
        new Set(
            fuentes
                .map(
                    fuente =>
                        fuente.tipoFuente
                )
                .filter(Boolean)
        ).size;

    const estadisticas = [
        {
            clave: "total",
            etiqueta:
                "Fuentes registradas",
            valor: fuentes.length,
            icono: BookMarked,
            filtro: "TODOS"
        },
        {
            clave: "ok",
            etiqueta: "Activas",
            valor: activas,
            icono: CircleCheck,
            filtro: "ACTIVAS"
        },
        {
            clave: "off",
            etiqueta: "Inactivas",
            valor: inactivas,
            icono: CircleOff,
            filtro: "INACTIVAS"
        },
        {
            clave: "cat",
            etiqueta: "Tipos en uso",
            valor: tiposRegistrados,
            icono: BookOpen
        }
    ];

    function campoFormulario(
        nombre,
        etiqueta,
        opciones = {}
    ) {
        const {
            requerido = false,
            maxLength,
            tipo = "text",
            placeholder = ""
        } = opciones;

        const error =
            errores[nombre];

        return (
            <div
                className={`nt-field ${error
                        ? "has-error"
                        : ""
                    }`}
            >

                <label
                    htmlFor={`fuente-${nombre}`}
                >
                    {etiqueta}

                    {requerido && (
                        <span> *</span>
                    )}
                </label>

                <input
                    id={`fuente-${nombre}`}
                    name={nombre}
                    type={tipo}
                    value={
                        formulario[nombre]
                    }
                    onChange={
                        cambiarCampo
                    }
                    onBlur={() => {
                        if (
                            nombre === "titulo" ||
                            nombre === "autor"
                        ) {
                            normalizarCampo(
                                nombre
                            );
                        }
                    }}
                    maxLength={
                        maxLength
                    }
                    placeholder={
                        placeholder
                    }
                    aria-invalid={
                        Boolean(error)
                    }
                    autoComplete="off"
                />

                <div className="nt-field-foot">

                    <small className="nt-err">
                        {error || ""}
                    </small>

                    {maxLength && (
                        <small>
                            {
                                formulario[
                                    nombre
                                ].length
                            }/{maxLength}
                        </small>
                    )}

                </div>

            </div>
        );
    }

    return (
        <div className="nt-page">

            {/* ENCABEZADO */}

            <div className="nt-head">

                <div>

                    <span className="nt-crumb">
                        Catálogos
                        <i>/</i>
                        Fuentes
                    </span>

                    <h1>
                        Fuentes
                    </h1>

                    <p>
                        Administra las referencias
                        bibliográficas y de conocimiento
                        del catálogo botánico.
                    </p>

                </div>

                <button
                    type="button"
                    className="nt-btn nt-btn-primary nt-btn-lg"
                    onClick={abrirNueva}
                >
                    <Plus size={18} />
                    Nueva fuente
                </button>

            </div>

            {/* ESTADÍSTICAS */}

            <div className="nt-stats">

                {estadisticas.map(
                    estadistica => {

                        const Icono =
                            estadistica.icono;

                        const Tag =
                            estadistica.filtro
                                ? "button"
                                : "div";

                        return (
                            <Tag
                                key={
                                    estadistica.clave
                                }
                                className={
                                    `nt-stat nt-stat-${estadistica.clave}`
                                }
                                {...(
                                    estadistica.filtro
                                        ? {
                                            type:
                                                "button",

                                            onClick:
                                                () =>
                                                    cambiarEstado(
                                                        estadistica
                                                            .filtro
                                                    ),

                                            "aria-pressed":
                                                estado ===
                                                estadistica
                                                    .filtro
                                        }
                                        : {}
                                )}
                            >

                                <span className="nt-stat-icon">
                                    <Icono size={20} />
                                </span>

                                <span className="nt-stat-text">

                                    <strong>
                                        {
                                            estadistica
                                                .valor
                                        }
                                    </strong>

                                    <span>
                                        {
                                            estadistica
                                                .etiqueta
                                        }
                                    </span>

                                </span>

                            </Tag>
                        );
                    }
                )}

            </div>

            {/* PANEL */}

            <div className="nt-card">

                {/* TOOLBAR */}

                <div className="nt-toolbar">

                    <label className="nt-search">

                        <Search size={17} />

                        <input
                            value={busqueda}
                            onChange={evento =>
                                cambiarBusqueda(
                                    evento.target.value
                                )
                            }
                            placeholder="Buscar título, autor, tipo o referencia..."
                            aria-label="Buscar fuentes"
                        />

                        {busqueda && (
                            <button
                                type="button"
                                className="nt-clear"
                                onClick={() =>
                                    cambiarBusqueda("")
                                }
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <div
                        className="nt-seg"
                        role="group"
                        aria-label="Filtrar por estado"
                    >

                        {[
                            [
                                "TODOS",
                                "Todas"
                            ],
                            [
                                "ACTIVAS",
                                "Activas"
                            ],
                            [
                                "INACTIVAS",
                                "Inactivas"
                            ]
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
                                        cambiarEstado(
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
                        className="nt-iconbtn nt-refresh"
                        onClick={cargarFuentes}
                        disabled={cargando}
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

                {/* TABLA */}

                <div className="nt-table-wrap">

                    <table className="nt-table">

                        <thead>
                            <tr>
                                <th>
                                    Fuente
                                </th>

                                <th>
                                    Tipo
                                </th>

                                <th className="nt-col-desc">
                                    Referencia
                                </th>

                                <th>
                                    Estado
                                </th>

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

                                            <span>
                                                Cargando fuentes...
                                            </span>

                                        </div>

                                    </td>
                                </tr>

                            ) : visibles.length === 0 ? (
                                <tr>
                                    <td colSpan="5">

                                        <div className="nt-state nt-empty">

                                            <BookOpen size={30} />

                                            <strong>
                                                No hay fuentes
                                            </strong>

                                            <span>
                                                No se encontraron fuentes con los filtros seleccionados.
                                            </span>

                                            {!busqueda &&
                                                estado === "TODOS" && (
                                                    <button
                                                        type="button"
                                                        className="nt-btn nt-btn-primary"
                                                        onClick={abrirNueva}
                                                    >
                                                        <Plus size={16} />
                                                        Registrar una fuente
                                                    </button>
                                                )}

                                        </div>

                                    </td>
                                </tr>

                            ) : (
                                visibles.map(
                                    fuente => {

                                        const activa =
                                            estaActiva(
                                                fuente
                                            );

                                        const accionando =
                                            procesando ===
                                            fuente.idFuente;

                                        return (
                                            <tr
                                                key={
                                                    fuente
                                                        .idFuente
                                                }
                                                className={
                                                    activa
                                                        ? ""
                                                        : "is-off"
                                                }
                                            >

                                                <td>

                                                    <div className="nt-name">

                                                        <span className="nt-avatar">
                                                            <BookOpen size={18} />
                                                        </span>

                                                        <span>

                                                            <strong>
                                                                {
                                                                    fuente
                                                                        .titulo
                                                                }
                                                            </strong>

                                                            <small>

                                                                {
                                                                    fuente
                                                                        .autor ||
                                                                    "Autor no especificado"
                                                                }

                                                                {
                                                                    fuente
                                                                        .anio
                                                                        ? ` · ${fuente.anio}`
                                                                        : ""
                                                                }

                                                            </small>

                                                        </span>

                                                    </div>

                                                </td>

                                                <td>

                                                    <span className="nt-cat">
                                                        {
                                                            nombreTipo(
                                                                fuente
                                                                    .tipoFuente
                                                            )
                                                        }
                                                    </span>

                                                </td>

                                                <td className="nt-col-desc">

                                                    {fuente.url &&
                                                        /^https?:\/\//i.test(
                                                            fuente.url
                                                        ) ? (
                                                        <a
                                                            className="nt-desc"
                                                            href={
                                                                fuente
                                                                    .url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title={
                                                                fuente
                                                                    .url
                                                            }
                                                        >
                                                            {
                                                                fuente
                                                                    .url
                                                            }

                                                            <ExternalLink size={13} />
                                                        </a>

                                                    ) : (
                                                        <span
                                                            className="nt-desc"
                                                            title={
                                                                fuente
                                                                    .referenciaBibliografica ||
                                                                ""
                                                            }
                                                        >
                                                            {
                                                                fuente
                                                                    .referenciaBibliografica ||
                                                                "Sin referencia adicional"
                                                            }
                                                        </span>
                                                    )}

                                                </td>

                                                <td>

                                                    <span
                                                        className={`nt-status ${activa
                                                                ? "active"
                                                                : "inactive"
                                                            }`}
                                                    >
                                                        <i />

                                                        {
                                                            activa
                                                                ? "Activa"
                                                                : "Inactiva"
                                                        }
                                                    </span>

                                                </td>

                                                <td>

                                                    <div className="nt-actions">

                                                        <button
                                                            type="button"
                                                            title="Editar fuente"
                                                            aria-label={
                                                                `Editar ${fuente.titulo}`
                                                            }
                                                            disabled={
                                                                procesando !== null
                                                            }
                                                            onClick={() =>
                                                                abrirEdicion(
                                                                    fuente
                                                                )
                                                            }
                                                        >
                                                            <Pencil size={16} />
                                                        </button>

                                                        {activa && (
                                                            <button
                                                                type="button"
                                                                className="off"
                                                                title="Desactivar fuente"
                                                                aria-label={
                                                                    `Desactivar ${fuente.titulo}`
                                                                }
                                                                disabled={
                                                                    procesando !== null
                                                                }
                                                                onClick={() =>
                                                                    desactivar(
                                                                        fuente
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
                                                        )}

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

                {/* PAGINACIÓN */}

                <div className="nt-pagination">

                    <span>
                        Mostrando{" "}

                        <strong>
                            {
                                filtradas.length === 0
                                    ? 0
                                    : (paginaActual - 1) *
                                    POR_PAGINA + 1
                            }
                        </strong>

                        {" "}a{" "}

                        <strong>
                            {
                                Math.min(
                                    paginaActual *
                                    POR_PAGINA,
                                    filtradas.length
                                )
                            }
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
                                    actual =>
                                        Math.max(
                                            1,
                                            actual - 1
                                        )
                                )
                            }
                            aria-label="Página anterior"
                        >
                            <ChevronLeft size={17} />
                        </button>

                        <span className="nt-page-current">
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
                                    actual =>
                                        Math.min(
                                            totalPaginas,
                                            actual + 1
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

            {/* MODAL */}

            {modal && (
                <div
                    className="np-overlay"
                    onMouseDown={cerrarModal}
                >

                    <form
                        className="np-panel"
                        onMouseDown={
                            evento =>
                                evento.stopPropagation()
                        }
                        onSubmit={guardar}
                        noValidate
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="fuente-form-title"
                    >

                        {/* CABECERA */}

                        <div className="np-head">

                            <span className="np-head-icon">
                                <BookOpen size={22} />
                            </span>

                            <div className="np-head-text">

                                <span>
                                    {editando
                                        ? "Edición"
                                        : "Nuevo registro"}
                                </span>

                                <h2 id="fuente-form-title">
                                    {editando
                                        ? "Editar fuente"
                                        : "Nueva fuente"}
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="nt-iconbtn"
                                onClick={cerrarModal}
                                disabled={guardando}
                                aria-label="Cerrar formulario"
                            >
                                <X size={18} />
                            </button>

                        </div>

                        {/* CUERPO */}

                        <div className="np-body">

                            {campoFormulario(
                                "titulo",
                                "Título",
                                {
                                    requerido: true,
                                    maxLength:
                                        MAX_TITULO,
                                    placeholder:
                                        "Ej. Flora de El Salvador"
                                }
                            )}

                            {campoFormulario(
                                "autor",
                                "Autor",
                                {
                                    maxLength:
                                        MAX_AUTOR,
                                    placeholder:
                                        "Nombre del autor"
                                }
                            )}

                            {/* TIPO */}

                            <div
                                className={`nt-field ${errores.tipoFuente
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label htmlFor="fuente-tipoFuente">
                                    Tipo de fuente
                                    <span> *</span>
                                </label>

                                <select
                                    id="fuente-tipoFuente"
                                    name="tipoFuente"
                                    value={
                                        formulario
                                            .tipoFuente
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    aria-invalid={
                                        Boolean(
                                            errores
                                                .tipoFuente
                                        )
                                    }
                                >

                                    <option value="">
                                        Selecciona un tipo
                                    </option>

                                    {TIPOS_FUENTE.map(
                                        tipo => (
                                            <option
                                                key={tipo}
                                                value={tipo}
                                            >
                                                {
                                                    nombreTipo(
                                                        tipo
                                                    )
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                                <div className="nt-field-foot">

                                    <small className="nt-err">
                                        {
                                            errores
                                                .tipoFuente ||
                                            ""
                                        }
                                    </small>

                                </div>

                            </div>

                            {/* AÑO */}

                            <div
                                className={`nt-field ${errores.anio
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label htmlFor="fuente-anio">
                                    Año de publicación
                                </label>

                                <input
                                    id="fuente-anio"
                                    name="anio"
                                    type="number"
                                    value={
                                        formulario.anio
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    min="1000"
                                    max={
                                        ANIO_ACTUAL
                                    }
                                    step="1"
                                    placeholder={
                                        String(
                                            ANIO_ACTUAL
                                        )
                                    }
                                    aria-invalid={
                                        Boolean(
                                            errores.anio
                                        )
                                    }
                                />

                                <div className="nt-field-foot">

                                    <small className="nt-err">
                                        {
                                            errores.anio ||
                                            ""
                                        }
                                    </small>

                                    <small>
                                        Máx. {ANIO_ACTUAL}
                                    </small>

                                </div>

                            </div>

                            {/* URL */}

                            <div
                                className={`nt-field ${errores.url
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label htmlFor="fuente-url">

                                    URL

                                    {formulario.tipoFuente ===
                                        "SITIO_WEB" && (
                                            <span> *</span>
                                        )}

                                </label>

                                <input
                                    id="fuente-url"
                                    name="url"
                                    type="url"
                                    value={
                                        formulario.url
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    maxLength={
                                        MAX_URL
                                    }
                                    placeholder="https://ejemplo.org"
                                    autoComplete="off"
                                    aria-invalid={
                                        Boolean(
                                            errores.url
                                        )
                                    }
                                />

                                <div className="nt-field-foot">

                                    <small className="nt-err">
                                        {
                                            errores.url ||
                                            ""
                                        }
                                    </small>

                                    <small>
                                        {
                                            formulario
                                                .url
                                                .length
                                        }/{MAX_URL}
                                    </small>

                                </div>

                            </div>

                            {/* REFERENCIA */}

                            <div
                                className={`nt-field ${errores
                                        .referenciaBibliografica
                                        ? "has-error"
                                        : ""
                                    }`}
                            >

                                <label htmlFor="fuente-referenciaBibliografica">
                                    Referencia bibliográfica
                                </label>

                                <textarea
                                    id="fuente-referenciaBibliografica"
                                    name="referenciaBibliografica"
                                    value={
                                        formulario
                                            .referenciaBibliografica
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    onBlur={() =>
                                        normalizarCampo(
                                            "referenciaBibliografica"
                                        )
                                    }
                                    rows="3"
                                    placeholder="Editorial, volumen, páginas u otros datos de referencia..."
                                    aria-invalid={
                                        Boolean(
                                            errores
                                                .referenciaBibliografica
                                        )
                                    }
                                />

                                <div className="nt-field-foot">

                                    <small className="nt-err">
                                        {
                                            errores
                                                .referenciaBibliografica ||
                                            ""
                                        }
                                    </small>

                                    <small>
                                        {
                                            formulario
                                                .referenciaBibliografica
                                                .length
                                        } caracteres
                                    </small>

                                </div>

                            </div>

                            {/* INFORMACIÓN */}

                            <div className="np-backend-info">

                                <BookMarked size={18} />

                                <div>

                                    <strong>
                                        Información de la fuente
                                    </strong>

                                    <span>
                                        Las fuentes web requieren una URL válida. El título y el tipo de fuente son obligatorios. Al desactivar una fuente, el registro se conserva en el historial.
                                    </span>

                                </div>

                            </div>

                        </div>

                        {/* FOOTER */}

                        <div className="np-foot">

                            <button
                                type="button"
                                className="nt-btn nt-btn-ghost"
                                onClick={cerrarModal}
                                disabled={guardando}
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                className="nt-btn nt-btn-primary"
                                disabled={guardando}
                            >

                                {guardando && (
                                    <RefreshCw
                                        size={16}
                                        className="girando"
                                    />
                                )}

                                {guardando
                                    ? "Guardando..."
                                    : editando
                                        ? "Guardar cambios"
                                        : "Registrar fuente"}

                            </button>

                        </div>

                    </form>

                </div>
            )}

        </div>
    );
}

export default Fuentes;