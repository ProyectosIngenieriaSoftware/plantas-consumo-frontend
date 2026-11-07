import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    CheckCircle2,
    CircleOff,
    Clock,
    CookingPot,
    Eye,
    Flame,
    Info,
    Leaf,
    Pencil,
    Plus,
    Power,
    PowerOff,
    RefreshCw,
    Save,
    Search,
    Sprout,
    Users,
    X,
    ArrowLeft,
    ImagePlus,
    Video
} from "lucide-react";
import ComboBuscable from "../../../components/ComboBuscable";
import { API_URL } from "../../../config";
import { listarPartesComestibles } from "../../../api/parteComestibleService";
import {
    TIPOS_CONSUMO,
    textoTipoConsumo,
    listarPreparacionesPorEspecie,
    crearPreparacion,
    actualizarPreparacion,
    desactivarPreparacion,
    activarPreparacion
} from "../../../api/preparacionConsumoService";
import {
    crearEstadoRegistro,
    obtenerFormularioRetornado
} from "../../../utils/formularioRetorno";
import "../../../styles/preparacionesConsumo.css";
import "../../../styles/alertas.css";

const MAX_NOMBRE = 150;
const MAX_FUENTE = 300;
const MAX_TIEMPO = 1440;
const MAX_ORDEN = 32767;
const TIENE_LETRA = /\p{L}/u;

const FORMULARIO_VACIO = {
    idEspecieParte: "",
    nombre: "",
    descripcion: "",
    tipoConsumo: "",
    requiereCoccion: false,
    ingredientes: "",
    procedimiento: "",
    tiempoPreparacionMin: "",
    numeroPorciones: "",
    advertencias: "",
    fuenteTradicional: "",
    ordenPresentacion: "1"
};

function obtenerLista(datos) {
    if (Array.isArray(datos)) return datos;
    if (Array.isArray(datos?.content)) return datos.content;
    return [];
}

function escapar(texto = "") {
    return String(texto ?? "").replace(
        /[&<>"']/g,
        caracter => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caracter]
    );
}

function obtenerMensajeError(error) {
    const data = error?.response?.data;
    if (!data) return "No se pudo conectar con el servidor.";
    if (typeof data === "string") return data;
    if (data.mensaje) return data.mensaje;
    if (data.message) return data.message;

    if (
        data.erroresValidacion &&
        typeof data.erroresValidacion === "object"
    ) {
        return Object.values(data.erroresValidacion)
            .flat()
            .filter(Boolean)
            .join(" ");
    }

    return data.error ||
        "Ocurrió un error inesperado.";
}

function nombreComunPrincipal(especie) {
    if (especie?.nombreComun) return especie.nombreComun;

    const nombres = Array.isArray(especie?.nombresComunes)
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

function texto(valor) {
    const limpio = String(valor ?? "").trim();
    return limpio || null;
}

function numero(valor) {
    const limpio = String(valor ?? "").trim();
    return limpio === "" ? null : Number(limpio);
}

function aFormulario(preparacion) {
    return {
        idEspecieParte: String(preparacion.idEspecieParte || ""),
        nombre: preparacion.nombre || "",
        descripcion: preparacion.descripcion || "",
        tipoConsumo: preparacion.tipoConsumo || "",
        requiereCoccion: Boolean(preparacion.requiereCoccion),
        ingredientes: preparacion.ingredientes || "",
        procedimiento: preparacion.procedimiento || "",
        tiempoPreparacionMin: preparacion.tiempoPreparacionMin ?? "",
        numeroPorciones: preparacion.numeroPorciones ?? "",
        advertencias: preparacion.advertencias || "",
        fuenteTradicional: preparacion.fuenteTradicional || "",
        ordenPresentacion: preparacion.ordenPresentacion ?? "1"
    };
}

function aCuerpo(formulario) {
    return {
        idEspecieParte: Number(formulario.idEspecieParte),
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim(),
        tipoConsumo: formulario.tipoConsumo,
        requiereCoccion:
            formulario.tipoConsumo === "CRUDO"
                ? false
                : Boolean(formulario.requiereCoccion),
        ingredientes: texto(formulario.ingredientes),
        procedimiento: formulario.procedimiento.trim(),
        tiempoPreparacionMin: numero(formulario.tiempoPreparacionMin),
        numeroPorciones: numero(formulario.numeroPorciones),
        advertencias: texto(formulario.advertencias),
        fuenteTradicional: texto(formulario.fuenteTradicional),
        ordenPresentacion: numero(formulario.ordenPresentacion) ?? 1
    };
}

function validarFormulario(formulario) {
    const errores = {};
    const entero = valor => /^\d+$/.test(String(valor).trim());

    if (!formulario.idEspecieParte) {
        errores.idEspecieParte = "Selecciona una parte comestible.";
    }

    if (!formulario.nombre.trim()) {
        errores.nombre = "El nombre es obligatorio.";
    } else if (formulario.nombre.trim().length > MAX_NOMBRE) {
        errores.nombre = `El nombre no puede superar ${MAX_NOMBRE} caracteres.`;
    } else if (!TIENE_LETRA.test(formulario.nombre)) {
        errores.nombre = "El nombre debe contener al menos una letra.";
    }

    if (!formulario.descripcion.trim()) {
        errores.descripcion = "La descripción es obligatoria.";
    } else if (!TIENE_LETRA.test(formulario.descripcion)) {
        errores.descripcion = "La descripción debe contener al menos una letra.";
    }

    if (!formulario.tipoConsumo) {
        errores.tipoConsumo = "Selecciona la forma de consumo.";
    }

    if (!formulario.procedimiento.trim()) {
        errores.procedimiento = "El procedimiento es obligatorio.";
    } else if (!TIENE_LETRA.test(formulario.procedimiento)) {
        errores.procedimiento = "El procedimiento debe contener al menos una letra.";
    }

    const tiempo = String(formulario.tiempoPreparacionMin).trim();

    if (
        tiempo &&
        (
            !entero(tiempo) ||
            Number(tiempo) < 1 ||
            Number(tiempo) > MAX_TIEMPO
        )
    ) {
        errores.tiempoPreparacionMin =
            `Debe ser un número entero entre 1 y ${MAX_TIEMPO}.`;
    }

    const porciones = String(formulario.numeroPorciones).trim();

    if (
        porciones &&
        (
            !entero(porciones) ||
            Number(porciones) < 1
        )
    ) {
        errores.numeroPorciones =
            "Debe ser un número entero mayor que cero.";
    }

    const orden = String(formulario.ordenPresentacion).trim();

    if (
        orden &&
        (
            !entero(orden) ||
            Number(orden) < 1 ||
            Number(orden) > MAX_ORDEN
        )
    ) {
        errores.ordenPresentacion =
            `Debe ser un número entero entre 1 y ${MAX_ORDEN}.`;
    }

    if (formulario.fuenteTradicional.trim().length > MAX_FUENTE) {
        errores.fuenteTradicional =
            `No puede superar ${MAX_FUENTE} caracteres.`;
    }

    return errores;
}

function normalizarErrores(errores = {}) {
    const resultado = { ...errores };

    if (resultado.coccionCoherenteConElTipo) {
        resultado.requiereCoccion =
            resultado.coccionCoherenteConElTipo;

        delete resultado.coccionCoherenteConElTipo;
    }

    return resultado;
}

function PreparacionesConsumo() {
    const { idEspecie } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [especie, setEspecie] = useState(
        location.state?.especie || null
    );

    const [partes, setPartes] = useState([]);
    const [preparaciones, setPreparaciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [accionando, setAccionando] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("TODAS");
    const [filtroParte, setFiltroParte] = useState("TODAS");
    const [modal, setModal] = useState(
        location.state?.contextoFormulario?.modal ||
        (
            location.state?.abrirFormulario
                ? { modo: "nueva" }
                : null
        )
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
                abrirContenido: "preparaciones",
                categoria: "alimentacion",
                rutaRetorno:
                    location.state?.rutaRetorno ||
                    "/contenido-especies/alimentacion"
            }
        });
    }

    function abrirMultimedia(preparacion, tipo) {
        navigate(
            `/especies/${idEspecie}/multimedia-preparacion`,
            {
                state: {
                    especie,
                    idPreparacion:
                        preparacion.idPreparacion,
                    tipo,
                    abrirFormulario: true,
                    desde: "preparaciones",
                    rutaRetorno: location.pathname
                }
            }
        );
    }

    function registrarParteComestible() {
        navigate(
            `/especies/${idEspecie}/contenido/partes-comestibles`,
            {
                state: {
                    especie,
                    desde: "preparaciones",
                    categoria: "alimentacion",
                    rutaRetorno: location.pathname,
                    ...crearEstadoRegistro(
                        location,
                        "idEspecieParte",
                        formulario,
                        { modal }
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
                datosPreparaciones,
                respuestaEspecie
            ] = await Promise.all([
                listarPartesComestibles(
                    idEspecie,
                    false
                ),
                listarPreparacionesPorEspecie(
                    idEspecie,
                    false
                ),
                axios.get(
                    `${API_URL}/api/especies/${idEspecie}`
                )
            ]);

            setPartes(
                obtenerLista(datosPartes)
            );

            setPreparaciones(
                ordenarPreparaciones(
                    obtenerLista(
                        datosPreparaciones
                    )
                )
            );

            const datos =
                respuestaEspecie.data;

            setEspecie({
                idEspecie:
                    datos.idEspecie,
                nombreComun:
                    nombreComunPrincipal(datos),
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
            await mostrarError(
                "No se pudieron cargar los datos",
                error
            );
        } finally {
            setCargando(false);
        }
    }

    async function recargarPreparaciones() {
        try {
            const datos =
                await listarPreparacionesPorEspecie(
                    idEspecie,
                    false
                );

            setPreparaciones(
                ordenarPreparaciones(
                    obtenerLista(datos)
                )
            );
        } catch (error) {
            await mostrarError(
                "No se pudieron actualizar las preparaciones",
                error
            );
        }
    }

    function ordenarPreparaciones(lista) {
        return [...lista].sort(
            (a, b) =>
                (
                    a.ordenPresentacion ?? 1
                ) -
                (
                    b.ordenPresentacion ?? 1
                ) ||
                String(a.nombre || "")
                    .localeCompare(
                        String(b.nombre || "")
                    )
        );
    }

    async function mostrarError(titulo, error) {
        await Swal.fire({
            icon: "error",
            title: titulo,
            text: obtenerMensajeError(error),
            confirmButtonText: "Entendido",
            buttonsStyling: false,
            customClass: {
                popup: "flora-alert",
                confirmButton:
                    "flora-alert-confirm"
            }
        });
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
                    String(parte.idEspecieParte),
                    parte
                ]
            )
        ),
        [partes]
    );

    function nombreParte(idEspecieParte) {
        return partesPorId
            .get(String(idEspecieParte))
            ?.nombreParte ||
            "Parte no disponible";
    }

    const preparacionesFiltradas = useMemo(
        () => {
            const termino =
                busqueda
                    .trim()
                    .toLowerCase();

            return preparaciones.filter(
                preparacion => {
                    const coincideEstado =
                        filtroEstado === "TODAS" ||
                        (
                            filtroEstado === "ACTIVAS" &&
                            preparacion.activa !== false
                        ) ||
                        (
                            filtroEstado === "INACTIVAS" &&
                            preparacion.activa === false
                        );

                    const coincideParte =
                        filtroParte === "TODAS" ||
                        String(
                            preparacion.idEspecieParte
                        ) ===
                        String(filtroParte);

                    const contenido = [
                        preparacion.nombre,
                        preparacion.descripcion,
                        preparacion.tipoConsumo,
                        textoTipoConsumo(
                            preparacion.tipoConsumo
                        ),
                        nombreParte(
                            preparacion.idEspecieParte
                        ),
                        preparacion.ingredientes,
                        preparacion.procedimiento
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    const coincideBusqueda =
                        !termino ||
                        contenido.includes(termino);

                    return (
                        coincideEstado &&
                        coincideParte &&
                        coincideBusqueda
                    );
                }
            );
        },
        [
            preparaciones,
            busqueda,
            filtroEstado,
            filtroParte,
            partesPorId
        ]
    );

    const estadisticas = useMemo(
        () => ({
            total:
                preparaciones.length,
            partes:
                new Set(
                    preparaciones.map(
                        preparacion =>
                            preparacion.idEspecieParte
                    )
                ).size,
            activas:
                preparaciones.filter(
                    preparacion =>
                        preparacion.activa !== false
                ).length,
            coccion:
                preparaciones.filter(
                    preparacion =>
                        preparacion.requiereCoccion === true
                ).length
        }),
        [preparaciones]
    );

    function abrirNueva() {
        if (partesActivas.length === 0) {
            Swal.fire({
                icon: "info",
                title: "Sin partes comestibles",
                text: "Primero debes registrar una parte comestible activa para esta especie.",
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
                    registrarParteComestible();
                }
            });

            return;
        }

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

        setModal({
            modo: "nueva"
        });
    }

    function abrirEditar(preparacion) {
        setFormulario(
            aFormulario(preparacion)
        );

        setErrores({});

        setModal({
            modo: "editar",
            preparacion
        });
    }

    function cerrarModal() {
        if (guardando) return;

        setModal(null);
        setFormulario(FORMULARIO_VACIO);
        setErrores({});
    }

    function cambiarCampo(evento) {
        const {
            name,
            value,
            type,
            checked
        } = evento.target;

        setFormulario(
            actual => {
                const siguiente = {
                    ...actual,
                    [name]:
                        type === "checkbox"
                            ? checked
                            : value
                };

                if (
                    name === "tipoConsumo" &&
                    value === "CRUDO"
                ) {
                    siguiente.requiereCoccion =
                        false;
                }

                return siguiente;
            }
        );

        setErrores(
            actual => ({
                ...actual,
                [name]: ""
            })
        );
    }

    async function guardar(evento) {
        evento.preventDefault();

        if (guardando) return;

        const encontrados =
            validarFormulario(
                formulario
            );

        setErrores(encontrados);

        if (
            Object.keys(
                encontrados
            ).length
        ) {
            return;
        }

        const cuerpo =
            aCuerpo(formulario);

        try {
            setGuardando(true);

            if (modal.modo === "nueva") {
                await crearPreparacion(
                    cuerpo
                );
            } else {
                await actualizarPreparacion(
                    modal.preparacion
                        .idPreparacion,
                    cuerpo
                );
            }

            await Swal.fire({
                icon: "success",
                title:
                    modal.modo === "nueva"
                        ? "Preparación registrada"
                        : "Preparación actualizada",
                text:
                    modal.modo === "nueva"
                        ? "La preparación fue asociada correctamente."
                        : "Los cambios fueron guardados correctamente.",
                timer: 1600,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });

            setModal(null);
            setFormulario(FORMULARIO_VACIO);
            setErrores({});

            await recargarPreparaciones();
        } catch (error) {
            const datos =
                error?.response?.data;

            if (datos?.erroresValidacion) {
                setErrores(
                    normalizarErrores(
                        datos.erroresValidacion
                    )
                );
            } else if (
                error?.response?.status === 409 &&
                /nombre/i.test(
                    datos?.mensaje || ""
                )
            ) {
                setErrores({
                    nombre:
                        datos.mensaje
                });
            } else {
                await mostrarError(
                    modal.modo === "nueva"
                        ? "No se pudo registrar"
                        : "No se pudo actualizar",
                    error
                );
            }
        } finally {
            setGuardando(false);
        }
    }

    async function desactivar(preparacion) {
        const resultado =
            await Swal.fire({
                icon: "warning",
                title: "¿Desactivar preparación?",
                html:
                    `<b>${escapar(preparacion.nombre)}</b> dejará de mostrarse como disponible.`,
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

        if (!resultado.isConfirmed) return;

        try {
            setAccionando(true);

            await desactivarPreparacion(
                preparacion.idPreparacion
            );

            await recargarPreparaciones();

            await Swal.fire({
                icon: "success",
                title: "Preparación desactivada",
                timer: 1400,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarError(
                "No se pudo desactivar",
                error
            );
        } finally {
            setAccionando(false);
        }
    }

    async function reactivar(preparacion) {
        const parte =
            partesPorId.get(
                String(
                    preparacion.idEspecieParte
                )
            );

        if (parte?.activa === false) {
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

        const resultado =
            await Swal.fire({
                icon: "question",
                title: "¿Reactivar preparación?",
                html:
                    `<b>${escapar(preparacion.nombre)}</b> volverá a estar disponible.`,
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

        if (!resultado.isConfirmed) return;

        try {
            setAccionando(true);

            await activarPreparacion(
                preparacion.idPreparacion,
                aCuerpo(
                    aFormulario(
                        preparacion
                    )
                )
            );

            await recargarPreparaciones();

            await Swal.fire({
                icon: "success",
                title: "Preparación reactivada",
                timer: 1400,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarError(
                "No se pudo reactivar",
                error
            );
        } finally {
            setAccionando(false);
        }
    }

    function verDetalle(preparacion) {
        const bloque = (titulo, valor) => `
            <div class="pc-detail-block">
                <span>${escapar(titulo)}</span>
                <p>${escapar(
            valor ||
            "Información no disponible"
        )}</p>
            </div>
        `;

        Swal.fire({
            title:
                escapar(preparacion.nombre),
            width: 700,
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                popup:
                    "flora-alert pc-detail-modal"
            },
            html: `
                <div class="pc-detail">
                    <div class="pc-detail-tags">
                        <span>${escapar(nombreParte(preparacion.idEspecieParte))}</span>
                        <span>${escapar(textoTipoConsumo(preparacion.tipoConsumo))}</span>
                        <span>${preparacion.requiereCoccion ? "Requiere cocción" : "No requiere cocción"}</span>
                        <span>${preparacion.tiempoPreparacionMin ? `${preparacion.tiempoPreparacionMin} min` : "Tiempo no indicado"}</span>
                        <span>${preparacion.numeroPorciones ? `${preparacion.numeroPorciones} porciones` : "Porciones no indicadas"}</span>
                    </div>
                    ${bloque("Descripción", preparacion.descripcion)}
                    ${bloque("Ingredientes", preparacion.ingredientes)}
                    ${bloque("Procedimiento", preparacion.procedimiento)}
                    ${bloque("Advertencias", preparacion.advertencias)}
                    ${bloque("Fuente tradicional", preparacion.fuenteTradicional)}
                </div>
            `
        });
    }

    const partesFormulario =
        partes.filter(
            parte =>
                parte.activa !== false ||
                String(
                    parte.idEspecieParte
                ) ===
                String(
                    formulario.idEspecieParte
                )
        );

    return (
        <section className="pc-page preparaciones-consumo-page">

            <div className="pc-hero">

                <div className="pc-hero-copy">

                    <span className="pc-overline">
                        Contenido / Alimentación / {especie?.nombreComun || "Especie"}
                    </span>

                    <h1>
                        Preparaciones de consumo
                    </h1>

                    <p>
                        Administra las formas tradicionales y recomendadas de preparar las partes comestibles de la especie.
                    </p>

                </div>

                <div className="pc-hero-actions">

                    <button
                        type="button"
                        className="pc-refresh pc-change-species"
                        onClick={cambiarEspecie}
                    >
                        <ArrowLeft size={17} />
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="pc-refresh"
                        onClick={cargarTodo}
                        disabled={
                            cargando ||
                            accionando
                        }
                    >
                        <RefreshCw
                            size={17}
                            className={
                                cargando
                                    ? "pc-spin"
                                    : ""
                            }
                        />
                        Actualizar
                    </button>

                    <button
                        type="button"
                        className="pc-primary"
                        onClick={abrirNueva}
                        disabled={
                            cargando ||
                            partesActivas.length === 0
                        }
                    >
                        <Plus size={17} />
                        Nueva preparación
                    </button>

                </div>

            </div>

            <div className="pc-species">

                <span className="pc-species-icon">
                    <Leaf size={20} />
                </span>

                <div className="pc-species-data">

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
                    <div className="pc-species-extra">

                        <small>
                            Familia
                        </small>

                        <strong>
                            {especie.familia}
                        </strong>

                    </div>
                )}

            </div>

            <div className="pc-stats">

                <div className="pc-stat pc-stat-total">
                    <span className="pc-stat-icon">
                        <CookingPot size={21} />
                    </span>
                    <div>
                        <strong>{estadisticas.total}</strong>
                        <span>Preparaciones</span>
                    </div>
                </div>

                <div className="pc-stat pc-stat-parts">
                    <span className="pc-stat-icon">
                        <Sprout size={21} />
                    </span>
                    <div>
                        <strong>{estadisticas.partes}</strong>
                        <span>Partes utilizadas</span>
                    </div>
                </div>

                <div className="pc-stat pc-stat-active">
                    <span className="pc-stat-icon">
                        <CheckCircle2 size={21} />
                    </span>
                    <div>
                        <strong>{estadisticas.activas}</strong>
                        <span>Activas</span>
                    </div>
                </div>

                <div className="pc-stat pc-stat-cooking">
                    <span className="pc-stat-icon">
                        <Flame size={21} />
                    </span>
                    <div>
                        <strong>{estadisticas.coccion}</strong>
                        <span>Requieren cocción</span>
                    </div>
                </div>

            </div>

            <section className="pc-card">

                <div className="pc-card-head">
                    <div>
                        <span className="pc-kicker">
                            Preparaciones registradas
                        </span>
                        <h2>
                            Formas de consumo
                        </h2>
                        <p>
                            Consulta y administra las preparaciones registradas para esta especie.
                        </p>
                    </div>
                </div>

                <div className="pc-toolbar">

                    <label className="pc-search">

                        <Search size={16} />

                        <input
                            type="search"
                            placeholder="Buscar preparación, forma de consumo o parte..."
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
                                onClick={() =>
                                    setBusqueda("")
                                }
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <select
                        className="pc-filter"
                        value={filtroParte}
                        onChange={evento =>
                            setFiltroParte(
                                evento.target.value
                            )
                        }
                    >
                        <option value="TODAS">
                            Todas las partes
                        </option>

                        {partes.map(
                            parte => (
                                <option
                                    key={
                                        parte.idEspecieParte
                                    }
                                    value={
                                        parte.idEspecieParte
                                    }
                                >
                                    {parte.nombreParte}
                                </option>
                            )
                        )}

                    </select>

                    <select
                        className="pc-filter"
                        value={filtroEstado}
                        onChange={evento =>
                            setFiltroEstado(
                                evento.target.value
                            )
                        }
                    >
                        <option value="TODAS">
                            Todos los estados
                        </option>
                        <option value="ACTIVAS">
                            Activas
                        </option>
                        <option value="INACTIVAS">
                            Inactivas
                        </option>
                    </select>

                </div>

                {cargando ? (
                    <div className="pc-state">
                        <span className="pc-loader" />
                        <strong>
                            Cargando preparaciones...
                        </strong>
                        <p>
                            Estamos consultando la información de la especie.
                        </p>
                    </div>
                ) : partes.length === 0 ? (
                    <div className="pc-state">
                        <Sprout size={34} />
                        <strong>
                            Sin partes comestibles
                        </strong>
                        <p>
                            Primero debes registrar una parte comestible para esta especie.
                        </p>
                    </div>
                ) : preparacionesFiltradas.length === 0 ? (
                    <div className="pc-state">

                        <CookingPot size={34} />

                        <strong>
                            {preparaciones.length
                                ? "No hay resultados"
                                : "Todavía no hay preparaciones"
                            }
                        </strong>

                        <p>
                            {preparaciones.length
                                ? "Prueba con otros filtros o términos de búsqueda."
                                : "Registra la primera preparación para esta especie."
                            }
                        </p>

                        {!preparaciones.length &&
                            partesActivas.length > 0 && (
                                <button
                                    type="button"
                                    className="pc-empty-action"
                                    onClick={abrirNueva}
                                >
                                    <Plus size={16} />
                                    Registrar preparación
                                </button>
                            )
                        }

                    </div>
                ) : (
                    <div className="pc-table-wrap">

                        <table className="pc-table">

                            <thead>
                                <tr>
                                    <th>Preparación</th>
                                    <th>Parte</th>
                                    <th>Forma de consumo</th>
                                    <th>Detalles</th>
                                    <th>Estado</th>
                                    <th className="pc-actions-col">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {preparacionesFiltradas.map(
                                    preparacion => (
                                        <tr
                                            key={
                                                preparacion.idPreparacion
                                            }
                                        >

                                            <td>
                                                <div className="pc-prep-name">

                                                    <span>
                                                        <CookingPot size={16} />
                                                    </span>

                                                    <div>
                                                        <strong>
                                                            {preparacion.nombre}
                                                        </strong>
                                                        <small>
                                                            {preparacion.descripcion}
                                                        </small>
                                                    </div>

                                                </div>
                                            </td>

                                            <td>
                                                <span className="pc-part">
                                                    <Sprout size={13} />
                                                    {nombreParte(
                                                        preparacion.idEspecieParte
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="pc-type">
                                                    {textoTipoConsumo(
                                                        preparacion.tipoConsumo
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="pc-details">

                                                    {preparacion.requiereCoccion && (
                                                        <span>
                                                            <Flame size={13} />
                                                            Cocción
                                                        </span>
                                                    )}

                                                    {preparacion.tiempoPreparacionMin && (
                                                        <span>
                                                            <Clock size={13} />
                                                            {preparacion.tiempoPreparacionMin} min
                                                        </span>
                                                    )}

                                                    {preparacion.numeroPorciones && (
                                                        <span>
                                                            <Users size={13} />
                                                            {preparacion.numeroPorciones}
                                                        </span>
                                                    )}

                                                    {!preparacion.requiereCoccion &&
                                                        !preparacion.tiempoPreparacionMin &&
                                                        !preparacion.numeroPorciones && (
                                                            <em>
                                                                Sin detalles
                                                            </em>
                                                        )
                                                    }

                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`pc-status ${preparacion.activa === false
                                                            ? "off"
                                                            : "on"
                                                        }`}
                                                >
                                                    {preparacion.activa === false ? (
                                                        <CircleOff size={13} />
                                                    ) : (
                                                        <CheckCircle2 size={13} />
                                                    )}

                                                    {preparacion.activa === false
                                                        ? "Inactiva"
                                                        : "Activa"
                                                    }
                                                </span>
                                            </td>

                                            <td>

                                                <div className="pc-actions">

                                                    <button
                                                        type="button"
                                                        className="media-image"
                                                        title="Registrar imagen de esta preparación"
                                                        disabled={
                                                            preparacion.activa === false
                                                        }
                                                        onClick={() =>
                                                            abrirMultimedia(
                                                                preparacion,
                                                                "imagenes"
                                                            )
                                                        }
                                                    >
                                                        <ImagePlus size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="media-video"
                                                        title="Registrar video de esta preparación"
                                                        disabled={
                                                            preparacion.activa === false
                                                        }
                                                        onClick={() =>
                                                            abrirMultimedia(
                                                                preparacion,
                                                                "videos"
                                                            )
                                                        }
                                                    >
                                                        <Video size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="view"
                                                        title="Ver detalle"
                                                        onClick={() =>
                                                            verDetalle(
                                                                preparacion
                                                            )
                                                        }
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        onClick={() =>
                                                            abrirEditar(
                                                                preparacion
                                                            )
                                                        }
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    {preparacion.activa === false ? (
                                                        <button
                                                            type="button"
                                                            className="activate"
                                                            title="Reactivar"
                                                            disabled={accionando}
                                                            onClick={() =>
                                                                reactivar(
                                                                    preparacion
                                                                )
                                                            }
                                                        >
                                                            <Power size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="deactivate"
                                                            title="Desactivar"
                                                            disabled={accionando}
                                                            onClick={() =>
                                                                desactivar(
                                                                    preparacion
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
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </section>

            {modal &&
                createPortal(
                    <div
                        className="pc-overlay preparaciones-overlay"
                        onMouseDown={cerrarModal}
                    >

                        <div
                            className="pc-modal preparaciones-modal"
                            onMouseDown={evento =>
                                evento.stopPropagation()
                            }
                        >

                            <div className="pc-modal-head">

                                <div className="pc-modal-icon">
                                    <CookingPot size={21} />
                                </div>

                                <div>

                                    <span className="pc-kicker">
                                        {modal.modo === "nueva"
                                            ? "Nuevo registro"
                                            : "Editar registro"
                                        }
                                    </span>

                                    <h2>
                                        {modal.modo === "nueva"
                                            ? "Nueva preparación"
                                            : "Editar preparación"
                                        }
                                    </h2>

                                </div>

                                <button
                                    type="button"
                                    className="pc-modal-close"
                                    onClick={cerrarModal}
                                    disabled={guardando}
                                    aria-label="Cerrar"
                                >
                                    <X size={19} />
                                </button>

                            </div>

                            <form
                                className="pc-form"
                                onSubmit={guardar}
                                noValidate
                            >

                                <div className="pc-modal-body">

                                    <div className="pc-modal-species">

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

                                    <div className="pc-grid-2">

                                        <div className="pc-field">

                                            <label>
                                                Parte comestible *
                                            </label>

                                            <div className="pc-form-select-action">

                                                <ComboBuscable
                                                    id="pc-parte-comestible"
                                                    name="idEspecieParte"
                                                    ariaLabel="Parte comestible"
                                                    value={
                                                        formulario.idEspecieParte
                                                    }
                                                    onChange={
                                                        cambiarCampo
                                                    }
                                                    className={
                                                        errores.idEspecieParte
                                                            ? "error"
                                                            : ""
                                                    }
                                                    placeholder="Selecciona..."
                                                    searchPlaceholder="Buscar parte..."
                                                    options={partesFormulario.map(
                                                        parte => ({
                                                            value: parte.idEspecieParte,
                                                            label: `${parte.nombreParte}${parte.activa === false ? " · Inactiva" : ""}`
                                                        })
                                                    )}
                                                />

                                                <button
                                                    type="button"
                                                    className="pc-register-part"
                                                    onClick={registrarParteComestible}
                                                >
                                                    <Plus size={15} />
                                                    Registrar parte
                                                </button>

                                            </div>

                                            {errores.idEspecieParte && (
                                                <small className="pc-error">
                                                    {errores.idEspecieParte}
                                                </small>
                                            )}

                                        </div>

                                        <div className="pc-field">

                                            <label>
                                                Forma de consumo *
                                            </label>

                                            <select
                                                name="tipoConsumo"
                                                value={
                                                    formulario.tipoConsumo
                                                }
                                                onChange={
                                                    cambiarCampo
                                                }
                                                className={
                                                    errores.tipoConsumo
                                                        ? "error"
                                                        : ""
                                                }
                                            >

                                                <option value="">
                                                    Selecciona...
                                                </option>

                                                {TIPOS_CONSUMO.map(
                                                    tipo => (
                                                        <option
                                                            key={
                                                                tipo.valor
                                                            }
                                                            value={
                                                                tipo.valor
                                                            }
                                                        >
                                                            {tipo.texto}
                                                        </option>
                                                    )
                                                )}

                                            </select>

                                            {errores.tipoConsumo && (
                                                <small className="pc-error">
                                                    {errores.tipoConsumo}
                                                </small>
                                            )}

                                        </div>

                                    </div>

                                    <div className="pc-field">

                                        <label>
                                            Nombre *
                                        </label>

                                        <input
                                            name="nombre"
                                            value={
                                                formulario.nombre
                                            }
                                            onChange={
                                                cambiarCampo
                                            }
                                            maxLength={
                                                MAX_NOMBRE
                                            }
                                            placeholder="Ej. Flor de izote con huevo"
                                            className={
                                                errores.nombre
                                                    ? "error"
                                                    : ""
                                            }
                                        />

                                        <div className="pc-field-foot">

                                            <small className="pc-error">
                                                {errores.nombre || ""}
                                            </small>

                                            <small>
                                                {formulario.nombre.length}/{MAX_NOMBRE}
                                            </small>

                                        </div>

                                    </div>

                                    <div className="pc-field">

                                        <label>
                                            Descripción *
                                        </label>

                                        <textarea
                                            name="descripcion"
                                            value={
                                                formulario.descripcion
                                            }
                                            onChange={
                                                cambiarCampo
                                            }
                                            rows="3"
                                            placeholder="Breve descripción de la preparación..."
                                            className={
                                                errores.descripcion
                                                    ? "error"
                                                    : ""
                                            }
                                        />

                                        {errores.descripcion && (
                                            <small className="pc-error">
                                                {errores.descripcion}
                                            </small>
                                        )}

                                    </div>

                                    <label
                                        className={`pc-check ${formulario.tipoConsumo === "CRUDO"
                                                ? "disabled"
                                                : ""
                                            }`}
                                    >

                                        <input
                                            type="checkbox"
                                            name="requiereCoccion"
                                            checked={
                                                formulario.requiereCoccion
                                            }
                                            onChange={
                                                cambiarCampo
                                            }
                                            disabled={
                                                formulario.tipoConsumo === "CRUDO"
                                            }
                                        />

                                        <span>
                                            Requiere cocción
                                        </span>

                                        {formulario.tipoConsumo === "CRUDO" && (
                                            <small>
                                                Una preparación cruda no requiere cocción.
                                            </small>
                                        )}

                                    </label>

                                    {errores.requiereCoccion && (
                                        <small className="pc-error">
                                            {errores.requiereCoccion}
                                        </small>
                                    )}

                                    <div className="pc-field">

                                        <label>
                                            Ingredientes
                                        </label>

                                        <textarea
                                            name="ingredientes"
                                            value={
                                                formulario.ingredientes
                                            }
                                            onChange={
                                                cambiarCampo
                                            }
                                            rows="3"
                                            placeholder={
                                                "Ej.\n- Flores de izote\n- Huevos\n- Cebolla"
                                            }
                                        />

                                    </div>

                                    <div className="pc-field">

                                        <label>
                                            Procedimiento *
                                        </label>

                                        <textarea
                                            name="procedimiento"
                                            value={
                                                formulario.procedimiento
                                            }
                                            onChange={
                                                cambiarCampo
                                            }
                                            rows="5"
                                            placeholder={
                                                "1. Lavar la parte comestible.\n2. Preparar los ingredientes.\n3. Cocinar..."
                                            }
                                            className={
                                                errores.procedimiento
                                                    ? "error"
                                                    : ""
                                            }
                                        />

                                        {errores.procedimiento && (
                                            <small className="pc-error">
                                                {errores.procedimiento}
                                            </small>
                                        )}

                                    </div>

                                    <div className="pc-grid-3">

                                        <div className="pc-field">

                                            <label>
                                                Tiempo (min)
                                            </label>

                                            <input
                                                type="number"
                                                name="tiempoPreparacionMin"
                                                min="1"
                                                max={
                                                    MAX_TIEMPO
                                                }
                                                value={
                                                    formulario.tiempoPreparacionMin
                                                }
                                                onChange={
                                                    cambiarCampo
                                                }
                                                placeholder="Ej. 30"
                                                className={
                                                    errores.tiempoPreparacionMin
                                                        ? "error"
                                                        : ""
                                                }
                                            />

                                            {errores.tiempoPreparacionMin && (
                                                <small className="pc-error">
                                                    {errores.tiempoPreparacionMin}
                                                </small>
                                            )}

                                        </div>

                                        <div className="pc-field">

                                            <label>
                                                Porciones
                                            </label>

                                            <input
                                                type="number"
                                                name="numeroPorciones"
                                                min="1"
                                                value={
                                                    formulario.numeroPorciones
                                                }
                                                onChange={
                                                    cambiarCampo
                                                }
                                                placeholder="Ej. 4"
                                                className={
                                                    errores.numeroPorciones
                                                        ? "error"
                                                        : ""
                                                }
                                            />

                                            {errores.numeroPorciones && (
                                                <small className="pc-error">
                                                    {errores.numeroPorciones}
                                                </small>
                                            )}

                                        </div>

                                        <div className="pc-field">

                                            <label>
                                                Orden
                                            </label>

                                            <input
                                                type="number"
                                                name="ordenPresentacion"
                                                min="1"
                                                max={
                                                    MAX_ORDEN
                                                }
                                                value={
                                                    formulario.ordenPresentacion
                                                }
                                                onChange={
                                                    cambiarCampo
                                                }
                                                className={
                                                    errores.ordenPresentacion
                                                        ? "error"
                                                        : ""
                                                }
                                            />

                                            {errores.ordenPresentacion && (
                                                <small className="pc-error">
                                                    {errores.ordenPresentacion}
                                                </small>
                                            )}

                                        </div>

                                    </div>

                                    <div className="pc-field">

                                        <label>
                                            Advertencias
                                        </label>

                                        <textarea
                                            name="advertencias"
                                            value={
                                                formulario.advertencias
                                            }
                                            onChange={
                                                cambiarCampo
                                            }
                                            rows="2"
                                            placeholder="Precauciones al preparar o consumir..."
                                        />

                                    </div>

                                    <div className="pc-field">

                                        <label>
                                            Fuente tradicional
                                        </label>

                                        <input
                                            name="fuenteTradicional"
                                            value={
                                                formulario.fuenteTradicional
                                            }
                                            onChange={
                                                cambiarCampo
                                            }
                                            maxLength={
                                                MAX_FUENTE
                                            }
                                            placeholder="Ej. Preparación tradicional salvadoreña"
                                            className={
                                                errores.fuenteTradicional
                                                    ? "error"
                                                    : ""
                                            }
                                        />

                                        <div className="pc-field-foot">

                                            <small className="pc-error">
                                                {errores.fuenteTradicional || ""}
                                            </small>

                                            <small>
                                                {formulario.fuenteTradicional.length}/{MAX_FUENTE}
                                            </small>

                                        </div>

                                    </div>

                                    <div className="pc-info">

                                        <Info size={16} />

                                        <span>
                                            La preparación quedará asociada a la parte comestible seleccionada de esta especie.
                                        </span>

                                    </div>

                                </div>

                                <div className="pc-modal-footer">

                                    <button
                                        type="button"
                                        className="pc-cancel"
                                        onClick={cerrarModal}
                                        disabled={guardando}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="pc-primary"
                                        disabled={guardando}
                                    >
                                        {guardando ? (
                                            <span className="pc-button-loader" />
                                        ) : (
                                            <Save size={16} />
                                        )}

                                        {guardando
                                            ? "Guardando..."
                                            : modal.modo === "nueva"
                                                ? "Registrar preparación"
                                                : "Guardar cambios"
                                        }
                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>,
                    document.body
                )
            }

        </section>
    );
}

export default PreparacionesConsumo;