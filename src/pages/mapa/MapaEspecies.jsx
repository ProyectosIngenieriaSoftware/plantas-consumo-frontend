import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    GeoJSON,
    Tooltip,
    useMap
} from "react-leaflet";
import { LatLngBounds, geoJSON } from "leaflet";
import {
    Search,
    RotateCcw,
    Leaf,
    MapPin,
    MapPinned,
    Eye,
    CalendarDays,
    Check,
    ChevronDown,
    Info,
    X,
    AlertCircle,
    RefreshCw
} from "lucide-react";
import {
    obtenerDepartamentosMapa,
    obtenerEspeciesMapa,
    cargarUbicacionesMapa
} from "../../api/mapaService";
import ImagenEspecie from "../../components/especies/ImagenEspecie";
import {
    buscarDistritoPorCoordenadas,
    cargarDistritosElSalvador
} from "../../utils/distritosElSalvador";
import "leaflet/dist/leaflet.css";
import "../../styles/mapaEspecies.css";

const PAIS = [
    [13.10, -90.20],
    [14.50, -87.65]
];

const CENTROS = {
    "Ahuachapán": [13.92, -89.85],
    "Santa Ana": [14.04, -89.55],
    "Sonsonate": [13.72, -89.72],
    "Chalatenango": [14.18, -89.09],
    "La Libertad": [13.68, -89.34],
    "San Salvador": [13.70, -89.20],
    "Cuscatlán": [13.73, -88.94],
    "La Paz": [13.48, -89.04],
    "Cabañas": [13.88, -88.75],
    "San Vicente": [13.64, -88.78],
    "Usulután": [13.45, -88.45],
    "San Miguel": [13.49, -88.18],
    "Morazán": [13.77, -88.11],
    "La Unión": [13.34, -87.84]
};

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function LimitesTerritoriales({features,departamento,municipio,distrito}) {
    const mapa=useMap();
    const seleccion=useMemo(()=>features.filter(f=>
        (!departamento||normalizar(f.properties.departamento)===normalizar(departamento))&&
        (!municipio||normalizar(f.properties.municipio)===normalizar(municipio))&&
        (!distrito||normalizar(f.properties.distrito)===normalizar(distrito))
    ),[features,departamento,municipio,distrito]);
    useEffect(()=>{
        if(!seleccion.length||(!municipio&&!distrito))return;
        const capa=geoJSON({type:"FeatureCollection",features:seleccion});
        const bounds=capa.getBounds();
        if(bounds.isValid())mapa.flyToBounds(bounds.pad(.12),{maxZoom:distrito?13:11,duration:1});
    },[mapa,seleccion,municipio,distrito]);
    if(!features.length)return null;
    return <GeoJSON key={`${departamento}-${municipio}-${distrito}-${features.length}`} data={{type:"FeatureCollection",features:seleccion}} style={{color:"#27866b",weight:distrito?2.5:1,fillColor:"#36a88a",fillOpacity:distrito?.16:.035}} onEachFeature={(feature,layer)=>layer.bindTooltip(`${feature.properties.distrito} · ${feature.properties.municipio} · ${feature.properties.departamento}`,{sticky:true})}/>;
}

function nombreComun(especie) {
    const nombres = Array.isArray(
        especie?.nombresComunes
    )
        ? especie.nombresComunes
        : [];

    const principal = nombres.find(
        nombre =>
            nombre.esPrincipal ||
            nombre.principal
    );

    return principal?.nombre ||
        nombres[0]?.nombre ||
        especie?.nombreCientifico ||
        "Especie sin nombre";
}

function ComboBuscable({
    id,
    opciones,
    value,
    onChange,
    label,
    placeholder,
    clase
}) {
    const [abierto, setAbierto] = useState(false);
    const [termino, setTermino] = useState("");
    const [indiceActivo, setIndiceActivo] = useState(-1);
    const idLista = `${id}-options`;
    const inputRef = useRef(null);
    const opcionSeleccionada = opciones.find(
        opcion => opcion.value === value
    );

    const opcionesFiltradas = useMemo(() => {
        const terminoNormalizado = normalizar(termino);
        return opciones.filter(opcion =>
            normalizar(`${opcion.label} ${opcion.detail || ""}`)
                .includes(terminoNormalizado)
        );
    }, [opciones, termino]);

    function seleccionar(opcion) {
        onChange(opcion.value);
        setTermino("");
        setAbierto(false);
        setIndiceActivo(-1);
    }

    function manejarTeclado(evento) {
        if (evento.key === "ArrowDown") {
            evento.preventDefault();
            setAbierto(true);
            setIndiceActivo(indice =>
                Math.min(indice + 1, opcionesFiltradas.length - 1)
            );
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            setAbierto(true);
            setIndiceActivo(indice => Math.max(indice - 1, 0));
        } else if (evento.key === "Enter" && abierto) {
            evento.preventDefault();
            const opcionActiva = opcionesFiltradas[indiceActivo];
            if (opcionActiva) {
                seleccionar(opcionActiva);
            }
        } else if (evento.key === "Escape") {
            setAbierto(false);
            setTermino("");
            inputRef.current?.blur();
        }
    }

    return (
        <div className={`geo-filter-combobox ${clase}`}>
            <div
                className={`geo-search geo-filter-combobox-control${abierto ? " is-open" : ""}`}
                onClick={() => {
                    if (!abierto) {
                        setTermino("");
                        setIndiceActivo(-1);
                        setAbierto(true);
                        inputRef.current?.focus();
                    }
                }}
            >
                <Search size={17} aria-hidden="true" />
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    role="combobox"
                    aria-label={label}
                    aria-autocomplete="list"
                    aria-expanded={abierto}
                    aria-controls={idLista}
                    aria-activedescendant={
                        abierto && opcionesFiltradas[indiceActivo]
                            ? `${idLista}-${opcionesFiltradas[indiceActivo].value || "all"}`
                            : undefined
                    }
                    autoComplete="off"
                    value={
                        abierto
                            ? termino
                            : opcionSeleccionada?.label || placeholder
                    }
                    placeholder={`Buscar ${label.toLowerCase()}...`}
                    onFocus={() => {
                        setTermino("");
                        setIndiceActivo(-1);
                        setAbierto(true);
                    }}
                    onChange={evento => {
                        setTermino(evento.target.value);
                        setIndiceActivo(0);
                        setAbierto(true);
                    }}
                    onKeyDown={manejarTeclado}
                    onBlur={() => {
                        setAbierto(false);
                        setTermino("");
                        setIndiceActivo(0);
                    }}
                />
                <ChevronDown
                    size={17}
                    className={abierto ? "is-open" : ""}
                    aria-hidden="true"
                />
            </div>

            {abierto && (
                <div
                    className="geo-filter-combobox-options"
                    id={idLista}
                    role="listbox"
                    aria-label={`${label} disponibles`}
                >
                    {opcionesFiltradas.length > 0 ? opcionesFiltradas.map((opcion, indice) => (
                        <button
                            type="button"
                            tabIndex={-1}
                            id={`${idLista}-${opcion.value || "all"}`}
                            className={`geo-filter-combobox-option${opcion.value === value ? " is-selected" : ""}${indice === indiceActivo ? " is-active" : ""}`}
                            key={opcion.value || "all"}
                            role="option"
                            aria-selected={opcion.value === value}
                            onMouseDown={evento => evento.preventDefault()}
                            onMouseEnter={() => setIndiceActivo(indice)}
                            onClick={() => seleccionar(opcion)}
                        >
                            <span>
                                <strong>{opcion.label}</strong>
                                {opcion.detail && (
                                    <em>{opcion.detail}</em>
                                )}
                            </span>
                            {opcion.value === value && <Check size={16} aria-hidden="true" />}
                        </button>
                    )) : (
                        <p className="geo-filter-combobox-no-results" role="status">
                            No se encontraron resultados.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function formatearFecha(valor) {
    if (!valor) {
        return "No registrada";
    }

    const partes = valor.split("-");

    return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : valor;
}

function EnfoqueMapa({
    puntos,
    departamento,
    distrito,
    especie,
    seleccionado,
    reinicio
}) {
    const mapa = useMap();

    useEffect(() => {
        if (seleccionado) {
            mapa.flyTo(
                [
                    seleccionado.lat,
                    seleccionado.lng
                ],
                13,
                {
                    duration: 1.1
                }
            );

            return;
        }

        if (
            puntos.length &&
            (
                departamento ||
                distrito ||
                especie
            )
        ) {
            const limites =
                new LatLngBounds(
                    puntos.map(
                        punto => [
                            punto.lat,
                            punto.lng
                        ]
                    )
                );

            if (limites.isValid()) {
                mapa.flyToBounds(
                    limites.pad(.3),
                    {
                        maxZoom: distrito
                            ? 13
                            : especie
                                ? 12
                                : 11,
                        duration: 1.1
                    }
                );
            }

            return;
        }

        if (departamento) {
            const centro =
                Object.entries(
                    CENTROS
                ).find(
                    ([nombre]) =>
                        normalizar(nombre) ===
                        normalizar(departamento)
                )?.[1];

            if (centro) {
                mapa.flyTo(
                    centro,
                    10,
                    {
                        duration: 1.1
                    }
                );

                return;
            }
        }

        mapa.flyToBounds(
            PAIS,
            {
                padding: [15, 15],
                duration: 1.1
            }
        );
    }, [
        mapa,
        puntos,
        departamento,
        distrito,
        especie,
        seleccionado,
        reinicio
    ]);

    return null;
}

function Marcadores({
    puntos,
    onSelect
}) {
    const mapa = useMap();

    const [
        zoom,
        setZoom
    ] = useState(
        mapa.getZoom()
    );

    useEffect(() => {
        const actualizar = () =>
            setZoom(
                mapa.getZoom()
            );

        mapa.on(
            "zoomend",
            actualizar
        );

        return () => {
            mapa.off(
                "zoomend",
                actualizar
            );
        };
    }, [mapa]);

    const grupos = useMemo(() => {
        const tam =
            zoom <= 8
                ? .20
                : zoom <= 10
                    ? .065
                    : zoom <= 12
                        ? .014
                        : .001;

        const agrupados =
            new Map();

        for (const punto of puntos) {
            const clave =
                `${Math.round(
                    punto.lat / tam
                )}:${Math.round(
                    punto.lng / tam
                )}`;

            if (
                !agrupados.has(
                    clave
                )
            ) {
                agrupados.set(
                    clave,
                    []
                );
            }

            agrupados
                .get(clave)
                .push(punto);
        }

        return [
            ...agrupados.values()
        ];
    }, [
        puntos,
        zoom
    ]);

    return grupos.map(
        (grupo, indice) => {
            const lat =
                grupo.reduce(
                    (total, punto) =>
                        total + punto.lat,
                    0
                ) / grupo.length;

            const lng =
                grupo.reduce(
                    (total, punto) =>
                        total + punto.lng,
                    0
                ) / grupo.length;

            const varios =
                grupo.length > 1;

            return (
                <CircleMarker
                    key={`${indice}-${zoom}`}
                    center={[lat, lng]}
                    radius={
                        varios
                            ? Math.min(
                                23,
                                11 +
                                Math.log2(
                                    grupo.length
                                ) * 3
                            )
                            : 8
                    }
                    pathOptions={{
                        color: "#ffffff",
                        weight: 2.5,
                        fillColor: varios
                            ? "#236c50"
                            : "#31855c",
                        fillOpacity: .95
                    }}
                    eventHandlers={{
                        click: () => {
                            if (varios) {
                                mapa.flyTo(
                                    [lat, lng],
                                    Math.min(
                                        16,
                                        zoom + 2
                                    )
                                );
                            } else {
                                onSelect(
                                    grupo[0]
                                );
                            }
                        }
                    }}
                >

                    <Tooltip
                        direction="top"
                        offset={[0, -7]}
                        className={
                            varios
                                ? "geo-cluster-tooltip"
                                : "geo-species-tooltip"
                        }
                    >

                        {varios ? (
                            <div className="geo-cluster-tooltip-content">

                                <strong>
                                    {grupo.length} ubicaciones
                                </strong>

                                <span>
                                    Haz clic para acercar
                                </span>

                            </div>
                        ) : (
                            <div className="geo-tooltip-card">

                                <div className="geo-tooltip-photo">

                                    <ImagenEspecie
                                        imagen={
                                            grupo[0]
                                                .especie
                                                ?.imagenPrincipal
                                        }
                                        nombre={
                                            grupo[0]
                                                .especie
                                                ?.nombreCientifico
                                        }
                                        className="geo-tooltip-image"
                                        fallback={
                                            <div className="geo-tooltip-fallback">
                                                <Leaf size={22} />
                                            </div>
                                        }
                                    />

                                </div>

                                <div className="geo-tooltip-info">

                                    <strong>
                                        {nombreComun(
                                            grupo[0].especie
                                        )}
                                    </strong>

                                    <em>
                                        {grupo[0].especie
                                            ?.nombreCientifico ||
                                            "Sin nombre científico"
                                        }
                                    </em>

                                    <span>
                                        {grupo[0].nombreLugar ||
                                            "Lugar sin especificar"
                                        }
                                    </span>

                                </div>

                            </div>
                        )}

                    </Tooltip>

                </CircleMarker>
            );
        }
    );
}

export default function MapaEspecies() {
    const location =
        useLocation();

    const [
        ubicaciones,
        setUbicaciones
    ] = useState([]);

    const [
        departamentos,
        setDepartamentos
    ] = useState([]);

    const [
        cargando,
        setCargando
    ] = useState(true);

    const [
        progreso,
        setProgreso
    ] = useState("");

    const [
        error,
        setError
    ] = useState("");

    const [
        advertencia,
        setAdvertencia
    ] = useState("");

    const [
        departamento,
        setDepartamento
    ] = useState("");

    const [municipio,setMunicipio]=useState("");
    const [limites,setLimites]=useState([]);
    const [errorLimites,setErrorLimites]=useState("");
    const [territorioListo,setTerritorioListo]=useState(false);
    const [distrito,setDistrito]=useState("");
    useEffect(()=>{
        let activo=true;
        cargarDistritosElSalvador()
            .then(features=>{
                if(activo){
                    setLimites(features);
                    setTerritorioListo(true);
                }
            })
            .catch(error=>{
                if(activo){
                    setErrorLimites(error.message);
                    setTerritorioListo(true);
                }
            });
        return ()=>{activo=false};
    },[]);

    const [
        especie,
        setEspecie
    ] = useState(
        location.state?.idEspecieMapa
            ? String(
                location.state.idEspecieMapa
            )
            : ""
    );

    const [
        busqueda,
        setBusqueda
    ] = useState("");

    const [
        seleccionado,
        setSeleccionado
    ] = useState(null);

    const [
        reinicio,
        setReinicio
    ] = useState(0);

    const [
        recarga,
        setRecarga
    ] = useState(0);

    useEffect(() => {
        const id =
            location.state
                ?.idEspecieMapa;

        if (!id) {
            return;
        }

        setDepartamento("");
        setMunicipio("");
        setDistrito("");
        setBusqueda("");
        setEspecie(
            String(id)
        );
        setSeleccionado(null);

        setReinicio(
            actual => actual + 1
        );
    }, [
        location.state
            ?.idEspecieMapa
    ]);

    useEffect(() => {
        let activo = true;

        async function cargar() {
            try {
                setCargando(true);
                setError("");
                setAdvertencia("");

                const [
                    datosDepartamentos,
                    datosEspecies
                ] = await Promise.all([
                    obtenerDepartamentosMapa(),
                    obtenerEspeciesMapa()
                ]);

                if (!activo) {
                    return;
                }

                setDepartamentos(
                    datosDepartamentos.filter(
                        item =>
                            item.activo !== false
                    )
                );

                const lista =
                    datosEspecies.filter(
                        item =>
                            item.activa !== false
                    );

                const resultado =
                    await cargarUbicacionesMapa(
                        lista,
                        (
                            completadas,
                            total
                        ) => {
                            if (activo) {
                                setProgreso(
                                    `Consultando ubicaciones: ${Math.min(
                                        completadas,
                                        total
                                    )} de ${total} especies`
                                );
                            }
                        }
                    );

                if (!activo) {
                    return;
                }

                setUbicaciones(
                    resultado.ubicaciones
                );

                if (
                    resultado.fallidas
                        .length
                ) {
                    setAdvertencia(
                        `No se pudieron consultar las ubicaciones de ${resultado.fallidas.length} especie(s). Los resultados podrían estar incompletos.`
                    );
                }
            } catch (errorCarga) {
                if (activo) {
                    setError(
                        errorCarga?.message ||
                        "No fue posible cargar los datos del mapa."
                    );
                }
            } finally {
                if (activo) {
                    setCargando(false);
                    setProgreso("");
                }
            }
        }

        cargar();

        return () => {
            activo = false;
        };
    }, [recarga]);

    const municipios=useMemo(()=>[...new Set(limites.filter(f=>!departamento||normalizar(f.properties.departamento)===normalizar(departamento)).map(f=>f.properties.municipio))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"es")),[limites,departamento]);
    const distritos=useMemo(()=>[...new Set(limites.filter(f=>(!departamento||normalizar(f.properties.departamento)===normalizar(departamento))&&(!municipio||normalizar(f.properties.municipio)===normalizar(municipio))).map(f=>f.properties.distrito))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"es")),[limites,departamento,municipio]);
    const opcionesDepartamento = useMemo(
        () => [
            { value: "", label: "Todos los departamentos" },
            ...departamentos.map(item => ({
                value: item.nombre,
                label: item.nombre
            }))
        ],
        [departamentos]
    );
    const opcionesMunicipio = useMemo(
        () => [
            { value: "", label: "Todos los municipios" },
            ...municipios.map(nombre => ({ value: nombre, label: nombre }))
        ],
        [municipios]
    );
    const opcionesDistrito = useMemo(
        () => [
            { value: "", label: "Todos los distritos" },
            ...distritos.map(nombre => ({ value: nombre, label: nombre }))
        ],
        [distritos]
    );
    const distritosSeleccionados=useMemo(()=>new Set(limites.filter(f=>(!departamento||normalizar(f.properties.departamento)===normalizar(departamento))&&(!municipio||normalizar(f.properties.municipio)===normalizar(municipio))&&(!distrito||normalizar(f.properties.distrito)===normalizar(distrito))).map(f=>String(f.properties.idDistrito))),[limites,departamento,municipio,distrito]);
    const ubicacionesValidadas = useMemo(
        () => {
            if (!territorioListo) {
                return [];
            }

            if (!limites.length) {
                return ubicaciones;
            }

            return ubicaciones.filter(ubicacion =>
                buscarDistritoPorCoordenadas(
                    ubicacion.lat,
                    ubicacion.lng,
                    limites,
                    ubicacion.idDistrito ??
                        ubicacion.distrito?.idDistrito
                )
            );
        },
        [ubicaciones, limites, territorioListo]
    );
    const ubicacionesDescartadas =
        ubicaciones.length - ubicacionesValidadas.length;
    const especies = useMemo(
        () => [
            ...new Map(
                ubicacionesValidadas.map(
                    ubicacion => [
                        String(
                            ubicacion.idEspecie
                        ),
                        ubicacion.especie
                    ]
                )
            ).entries()
        ].sort(
            (a, b) =>
                nombreComun(
                    a[1]
                ).localeCompare(
                    nombreComun(
                        b[1]
                    ),
                    "es"
                )
        ),
        [ubicacionesValidadas]
    );
    const opcionesEspecie = useMemo(
        () => [
            { value: "", label: "Todas las especies" },
            ...especies.map(([id, item]) => ({
                value: id,
                label: nombreComun(item),
                detail: item?.nombreCientifico || ""
            }))
        ],
        [especies]
    );

    const puntos = useMemo(
        () => ubicacionesValidadas.filter(
            ubicacion =>
                (
                    !departamento ||
                    normalizar(
                        ubicacion.departamentoDistrito
                    ) ===
                    normalizar(
                        departamento
                    )
                ) &&
                (
                    (!municipio&&!distrito)||!limites.length||(distritosSeleccionados.has(String(ubicacion.idDistrito??ubicacion.distrito?.idDistrito))||limites.some(f=>distritosSeleccionados.has(String(f.properties.idDistrito))&&normalizar(f.properties.distrito)===normalizar(ubicacion.nombreDistrito)&&normalizar(f.properties.departamento)===normalizar(ubicacion.departamentoDistrito)))
                ) &&
                (
                    !distrito||(distritosSeleccionados.has(String(ubicacion.idDistrito??ubicacion.distrito?.idDistrito))||limites.some(f=>distritosSeleccionados.has(String(f.properties.idDistrito))&&normalizar(f.properties.distrito)===normalizar(ubicacion.nombreDistrito)&&normalizar(f.properties.departamento)===normalizar(ubicacion.departamentoDistrito)))
                ) &&
                (
                    !especie ||
                    String(
                        ubicacion.idEspecie
                    ) === especie
                ) &&
                (
                    !busqueda ||
                    normalizar(
                        `${nombreComun(
                            ubicacion.especie
                        )} ${ubicacion.especie
                            ?.nombreCientifico ||
                        ""
                        } ${ubicacion.nombreLugar ||
                        ""
                        } ${ubicacion.nombreDistrito ||
                        ""
                        }`
                    ).includes(
                        normalizar(
                            busqueda
                        )
                    )
                )
        ),
        [
            ubicacionesValidadas,
            departamento,
            distrito,
            municipio,
            limites,
            distritosSeleccionados,
            especie,
            busqueda
        ]
    );

    const advertenciasVisibles = [
        advertencia,
        errorLimites
            ? `No se pudo validar la geometría de los distritos: ${errorLimites}. Se muestran solo puntos dentro del rango general de coordenadas.`
            : "",
        ubicacionesDescartadas > 0
            ? `Se omitieron ${ubicacionesDescartadas} ubicación(es) que no coinciden con la geometría de un distrito.`
            : ""
    ].filter(Boolean);
    const cargandoMapa = cargando || !territorioListo;

    function reset() {
        setDepartamento("");
        setMunicipio("");
        setDistrito("");
        setEspecie("");
        setBusqueda("");
        setSeleccionado(null);

        setReinicio(
            actual => actual + 1
        );
    }

    return (
        <div className="geo-page">

            <header className="geo-heading">

                <div>

                    <span className="geo-eyebrow">
                        CATÁLOGO BOTÁNICO · EL SALVADOR
                    </span>

                    <h1>
                        Mapa de especies
                    </h1>

                    <p>
                        Explora la distribución geográfica de las especies registradas.
                    </p>

                </div>

            </header>

            <div className="geo-summary">

                <div className="geo-summary-card geo-summary-locations">

                    <span className="geo-summary-icon">
                        <MapPinned size={22} />
                    </span>

                    <div>

                        <span>
                            Ubicaciones disponibles
                        </span>

                        <strong>
                            {ubicacionesValidadas.length}
                        </strong>

                        <small>
                            Puntos registrados
                        </small>

                    </div>

                </div>

                <div className="geo-summary-card geo-summary-species">

                    <span className="geo-summary-icon">
                        <Leaf size={22} />
                    </span>

                    <div>

                        <span>
                            Especies con ubicaciones
                        </span>

                        <strong>
                            {especies.length}
                        </strong>

                        <small>
                            Especies representadas
                        </small>

                    </div>

                </div>

                <div className="geo-summary-card geo-summary-visible">

                    <span className="geo-summary-icon">
                        <Eye size={22} />
                    </span>

                    <div>

                        <span>
                            Resultados visibles
                        </span>

                        <strong>
                            {puntos.length}
                        </strong>

                        <small>
                            Según los filtros actuales
                        </small>

                    </div>

                </div>

            </div>

            <div className="geo-workspace">

                <aside className="geo-filters">

                    <div className="geo-panel-title">

                        <h2>
                            Explorar mapa
                        </h2>

                        <button
                            type="button"
                            onClick={reset}
                            title="Restablecer filtros"
                            aria-label="Restablecer filtros"
                        >
                            <RotateCcw size={17} />
                        </button>

                    </div>

                    <label className="geo-filter-field geo-filter-search">

                        <span className="geo-filter-label">
                            <Search size={14} />
                            Buscar especie o lugar
                        </span>

                        <div className="geo-search">

                            <Search size={17} />

                            <input
                                value={
                                    busqueda
                                }
                                onChange={
                                    evento => {
                                        setBusqueda(
                                            evento.target.value
                                        );

                                        setSeleccionado(
                                            null
                                        );
                                    }
                                }
                                placeholder="Nombre o ubicación..."
                            />

                        </div>

                    </label>

                    <div className="geo-filter-field geo-filter-department">

                        <label className="geo-filter-label" htmlFor="geo-department-select">
                            <MapPinned size={14} />
                            Departamento
                        </label>

                        <ComboBuscable
                            id="geo-department-select"
                            opciones={opcionesDepartamento}
                            value={departamento}
                            label="Departamento"
                            placeholder="Todos los departamentos"
                            clase="geo-filter-combobox-department"
                            onChange={valor => {
                                setDepartamento(valor);
                                setMunicipio("");
                                setDistrito("");
                                setSeleccionado(null);
                            }}
                        />

                    </div>

                    <div className="geo-filter-field geo-filter-municipality">
                        <label className="geo-filter-label" htmlFor="geo-municipality-select">
                            <MapPinned size={14} />
                            Municipio
                        </label>
                        <ComboBuscable
                            id="geo-municipality-select"
                            opciones={opcionesMunicipio}
                            value={municipio}
                            label="Municipio"
                            placeholder="Todos los municipios"
                            clase="geo-filter-combobox-municipality"
                            onChange={valor => {
                                setMunicipio(valor);
                                setDistrito("");
                                setSeleccionado(null);
                            }}
                        />
                    </div>

                    <div className="geo-filter-field geo-filter-district">

                        <label className="geo-filter-label" htmlFor="geo-district-select">
                            <MapPin size={14} />
                            Distrito
                        </label>

                        <ComboBuscable
                            id="geo-district-select"
                            opciones={opcionesDistrito}
                            value={distrito}
                            label="Distrito"
                            placeholder="Todos los distritos"
                            clase="geo-filter-combobox-district"
                            onChange={valor => {
                                setDistrito(valor);
                                setSeleccionado(null);
                            }}
                        />

                    </div>

                    <div className="geo-filter-field geo-filter-species">

                        <label className="geo-filter-label" htmlFor="geo-species-select">
                            <Leaf size={14} />
                            Especie
                        </label>

                        <ComboBuscable
                            id="geo-species-select"
                            opciones={opcionesEspecie}
                            value={especie}
                            label="Especie"
                            placeholder="Todas las especies"
                            clase="geo-filter-combobox-species"
                            onChange={id => {
                                setEspecie(id);
                                setSeleccionado(null);
                            }}
                        />

                    </div>

                    <p className="geo-note">
                        <Info size={15} />
                        Los distritos disponibles corresponden a las ubicaciones registradas.
                    </p>

                    <button
                        type="button"
                        className="geo-reset"
                        onClick={reset}
                    >
                        <RotateCcw size={16} />
                        Ver todo El Salvador
                    </button>

                </aside>

                <section className="geo-map-area">

                    <div className="geo-map-top">

                        <span>
                            <MapPin size={16} />
                            Distribución de especies
                        </span>

                        <span>
                            {puntos.length}{" "}
                            {puntos.length === 1
                                ? "ubicación"
                                : "ubicaciones"
                            }
                        </span>

                    </div>

                    <div className="geo-map">

                        <MapContainer
                            center={[
                                13.75,
                                -88.95
                            ]}
                            zoom={8}
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

                            <LimitesTerritoriales features={limites} departamento={departamento} municipio={municipio} distrito={distrito}/>

                            <EnfoqueMapa
                                puntos={
                                    puntos
                                }
                                departamento={
                                    departamento
                                }
                                distrito={
                                    distrito
                                }
                                especie={
                                    especie
                                }
                                seleccionado={
                                    seleccionado
                                }
                                reinicio={
                                    reinicio
                                }
                            />

                            <Marcadores
                                puntos={
                                    puntos
                                }
                                onSelect={
                                    setSeleccionado
                                }
                            />

                        </MapContainer>

                        {cargandoMapa && (
                            <div className="geo-overlay">

                                <RefreshCw
                                    className="geo-spin"
                                    size={23}
                                />

                                <strong>
                                    Cargando mapa de especies
                                </strong>

                                <span>
                                    {progreso ||
                                        "Conectando con el catálogo..."
                                    }
                                </span>

                            </div>
                        )}

                        {!cargandoMapa &&
                            !error &&
                            puntos.length === 0 && (
                                <div className="geo-empty">
                                    No hay ubicaciones para los filtros seleccionados.
                                </div>
                            )
                        }

                    </div>

                    <div className="geo-map-footer">

                        <span>
                            <i />
                            Ubicación de especie
                        </span>

                        <span>
                            Selecciona un punto para consultar su ficha. Los grupos se expanden al acercar.
                        </span>

                    </div>

                </section>

            </div>

            {(error || advertenciasVisibles.length > 0) && (
                <div className="geo-warning" role="status" aria-live="polite">

                    <AlertCircle size={18} />

                    <span>
                        {[error, ...advertenciasVisibles]
                            .filter(Boolean)
                            .join(" ")}
                    </span>

                    {error && (
                        <button
                            type="button"
                            onClick={() =>
                                setRecarga(
                                    actual => actual + 1
                                )
                            }
                        >
                            Reintentar
                        </button>
                    )}

                </div>
            )}

            {seleccionado && (
                <div
                    className="geo-backdrop"
                    onClick={() =>
                        setSeleccionado(
                            null
                        )
                    }
                >

                    <aside
                        className="geo-detail"
                        onClick={
                            evento =>
                                evento.stopPropagation()
                        }
                    >

                        <button
                            type="button"
                            className="geo-close"
                            aria-label="Cerrar detalle"
                            onClick={() =>
                                setSeleccionado(
                                    null
                                )
                            }
                        >
                            <X size={20} />
                        </button>

                        <div className="geo-detail-photo">

                            <ImagenEspecie
                                imagen={
                                    seleccionado.especie
                                        ?.imagenPrincipal
                                }
                                nombre={
                                    seleccionado.especie
                                        ?.nombreCientifico
                                }
                                className="geo-detail-image"
                                fallback={
                                    <div className="geo-detail-photo-fallback">

                                        <Leaf size={42} />

                                        <span>
                                            Sin imagen principal
                                        </span>

                                    </div>
                                }
                            />

                        </div>

                        <span className="geo-eyebrow">
                            FICHA DE UBICACIÓN
                        </span>

                        <h2>
                            {nombreComun(
                                seleccionado.especie
                            )}
                        </h2>

                        <em>
                            {seleccionado.especie
                                ?.nombreCientifico
                            }
                        </em>

                        <div className="geo-detail-divider" />

                        <h3>
                            <MapPin size={18} />
                            Lugar de observación
                        </h3>

                        <p>
                            <strong>
                                {seleccionado.nombreLugar ||
                                    "Lugar sin especificar"
                                }
                            </strong>
                        </p>

                        <p>
                            {seleccionado.nombreDistrito ||
                                "Distrito no especificado"
                            }
                            {" · "}
                            {seleccionado.departamentoDistrito ||
                                "Departamento no especificado"
                            }
                        </p>

                        <h3>
                            <CalendarDays size={18} />
                            Fecha de observación
                        </h3>

                        <p>
                            {formatearFecha(
                                seleccionado.fechaObservacion
                            )}
                        </p>

                        <h3>
                            <Info size={18} />
                            Descripción de la ubicación
                        </h3>

                        <p>
                            {seleccionado.descripcion ||
                                "Sin descripción adicional."
                            }
                        </p>

                        <h3>
                            <Leaf size={18} />
                            Acerca de la especie
                        </h3>

                        <p>
                            {seleccionado.especie
                                ?.descripcion ||
                                "No hay descripción disponible."
                            }
                        </p>

                        <div className="geo-coords">
                            Coordenadas:{" "}
                            {seleccionado.lat.toFixed(6)},
                            {" "}
                            {seleccionado.lng.toFixed(6)}
                        </div>

                    </aside>

                </div>
            )}

        </div>
    );
}