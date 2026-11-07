import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    GeoJSON,
    Tooltip,
    useMapEvents
} from "react-leaflet";
import axios from "axios";
import Swal from "sweetalert2";
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    CircleOff,
    Info,
    Leaf,
    MapPin,
    MapPinned,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    X
} from "lucide-react";
import { API_URL } from "../../../config";
import {
    buscarDistritoPorCoordenadas,
    cargarDistritosElSalvador
} from "../../../utils/distritosElSalvador";
import {
    actualizarUbicacion,
    crearUbicacion,
    desactivarUbicacion,
    listarUbicacionesEspecie
} from "../../../api/ubicacionEspecieService";
import { obtenerImagenPrincipalMapa } from "../../../api/mapaService";
import ImagenEspecie from "../../../components/especies/ImagenEspecie";
import "leaflet/dist/leaflet.css";
import "../../../styles/mapaEspecies.css";
import "../../../styles/ubicacionesEspecie.css";
import "../../../styles/alertas.css";

const FORMULARIO_VACIO = {
    idDistrito: "",
    nombreDistrito: "",
    departamentoDistrito: "",
    nombreLugar: "",
    latitud: "",
    longitud: "",
    descripcion: "",
    fechaObservacion: ""
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
            nombre?.esPrincipal === true ||
            nombre?.principal === true
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

async function identificarDistrito(lat, lng) {
    const distritos = await cargarDistritosElSalvador();
    return buscarDistritoPorCoordenadas(
        lat,
        lng,
        distritos
    );
}

function SelectorPunto({
    latitud,
    longitud,
    onElegir
}) {
    const lat = Number(latitud);
    const lng = Number(longitud);

    const valido =
        latitud !== "" &&
        longitud !== "" &&
        Number.isFinite(lat) &&
        Number.isFinite(lng);

    useMapEvents({
        click(evento) {
            onElegir(
                evento.latlng.lat.toFixed(7),
                evento.latlng.lng.toFixed(7)
            );
        }
    });

    if (!valido) {
        return null;
    }

    return (
        <CircleMarker
            center={[lat, lng]}
            radius={9}
            pathOptions={{
                color: "#ffffff",
                weight: 3,
                fillColor: "#e37b2b",
                fillOpacity: 1
            }}
        >
            <Tooltip
                permanent
                direction="top"
                offset={[0, -9]}
            >
                Ubicación seleccionada
            </Tooltip>
        </CircleMarker>
    );
}

// Acepta nombres geográficos reales con letras, números y separadores habituales.
// Excluye emojis, pictogramas, símbolos decorativos y etiquetas HTML.
const PATRON_NOMBRE_LUGAR = /^[\p{L}\p{M}\p{N} .,'’()\-/ºª°#]+$/u;
const TIENE_LETRA = /\p{L}/u;

function tieneCaracterControl(texto) {
    return Array.from(texto).some(caracter => {
        const codigo = caracter.codePointAt(0);

        return (
            codigo === 0x7f ||
            (codigo < 0x20 &&
                codigo !== 0x09 &&
                codigo !== 0x0a &&
                codigo !== 0x0d)
        );
    });
}

function obtenerFechaLocal() {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function validarFormulario(formulario, idEspecie) {
    const numeroEspecie = Number(idEspecie);

    if (
        !Number.isInteger(numeroEspecie) ||
        numeroEspecie <= 0
    ) {
        return "No se pudo identificar correctamente la especie.";
    }

    const idDistrito = Number(
        formulario.idDistrito
    );

    if (
        !Number.isInteger(idDistrito) ||
        idDistrito <= 0
    ) {
        return "No se pudo identificar correctamente el distrito del punto seleccionado.";
    }

    const lugar = String(formulario.nombreLugar ?? "").trim();

    if (!lugar) {
        return "El nombre del lugar es obligatorio.";
    }

    if (lugar.length > 200) {
        return "El nombre del lugar no puede superar los 200 caracteres.";
    }

    if (!PATRON_NOMBRE_LUGAR.test(lugar)) {
        return "El nombre del lugar solo permite letras, números, espacios y signos habituales (., - / # y paréntesis). No se permiten emojis ni símbolos especiales.";
    }

    if (!TIENE_LETRA.test(lugar)) {
        return "El nombre del lugar debe contener al menos una letra.";
    }

    const lat = Number(formulario.latitud);
    const lng = Number(formulario.longitud);

    if (
        !Number.isFinite(lat) ||
        lat < 13.1 ||
        lat > 14.5
    ) {
        return "La latitud seleccionada no corresponde a El Salvador.";
    }

    if (
        !Number.isFinite(lng) ||
        lng < -90.2 ||
        lng > -87.6
    ) {
        return "La longitud seleccionada no corresponde a El Salvador.";
    }

    const descripcion = String(formulario.descripcion ?? "");

    if (descripcion.length > 1000) {
        return "La descripción no puede superar los 1,000 caracteres.";
    }

    if (
        /[<>]/.test(descripcion) ||
        tieneCaracterControl(descripcion)
    ) {
        return "La descripción contiene caracteres no permitidos.";
    }

    if (formulario.fechaObservacion) {
        const fecha = String(formulario.fechaObservacion);
        const fechaValida =
            /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
            !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) &&
            new Date(`${fecha}T00:00:00Z`)
                .toISOString()
                .slice(0, 10) === fecha;

        if (
            !fechaValida ||
            fecha < "1900-01-01" ||
            fecha > obtenerFechaLocal()
        ) {
            return "La fecha de observación debe estar entre 1900 y hoy.";
        }
    }

    return "";
}

function formatearFecha(valor) {
    if (!valor) {
        return "Sin fecha";
    }

    const partes = String(valor).split("-");

    if (partes.length !== 3) {
        return valor;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function UbicacionesEspecie() {
    const { idEspecie } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [especie, setEspecie] = useState(
        location.state?.especie || null
    );

    const [
        imagenPrincipal,
        setImagenPrincipal
    ] = useState(null);

    const [
        ubicaciones,
        setUbicaciones
    ] = useState([]);

    const [
        cargando,
        setCargando
    ] = useState(true);

    const [
        guardando,
        setGuardando
    ] = useState(false);

    const [
        formulario,
        setFormulario
    ] = useState(null);

    const [
        editando,
        setEditando
    ] = useState(null);

    const [
        geoEstado,
        setGeoEstado
    ] = useState("");

    const [
        geoEstadoTipo,
        setGeoEstadoTipo
    ] = useState("info");

    const [
        puntoModificado,
        setPuntoModificado
    ] = useState(false);

    const [
        limitesDistritos,
        setLimitesDistritos
    ] = useState([]);

    const geoPeticion = useRef(0);

    function actualizarGeoEstado(mensaje, tipo = "info") {
        setGeoEstado(mensaje);
        setGeoEstadoTipo(tipo);
    }

    useEffect(() => {
        let activo = true;

        cargarDistritosElSalvador()
            .then(features => {
                if (activo) {
                    setLimitesDistritos(features);
                }
            })
            .catch(error => {
                if (activo) {
                    setGeoEstado(
                        `No se pudieron cargar los límites distritales: ${obtenerMensajeError(error)}`
                    );
                    setGeoEstadoTipo("error");
                }
            });

        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [idEspecie]);

    function cambiarEspecie() {
        navigate(
            "/gestion-especies",
            {
                state: {
                    abrirContenido: "ubicaciones",
                    categoria: "entorno"
                }
            }
        );
    }

    function verEnMapa() {
        navigate(
            "/mapa",
            {
                state: {
                    idEspecieMapa:
                        Number(idEspecie),
                    nombreEspecieMapa:
                        especie?.nombreComun ||
                        especie?.nombreCientifico ||
                        ""
                }
            }
        );
    }

    async function cargarDatos() {
        try {
            setCargando(true);

            const [
                datosUbicaciones,
                respuestaEspecie,
                imagen
            ] = await Promise.all([
                listarUbicacionesEspecie(
                    idEspecie
                ),
                axios.get(
                    `${API_URL}/api/especies/${idEspecie}`
                ),
                obtenerImagenPrincipalMapa(
                    idEspecie
                ).catch(() => null)
            ]);

            setUbicaciones(
                Array.isArray(
                    datosUbicaciones
                )
                    ? datosUbicaciones
                    : []
            );

            setImagenPrincipal(
                imagen || null
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
                activa:
                    datos.activa
            });
        } catch (error) {
            await mostrarError(
                "No se pudieron cargar las ubicaciones",
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
            confirmButtonText:
                "Entendido",
            buttonsStyling: false,
            customClass: {
                popup: "flora-alert",
                confirmButton:
                    "flora-alert-confirm"
            }
        });
    }

    function abrirNuevo() {
        if (
            especie?.activa === false
        ) {
            Swal.fire({
                icon: "warning",
                title: "Especie inactiva",
                text: "No puedes registrar ubicaciones nuevas mientras la especie esté desactivada.",
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

        geoPeticion.current++;
        setEditando(null);
        actualizarGeoEstado("");
        setPuntoModificado(false);

        setFormulario({
            ...FORMULARIO_VACIO
        });
    }

    function abrirEditar(
        ubicacion
    ) {
        geoPeticion.current++;

        setEditando(
            ubicacion.idUbicacion
        );

        actualizarGeoEstado(
            ubicacion.nombreDistrito
                ? `Ubicación actual: ${ubicacion.nombreDistrito}${ubicacion.departamentoDistrito ? `, ${ubicacion.departamentoDistrito}` : ""}.`
                : "Puedes conservar el punto actual o seleccionar uno nuevo.",
            "info"
        );

        setPuntoModificado(false);

        setFormulario({
            idDistrito: String(
                ubicacion.idDistrito || ""
            ),
            nombreDistrito:
                ubicacion.nombreDistrito ||
                "",
            departamentoDistrito:
                ubicacion.departamentoDistrito ||
                "",
            nombreLugar:
                ubicacion.nombreLugar ||
                "",
            latitud: String(
                ubicacion.latitud ?? ""
            ),
            longitud: String(
                ubicacion.longitud ?? ""
            ),
            descripcion:
                ubicacion.descripcion ||
                "",
            fechaObservacion:
                ubicacion.fechaObservacion ||
                ""
        });
    }

    function limpiarFormulario() {
        geoPeticion.current++;
        setFormulario(null);
        setEditando(null);
        actualizarGeoEstado("");
        setPuntoModificado(false);
    }

    function cerrarFormulario() {
        if (guardando) {
            return;
        }

        limpiarFormulario();
    }

    function modificarCampo(
        campo,
        valor
    ) {
        if (guardando) {
            return;
        }

        setFormulario(
            actual => ({
                ...actual,
                [campo]: valor
            })
        );
    }

    async function elegirPunto(
        lat,
        lng
    ) {
        if (guardando) {
            return;
        }

        const numero =
            ++geoPeticion.current;

        setPuntoModificado(true);

        actualizarGeoEstado(
            "Identificando distrito...",
            "pending"
        );

        setFormulario(
            actual => ({
                ...actual,
                latitud: lat,
                longitud: lng,
                idDistrito: "",
                nombreDistrito: "",
                departamentoDistrito: ""
            })
        );

        try {
            const resultado =
                await identificarDistrito(
                    lat,
                    lng
                );

            if (
                numero !==
                geoPeticion.current
            ) {
                return;
            }

            if (!resultado) {
                actualizarGeoEstado(
                    "El punto seleccionado no corresponde a un distrito identificado de El Salvador.",
                    "error"
                );

                return;
            }

            const idDistrito =
                resultado.idDistrito ??
                resultado.id_distrito ??
                resultado.id;

            const nombreDistrito =
                resultado.distrito ??
                resultado.nombreDistrito ??
                resultado.nombre_distrito ??
                resultado.na2 ??
                resultado.nam ??
                "";

            const departamento =
                resultado.departamento ??
                resultado.nombreDepartamento ??
                resultado.nombre_departamento ??
                resultado.depto ??
                "";

            if (
                !Number.isInteger(
                    Number(idDistrito)
                ) ||
                Number(idDistrito) <= 0
            ) {
                actualizarGeoEstado(
                    "El GeoJSON identificó el distrito, pero no contiene un idDistrito válido para relacionarlo con la base de datos.",
                    "error"
                );

                return;
            }

            setFormulario(
                actual => ({
                    ...actual,
                    idDistrito:
                        String(idDistrito),
                    nombreDistrito:
                        nombreDistrito,
                    departamentoDistrito:
                        departamento
                })
            );

            actualizarGeoEstado(
                nombreDistrito
                    ? `Distrito identificado: ${nombreDistrito}${departamento ? `, ${departamento}` : ""}.`
                    : "Distrito identificado correctamente.",
                "success"
            );
        } catch (error) {
            if (
                numero ===
                geoPeticion.current
            ) {
                actualizarGeoEstado(
                    `No se pudo validar el distrito: ${obtenerMensajeError(error)}`,
                    "error"
                );
            }
        }
    }

    async function guardarFormulario(
        evento
    ) {
        evento.preventDefault();

        if (
            !formulario ||
            guardando
        ) {
            return;
        }

        if (
            puntoModificado &&
            geoEstado.startsWith(
                "Identificando"
            )
        ) {
            await Swal.fire({
                icon: "info",
                title: "Identificando distrito",
                text: "Espera a que termine la identificación del punto antes de guardar.",
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

        const mensaje =
            validarFormulario(
                formulario,
                idEspecie
            );

        if (mensaje) {
            await Swal.fire({
                icon: "warning",
                title: "Revisa la información",
                text: mensaje,
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

        const estabaEditando =
            Boolean(editando);

        try {
            setGuardando(true);

            const distritoVerificado =
                await identificarDistrito(
                    formulario.latitud,
                    formulario.longitud
                );
            const idDistritoVerificado =
                Number(
                    distritoVerificado?.idDistrito ??
                    distritoVerificado?.id_distrito ??
                    distritoVerificado?.id
                );

            if (
                !distritoVerificado ||
                idDistritoVerificado !==
                    Number(formulario.idDistrito)
            ) {
                await Swal.fire({
                    icon: "warning",
                    title: "Ubicación no válida",
                    text: "El punto debe estar dentro del distrito identificado y coincidir con el distrito que se guardará.",
                    confirmButtonText: "Entendido",
                    buttonsStyling: false,
                    customClass: {
                        popup: "flora-alert",
                        confirmButton: "flora-alert-confirm"
                    }
                });

                return;
            }

            const datos = {
                idEspecie: Number(idEspecie),
                idDistrito: Number(formulario.idDistrito),
                nombreLugar: formulario.nombreLugar.trim(),
                latitud: Number(formulario.latitud),
                longitud: Number(formulario.longitud),
                descripcion: String(formulario.descripcion ?? "").trim() || null,
                fechaObservacion: formulario.fechaObservacion || null
            };

            if (estabaEditando) {
                await actualizarUbicacion(
                    editando,
                    datos
                );
            } else {
                await crearUbicacion(
                    datos
                );
            }

            limpiarFormulario();

            await cargarDatos();

            await Swal.fire({
                icon: "success",
                title: estabaEditando
                    ? "Ubicación actualizada"
                    : "Ubicación registrada",
                text: estabaEditando
                    ? "Los cambios se guardaron correctamente."
                    : "La ubicación fue registrada correctamente.",
                timer: 1600,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarError(
                estabaEditando
                    ? "No se pudo actualizar la ubicación"
                    : "No se pudo registrar la ubicación",
                error
            );
        } finally {
            setGuardando(false);
        }
    }

    async function confirmarDesactivacion(
        ubicacion
    ) {
        const resultado =
            await Swal.fire({
                icon: "warning",
                title: "¿Desactivar ubicación?",
                text: `Se desactivará la ubicación "${ubicacion.nombreLugar}".`,
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

        if (
            !resultado.isConfirmed
        ) {
            return;
        }

        try {
            setGuardando(true);

            await desactivarUbicacion(
                ubicacion.idUbicacion
            );

            await cargarDatos();

            await Swal.fire({
                icon: "success",
                title: "Ubicación desactivada",
                text: "La ubicación dejó de aparecer entre los registros activos.",
                timer: 1500,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });
        } catch (error) {
            await mostrarError(
                "No se pudo desactivar la ubicación",
                error
            );
        } finally {
            setGuardando(false);
        }
    }

    const hoy = obtenerFechaLocal();

    return (
        <div className="geo-page">

            <header className="geo-heading">

                <div>

                    <span className="geo-eyebrow">
                        CONTENIDO · ENTORNO
                    </span>

                    <h1>
                        Ubicaciones de especie
                    </h1>

                    <p>
                        Registra y administra los lugares donde ha sido observada la especie seleccionada.
                    </p>

                </div>

                <div className="geo-heading-actions">

                    <button
                        type="button"
                        className="geo-heading-secondary"
                        onClick={
                            cambiarEspecie
                        }
                        disabled={
                            guardando
                        }
                    >
                        <ArrowLeft size={16} />
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="geo-heading-secondary"
                        onClick={
                            verEnMapa
                        }
                        disabled={
                            cargando ||
                            ubicaciones.length === 0
                        }
                        title={
                            ubicaciones.length === 0
                                ? "La especie no tiene ubicaciones activas para mostrar."
                                : "Ver esta especie en el mapa general."
                        }
                    >
                        <MapPinned size={16} />
                        Ver en mapa
                    </button>

                    <button
                        type="button"
                        className="geo-action-primary"
                        onClick={abrirNuevo}
                        disabled={
                            cargando ||
                            guardando ||
                            especie?.activa === false
                        }
                    >
                        <Plus size={16} />
                        Agregar ubicación
                    </button>

                </div>

            </header>

            <section className="geo-selected-species">

                <div className="geo-selected-species-photo">

                    <ImagenEspecie
                        imagen={
                            imagenPrincipal
                        }
                        nombre={
                            especie?.nombreCientifico
                        }
                        className="geo-selected-species-image"
                        fallback={
                            <span className="geo-selected-species-icon">
                                <Leaf size={20} />
                            </span>
                        }
                    />

                </div>

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

                {especie?.familia && (
                    <span className="geo-selected-family">
                        Familia:{" "}
                        <strong>
                            {especie.familia}
                        </strong>
                    </span>
                )}

            </section>

            <div className="geo-summary">

                <div className="geo-summary-card geo-summary-locations">

                    <span className="geo-summary-icon">
                        <MapPin size={21} />
                    </span>

                    <div className="geo-summary-content">

                        <strong>
                            {ubicaciones.length}
                        </strong>

                        <span>
                            Ubicaciones activas
                        </span>

                    </div>

                </div>

                <div className="geo-summary-card geo-summary-species">

                    <span className="geo-summary-icon">
                        <Leaf size={21} />
                    </span>

                    <div className="geo-summary-content">

                        <strong className="geo-summary-text">
                            {especie?.nombreComun ||
                                "—"
                            }
                        </strong>

                        <span>
                            Especie
                        </span>

                    </div>

                </div>

                <div
                    className={
                        `geo-summary-card geo-summary-status ${especie?.activa === false
                            ? "is-inactive"
                            : "is-active"
                        }`
                    }
                >

                    <span className="geo-summary-icon">
                        {especie?.activa === false
                            ? <CircleOff size={21} />
                            : <CheckCircle2 size={21} />
                        }
                    </span>

                    <div className="geo-summary-content">

                        <strong className="geo-summary-text">
                            {especie?.activa === false
                                ? "Inactiva"
                                : "Activa"
                            }
                        </strong>

                        <span>
                            Estado
                        </span>

                    </div>

                </div>

            </div>

            <section className="geo-management">

                <div className="geo-management-title">

                    <div>

                        <h2>
                            Ubicaciones registradas
                        </h2>

                        <p>
                            Consulta y administra los puntos activos de esta especie.
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={
                            cargarDatos
                        }
                        disabled={
                            cargando ||
                            guardando
                        }
                    >
                        <RefreshCw
                            size={16}
                            className={
                                cargando
                                    ? "geo-spin"
                                    : ""
                            }
                        />
                        Actualizar
                    </button>

                </div>

                <div className="geo-management-list">

                    {cargando ? (
                        <div className="geo-management-empty">

                            <RefreshCw
                                className="geo-spin"
                                size={20}
                            />

                            Cargando ubicaciones...

                        </div>
                    ) : ubicaciones.length === 0 ? (
                        <div className="geo-management-empty">

                            <MapPin size={28} />

                            <strong>
                                Sin ubicaciones registradas
                            </strong>

                            <p>
                                Todavía no existen ubicaciones activas para esta especie.
                            </p>

                            {especie?.activa !== false && (
                                <button
                                    type="button"
                                    className="geo-action-primary"
                                    onClick={abrirNuevo}
                                >
                                    <Plus size={16} />
                                    Registrar primera ubicación
                                </button>
                            )}

                        </div>
                    ) : (
                        ubicaciones.map(
                            ubicacion => (
                                <div
                                    className="geo-management-row"
                                    key={
                                        ubicacion.idUbicacion
                                    }
                                >

                                    <div className="geo-location-info">

                                        <span className="geo-location-icon">
                                            <MapPin size={17} />
                                        </span>

                                        <div>

                                            <strong>
                                                {ubicacion.nombreLugar ||
                                                    "Lugar sin nombre"
                                                }
                                            </strong>

                                            <span>
                                                {ubicacion.nombreDistrito ||
                                                    "Distrito no indicado"
                                                }

                                                {ubicacion.departamentoDistrito
                                                    ? ` · ${ubicacion.departamentoDistrito}`
                                                    : ""
                                                }
                                            </span>

                                            <small>
                                                <CalendarDays size={12} />

                                                {formatearFecha(
                                                    ubicacion.fechaObservacion
                                                )}
                                            </small>

                                        </div>

                                    </div>

                                    <div className="geo-management-actions">

                                        <button
                                            type="button"
                                            disabled={
                                                guardando
                                            }
                                            onClick={() =>
                                                abrirEditar(
                                                    ubicacion
                                                )
                                            }
                                        >
                                            <Pencil size={15} />
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            disabled={
                                                guardando
                                            }
                                            className="geo-danger"
                                            onClick={() =>
                                                confirmarDesactivacion(
                                                    ubicacion
                                                )
                                            }
                                        >
                                            <Trash2 size={15} />
                                            Desactivar
                                        </button>

                                    </div>

                                </div>
                            )
                        )
                    )}

                </div>

            </section>

            {formulario && (
                <div
                    className="geo-backdrop"
                    onMouseDown={
                        evento => {
                            if (
                                evento.target ===
                                evento.currentTarget
                            ) {
                                cerrarFormulario();
                            }
                        }
                    }
                >

                    <aside
                        className="geo-detail geo-form-panel"
                        onMouseDown={
                            evento =>
                                evento.stopPropagation()
                        }
                    >

                        <button
                            type="button"
                            className="geo-close"
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

                        <span className="geo-eyebrow">
                            GESTIÓN DE UBICACIONES
                        </span>

                        <h2>
                            {editando
                                ? "Editar ubicación"
                                : "Nueva ubicación"
                            }
                        </h2>

                        <div className="geo-form-species">

                            <div className="geo-form-species-photo">

                                <ImagenEspecie
                                    imagen={
                                        imagenPrincipal
                                    }
                                    nombre={
                                        especie?.nombreCientifico
                                    }
                                    className="geo-form-species-image"
                                    fallback={
                                        <Leaf size={17} />
                                    }
                                />

                            </div>

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
                            className="geo-form"
                            onSubmit={
                                guardarFormulario
                            }
                        >

                            <label>
                                Nombre del lugar *

                                <input
                                    required
                                    maxLength={200}
                                    disabled={guardando}
                                    value={
                                        formulario.nombreLugar
                                    }
                                    onChange={
                                        evento =>
                                            modificarCampo(
                                                "nombreLugar",
                                                evento.target.value
                                            )
                                    }
                                    placeholder="Ej. Parque Central de San Vicente"
                                    aria-describedby="geo-nombre-ayuda"
                                />
                                <small id="geo-nombre-ayuda" className="geo-field-help">
                                    Se permiten letras, tildes, números y signos habituales. No emojis ni símbolos decorativos.
                                </small>
                            </label>

                            <div className="geo-location-picker">

                                <strong>
                                    <MapPin size={16} />
                                    Selecciona la ubicación en el mapa *
                                </strong>

                                <p>
                                    Selecciona un punto dentro de los límites verdes. El distrito se identificará automáticamente.
                                </p>

                                <div
                                    className="geo-picker-map"
                                    style={
                                        guardando
                                            ? { pointerEvents: "none", opacity: 0.65 }
                                            : undefined
                                    }
                                >

                                    <MapContainer
                                        key={
                                            editando ||
                                            "nueva"
                                        }
                                        center={
                                            formulario.latitud !== "" &&
                                                formulario.longitud !== ""
                                                ? [
                                                    Number(
                                                        formulario.latitud
                                                    ),
                                                    Number(
                                                        formulario.longitud
                                                    )
                                                ]
                                                : [
                                                    13.75,
                                                    -88.95
                                                ]
                                        }
                                        zoom={
                                            formulario.latitud !== ""
                                                ? 13
                                                : 8
                                        }
                                        minZoom={7}
                                        maxZoom={18}
                                        scrollWheelZoom
                                        style={{
                                            height: "100%",
                                            width: "100%"
                                        }}
                                    >

                                        <TileLayer
                                            attribution="&copy; OpenStreetMap contributors"
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />

                                        {limitesDistritos.length > 0 && (
                                            <GeoJSON
                                                data={{
                                                    type: "FeatureCollection",
                                                    features: limitesDistritos
                                                }}
                                                style={{
                                                    color: "#2F7A58",
                                                    weight: 1.1,
                                                    opacity: 0.75,
                                                    fillColor: "#74B68A",
                                                    fillOpacity: 0.045,
                                                    interactive: false
                                                }}
                                            />
                                        )}

                                        <SelectorPunto
                                            latitud={
                                                formulario.latitud
                                            }
                                            longitud={
                                                formulario.longitud
                                            }
                                            onElegir={
                                                elegirPunto
                                            }
                                        />

                                    </MapContainer>

                                </div>

                                {geoEstado && (
                                    <div
                                        className={`geo-picker-result is-${geoEstadoTipo}`}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        <Info size={15} />
                                        {geoEstado}
                                    </div>
                                )}

                                {formulario.idDistrito && (
                                    <div className="geo-detected-location">

                                        <div>

                                            <small>
                                                Distrito detectado
                                            </small>

                                            <strong>
                                                {formulario.nombreDistrito ||
                                                    "Distrito identificado"
                                                }
                                            </strong>

                                        </div>

                                        {formulario.departamentoDistrito && (
                                            <div>

                                                <small>
                                                    Departamento
                                                </small>

                                                <strong>
                                                    {formulario.departamentoDistrito}
                                                </strong>

                                            </div>
                                        )}

                                    </div>
                                )}

                                {formulario.latitud !== "" &&
                                    formulario.longitud !== "" && (
                                        <div className="geo-coordinates-preview">

                                            <MapPin size={14} />

                                            <span>
                                                {Number(
                                                    formulario.latitud
                                                ).toFixed(6)}
                                                {", "}
                                                {Number(
                                                    formulario.longitud
                                                ).toFixed(6)}
                                            </span>

                                        </div>
                                    )
                                }

                            </div>

                            <label>
                                Fecha de observación

                                <input
                                    type="date"
                                    min="1900-01-01"
                                    max={hoy}
                                    disabled={guardando}
                                    value={
                                        formulario.fechaObservacion
                                    }
                                    onChange={
                                        evento =>
                                            modificarCampo(
                                                "fechaObservacion",
                                                evento.target.value
                                            )
                                    }
                                />
                            </label>

                            <label>
                                Descripción (opcional)

                                <textarea
                                    rows="4"
                                    maxLength={1000}
                                    disabled={guardando}
                                    value={
                                        formulario.descripcion
                                    }
                                    onChange={
                                        evento =>
                                            modificarCampo(
                                                "descripcion",
                                                evento.target.value
                                            )
                                    }
                                    placeholder="Detalles sobre el lugar o el avistamiento..."
                                />
                                <small className="geo-field-help">
                                    {String(formulario.descripcion ?? "").length}/1,000 caracteres.
                                </small>
                            </label>

                            <div className="geo-form-buttons">

                                <button
                                    type="button"
                                    disabled={
                                        guardando
                                    }
                                    onClick={
                                        cerrarFormulario
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="geo-action-primary"
                                    disabled={
                                        guardando ||
                                        geoEstado.startsWith(
                                            "Identificando"
                                        )
                                    }
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : editando
                                            ? "Guardar cambios"
                                            : "Registrar ubicación"
                                    }
                                </button>

                            </div>

                        </form>

                    </aside>

                </div>
            )}

        </div>
    );
}