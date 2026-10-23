import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Bell, ChevronDown, UserRound, Settings, LogOut } from "lucide-react";
import "../styles/header.css";

const TITULOS = {
    "/": "Inicio",
    "/catalogo": "Catálogo",
    "/agregar-planta": "Nueva especie",
    "/catalogos": "Catálogos",
    "/mapa": "Mapa",
    "/usuarios": "Usuarios",
    "/estadisticas": "Estadísticas",
    "/configuracion": "Configuración"
};

// Se reemplaza por el usuario real cuando exista el login
const USUARIO = { nombre: "Usuario", rol: "Investigador" };

function Header() {
    const { pathname } = useLocation();
    const [abierto, setAbierto] = useState(false);
    const menuRef = useRef(null);
    const busquedaRef = useRef(null);

    const titulo = TITULOS["/" + pathname.split("/")[1]] ?? "Flora";
    const iniciales = USUARIO.nombre.slice(0, 2).toUpperCase();

    useEffect(() => {
        const clicFuera = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setAbierto(false);
        };
        const teclas = (e) => {
            if (e.key === "Escape") setAbierto(false);
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                busquedaRef.current?.focus();
            }
        };
        document.addEventListener("mousedown", clicFuera);
        document.addEventListener("keydown", teclas);
        return () => {
            document.removeEventListener("mousedown", clicFuera);
            document.removeEventListener("keydown", teclas);
        };
    }, []);

    return (
        <header className="header">

            <div className="header-left">
                <div className="header-heading">
                    <span className="header-crumb">Flora <i>/</i> {titulo}</span>
                    <strong className="header-title">{titulo}</strong>
                </div>
            </div>

            <div className="header-actions">

                <label className="header-search">
                    <Search size={17} strokeWidth={2} />
                    <input
                        ref={busquedaRef}
                        type="search"
                        placeholder="Buscar especies, familias…"
                        aria-label="Buscar"
                    />
                    <kbd>Ctrl K</kbd>
                </label>

                <button className="header-icon-btn" aria-label="Notificaciones">
                    <Bell size={19} strokeWidth={1.9} />
                    <span className="notification-dot" />
                </button>

                <div className="header-divider" />

                <div className="user-wrap" ref={menuRef}>
                    <button
                        className="user-menu"
                        onClick={() => setAbierto(!abierto)}
                        aria-haspopup="menu"
                        aria-expanded={abierto}
                    >
                        <span className="user-avatar">{iniciales}</span>
                        <span className="user-data">
                            <strong>{USUARIO.nombre}</strong>
                            <span>{USUARIO.rol}</span>
                        </span>
                        <ChevronDown size={16} className={`user-chevron ${abierto ? "abierto" : ""}`} />
                    </button>

                    {abierto && (
                        <div className="user-dropdown" role="menu">
                            <button role="menuitem" onClick={() => setAbierto(false)}>
                                <UserRound size={17} /> Mi perfil
                            </button>
                            <button role="menuitem" onClick={() => setAbierto(false)}>
                                <Settings size={17} /> Configuración
                            </button>
                            <div className="user-dropdown-line" />
                            <button role="menuitem" className="peligro" onClick={() => setAbierto(false)}>
                                <LogOut size={17} /> Cerrar sesión
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
}

export default Header;