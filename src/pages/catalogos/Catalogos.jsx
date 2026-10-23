import { useNavigate } from "react-router-dom";
import { Mountain, BookOpen, Apple, HeartPulse, Sprout, ArrowRight } from "lucide-react";
import "../../styles/catalogos.css";

const catalogos = [
    { titulo: "Hábitats", descripcion: "Administra los hábitats donde se desarrollan las especies.", ruta: "/catalogos/habitats", icono: Mountain },
    { titulo: "Fuentes", descripcion: "Gestiona las fuentes bibliográficas y documentales.", ruta: "/catalogos/fuentes", icono: BookOpen },
    { titulo: "Nutrientes", descripcion: "Administra los nutrientes relacionados con las especies.", ruta: "/catalogos/nutrientes", icono: Apple },
    { titulo: "Beneficios", descripcion: "Gestiona los beneficios asociados a las plantas.", ruta: "/catalogos/beneficios", icono: HeartPulse },
    { titulo: "Partes de planta", descripcion: "Administra las partes aprovechables o registradas de una planta.", ruta: "/catalogos/partes-planta", icono: Sprout }
];

function Catalogos() {
    const navigate = useNavigate();

    return (
        <div className="catalogos-page">
            <div className="catalogos-header">
                <span>ADMINISTRACIÓN</span>
                <h1>Catálogos</h1>
                <p>Selecciona el catálogo que deseas administrar.</p>
            </div>

            <div className="catalogos-grid">
                {catalogos.map(({ titulo, descripcion, ruta, icono: Icono }) => (
                    <button className="catalogo-card" key={ruta} onClick={() => navigate(ruta)}>
                        <div className="catalogo-card-top">
                            <div className="catalogo-icon">
                                <Icono size={25} />
                            </div>
                            <ArrowRight className="catalogo-arrow" size={20} />
                        </div>

                        <div className="catalogo-card-content">
                            <h2>{titulo}</h2>
                            <p>{descripcion}</p>
                        </div>

                        <div className="catalogo-card-footer">
                            <span>Administrar</span>
                            <ArrowRight size={17} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default Catalogos;