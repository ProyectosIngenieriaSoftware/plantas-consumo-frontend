import { useEffect, useMemo, useState } from "react";
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
    ChevronRight
} from "lucide-react";
import { API_URL } from "../../config";
import "../../styles/gestionEspecies.css";
import "../../styles/alertas.css";

const ID_VALIDADOR = Number(import.meta.env.VITE_USUARIO_ID || 1);
const ID_PUBLICADOR = Number(import.meta.env.VITE_USUARIO_ID || 1);

const ESTADOS = {
    BORRADOR: "Borrador",
    EN_REVISION: "En revisión",
    PUBLICADA: "Publicada",
    RECHAZADA: "Rechazada"
};

const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({
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

    return String(estado || "").toLowerCase();
}

function GestionEspecies() {
    const [especies, setEspecies] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [accionando, setAccionando] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [filtroActivo, setFiltroActivo] = useState("todas");
    const [etapa, setEtapa] = useState("revision");

    useEffect(() => {
        cargarEspecies();
    }, []);

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
        const data = error?.response?.data;

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
            Array.isArray(data.erroresValidacion) &&
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
        if (
            !Array.isArray(
                especie?.nombresComunes
            )
        ) {
            return "Sin nombre común";
        }

        const principal =
            especie.nombresComunes.find(
                n =>
                    n.esPrincipal &&
                    n.activo !== false
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
            busqueda.trim().toLowerCase();

        if (!texto) {
            return true;
        }

        const nombres =
            Array.isArray(
                especie?.nombresComunes
            )
                ? especie.nombresComunes
                    .map(n =>
                        `${n.nombre || ""} ${n.region || ""}`
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

    const especiesFiltradas = useMemo(
        () => especies.filter(
            e =>
                coincideBusqueda(e) &&
                coincideActivo(e)
        ),
        [
            especies,
            busqueda,
            filtroActivo
        ]
    );

    const revision = useMemo(
        () => especiesFiltradas.filter(
            e =>
                e.estadoPublicacion === "BORRADOR" ||
                e.estadoPublicacion === "RECHAZADA"
        ),
        [especiesFiltradas]
    );

    const validacion = useMemo(
        () => especiesFiltradas.filter(
            e =>
                e.estadoPublicacion === "EN_REVISION" &&
                !estaValidada(e)
        ),
        [especiesFiltradas]
    );

    const publicacion = useMemo(
        () => especiesFiltradas.filter(
            e =>
                e.estadoPublicacion === "EN_REVISION" &&
                estaValidada(e)
        ),
        [especiesFiltradas]
    );

    const publicadas = useMemo(
        () => especiesFiltradas.filter(
            e =>
                e.estadoPublicacion === "PUBLICADA"
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
        const resultado = await Swal.fire({
            icon: peligro
                ? "warning"
                : "question",
            title: titulo,
            text: texto,
            showCancelButton: true,
            confirmButtonText: boton,
            cancelButtonText: "Cancelar",
            reverseButtons: true,
            buttonsStyling: false,
            customClass: {
                popup: "flora-alert",
                confirmButton:
                    peligro
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
        const ok = await confirmarAccion({
            titulo: "Enviar a revisión",
            texto: `La especie "${especie.nombreCientifico}" será enviada a revisión.`,
            boton: "Enviar",
            callback: () =>
                axios.patch(
                    `${API_URL}/api/especies/${especie.idEspecie}/enviar-revision`
                ),
            exitoTitulo: "Enviada a revisión",
            exitoTexto: "La especie ahora está pendiente de validación."
        });

        if (ok) {
            setEtapa("validacion");
        }
    }

    async function validarEspecie(especie) {
        const ok = await confirmarAccion({
            titulo: "Validar especie",
            texto: `¿Confirmas que "${especie.nombreCientifico}" cumple los requisitos?`,
            boton: "Validar",
            callback: () =>
                axios.patch(
                    `${API_URL}/api/especies/${especie.idEspecie}/validar`,
                    null,
                    {
                        params: {
                            idValidador:
                                ID_VALIDADOR
                        }
                    }
                ),
            exitoTitulo: "Especie validada",
            exitoTexto: "La ficha quedó lista para publicación."
        });

        if (ok) {
            setEtapa("publicacion");
        }
    }

    async function publicarEspecie(especie) {
        await confirmarAccion({
            titulo: "Publicar especie",
            texto: `"${especie.nombreCientifico}" será visible en el catálogo público.`,
            boton: "Publicar",
            callback: () =>
                axios.patch(
                    `${API_URL}/api/especies/${especie.idEspecie}/publicar`,
                    null,
                    {
                        params: {
                            idPublicador:
                                ID_PUBLICADOR
                        }
                    }
                ),
            exitoTitulo: "Especie publicada",
            exitoTexto: "La especie ya está disponible en el catálogo."
        });
    }

    async function rechazarEspecie(especie) {
        const ok = await confirmarAccion({
            titulo: "Rechazar especie",
            texto: `La ficha "${especie.nombreCientifico}" será rechazada.`,
            boton: "Rechazar",
            peligro: true,
            callback: () =>
                axios.patch(
                    `${API_URL}/api/especies/${especie.idEspecie}/rechazar`
                ),
            exitoTitulo: "Ficha rechazada",
            exitoTexto: "La especie deberá volver al proceso de revisión."
        });

        if (ok) {
            setEtapa("revision");
        }
    }

    async function desactivarEspecie(especie) {
        await confirmarAccion({
            titulo: "Dar de baja",
            texto: `La especie "${especie.nombreCientifico}" quedará inactiva.`,
            boton: "Desactivar",
            peligro: true,
            callback: () =>
                axios.delete(
                    `${API_URL}/api/especies/${especie.idEspecie}`
                ),
            exitoTitulo: "Especie desactivada",
            exitoTexto: "La especie quedó inactiva."
        });
    }

    function verDetalle(especie) {
        const fila = (titulo, valor) => `
            <div class="gf-det-row">
                <span>${esc(titulo)}</span>
                <strong>${esc(valor)}</strong>
            </div>
        `;

        const bloque = (titulo, valor) => `
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
                    .map(n => `
                        <div class="gf-det-name ${n.esPrincipal ? "principal" : ""}">
                            <div>
                                <strong>${esc(n.nombre)}</strong>
                                <span>${esc(n.region || "Sin región")}</span>
                            </div>
                            ${n.esPrincipal
                            ? "<em>Principal</em>"
                            : ""}
                        </div>
                    `)
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

                    <div class="gf-det-top">

                        <span class="gf-badge gf-st-${claseEstado(especie)}">
                            ${esc(etiquetaEstado(especie))}
                        </span>

                        <span class="gf-avail ${especie.activa ? "on" : "off"}">
                            <i></i>
                            ${especie.activa
                    ? "Activa"
                    : "Inactiva"}
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
                popup: "flora-alert flora-alert-detail",
                confirmButton: "flora-alert-confirm"
            }
        });
    }

    function tarjeta(especie, tipo) {
        const comun =
            nombreComunPrincipal(especie);

        const { familia, genero } =
            taxonomiaResumen(especie);

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

                        {especie.imagenUrl ? (
                            <img
                                src={especie.imagenUrl}
                                alt={
                                    especie.nombreCientifico
                                }
                            />
                        ) : (
                            <div className="gf-card-placeholder">
                                <Leaf size={30} />
                            </div>
                        )}

                    </div>

                    <div className="gf-card-info">

                        <div className="gf-card-top">

                            <div className="gf-card-main">

                                <h4>
                                    {especie.nombreCientifico}
                                </h4>

                                <p>
                                    {comun}
                                </p>

                            </div>

                            <span
                                className={`gf-badge gf-st-${claseEstado(especie)}`}
                            >
                                {etiquetaEstado(especie)}
                            </span>

                        </div>

                        <div className="gf-tags">

                            <span>
                                <b>Familia</b>
                                {familia}
                            </span>

                            <span>
                                <b>Género</b>
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
                                    : "Inactiva"}

                            </span>

                        </div>

                        <p className="gf-card-desc">
                            {especie.descripcion ||
                                "Sin descripción."}
                        </p>

                    </div>

                </div>

                <div className="gf-actions">

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

                    {tipo === "revision" &&
                        especie.activa && (
                            <>
                                <button
                                    type="button"
                                    className="gf-btn gf-btn-primary gf-btn-main"
                                    disabled={accionando}
                                    onClick={() =>
                                        enviarRevision(
                                            especie
                                        )
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
                                        desactivarEspecie(
                                            especie
                                        )
                                    }
                                >
                                    <Ban size={16} />
                                    Dar de baja
                                </button>
                            </>
                        )}

                    {tipo === "validacion" &&
                        especie.activa && (
                            <>
                                <button
                                    type="button"
                                    className="gf-btn gf-btn-success gf-btn-main"
                                    disabled={accionando}
                                    onClick={() =>
                                        validarEspecie(
                                            especie
                                        )
                                    }
                                >
                                    <CheckCircle2
                                        size={16}
                                    />
                                    Validar especie
                                </button>

                                <button
                                    type="button"
                                    className="gf-btn gf-btn-danger"
                                    disabled={accionando}
                                    onClick={() =>
                                        rechazarEspecie(
                                            especie
                                        )
                                    }
                                >
                                    <XCircle size={16} />
                                    Rechazar
                                </button>
                            </>
                        )}

                    {tipo === "publicacion" &&
                        especie.activa && (
                            <>
                                <button
                                    type="button"
                                    className="gf-btn gf-btn-publish gf-btn-main"
                                    disabled={accionando}
                                    onClick={() =>
                                        publicarEspecie(
                                            especie
                                        )
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
                                        rechazarEspecie(
                                            especie
                                        )
                                    }
                                >
                                    <XCircle size={16} />
                                    Rechazar
                                </button>
                            </>
                        )}

                </div>

            </article>
        );
    }

    const configuracion = {
        revision: {
            titulo: "Revisión",
            subtitulo: "Especies nuevas o rechazadas que deben enviarse a revisión.",
            paso: "Paso 1",
            icono: FilePenLine,
            lista: revision,
            vacio: "No hay especies pendientes de revisión."
        },
        validacion: {
            titulo: "Validación",
            subtitulo: "Especies revisadas que están pendientes de validación.",
            paso: "Paso 2",
            icono: CheckCircle2,
            lista: validacion,
            vacio: "No hay especies pendientes de validación."
        },
        publicacion: {
            titulo: "Publicación",
            subtitulo: "Especies validadas y listas para publicar en el catálogo.",
            paso: "Paso 3",
            icono: Upload,
            lista: publicacion,
            vacio: "No hay especies listas para publicar."
        }
    };

    const actual =
        configuracion[etapa];

    const IconoActual =
        actual.icono;

    return (
        <section className="gf-page">

            <div className="gf-hero">

                <div>

                    <span className="gf-overline">
                        Gestión / Flujo editorial
                    </span>

                    <h1>
                        Gestión de especies
                    </h1>

                    <p>
                        El proceso se administra de forma independiente
                        en revisión, validación y publicación.
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

            <div className="gf-toolbar">

                <label className="gf-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Buscar especie, nombre común, género o familia..."
                        value={busqueda}
                        onChange={(e) =>
                            setBusqueda(
                                e.target.value
                            )
                        }
                    />

                </label>

                <div className="gf-filtros">

                    {[
                        ["todas", "Todas"],
                        ["activas", "Activas"],
                        ["inactivas", "Inactivas"]
                    ].map(([valor, texto]) => (
                        <button
                            key={valor}
                            type="button"
                            className={
                                filtroActivo === valor
                                    ? "on"
                                    : ""
                            }
                            onClick={() =>
                                setFiltroActivo(
                                    valor
                                )
                            }
                        >
                            {texto}
                        </button>
                    ))}

                </div>

            </div>

            {cargando ? (
                <div className="gf-empty">

                    <span className="gf-loader" />

                    <h3>
                        Cargando especies...
                    </h3>

                    <p>
                        Espera un momento mientras consultamos
                        la información.
                    </p>

                </div>
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

                                {actual.lista.map(
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

        </section>
    );
}

export default GestionEspecies;