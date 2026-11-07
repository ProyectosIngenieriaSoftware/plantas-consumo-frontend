import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import "../styles/comboBuscable.css";

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function ComboBuscable({
    id,
    name,
    value,
    onChange,
    options,
    placeholder = "Selecciona una opción...",
    searchPlaceholder = "Buscar...",
    className = "",
    disabled = false,
    required = false,
    ariaLabel,
    ariaDescribedby,
    ariaInvalid
}) {
    const [abierto, setAbierto] = useState(false);
    const [termino, setTermino] = useState("");
    const [indiceActivo, setIndiceActivo] = useState(-1);
    const [desplegarArriba, setDesplegarArriba] = useState(false);
    const inputRef = useRef(null);
    const comboRef = useRef(null);
    const idLista = `${id}-opciones`;
    const valor = String(value ?? "");

    const opcionSeleccionada = options.find(
        opcion => String(opcion.value) === valor
    );

    const opcionesFiltradas = useMemo(() => {
        const consulta = normalizar(termino);
        return options.filter(opcion =>
            normalizar(opcion.label).includes(consulta)
        );
    }, [options, termino]);

    function abrirLista() {
        const limites = comboRef.current?.getBoundingClientRect();
        if (limites) {
            const altoLista = Math.min(
                230,
                Math.max(options.length, 1) * 36 + 10
            );
            const espacioAbajo = window.innerHeight - limites.bottom;
            setDesplegarArriba(
                espacioAbajo < altoLista &&
                limites.top > espacioAbajo
            );
        }
        setAbierto(true);
    }

    function seleccionar(opcion) {
        onChange({
            target: {
                name,
                value: String(opcion.value)
            }
        });
        setTermino("");
        setIndiceActivo(-1);
        setAbierto(false);
    }

    function manejarTeclado(evento) {
        if (evento.key === "ArrowDown") {
            evento.preventDefault();
            abrirLista();
            setIndiceActivo(indice =>
                Math.min(indice + 1, opcionesFiltradas.length - 1)
            );
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            abrirLista();
            setIndiceActivo(indice => Math.max(indice - 1, 0));
        } else if (evento.key === "Enter" && abierto) {
            evento.preventDefault();
            if (opcionesFiltradas[indiceActivo]) {
                seleccionar(opcionesFiltradas[indiceActivo]);
            }
        } else if (evento.key === "Escape") {
            setAbierto(false);
            setTermino("");
            setIndiceActivo(-1);
            evento.currentTarget.blur();
        }
    }

    return (
        <div
            ref={comboRef}
            className={`cb-combo ${className}${abierto ? " is-open" : ""}${desplegarArriba ? " opens-up" : ""}${disabled ? " is-disabled" : ""}`}
        >
            <div
                className="cb-combo-control"
                onMouseDown={evento => {
                    if (evento.target !== inputRef.current) {
                        evento.preventDefault();
                        abrirLista();
                        inputRef.current?.focus();
                    }
                }}
            >
                <Search size={17} aria-hidden="true" />
                <input
                    ref={inputRef}
                    id={id}
                    name={name}
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    disabled={disabled}
                    required={required}
                    value={
                        abierto
                            ? termino
                            : opcionSeleccionada?.label ?? ""
                    }
                    placeholder={
                        abierto
                            ? searchPlaceholder
                            : opcionSeleccionada?.label
                                ? ""
                                : placeholder
                    }
                    onFocus={() => {
                        setTermino("");
                        setIndiceActivo(-1);
                        abrirLista();
                    }}
                    onChange={evento => {
                        setTermino(evento.target.value);
                        setIndiceActivo(0);
                        abrirLista();
                    }}
                    onKeyDown={manejarTeclado}
                    onBlur={() => {
                        setAbierto(false);
                        setTermino("");
                        setIndiceActivo(-1);
                    }}
                    aria-label={ariaLabel}
                    aria-autocomplete="list"
                    aria-expanded={abierto}
                    aria-controls={idLista}
                    aria-activedescendant={
                        abierto && opcionesFiltradas[indiceActivo]
                            ? `${idLista}-${indiceActivo}`
                            : undefined
                    }
                    aria-describedby={ariaDescribedby}
                    aria-invalid={ariaInvalid}
                />
                <ChevronDown
                    size={17}
                    className={abierto ? "is-open" : ""}
                    aria-hidden="true"
                />
            </div>

            {abierto && (
                <div
                    id={idLista}
                    className="cb-combo-options"
                    role="listbox"
                    aria-label={`${ariaLabel || "Opciones"} disponibles`}
                >
                    {opcionesFiltradas.length > 0
                        ? opcionesFiltradas.map((opcion, indice) => {
                            const seleccionado =
                                String(opcion.value) === valor;
                            const opcionId =
                                `${idLista}-${indice}`;

                            return (
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    id={opcionId}
                                    key={String(opcion.value)}
                                    role="option"
                                    aria-selected={seleccionado}
                                    className={
                                        indice === indiceActivo
                                            ? "is-active"
                                            : ""
                                    }
                                    onMouseEnter={() =>
                                        setIndiceActivo(indice)
                                    }
                                    onMouseDown={evento =>
                                        evento.preventDefault()
                                    }
                                    onClick={() =>
                                        seleccionar(opcion)
                                    }
                                >
                                    <span>{opcion.label}</span>
                                    {seleccionado && (
                                        <Check
                                            size={16}
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            );
                        })
                        : (
                            <p role="status">
                                {options.length === 0
                                    ? "No hay opciones disponibles."
                                    : "No se encontraron resultados."
                                }
                            </p>
                        )}
                </div>
            )}
        </div>
    );
}

export default ComboBuscable;
