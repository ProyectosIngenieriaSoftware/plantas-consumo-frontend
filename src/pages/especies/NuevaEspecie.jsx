import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    FlaskConical,
    Leaf,
    Plus,
    Trash2,
    UserRound,
    X,
    BookOpen,
    Tags,
    TriangleAlert
} from "lucide-react";
import Swal from "sweetalert2";
import { crearEspecie } from "../../api/especieService";
import "../../styles/nuevaEspecie.css";
import "../../styles/alertas.css";

const inicial = {
    nombreCientifico: "",
    descripcion: "",
    origen: "",
    propiedades: "",
    importanciaCultural: "",
    advertencias: "",
    taxonomia: {
        reino: "Plantae",
        division: "",
        clase: "",
        ordenTaxonomico: "",
        familia: "",
        genero: "",
        especieTaxonomica: "",
        subespecie: ""
    },
    nombresComunes: []
};

const USUARIO_ID = 1;

function obtenerMensaje(error) {
    const data = error?.response?.data;

    if (typeof data === "string") {
        return data;
    }

    return data?.mensaje ||
        data?.message ||
        data?.error ||
        "Ocurrió un error al comunicarse con el servidor.";
}

function normalizarErroresBackend(error) {
    const data = error?.response?.data;

    const origen =
        data?.erroresValidacion ||
        data?.errors;

    if (!origen || typeof origen !== "object") {
        return {};
    }

    const resultado = {};

    Object.entries(origen).forEach(([campo, mensaje]) => {
        resultado[campo] = Array.isArray(mensaje)
            ? mensaje[0]
            : mensaje;
    });

    return resultado;
}

function alertaError(titulo, mensaje) {
    return Swal.fire({
        icon: "error",
        title: titulo,
        text: mensaje,
        confirmButtonText: "Entendido",
        buttonsStyling: false,
        customClass: {
            popup: "flora-alert",
            confirmButton: "flora-alert-confirm"
        }
    });
}

function alertaValidacion() {
    return Swal.fire({
        icon: "warning",
        title: "Revisa los datos",
        text: "Hay campos con información inválida o incompleta.",
        confirmButtonText: "Entendido",
        buttonsStyling: false,
        customClass: {
            popup: "flora-alert",
            confirmButton: "flora-alert-confirm"
        }
    });
}

function NuevaEspecie() {
    const navigate = useNavigate();

    const [paso, setPaso] = useState(1);
    const [form, setForm] = useState(inicial);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);

    const errorCampo = (campo) => {
        return errores[campo] || "";
    };

    function limpiarError(campo) {
        setErrores(prev => {
            const copia = { ...prev };
            delete copia[campo];
            return copia;
        });
    }

    function cambiarCampo(campo, valor) {
        setForm(prev => ({
            ...prev,
            [campo]: valor
        }));

        limpiarError(campo);
    }

    function cambiarTaxonomia(campo, valor) {
        setForm(prev => ({
            ...prev,
            taxonomia: {
                ...prev.taxonomia,
                [campo]: valor
            }
        }));

        limpiarError(`taxonomia.${campo}`);
        limpiarError(campo);
    }

    function agregarNombreComun() {
        setForm(prev => ({
            ...prev,
            nombresComunes: [
                ...prev.nombresComunes,
                {
                    nombre: "",
                    region: "",
                    esPrincipal:
                        prev.nombresComunes.length === 0
                }
            ]
        }));
    }

    function cambiarNombreComun(index, campo, valor) {
        setForm(prev => ({
            ...prev,
            nombresComunes:
                prev.nombresComunes.map((item, i) => {
                    if (i !== index) {
                        return item;
                    }

                    if (campo === "esPrincipal" && valor === true) {
                        return {
                            ...item,
                            esPrincipal: true
                        };
                    }

                    return {
                        ...item,
                        [campo]: valor
                    };
                }).map((item, i) => {
                    if (
                        campo === "esPrincipal" &&
                        valor === true &&
                        i !== index
                    ) {
                        return {
                            ...item,
                            esPrincipal: false
                        };
                    }

                    return item;
                })
        }));

        limpiarError(`nombresComunes[${index}].${campo}`);
        limpiarError(`nombresComunes.${index}.${campo}`);
        limpiarError("nombresComunes");
    }

    function eliminarNombreComun(index) {
        setForm(prev => {
            const nuevos =
                prev.nombresComunes.filter(
                    (_, i) => i !== index
                );

            if (
                nuevos.length > 0 &&
                !nuevos.some(n => n.esPrincipal)
            ) {
                nuevos[0] = {
                    ...nuevos[0],
                    esPrincipal: true
                };
            }

            return {
                ...prev,
                nombresComunes: nuevos
            };
        });

        limpiarError("nombresComunes");
    }

    function validarPaso1() {
        const nuevos = {};

        const nombre = form.nombreCientifico.trim();
        const descripcion = form.descripcion.trim();
        const origen = form.origen.trim();

        if (!nombre) {
            nuevos.nombreCientifico =
                "El nombre científico es obligatorio";
        } else if (nombre.length > 250) {
            nuevos.nombreCientifico =
                "El nombre científico no puede exceder 250 caracteres";
        }

        if (!descripcion) {
            nuevos.descripcion =
                "La descripción es obligatoria";
        }

        if (origen.length > 250) {
            nuevos.origen =
                "El origen no puede exceder 250 caracteres";
        }

        setErrores(prev => ({
            ...prev,
            ...nuevos
        }));

        return Object.keys(nuevos).length === 0;
    }

    function validarPaso2() {
        const nuevos = {};
        const t = form.taxonomia;

        if (
            t.reino.trim() &&
            t.reino.trim().toLowerCase() !== "plantae"
        ) {
            nuevos["taxonomia.reino"] =
                "El reino debe ser 'Plantae'; este catálogo es exclusivamente de flora";
        }

        const max100 = [
            ["division", "La división"],
            ["clase", "La clase"],
            ["ordenTaxonomico", "El orden taxonómico"],
            ["familia", "La familia"]
        ];

        max100.forEach(([campo, nombre]) => {
            if (t[campo].trim().length > 100) {
                nuevos[`taxonomia.${campo}`] =
                    `${nombre} no puede exceder 100 caracteres`;
            }
        });

        if (!t.genero.trim()) {
            nuevos["taxonomia.genero"] =
                "El género es obligatorio";
        } else if (t.genero.trim().length > 100) {
            nuevos["taxonomia.genero"] =
                "El género no puede exceder 100 caracteres";
        }

        if (!t.especieTaxonomica.trim()) {
            nuevos["taxonomia.especieTaxonomica"] =
                "La especie taxonómica es obligatoria";
        } else if (
            t.especieTaxonomica.trim().length > 150
        ) {
            nuevos["taxonomia.especieTaxonomica"] =
                "La especie taxonómica no puede exceder 150 caracteres";
        }

        if (t.subespecie.trim().length > 150) {
            nuevos["taxonomia.subespecie"] =
                "La subespecie no puede exceder 150 caracteres";
        }

        setErrores(prev => ({
            ...prev,
            ...nuevos
        }));

        return Object.keys(nuevos).length === 0;
    }

    function validarPaso3() {
        const nuevos = {};

        if (form.nombresComunes.length === 0) {
            return true;
        }

        let principales = 0;

        form.nombresComunes.forEach((item, index) => {
            const nombre = item.nombre.trim();
            const region = item.region.trim();

            if (!nombre) {
                nuevos[`nombresComunes[${index}].nombre`] =
                    "El nombre es obligatorio";
            } else if (nombre.length > 150) {
                nuevos[`nombresComunes[${index}].nombre`] =
                    "El nombre no puede exceder 150 caracteres";
            }

            if (region.length > 150) {
                nuevos[`nombresComunes[${index}].region`] =
                    "La región no puede exceder 150 caracteres";
            }

            if (item.esPrincipal === null ||
                item.esPrincipal === undefined) {
                nuevos[`nombresComunes[${index}].esPrincipal`] =
                    "Debe indicarse si el nombre es el principal de la especie";
            }

            if (item.esPrincipal === true) {
                principales++;
            }
        });

        if (principales !== 1) {
            nuevos.nombresComunes =
                "Si registra nombres comunes, exactamente uno debe ser el principal";
        }

        setErrores(prev => ({
            ...prev,
            ...nuevos
        }));

        return Object.keys(nuevos).length === 0;
    }

    function siguiente() {
        if (paso === 1 && !validarPaso1()) {
            alertaValidacion();
            return;
        }

        if (paso === 2 && !validarPaso2()) {
            alertaValidacion();
            return;
        }

        setPaso(p => Math.min(3, p + 1));
    }

    function anterior() {
        setPaso(p => Math.max(1, p - 1));
    }

    const nombrePrincipal = useMemo(() => {
        return form.nombresComunes.find(
            n => n.esPrincipal
        )?.nombre || "Sin nombre común";
    }, [form.nombresComunes]);

    async function registrar() {
        const ok1 = validarPaso1();
        const ok2 = validarPaso2();
        const ok3 = validarPaso3();

        if (!ok1 || !ok2 || !ok3) {
            await alertaValidacion();

            if (!ok1) {
                setPaso(1);
            } else if (!ok2) {
                setPaso(2);
            } else {
                setPaso(3);
            }

            return;
        }

        const payload = {
            nombreCientifico:
                form.nombreCientifico.trim(),
            descripcion:
                form.descripcion.trim(),
            origen:
                form.origen.trim() || null,
            propiedades:
                form.propiedades.trim() || null,
            importanciaCultural:
                form.importanciaCultural.trim() || null,
            advertencias:
                form.advertencias.trim() || null,
            creadaPor: USUARIO_ID,
            taxonomia: {
                reino:
                    form.taxonomia.reino.trim() ||
                    null,
                division:
                    form.taxonomia.division.trim() ||
                    null,
                clase:
                    form.taxonomia.clase.trim() ||
                    null,
                ordenTaxonomico:
                    form.taxonomia.ordenTaxonomico.trim() ||
                    null,
                familia:
                    form.taxonomia.familia.trim() ||
                    null,
                genero:
                    form.taxonomia.genero.trim(),
                especieTaxonomica:
                    form.taxonomia
                        .especieTaxonomica
                        .trim(),
                subespecie:
                    form.taxonomia.subespecie.trim() ||
                    null
            },
            nombresComunes:
                form.nombresComunes.length === 0
                    ? []
                    : form.nombresComunes.map(n => ({
                        nombre: n.nombre.trim(),
                        region: n.region.trim() || null,
                        esPrincipal: n.esPrincipal
                    }))
        };

        try {
            setGuardando(true);

            await crearEspecie(payload);

            await Swal.fire({
                icon: "success",
                title: "Especie registrada",
                text: "La especie fue creada correctamente.",
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: {
                    popup: "flora-alert"
                }
            });

            navigate("/catalogo");

        } catch (error) {
            const validaciones =
                normalizarErroresBackend(error);

            if (
                Object.keys(validaciones).length > 0
            ) {
                setErrores(prev => ({
                    ...prev,
                    ...validaciones
                }));

                const campos =
                    Object.keys(validaciones);

                if (
                    campos.some(c =>
                        c.startsWith("nombreCientifico") ||
                        c.startsWith("descripcion") ||
                        c.startsWith("origen")
                    )
                ) {
                    setPaso(1);
                } else if (
                    campos.some(c =>
                        c.startsWith("taxonomia")
                    )
                ) {
                    setPaso(2);
                } else if (
                    campos.some(c =>
                        c.startsWith("nombresComunes")
                    )
                ) {
                    setPaso(3);
                }

                await alertaValidacion();
                return;
            }

            await alertaError(
                "No se pudo registrar la especie",
                obtenerMensaje(error)
            );

        } finally {
            setGuardando(false);
        }
    }

    return (
        <div className="ne-page">

            <div className="ne-heading">

                <div>
                    <span className="ne-crumb">
                        Especies / Nueva especie
                    </span>

                    <h1>Nueva especie</h1>

                    <p>
                        Registra la información científica
                        y descriptiva de la planta.
                    </p>
                </div>

                <button
                    type="button"
                    className="ne-back"
                    onClick={() =>
                        navigate("/catalogo")
                    }
                >
                    <ArrowLeft size={17} />
                    Volver
                </button>

            </div>

            <div className="ne-shell">

                <div className="ne-steps">

                    {[
                        [1, "Datos generales", "Información principal"],
                        [2, "Taxonomía", "Clasificación científica"],
                        [3, "Nombres comunes", "Nombres vernaculares"]
                    ].map(([numero, titulo, subtitulo]) => (
                        <button
                            type="button"
                            key={numero}
                            className={`ne-step ${paso === numero
                                    ? "active"
                                    : ""
                                } ${paso > numero
                                    ? "done"
                                    : ""
                                }`}
                            onClick={() => {
                                if (numero < paso) {
                                    setPaso(numero);
                                }
                            }}
                        >
                            <span className="ne-step-number">
                                {paso > numero
                                    ? <Check size={16} />
                                    : numero}
                            </span>

                            <span>
                                <strong>{titulo}</strong>
                                <small>{subtitulo}</small>
                            </span>
                        </button>
                    ))}

                </div>

                <div className="ne-content">

                    <section className="ne-form-card">

                        {paso === 1 && (
                            <>
                                <div className="ne-section-head">
                                    <span>
                                        <Leaf size={20} />
                                    </span>

                                    <div>
                                        <h2>
                                            Datos generales
                                        </h2>

                                        <p>
                                            Completa la información
                                            principal de la especie.
                                        </p>
                                    </div>
                                </div>

                                <div className={`ne-field ${errorCampo(
                                    "nombreCientifico"
                                )
                                        ? "error"
                                        : ""
                                    }`}>
                                    <label>
                                        Nombre científico *
                                    </label>

                                    <input
                                        value={
                                            form.nombreCientifico
                                        }
                                        maxLength={250}
                                        onChange={(e) =>
                                            cambiarCampo(
                                                "nombreCientifico",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Ej. Mangifera indica"
                                    />

                                    <div className="ne-field-foot">
                                        <small className="ne-error">
                                            {errorCampo(
                                                "nombreCientifico"
                                            )}
                                        </small>

                                        <small>
                                            {
                                                form.nombreCientifico
                                                    .length
                                            }/250
                                        </small>
                                    </div>
                                </div>

                                <div className={`ne-field ${errorCampo("descripcion")
                                        ? "error"
                                        : ""
                                    }`}>
                                    <label>
                                        Descripción *
                                    </label>

                                    <textarea
                                        rows={5}
                                        value={
                                            form.descripcion
                                        }
                                        onChange={(e) =>
                                            cambiarCampo(
                                                "descripcion",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Describe la especie, sus características principales..."
                                    />

                                    <small className="ne-error">
                                        {errorCampo(
                                            "descripcion"
                                        )}
                                    </small>
                                </div>

                                <div className="ne-grid-2">

                                    <div className={`ne-field ${errorCampo("origen")
                                            ? "error"
                                            : ""
                                        }`}>
                                        <label>Origen</label>

                                        <textarea
                                            rows={3}
                                            maxLength={250}
                                            value={form.origen}
                                            onChange={(e) =>
                                                cambiarCampo(
                                                    "origen",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Ej. Nativa de América tropical"
                                        />

                                        <div className="ne-field-foot">
                                            <small className="ne-error">
                                                {errorCampo(
                                                    "origen"
                                                )}
                                            </small>

                                            <small>
                                                {form.origen.length}/250
                                            </small>
                                        </div>
                                    </div>

                                    <div className="ne-field">
                                        <label>
                                            Propiedades
                                        </label>

                                        <textarea
                                            rows={3}
                                            value={
                                                form.propiedades
                                            }
                                            onChange={(e) =>
                                                cambiarCampo(
                                                    "propiedades",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Describe propiedades de la especie..."
                                        />
                                    </div>

                                    <div className="ne-field">
                                        <label>
                                            Importancia cultural
                                        </label>

                                        <textarea
                                            rows={3}
                                            value={
                                                form.importanciaCultural
                                            }
                                            onChange={(e) =>
                                                cambiarCampo(
                                                    "importanciaCultural",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Describe su importancia cultural..."
                                        />
                                    </div>

                                    <div className="ne-field">
                                        <label>
                                            Advertencias
                                        </label>

                                        <textarea
                                            rows={3}
                                            value={
                                                form.advertencias
                                            }
                                            onChange={(e) =>
                                                cambiarCampo(
                                                    "advertencias",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Precauciones, toxicidad u otras advertencias..."
                                        />
                                    </div>

                                </div>
                            </>
                        )}

                        {paso === 2 && (
                            <>
                                <div className="ne-section-head">
                                    <span>
                                        <FlaskConical size={20} />
                                    </span>

                                    <div>
                                        <h2>
                                            Clasificación taxonómica
                                        </h2>

                                        <p>
                                            Registra la clasificación
                                            científica de la especie.
                                        </p>
                                    </div>
                                </div>

                                <div className="ne-tax-grid">

                                    <CampoTaxonomia
                                        label="Reino"
                                        campo="reino"
                                        value={
                                            form.taxonomia.reino
                                        }
                                        error={
                                            errorCampo(
                                                "taxonomia.reino"
                                            )
                                        }
                                        maxLength={100}
                                        onChange={
                                            cambiarTaxonomia
                                        }
                                    />

                                    <CampoTaxonomia
                                        label="División"
                                        campo="division"
                                        value={
                                            form.taxonomia.division
                                        }
                                        error={
                                            errorCampo(
                                                "taxonomia.division"
                                            )
                                        }
                                        maxLength={100}
                                        onChange={
                                            cambiarTaxonomia
                                        }
                                    />

                                    <CampoTaxonomia
                                        label="Clase"
                                        campo="clase"
                                        value={
                                            form.taxonomia.clase
                                        }
                                        error={
                                            errorCampo(
                                                "taxonomia.clase"
                                            )
                                        }
                                        maxLength={100}
                                        onChange={
                                            cambiarTaxonomia
                                        }
                                    />

                                    <CampoTaxonomia
                                        label="Orden taxonómico"
                                        campo="ordenTaxonomico"
                                        value={
                                            form.taxonomia
                                                .ordenTaxonomico
                                        }
                                        error={
                                            errorCampo(
                                                "taxonomia.ordenTaxonomico"
                                            )
                                        }
                                        maxLength={100}
                                        onChange={
                                            cambiarTaxonomia
                                        }
                                    />

                                    <CampoTaxonomia
                                        label="Familia"
                                        campo="familia"
                                        value={
                                            form.taxonomia.familia
                                        }
                                        error={
                                            errorCampo(
                                                "taxonomia.familia"
                                            )
                                        }
                                        maxLength={100}
                                        onChange={
                                            cambiarTaxonomia
                                        }
                                    />

                                    <CampoTaxonomia
                                        label="Género *"
                                        campo="genero"
                                        value={
                                            form.taxonomia.genero
                                        }
                                        error={
                                            errorCampo(
                                                "taxonomia.genero"
                                            )
                                        }
                                        maxLength={100}
                                        onChange={
                                            cambiarTaxonomia
                                        }
                                    />

                                    <CampoTaxonomia
                                        label="Especie taxonómica *"
                                        campo="especieTaxonomica"
                                        value={
                                            form.taxonomia
                                                .especieTaxonomica
                                        }
                                        error={
                                            errorCampo(
                                                "taxonomia.especieTaxonomica"
                                            )
                                        }
                                        maxLength={150}
                                        onChange={
                                            cambiarTaxonomia
                                        }
                                    />

                                    <CampoTaxonomia
                                        label="Subespecie"
                                        campo="subespecie"
                                        value={
                                            form.taxonomia
                                                .subespecie
                                        }
                                        error={
                                            errorCampo(
                                                "taxonomia.subespecie"
                                            )
                                        }
                                        maxLength={150}
                                        onChange={
                                            cambiarTaxonomia
                                        }
                                    />

                                </div>

                                <div className="ne-info">
                                    <TriangleAlert size={18} />

                                    <span>
                                        El reino debe ser Plantae.
                                        Si se deja vacío, el servidor
                                        lo asignará automáticamente.
                                    </span>
                                </div>
                            </>
                        )}

                        {paso === 3 && (
                            <>
                                <div className="ne-section-head ne-section-head-action">

                                    <span>
                                        <Tags size={20} />
                                    </span>

                                    <div>
                                        <h2>
                                            Nombres comunes
                                        </h2>

                                        <p>
                                            Son opcionales. Si agregas
                                            nombres, uno debe ser
                                            el principal.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="ne-add-common"
                                        onClick={
                                            agregarNombreComun
                                        }
                                    >
                                        <Plus size={16} />
                                        Agregar nombre
                                    </button>

                                </div>

                                {errorCampo(
                                    "nombresComunes"
                                ) && (
                                        <div className="ne-global-error">
                                            {
                                                errorCampo(
                                                    "nombresComunes"
                                                )
                                            }
                                        </div>
                                    )}

                                {form.nombresComunes.length === 0 ? (
                                    <div className="ne-common-empty">

                                        <UserRound size={28} />

                                        <strong>
                                            Sin nombres comunes
                                        </strong>

                                        <span>
                                            Puedes registrar la
                                            especie sin nombres
                                            vernaculares.
                                        </span>

                                        <button
                                            type="button"
                                            onClick={
                                                agregarNombreComun
                                            }
                                        >
                                            <Plus size={16} />
                                            Agregar nombre común
                                        </button>

                                    </div>
                                ) : (
                                    <div className="ne-common-list">

                                        {form.nombresComunes.map(
                                            (nombre, index) => (
                                                <div
                                                    className="ne-common-card"
                                                    key={index}
                                                >

                                                    <div className="ne-common-number">
                                                        {index + 1}
                                                    </div>

                                                    <div className="ne-common-fields">

                                                        <div className={`ne-field ${errorCampo(
                                                            `nombresComunes[${index}].nombre`
                                                        )
                                                                ? "error"
                                                                : ""
                                                            }`}>
                                                            <label>
                                                                Nombre *
                                                            </label>

                                                            <input
                                                                value={
                                                                    nombre.nombre
                                                                }
                                                                maxLength={150}
                                                                onChange={(e) =>
                                                                    cambiarNombreComun(
                                                                        index,
                                                                        "nombre",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Ej. Mango"
                                                            />

                                                            <small className="ne-error">
                                                                {errorCampo(
                                                                    `nombresComunes[${index}].nombre`
                                                                )}
                                                            </small>
                                                        </div>

                                                        <div className={`ne-field ${errorCampo(
                                                            `nombresComunes[${index}].region`
                                                        )
                                                                ? "error"
                                                                : ""
                                                            }`}>
                                                            <label>
                                                                Región
                                                            </label>

                                                            <input
                                                                value={
                                                                    nombre.region
                                                                }
                                                                maxLength={150}
                                                                onChange={(e) =>
                                                                    cambiarNombreComun(
                                                                        index,
                                                                        "region",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Ej. El Salvador"
                                                            />

                                                            <small className="ne-error">
                                                                {errorCampo(
                                                                    `nombresComunes[${index}].region`
                                                                )}
                                                            </small>
                                                        </div>

                                                        <label className="ne-principal">

                                                            <input
                                                                type="radio"
                                                                name="principal"
                                                                checked={
                                                                    nombre.esPrincipal ===
                                                                    true
                                                                }
                                                                onChange={() =>
                                                                    cambiarNombreComun(
                                                                        index,
                                                                        "esPrincipal",
                                                                        true
                                                                    )
                                                                }
                                                            />

                                                            <span>
                                                                Nombre principal
                                                            </span>

                                                        </label>

                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="ne-delete-common"
                                                        onClick={() =>
                                                            eliminarNombreComun(
                                                                index
                                                            )
                                                        }
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>

                                                </div>
                                            )
                                        )}

                                    </div>
                                )}
                            </>
                        )}

                        <div className="ne-form-actions">

                            {paso > 1 && (
                                <button
                                    type="button"
                                    className="ne-btn-secondary"
                                    onClick={anterior}
                                >
                                    <ArrowLeft size={17} />
                                    Anterior
                                </button>
                            )}

                            <div className="ne-action-spacer" />

                            {paso < 3 ? (
                                <button
                                    type="button"
                                    className="ne-btn-primary"
                                    onClick={siguiente}
                                >
                                    Siguiente
                                    <ArrowRight size={17} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="ne-btn-primary"
                                    onClick={registrar}
                                    disabled={guardando}
                                >
                                    <Check size={17} />

                                    {guardando
                                        ? "Registrando..."
                                        : "Registrar especie"}
                                </button>
                            )}

                        </div>

                    </section>

                    <aside className="ne-preview">

                        <div className="ne-preview-head">
                            <BookOpen size={19} />

                            <div>
                                <strong>
                                    Vista previa
                                </strong>

                                <span>
                                    Resumen de la especie.
                                </span>
                            </div>
                        </div>

                        <div className="ne-preview-main">

                            <div className="ne-preview-icon">
                                <Leaf size={28} />
                            </div>

                            <div>
                                <h3>
                                    {form.nombreCientifico ||
                                        "Nombre científico"}
                                </h3>

                                <span>
                                    {nombrePrincipal}
                                </span>
                            </div>

                        </div>

                        <PreviewDato
                            titulo="Origen"
                            valor={form.origen}
                        />

                        <PreviewDato
                            titulo="Propiedades"
                            valor={form.propiedades}
                        />

                        <PreviewDato
                            titulo="Importancia cultural"
                            valor={
                                form.importanciaCultural
                            }
                        />

                        <PreviewDato
                            titulo="Advertencias"
                            valor={form.advertencias}
                        />

                        <div className="ne-preview-divider" />

                        <h4>
                            Clasificación taxonómica
                        </h4>

                        {[
                            ["Reino", form.taxonomia.reino || "Plantae"],
                            ["División", form.taxonomia.division],
                            ["Clase", form.taxonomia.clase],
                            ["Orden", form.taxonomia.ordenTaxonomico],
                            ["Familia", form.taxonomia.familia],
                            ["Género", form.taxonomia.genero],
                            ["Especie", form.taxonomia.especieTaxonomica],
                            ["Subespecie", form.taxonomia.subespecie]
                        ].map(([titulo, valor]) => (
                            <PreviewDato
                                key={titulo}
                                titulo={titulo}
                                valor={valor}
                                compacto
                            />
                        ))}

                        <div className="ne-preview-divider" />

                        <h4>Nombres comunes</h4>

                        {form.nombresComunes.length === 0 ? (
                            <span className="ne-none">
                                Sin nombres comunes.
                            </span>
                        ) : (
                            <div className="ne-common-tags">
                                {form.nombresComunes.map(
                                    (n, index) => (
                                        <span
                                            key={index}
                                            className={
                                                n.esPrincipal
                                                    ? "principal"
                                                    : ""
                                            }
                                        >
                                            {n.nombre ||
                                                `Nombre ${index + 1}`}
                                        </span>
                                    )
                                )}
                            </div>
                        )}

                    </aside>

                </div>

            </div>

        </div>
    );
}

function CampoTaxonomia({
    label,
    campo,
    value,
    error,
    maxLength,
    onChange
}) {
    return (
        <div className={`ne-field ${error ? "error" : ""}`}>
            <label>{label}</label>

            <input
                value={value}
                maxLength={maxLength}
                onChange={(e) =>
                    onChange(
                        campo,
                        e.target.value
                    )
                }
            />

            <div className="ne-field-foot">
                <small className="ne-error">
                    {error}
                </small>

                <small>
                    {value.length}/{maxLength}
                </small>
            </div>
        </div>
    );
}

function PreviewDato({
    titulo,
    valor,
    compacto = false
}) {
    return (
        <div className={`ne-preview-row ${compacto ? "compact" : ""
            }`}>
            <span>{titulo}</span>
            <strong>{valor || "-"}</strong>
        </div>
    );
}

export default NuevaEspecie;
