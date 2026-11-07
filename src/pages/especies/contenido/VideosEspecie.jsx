import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Edit3,
    ExternalLink,
    Eye,
    Film,
    Leaf,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    User,
    Video,
    X
} from "lucide-react";
import { API_URL } from "../../../config";
import ComboBuscable from "../../../components/ComboBuscable";
import {
    listarVideosPorEspecie,
    crearVideoEspecie,
    actualizarVideoEspecie,
    desactivarVideoEspecie,
    activarVideoEspecie,
    listarPartesDeEspecie
} from "../../../api/videoEspecieService";
import {
    analizarUrlVideo,
    formatearDuracion,
    validarVideoRequest
} from "../../../utils/videoUtils";
import "../../../styles/videoEspecie.css";
import "../../../styles/alertas.css";

const FORMULARIO_VACIO = {
    titulo: "",
    urlVideo: "",
    minutos: "",
    segundos: "",
    descripcion: "",
    creditos: "",
    idEspecieParte: ""
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
            (nombre?.esPrincipal === true || nombre?.principal === true) &&
            nombre?.activo !== false
    );

    return principal?.nombre ||
        nombres[0]?.nombre ||
        "Sin nombre común";
}

function obtenerMensajeError(error) {
    const data = error?.response?.data;

    if (typeof data === "string") {
        return data;
    }

    return data?.mensaje ||
        data?.message ||
        data?.error ||
        error?.message ||
        "Ocurrió un error inesperado.";
}

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export default function VideosEspecie() {
    const { idEspecie } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [especie, setEspecie] = useState(
        location.state?.especie || null
    );

    const [videos, setVideos] = useState([]);
    const [partes, setPartes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [videoSeleccionado, setVideoSeleccionado] = useState(null);

    const [formularioAbierto, setFormularioAbierto] = useState(false);
    const [videoEnEdicion, setVideoEnEdicion] = useState(null);
    const [formData, setFormData] = useState({ ...FORMULARIO_VACIO });
    const [errores, setErrores] = useState({});

    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("todos");

    const mostrarError = useCallback(async (titulo, error) => {
        await Swal.fire({
            icon: "error",
            title: titulo,
            text: obtenerMensajeError(error),
            confirmButtonText: "Entendido",
            buttonsStyling: false,
            customClass: {
                popup: "flora-alert",
                confirmButton: "flora-alert-confirm"
            }
        });
    }, []);

    const cargarDatos = useCallback(async () => {
        if (!idEspecie) {
            return;
        }

        try {
            setCargando(true);

            const [
                listaVideos,
                listaPartes,
                respuestaEspecie
            ] = await Promise.all([
                listarVideosPorEspecie(idEspecie, false),
                listarPartesDeEspecie(idEspecie),
                axios.get(`${API_URL}/api/especies/${idEspecie}`)
            ]);

            setVideos(
                Array.isArray(listaVideos)
                    ? listaVideos
                    : []
            );

            setPartes(
                Array.isArray(listaPartes)
                    ? listaPartes
                    : []
            );

            const datos = respuestaEspecie.data;

            setEspecie({
                idEspecie: datos.idEspecie,
                nombreComun: nombreComunPrincipal(datos),
                nombreCientifico: datos.nombreCientifico,
                familia: datos?.taxonomia?.familia || null,
                genero: datos?.taxonomia?.genero || null,
                activa: datos.activa
            });

            setVideoSeleccionado(actual => {
                if (listaVideos.length === 0) {
                    return null;
                }

                const mismo = listaVideos.find(
                    video =>
                        Number(video.idVideo) ===
                        Number(actual?.idVideo)
                );

                if (mismo) {
                    return mismo;
                }

                return listaVideos.find(
                    video => video.activo !== false
                ) || listaVideos[0];
            });
        } catch (error) {
            await mostrarError(
                "No se pudieron cargar los videos",
                error
            );
        } finally {
            setCargando(false);
        }
    }, [
        idEspecie,
        mostrarError
    ]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    function obtenerNombreParte(idParte) {
        if (!idParte) {
            return null;
        }

        const encontrada = partes.find(
            parte =>
                Number(parte.idEspecieParte) === Number(idParte) ||
                Number(parte.idPartePlanta) === Number(idParte)
        );

        return encontrada?.nombreParte ||
            encontrada?.partePlanta?.nombre ||
            encontrada?.partePlanta?.nombreParte ||
            "Parte asociada";
    }

    const activos = useMemo(
        () => videos.filter(
            video => video.activo !== false
        ).length,
        [videos]
    );

    const inactivos = useMemo(
        () => videos.filter(
            video => video.activo === false
        ).length,
        [videos]
    );

    const videosFiltrados = useMemo(() => {
        const texto = normalizar(busqueda);

        return videos.filter(video => {
            const coincideEstado =
                filtroEstado === "todos" ||
                (
                    filtroEstado === "activos" &&
                    video.activo !== false
                ) ||
                (
                    filtroEstado === "inactivos" &&
                    video.activo === false
                );

            if (!coincideEstado) {
                return false;
            }

            if (!texto) {
                return true;
            }

            const contenido = normalizar(
                `${video.titulo || ""} ` +
                `${video.descripcion || ""} ` +
                `${video.creditos || ""} ` +
                `${obtenerNombreParte(video.idEspecieParte) || ""}`
            );

            return contenido.includes(texto);
        });
    }, [
        videos,
        filtroEstado,
        busqueda,
        partes
    ]);

    useEffect(() => {
        if (videosFiltrados.length === 0) {
            setVideoSeleccionado(null);
            return;
        }

        const visible = videosFiltrados.some(
            video =>
                Number(video.idVideo) ===
                Number(videoSeleccionado?.idVideo)
        );

        if (!visible) {
            setVideoSeleccionado(
                videosFiltrados[0]
            );
        }
    }, [
        videosFiltrados,
        videoSeleccionado?.idVideo
    ]);

    function abrirNuevo() {
        if (especie?.activa === false) {
            Swal.fire({
                icon: "warning",
                title: "Especie inactiva",
                text: "No puedes registrar videos nuevos mientras la especie esté inactiva.",
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                }
            });
            return;
        }

        setVideoEnEdicion(null);
        setFormData({ ...FORMULARIO_VACIO });
        setErrores({});
        setFormularioAbierto(true);
    }

    function abrirEditar(video) {
        const duracion =
            Number(video.duracionSegundos) || 0;

        setVideoEnEdicion(video);

        setFormData({
            titulo: video.titulo || "",
            urlVideo: video.urlVideo || "",
            minutos: duracion
                ? String(Math.floor(duracion / 60))
                : "",
            segundos: duracion
                ? String(duracion % 60)
                : "",
            descripcion: video.descripcion || "",
            creditos: video.creditos || "",
            idEspecieParte: video.idEspecieParte
                ? String(video.idEspecieParte)
                : ""
        });

        setErrores({});
        setFormularioAbierto(true);
    }

    function cerrarFormulario() {
        if (guardando) {
            return;
        }

        setFormularioAbierto(false);
        setVideoEnEdicion(null);
        setFormData({ ...FORMULARIO_VACIO });
        setErrores({});
    }

    function modificarCampo(evento) {
        const { name, value } = evento.target;

        let valor = value;

        if (name === "segundos" && Number(value) > 59) {
            valor = "59";
        }

        if (name === "minutos" && Number(value) > 240) {
            valor = "240";
        }

        setFormData(actual => ({
            ...actual,
            [name]: valor
        }));

        if (errores[name]) {
            setErrores(actual => {
                const copia = { ...actual };
                delete copia[name];
                return copia;
            });
        }
    }

    const segundosTotales =
        Math.max(
            0,
            (Number(formData.minutos) || 0) * 60 +
            (Number(formData.segundos) || 0)
        );

    const infoUrlForm =
        analizarUrlVideo(
            formData.urlVideo
        );

    async function guardarVideo(evento) {
        evento.preventDefault();

        if (guardando) {
            return;
        }

        const payload = {
            titulo: formData.titulo.trim(),
            urlVideo: formData.urlVideo.trim(),
            duracionSegundos:
                segundosTotales > 0
                    ? segundosTotales
                    : null,
            descripcion:
                formData.descripcion.trim() ||
                null,
            creditos:
                formData.creditos.trim() ||
                null,
            idEspecieParte:
                formData.idEspecieParte
                    ? Number(formData.idEspecieParte)
                    : null
        };

        const validacion =
            validarVideoRequest(payload);

        if (!validacion.esValido) {
            setErrores(
                validacion.errores || {}
            );
            return;
        }

        try {
            setGuardando(true);

            let guardado;

            if (videoEnEdicion) {
                guardado =
                    await actualizarVideoEspecie(
                        videoEnEdicion.idVideo,
                        payload
                    );
            } else {
                guardado =
                    await crearVideoEspecie(
                        idEspecie,
                        payload
                    );
            }

            setFormularioAbierto(false);
            setVideoEnEdicion(null);
            setFormData({ ...FORMULARIO_VACIO });
            setErrores({});

            await cargarDatos();

            if (guardado) {
                setVideoSeleccionado(
                    guardado
                );
            }

            await Swal.fire({
                icon: "success",
                title: videoEnEdicion
                    ? "Video actualizado"
                    : "Video registrado",
                text: videoEnEdicion
                    ? "Los cambios se guardaron correctamente."
                    : "El video fue agregado correctamente a la especie.",
                timer: 1700,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarError(
                videoEnEdicion
                    ? "No se pudo actualizar el video"
                    : "No se pudo registrar el video",
                error
            );
        } finally {
            setGuardando(false);
        }
    }

    async function desactivar(video) {
        const resultado =
            await Swal.fire({
                icon: "warning",
                title: "¿Desactivar video?",
                text: `El video "${video.titulo}" dejará de mostrarse como activo.`,
                showCancelButton: true,
                confirmButtonText: "Sí, desactivar",
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
            await desactivarVideoEspecie(
                video.idVideo
            );

            await cargarDatos();

            await Swal.fire({
                icon: "success",
                title: "Video desactivado",
                timer: 1400,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarError(
                "No se pudo desactivar el video",
                error
            );
        }
    }

    async function activar(video) {
        const resultado =
            await Swal.fire({
                icon: "question",
                title: "¿Reactivar video?",
                text: `El video "${video.titulo}" volverá a estar disponible.`,
                showCancelButton: true,
                confirmButtonText: "Sí, reactivar",
                cancelButtonText: "Cancelar",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm",
                    cancelButton: "flora-alert-cancel"
                }
            });

        if (!resultado.isConfirmed) {
            return;
        }

        try {
            await activarVideoEspecie(
                video.idVideo
            );

            await cargarDatos();

            await Swal.fire({
                icon: "success",
                title: "Video reactivado",
                timer: 1400,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarError(
                "No se pudo reactivar el video",
                error
            );
        }
    }

    function volverSeleccion() {
        navigate(
            "/gestion-especies",
            {
                state: {
                    abrirContenido: "videos",
                    categoria: "documentacion"
                }
            }
        );
    }

    function renderReproductor(video) {
        if (!video) {
            return (
                <div className="vme-player-placeholder">
                    <Film size={44} />
                    <h3>Sin video seleccionado</h3>
                    <p>
                        Selecciona un video de la colección para visualizarlo.
                    </p>
                </div>
            );
        }

        const info =
            analizarUrlVideo(
                video.urlVideo
            );

        return (
            <div className="vme-player-panel">

                <div className="vme-player-container">

                    {info.tipo === "youtube" && (
                        <iframe
                            src={info.embedUrl}
                            title={video.titulo}
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    )}

                    {info.tipo === "gdrive" && (
                        <iframe
                            src={info.embedUrl}
                            title={video.titulo}
                            loading="lazy"
                            allow="autoplay"
                            allowFullScreen
                        />
                    )}

                    {info.tipo === "direct" && (
                        <video
                            controls
                            playsInline
                            preload="metadata"
                        >
                            <source
                                src={
                                    info.urlOriginal
                                }
                            />
                            Tu navegador no soporta la reproducción de este video.
                        </video>
                    )}

                    {info.tipo === "externo" && (
                        <div className="vme-player-external">

                            <Video size={48} />

                            <h4>
                                Video alojado externamente
                            </h4>

                            <p>
                                Este enlace no puede reproducirse directamente dentro del sistema.
                            </p>

                            <a
                                href={
                                    info.urlOriginal
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="vme-btn-external"
                            >
                                <ExternalLink size={16} />
                                Abrir video
                            </a>

                        </div>
                    )}

                </div>

                <div className="vme-player-meta">

                    <div className="vme-meta-top">

                        <div>
                            <small>
                                VIDEO SELECCIONADO
                            </small>

                            <h3 className="vme-meta-title">
                                {video.titulo}
                            </h3>
                        </div>

                        <span
                            className={`vme-status ${video.activo !== false
                                    ? "activo"
                                    : "inactivo"
                                }`}
                        >
                            {video.activo !== false
                                ? "Activo"
                                : "Inactivo"
                            }
                        </span>

                    </div>

                    {video.descripcion && (
                        <p className="vme-meta-desc">
                            {video.descripcion}
                        </p>
                    )}

                    <div className="vme-meta-badges">

                        {video.duracionSegundos > 0 && (
                            <span className="vme-meta-pill">
                                <Clock size={13} />
                                {formatearDuracion(
                                    video.duracionSegundos
                                )}
                            </span>
                        )}

                        {video.idEspecieParte && (
                            <span className="vme-meta-pill">
                                <Leaf size={13} />
                                {obtenerNombreParte(
                                    video.idEspecieParte
                                )}
                            </span>
                        )}

                        {video.creditos && (
                            <span className="vme-meta-pill">
                                <User size={13} />
                                {video.creditos}
                            </span>
                        )}

                        <a
                            href={video.urlVideo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vme-meta-pill vme-source-link"
                        >
                            <ExternalLink size={13} />
                            Enlace original
                        </a>

                    </div>

                </div>

            </div>
        );
    }

    return (
        <div className="vme-page">

            <header className="vme-page-header">

                <div>

                    <span className="vme-eyebrow">
                        CONTENIDO · DOCUMENTACIÓN
                    </span>

                    <h1>
                        Videos de especie
                    </h1>

                    <p>
                        Administra material audiovisual relacionado con la especie seleccionada.
                    </p>

                </div>

                <div className="vme-header-actions">

                    <button
                        type="button"
                        className="vme-btn-secondary"
                        onClick={volverSeleccion}
                    >
                        <ArrowLeft size={16} />
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="vme-btn-primary"
                        onClick={abrirNuevo}
                        disabled={
                            cargando ||
                            especie?.activa === false
                        }
                    >
                        <Plus size={16} />
                        Agregar video
                    </button>

                </div>

            </header>

            <section className="vme-species-card">

                <span className="vme-species-icon">
                    <Leaf size={21} />
                </span>

                <div className="vme-species-info">

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
                    <span className="vme-species-family">
                        Familia:
                        <strong>
                            {especie.familia}
                        </strong>
                    </span>
                )}

            </section>

            <section className="vme-summary">

                <div className="vme-summary-card total">

                    <span className="vme-summary-icon">
                        <Film size={21} />
                    </span>

                    <div>
                        <small>
                            Videos registrados
                        </small>

                        <strong>
                            {videos.length}
                        </strong>

                        <span>
                            Total de recursos
                        </span>
                    </div>

                </div>

                <div className="vme-summary-card active">

                    <span className="vme-summary-icon">
                        <CheckCircle2 size={21} />
                    </span>

                    <div>
                        <small>
                            Videos activos
                        </small>

                        <strong>
                            {activos}
                        </strong>

                        <span>
                            Disponibles actualmente
                        </span>
                    </div>

                </div>

                <div className="vme-summary-card inactive">

                    <span className="vme-summary-icon">
                        <RotateCcw size={21} />
                    </span>

                    <div>
                        <small>
                            Videos inactivos
                        </small>

                        <strong>
                            {inactivos}
                        </strong>

                        <span>
                            Pueden reactivarse
                        </span>
                    </div>

                </div>

            </section>

            <section className="vme-toolbar">

                <label className="vme-search">

                    <Search size={17} />

                    <input
                        type="text"
                        value={busqueda}
                        onChange={evento =>
                            setBusqueda(
                                evento.target.value
                            )
                        }
                        placeholder="Buscar por título, descripción, créditos o parte..."
                    />

                </label>

                <div className="vme-filters">

                    <button
                        type="button"
                        className={
                            filtroEstado === "todos"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFiltroEstado(
                                "todos"
                            )
                        }
                    >
                        Todos
                        <span>
                            {videos.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            filtroEstado === "activos"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFiltroEstado(
                                "activos"
                            )
                        }
                    >
                        Activos
                        <span>
                            {activos}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            filtroEstado === "inactivos"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFiltroEstado(
                                "inactivos"
                            )
                        }
                    >
                        Inactivos
                        <span>
                            {inactivos}
                        </span>
                    </button>

                </div>

                <button
                    type="button"
                    className="vme-refresh"
                    disabled={cargando}
                    onClick={cargarDatos}
                >
                    <RefreshCw
                        size={16}
                        className={
                            cargando
                                ? "vme-spin"
                                : ""
                        }
                    />
                    Actualizar
                </button>

            </section>

            {cargando ? (
                <section className="vme-empty-state">

                    <RefreshCw
                        size={30}
                        className="vme-spin"
                    />

                    <h3>
                        Cargando videos
                    </h3>

                    <p>
                        Consultando los recursos audiovisuales de la especie.
                    </p>

                </section>
            ) : videos.length === 0 ? (
                <section className="vme-empty-state">

                    <Film size={42} />

                    <h3>
                        No hay videos registrados
                    </h3>

                    <p>
                        Esta especie todavía no cuenta con material audiovisual.
                    </p>

                    {especie?.activa !== false && (
                        <button
                            type="button"
                            className="vme-btn-primary"
                            onClick={abrirNuevo}
                        >
                            <Plus size={16} />
                            Registrar primer video
                        </button>
                    )}

                </section>
            ) : videosFiltrados.length === 0 ? (
                <section className="vme-empty-state">

                    <Search size={35} />

                    <h3>
                        Sin resultados
                    </h3>

                    <p>
                        No encontramos videos que coincidan con los filtros seleccionados.
                    </p>

                </section>
            ) : (
                <section className="vme-content">

                    <div className="vme-player-column">
                        {renderReproductor(
                            videoSeleccionado
                        )}
                    </div>

                    <aside className="vme-list-panel">

                        <div className="vme-list-header">

                            <div>
                                <small>
                                    COLECCIÓN
                                </small>

                                <h2>
                                    Videos registrados
                                </h2>
                            </div>

                            <strong>
                                {videosFiltrados.length}
                            </strong>

                        </div>

                        <div className="vme-list-items">

                            {videosFiltrados.map(video => {

                                const seleccionado =
                                    Number(
                                        videoSeleccionado?.idVideo
                                    ) ===
                                    Number(
                                        video.idVideo
                                    );

                                return (
                                    <article
                                        key={video.idVideo}
                                        className={`vme-video-card ${seleccionado
                                                ? "selected"
                                                : ""
                                            } ${video.activo === false
                                                ? "inactive"
                                                : ""
                                            }`}
                                        onClick={() =>
                                            setVideoSeleccionado(
                                                video
                                            )
                                        }
                                    >

                                        <div className="vme-video-card-top">

                                            <span className="vme-video-card-icon">
                                                <Video size={17} />
                                            </span>

                                            <div>
                                                <h3>
                                                    {video.titulo}
                                                </h3>

                                                <span
                                                    className={`vme-status ${video.activo !== false
                                                            ? "activo"
                                                            : "inactivo"
                                                        }`}
                                                >
                                                    {video.activo !== false
                                                        ? "Activo"
                                                        : "Inactivo"
                                                    }
                                                </span>
                                            </div>

                                        </div>

                                        <div className="vme-video-card-meta">

                                            {video.duracionSegundos > 0 && (
                                                <span>
                                                    <Clock size={12} />
                                                    {formatearDuracion(
                                                        video.duracionSegundos
                                                    )}
                                                </span>
                                            )}

                                            {video.idEspecieParte && (
                                                <span>
                                                    <Leaf size={12} />
                                                    {obtenerNombreParte(
                                                        video.idEspecieParte
                                                    )}
                                                </span>
                                            )}

                                        </div>

                                        {video.descripcion && (
                                            <p>
                                                {video.descripcion}
                                            </p>
                                        )}

                                        <div
                                            className="vme-video-card-actions"
                                            onClick={evento =>
                                                evento.stopPropagation()
                                            }
                                        >

                                            <button
                                                type="button"
                                                className="edit"
                                                onClick={() =>
                                                    abrirEditar(
                                                        video
                                                    )
                                                }
                                            >
                                                <Edit3 size={13} />
                                                Editar
                                            </button>

                                            {video.activo !== false ? (
                                                <button
                                                    type="button"
                                                    className="danger"
                                                    onClick={() =>
                                                        desactivar(
                                                            video
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
                                                    onClick={() =>
                                                        activar(
                                                            video
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
                            })}

                        </div>

                    </aside>

                </section>
            )}

            {formularioAbierto && (
                <div
                    className="vme-backdrop"
                    onMouseDown={evento => {
                        if (
                            evento.target ===
                            evento.currentTarget
                        ) {
                            cerrarFormulario();
                        }
                    }}
                >

                    <aside
                        className="vme-form-panel"
                        onMouseDown={evento =>
                            evento.stopPropagation()
                        }
                    >

                        <button
                            type="button"
                            className="vme-close"
                            onClick={cerrarFormulario}
                            disabled={guardando}
                            aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>

                        <span className="vme-eyebrow">
                            DOCUMENTACIÓN · VIDEO
                        </span>

                        <h2>
                            {videoEnEdicion
                                ? "Editar video"
                                : "Nuevo video"
                            }
                        </h2>

                        <div className="vme-form-species">

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
                            className="vme-form"
                            onSubmit={guardarVideo}
                        >

                            <div className="vme-form-banner">

                                <AlertCircle size={18} />

                                <div>
                                    <strong>
                                        Videos compatibles
                                    </strong>

                                    <p>
                                        Puedes utilizar enlaces de YouTube, Google Drive, archivos directos de video o enlaces externos.
                                    </p>
                                </div>

                            </div>

                            <div className="vme-form-group">

                                <label className="vme-form-label">
                                    <span>
                                        Título del video
                                        <b>*</b>
                                    </span>

                                    <small>
                                        {formData.titulo.length}/200
                                    </small>
                                </label>

                                <input
                                    type="text"
                                    name="titulo"
                                    maxLength={200}
                                    value={formData.titulo}
                                    onChange={modificarCampo}
                                    className={
                                        errores.titulo
                                            ? "has-error"
                                            : ""
                                    }
                                    placeholder="Ej. Preparación tradicional de la flor de izote"
                                />

                                {errores.titulo && (
                                    <span className="vme-error">
                                        <AlertCircle size={13} />
                                        {errores.titulo}
                                    </span>
                                )}

                            </div>

                            <div className="vme-form-group">

                                <label className="vme-form-label">
                                    <span>
                                        URL del video
                                        <b>*</b>
                                    </span>

                                    <small>
                                        {formData.urlVideo.length}/1000
                                    </small>
                                </label>

                                <input
                                    type="url"
                                    name="urlVideo"
                                    maxLength={1000}
                                    value={formData.urlVideo}
                                    onChange={modificarCampo}
                                    className={
                                        errores.urlVideo
                                            ? "has-error"
                                            : ""
                                    }
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />

                                {errores.urlVideo ? (
                                    <span className="vme-error">
                                        <AlertCircle size={13} />
                                        {errores.urlVideo}
                                    </span>
                                ) : (
                                    <small className="vme-hint">
                                        El enlace debe comenzar con http:// o https://
                                    </small>
                                )}

                            </div>

                            {formData.urlVideo.trim().length > 10 &&
                                infoUrlForm.embedUrl && (
                                    <div className="vme-preview">

                                        <strong>
                                            <Eye size={14} />
                                            Vista previa
                                        </strong>

                                        <div className="vme-preview-frame">

                                            {(infoUrlForm.tipo === "youtube" ||
                                                infoUrlForm.tipo === "gdrive") && (
                                                    <iframe
                                                        src={
                                                            infoUrlForm.embedUrl
                                                        }
                                                        title="Vista previa"
                                                        loading="lazy"
                                                        allowFullScreen
                                                    />
                                                )
                                            }

                                            {infoUrlForm.tipo === "direct" && (
                                                <video
                                                    controls
                                                    playsInline
                                                    preload="metadata"
                                                >
                                                    <source
                                                        src={
                                                            infoUrlForm.urlOriginal
                                                        }
                                                    />
                                                </video>
                                            )}

                                        </div>

                                    </div>
                                )
                            }

                            <div className="vme-form-group">

                                <label className="vme-form-label">
                                    <span>
                                        Duración del video
                                    </span>
                                </label>

                                <div className="vme-duration">

                                    <label>
                                        Minutos
                                        <input
                                            type="number"
                                            name="minutos"
                                            min="0"
                                            max="240"
                                            value={
                                                formData.minutos
                                            }
                                            onChange={
                                                modificarCampo
                                            }
                                            placeholder="0"
                                        />
                                    </label>

                                    <label>
                                        Segundos
                                        <input
                                            type="number"
                                            name="segundos"
                                            min="0"
                                            max="59"
                                            value={
                                                formData.segundos
                                            }
                                            onChange={
                                                modificarCampo
                                            }
                                            placeholder="0"
                                        />
                                    </label>

                                    <div className="vme-duration-total">
                                        <Clock size={15} />
                                        {segundosTotales > 0
                                            ? formatearDuracion(
                                                segundosTotales
                                            )
                                            : "Sin duración"
                                        }
                                    </div>

                                </div>

                                {errores.duracionSegundos && (
                                    <span className="vme-error">
                                        <AlertCircle size={13} />
                                        {errores.duracionSegundos}
                                    </span>
                                )}

                            </div>

                            {partes.length > 0 && (
                                <div className="vme-form-group">

                                    <label className="vme-form-label">
                                        <span>
                                            Parte comestible asociada
                                        </span>
                                    </label>

                                    <ComboBuscable
                                        id="vme-parte-comestible"
                                        name="idEspecieParte"
                                        ariaLabel="Parte comestible asociada"
                                        value={
                                            formData.idEspecieParte
                                        }
                                        onChange={
                                            modificarCampo
                                        }
                                        placeholder="General · Toda la especie"
                                        searchPlaceholder="Buscar parte..."
                                        options={[
                                            {
                                                value: "",
                                                label: "General · Toda la especie"
                                            },
                                            ...partes.map(parte => ({
                                                value: parte.idEspecieParte ||
                                                    parte.idPartePlanta,
                                                label: parte.nombreParte ||
                                                    parte.partePlanta?.nombre ||
                                                    parte.partePlanta?.nombreParte ||
                                                    "Parte de la planta"
                                            }))
                                        ]}
                                    />

                                    <small className="vme-hint">
                                        Déjalo en General si el video no corresponde a una parte específica.
                                    </small>

                                </div>
                            )}

                            <div className="vme-form-group">

                                <label className="vme-form-label">
                                    <span>
                                        Créditos / autor
                                    </span>

                                    <small>
                                        {formData.creditos.length}/250
                                    </small>
                                </label>

                                <input
                                    type="text"
                                    name="creditos"
                                    maxLength={250}
                                    value={
                                        formData.creditos
                                    }
                                    onChange={
                                        modificarCampo
                                    }
                                    className={
                                        errores.creditos
                                            ? "has-error"
                                            : ""
                                    }
                                    placeholder="Ej. Universidad de El Salvador"
                                />

                                {errores.creditos && (
                                    <span className="vme-error">
                                        <AlertCircle size={13} />
                                        {errores.creditos}
                                    </span>
                                )}

                            </div>

                            <div className="vme-form-group">

                                <label className="vme-form-label">
                                    <span>
                                        Descripción
                                    </span>
                                </label>

                                <textarea
                                    name="descripcion"
                                    rows="4"
                                    value={
                                        formData.descripcion
                                    }
                                    onChange={
                                        modificarCampo
                                    }
                                    className={
                                        errores.descripcion
                                            ? "has-error"
                                            : ""
                                    }
                                    placeholder="Describe brevemente el contenido del video..."
                                />

                                {errores.descripcion && (
                                    <span className="vme-error">
                                        <AlertCircle size={13} />
                                        {errores.descripcion}
                                    </span>
                                )}

                            </div>

                            <div className="vme-form-actions">

                                <button
                                    type="button"
                                    className="vme-btn-cancel"
                                    disabled={guardando}
                                    onClick={
                                        cerrarFormulario
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="vme-btn-submit"
                                    disabled={guardando}
                                >
                                    {guardando ? (
                                        <>
                                            <RefreshCw
                                                size={16}
                                                className="vme-spin"
                                            />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />
                                            {videoEnEdicion
                                                ? "Guardar cambios"
                                                : "Registrar video"
                                            }
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    </aside>

                </div>
            )}

        </div>
    );
}