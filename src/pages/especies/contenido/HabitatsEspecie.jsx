import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    ArrowLeft,
    CheckCircle2,
    Eye,
    Info,
    Leaf,
    Mountain,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    TreePine,
    Unlink,
    X
} from "lucide-react";
import { API_URL } from "../../../config";
import ComboBuscable from "../../../components/ComboBuscable";
import {
    listarHabitatsDisponibles,
    listarHabitatsDeEspecie,
    asignarHabitat,
    actualizarObservacion,
    quitarHabitat
} from "../../../api/especieHabitatService";
import {
    crearEstadoRegistro,
    obtenerFormularioRetornado
} from "../../../utils/formularioRetorno";
import "../../../styles/habitatsEspecie.css";
import "../../../styles/alertas.css";

const FORMULARIO_VACIO = {
    idHabitat: "",
    observacion: ""
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

    if (!data) {
        return "No se pudo conectar con el servidor.";
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
        Array.isArray(
            especie?.nombresComunes
        )
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

function HabitatsEspecie() {
    const { idEspecie } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [especie, setEspecie] = useState(
        location.state?.especie || null
    );

    const [relaciones, setRelaciones] = useState([]);
    const [catalogo, setCatalogo] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [eliminando, setEliminando] = useState(false);

    const [busqueda, setBusqueda] = useState("");

    const [modal, setModal] = useState(
        location.state?.contextoFormulario?.modal ||
        (
            location.state?.abrirFormulario
                ? { modo: "asignar" }
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
                abrirContenido: "habitats",
                categoria: "entorno",
                rutaRetorno:
                    location.state?.rutaRetorno ||
                    "/contenido-especies/entorno"
            }
        });
    }

    function registrarHabitat() {
        navigate("/catalogos/habitats", {
            state: {
                desde: "habitats-especie",
                idEspecie: Number(idEspecie),
                especie,
                categoria: "entorno",
                rutaRetorno: location.pathname,
                ...crearEstadoRegistro(
                    location,
                    "idHabitat",
                    formulario,
                    { modal }
                )
            }
        });
    }

    async function cargarTodo() {
        try {
            setCargando(true);

            const [
                datosRelaciones,
                datosCatalogo,
                respuestaEspecie
            ] = await Promise.all([
                listarHabitatsDeEspecie(
                    idEspecie
                ),
                listarHabitatsDisponibles(),
                axios.get(
                    `${API_URL}/api/especies/${idEspecie}`
                )
            ]);

            setRelaciones(
                obtenerLista(
                    datosRelaciones
                ).sort(
                    (a, b) =>
                        String(
                            a.nombreHabitat || ""
                        ).localeCompare(
                            String(
                                b.nombreHabitat || ""
                            )
                        )
                )
            );

            setCatalogo(
                obtenerLista(
                    datosCatalogo
                ).sort(
                    (a, b) =>
                        String(
                            a.nombre || ""
                        ).localeCompare(
                            String(
                                b.nombre || ""
                            )
                        )
                )
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
            await mostrarError(
                "No se pudieron cargar los hábitats",
                error
            );
        } finally {
            setCargando(false);
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

    const disponibles = useMemo(
        () => {
            const asignados =
                new Set(
                    relaciones.map(
                        relacion =>
                            Number(
                                relacion.idHabitat
                            )
                    )
                );

            return catalogo.filter(
                habitat =>
                    !asignados.has(
                        Number(
                            habitat.idHabitat
                        )
                    )
            );
        },
        [
            catalogo,
            relaciones
        ]
    );

    const relacionesFiltradas =
        useMemo(
            () => {
                const termino =
                    busqueda
                        .trim()
                        .toLowerCase();

                if (!termino) {
                    return relaciones;
                }

                return relaciones.filter(
                    relacion =>
                        `${relacion.nombreHabitat || ""} ${relacion.observacion || ""}`
                            .toLowerCase()
                            .includes(
                                termino
                            )
                );
            },
            [
                relaciones,
                busqueda
            ]
        );

    const estadisticas = useMemo(
        () => ({
            asignados:
                relaciones.length,
            disponibles:
                disponibles.length,
            observados:
                relaciones.filter(
                    relacion =>
                        relacion.observacion
                            ?.trim()
                ).length,
            sinObservacion:
                relaciones.filter(
                    relacion =>
                        !relacion.observacion
                            ?.trim()
                ).length
        }),
        [
            relaciones,
            disponibles
        ]
    );

    const especieInactiva =
        especie?.activa === false;

    function abrirAsignar() {
        if (especieInactiva) {
            Swal.fire({
                icon: "warning",
                title: "Especie inactiva",
                text: "No puedes asignar nuevos hábitats mientras la especie esté desactivada.",
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

        if (disponibles.length === 0) {
            Swal.fire({
                icon: "info",
                title: "Sin hábitats disponibles",
                text: "No hay hábitats activos disponibles para asociar. Puedes registrar uno nuevo en el catálogo.",
                showCancelButton: true,
                confirmButtonText:
                    "Registrar hábitat",
                cancelButtonText: "Cerrar",
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
                    registrarHabitat();
                }
            });

            return;
        }

        setFormulario({
            ...FORMULARIO_VACIO,
            idHabitat:
                disponibles.length === 1
                    ? String(
                        disponibles[0]
                            .idHabitat
                    )
                    : ""
        });

        setErrores({});

        setModal({
            modo: "asignar"
        });
    }

    function abrirEditar(
        relacion
    ) {
        setFormulario({
            idHabitat:
                String(
                    relacion.idHabitat
                ),
            observacion:
                relacion.observacion ||
                ""
        });

        setErrores({});

        setModal({
            modo: "editar",
            relacion
        });
    }

    function cerrarModal() {
        if (guardando) {
            return;
        }

        setModal(null);

        setFormulario(
            FORMULARIO_VACIO
        );

        setErrores({});
    }

    function cambiarCampo(
        evento
    ) {
        const {
            name,
            value
        } = evento.target;

        setFormulario(
            actual => ({
                ...actual,
                [name]: value
            })
        );

        setErrores(
            actual => ({
                ...actual,
                [name]: ""
            })
        );
    }

    async function guardar(
        evento
    ) {
        evento.preventDefault();

        if (guardando) {
            return;
        }

        const nuevosErrores = {};

        if (
            modal.modo === "asignar" &&
            !formulario.idHabitat
        ) {
            nuevosErrores.idHabitat =
                "Selecciona un hábitat.";
        }

        if (
            formulario.observacion.length >
            500
        ) {
            nuevosErrores.observacion =
                "La observación no puede superar los 500 caracteres.";
        }

        setErrores(
            nuevosErrores
        );

        if (
            Object.keys(
                nuevosErrores
            ).length
        ) {
            return;
        }

        const observacion =
            formulario.observacion
                .trim() ||
            null;

        try {
            setGuardando(true);

            if (
                modal.modo === "asignar"
            ) {
                await asignarHabitat(
                    idEspecie,
                    {
                        idHabitat:
                            Number(
                                formulario.idHabitat
                            ),
                        observacion
                    }
                );
            } else {
                await actualizarObservacion(
                    idEspecie,
                    modal.relacion
                        .idHabitat,
                    observacion
                );
            }

            await Swal.fire({
                icon: "success",
                title:
                    modal.modo === "asignar"
                        ? "Hábitat asignado"
                        : "Observación actualizada",
                text:
                    modal.modo === "asignar"
                        ? "El hábitat fue asociado correctamente a la especie."
                        : "Los cambios fueron guardados correctamente.",
                timer: 1600,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });

            setModal(null);

            setFormulario(
                FORMULARIO_VACIO
            );

            setErrores({});

            await cargarTodo();
        } catch (error) {
            const validaciones =
                error?.response?.data
                    ?.erroresValidacion;

            if (validaciones) {
                setErrores(
                    validaciones
                );
            } else {
                await mostrarError(
                    "No se pudo guardar",
                    error
                );
            }
        } finally {
            setGuardando(false);
        }
    }

    async function quitar(
        relacion
    ) {
        const resultado =
            await Swal.fire({
                icon: "warning",
                title: "¿Quitar hábitat?",
                html:
                    `Se quitará <b>${escapar(relacion.nombreHabitat)}</b> de esta especie.<br><br>El hábitat seguirá existiendo en el catálogo.`,
                showCancelButton: true,
                confirmButtonText:
                    "Sí, quitar",
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
            !resultado.isConfirmed
        ) {
            return;
        }

        try {
            setEliminando(true);

            await quitarHabitat(
                idEspecie,
                relacion.idHabitat
            );

            await Swal.fire({
                icon: "success",
                title: "Hábitat quitado",
                text: "La relación con la especie fue eliminada.",
                timer: 1500,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });

            await cargarTodo();
        } catch (error) {
            await mostrarError(
                "No se pudo quitar el hábitat",
                error
            );
        } finally {
            setEliminando(false);
        }
    }

    function verDetalle(
        relacion
    ) {
        Swal.fire({
            title: escapar(
                relacion.nombreHabitat
            ),
            showCloseButton: true,
            showConfirmButton: false,
            width: 600,
            customClass: {
                popup:
                    "flora-alert he-detail-modal"
            },
            html: `
                <div class="he-detail">
                    <div class="he-detail-icon">
                        <span>Hábitat asociado</span>
                    </div>

                    <div class="he-detail-block">
                        <span>Observación</span>
                        <p>
                            ${escapar(
                relacion.observacion ||
                "No se ha registrado una observación para este hábitat."
            )}
                        </p>
                    </div>
                </div>
            `
        });
    }

    return (
        <section className="he-page">

            <div className="he-hero">

                <div className="he-hero-copy">

                    <span className="he-overline">
                        Contenido / Entorno / {especie?.nombreComun || "Especie"}
                    </span>

                    <h1>
                        Hábitats de la especie
                    </h1>

                    <p>
                        Administra los ambientes naturales y zonas donde se desarrolla esta especie.
                    </p>

                </div>

                <div className="he-hero-actions">

                    <button
                        type="button"
                        className="he-refresh he-change-species"
                        onClick={cambiarEspecie}
                    >
                        <ArrowLeft size={17} />
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="he-refresh"
                        onClick={cargarTodo}
                        disabled={
                            cargando ||
                            eliminando
                        }
                    >
                        <RefreshCw
                            size={17}
                            className={
                                cargando
                                    ? "he-spin"
                                    : ""
                            }
                        />

                        Actualizar
                    </button>

                    <button
                        type="button"
                        className="he-primary"
                        onClick={abrirAsignar}
                        disabled={
                            cargando ||
                            especieInactiva
                        }
                    >
                        <Plus size={17} />
                        Asignar hábitat
                    </button>

                </div>

            </div>

            <div className="he-species">

                <span className="he-species-icon">
                    <Leaf size={20} />
                </span>

                <div className="he-species-data">

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
                    <div className="he-species-extra">

                        <small>
                            Familia
                        </small>

                        <strong>
                            {especie.familia}
                        </strong>

                    </div>
                )}

            </div>

            {especieInactiva && (
                <div className="he-warning">

                    <Info size={17} />

                    <span>
                        Esta especie está desactivada. Puedes consultar, editar observaciones y quitar hábitats, pero no asignar nuevos.
                    </span>

                </div>
            )}

            <div className="he-stats">

                <div className="he-stat he-stat-assigned">

                    <span className="he-stat-icon">
                        <Mountain size={21} />
                    </span>

                    <div>

                        <strong>
                            {estadisticas.asignados}
                        </strong>

                        <span>
                            Hábitats asignados
                        </span>

                    </div>

                </div>

                <div className="he-stat he-stat-available">

                    <span className="he-stat-icon">
                        <TreePine size={21} />
                    </span>

                    <div>

                        <strong>
                            {estadisticas.disponibles}
                        </strong>

                        <span>
                            Disponibles
                        </span>

                    </div>

                </div>

                <div className="he-stat he-stat-observed">

                    <span className="he-stat-icon">
                        <CheckCircle2 size={21} />
                    </span>

                    <div>

                        <strong>
                            {estadisticas.observados}
                        </strong>

                        <span>
                            Con observación
                        </span>

                    </div>

                </div>

                <div className="he-stat he-stat-empty">

                    <span className="he-stat-icon">
                        <Info size={21} />
                    </span>

                    <div>

                        <strong>
                            {estadisticas.sinObservacion}
                        </strong>

                        <span>
                            Sin observación
                        </span>

                    </div>

                </div>

            </div>

            <section className="he-card">

                <div className="he-card-head">

                    <div>

                        <span className="he-kicker">
                            Entorno de la especie
                        </span>

                        <h2>
                            Hábitats asociados
                        </h2>

                        <p>
                            Consulta y administra los hábitats vinculados a esta especie.
                        </p>

                    </div>

                </div>

                <div className="he-toolbar">

                    <label className="he-search">

                        <Search size={16} />

                        <input
                            type="search"
                            placeholder="Buscar hábitat u observación..."
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
                            >
                                <X size={14} />
                            </button>
                        )}

                    </label>

                    <div className="he-count">

                        <TreePine size={15} />

                        <strong>
                            {relacionesFiltradas.length}
                        </strong>

                        <span>
                            {relacionesFiltradas.length === 1
                                ? "hábitat"
                                : "hábitats"
                            }
                        </span>

                    </div>

                </div>

                {cargando ? (
                    <div className="he-state">

                        <span className="he-loader" />

                        <strong>
                            Cargando hábitats...
                        </strong>

                        <p>
                            Estamos consultando la información de la especie.
                        </p>

                    </div>
                ) : relacionesFiltradas.length === 0 ? (
                    <div className="he-state">

                        <Mountain size={34} />

                        <strong>
                            {relaciones.length
                                ? "No hay coincidencias"
                                : "Sin hábitats asignados"
                            }
                        </strong>

                        <p>
                            {relaciones.length
                                ? "Prueba con otro término de búsqueda."
                                : "Esta especie todavía no tiene hábitats asociados."
                            }
                        </p>

                        {!relaciones.length &&
                            !especieInactiva && (
                                disponibles.length > 0 ? (
                                    <button
                                        type="button"
                                        className="he-empty-action"
                                        onClick={abrirAsignar}
                                    >
                                        <Plus size={16} />
                                        Asignar primer hábitat
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="he-empty-action"
                                        onClick={registrarHabitat}
                                    >
                                        <Plus size={16} />
                                        Registrar hábitat
                                    </button>
                                )
                            )
                        }

                    </div>
                ) : (
                    <div className="he-table-wrap">

                        <table className="he-table">

                            <thead>
                                <tr>
                                    <th>
                                        Hábitat
                                    </th>

                                    <th>
                                        Observación
                                    </th>

                                    <th className="he-actions-col">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {relacionesFiltradas.map(
                                    relacion => (
                                        <tr
                                            key={
                                                relacion.idHabitat
                                            }
                                        >

                                            <td>

                                                <div className="he-habitat-name">

                                                    <span>
                                                        <Mountain size={17} />
                                                    </span>

                                                    <div>

                                                        <strong>
                                                            {relacion.nombreHabitat}
                                                        </strong>

                                                        <small>
                                                            Hábitat asociado
                                                        </small>

                                                    </div>

                                                </div>

                                            </td>

                                            <td>

                                                <span
                                                    className={
                                                        relacion.observacion
                                                            ? "he-observation"
                                                            : "he-observation empty"
                                                    }
                                                >
                                                    {relacion.observacion ||
                                                        "Sin observación"
                                                    }
                                                </span>

                                            </td>

                                            <td>

                                                <div className="he-actions">

                                                    <button
                                                        type="button"
                                                        className="view"
                                                        title="Ver detalle"
                                                        onClick={() =>
                                                            verDetalle(
                                                                relacion
                                                            )
                                                        }
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Editar observación"
                                                        onClick={() =>
                                                            abrirEditar(
                                                                relacion
                                                            )
                                                        }
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="remove"
                                                        title="Quitar de la especie"
                                                        disabled={
                                                            eliminando
                                                        }
                                                        onClick={() =>
                                                            quitar(
                                                                relacion
                                                            )
                                                        }
                                                    >
                                                        <Unlink size={16} />
                                                    </button>

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
                        className="he-overlay"
                        onMouseDown={cerrarModal}
                    >

                        <div
                            className="he-modal"
                            onMouseDown={evento =>
                                evento.stopPropagation()
                            }
                        >

                            <div className="he-modal-head">

                                <div className="he-modal-icon">
                                    <TreePine size={21} />
                                </div>

                                <div>

                                    <span className="he-kicker">
                                        {modal.modo === "asignar"
                                            ? "Nueva asociación"
                                            : "Editar asociación"
                                        }
                                    </span>

                                    <h2>
                                        {modal.modo === "asignar"
                                            ? "Asignar hábitat"
                                            : "Editar observación"
                                        }
                                    </h2>

                                </div>

                                <button
                                    type="button"
                                    className="he-modal-close"
                                    onClick={cerrarModal}
                                    disabled={guardando}
                                >
                                    <X size={19} />
                                </button>

                            </div>

                            <form
                                className="he-form"
                                onSubmit={guardar}
                                noValidate
                            >

                                <div className="he-modal-body">

                                    <div className="he-modal-species">

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

                                    <div className="he-field">

                                        <label>
                                            Hábitat {modal.modo === "asignar" && "*"}
                                        </label>

                                        {modal.modo === "asignar" ? (
                                            <div className="he-select-action">

                                                <ComboBuscable
                                                    id="he-habitat"
                                                    name="idHabitat"
                                                    ariaLabel="Hábitat"
                                                    value={
                                                        formulario.idHabitat
                                                    }
                                                    onChange={
                                                        cambiarCampo
                                                    }
                                                    className={
                                                        errores.idHabitat
                                                            ? "error"
                                                            : ""
                                                    }
                                                    placeholder="Selecciona un hábitat..."
                                                    searchPlaceholder="Buscar hábitat..."
                                                    options={disponibles.map(
                                                        habitat => ({
                                                            value: habitat.idHabitat,
                                                            label: habitat.nombre
                                                        })
                                                    )}
                                                />

                                                <button
                                                    type="button"
                                                    className="he-register-habitat"
                                                    onClick={registrarHabitat}
                                                >
                                                    <Plus size={15} />
                                                    Registrar hábitat
                                                </button>

                                            </div>
                                        ) : (
                                            <div className="he-fixed-habitat">

                                                <Mountain size={17} />

                                                <strong>
                                                    {modal.relacion
                                                        .nombreHabitat
                                                    }
                                                </strong>

                                            </div>
                                        )}

                                        {errores.idHabitat && (
                                            <small className="he-error">
                                                {errores.idHabitat}
                                            </small>
                                        )}

                                    </div>

                                    <div className="he-field">

                                        <label>
                                            Observación
                                        </label>

                                        <textarea
                                            name="observacion"
                                            rows="6"
                                            maxLength="500"
                                            value={
                                                formulario.observacion
                                            }
                                            onChange={
                                                cambiarCampo
                                            }
                                            placeholder="Ej. Se desarrolla en zonas abiertas, terrenos cultivados y áreas con buena exposición solar."
                                            className={
                                                errores.observacion
                                                    ? "error"
                                                    : ""
                                            }
                                        />

                                        <div className="he-field-foot">

                                            <small className="he-error">
                                                {errores.observacion || ""}
                                            </small>

                                            <small>
                                                {formulario.observacion.length}/500
                                            </small>

                                        </div>

                                    </div>

                                    <div className="he-info">

                                        <Info size={17} />

                                        <span>
                                            {modal.modo === "asignar"
                                                ? "Solo aparecen los hábitats activos que todavía no están asociados a esta especie."
                                                : "El hábitat no puede modificarse directamente. Para cambiarlo debes quitar la relación actual y asignar otro."
                                            }
                                        </span>

                                    </div>

                                </div>

                                <div className="he-modal-footer">

                                    <button
                                        type="button"
                                        className="he-cancel"
                                        onClick={cerrarModal}
                                        disabled={guardando}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="he-primary"
                                        disabled={guardando}
                                    >
                                        {guardando
                                            ? "Guardando..."
                                            : modal.modo === "asignar"
                                                ? "Asignar hábitat"
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

export default HabitatsEspecie;