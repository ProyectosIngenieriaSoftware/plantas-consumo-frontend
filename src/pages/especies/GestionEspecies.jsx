import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    Search,
    RefreshCcw,
    FilePenLine,
    CheckCircle2,
    Send,
    Eye,
    XCircle,
    Upload,
    Leaf,
    ClipboardCheck,
    BadgeCheck,
    FileSearch,
    Ban,
    Power,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ArrowRight,
    MousePointerClick,
    Video,
    ImagePlus
} from "lucide-react";
import { API_URL } from "../../config";
import { activarEspecie } from "../../api/especieService";
import ImagenEspecie from "../../components/especies/ImagenEspecie";
import useImagenesPrincipales from "../../hooks/useImagenesPrincipales";
import "../../styles/gestionEspecies.css";
import "../../styles/imagenEspecie.css";
import "../../styles/alertas.css";

const ID_VALIDADOR = Number(import.meta.env.VITE_USUARIO_ID || 1);
const ID_PUBLICADOR = Number(import.meta.env.VITE_USUARIO_ID || 1);

const OPCIONES_POR_PAGINA = [6, 12, 18];
const POR_PAGINA_INICIAL = 6;

const ESTADOS = {
    BORRADOR: "Borrador",
    EN_REVISION: "En revisión",
    PUBLICADA: "Publicada",
    RECHAZADA: "Rechazada"
};

const MODULOS_CONTENIDO = {
    "partes-comestibles": {
        titulo: "Partes comestibles",
        categoria: "Alimentación",
        ruta: id => `/especies/${id}/contenido/partes-comestibles`
    },
    "aportes-nutricionales": {
        titulo: "Aportes nutricionales",
        categoria: "Alimentación",
        ruta: id => `/especies/${id}/aportes-nutricionales`
    },
    beneficios: {
        titulo: "Beneficios por parte",
        categoria: "Alimentación",
        ruta: id => `/especies/${id}/parte-beneficios`
    },
    preparaciones: {
        titulo: "Preparaciones",
        categoria: "Alimentación",
        ruta: id => `/especies/${id}/preparaciones-consumo`
    },
    cosecha: {
        titulo: "Épocas de cosecha",
        categoria: "Alimentación",
        ruta: id => `/especies/${id}/epocas-cosecha`
    },
    habitats: {
        titulo: "Hábitats de especie",
        categoria: "Entorno",
        ruta: id => `/especies/${id}/habitats`
    },
    fuentes: {
        titulo: "Fuentes de especie",
        categoria: "Documentación",
        ruta: id => `/especies/${id}/fuentes`
    },
    imagenes: {
        titulo: "Imágenes de especie",
        categoria: "Documentación",
        ruta: id => `/especies/${id}/imagenes`
    },
    videos: {
        titulo: "Videos de especie",
        categoria: "Documentación",
        ruta: id => `/especies/${id}/videos`
    },
    "multimedia-preparacion": {
        titulo: "Multimedia de preparación",
        categoria: "Documentación",
        ruta: id => `/especies/${id}/multimedia-preparacion`
    },
    ubicaciones: {
        titulo: "Ubicaciones",
        categoria: "Entorno",
        ruta: id => `/especies/${id}/ubicaciones`
    }
};

const esc = v =>
    String(v ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

function estaValidada(especie) {
    return especie?.validadaPor != null ||
        especie?.fechaValidacion != null;
}

function etiquetaEstado(especie) {
    const estado = especie?.estadoPublicacion;

    if (
        estado === "EN_REVISION" &&
        estaValidada(especie)
    ) {
        return "Validada";
    }

    return ESTADOS[estado] ||
        estado ||
        "Sin estado";
}

function claseEstado(especie) {
    const estado = especie?.estadoPublicacion;

    if (
        estado === "EN_REVISION" &&
        estaValidada(especie)
    ) {
        return "validada";
    }

    return String(estado || "")
        .toLowerCase();
}

function GestionEspecies() {
    const navigate = useNavigate();
    const location = useLocation();

    const moduloClave =
        location.state?.abrirContenido ||
        null;

    const moduloActual =
        moduloClave
            ? MODULOS_CONTENIDO[moduloClave]
            : null;

    const modoSeleccion =
        Boolean(moduloActual);

    const [especies, setEspecies] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [accionando, setAccionando] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [filtroActivo, setFiltroActivo] = useState("todas");
    const [etapa, setEtapa] = useState("revision");

    const [pagina, setPagina] = useState(1);
    const [porPagina, setPorPagina] = useState(POR_PAGINA_INICIAL);

    const imagenesPrincipales =
        useImagenesPrincipales(especies);

    useEffect(() => {
        cargarEspecies();
    }, []);

    useEffect(() => {
        if (modoSeleccion) {
            setFiltroActivo("activas");
        }
    }, [
        modoSeleccion,
        moduloClave
    ]);

    useEffect(() => {
        setPagina(1);
    }, [
        busqueda,
        filtroActivo,
        etapa,
        moduloClave,
        modoSeleccion,
        porPagina
    ]);

    async function cargarEspecies() {
        try {
            setCargando(true);

            const { data } = await axios.get(
                `${API_URL}/api/especies`
            );

            setEspecies(
                Array.isArray(data)
                    ? data
                    : []
            );
        } catch (error) {
            mostrarError(
                "No se pudieron cargar las especies",
                error
            );
        } finally {
            setCargando(false);
        }
    }

    function obtenerMensajeError(error) {
        const data =
            error?.response?.data;

        if (!data) {
            return "Ocurrió un error inesperado.";
        }

        if (typeof data === "string") {
            return esc(data);
        }

        if (data.mensaje) {
            return esc(data.mensaje);
        }

        if (data.message) {
            return esc(data.message);
        }

        if (
            Array.isArray(
                data.erroresValidacion
            ) &&
            data.erroresValidacion.length
        ) {
            return data.erroresValidacion
                .map(esc)
                .join("<br>");
        }

        if (
            data.erroresValidacion &&
            typeof data.erroresValidacion === "object"
        ) {
            return Object
                .values(data.erroresValidacion)
                .flat()
                .map(esc)
                .join("<br>");
        }

        if (data.error) {
            return esc(data.error);
        }

        return "Ocurrió un error inesperado.";
    }

    function mostrarError(titulo, error) {
        Swal.fire({
            icon: "error",
            title: titulo,
            html: obtenerMensajeError(error),
            confirmButtonText: "Entendido",
            buttonsStyling: false,
            customClass: {
                popup: "flora-alert",
                confirmButton: "flora-alert-confirm"
            }
        });
    }

    function mostrarExito(titulo, texto) {
        Swal.fire({
            icon: "success",
            title: titulo,
            text: texto,
            timer: 1800,
            timerProgressBar: true,
            showConfirmButton: false,
            customClass: {
                popup: "flora-alert"
            }
        });
    }

    function nombreComunPrincipal(especie) {
        if (!Array.isArray(especie?.nombresComunes)) {
            return "Sin nombre común";
        }

        const principal =
            especie.nombresComunes.find(
                nombre =>
                    (
                        nombre.esPrincipal === true ||
                        nombre.principal === true
                    ) &&
                    nombre.activo !== false
            );

        return principal?.nombre ||
            especie.nombresComunes[0]?.nombre ||
            "Sin nombre común";
    }

    function taxonomiaResumen(especie) {
        return {
            familia:
                especie?.taxonomia?.familia ||
                "Sin familia",

            genero:
                especie?.taxonomia?.genero ||
                "Sin género"
        };
    }

    function coincideBusqueda(especie) {
        const texto =
            busqueda
                .trim()
                .toLowerCase();

        if (!texto) {
            return true;
        }

        const nombres =
            Array.isArray(
                especie?.nombresComunes
            )
                ? especie.nombresComunes
                    .map(
                        nombre =>
                            `${nombre.nombre || ""} ${nombre.region || ""}`
                    )
                    .join(" ")
                : "";

        const base = [
            especie.nombreCientifico,
            especie.descripcion,
            especie.origen,
            especie?.taxonomia?.familia,
            especie?.taxonomia?.genero,
            nombres
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return base.includes(texto);
    }

    function coincideActivo(especie) {
        if (filtroActivo === "todas") {
            return true;
        }

        if (filtroActivo === "activas") {
            return especie?.activa === true;
        }

        if (filtroActivo === "inactivas") {
            return especie?.activa === false;
        }

        return true;
    }

    const especiesFiltradas =
        useMemo(
            () => especies.filter(
                especie =>
                    coincideBusqueda(especie) &&
                    coincideActivo(especie)
            ),
            [
                especies,
                busqueda,
                filtroActivo
            ]
        );

    const revision =
        useMemo(
            () => especiesFiltradas.filter(
                especie =>
                    especie.estadoPublicacion === "BORRADOR" ||
                    especie.estadoPublicacion === "RECHAZADA"
            ),
            [especiesFiltradas]
        );

    const validacion =
        useMemo(
            () => especiesFiltradas.filter(
                especie =>
                    especie.estadoPublicacion === "EN_REVISION" &&
                    !estaValidada(especie)
            ),
            [especiesFiltradas]
        );

    const publicacion =
        useMemo(
            () => especiesFiltradas.filter(
                especie =>
                    especie.estadoPublicacion === "EN_REVISION" &&
                    estaValidada(especie)
            ),
            [especiesFiltradas]
        );

    const publicadas =
        useMemo(
            () => especiesFiltradas.filter(
                especie =>
                    especie.estadoPublicacion === "PUBLICADA"
            ),
            [especiesFiltradas]
        );

    async function confirmarAccion({
        titulo,
        texto,
        boton,
        callback,
        exitoTitulo,
        exitoTexto,
        peligro = false
    }) {
        const resultado =
            await Swal.fire({
                icon: peligro
                    ? "warning"
                    : "question",

                title: titulo,
                html: texto,

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

        if (!resultado.isConfirmed) {
            return false;
        }

        try {
            setAccionando(true);

            await callback();
            await cargarEspecies();

            mostrarExito(
                exitoTitulo,
                exitoTexto
            );

            return true;
        } catch (error) {
            mostrarError(
                "No se pudo completar la acción",
                error
            );

            return false;
        } finally {
            setAccionando(false);
        }
    }

    async function enviarRevision(especie) {
        const ok =
            await confirmarAccion({
                titulo: "Enviar a revisión",

                texto:
                    `La especie <em class="gf-scientific-inline">${esc(especie.nombreCientifico)}</em> será enviada a revisión.`,

                boton: "Enviar",

                callback: () =>
                    axios.patch(
                        `${API_URL}/api/especies/${especie.idEspecie}/enviar-revision`
                    ),

                exitoTitulo: "Enviada a revisión",

                exitoTexto:
                    "La especie ahora está pendiente de validación."
            });

        if (ok) {
            setEtapa("validacion");
        }
    }

    async function validarEspecie(especie) {
        const ok =
            await confirmarAccion({
                titulo: "Validar especie",

                texto:
                    `¿Confirmas que <em class="gf-scientific-inline">${esc(especie.nombreCientifico)}</em> cumple los requisitos?`,

                boton: "Validar",

                callback: () =>
                    axios.patch(
                        `${API_URL}/api/especies/${especie.idEspecie}/validar`,
                        null,
                        {
                            params: {
                                idValidador: ID_VALIDADOR
                            }
                        }
                    ),

                exitoTitulo: "Especie validada",

                exitoTexto:
                    "La ficha quedó lista para publicación."
            });

        if (ok) {
            setEtapa("publicacion");
        }
    }

    async function publicarEspecie(especie) {
        await confirmarAccion({
            titulo: "Publicar especie",

            texto:
                `<em class="gf-scientific-inline">${esc(especie.nombreCientifico)}</em> será visible en el catálogo público.`,

            boton: "Publicar",

            callback: () =>
                axios.patch(
                    `${API_URL}/api/especies/${especie.idEspecie}/publicar`,
                    null,
                    {
                        params: {
                            idPublicador: ID_PUBLICADOR
                        }
                    }
                ),

            exitoTitulo: "Especie publicada",

            exitoTexto:
                "La especie ya está disponible en el catálogo."
        });
    }

    async function rechazarEspecie(especie) {
        const ok =
            await confirmarAccion({
                titulo: "Rechazar especie",

                texto:
                    `La ficha <em class="gf-scientific-inline">${esc(especie.nombreCientifico)}</em> será rechazada.`,

                boton: "Rechazar",
                peligro: true,

                callback: () =>
                    axios.patch(
                        `${API_URL}/api/especies/${especie.idEspecie}/rechazar`
                    ),

                exitoTitulo: "Ficha rechazada",

                exitoTexto:
                    "La especie deberá volver al proceso de revisión."
            });

        if (ok) {
            setEtapa("revision");
        }
    }

    async function desactivarEspecie(especie) {
        await confirmarAccion({
            titulo: "Dar de baja",

            texto:
                `La especie <em class="gf-scientific-inline">${esc(especie.nombreCientifico)}</em> quedará inactiva.`,

            boton: "Desactivar",
            peligro: true,

            callback: () =>
                axios.delete(
                    `${API_URL}/api/especies/${especie.idEspecie}`
                ),

            exitoTitulo: "Especie desactivada",

            exitoTexto:
                "La especie quedó inactiva."
        });
    }

    async function reactivarEspecie(especie) {
        await confirmarAccion({
            titulo: "Reactivar especie",

            texto:
                `La especie <em class="gf-scientific-inline">${esc(especie.nombreCientifico)}</em> volverá a estar activa.`,

            boton: "Reactivar",

            callback: () =>
                activarEspecie(especie.idEspecie),

            exitoTitulo: "Especie reactivada",

            exitoTexto:
                "La especie volvió a estar activa."
        });
    }

    function volverContenido() {
        const categoria =
            location.state?.categoria;

        if (categoria === "alimentacion") {
            navigate(
                "/contenido-especies/alimentacion"
            );
            return;
        }

        if (categoria === "entorno") {
            navigate(
                "/contenido-especies/entorno"
            );
            return;
        }

        if (categoria === "documentacion") {
            navigate(
                "/contenido-especies/documentacion"
            );
            return;
        }

        navigate(
            "/gestion-especies"
        );
    }

    function seleccionarEspecie(especie) {
        if (especie?.activa !== true) {
            Swal.fire({
                icon: "warning",

                title: "Especie inactiva",

                text:
                    "Solo puedes seleccionar una especie activa.",

                confirmButtonText: "Entendido",

                buttonsStyling: false,

                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                }
            });

            return;
        }

        const id =
            especie.idEspecie;

        const datosEspecie = {
            idEspecie: id,

            nombreCientifico:
                especie.nombreCientifico,

            nombreComun:
                nombreComunPrincipal(especie),

            familia:
                especie?.taxonomia?.familia ||
                null,

            genero:
                especie?.taxonomia?.genero ||
                null,

            activa:
                especie.activa
        };

        if (moduloActual?.ruta) {
            navigate(
                moduloActual.ruta(id),
                {
                    state: {
                        especie: datosEspecie,
                        modulo: moduloActual.titulo,
                        categoria:
                            location.state?.categoria
                    }
                }
            );

            return;
        }

        Swal.fire({
            icon: "info",

            title: "Módulo pendiente",

            text:
                `${moduloActual?.titulo || "Este módulo"} todavía no ha sido integrado.`,

            confirmButtonText: "Entendido",

            buttonsStyling: false,

            customClass: {
                popup: "flora-alert",
                confirmButton: "flora-alert-confirm"
            }
        });
    }

    function datosNavegacionEspecie(especie) {
        return {
            idEspecie:
                especie.idEspecie,

            nombreCientifico:
                especie.nombreCientifico,

            nombreComun:
                nombreComunPrincipal(especie),

            familia:
                especie?.taxonomia?.familia ||
                null,

            genero:
                especie?.taxonomia?.genero ||
                null,

            activa:
                especie.activa
        };
    }

    function abrirImagenes(especie) {
        navigate(
            `/especies/${especie.idEspecie}/imagenes`,
            {
                state: {
                    especie:
                        datosNavegacionEspecie(especie),

                    modulo:
                        "Imágenes de especie",

                    categoria:
                        "documentacion"
                }
            }
        );
    }

    function abrirVideos(especie) {
        navigate(
            `/especies/${especie.idEspecie}/videos`,
            {
                state: {
                    especie:
                        datosNavegacionEspecie(especie),

                    modulo:
                        "Videos de especie",

                    categoria:
                        "documentacion"
                }
            }
        );
    }

    function verDetalle(especie) {
        const principal =
            imagenesPrincipales[
            especie.idEspecie
            ];

        const fila = (
            titulo,
            valor
        ) => `
            <div class="gf-det-row">
                <span>${esc(titulo)}</span>
                <strong>${esc(valor)}</strong>
            </div>
        `;

        const bloque = (
            titulo,
            valor
        ) => `
            <div class="gf-det-block">
                <h5>${esc(titulo)}</h5>
                <p>${esc(valor)}</p>
            </div>
        `;

        const nombres =
            Array.isArray(
                especie?.nombresComunes
            ) &&
                especie.nombresComunes.length
                ? especie.nombresComunes
                    .map(
                        nombre => `
                            <div class="gf-det-name ${nombre.esPrincipal
                                ? "principal"
                                : ""
                            }">
                                <div>
                                    <strong>
                                        ${esc(nombre.nombre)}
                                    </strong>

                                    <span>
                                        ${esc(
                                nombre.region ||
                                "Sin región"
                            )}
                                    </span>
                                </div>

                                ${nombre.esPrincipal
                                ? "<em>Principal</em>"
                                : ""
                            }
                            </div>
                        `
                    )
                    .join("")
                : `
                    <p class="gf-det-none">
                        Sin nombres comunes
                    </p>
                `;

        Swal.fire({
            title: esc(
                especie.nombreCientifico ||
                "Detalle de especie"
            ),

            html: `
                <div class="detalle-especie-modal">

                    ${principal?.urlImagen
                    ? `
                                <div class="gf-detail-image-wrapper">

                                    <img
                                        class="gf-image-detail"
                                        src="${esc(
                        principal.urlImagen
                    )}"
                                        alt="${esc(
                        principal.textoAlternativo ||
                        especie.nombreCientifico ||
                        "Imagen de especie"
                    )}"
                                    >

                                    <span class="gf-detail-image-label">
                                        Imagen principal
                                    </span>

                                </div>
                            `
                    : `
                                <div class="gf-detail-no-image">
                                    Sin imagen principal
                                </div>
                            `
                }

                    <div class="gf-det-top">

                        <span class="gf-badge gf-st-${claseEstado(
                    especie
                )}">
                            ${esc(
                    etiquetaEstado(especie)
                )}
                        </span>

                        <span class="gf-avail ${especie.activa
                    ? "on"
                    : "off"
                }">
                            <i></i>

                            ${especie.activa
                    ? "Activa"
                    : "Inactiva"
                }
                        </span>

                    </div>

                    <div class="gf-det-grid">

                        ${fila(
                    "Nombre común principal",
                    nombreComunPrincipal(especie)
                )}

                        ${fila(
                    "Origen",
                    especie.origen ||
                    "No registrado"
                )}

                        ${fila(
                    "Familia",
                    especie?.taxonomia?.familia ||
                    "No registrada"
                )}

                        ${fila(
                    "Género",
                    especie?.taxonomia?.genero ||
                    "No registrado"
                )}

                    </div>

                    ${bloque(
                    "Descripción",
                    especie.descripcion ||
                    "Sin descripción"
                )}

                    ${bloque(
                    "Propiedades",
                    especie.propiedades ||
                    "No registradas"
                )}

                    ${bloque(
                    "Importancia cultural",
                    especie.importanciaCultural ||
                    "No registrada"
                )}

                    ${bloque(
                    "Advertencias",
                    especie.advertencias ||
                    "No registradas"
                )}

                    <div class="gf-det-block">

                        <h5>
                            Nombres comunes
                        </h5>

                        <div class="gf-det-names">
                            ${nombres}
                        </div>

                    </div>

                </div>
            `,

            width: 760,

            confirmButtonText: "Cerrar",

            buttonsStyling: false,

            customClass: {
                popup:
                    "flora-alert flora-alert-detail",

                confirmButton:
                    "flora-alert-confirm",

                title:
                    "gf-scientific-alert-title"
            }
        });
    }

    function tarjeta(especie, tipo) {
        const comun =
            nombreComunPrincipal(especie);

        const {
            familia,
            genero
        } = taxonomiaResumen(especie);

        return (
            <article
                key={especie.idEspecie}
                className={`gf-card ${especie.activa
                        ? ""
                        : "gf-card-off"
                    }`}
            >

                <div className="gf-card-content">

                    <div className="gf-card-media">

                        <ImagenEspecie
                            imagen={
                                imagenesPrincipales[
                                especie.idEspecie
                                ]
                            }
                            nombre={
                                especie.nombreCientifico
                            }
                            className="gf-species-image"
                            fallback={
                                <div className="gf-card-placeholder">
                                    <Leaf size={30} />
                                </div>
                            }
                        />

                    </div>

                    <div className="gf-card-info">

                        <div className="gf-card-top">

                            <div className="gf-card-main">

                                <h4 className="gf-scientific-name">
                                    {especie.nombreCientifico}
                                </h4>

                                <p>
                                    {comun}
                                </p>

                            </div>

                            <span
                                className={`gf-badge gf-st-${claseEstado(
                                    especie
                                )}`}
                            >
                                {etiquetaEstado(especie)}
                            </span>

                        </div>

                        <div className="gf-tags">

                            <span>
                                <b>
                                    Familia
                                </b>

                                {familia}
                            </span>

                            <span>
                                <b>
                                    Género
                                </b>

                                {genero}
                            </span>

                            <span
                                className={`gf-avail ${especie.activa
                                        ? "on"
                                        : "off"
                                    }`}
                            >
                                <i />

                                {especie.activa
                                    ? "Activa"
                                    : "Inactiva"
                                }
                            </span>

                        </div>

                        <p className="gf-card-desc">
                            {especie.descripcion ||
                                "Sin descripción."
                            }
                        </p>

                    </div>

                </div>

                <div className="gf-actions gf-actions-images">

                    <button
                        type="button"
                        className="gf-btn gf-btn-view"
                        onClick={() =>
                            verDetalle(especie)
                        }
                    >
                        <Eye size={16} />
                        Ver ficha
                    </button>

                    {tipo !== "seleccion" &&
                        especie.activa && (
                            <>
                                <button
                                    type="button"
                                    className="gf-btn gf-btn-video"
                                    onClick={() =>
                                        abrirVideos(especie)
                                    }
                                    title="Gestionar videos de la especie"
                                >
                                    <Video size={16} />
                                    Videos
                                </button>

                                <button
                                    type="button"
                                    className="gf-btn gf-btn-image"
                                    onClick={() =>
                                        abrirImagenes(especie)
                                    }
                                    title="Gestionar imágenes de la especie"
                                >
                                    <ImagePlus size={16} />
                                    Imágenes
                                </button>
                            </>
                        )
                    }

                    {tipo === "seleccion" && (
                        <button
                            type="button"
                            className="gf-btn gf-btn-primary gf-btn-main"
                            disabled={!especie.activa}
                            onClick={() =>
                                seleccionarEspecie(especie)
                            }
                        >
                            Seleccionar
                            <ArrowRight size={16} />
                        </button>
                    )}

                    {tipo === "revision" &&
                        especie.activa && (
                            <>
                                <button
                                    type="button"
                                    className="gf-btn gf-btn-primary gf-btn-main"
                                    disabled={accionando}
                                    onClick={() =>
                                        enviarRevision(especie)
                                    }
                                >
                                    <Send size={16} />
                                    Enviar a revisión
                                </button>

                                <button
                                    type="button"
                                    className="gf-btn gf-btn-danger-soft"
                                    disabled={accionando}
                                    onClick={() =>
                                        desactivarEspecie(especie)
                                    }
                                >
                                    <Ban size={16} />
                                    Dar de baja
                                </button>
                            </>
                        )
                    }

                    {tipo === "validacion" &&
                        especie.activa && (
                            <>
                                <button
                                    type="button"
                                    className="gf-btn gf-btn-success gf-btn-main"
                                    disabled={accionando}
                                    onClick={() =>
                                        validarEspecie(especie)
                                    }
                                >
                                    <CheckCircle2 size={16} />
                                    Validar especie
                                </button>

                                <button
                                    type="button"
                                    className="gf-btn gf-btn-danger"
                                    disabled={accionando}
                                    onClick={() =>
                                        rechazarEspecie(especie)
                                    }
                                >
                                    <XCircle size={16} />
                                    Rechazar
                                </button>
                            </>
                        )
                    }

                    {tipo === "publicacion" &&
                        especie.activa && (
                            <>
                                <button
                                    type="button"
                                    className="gf-btn gf-btn-publish gf-btn-main"
                                    disabled={accionando}
                                    onClick={() =>
                                        publicarEspecie(especie)
                                    }
                                >
                                    <Upload size={16} />
                                    Publicar especie
                                </button>

                                <button
                                    type="button"
                                    className="gf-btn gf-btn-danger"
                                    disabled={accionando}
                                    onClick={() =>
                                        rechazarEspecie(especie)
                                    }
                                >
                                    <XCircle size={16} />
                                    Rechazar
                                </button>
                            </>
                        )
                    }

                    {!especie.activa && (
                        <button
                            type="button"
                            className="gf-btn gf-btn-success gf-btn-main"
                            disabled={accionando}
                            onClick={() =>
                                reactivarEspecie(especie)
                            }
                        >
                            <Power size={16} />
                            Reactivar especie
                        </button>
                    )}

                </div>

            </article>
        );
    }

    const configuracion = {
        revision: {
            titulo: "Revisión",

            subtitulo:
                "Especies nuevas o rechazadas que deben enviarse a revisión.",

            paso: "Paso 1",

            icono: FilePenLine,

            lista: revision,

            vacio:
                "No hay especies pendientes de revisión."
        },

        validacion: {
            titulo: "Validación",

            subtitulo:
                "Especies revisadas que están pendientes de validación.",

            paso: "Paso 2",

            icono: CheckCircle2,

            lista: validacion,

            vacio:
                "No hay especies pendientes de validación."
        },

        publicacion: {
            titulo: "Publicación",

            subtitulo:
                "Especies validadas y listas para publicar en el catálogo.",

            paso: "Paso 3",

            icono: Upload,

            lista: publicacion,

            vacio:
                "No hay especies listas para publicar."
        }
    };

    const actual =
        configuracion[etapa];

    const IconoActual =
        actual.icono;

    const listaPaginable =
        modoSeleccion
            ? especiesFiltradas
            : actual.lista;

    const totalRegistros =
        listaPaginable.length;

    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                totalRegistros / porPagina
            )
        );

    const paginaActual =
        Math.min(
            pagina,
            totalPaginas
        );

    const indiceInicial =
        (paginaActual - 1) * porPagina;

    const indiceFinal =
        Math.min(
            indiceInicial + porPagina,
            totalRegistros
        );

    const listaVisible =
        listaPaginable.slice(
            indiceInicial,
            indiceFinal
        );

    function irPagina(nuevaPagina) {
        const destino =
            Math.min(
                Math.max(
                    nuevaPagina,
                    1
                ),
                totalPaginas
            );

        setPagina(destino);
    }

    return (
        <section className="gf-page">

            <div className="gf-hero">

                <div>

                    <span className="gf-overline">
                        {modoSeleccion
                            ? `Contenido / ${moduloActual.categoria}`
                            : "Gestión / Flujo editorial"
                        }
                    </span>

                    <h1>
                        {modoSeleccion
                            ? "Seleccionar especie"
                            : "Gestión de especies"
                        }
                    </h1>

                    <p>
                        {modoSeleccion
                            ? `Selecciona la especie en la que deseas administrar ${moduloActual.titulo.toLowerCase()}.`
                            : "El proceso se administra de forma independiente en revisión, validación y publicación."
                        }
                    </p>

                </div>

                <button
                    type="button"
                    className="gf-refresh"
                    onClick={cargarEspecies}
                    disabled={
                        cargando ||
                        accionando
                    }
                >
                    <RefreshCcw
                        size={17}
                        className={
                            cargando
                                ? "gf-spin"
                                : ""
                        }
                    />

                    Actualizar
                </button>

            </div>

            {!modoSeleccion && (
                <>
                    <div className="gf-stats">

                        <button
                            type="button"
                            className={`gf-stat gf-stat-1 ${etapa === "revision"
                                    ? "gf-stat-selected"
                                    : ""
                                }`}
                            onClick={() =>
                                setEtapa("revision")
                            }
                        >

                            <span className="gf-stat-icon">
                                <FileSearch size={22} />
                            </span>

                            <div>
                                <strong>
                                    {revision.length}
                                </strong>

                                <span>
                                    Pendientes de revisión
                                </span>
                            </div>

                        </button>

                        <button
                            type="button"
                            className={`gf-stat gf-stat-2 ${etapa === "validacion"
                                    ? "gf-stat-selected"
                                    : ""
                                }`}
                            onClick={() =>
                                setEtapa("validacion")
                            }
                        >

                            <span className="gf-stat-icon">
                                <ClipboardCheck size={22} />
                            </span>

                            <div>
                                <strong>
                                    {validacion.length}
                                </strong>

                                <span>
                                    Pendientes de validar
                                </span>
                            </div>

                        </button>

                        <button
                            type="button"
                            className={`gf-stat gf-stat-3 ${etapa === "publicacion"
                                    ? "gf-stat-selected"
                                    : ""
                                }`}
                            onClick={() =>
                                setEtapa("publicacion")
                            }
                        >

                            <span className="gf-stat-icon">
                                <BadgeCheck size={22} />
                            </span>

                            <div>
                                <strong>
                                    {publicacion.length}
                                </strong>

                                <span>
                                    Listas para publicar
                                </span>
                            </div>

                        </button>

                        <div className="gf-stat gf-stat-4">

                            <span className="gf-stat-icon">
                                <Upload size={22} />
                            </span>

                            <div>
                                <strong>
                                    {publicadas.length}
                                </strong>

                                <span>
                                    Publicadas
                                </span>
                            </div>

                        </div>

                    </div>

                    <div className="gf-stage-nav">

                        <button
                            type="button"
                            className={
                                etapa === "revision"
                                    ? "on revision"
                                    : "revision"
                            }
                            onClick={() =>
                                setEtapa("revision")
                            }
                        >
                            <span>1</span>

                            <div>
                                <strong>
                                    Revisión
                                </strong>

                                <small>
                                    Revisar fichas
                                </small>
                            </div>
                        </button>

                        <ChevronRight size={20} />

                        <button
                            type="button"
                            className={
                                etapa === "validacion"
                                    ? "on validacion"
                                    : "validacion"
                            }
                            onClick={() =>
                                setEtapa("validacion")
                            }
                        >
                            <span>2</span>

                            <div>
                                <strong>
                                    Validación
                                </strong>

                                <small>
                                    Aprobar información
                                </small>
                            </div>
                        </button>

                        <ChevronRight size={20} />

                        <button
                            type="button"
                            className={
                                etapa === "publicacion"
                                    ? "on publicacion"
                                    : "publicacion"
                            }
                            onClick={() =>
                                setEtapa("publicacion")
                            }
                        >
                            <span>3</span>

                            <div>
                                <strong>
                                    Publicación
                                </strong>

                                <small>
                                    Publicar catálogo
                                </small>
                            </div>
                        </button>

                    </div>
                </>
            )}

            {modoSeleccion && (
                <section className="gf-single-stage gf-single-revision">

                    <div className="gf-single-head">

                        <span className="gf-col-icon">
                            <MousePointerClick size={22} />
                        </span>

                        <div>
                            <small>
                                Contenido seleccionado
                            </small>

                            <h2>
                                {moduloActual.titulo}
                            </h2>

                            <p>
                                Selecciona una especie activa para continuar.
                            </p>
                        </div>

                        <strong className="gf-single-count">
                            {
                                especiesFiltradas.filter(
                                    especie =>
                                        especie.activa === true
                                ).length
                            }
                        </strong>

                    </div>

                </section>
            )}

            <div className="gf-toolbar">

                {modoSeleccion && (
                    <button
                        type="button"
                        className="gf-btn gf-btn-view"
                        onClick={volverContenido}
                    >
                        <ArrowLeft size={16} />
                        Volver
                    </button>
                )}

                <label className="gf-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Buscar especie, nombre común, género o familia..."
                        value={busqueda}
                        onChange={
                            evento =>
                                setBusqueda(
                                    evento.target.value
                                )
                        }
                    />

                </label>

                <div className="gf-filtros">

                    {[
                        ["todas", "Todas"],
                        ["activas", "Activas"],
                        ["inactivas", "Inactivas"]
                    ].map(
                        ([valor, texto]) => (
                            <button
                                key={valor}
                                type="button"
                                className={
                                    filtroActivo === valor
                                        ? "on"
                                        : ""
                                }
                                onClick={() =>
                                    setFiltroActivo(valor)
                                }
                            >
                                {texto}
                            </button>
                        )
                    )}

                </div>

            </div>

            {cargando ? (
                <div className="gf-empty">

                    <span className="gf-loader" />

                    <h3>
                        Cargando especies...
                    </h3>

                    <p>
                        Espera un momento mientras consultamos la información.
                    </p>

                </div>
            ) : modoSeleccion ? (
                <section className="gf-single-stage gf-single-revision">

                    <div className="gf-single-body">

                        {especiesFiltradas.length === 0 ? (
                            <div className="gf-col-empty">

                                <Leaf size={28} />

                                <span>
                                    No se encontraron especies.
                                </span>

                            </div>
                        ) : (
                            <div className="gf-card-grid">

                                {listaVisible.map(
                                    especie =>
                                        tarjeta(
                                            especie,
                                            "seleccion"
                                        )
                                )}

                            </div>
                        )}

                    </div>

                </section>
            ) : (
                <section
                    className={`gf-single-stage gf-single-${etapa}`}
                >

                    <div className="gf-single-head">

                        <span className="gf-col-icon">
                            <IconoActual size={22} />
                        </span>

                        <div>
                            <small>
                                {actual.paso}
                            </small>

                            <h2>
                                {actual.titulo}
                            </h2>

                            <p>
                                {actual.subtitulo}
                            </p>
                        </div>

                        <strong className="gf-single-count">
                            {actual.lista.length}
                        </strong>

                    </div>

                    <div className="gf-single-body">

                        {actual.lista.length === 0 ? (
                            <div className="gf-col-empty">

                                <Leaf size={28} />

                                <span>
                                    {actual.vacio}
                                </span>

                            </div>
                        ) : (
                            <div className="gf-card-grid">

                                {listaVisible.map(
                                    especie =>
                                        tarjeta(
                                            especie,
                                            etapa
                                        )
                                )}

                            </div>
                        )}

                    </div>

                </section>
            )}

            {!cargando &&
                totalRegistros > 0 && (
                    <nav
                        className="gf-pagination"
                        aria-label="Paginación de especies"
                    >

                        <div className="gf-pagination-summary">

                            <span>
                                Mostrando{" "}

                                <strong>
                                    {indiceInicial + 1}
                                </strong>

                                {" "}a{" "}

                                <strong>
                                    {indiceFinal}
                                </strong>

                                {" "}de{" "}

                                <strong>
                                    {totalRegistros}
                                </strong>

                                {" "}especies
                            </span>

                        </div>

                        <div className="gf-pagination-controls">

                            <label className="gf-page-size">

                                <span>
                                    Por página
                                </span>

                                <select
                                    value={porPagina}
                                    onChange={evento => {
                                        setPorPagina(
                                            Number(
                                                evento.target.value
                                            )
                                        );
                                    }}
                                    aria-label="Cantidad de especies por página"
                                >
                                    {OPCIONES_POR_PAGINA.map(
                                        cantidad => (
                                            <option
                                                key={cantidad}
                                                value={cantidad}
                                            >
                                                {cantidad}
                                            </option>
                                        )
                                    )}
                                </select>

                            </label>

                            <button
                                type="button"
                                className="gf-page-nav"
                                onClick={() =>
                                    irPagina(
                                        paginaActual - 1
                                    )
                                }
                                disabled={
                                    paginaActual <= 1
                                }
                                aria-label="Página anterior"
                            >
                                <ChevronLeft size={17} />

                                <span>
                                    Anterior
                                </span>
                            </button>

                            <div
                                className="gf-page-indicator"
                                aria-live="polite"
                            >
                                <span>
                                    Página
                                </span>

                                <strong>
                                    {paginaActual}
                                </strong>

                                <span>
                                    de
                                </span>

                                <strong>
                                    {totalPaginas}
                                </strong>
                            </div>

                            <button
                                type="button"
                                className="gf-page-nav"
                                onClick={() =>
                                    irPagina(
                                        paginaActual + 1
                                    )
                                }
                                disabled={
                                    paginaActual >= totalPaginas
                                }
                                aria-label="Página siguiente"
                            >
                                <span>
                                    Siguiente
                                </span>

                                <ChevronRight size={17} />
                            </button>

                        </div>

                    </nav>
                )
            }

        </section>
    );
}

export default GestionEspecies;