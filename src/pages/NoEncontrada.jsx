import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "../styles/noEncontrada.css";

function NoEncontrada() {
    return (
        <section className="not-found-page" aria-labelledby="not-found-title">
            <span className="not-found-code">404</span>
            <h1 id="not-found-title">No encontramos esa página</h1>
            <p>
                La dirección puede haber cambiado o no existir. Revisa el enlace
                e inténtalo de nuevo.
            </p>
            <Link to="/">
                <ArrowLeft size={17} />
                Volver al inicio
            </Link>
        </section>
    );
}

export default NoEncontrada;
