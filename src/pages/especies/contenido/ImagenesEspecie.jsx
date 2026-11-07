import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Edit3,
    ExternalLink,
    Eye,
    Image,
    ImagePlus,
    Leaf,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Star,
    Trash2,
    X
} from "lucide-react";
import ComboBuscable from "../../../components/ComboBuscable";
import { API_URL } from "../../../config";
import {
    listarImagenes,
    listarPartesImagen,
    crearImagen,
    actualizarImagen,
    desactivarImagen,
    activarImagen,
    marcarImagenPrincipal
} from "../../../api/imagenEspecieService";
import "../../../styles/imagenEspecie.css";
import "../../../styles/alertas.css";

const TIPOS = [
    ["PLANTA_COMPLETA", "Planta completa"],
    ["HOJA", "Hoja"],
    ["FLOR", "Flor"],
    ["FRUTO", "Fruto"],
    ["SEMILLA", "Semilla"],
    ["RAIZ", "Raíz"],
    ["TALLO", "Tallo"],
    ["CORTEZA", "Corteza"],
    ["PARTE_COMESTIBLE", "Parte comestible"],
    ["OTRA", "Otra"]
];

const FORMULARIO_VACIO = {
    idEspecieParte: "",
    tipoImagen: "PLANTA_COMPLETA",
    urlImagen: "",
    titulo: "",
    descripcion: "",
    textoAlternativo: "",
    creditos: "",
    esPrincipal: false
};

function nombreComunPrincipal(especie) {
    if (especie?.nombreComun) {
        return especie.nombreComun;
    }

    const nombres = Array.isArray(especie?.nombresComunes)
        ? especie.nombresComunes
        : [];

    const principal = nombres.find(
        nombre =>
            (
                nombre?.esPrincipal === true ||
                nombre?.principal === true
            ) &&
            nombre?.activo !== false
    );

    return principal?.nombre ||
        nombres[0]?.nombre ||
        "Sin nombre común";
}

function mensajeError(error) {
    const data = error?.response?.data;
    const validacion = data?.erroresValidacion;

    if (Array.isArray(validacion) && validacion.length) {
        return validacion.join(". ");
    }

    if (
        validacion &&
        typeof validacion === "object"
    ) {
        return Object.values(validacion)
            .flat()
            .join(". ");
    }

    if (typeof data === "string" && data) {
        return data;
    }

    if (
        data?.mensaje ||
        data?.message ||
        data?.error
    ) {
        return data.mensaje ||
            data.message ||
            data.error;
    }

    if (!error?.response) {
        return "No se pudo conectar con el servidor.";
    }

    const codigo = error.response.status;

    return {
        400: "Revisa los datos enviados.",
        404: "La imagen, especie o parte ya no existe.",
        409: "La operación entra en conflicto con el estado actual."
    }[codigo] ||
        "No se pudo completar la operación.";
}

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function urlValida(valor) {
    try {
        const url = new URL(valor);
        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    } catch {
        return false;
    }
}

function etiquetaTipo(valor) {
    return TIPOS.find(
        ([tipo]) => tipo === valor
    )?.[1] ||
        String(valor ?? "")
            .replaceAll("_", " ");
}

function VistaImagen({
    imagen,
    nombre,
    className = ""
}) {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [imagen?.urlImagen]);

    if (
        !imagen?.urlImagen ||
        error
    ) {
        return (
            <div className={`ime-image-fallback ${className}`}>
                <Image size={30} />
                <span>
                    Imagen no disponible
                </span>
            </div>
        );
    }

    return (
        <img
            className={className}
            src={imagen.urlImagen}
            alt={
                imagen.textoAlternativo ||
                imagen.titulo ||
                nombre ||
                "Imagen de especie"
            }
            loading="lazy"
            onError={() =>
                setError(true)
            }
        />
    );
}

export default function ImagenesEspecie() {
    const { idEspecie } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [especie, setEspecie] = useState(
        location.state?.especie || null
    );

    const [imagenes, setImagenes] = useState([]);
    const [partes, setPartes] = useState([]);
    const [seleccionada, setSeleccionada] = useState(null);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [formularioAbierto, setFormularioAbierto] = useState(false);
    const [edicion, setEdicion] = useState(null);
    const [form, setForm] = useState({ ...FORMULARIO_VACIO });

    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todas");
    const [filtroTipo, setFiltroTipo] = useState("");

    const mostrarAlerta = useCallback(
        (
            icon,
            title,
            text
        ) => {
            return Swal.fire({
                icon,
                title,
                text,
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                }
            });
        },
        []
    );

    const cargarDatos = useCallback(async () => {
        if (!idEspecie) {
            return;
        }

        try {
            setCargando(true);

            const [
                resultadoImagenes,
                resultadoPartes,
                resultadoEspecie
            ] = await Promise.allSettled([
                listarImagenes(
                    idEspecie,
                    false
                ),
                listarPartesImagen(
                    idEspecie
                ),
                axios.get(
                    `${API_URL}/api/especies/${idEspecie}`
                )
            ]);

            if (
                resultadoImagenes.status ===
                "rejected"
            ) {
                throw resultadoImagenes.reason;
            }

            const lista =
                Array.isArray(
                    resultadoImagenes.value
                )
                    ? resultadoImagenes.value
                    : [];

            setImagenes(lista);

            setPartes(
                resultadoPartes.status ===
                    "fulfilled" &&
                    Array.isArray(
                        resultadoPartes.value
                    )
                    ? resultadoPartes.value
                    : []
            );

            if (
                resultadoEspecie.status ===
                "fulfilled"
            ) {
                const datos =
                    resultadoEspecie.value.data;

                setEspecie({
                    idEspecie:
                        datos.idEspecie,
                    nombreComun:
                        nombreComunPrincipal(
                            datos
                        ),
                    nombreCientifico:
                        datos.nombreCientifico,
                    familia:
                        datos?.taxonomia?.familia ||
                        null,
                    genero:
                        datos?.taxonomia?.genero ||
                        null,
                    activa:
                        datos.activa
                });
            }

            setSeleccionada(actual => {
                const misma =
                    lista.find(
                        imagen =>
                            Number(
                                imagen.idImagen
                            ) ===
                            Number(
                                actual?.idImagen
                            )
                    );

                if (misma) {
                    return misma;
                }

                return lista.find(
                    imagen =>
                        imagen.activa !== false &&
                        imagen.esPrincipal === true
                ) ||
                    lista.find(
                        imagen =>
                            imagen.activa !== false
                    ) ||
                    lista[0] ||
                    null;
            });
        } catch (error) {
            await mostrarAlerta(
                "error",
                "No se pudieron cargar las imágenes",
                mensajeError(error)
            );
        } finally {
            setCargando(false);
        }
    }, [
        idEspecie,
        mostrarAlerta
    ]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const activas = useMemo(
        () => imagenes.filter(
            imagen => imagen.activa !== false
        ).length,
        [imagenes]
    );

    const inactivas = useMemo(
        () => imagenes.filter(
            imagen => imagen.activa === false
        ).length,
        [imagenes]
    );

    const principal = useMemo(
        () => imagenes.find(
            imagen =>
                imagen.activa !== false &&
                imagen.esPrincipal === true
        ) || null,
        [imagenes]
    );

    const imagenesFiltradas = useMemo(() => {
        const texto =
            normalizar(busqueda);

        return imagenes.filter(imagen => {
            const coincideEstado =
                filtroEstado === "todas" ||
                (
                    filtroEstado === "activas" &&
                    imagen.activa !== false
                ) ||
                (
                    filtroEstado === "inactivas" &&
                    imagen.activa === false
                );

            const coincideTipo =
                !filtroTipo ||
                imagen.tipoImagen ===
                filtroTipo;

            const contenido =
                normalizar(
                    `${imagen.titulo || ""} ` +
                    `${imagen.descripcion || ""} ` +
                    `${imagen.textoAlternativo || ""} ` +
                    `${imagen.creditos || ""} ` +
                    `${etiquetaTipo(imagen.tipoImagen)}`
                );

            return coincideEstado &&
                coincideTipo &&
                (
                    !texto ||
                    contenido.includes(texto)
                );
        });
    }, [
        imagenes,
        filtroEstado,
        filtroTipo,
        busqueda
    ]);

    useEffect(() => {
        if (imagenesFiltradas.length === 0) {
            setSeleccionada(null);
            return;
        }

        const visible =
            imagenesFiltradas.some(
                imagen =>
                    Number(
                        imagen.idImagen
                    ) ===
                    Number(
                        seleccionada?.idImagen
                    )
            );

        if (!visible) {
            const principalVisible =
                imagenesFiltradas.find(
                    imagen =>
                        imagen.activa !== false &&
                        imagen.esPrincipal
                );

            setSeleccionada(
                principalVisible ||
                imagenesFiltradas[0]
            );
        }
    }, [
        imagenesFiltradas,
        seleccionada?.idImagen
    ]);

    function obtenerNombreParte(idEspecieParte) {
        if (!idEspecieParte) {
            return null;
        }

        const parte =
            partes.find(
                item =>
                    Number(
                        item.idEspecieParte
                    ) ===
                    Number(
                        idEspecieParte
                    )
            );

        return parte?.nombreParte ||
            parte?.partePlanta?.nombre ||
            parte?.partePlanta?.nombreParte ||
            "Parte comestible";
    }

    function nuevo() {
        if (especie?.activa === false) {
            mostrarAlerta(
                "warning",
                "Especie inactiva",
                "No puedes registrar imágenes nuevas mientras la especie esté inactiva."
            );

            return;
        }

        setEdicion(null);
        setForm({
            ...FORMULARIO_VACIO
        });
        setFormularioAbierto(true);
    }

    function editar(imagen) {
        setEdicion(imagen);

        setForm({
            idEspecieParte:
                imagen.idEspecieParte
                    ? String(
                        imagen.idEspecieParte
                    )
                    : "",
            tipoImagen:
                imagen.tipoImagen ||
                "PLANTA_COMPLETA",
            urlImagen:
                imagen.urlImagen ||
                "",
            titulo:
                imagen.titulo ||
                "",
            descripcion:
                imagen.descripcion ||
                "",
            textoAlternativo:
                imagen.textoAlternativo ||
                "",
            creditos:
                imagen.creditos ||
                "",
            esPrincipal:
                Boolean(
                    imagen.esPrincipal
                )
        });

        setFormularioAbierto(true);
    }

    function cerrarFormulario() {
        if (guardando) {
            return;
        }

        setFormularioAbierto(false);
        setEdicion(null);
        setForm({
            ...FORMULARIO_VACIO
        });
    }

    function cambiarCampo(evento) {
        const {
            name,
            value,
            type,
            checked
        } = evento.target;

        setForm(actual => ({
            ...actual,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    }

    function validarFormulario(datos) {
        if (
            !TIPOS.some(
                ([valor]) =>
                    valor === datos.tipoImagen
            )
        ) {
            return "Selecciona un tipo de imagen válido.";
        }

        if (
            !datos.urlImagen ||
            datos.urlImagen.length > 1000 ||
            !urlValida(
                datos.urlImagen
            )
        ) {
            return "Ingresa una URL HTTP(S) válida de hasta 1000 caracteres.";
        }

        if (
            !datos.textoAlternativo ||
            datos.textoAlternativo.length > 300
        ) {
            return "El texto alternativo es obligatorio y admite hasta 300 caracteres.";
        }

        if (datos.titulo?.length > 200) {
            return "El título admite hasta 200 caracteres.";
        }

        if (datos.creditos?.length > 250) {
            return "Los créditos admiten hasta 250 caracteres.";
        }

        return null;
    }

    async function guardar(evento) {
        evento.preventDefault();

        if (guardando) {
            return;
        }

        const datos = {
            tipoImagen:
                form.tipoImagen,
            urlImagen:
                form.urlImagen.trim(),
            titulo:
                form.titulo.trim() ||
                null,
            descripcion:
                form.descripcion.trim() ||
                null,
            textoAlternativo:
                form.textoAlternativo.trim(),
            creditos:
                form.creditos.trim() ||
                null,
            idEspecieParte:
                form.idEspecieParte
                    ? Number(
                        form.idEspecieParte
                    )
                    : null,
            esPrincipal:
                Boolean(
                    form.esPrincipal
                )
        };

        const error =
            validarFormulario(
                datos
            );

        if (error) {
            await mostrarAlerta(
                "warning",
                "Revisa la imagen",
                error
            );

            return;
        }

        try {
            setGuardando(true);

            const guardada =
                edicion
                    ? await actualizarImagen(
                        edicion.idImagen,
                        datos
                    )
                    : await crearImagen(
                        idEspecie,
                        datos
                    );

            setFormularioAbierto(false);
            setEdicion(null);
            setForm({
                ...FORMULARIO_VACIO
            });

            await cargarDatos();

            if (guardada) {
                setSeleccionada(
                    guardada
                );
            }

            await Swal.fire({
                icon: "success",
                title: edicion
                    ? "Imagen actualizada"
                    : "Imagen registrada",
                text: edicion
                    ? "Los cambios se guardaron correctamente."
                    : "La imagen fue agregada correctamente a la especie.",
                timer: 1700,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarAlerta(
                "error",
                "No se pudo guardar la imagen",
                mensajeError(error)
            );
        } finally {
            setGuardando(false);
        }
    }

    async function desactivar(imagen) {
        const resultado =
            await Swal.fire({
                icon: "warning",
                title: "¿Desactivar imagen?",
                text: imagen.esPrincipal
                    ? "La imagen dejará de estar activa y también perderá su condición de principal."
                    : "La imagen dejará de mostrarse como activa.",
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
            setGuardando(true);

            await desactivarImagen(
                imagen.idImagen
            );

            await cargarDatos();

            await Swal.fire({
                icon: "success",
                title: "Imagen desactivada",
                timer: 1400,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarAlerta(
                "error",
                "No se pudo desactivar la imagen",
                mensajeError(error)
            );
        } finally {
            setGuardando(false);
        }
    }

    async function activar(imagen) {
        const resultado =
            await Swal.fire({
                icon: "question",
                title: "¿Reactivar imagen?",
                text: "La imagen volverá a estar disponible.",
                showCancelButton: true,
                confirmButtonText:
                    "Sí, reactivar",
                cancelButtonText:
                    "Cancelar",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup:
                        "flora-alert",
                    confirmButton:
                        "flora-alert-confirm",
                    cancelButton:
                        "flora-alert-cancel"
                }
            });

        if (!resultado.isConfirmed) {
            return;
        }

        try {
            setGuardando(true);

            await activarImagen(
                imagen.idImagen
            );

            await cargarDatos();

            await Swal.fire({
                icon: "success",
                title: "Imagen reactivada",
                timer: 1400,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarAlerta(
                "error",
                "No se pudo reactivar la imagen",
                mensajeError(error)
            );
        } finally {
            setGuardando(false);
        }
    }

    async function marcarPrincipal(imagen) {
        const resultado =
            await Swal.fire({
                icon: "question",
                title: "¿Usar como imagen principal?",
                text: `"${imagen.titulo || "La imagen seleccionada"}" será la imagen principal de la especie.`,
                showCancelButton: true,
                confirmButtonText:
                    "Sí, usar como principal",
                cancelButtonText:
                    "Cancelar",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup:
                        "flora-alert",
                    confirmButton:
                        "flora-alert-confirm",
                    cancelButton:
                        "flora-alert-cancel"
                }
            });

        if (!resultado.isConfirmed) {
            return;
        }

        try {
            setGuardando(true);

            await marcarImagenPrincipal(
                imagen.idImagen
            );

            await cargarDatos();

            await Swal.fire({
                icon: "success",
                title: "Imagen principal actualizada",
                text: "La imagen seleccionada ahora representa a la especie.",
                timer: 1600,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarAlerta(
                "error",
                "No se pudo marcar como principal",
                mensajeError(error)
            );
        } finally {
            setGuardando(false);
        }
    }

    function volverSeleccion() {
        navigate(
            "/gestion-especies",
            {
                state: {
                    abrirContenido:
                        "imagenes",
                    categoria:
                        "documentacion"
                }
            }
        );
    }

    return (
        <div className="ime-page">

            <header className="ime-page-header">

                <div>
                    <span className="ime-eyebrow">
                        CONTENIDO · DOCUMENTACIÓN
                    </span>

                    <h1>
                        Imágenes de especie
                    </h1>

                    <p>
                        Administra las imágenes que ilustran y documentan la especie seleccionada.
                    </p>
                </div>

                <div className="ime-header-actions">

                    <button
                        type="button"
                        className="ime-btn-secondary"
                        onClick={
                            volverSeleccion
                        }
                    >
                        <ArrowLeft size={16} />
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="ime-btn-primary"
                        onClick={nuevo}
                        disabled={
                            cargando ||
                            especie?.activa === false
                        }
                    >
                        <Plus size={16} />
                        Agregar imagen
                    </button>

                </div>

            </header>

            <section className="ime-species-card">

                <span className="ime-species-icon">
                    <Leaf size={21} />
                </span>

                <div className="ime-species-info">

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

                {especie?.familia && (
                    <span className="ime-species-family">
                        Familia:
                        <strong>
                            {especie.familia}
                        </strong>
                    </span>
                )}

            </section>

            <section className="ime-summary">

                <div className="ime-summary-card total">

                    <span className="ime-summary-icon">
                        <Image size={21} />
                    </span>

                    <div>
                        <small>
                            Imágenes registradas
                        </small>

                        <strong>
                            {imagenes.length}
                        </strong>

                        <span>
                            Total de recursos
                        </span>
                    </div>

                </div>

                <div className="ime-summary-card active">

                    <span className="ime-summary-icon">
                        <CheckCircle2 size={21} />
                    </span>

                    <div>
                        <small>
                            Imágenes activas
                        </small>

                        <strong>
                            {activas}
                        </strong>

                        <span>
                            Disponibles actualmente
                        </span>
                    </div>

                </div>

                <div className="ime-summary-card principal">

                    <span className="ime-summary-icon">
                        <Star size={21} />
                    </span>

                    <div>
                        <small>
                            Imagen principal
                        </small>

                        <strong className="ime-summary-text">
                            {principal
                                ? "Definida"
                                : "Sin definir"
                            }
                        </strong>

                        <span>
                            Portada de la especie
                        </span>
                    </div>

                </div>

            </section>

            <section className="ime-toolbar">

                <label className="ime-search">

                    <Search size={17} />

                    <input
                        type="text"
                        value={busqueda}
                        onChange={evento =>
                            setBusqueda(
                                evento.target.value
                            )
                        }
                        placeholder="Buscar por título, descripción o créditos..."
                    />

                </label>

                <select
                    className="ime-type-filter"
                    value={filtroTipo}
                    onChange={evento =>
                        setFiltroTipo(
                            evento.target.value
                        )
                    }
                >
                    <option value="">
                        Todos los tipos
                    </option>

                    {TIPOS.map(
                        ([valor, texto]) => (
                            <option
                                key={valor}
                                value={valor}
                            >
                                {texto}
                            </option>
                        )
                    )}
                </select>

                <div className="ime-filters">

                    <button
                        type="button"
                        className={
                            filtroEstado === "todas"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFiltroEstado(
                                "todas"
                            )
                        }
                    >
                        Todas
                        <span>
                            {imagenes.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            filtroEstado === "activas"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFiltroEstado(
                                "activas"
                            )
                        }
                    >
                        Activas
                        <span>
                            {activas}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            filtroEstado === "inactivas"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFiltroEstado(
                                "inactivas"
                            )
                        }
                    >
                        Inactivas
                        <span>
                            {inactivas}
                        </span>
                    </button>

                </div>

                <button
                    type="button"
                    className="ime-refresh"
                    onClick={cargarDatos}
                    disabled={cargando}
                >
                    <RefreshCw
                        size={16}
                        className={
                            cargando
                                ? "ime-spin"
                                : ""
                        }
                    />
                    Actualizar
                </button>

            </section>

            {cargando ? (
                <section className="ime-empty-state">

                    <RefreshCw
                        size={31}
                        className="ime-spin"
                    />

                    <h3>
                        Cargando imágenes
                    </h3>

                    <p>
                        Consultando los recursos gráficos de la especie.
                    </p>

                </section>
            ) : imagenes.length === 0 ? (
                <section className="ime-empty-state">

                    <ImagePlus size={42} />

                    <h3>
                        No hay imágenes registradas
                    </h3>

                    <p>
                        Esta especie todavía no cuenta con imágenes asociadas.
                    </p>

                    {especie?.activa !== false && (
                        <button
                            type="button"
                            className="ime-btn-primary"
                            onClick={nuevo}
                        >
                            <Plus size={16} />
                            Registrar primera imagen
                        </button>
                    )}

                </section>
            ) : imagenesFiltradas.length === 0 ? (
                <section className="ime-empty-state">

                    <Search size={35} />

                    <h3>
                        Sin resultados
                    </h3>

                    <p>
                        No encontramos imágenes que coincidan con los filtros seleccionados.
                    </p>

                </section>
            ) : (
                <section className="ime-content">

                    <div className="ime-preview-panel">

                        <div className="ime-preview-frame">

                            <VistaImagen
                                imagen={
                                    seleccionada
                                }
                                nombre={
                                    especie?.nombreCientifico
                                }
                            />

                            {seleccionada?.esPrincipal && (
                                <span className="ime-main-badge">
                                    <Star size={13} />
                                    Principal
                                </span>
                            )}

                        </div>

                        <div className="ime-preview-meta">

                            <div className="ime-preview-heading">

                                <div>
                                    <small>
                                        IMAGEN SELECCIONADA
                                    </small>

                                    <h2>
                                        {seleccionada?.titulo ||
                                            etiquetaTipo(
                                                seleccionada?.tipoImagen
                                            )
                                        }
                                    </h2>
                                </div>

                                {seleccionada && (
                                    <span
                                        className={`ime-status ${seleccionada.activa !== false
                                                ? "active"
                                                : "inactive"
                                            }`}
                                    >
                                        {seleccionada.activa !== false
                                            ? "Activa"
                                            : "Inactiva"
                                        }
                                    </span>
                                )}

                            </div>

                            {seleccionada && (
                                <>
                                    <div className="ime-preview-tags">

                                        <span>
                                            <Image size={13} />
                                            {etiquetaTipo(
                                                seleccionada.tipoImagen
                                            )}
                                        </span>

                                        {seleccionada.idEspecieParte && (
                                            <span>
                                                <Leaf size={13} />
                                                {obtenerNombreParte(
                                                    seleccionada.idEspecieParte
                                                )}
                                            </span>
                                        )}

                                    </div>

                                    <p>
                                        {seleccionada.descripcion ||
                                            seleccionada.textoAlternativo ||
                                            "Sin descripción adicional."
                                        }
                                    </p>

                                    {seleccionada.creditos && (
                                        <small className="ime-credits">
                                            Créditos:{" "}
                                            {seleccionada.creditos}
                                        </small>
                                    )}

                                    {seleccionada.urlImagen &&
                                        urlValida(
                                            seleccionada.urlImagen
                                        ) && (
                                            <a
                                                className="ime-source-link"
                                                href={
                                                    seleccionada.urlImagen
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink size={13} />
                                                Abrir imagen original
                                            </a>
                                        )
                                    }
                                </>
                            )}

                        </div>

                    </div>

                    <aside className="ime-list-panel">

                        <div className="ime-list-header">

                            <div>
                                <small>
                                    COLECCIÓN
                                </small>

                                <h2>
                                    Imágenes registradas
                                </h2>
                            </div>

                            <strong>
                                {imagenesFiltradas.length}
                            </strong>

                        </div>

                        <div className="ime-list">

                            {imagenesFiltradas.map(
                                imagen => {
                                    const estaSeleccionada =
                                        Number(
                                            seleccionada?.idImagen
                                        ) ===
                                        Number(
                                            imagen.idImagen
                                        );

                                    return (
                                        <article
                                            key={
                                                imagen.idImagen
                                            }
                                            className={`ime-item ${estaSeleccionada
                                                    ? "selected"
                                                    : ""
                                                } ${imagen.activa === false
                                                    ? "inactive"
                                                    : ""
                                                }`}
                                        >

                                            <button
                                                type="button"
                                                className="ime-item-select"
                                                onClick={() =>
                                                    setSeleccionada(
                                                        imagen
                                                    )
                                                }
                                            >

                                                <span className="ime-item-thumb">

                                                    <VistaImagen
                                                        imagen={imagen}
                                                        nombre={
                                                            especie?.nombreCientifico
                                                        }
                                                    />

                                                </span>

                                                <span className="ime-item-info">

                                                    <strong>
                                                        {imagen.titulo ||
                                                            etiquetaTipo(
                                                                imagen.tipoImagen
                                                            )
                                                        }
                                                    </strong>

                                                    <small>
                                                        {etiquetaTipo(
                                                            imagen.tipoImagen
                                                        )}
                                                    </small>

                                                </span>

                                            </button>

                                            <div className="ime-item-badges">

                                                {imagen.esPrincipal && (
                                                    <span className="ime-tag main">
                                                        <Star size={11} />
                                                        Principal
                                                    </span>
                                                )}

                                                <span
                                                    className={`ime-tag ${imagen.activa !== false
                                                            ? "active"
                                                            : "inactive"
                                                        }`}
                                                >
                                                    {imagen.activa !== false
                                                        ? "Activa"
                                                        : "Inactiva"
                                                    }
                                                </span>

                                            </div>

                                            <div className="ime-item-actions">

                                                {imagen.activa !== false && (
                                                    <button
                                                        type="button"
                                                        className="edit"
                                                        disabled={guardando}
                                                        onClick={() =>
                                                            editar(
                                                                imagen
                                                            )
                                                        }
                                                    >
                                                        <Edit3 size={13} />
                                                        Editar
                                                    </button>
                                                )}

                                                {imagen.activa !== false &&
                                                    !imagen.esPrincipal && (
                                                        <button
                                                            type="button"
                                                            className="main"
                                                            disabled={guardando}
                                                            onClick={() =>
                                                                marcarPrincipal(
                                                                    imagen
                                                                )
                                                            }
                                                        >
                                                            <Star size={13} />
                                                            Principal
                                                        </button>
                                                    )
                                                }

                                                {imagen.activa !== false ? (
                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        disabled={guardando}
                                                        onClick={() =>
                                                            desactivar(
                                                                imagen
                                                            )
                                                        }
                                                    >
                                                        <Trash2 size={13} />
                                                        Desactivar
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="restore"
                                                        disabled={guardando}
                                                        onClick={() =>
                                                            activar(
                                                                imagen
                                                            )
                                                        }
                                                    >
                                                        <RotateCcw size={13} />
                                                        Reactivar
                                                    </button>
                                                )}

                                            </div>

                                        </article>
                                    );
                                }
                            )}

                        </div>

                    </aside>

                </section>
            )}

            {formularioAbierto && (
                <div
                    className="ime-backdrop"
                    onMouseDown={evento => {
                        if (
                            evento.target ===
                            evento.currentTarget
                        ) {
                            cerrarFormulario();
                        }
                    }}
                >

                    <section
                        className="ime-form-panel"
                        onMouseDown={evento =>
                            evento.stopPropagation()
                        }
                    >

                        <button
                            type="button"
                            className="ime-close"
                            onClick={
                                cerrarFormulario
                            }
                            disabled={
                                guardando
                            }
                            aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>

                        <span className="ime-eyebrow">
                            DOCUMENTACIÓN · IMAGEN
                        </span>

                        <h2>
                            {edicion
                                ? "Editar imagen"
                                : "Nueva imagen"
                            }
                        </h2>

                        <div className="ime-form-species">

                            <Leaf size={18} />

                            <div>
                                <small>
                                    Especie
                                </small>

                                <strong>
                                    {especie?.nombreComun ||
                                        "Sin nombre común"
                                    }
                                </strong>

                                <em>
                                    {especie?.nombreCientifico ||
                                        ""
                                    }
                                </em>
                            </div>

                        </div>

                        <form
                            className="ime-form"
                            onSubmit={guardar}
                        >

                            <div className="ime-form-banner">

                                <ImagePlus size={19} />

                                <div>
                                    <strong>
                                        Imagen mediante URL
                                    </strong>

                                    <p>
                                        Utiliza una dirección HTTP o HTTPS pública y accesible desde el navegador.
                                    </p>
                                </div>

                            </div>

                            <div className="ime-form-row">

                                <div className="ime-form-group">

                                    <label>
                                        Tipo de imagen
                                        <b>*</b>
                                    </label>

                                    <select
                                        name="tipoImagen"
                                        value={
                                            form.tipoImagen
                                        }
                                        onChange={
                                            cambiarCampo
                                        }
                                    >
                                        {TIPOS.map(
                                            ([valor, texto]) => (
                                                <option
                                                    key={valor}
                                                    value={valor}
                                                >
                                                    {texto}
                                                </option>
                                            )
                                        )}
                                    </select>

                                </div>

                                <div className="ime-form-group">

                                    <label>
                                        Parte comestible
                                    </label>

                                    <ComboBuscable
                                        id="ime-parte-comestible"
                                        name="idEspecieParte"
                                        ariaLabel="Parte comestible asociada"
                                        value={
                                            form.idEspecieParte
                                        }
                                        onChange={
                                            cambiarCampo
                                        }
                                        placeholder="Ninguna · Imagen general"
                                        searchPlaceholder="Buscar parte..."
                                        options={[
                                            {
                                                value: "",
                                                label: "Ninguna · Imagen general"
                                            },
                                            ...partes.map(parte => ({
                                                value: parte.idEspecieParte,
                                                label: parte.nombreParte ||
                                                    parte.partePlanta?.nombre ||
                                                    "Parte comestible"
                                            }))
                                        ]}
                                    />

                                </div>

                            </div>

                            <div className="ime-form-group">

                                <label>
                                    URL de la imagen
                                    <b>*</b>
                                </label>

                                <input
                                    type="url"
                                    name="urlImagen"
                                    maxLength={1000}
                                    required
                                    value={
                                        form.urlImagen
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    placeholder="https://ejemplo.com/imagen.jpg"
                                />

                                <small>
                                    La imagen debe estar disponible públicamente.
                                </small>

                            </div>

                            {form.urlImagen &&
                                urlValida(
                                    form.urlImagen
                                ) && (
                                    <div className="ime-form-preview">

                                        <strong>
                                            <Eye size={14} />
                                            Vista previa
                                        </strong>

                                        <div>
                                            <img
                                                src={
                                                    form.urlImagen
                                                }
                                                alt="Vista previa"
                                                onError={
                                                    evento => {
                                                        evento.currentTarget.style.display =
                                                            "none";
                                                    }
                                                }
                                                onLoad={
                                                    evento => {
                                                        evento.currentTarget.style.display =
                                                            "block";
                                                    }
                                                }
                                            />
                                        </div>

                                    </div>
                                )
                            }

                            <div className="ime-form-group">

                                <label>
                                    Texto alternativo
                                    <b>*</b>

                                    <small>
                                        {form.textoAlternativo.length}/300
                                    </small>
                                </label>

                                <input
                                    type="text"
                                    name="textoAlternativo"
                                    maxLength={300}
                                    required
                                    value={
                                        form.textoAlternativo
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    placeholder="Ej. Flores blancas de izote agrupadas en racimo"
                                />

                                <small>
                                    Describe brevemente lo que aparece en la imagen para mejorar la accesibilidad.
                                </small>

                            </div>

                            <div className="ime-form-group">

                                <label>
                                    Título

                                    <small>
                                        {form.titulo.length}/200
                                    </small>
                                </label>

                                <input
                                    type="text"
                                    name="titulo"
                                    maxLength={200}
                                    value={
                                        form.titulo
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    placeholder="Ej. Flor de izote"
                                />

                            </div>

                            <div className="ime-form-group">

                                <label>
                                    Descripción
                                </label>

                                <textarea
                                    name="descripcion"
                                    rows="4"
                                    value={
                                        form.descripcion
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    placeholder="Describe el contenido o contexto de la imagen..."
                                />

                            </div>

                            <div className="ime-form-group">

                                <label>
                                    Créditos / autor

                                    <small>
                                        {form.creditos.length}/250
                                    </small>
                                </label>

                                <input
                                    type="text"
                                    name="creditos"
                                    maxLength={250}
                                    value={
                                        form.creditos
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                    placeholder="Ej. Universidad de El Salvador"
                                />

                            </div>

                            <label className="ime-main-check">

                                <input
                                    type="checkbox"
                                    name="esPrincipal"
                                    checked={
                                        form.esPrincipal
                                    }
                                    onChange={
                                        cambiarCampo
                                    }
                                />

                                <span className="ime-main-check-icon">
                                    <Star size={17} />
                                </span>

                                <span>
                                    <strong>
                                        Usar como imagen principal
                                    </strong>

                                    <small>
                                        Será la imagen representativa de la especie en el catálogo.
                                    </small>
                                </span>

                            </label>

                            <div className="ime-form-actions">

                                <button
                                    type="button"
                                    className="ime-btn-cancel"
                                    onClick={
                                        cerrarFormulario
                                    }
                                    disabled={
                                        guardando
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="ime-btn-submit"
                                    disabled={
                                        guardando
                                    }
                                >
                                    {guardando ? (
                                        <>
                                            <RefreshCw
                                                size={16}
                                                className="ime-spin"
                                            />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />

                                            {edicion
                                                ? "Guardar cambios"
                                                : "Registrar imagen"
                                            }
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    </section>

                </div>
            )}

        </div>
    );
}