import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    ArrowLeft,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Image,
    Images,
    Leaf,
    Maximize2,
    Pencil,
    PlayCircle,
    Plus,
    Power,
    RefreshCw,
    Search,
    Star,
    Video,
    X
} from "lucide-react";
import { API_URL } from "../../../config";
import ComboBuscable from "../../../components/ComboBuscable";
import * as servicio from "../../../api/preparacionMediaService";
import { obtenerYoutube } from "./youtube";
import "../../../styles/multimediaPreparacion.css";
import "../../../styles/alertas.css";

const INICIAL = {
    titulo: "",
    descripcion: "",
    urlImagen: "",
    urlVideo: "",
    textoAlternativo: "",
    creditos: "",
    duracionSegundos: "",
    esPrincipal: false
};

const PATRON_URL = /^https?:\/\/([\w-]+\.)+[a-zA-Z]{2,}(:\d{1,5})?(\/[^\s]*)?$/;

function obtenerLista(datos) {
    if (Array.isArray(datos)) {
        return datos;
    }

    if (Array.isArray(datos?.content)) {
        return datos.content;
    }

    return [];
}

function urlSegura(valor) {
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

function obtenerMensajeError(error) {
    const data = error?.response?.data;

    if (!data) {
        return error?.message ||
            "No se pudo conectar con el servidor.";
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
        Array.isArray(especie?.nombresComunes)
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

function MultimediaPreparacion() {
    const { idEspecie } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [especie, setEspecie] = useState(
        location.state?.especie || null
    );

    const [preparaciones, setPreparaciones] = useState([]);
    const [idPreparacion, setIdPreparacion] = useState(
        location.state?.idPreparacion
            ? String(location.state.idPreparacion)
            : ""
    );

    const [tipo, setTipo] = useState(
        location.state?.tipo === "videos"
            ? "videos"
            : "imagenes"
    );
    const [registros, setRegistros] = useState([]);

    const [cargandoPreparaciones, setCargandoPreparaciones] = useState(true);
    const [cargandoMedia, setCargandoMedia] = useState(false);
    const [errorPreparaciones, setErrorPreparaciones] = useState("");
    const [errorMedia, setErrorMedia] = useState("");

    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("TODOS");
    const [pagina, setPagina] = useState(1);

    const [modal, setModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(INICIAL);
    const [errores, setErrores] = useState({});

    const [ocupado, setOcupado] = useState(false);

    const panelRef = useRef(null);
    const bloqueoRef = useRef(false);
    const aperturaAutomaticaRef = useRef(false);

    const esImagen = tipo === "imagenes";
    const IconoTipo = esImagen ? Image : Video;

    const campoUrl =
        esImagen
            ? "urlImagen"
            : "urlVideo";

    const campoId =
        esImagen
            ? "idImagenPreparacion"
            : "idVideoPreparacion";

    const preparacion = useMemo(
        () => preparaciones.find(
            item =>
                String(item.idPreparacion) ===
                String(idPreparacion)
        ) || null,
        [
            preparaciones,
            idPreparacion
        ]
    );

    useEffect(() => {
        cargarPreparaciones();
    }, [idEspecie]);

    useEffect(() => {
        aperturaAutomaticaRef.current = false;

        if (location.state?.idPreparacion) {
            setIdPreparacion(
                String(location.state.idPreparacion)
            );
        }

        if (
            location.state?.tipo === "imagenes" ||
            location.state?.tipo === "videos"
        ) {
            setTipo(location.state.tipo);
        }
    }, [location.key]);

    useEffect(() => {
        if (!idPreparacion) {
            setRegistros([]);
            setErrorMedia("");
            return;
        }

        cargarMedia();
    }, [
        idPreparacion,
        tipo
    ]);

    useEffect(() => {
        if (
            !location.state?.abrirFormulario ||
            aperturaAutomaticaRef.current ||
            !preparacion ||
            preparacion.activa === false
        ) {
            return;
        }

        aperturaAutomaticaRef.current = true;
        abrir();
    }, [
        location.key,
        location.state?.abrirFormulario,
        preparacion
    ]);

    useEffect(() => {
        if (!modal) {
            return;
        }

        const focoAnterior =
            document.activeElement;

        const overflowAnterior =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        setTimeout(() => {
            panelRef.current
                ?.querySelector(
                    "input:not(:disabled)"
                )
                ?.focus();
        }, 0);

        function manejarTeclado(evento) {
            if (
                evento.key === "Escape" &&
                !bloqueoRef.current
            ) {
                cerrarModal();
            }

            if (
                evento.key === "Tab" &&
                panelRef.current
            ) {
                const elementos = [
                    ...panelRef.current
                        .querySelectorAll(
                            "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]"
                        )
                ];

                const primero =
                    elementos[0];

                const ultimo =
                    elementos[
                    elementos.length - 1
                    ];

                if (
                    evento.shiftKey &&
                    document.activeElement === primero
                ) {
                    evento.preventDefault();
                    ultimo?.focus();
                }

                if (
                    !evento.shiftKey &&
                    document.activeElement === ultimo
                ) {
                    evento.preventDefault();
                    primero?.focus();
                }
            }
        }

        document.addEventListener(
            "keydown",
            manejarTeclado
        );

        return () => {
            document.body.style.overflow =
                overflowAnterior;

            document.removeEventListener(
                "keydown",
                manejarTeclado
            );

            focoAnterior?.focus();
        };
    }, [modal]);

    async function cargarPreparaciones() {
        try {
            setCargandoPreparaciones(true);
            setErrorPreparaciones("");

            const [
                datosPreparaciones,
                respuestaEspecie
            ] = await Promise.all([
                servicio.listarPreparacionesDeEspecie(
                    idEspecie
                ),
                axios.get(
                    `${API_URL}/api/especies/${idEspecie}`
                )
            ]);

            const lista =
                obtenerLista(
                    datosPreparaciones
                )
                    .sort(
                        (a, b) =>
                            (
                                b.activa !== false
                            ) -
                            (
                                a.activa !== false
                            ) ||
                            String(a.nombre || "")
                                .localeCompare(
                                    String(b.nombre || ""),
                                    "es"
                                )
                    );

            setPreparaciones(lista);

            setIdPreparacion(
                anterior => {
                    const existe =
                        lista.some(
                            item =>
                                String(
                                    item.idPreparacion
                                ) ===
                                String(
                                    anterior
                                )
                        );

                    if (existe) {
                        return anterior;
                    }

                    const primeraActiva =
                        lista.find(
                            item =>
                                item.activa !== false
                        );

                    return String(
                        primeraActiva
                            ?.idPreparacion ||
                        lista[0]
                            ?.idPreparacion ||
                        ""
                    );
                }
            );

            const datos =
                respuestaEspecie.data;

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
        } catch (error) {
            setPreparaciones([]);
            setIdPreparacion("");
            setErrorPreparaciones(
                obtenerMensajeError(
                    error
                )
            );

            await mostrarError(
                "No se pudieron cargar las preparaciones",
                error
            );
        } finally {
            setCargandoPreparaciones(false);
        }
    }

    async function cargarMedia() {
        if (!idPreparacion) {
            return;
        }

        try {
            setCargandoMedia(true);
            setErrorMedia("");

            const datos =
                await servicio.listarMedia(
                    idPreparacion,
                    tipo
                );

            setRegistros(
                obtenerLista(datos)
            );
        } catch (error) {
            setRegistros([]);

            setErrorMedia(
                obtenerMensajeError(
                    error
                )
            );
        } finally {
            setCargandoMedia(false);
        }
    }

    async function mostrarError(
        titulo,
        error
    ) {
        await Swal.fire({
            icon: "error",
            title: titulo,
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

    function registroActivo(registro) {
        if (esImagen) {
            return registro.activa !== false;
        }

        return registro.activo !== false;
    }

    const registrosFiltrados =
        useMemo(
            () => {
                const termino =
                    busqueda
                        .trim()
                        .toLocaleLowerCase(
                            "es"
                        );

                return registros.filter(
                    registro => {
                        const activo =
                            registroActivo(
                                registro
                            );

                        const coincideEstado =
                            estado === "TODOS" ||
                            (
                                estado === "ACTIVOS" &&
                                activo
                            ) ||
                            (
                                estado === "INACTIVOS" &&
                                !activo
                            );

                        const contenido = [
                            registro.titulo,
                            registro.descripcion,
                            registro.creditos,
                            registro.textoAlternativo
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLocaleLowerCase(
                                "es"
                            );

                        const coincideBusqueda =
                            !termino ||
                            contenido.includes(
                                termino
                            );

                        return (
                            coincideEstado &&
                            coincideBusqueda
                        );
                    }
                );
            },
            [
                registros,
                busqueda,
                estado,
                esImagen
            ]
        );

    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                registrosFiltrados.length /
                8
            )
        );

    const paginaActual =
        Math.min(
            pagina,
            totalPaginas
        );

    const registrosPagina =
        registrosFiltrados.slice(
            (paginaActual - 1) * 8,
            paginaActual * 8
        );

    const estadisticas = useMemo(
        () => {
            const activos =
                registros.filter(
                    registro =>
                        registroActivo(
                            registro
                        )
                ).length;

            const principales =
                esImagen
                    ? registros.filter(
                        registro =>
                            registro.esPrincipal === true
                    ).length
                    : registros.filter(
                        registro =>
                            Boolean(
                                obtenerYoutube(
                                    registro.urlVideo
                                )
                            )
                    ).length;

            return {
                preparaciones:
                    preparaciones.length,
                total:
                    registros.length,
                activos,
                especial:
                    principales
            };
        },
        [
            registros,
            preparaciones,
            esImagen
        ]
    );

    function cambiarEspecie() {
        if (ocupado) {
            return;
        }

        navigate("/gestion-especies", {
            state: {
                abrirContenido: "multimedia-preparacion",
                categoria: "documentacion",
                rutaRetorno: "/contenido-especies/documentacion"
            }
        });
    }

    function cambiarTipo(
        nuevoTipo
    ) {
        if (
            ocupado ||
            nuevoTipo === tipo
        ) {
            return;
        }

        setTipo(
            nuevoTipo
        );

        setPagina(1);
        setBusqueda("");
        setEstado("TODOS");
        setRegistros([]);
    }

    function abrir(
        registro = null
    ) {
        if (!preparacion) {
            return;
        }

        if (
            preparacion.activa === false
        ) {
            Swal.fire({
                icon: "warning",
                title: "Preparación inactiva",
                text: "No puedes agregar o modificar contenido mientras la preparación esté inactiva.",
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

        setEditando(
            registro
        );

        setForm({
            ...INICIAL,
            ...(registro || {}),
            duracionSegundos:
                registro
                    ?.duracionSegundos ??
                "",
            esPrincipal:
                registro
                    ?.esPrincipal === true
        });

        setErrores({});
        setModal(true);
    }

    function cerrarModal() {
        if (ocupado) {
            return;
        }

        setModal(false);
        setEditando(null);
        setForm(INICIAL);
        setErrores({});
    }

    function cambiarCampo(
        nombre,
        valor
    ) {
        setForm(
            actual => ({
                ...actual,
                [nombre]: valor
            })
        );

        setErrores(
            actual => ({
                ...actual,
                [nombre]: "",
                general: ""
            })
        );
    }

    function validar() {
        const nuevosErrores = {};

        const url =
            String(
                form[campoUrl] || ""
            ).trim();

        if (!url) {
            nuevosErrores[campoUrl] =
                esImagen
                    ? "La URL de la imagen es obligatoria."
                    : "La URL del video es obligatoria.";
        } else if (
            !PATRON_URL.test(url) ||
            !urlSegura(url)
        ) {
            nuevosErrores[campoUrl] =
                "Ingresa una URL http:// o https:// válida.";
        }

        if (!form.titulo.trim()) {
            nuevosErrores.titulo =
                "El título es obligatorio.";
        } else if (
            form.titulo.trim().length > 200
        ) {
            nuevosErrores.titulo =
                "El título no puede superar los 200 caracteres.";
        }

        if (!form.creditos.trim()) {
            nuevosErrores.creditos =
                "Los créditos son obligatorios.";
        } else if (
            form.creditos.trim().length > 250
        ) {
            nuevosErrores.creditos =
                "Los créditos no pueden superar los 250 caracteres.";
        }

        if (
            esImagen &&
            !form.textoAlternativo.trim()
        ) {
            nuevosErrores.textoAlternativo =
                "Describe la imagen para accesibilidad.";
        }

        if (
            esImagen &&
            form.textoAlternativo
                .trim()
                .length > 300
        ) {
            nuevosErrores.textoAlternativo =
                "El texto alternativo no puede superar los 300 caracteres.";
        }

        if (!esImagen) {
            for (
                const campo of [
                    "titulo",
                    "descripcion",
                    "creditos"
                ]
            ) {
                if (
                    /[<>]/.test(
                        form[campo] || ""
                    )
                ) {
                    nuevosErrores[campo] =
                        "No se permiten los caracteres < ni >.";
                }
            }

            if (
                form.duracionSegundos !== ""
            ) {
                const duracion =
                    Number(
                        form.duracionSegundos
                    );

                if (
                    !Number.isInteger(
                        duracion
                    ) ||
                    duracion < 1 ||
                    duracion > 14400
                ) {
                    nuevosErrores.duracionSegundos =
                        "Usa un número entero entre 1 y 14400 segundos.";
                }
            }
        }

        setErrores(
            nuevosErrores
        );

        return (
            Object.keys(
                nuevosErrores
            ).length === 0
        );
    }

    async function guardar(
        evento
    ) {
        evento.preventDefault();

        if (
            bloqueoRef.current ||
            !validar()
        ) {
            return;
        }

        bloqueoRef.current = true;
        setOcupado(true);

        const body = {
            titulo:
                form.titulo.trim(),
            descripcion:
                form.descripcion.trim() ||
                null,
            creditos:
                form.creditos.trim(),
            [campoUrl]:
                form[campoUrl].trim(),
            ...(esImagen
                ? {
                    textoAlternativo:
                        form.textoAlternativo
                            .trim(),
                    esPrincipal:
                        Boolean(
                            form.esPrincipal
                        )
                }
                : {
                    duracionSegundos:
                        form.duracionSegundos === ""
                            ? null
                            : Number(
                                form.duracionSegundos
                            )
                }
            )
        };

        try {
            if (editando) {
                await servicio.actualizarMedia(
                    editando[campoId],
                    tipo,
                    body
                );
            } else {
                await servicio.crearMedia(
                    idPreparacion,
                    tipo,
                    body
                );
            }

            setModal(false);
            setEditando(null);
            setForm(INICIAL);
            setErrores({});

            await cargarMedia();

            await Swal.fire({
                icon: "success",
                title:
                    editando
                        ? "Registro actualizado"
                        : "Registro guardado",
                text:
                    esImagen
                        ? "La imagen fue guardada correctamente."
                        : "El video fue guardado correctamente.",
                timer: 1600,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            const validaciones =
                error?.response?.data
                    ?.erroresValidacion ||
                {};

            setErrores({
                ...validaciones,
                general:
                    obtenerMensajeError(
                        error
                    )
            });
        } finally {
            bloqueoRef.current = false;
            setOcupado(false);
        }
    }

    async function ejecutar(
        registro,
        principal = false
    ) {
        if (
            bloqueoRef.current
        ) {
            return;
        }

        const activo =
            registroActivo(
                registro
            );

        const titulo =
            principal
                ? "¿Usar como imagen principal?"
                : activo
                    ? "¿Desactivar este registro?"
                    : "¿Reactivar este registro?";

        const texto =
            principal
                ? "Esta imagen pasará a ser la principal de la preparación."
                : activo
                    ? "El registro se conservará, pero quedará inactivo."
                    : "El registro volverá a estar disponible.";

        const respuesta =
            await Swal.fire({
                icon:
                    principal
                        ? "question"
                        : activo
                            ? "warning"
                            : "question",
                title: titulo,
                text: texto,
                showCancelButton: true,
                confirmButtonText:
                    principal
                        ? "Sí, marcar"
                        : activo
                            ? "Sí, desactivar"
                            : "Sí, reactivar",
                cancelButtonText:
                    "Cancelar",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton:
                        `flora-alert-confirm ${!principal && activo
                            ? "flora-alert-danger"
                            : ""
                        }`,
                    cancelButton:
                        "flora-alert-cancel"
                }
            });

        if (
            !respuesta.isConfirmed
        ) {
            return;
        }

        try {
            bloqueoRef.current = true;
            setOcupado(true);

            if (principal) {
                await servicio.marcarPrincipal(
                    registro[campoId]
                );
            } else if (activo) {
                await servicio.desactivarMedia(
                    registro[campoId],
                    tipo
                );
            } else {
                await servicio.activarMedia(
                    registro[campoId],
                    tipo
                );
            }

            await cargarMedia();

            await Swal.fire({
                icon: "success",
                title:
                    principal
                        ? "Imagen principal actualizada"
                        : activo
                            ? "Registro desactivado"
                            : "Registro reactivado",
                timer: 1400,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarError(
                "No se pudo completar la acción",
                error
            );
        } finally {
            bloqueoRef.current = false;
            setOcupado(false);
        }
    }

    function campo(
        nombre,
        etiqueta,
        opciones = {}
    ) {
        const {
            required = false,
            textarea = false,
            ...propiedades
        } = opciones;

        return (
            <div
                className={`mp-field ${errores[nombre]
                    ? "has-error"
                    : ""
                    }`}
            >
                <label htmlFor={`media-${nombre}`}>
                    {etiqueta}
                    {required && (
                        <span> *</span>
                    )}
                </label>

                {textarea ? (
                    <textarea
                        id={`media-${nombre}`}
                        value={
                            form[nombre] ?? ""
                        }
                        onChange={evento =>
                            cambiarCampo(
                                nombre,
                                evento.target.value
                            )
                        }
                        {...propiedades}
                    />
                ) : (
                    <input
                        id={`media-${nombre}`}
                        value={
                            form[nombre] ?? ""
                        }
                        onChange={evento =>
                            cambiarCampo(
                                nombre,
                                evento.target.value
                            )
                        }
                        {...propiedades}
                    />
                )}

                <div className="mp-field-foot">
                    <small className="mp-error">
                        {errores[nombre] || ""}
                    </small>
                </div>
            </div>
        );
    }

    return (
        <section className="mp-page">

            <div className="mp-hero">

                <div className="mp-hero-copy">

                    <span className="mp-overline">
                        Contenido / Documentación / {especie?.nombreComun || "Especie"}
                    </span>

                    <h1>
                        Multimedia de preparación
                    </h1>

                    <p>
                        Administra las imágenes y videos asociados a las preparaciones de consumo de esta especie.
                    </p>

                </div>

                <div className="mp-hero-actions">

                    <button
                        type="button"
                        className="mp-refresh"
                        onClick={() => {
                            cargarPreparaciones();

                            if (idPreparacion) {
                                cargarMedia();
                            }
                        }}
                        disabled={
                            ocupado ||
                            cargandoPreparaciones ||
                            cargandoMedia
                        }
                    >
                        <RefreshCw
                            size={17}
                            className={
                                cargandoPreparaciones ||
                                    cargandoMedia
                                    ? "mp-spin"
                                    : ""
                            }
                        />
                        Actualizar
                    </button>

                    <button
                        type="button"
                        className="mp-primary"
                        disabled={
                            !preparacion ||
                            preparacion.activa === false ||
                            cargandoMedia ||
                            ocupado
                        }
                        onClick={() =>
                            abrir()
                        }
                    >
                        <Plus size={17} />

                        {esImagen
                            ? "Nueva imagen"
                            : "Nuevo video"
                        }
                    </button>

                </div>

            </div>

            <div className="mp-species">

                <span className="mp-species-icon">
                    <Leaf size={20} />
                </span>

                <div className="mp-species-data">

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
                    <div className="mp-species-extra">

                        <small>
                            Familia
                        </small>

                        <strong>
                            {especie.familia}
                        </strong>

                    </div>
                )}

                <button
                    type="button"
                    className="mp-change-species"
                    onClick={cambiarEspecie}
                    disabled={ocupado}
                >
                    <ArrowLeft size={16} />
                    Cambiar especie
                </button>

            </div>

            <div className="mp-stats">

                <div className="mp-stat mp-stat-preparations">

                    <span className="mp-stat-icon">
                        <PlayCircle size={21} />
                    </span>

                    <div>
                        <strong>
                            {estadisticas.preparaciones}
                        </strong>

                        <span>
                            Preparaciones
                        </span>
                    </div>

                </div>

                <div className="mp-stat mp-stat-total">

                    <span className="mp-stat-icon">
                        {esImagen
                            ? <Images size={21} />
                            : <Video size={21} />
                        }
                    </span>

                    <div>
                        <strong>
                            {estadisticas.total}
                        </strong>

                        <span>
                            {esImagen
                                ? "Imágenes"
                                : "Videos"
                            }
                        </span>
                    </div>

                </div>

                <div className="mp-stat mp-stat-active">

                    <span className="mp-stat-icon">
                        <CheckCircle2 size={21} />
                    </span>

                    <div>
                        <strong>
                            {estadisticas.activos}
                        </strong>

                        <span>
                            Activos
                        </span>
                    </div>

                </div>

                <div className="mp-stat mp-stat-special">

                    <span className="mp-stat-icon">
                        {esImagen
                            ? <Star size={21} />
                            : <PlayCircle size={21} />
                        }
                    </span>

                    <div>
                        <strong>
                            {estadisticas.especial}
                        </strong>

                        <span>
                            {esImagen
                                ? "Principal"
                                : "De YouTube"
                            }
                        </span>
                    </div>

                </div>

            </div>

            <section className="mp-preparation-card">

                <div className="mp-preparation-head">

                    <div>

                        <span className="mp-kicker">
                            Preparación de consumo
                        </span>

                        <h2>
                            Selecciona una preparación
                        </h2>

                        <p>
                            El contenido multimedia quedará asociado únicamente a la preparación seleccionada.
                        </p>

                    </div>

                </div>

                <div className="mp-preparation-selector">

                    <ComboBuscable
                        id="mp-seleccion-preparacion"
                        ariaLabel="Preparación de consumo"
                        value={
                            idPreparacion
                        }
                        disabled={
                            ocupado ||
                            cargandoPreparaciones
                        }
                        onChange={evento => {
                            setIdPreparacion(
                                evento.target.value
                            );

                            setPagina(1);
                            setBusqueda("");
                            setEstado("TODOS");
                        }}
                        placeholder={
                            cargandoPreparaciones
                                ? "Cargando preparaciones..."
                                : "Selecciona una preparación..."
                        }
                        searchPlaceholder="Buscar preparación..."
                        options={preparaciones.map(item => ({
                            value: item.idPreparacion,
                            label: `${item.nombre}${item.activa === false ? " · Inactiva" : ""}`
                        }))}
                    />

                    {preparacion && (
                        <div
                            className={`mp-preparation-info ${preparacion.activa === false
                                ? "inactive"
                                : ""
                                }`}
                        >

                            <div>

                                <strong>
                                    {preparacion.nombre}
                                </strong>

                                <span>
                                    {preparacion.descripcion ||
                                        "Sin descripción"
                                    }
                                </span>

                            </div>

                            <span
                                className={`mp-preparation-status ${preparacion.activa === false
                                    ? "off"
                                    : "on"
                                    }`}
                            >
                                {preparacion.activa === false
                                    ? "Inactiva"
                                    : "Activa"
                                }
                            </span>

                        </div>
                    )}

                    {errorPreparaciones && (
                        <p className="mp-error-message">
                            {errorPreparaciones}
                        </p>
                    )}

                    {!cargandoPreparaciones &&
                        !errorPreparaciones &&
                        preparaciones.length === 0 && (
                            <div className="mp-no-preparations">

                                <PlayCircle size={28} />

                                <div>
                                    <strong>
                                        Sin preparaciones
                                    </strong>

                                    <span>
                                        Primero registra una preparación de consumo para esta especie.
                                    </span>
                                </div>

                            </div>
                        )
                    }

                </div>

            </section>

            <section className="mp-card">

                <div className="mp-card-head">

                    <div>

                        <span className="mp-kicker">
                            Contenido multimedia
                        </span>

                        <h2>
                            {esImagen
                                ? "Imágenes de preparación"
                                : "Videos de preparación"
                            }
                        </h2>

                        <p>
                            Consulta y administra el contenido asociado a la preparación seleccionada.
                        </p>

                    </div>

                </div>

                <div className="mp-toolbar">

                    <div
                        className="mp-segment"
                        aria-label="Tipo de contenido"
                    >

                        <button
                            type="button"
                            className={
                                tipo === "imagenes"
                                    ? "active"
                                    : ""
                            }
                            disabled={ocupado}
                            onClick={() =>
                                cambiarTipo(
                                    "imagenes"
                                )
                            }
                        >
                            <Image size={16} />
                            Imágenes
                        </button>

                        <button
                            type="button"
                            className={
                                tipo === "videos"
                                    ? "active"
                                    : ""
                            }
                            disabled={ocupado}
                            onClick={() =>
                                cambiarTipo(
                                    "videos"
                                )
                            }
                        >
                            <Video size={16} />
                            Videos
                        </button>

                    </div>

                    <label className="mp-search">

                        <Search size={16} />

                        <input
                            type="search"
                            placeholder="Buscar por título, descripción o créditos..."
                            value={busqueda}
                            onChange={evento => {
                                setBusqueda(
                                    evento.target.value
                                );
                                setPagina(1);
                            }}
                        />

                        {busqueda && (
                            <button
                                type="button"
                                onClick={() => {
                                    setBusqueda("");
                                    setPagina(1);
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <select
                        className="mp-filter"
                        value={estado}
                        onChange={evento => {
                            setEstado(
                                evento.target.value
                            );
                            setPagina(1);
                        }}
                    >
                        <option value="TODOS">
                            Todos los estados
                        </option>

                        <option value="ACTIVOS">
                            Activos
                        </option>

                        <option value="INACTIVOS">
                            Inactivos
                        </option>

                    </select>

                </div>

                {cargandoMedia ? (
                    <div className="mp-state">

                        <span className="mp-loader" />

                        <strong>
                            Cargando contenido...
                        </strong>

                        <p>
                            Estamos consultando los registros multimedia.
                        </p>

                    </div>
                ) : errorMedia ? (
                    <div className="mp-state">

                        <IconoTipo size={35} />

                        <strong>
                            No se pudo cargar el contenido
                        </strong>

                        <p>
                            {errorMedia}
                        </p>

                    </div>
                ) : !idPreparacion ? (
                    <div className="mp-state">

                        <PlayCircle size={35} />

                        <strong>
                            Selecciona una preparación
                        </strong>

                        <p>
                            Sus imágenes y videos aparecerán aquí.
                        </p>

                    </div>
                ) : registrosFiltrados.length === 0 ? (
                    <div className="mp-state">

                        <IconoTipo size={35} />

                        <strong>
                            No hay {esImagen
                                ? "imágenes"
                                : "videos"
                            } para mostrar
                        </strong>

                        <p>
                            {busqueda ||
                                estado !== "TODOS"
                                ? "Prueba con otros filtros."
                                : `Agrega ${esImagen
                                    ? "la primera imagen"
                                    : "el primer video"
                                } de esta preparación.`
                            }
                        </p>

                        {!busqueda &&
                            estado === "TODOS" &&
                            preparacion?.activa !== false && (
                                <button
                                    type="button"
                                    className="mp-empty-action"
                                    onClick={() =>
                                        abrir()
                                    }
                                >
                                    <Plus size={16} />

                                    {esImagen
                                        ? "Agregar imagen"
                                        : "Agregar video"
                                    }
                                </button>
                            )
                        }

                    </div>
                ) : (
                    <div className="mp-grid">

                        {registrosPagina.map(
                            registro => (
                                <article
                                    className={`mp-media ${registroActivo(
                                        registro
                                    )
                                        ? ""
                                        : "inactive"
                                        }`}
                                    key={
                                        registro[campoId]
                                    }
                                >

                                    {esImagen ? (
                                        <VistaImagen
                                            url={
                                                registro.urlImagen
                                            }
                                            alt={
                                                registro.textoAlternativo
                                            }
                                        />
                                    ) : (
                                        <VistaVideo
                                            registro={
                                                registro
                                            }
                                        />
                                    )}

                                    <div className="mp-details">

                                        <div className="mp-badges">

                                            <span
                                                className={`mp-status ${registroActivo(
                                                    registro
                                                )
                                                    ? "active"
                                                    : "inactive"
                                                    }`}
                                            >
                                                <i />

                                                {registroActivo(
                                                    registro
                                                )
                                                    ? "Activo"
                                                    : "Inactivo"
                                                }
                                            </span>

                                            {esImagen &&
                                                registro.esPrincipal && (
                                                    <span className="mp-status principal">
                                                        <Star size={12} />
                                                        Principal
                                                    </span>
                                                )
                                            }

                                        </div>

                                        <h3>
                                            {registro.titulo ||
                                                (
                                                    esImagen
                                                        ? "Imagen de preparación"
                                                        : "Video de preparación"
                                                )
                                            }
                                        </h3>

                                        {registro.descripcion && (
                                            <p>
                                                {registro.descripcion}
                                            </p>
                                        )}

                                        {registro.creditos && (
                                            <small>
                                                Créditos: {registro.creditos}
                                            </small>
                                        )}

                                        {urlSegura(
                                            registro[campoUrl]
                                        ) && (
                                                <a
                                                    className="mp-link"
                                                    href={
                                                        !esImagen
                                                            ? obtenerYoutube(
                                                                registro.urlVideo
                                                            )?.enlace ||
                                                            registro.urlVideo
                                                            : registro.urlImagen
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <ExternalLink size={14} />

                                                    {esImagen
                                                        ? "Abrir imagen"
                                                        : obtenerYoutube(
                                                            registro.urlVideo
                                                        )
                                                            ? "Abrir en YouTube"
                                                            : "Abrir video"
                                                    }
                                                </a>
                                            )}

                                        <div className="mp-actions">

                                            <button
                                                type="button"
                                                title="Editar"
                                                disabled={
                                                    ocupado ||
                                                    preparacion?.activa === false
                                                }
                                                onClick={() =>
                                                    abrir(
                                                        registro
                                                    )
                                                }
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            {esImagen && (
                                                <button
                                                    type="button"
                                                    className="principal"
                                                    title="Marcar como principal"
                                                    disabled={
                                                        ocupado ||
                                                        preparacion?.activa === false ||
                                                        !registroActivo(
                                                            registro
                                                        ) ||
                                                        registro.esPrincipal
                                                    }
                                                    onClick={() =>
                                                        ejecutar(
                                                            registro,
                                                            true
                                                        )
                                                    }
                                                >
                                                    <Star size={16} />
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className={
                                                    registroActivo(
                                                        registro
                                                    )
                                                        ? "deactivate"
                                                        : "activate"
                                                }
                                                title={
                                                    registroActivo(
                                                        registro
                                                    )
                                                        ? "Desactivar"
                                                        : "Reactivar"
                                                }
                                                disabled={
                                                    ocupado ||
                                                    (
                                                        !registroActivo(
                                                            registro
                                                        ) &&
                                                        preparacion?.activa === false
                                                    )
                                                }
                                                onClick={() =>
                                                    ejecutar(
                                                        registro
                                                    )
                                                }
                                            >
                                                <Power size={16} />
                                            </button>

                                        </div>

                                    </div>

                                </article>
                            )
                        )}

                    </div>
                )}

                {idPreparacion &&
                    !cargandoMedia &&
                    !errorMedia && (
                        <div className="mp-pagination">

                            <span>
                                {registrosFiltrados.length}{" "}
                                {esImagen
                                    ? "imágenes"
                                    : "videos"
                                }
                            </span>

                            <div>

                                <button
                                    type="button"
                                    aria-label="Página anterior"
                                    disabled={
                                        paginaActual <= 1
                                    }
                                    onClick={() =>
                                        setPagina(
                                            paginaActual - 1
                                        )
                                    }
                                >
                                    <ChevronLeft size={17} />
                                </button>

                                <span>
                                    {paginaActual} / {totalPaginas}
                                </span>

                                <button
                                    type="button"
                                    aria-label="Página siguiente"
                                    disabled={
                                        paginaActual >=
                                        totalPaginas
                                    }
                                    onClick={() =>
                                        setPagina(
                                            paginaActual + 1
                                        )
                                    }
                                >
                                    <ChevronRight size={17} />
                                </button>

                            </div>

                        </div>
                    )
                }

            </section>

            {modal &&
                createPortal(
                    <div
                        className="mp-overlay"
                        onMouseDown={evento => {
                            if (
                                evento.target ===
                                evento.currentTarget
                            ) {
                                cerrarModal();
                            }
                        }}
                    >

                        <form
                            ref={panelRef}
                            className="mp-modal"
                            role="dialog"
                            aria-modal="true"
                            onSubmit={guardar}
                            noValidate
                        >

                            <div className="mp-modal-head">

                                <span className="mp-modal-icon">
                                    <IconoTipo size={21} />
                                </span>

                                <div>

                                    <span className="mp-kicker">
                                        {preparacion?.nombre}
                                    </span>

                                    <h2>
                                        {editando
                                            ? "Editar"
                                            : "Registrar"
                                        }{" "}
                                        {esImagen
                                            ? "imagen"
                                            : "video"
                                        }
                                    </h2>

                                </div>

                                <button
                                    type="button"
                                    className="mp-modal-close"
                                    aria-label="Cerrar"
                                    disabled={ocupado}
                                    onClick={cerrarModal}
                                >
                                    <X size={19} />
                                </button>

                            </div>

                            <div className="mp-modal-body">

                                <fieldset
                                    className="mp-fields"
                                    disabled={ocupado}
                                >

                                    {errores.general && (
                                        <div className="mp-general-error">
                                            {errores.general}
                                        </div>
                                    )}

                                    {campo(
                                        campoUrl,
                                        esImagen
                                            ? "URL de la imagen"
                                            : "URL del video",
                                        {
                                            type: "url",
                                            maxLength: 1000,
                                            required: true,
                                            placeholder:
                                                esImagen
                                                    ? "https://ejemplo.com/imagen.jpg"
                                                    : "https://www.youtube.com/watch?v=..."
                                        }
                                    )}

                                    {campo(
                                        "titulo",
                                        "Título",
                                        {
                                            maxLength: 200,
                                            required: true,
                                            placeholder:
                                                esImagen
                                                    ? "Ej. Flor de izote con huevo"
                                                    : "Ej. Preparación tradicional de flor de izote"
                                        }
                                    )}

                                    {campo(
                                        "descripcion",
                                        "Descripción",
                                        {
                                            textarea: true,
                                            rows: 3,
                                            placeholder: "Describe brevemente el contenido..."
                                        }
                                    )}

                                    {esImagen ? (
                                        campo(
                                            "textoAlternativo",
                                            "Texto alternativo",
                                            {
                                                maxLength: 300,
                                                required: true,
                                                placeholder: "Describe lo que aparece en la imagen..."
                                            }
                                        )
                                    ) : (
                                        campo(
                                            "duracionSegundos",
                                            "Duración en segundos",
                                            {
                                                type: "number",
                                                min: 1,
                                                max: 14400,
                                                step: 1,
                                                placeholder: "Ej. 180"
                                            }
                                        )
                                    )}

                                    {campo(
                                        "creditos",
                                        "Créditos",
                                        {
                                            maxLength: 250,
                                            required: true,
                                            placeholder: "Ej. Fotografía propia / Canal oficial / Autor"
                                        }
                                    )}

                                    {esImagen && (
                                        <label className="mp-checkbox">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    form.esPrincipal
                                                }
                                                disabled={
                                                    editando &&
                                                    !registroActivo(
                                                        editando
                                                    )
                                                }
                                                onChange={evento =>
                                                    cambiarCampo(
                                                        "esPrincipal",
                                                        evento.target.checked
                                                    )
                                                }
                                            />

                                            <span>
                                                Usar como imagen principal
                                            </span>

                                        </label>
                                    )}

                                    <div className="mp-help">

                                        {esImagen ? (
                                            <>
                                                <Image size={16} />
                                                <span>
                                                    Utiliza una URL pública de imagen y agrega un texto alternativo descriptivo para accesibilidad.
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Video size={16} />
                                                <span>
                                                    Puedes utilizar un enlace de YouTube. Si el enlace es compatible, el video se reproducirá directamente dentro del sistema.
                                                </span>
                                            </>
                                        )}

                                    </div>

                                </fieldset>

                            </div>

                            <div className="mp-modal-footer">

                                <button
                                    type="button"
                                    className="mp-cancel"
                                    disabled={ocupado}
                                    onClick={cerrarModal}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="mp-primary"
                                    disabled={ocupado}
                                >
                                    {ocupado
                                        ? "Guardando..."
                                        : "Guardar registro"
                                    }
                                </button>

                            </div>

                        </form>

                    </div>,
                    document.body
                )
            }

        </section>
    );
}

function VistaImagen({
    url,
    alt
}) {
    const [
        urlFallida,
        setUrlFallida
    ] = useState(null);

    const [
        ampliada,
        setAmpliada
    ] = useState(false);

    if (
        urlFallida === url ||
        !urlSegura(url)
    ) {
        return (
            <div className="mp-media-placeholder">
                <Image size={36} />
                <span>
                    Imagen no disponible
                </span>
            </div>
        );
    }

    return (
        <div className="mp-image-wrap">

            <img
                className="mp-image"
                src={url}
                alt={
                    alt ||
                    "Imagen de preparación"
                }
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() =>
                    setUrlFallida(
                        url
                    )
                }
            />

            <button
                type="button"
                className="mp-expand-image"
                title="Ver imagen completa"
                aria-label="Ampliar imagen"
                onClick={() =>
                    setAmpliada(true)
                }
            >
                <Maximize2 size={18} />
            </button>

            {ampliada && (
                <ImagenAmpliada
                    url={url}
                    alt={alt}
                    cerrar={() =>
                        setAmpliada(false)
                    }
                />
            )}

        </div>
    );
}

function ImagenAmpliada({
    url,
    alt,
    cerrar
}) {
    const dialogo =
        useRef(null);

    useEffect(() => {
        const focoAnterior =
            document.activeElement;

        const overflowAnterior =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        dialogo.current
            ?.showModal();

        return () => {
            document.body.style.overflow =
                overflowAnterior;

            focoAnterior?.focus();
        };
    }, []);

    return (
        <dialog
            ref={dialogo}
            className="mp-image-dialog"
            aria-label="Imagen completa"
            onCancel={cerrar}
            onClose={cerrar}
            onClick={evento => {
                if (
                    evento.target ===
                    evento.currentTarget
                ) {
                    cerrar();
                }
            }}
        >
            <div className="mp-image-viewer">

                <button
                    type="button"
                    className="mp-close-image"
                    title="Cerrar imagen"
                    aria-label="Cerrar imagen ampliada"
                    onClick={cerrar}
                >
                    <X size={20} />
                </button>

                <img
                    src={url}
                    alt={
                        alt ||
                        "Imagen de preparación"
                    }
                    referrerPolicy="no-referrer"
                />

            </div>

        </dialog>
    );
}

function VistaVideo({
    registro
}) {
    const youtube =
        obtenerYoutube(
            registro.urlVideo
        );

    if (youtube) {
        return (
            <div className="mp-youtube-player">

                <iframe
                    src={
                        youtube.reproductor
                    }
                    title={
                        registro.titulo ||
                        "Video de preparación en YouTube"
                    }
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />

            </div>
        );
    }

    return (
        <div className="mp-media-placeholder">

            <Video size={40} />

            <span>
                {registro.duracionSegundos
                    ? `${Math.floor(
                        registro.duracionSegundos /
                        60
                    )}:${String(
                        registro.duracionSegundos %
                        60
                    ).padStart(
                        2,
                        "0"
                    )}`
                    : "Video de preparación"
                }
            </span>

        </div>
    );
}

export default MultimediaPreparacion;