function Pagina({ titulo, descripcion }) {

    return (
        <div className="pagina">

            <div className="pagina-header">

                <div>
                    <span className="pagina-pretitle">
                        CATÁLOGO BOTÁNICO
                    </span>

                    <h1>{titulo}</h1>

                    <p>{descripcion}</p>
                </div>

            </div>

            <div className="pagina-contenido">

                <div className="pagina-placeholder">

                    <h2>{titulo}</h2>

                    <p>
                        El contenido de este módulo se desarrollará posteriormente.
                    </p>

                </div>

            </div>

        </div>
    );
}

export default Pagina;