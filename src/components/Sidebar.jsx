import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    LibraryBig,
    CirclePlus,
    Layers3,
    MapPinned,
    Users,
    ChartNoAxesCombined,
    Settings,
    LogOut,
    Leaf,
    PanelLeftClose,
    PanelLeftOpen,
    ClipboardList,
    Utensils,
    Images
} from "lucide-react";
import "../styles/sidebar.css";

const principal = [
    {
        nombre: "Inicio",
        ruta: "/",
        icono: LayoutDashboard
    },
    {
        nombre: "Catálogo",
        ruta: "/catalogo",
        icono: LibraryBig
    }
];

const especies = [
    {
        nombre: "Nueva especie",
        ruta: "/agregar-planta",
        icono: CirclePlus
    },
    {
        nombre: "Gestión de especies",
        ruta: "/gestion-especies",
        icono: ClipboardList
    }
];

const contenido = [
    {
        nombre: "Alimentación",
        ruta: "/contenido-especies/alimentacion",
        icono: Utensils
    },
    {
        nombre: "Entorno",
        ruta: "/contenido-especies/entorno",
        icono: MapPinned
    },
    {
        nombre: "Documentación",
        ruta: "/contenido-especies/documentacion",
        icono: Images
    }
];

const administracion = [
    {
        nombre: "Catálogos",
        ruta: "/catalogos",
        icono: Layers3
    },
    {
        nombre: "Mapa",
        ruta: "/mapa",
        icono: MapPinned
    },
    {
        nombre: "Usuarios",
        ruta: "/usuarios",
        icono: Users
    },
    {
        nombre: "Estadísticas",
        ruta: "/estadisticas",
        icono: ChartNoAxesCombined
    }
];

function Sidebar({ colapsado, setColapsado }) {

    const opcion = ({
        nombre,
        ruta,
        icono: Icono
    }) => (
        <NavLink
            key={ruta}
            to={ruta}
            end={ruta === "/"}
            title={colapsado ? nombre : ""}
            data-tooltip={nombre}
            className={({ isActive }) =>
                `menu-link ${isActive ? "activo" : ""}`
            }
        >
            <Icono
                size={20}
                strokeWidth={1.8}
            />

            {!colapsado && (
                <span>
                    {nombre}
                </span>
            )}
        </NavLink>
    );

    return (
        <aside
            className={`sidebar ${colapsado ? "sidebar-mini" : ""}`}
        >

            <div className="sidebar-brand">

                <div className="brand-logo">
                    <Leaf
                        size={25}
                        strokeWidth={2}
                    />
                </div>

                {!colapsado && (
                    <div className="brand-info">

                        <strong>
                            Flora
                        </strong>

                        <span>
                            Catálogo Botánico
                        </span>

                    </div>
                )}

            </div>

            <button
                type="button"
                className="sidebar-collapse"
                onClick={() =>
                    setColapsado(!colapsado)
                }
                title={
                    colapsado
                        ? "Expandir menú"
                        : "Contraer menú"
                }
                aria-label={
                    colapsado
                        ? "Expandir menú"
                        : "Contraer menú"
                }
            >
                {colapsado ? (
                    <PanelLeftOpen size={17} />
                ) : (
                    <PanelLeftClose size={17} />
                )}
            </button>

            <div className="sidebar-content">

                {!colapsado && (
                    <p className="menu-title">
                        PRINCIPAL
                    </p>
                )}

                <nav className="menu-group">
                    {principal.map(opcion)}
                </nav>

                {!colapsado && (
                    <p className="menu-title">
                        ESPECIES
                    </p>
                )}

                {colapsado && (
                    <div className="menu-divider" />
                )}

                <nav className="menu-group">
                    {especies.map(opcion)}
                </nav>

                {!colapsado && (
                    <p className="menu-title">
                        CONTENIDO
                    </p>
                )}

                {colapsado && (
                    <div className="menu-divider" />
                )}

                <nav className="menu-group">
                    {contenido.map(opcion)}
                </nav>

                {!colapsado && (
                    <p className="menu-title">
                        ADMINISTRACIÓN
                    </p>
                )}

                {colapsado && (
                    <div className="menu-divider" />
                )}

                <nav className="menu-group">
                    {administracion.map(opcion)}
                </nav>

            </div>

            <div className="sidebar-bottom">

                <NavLink
                    to="/configuracion"
                    title={
                        colapsado
                            ? "Configuración"
                            : ""
                    }
                    data-tooltip="Configuración"
                    className={({ isActive }) =>
                        `menu-link ${isActive ? "activo" : ""}`
                    }
                >
                    <Settings
                        size={20}
                        strokeWidth={1.8}
                    />

                    {!colapsado && (
                        <span>
                            Configuración
                        </span>
                    )}
                </NavLink>

                <button
                    type="button"
                    className="logout-button"
                    title={
                        colapsado
                            ? "Cerrar sesión"
                            : ""
                    }
                    data-tooltip="Cerrar sesión"
                >
                    <LogOut
                        size={20}
                        strokeWidth={1.8}
                    />

                    {!colapsado && (
                        <span>
                            Cerrar sesión
                        </span>
                    )}
                </button>

            </div>

        </aside>
    );
}

export default Sidebar;