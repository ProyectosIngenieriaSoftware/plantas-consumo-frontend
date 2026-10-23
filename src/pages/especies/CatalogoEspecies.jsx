import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Leaf,
    X,
    BookOpen,
    MapPin,
    FlaskConical,
    Tags,
    TriangleAlert,
    Sprout,
    RefreshCw,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import Swal from "sweetalert2";
import { listarEspeciesPublicadas } from "../../api/especieService";
import "../../styles/catalogoEspecies.css";
import "../../styles/alertas.css";

const POR_PAGINA = 9;

function obtenerId(especie) {
    return especie?.idEspecie ?? especie?.id;
}

function obtenerNombrePrincipal(especie) {
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

function obtenerMensaje(error) {
    const data = error?.response?.data;

    if (typeof data === "string") {
        return data;
    }

    return data?.mensaje ||
        data?.message ||
        data?.error ||
        "No fue posible comunicarse con el servidor.";
}

function CatalogoEspecies() {
    const [especies, setEspecies] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [familia, setFamilia] = useState("TODAS");
    const [seleccionada, setSeleccionada] = useState(null);
    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        cargar();
    }, []);

    async function cargar() {
        try {
            setCargando(true);

            const datos = await listarEspeciesPublicadas();

            setEspecies(
                Array.isArray(datos)
                    ? datos
                    : datos?.content || []
            );

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "No se pudo cargar el catálogo",
                text: obtenerMensaje(error),
                confirmButtonText: "Entendido",
                buttonsStyling: false,
                customClass: {
                    popup: "flora-alert",
                    confirmButton: "flora-alert-confirm"
                }
            });

        } finally {
            setCargando(false);
        }
    }

    const familias = useMemo(() => {
        return [
            ...new Set(
                especies
                    .map(e => e?.taxonomia?.familia)
                    .filter(Boolean)
            )
        ].sort((a, b) =>
            a.localeCompare(b, "es")
        );
    }, [especies]);

    const filtradas = useMemo(() => {
        const texto = busqueda
            .trim()
            .toLowerCase();

        return especies.filter(especie => {
            const nombres = Array.isArray(
                especie?.nombresComunes
            )
                ? especie.nombresComunes
                    .map(n => n?.nombre || "")
                    .join(" ")
                : "";

            const contenido = [
                especie?.nombreCientifico,
                especie?.descripcion,
                especie?.origen,
                especie?.taxonomia?.familia,
                especie?.taxonomia?.genero,
                especie?.taxonomia?.especieTaxonomica,
                nombres
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const coincideBusqueda =
                !texto ||
                contenido.includes(texto);

            const coincideFamilia =
                familia === "TODAS" ||
                especie?.taxonomia?.familia === familia;

            return coincideBusqueda && coincideFamilia;
        });
    }, [especies, busqueda, familia]);

    useEffect(() => {
        setPagina(1);
    }, [busqueda, familia]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(
            filtradas.length / POR_PAGINA
        )
    );

    const paginaActual = Math.min(
        pagina,
        totalPaginas
    );

    const visibles = filtradas.slice(
        (paginaActual - 1) * POR_PAGINA,
        paginaActual * POR_PAGINA
    );

    return (
        <div className="ce-page">

            <section className="ce-hero">

                <div className="ce-hero-content">

                    <span className="ce-eyebrow">
                        <Sprout size={15} />
                        Catálogo Botánico
                    </span>

                    <h1>
                        Explora nuestras especies
                        <span> vegetales</span>
                    </h1>

                    <p>
                        Consulta información botánica,
                        taxonómica y cultural de las
                        especies publicadas en el catálogo.
                    </p>

                    <label className="ce-search">
                        <Search size={19} />

                        <input
                            value={busqueda}
                            onChange={(e) =>
                                setBusqueda(
                                    e.target.value
                                )
                            }
                            placeholder="Buscar por nombre científico, nombre común o familia..."
                        />

                        {busqueda && (
                            <button
                                type="button"
                                onClick={() =>
                                    setBusqueda("")
                                }
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </label>

                </div>

                <div className="ce-hero-decoration">
                    <Leaf size={115} />
                </div>

            </section>

            <section className="ce-section">

                <div className="ce-section-head">

                    <div>
                        <span>
                            Especies disponibles
                        </span>

                        <h2>
                            Catálogo de especies
                        </h2>

                        <p>
                            {filtradas.length}{" "}
                            {filtradas.length === 1
                                ? "especie encontrada"
                                : "especies encontradas"}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="ce-refresh"
                        onClick={cargar}
                        title="Actualizar catálogo"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                cargando
                                    ? "ce-spin"
                                    : ""
                            }
                        />
                        Actualizar
                    </button>

                </div>

                <div className="ce-filters">

                    <button
                        type="button"
                        className={
                            familia === "TODAS"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setFamilia("TODAS")
                        }
                    >
                        Todas
                        <span>
                            {especies.length}
                        </span>
                    </button>

                    {familias.map(item => {

                        const cantidad =
                            especies.filter(
                                e =>
                                    e?.taxonomia?.familia ===
                                    item
                            ).length;

                        return (
                            <button
                                type="button"
                                key={item}
                                className={
                                    familia === item
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setFamilia(item)
                                }
                            >
                                {item}

                                <span>
                                    {cantidad}
                                </span>
                            </button>
                        );
                    })}

                </div>

                {cargando ? (
                    <div className="ce-loading">

                        <div className="ce-loader" />

                        <strong>
                            Cargando catálogo...
                        </strong>

                        <span>
                            Obteniendo especies publicadas.
                        </span>

                    </div>

                ) : visibles.length === 0 ? (
                    <div className="ce-empty">

                        <Leaf size={40} />

                        <strong>
                            No encontramos especies
                        </strong>

                        <p>
                            Prueba con otra búsqueda o
                            cambia el filtro seleccionado.
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                setBusqueda("");
                                setFamilia("TODAS");
                            }}
                        >
                            Limpiar filtros
                        </button>

                    </div>

                ) : (
                    <div className="ce-grid">

                        {visibles.map(especie => (
                            <article
                                className="ce-card"
                                key={obtenerId(especie)}
                            >

                                <div className="ce-card-cover">

                                    <div className="ce-leaf-bg">
                                        <Leaf size={55} />
                                    </div>

                                    <span className="ce-family">
                                        {especie
                                            ?.taxonomia
                                            ?.familia ||
                                            "Flora"}
                                    </span>

                                </div>

                                <div className="ce-card-body">

                                    <span className="ce-common-name">
                                        {obtenerNombrePrincipal(
                                            especie
                                        )}
                                    </span>

                                    <h3>
                                        {especie.nombreCientifico}
                                    </h3>

                                    <div className="ce-tax-mini">
                                        <span>
                                            <FlaskConical
                                                size={13}
                                            />

                                            {especie
                                                ?.taxonomia
                                                ?.genero ||
                                                "Sin género"}
                                        </span>

                                        {especie?.origen && (
                                            <span>
                                                <MapPin
                                                    size={13}
                                                />

                                                {especie.origen}
                                            </span>
                                        )}
                                    </div>

                                    <p>
                                        {especie.descripcion ||
                                            "Sin descripción disponible."}
                                    </p>

                                </div>

                                <div className="ce-card-footer">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSeleccionada(
                                                especie
                                            )
                                        }
                                    >
                                        <BookOpen size={16} />
                                        Ver especie
                                    </button>

                                </div>

                            </article>
                        ))}

                    </div>
                )}

                {!cargando &&
                    filtradas.length > 0 && (
                        <div className="ce-pagination">

                            <span>
                                Mostrando{" "}
                                <strong>
                                    {
                                        (paginaActual - 1) *
                                        POR_PAGINA + 1
                                    }
                                </strong>
                                {" "}a{" "}
                                <strong>
                                    {Math.min(
                                        paginaActual *
                                        POR_PAGINA,
                                        filtradas.length
                                    )}
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
                                            p => p - 1
                                        )
                                    }
                                >
                                    <ChevronLeft
                                        size={17}
                                    />
                                </button>

                                <span>
                                    {paginaActual}
                                    {" / "}
                                    {totalPaginas}
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        paginaActual ===
                                        totalPaginas
                                    }
                                    onClick={() =>
                                        setPagina(
                                            p => p + 1
                                        )
                                    }
                                >
                                    <ChevronRight
                                        size={17}
                                    />
                                </button>

                            </div>

                        </div>
                    )}

            </section>

            {seleccionada && (
                <DetalleEspecie
                    especie={seleccionada}
                    onCerrar={() =>
                        setSeleccionada(null)
                    }
                />
            )}

        </div>
    );
}

function DetalleEspecie({
    especie,
    onCerrar
}) {
    const nombres = Array.isArray(
        especie?.nombresComunes
    )
        ? especie.nombresComunes
        : [];

    const taxonomia =
        especie?.taxonomia || {};

    return (
        <div
            className="ce-modal-backdrop"
            onMouseDown={onCerrar}
        >
            <div
                className="ce-modal"
                onMouseDown={(e) =>
                    e.stopPropagation()
                }
            >

                <div className="ce-modal-cover">

                    <Leaf size={60} />

                    <button
                        type="button"
                        onClick={onCerrar}
                    >
                        <X size={19} />
                    </button>

                </div>

                <div className="ce-modal-body">

                    <span className="ce-modal-common">
                        {obtenerNombrePrincipal(
                            especie
                        )}
                    </span>

                    <h2>
                        {especie.nombreCientifico}
                    </h2>

                    {taxonomia.familia && (
                        <span className="ce-modal-family">
                            {taxonomia.familia}
                        </span>
                    )}

                    <div className="ce-detail-section">

                        <h3>
                            <BookOpen size={17} />
                            Descripción
                        </h3>

                        <p>
                            {especie.descripcion ||
                                "Sin información registrada."}
                        </p>

                    </div>

                    <div className="ce-detail-grid">

                        <DetalleTexto
                            titulo="Origen"
                            valor={especie.origen}
                        />

                        <DetalleTexto
                            titulo="Propiedades"
                            valor={
                                especie.propiedades
                            }
                        />

                        <DetalleTexto
                            titulo="Importancia cultural"
                            valor={
                                especie.importanciaCultural
                            }
                        />

                        <DetalleTexto
                            titulo="Advertencias"
                            valor={
                                especie.advertencias
                            }
                            alerta
                        />

                    </div>

                    <div className="ce-detail-section">

                        <h3>
                            <FlaskConical size={17} />
                            Clasificación taxonómica
                        </h3>

                        <div className="ce-taxonomy">

                            <TaxonomiaDato
                                titulo="Reino"
                                valor={
                                    taxonomia.reino ||
                                    "Plantae"
                                }
                            />

                            <TaxonomiaDato
                                titulo="División"
                                valor={
                                    taxonomia.division
                                }
                            />

                            <TaxonomiaDato
                                titulo="Clase"
                                valor={
                                    taxonomia.clase
                                }
                            />

                            <TaxonomiaDato
                                titulo="Orden"
                                valor={
                                    taxonomia.ordenTaxonomico
                                }
                            />

                            <TaxonomiaDato
                                titulo="Familia"
                                valor={
                                    taxonomia.familia
                                }
                            />

                            <TaxonomiaDato
                                titulo="Género"
                                valor={
                                    taxonomia.genero
                                }
                            />

                            <TaxonomiaDato
                                titulo="Especie"
                                valor={
                                    taxonomia.especieTaxonomica
                                }
                            />

                            <TaxonomiaDato
                                titulo="Subespecie"
                                valor={
                                    taxonomia.subespecie
                                }
                            />

                        </div>

                    </div>

                    <div className="ce-detail-section">

                        <h3>
                            <Tags size={17} />
                            Nombres comunes
                        </h3>

                        {nombres.length === 0 ? (
                            <p className="ce-no-data">
                                No hay nombres comunes
                                registrados.
                            </p>
                        ) : (
                            <div className="ce-name-list">

                                {nombres.map(
                                    (nombre, index) => (
                                        <div
                                            key={
                                                nombre.idNombreComun ??
                                                nombre.id ??
                                                index
                                            }
                                            className={`ce-name-item ${nombre.esPrincipal
                                                    ? "principal"
                                                    : ""
                                                }`}
                                        >
                                            <div>
                                                <strong>
                                                    {nombre.nombre}
                                                </strong>

                                                <span>
                                                    {nombre.region ||
                                                        "Sin región"}
                                                </span>
                                            </div>

                                            {nombre.esPrincipal && (
                                                <em>
                                                    Principal
                                                </em>
                                            )}

                                        </div>
                                    )
                                )}

                            </div>
                        )}

                    </div>

                </div>

            </div>
        </div>
    );
}

function DetalleTexto({
    titulo,
    valor,
    alerta = false
}) {
    if (!valor) {
        return null;
    }

    return (
        <div
            className={`ce-info-card ${alerta
                    ? "warning"
                    : ""
                }`}
        >
            {alerta && (
                <TriangleAlert size={17} />
            )}

            <span>{titulo}</span>

            <p>{valor}</p>
        </div>
    );
}

function TaxonomiaDato({
    titulo,
    valor
}) {
    if (!valor) {
        return null;
    }

    return (
        <div>
            <span>{titulo}</span>
            <strong>{valor}</strong>
        </div>
    );
}

export default CatalogoEspecies;