import {useEffect,useMemo,useState} from "react";
import {useLocation,useNavigate,useParams} from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    Apple,
    Search,
    RefreshCw,
    Plus,
    Pencil,
    Trash2,
    X,
    Save,
    Leaf,
    Sprout,
    BookOpen,
    Scale,
    Layers3,
    ChevronLeft,
    ChevronRight,
    Info,
    ArrowLeft
} from "lucide-react";
import {API_URL} from "../../../config";
import ComboBuscable from "../../../components/ComboBuscable";
import {
    listarAportesPorEspecie,
    crearAporte,
    actualizarAporte,
    eliminarAporte
} from "../../../api/aporteNutricionalService";
import {listarPartesComestibles} from "../../../api/parteComestibleService";
import {listarNutrientesActivos} from "../../../api/nutrienteService";
import {listarFuentes} from "../../../api/fuenteService";
import {
    crearEstadoRegistro,
    obtenerFormularioRetornado
} from "../../../utils/formularioRetorno";
import "../../../styles/aportesNutricionales.css";
import "../../../styles/alertas.css";

const POR_PAGINA=7;

const FORM_INICIAL={
    idEspecieParte:"",
    idNutriente:"",
    idFuente:"",
    cantidad:"",
    unidadMedida:"",
    porcionReferencia:"100 g",
    observacion:""
};

const UNIDADES=[
    "g",
    "mg",
    "µg",
    "kcal",
    "kJ",
    "%",
    "UI"
];

function obtenerLista(datos){
    if(Array.isArray(datos)){
        return datos;
    }

    if(Array.isArray(datos?.content)){
        return datos.content;
    }

    return [];
}

function nombreComunPrincipal(especie){
    if(especie?.nombreComun){
        return especie.nombreComun;
    }

    const nombres=Array.isArray(
        especie?.nombresComunes
    )
        ?especie.nombresComunes
        :[];

    const principal=nombres.find(
        nombre=>
            nombre?.esPrincipal===true||
            nombre?.principal===true
    );

    return principal?.nombre||
        nombres[0]?.nombre||
        "Sin nombre común";
}

function obtenerMensaje(error){
    const data=error?.response?.data;

    if(typeof data==="string"){
        return data;
    }

    const mensaje=
        data?.mensaje||
        data?.message||
        data?.error||
        "No se pudo completar la operación.";

    const errores=
        data?.erroresValidacion;

    if(
        errores&&
        typeof errores==="object"
    ){
        const detalles=
            Object.values(errores)
                .flat()
                .filter(Boolean)
                .join(" ");

        if(detalles){
            return `${mensaje} ${detalles}`;
        }
    }

    return mensaje;
}

function idNutriente(nutriente){
    return nutriente?.idNutriente??nutriente?.id;
}

function idFuente(fuente){
    return fuente?.idFuente??fuente?.id;
}

function AportesNutricionales(){
    const location=useLocation();
    const navigate=useNavigate();
    const {idEspecie}=useParams();

    const [especie,setEspecie]=useState(
        location.state?.especie||null
    );

    const [aportes,setAportes]=useState([]);
    const [partes,setPartes]=useState([]);
    const [nutrientes,setNutrientes]=useState([]);
    const [fuentes,setFuentes]=useState([]);

    const [cargando,setCargando]=useState(true);
    const [guardando,setGuardando]=useState(false);
    const [eliminando,setEliminando]=useState(false);

    const [busqueda,setBusqueda]=useState("");
    const [filtroParte,setFiltroParte]=useState("TODAS");
    const [pagina,setPagina]=useState(1);

    const [modal,setModal]=useState(
        Boolean(location.state?.abrirFormulario)
    );
    const [editando,setEditando]=useState(
        location.state?.contextoFormulario?.editando||null
    );
    const [form,setForm]=useState(
        obtenerFormularioRetornado(
            FORM_INICIAL,
            location
        )
    );
    const [errores,setErrores]=useState({});

    useEffect(()=>{
        cargarTodo();
    },[idEspecie]);

    useEffect(()=>{
        setPagina(1);
    },[
        busqueda,
        filtroParte
    ]);

    function cambiarEspecie(){
        navigate("/gestion-especies",{
            state:{
                abrirContenido:"aportes-nutricionales",
                categoria:"alimentacion",
                rutaRetorno:
                    location.state?.rutaRetorno||
                    "/contenido-especies/alimentacion"
            }
        });
    }

    function registrarParteComestible(){
        navigate(
            `/especies/${idEspecie}/contenido/partes-comestibles`,
            {
                state:{
                    especie,
                    categoria:"alimentacion",
                    desde:"aportes-nutricionales",
                    abrirContenido:"partes-comestibles",
                    rutaRetorno:location.pathname,
                    ...crearEstadoRegistro(
                        location,
                        "idEspecieParte",
                        form,
                        {editando}
                    )
                }
            }
        );
    }

    function registrarNutriente(){
        navigate("/catalogos/nutrientes",{
            state:{
                desde:"aportes-nutricionales",
                idEspecie:Number(idEspecie),
                especie,
                categoria:"alimentacion",
                rutaRetorno:location.pathname,
                ...crearEstadoRegistro(
                    location,
                    "idNutriente",
                    form,
                    {editando}
                )
            }
        });
    }

    function registrarFuente(){
        navigate("/catalogos/fuentes",{
            state:{
                desde:"aportes-nutricionales",
                idEspecie:Number(idEspecie),
                especie,
                categoria:"alimentacion",
                rutaRetorno:location.pathname,
                ...crearEstadoRegistro(
                    location,
                    "idFuente",
                    form,
                    {editando}
                )
            }
        });
    }

    async function cargarTodo(){
        try{
            setCargando(true);

            const [
                datosAportes,
                datosPartes,
                datosNutrientes,
                datosFuentes,
                respuestaEspecie
            ]=await Promise.all([
                listarAportesPorEspecie(
                    idEspecie
                ),
                listarPartesComestibles(
                    idEspecie,
                    false
                ),
                listarNutrientesActivos(),
                listarFuentes(true),
                axios.get(
                    `${API_URL}/api/especies/${idEspecie}`
                )
            ]);

            setAportes(
                obtenerLista(
                    datosAportes
                )
            );

            setPartes(
                obtenerLista(
                    datosPartes
                )
            );

            setNutrientes(
                obtenerLista(
                    datosNutrientes
                )
            );

            setFuentes(
                obtenerLista(
                    datosFuentes
                )
            );

            const datos=
                respuestaEspecie.data;

            setEspecie({
                idEspecie:
                    datos.idEspecie,
                nombreCientifico:
                    datos.nombreCientifico,
                nombreComun:
                    nombreComunPrincipal(
                        datos
                    ),
                familia:
                    datos?.taxonomia?.familia||
                    null,
                genero:
                    datos?.taxonomia?.genero||
                    null,
                activa:
                    datos.activa
            });
        }catch(error){
            await Swal.fire({
                icon:"error",
                title:"No se pudieron cargar los datos",
                text:obtenerMensaje(error),
                confirmButtonText:"Entendido",
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });
        }finally{
            setCargando(false);
        }
    }

    const partesActivas=useMemo(
        ()=>partes.filter(
            parte=>
                parte.activa!==false
        ),
        [partes]
    );

    const partesPorId=useMemo(
        ()=>new Map(
            partes.map(
                parte=>[
                    String(
                        parte.idEspecieParte
                    ),
                    parte
                ]
            )
        ),
        [partes]
    );

    const nutrientesPorId=useMemo(
        ()=>new Map(
            nutrientes.map(
                nutriente=>[
                    String(
                        idNutriente(
                            nutriente
                        )
                    ),
                    nutriente
                ]
            )
        ),
        [nutrientes]
    );

    const fuentesPorId=useMemo(
        ()=>new Map(
            fuentes.map(
                fuente=>[
                    String(
                        idFuente(fuente)
                    ),
                    fuente
                ]
            )
        ),
        [fuentes]
    );

    function nombreParte(aporte){
        return aporte?.parteNombre||
            partesPorId
                .get(
                    String(
                        aporte.idEspecieParte
                    )
                )
                ?.nombreParte||
            "Parte no disponible";
    }

    function nombreNutriente(aporte){
        return aporte?.nutrienteNombre||
            nutrientesPorId
                .get(
                    String(
                        aporte.idNutriente
                    )
                )
                ?.nombre||
            "Nutriente no disponible";
    }

    function categoriaNutriente(aporte){
        return aporte?.nutrienteCategoria||
            nutrientesPorId
                .get(
                    String(
                        aporte.idNutriente
                    )
                )
                ?.categoria||
            "OTRO";
    }

    function nombreFuente(aporte){
        if(aporte?.fuenteTitulo){
            return aporte.fuenteTitulo;
        }

        const fuente=
            fuentesPorId.get(
                String(
                    aporte.idFuente
                )
            );

        return fuente?.titulo||
            fuente?.nombre||
            "Sin fuente";
    }

    const filtrados=useMemo(()=>{
        const consulta=
            busqueda
                .trim()
                .toLowerCase();

        return aportes.filter(
            aporte=>{
                const coincideParte=
                    filtroParte==="TODAS"||
                    String(
                        aporte.idEspecieParte
                    )===
                    String(
                        filtroParte
                    );

                const texto=[
                    nombreParte(aporte),
                    nombreNutriente(aporte),
                    categoriaNutriente(
                        aporte
                    ),
                    nombreFuente(aporte),
                    aporte.observacion,
                    aporte.unidadMedida,
                    aporte.porcionReferencia
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const coincideBusqueda=
                    !consulta||
                    texto.includes(
                        consulta
                    );

                return (
                    coincideParte&&
                    coincideBusqueda
                );
            }
        );
    },[
        aportes,
        partesPorId,
        nutrientesPorId,
        fuentesPorId,
        busqueda,
        filtroParte
    ]);

    const cuantificados=useMemo(
        ()=>aportes.filter(
            aporte=>
                aporte.cantidad!==null&&
                aporte.cantidad!==undefined
        ).length,
        [aportes]
    );

    const conFuente=useMemo(
        ()=>aportes.filter(
            aporte=>
                aporte.idFuente!=null||
                Boolean(
                    aporte.fuenteTitulo
                )
        ).length,
        [aportes]
    );

    const totalPaginas=Math.max(
        1,
        Math.ceil(
            filtrados.length/
            POR_PAGINA
        )
    );

    const paginaActual=Math.min(
        pagina,
        totalPaginas
    );

    const visibles=filtrados.slice(
        (paginaActual-1)*POR_PAGINA,
        paginaActual*POR_PAGINA
    );

    function abrirNuevo(){
        if(
            partesActivas.length===0
        ){
            Swal.fire({
                icon:"info",
                title:"Sin partes comestibles",
                text:"Primero debes registrar una parte comestible para esta especie desde el módulo Partes comestibles.",
                showCancelButton:true,
                confirmButtonText:"Ir a Partes comestibles",
                cancelButtonText:"Cerrar",
                reverseButtons:true,
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:"flora-alert-confirm",
                    cancelButton:"flora-alert-cancel"
                }
            }).then(resultado=>{
                if(resultado.isConfirmed){
                    registrarParteComestible();
                }
            });

            return;
        }

        setEditando(null);

        setForm({
            ...FORM_INICIAL,
            idEspecieParte:
                partesActivas.length===1
                    ?String(
                        partesActivas[0]
                            .idEspecieParte
                    )
                    :""
        });

        setErrores({});
        setModal(true);
    }

    function abrirEditar(aporte){
        setEditando(aporte);

        setForm({
            idEspecieParte:
                String(
                    aporte.idEspecieParte||
                    ""
                ),
            idNutriente:
                String(
                    aporte.idNutriente||
                    ""
                ),
            idFuente:
                aporte.idFuente
                    ?String(
                        aporte.idFuente
                    )
                    :"",
            cantidad:
                aporte.cantidad!==null&&
                aporte.cantidad!==undefined
                    ?String(
                        aporte.cantidad
                    )
                    :"",
            unidadMedida:
                aporte.unidadMedida||
                "",
            porcionReferencia:
                aporte.porcionReferencia||
                "100 g",
            observacion:
                aporte.observacion||
                ""
        });

        setErrores({});
        setModal(true);
    }

    function cerrarModal(){
        if(guardando){
            return;
        }

        setModal(false);
        setEditando(null);
        setForm(FORM_INICIAL);
        setErrores({});
    }

    function cambiarCampo(
        campo,
        valor
    ){
        setForm(
            anterior=>({
                ...anterior,
                [campo]:valor
            })
        );

        setErrores(
            anterior=>({
                ...anterior,
                [campo]:""
            })
        );
    }

    function validar(){
        const nuevos={};

        if(!form.idEspecieParte){
            nuevos.idEspecieParte=
                "Selecciona una parte comestible.";
        }

        if(!form.idNutriente){
            nuevos.idNutriente=
                "Selecciona un nutriente.";
        }

        const porcion=
            form.porcionReferencia
                .trim();

        if(!porcion){
            nuevos.porcionReferencia=
                "La porción de referencia es obligatoria.";
        }else if(
            porcion.length>100
        ){
            nuevos.porcionReferencia=
                "La porción no puede superar 100 caracteres.";
        }

        const cantidad=
            String(
                form.cantidad??""
            ).trim();

        const unidad=
            String(
                form.unidadMedida??""
            ).trim();

        if(
            cantidad&&
            !unidad
        ){
            nuevos.unidadMedida=
                "Debes indicar la unidad de medida.";
        }

        if(
            !cantidad&&
            unidad
        ){
            nuevos.cantidad=
                "Debes indicar la cantidad.";
        }

        if(cantidad){
            const numero=
                Number(cantidad);

            if(
                Number.isNaN(numero)||
                numero<0
            ){
                nuevos.cantidad=
                    "Ingresa una cantidad válida igual o mayor que cero.";
            }
        }

        if(unidad.length>30){
            nuevos.unidadMedida=
                "La unidad no puede superar 30 caracteres.";
        }

        const observacion=
            form.observacion.trim();

        if(
            observacion.length>0&&
            observacion.length<4
        ){
            nuevos.observacion=
                "La observación debe tener al menos 4 caracteres.";
        }

        if(
            observacion.length>1000
        ){
            nuevos.observacion=
                "La observación no puede superar 1000 caracteres.";
        }

        if(
            form.idEspecieParte&&
            form.idNutriente
        ){
            const duplicado=
                aportes.some(
                    aporte=>
                        String(
                            aporte.idEspecieParte
                        )===
                        String(
                            form.idEspecieParte
                        )&&
                        String(
                            aporte.idNutriente
                        )===
                        String(
                            form.idNutriente
                        )&&
                        (
                            !editando||
                            aporte.idAporte!==
                            editando.idAporte
                        )
                );

            if(duplicado){
                nuevos.idNutriente=
                    "Esta parte ya tiene registrado este nutriente.";
            }
        }

        setErrores(nuevos);

        return (
            Object.keys(nuevos)
                .length===0
        );
    }

    async function guardar(evento){
        evento.preventDefault();

        if(
            guardando||
            !validar()
        ){
            return;
        }

        const cantidad=
            String(
                form.cantidad??""
            ).trim();

        const unidad=
            form.unidadMedida.trim();

        const observacion=
            form.observacion.trim();

        const payload={
            idEspecieParte:Number(
                form.idEspecieParte
            ),
            idNutriente:Number(
                form.idNutriente
            ),
            idFuente:
                form.idFuente
                    ?Number(
                        form.idFuente
                    )
                    :null,
            cantidad:
                cantidad
                    ?Number(cantidad)
                    :null,
            unidadMedida:
                unidad||null,
            porcionReferencia:
                form.porcionReferencia
                    .trim(),
            observacion:
                observacion||null
        };

        try{
            setGuardando(true);

            if(editando){
                await actualizarAporte(
                    editando.idAporte,
                    payload
                );
            }else{
                await crearAporte(
                    payload
                );
            }

            await Swal.fire({
                icon:"success",
                title:editando
                    ?"Aporte actualizado"
                    :"Aporte registrado",
                text:editando
                    ?"La información nutricional fue actualizada correctamente."
                    :"El nutriente fue asociado correctamente a la parte comestible.",
                timer:1700,
                timerProgressBar:true,
                showConfirmButton:false,
                customClass:{
                    popup:"flora-alert"
                }
            });

            setModal(false);
            setEditando(null);
            setForm(FORM_INICIAL);
            setErrores({});

            await cargarTodo();
        }catch(error){
            const validaciones=
                error?.response?.data
                    ?.erroresValidacion;

            if(
                validaciones&&
                typeof validaciones==="object"
            ){
                setErrores(
                    validaciones
                );
            }

            await Swal.fire({
                icon:"error",
                title:"No se pudo guardar",
                text:obtenerMensaje(error),
                confirmButtonText:"Entendido",
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });
        }finally{
            setGuardando(false);
        }
    }

    async function eliminar(aporte){
        const confirmacion=
            await Swal.fire({
                icon:"warning",
                title:"¿Eliminar aporte nutricional?",
                html:`Se eliminará <b>${nombreNutriente(aporte)}</b> de <b>${nombreParte(aporte)}</b>.`,
                showCancelButton:true,
                confirmButtonText:
                    "Sí, eliminar",
                cancelButtonText:
                    "Cancelar",
                reverseButtons:true,
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:
                        "flora-alert-confirm flora-alert-danger",
                    cancelButton:
                        "flora-alert-cancel"
                }
            });

        if(
            !confirmacion.isConfirmed
        ){
            return;
        }

        try{
            setEliminando(true);

            await eliminarAporte(
                aporte.idAporte
            );

            await cargarTodo();

            await Swal.fire({
                icon:"success",
                title:"Aporte eliminado",
                timer:1400,
                showConfirmButton:false,
                customClass:{
                    popup:"flora-alert"
                }
            });
        }catch(error){
            await Swal.fire({
                icon:"error",
                title:"No se pudo eliminar",
                text:obtenerMensaje(error),
                confirmButtonText:"Entendido",
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });
        }finally{
            setEliminando(false);
        }
    }

    return(
        <div className="an-page">

            <section className="an-head">

                <div>
                    <span className="an-crumb">
                        Contenido
                        <i>/</i>
                        Alimentación
                        <i>/</i>
                        {especie?.nombreComun||
                            "Especie"
                        }
                    </span>

                    <h1>
                        Aportes nutricionales
                    </h1>

                    <p>
                        Administra los nutrientes asociados a las partes comestibles de la especie seleccionada.
                    </p>
                </div>

                <div className="an-head-actions">

                    <button
                        type="button"
                        className="an-btn an-btn-change an-btn-lg"
                        onClick={cambiarEspecie}
                    >
                        <ArrowLeft size={17}/>
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="an-btn an-btn-primary an-btn-lg"
                        disabled={cargando}
                        onClick={abrirNuevo}
                    >
                        <Plus size={18}/>
                        Nuevo aporte
                    </button>

                </div>

            </section>

            <section className="an-context">

                <span className="an-context-avatar">
                    <Leaf size={21}/>
                </span>

                <div className="an-context-text">
                    <small>
                        ESPECIE SELECCIONADA
                    </small>

                    <strong>
                        {especie?.nombreComun||
                            "Sin nombre común"
                        }
                    </strong>

                    <em>
                        {especie?.nombreCientifico||
                            "Sin nombre científico"
                        }
                    </em>
                </div>

                <div className="an-context-extra">
                    <small>
                        Partes comestibles
                    </small>

                    <strong>
                        {partesActivas.length}
                    </strong>
                </div>

            </section>

            <section className="an-stats">

                <div className="an-stat an-stat-total">
                    <span className="an-stat-icon">
                        <Layers3 size={22}/>
                    </span>

                    <span className="an-stat-text">
                        <strong>
                            {aportes.length}
                        </strong>
                        <span>
                            Aportes registrados
                        </span>
                    </span>
                </div>

                <div className="an-stat an-stat-parts">
                    <span className="an-stat-icon">
                        <Sprout size={22}/>
                    </span>

                    <span className="an-stat-text">
                        <strong>
                            {partesActivas.length}
                        </strong>
                        <span>
                            Partes disponibles
                        </span>
                    </span>
                </div>

                <div className="an-stat an-stat-value">
                    <span className="an-stat-icon">
                        <Scale size={22}/>
                    </span>

                    <span className="an-stat-text">
                        <strong>
                            {cuantificados}
                        </strong>
                        <span>
                            Con cantidad
                        </span>
                    </span>
                </div>

                <div className="an-stat an-stat-source">
                    <span className="an-stat-icon">
                        <BookOpen size={22}/>
                    </span>

                    <span className="an-stat-text">
                        <strong>
                            {conFuente}
                        </strong>
                        <span>
                            Con fuente
                        </span>
                    </span>
                </div>

            </section>

            <section className="an-card">

                <div className="an-toolbar">

                    <label className="an-search">
                        <Search size={18}/>

                        <input
                            type="search"
                            value={busqueda}
                            onChange={evento=>
                                setBusqueda(
                                    evento.target.value
                                )
                            }
                            placeholder="Buscar nutriente, categoría, fuente..."
                        />

                        {busqueda&&(
                            <button
                                type="button"
                                onClick={()=>
                                    setBusqueda("")
                                }
                            >
                                <X size={14}/>
                            </button>
                        )}
                    </label>

                    <ComboBuscable
                        id="an-filtro-parte"
                        ariaLabel="Filtrar por parte comestible"
                        className="an-filter"
                        value={filtroParte}
                        onChange={evento=>
                            setFiltroParte(
                                evento.target.value
                            )
                        }
                        placeholder="Todas las partes"
                        searchPlaceholder="Buscar parte..."
                        options={[
                            {
                                value: "TODAS",
                                label: "Todas las partes"
                            },
                            ...partes.map(parte => ({
                                value: parte.idEspecieParte,
                                label: parte.nombreParte
                            }))
                        ]}
                    />

                    <button
                        type="button"
                        className="an-iconbtn an-refresh"
                        onClick={cargarTodo}
                        disabled={cargando}
                        title="Actualizar"
                    >
                        <RefreshCw
                            size={18}
                            className={
                                cargando
                                    ?"girando"
                                    :""
                            }
                        />
                    </button>

                </div>

                <div className="an-table-wrap">

                    <table className="an-table">

                        <thead>
                            <tr>
                                <th>Parte comestible</th>
                                <th>Nutriente</th>
                                <th>Categoría</th>
                                <th>Cantidad</th>
                                <th>Porción</th>
                                <th className="an-col-source">
                                    Fuente
                                </th>
                                <th className="an-col-actions">
                                    Acciones
                                </th>
                            </tr>
                        </thead>

                        <tbody>

                            {cargando?(
                                <tr>
                                    <td colSpan="7">

                                        <div className="an-state">
                                            <span className="an-spinner"/>
                                            <strong>
                                                Cargando aportes...
                                            </strong>
                                        </div>

                                    </td>
                                </tr>
                            ):visibles.length===0?(
                                <tr>
                                    <td colSpan="7">

                                        <div className="an-state an-empty">

                                            <Apple size={36}/>

                                            <strong>
                                                No hay aportes nutricionales
                                            </strong>

                                            <span>
                                                {aportes.length===0
                                                    ?"Esta especie todavía no tiene nutrientes asociados."
                                                    :"No hay resultados para los filtros seleccionados."
                                                }
                                            </span>

                                            {aportes.length===0&&(
                                                <button
                                                    type="button"
                                                    className="an-btn an-btn-primary"
                                                    onClick={abrirNuevo}
                                                >
                                                    <Plus size={16}/>
                                                    Registrar primer aporte
                                                </button>
                                            )}

                                        </div>

                                    </td>
                                </tr>
                            ):(
                                visibles.map(
                                    aporte=>(
                                        <tr
                                            key={
                                                aporte.idAporte
                                            }
                                        >

                                            <td>
                                                <div className="an-name">

                                                    <span className="an-avatar">
                                                        <Sprout size={19}/>
                                                    </span>

                                                    <strong>
                                                        {nombreParte(
                                                            aporte
                                                        )}
                                                    </strong>

                                                </div>
                                            </td>

                                            <td>
                                                <strong className="an-nutrient">
                                                    {nombreNutriente(
                                                        aporte
                                                    )}
                                                </strong>
                                            </td>

                                            <td>
                                                <span className="an-category">
                                                    {categoriaNutriente(
                                                        aporte
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {aporte.cantidad!==null&&
                                                aporte.cantidad!==undefined?(
                                                    <strong className="an-amount">
                                                        {Number(
                                                            aporte.cantidad
                                                        ).toLocaleString(
                                                            undefined,
                                                            {
                                                                maximumFractionDigits:4
                                                            }
                                                        )}{" "}
                                                        {aporte.unidadMedida}
                                                    </strong>
                                                ):(
                                                    <span className="an-muted">
                                                        Presente
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                {aporte.porcionReferencia}
                                            </td>

                                            <td className="an-col-source">
                                                <span className="an-source">
                                                    <BookOpen size={14}/>
                                                    {nombreFuente(
                                                        aporte
                                                    )}
                                                </span>
                                            </td>

                                            <td className="an-col-actions">

                                                <div className="an-actions">

                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        onClick={()=>
                                                            abrirEditar(
                                                                aporte
                                                            )
                                                        }
                                                    >
                                                        <Pencil size={16}/>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="delete"
                                                        title="Eliminar"
                                                        disabled={
                                                            eliminando
                                                        }
                                                        onClick={()=>
                                                            eliminar(
                                                                aporte
                                                            )
                                                        }
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>
                                    )
                                )
                            )}

                        </tbody>

                    </table>

                </div>

                <div className="an-pagination">

                    <span>
                        Mostrando{" "}
                        <strong>
                            {filtrados.length===0
                                ?0
                                :(paginaActual-1)*
                                POR_PAGINA+1
                            }
                        </strong>
                        {" "}a{" "}
                        <strong>
                            {Math.min(
                                paginaActual*
                                POR_PAGINA,
                                filtrados.length
                            )}
                        </strong>
                        {" "}de{" "}
                        <strong>
                            {filtrados.length}
                        </strong>
                    </span>

                    <div>

                        <button
                            type="button"
                            disabled={
                                paginaActual===1
                            }
                            onClick={()=>
                                setPagina(
                                    anterior=>
                                        anterior-1
                                )
                            }
                        >
                            <ChevronLeft size={17}/>
                        </button>

                        <span>
                            {paginaActual} / {totalPaginas}
                        </span>

                        <button
                            type="button"
                            disabled={
                                paginaActual===
                                totalPaginas
                            }
                            onClick={()=>
                                setPagina(
                                    anterior=>
                                        anterior+1
                                )
                            }
                        >
                            <ChevronRight size={17}/>
                        </button>

                    </div>

                </div>

            </section>

            {modal&&(
                <div
                    className="an-overlay"
                    onMouseDown={cerrarModal}
                >

                    <section
                        className="an-panel"
                        onMouseDown={evento=>
                            evento.stopPropagation()
                        }
                    >

                        <div className="an-modal-head">

                            <span className="an-modal-icon">
                                <Apple size={22}/>
                            </span>

                            <div>
                                <span>
                                    {editando
                                        ?"Editar registro"
                                        :"Nueva asociación"
                                    }
                                </span>

                                <h2>
                                    {editando
                                        ?"Editar aporte nutricional"
                                        :"Nuevo aporte nutricional"
                                    }
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="an-iconbtn"
                                onClick={cerrarModal}
                                disabled={guardando}
                            >
                                <X size={19}/>
                            </button>

                        </div>

                        <form onSubmit={guardar}>

                            <div className="an-modal-body">

                                <div className="an-preview">

                                    <small>
                                        Especie seleccionada
                                    </small>

                                    <div>
                                        <span>
                                            <Leaf size={20}/>
                                        </span>

                                        <div>
                                            <strong>
                                                {especie?.nombreComun||
                                                    "Sin nombre común"
                                                }
                                            </strong>

                                            <em>
                                                {especie?.nombreCientifico||
                                                    "Sin nombre científico"
                                                }
                                            </em>
                                        </div>
                                    </div>

                                </div>

                                <div className="an-grid-2">

                                    <div className="an-field">

                                        <label>
                                            Parte comestible *
                                        </label>

                                        <div className="an-select-action-row">

                                            <ComboBuscable
                                                id="an-parte"
                                                name="idEspecieParte"
                                                ariaLabel="Parte comestible"
                                                value={
                                                    form.idEspecieParte
                                                }
                                                onChange={evento=>
                                                    cambiarCampo(
                                                        "idEspecieParte",
                                                        evento.target.value
                                                    )
                                                }
                                                className={
                                                    errores.idEspecieParte
                                                        ?"error"
                                                        :""
                                                }
                                                placeholder="Selecciona una parte..."
                                                searchPlaceholder="Buscar parte..."
                                                options={partesActivas.map(
                                                    parte => ({
                                                        value: parte.idEspecieParte,
                                                        label: parte.nombreParte
                                                    })
                                                )}
                                            />

                                            <button
                                                type="button"
                                                className="an-register-btn"
                                                onClick={registrarParteComestible}
                                                title="Registrar una parte comestible"
                                            >
                                                <Plus size={15}/>
                                                <span>
                                                    Registrar parte
                                                </span>
                                            </button>

                                        </div>

                                        {errores.idEspecieParte&&(
                                            <small className="an-error">
                                                {errores.idEspecieParte}
                                            </small>
                                        )}

                                    </div>

                                    <div className="an-field">

                                        <label>
                                            Nutriente *
                                        </label>

                                        <div className="an-select-action-row">

                                            <ComboBuscable
                                                id="an-nutriente"
                                                name="idNutriente"
                                                ariaLabel="Nutriente"
                                                value={
                                                    form.idNutriente
                                                }
                                                onChange={evento=>
                                                    cambiarCampo(
                                                        "idNutriente",
                                                        evento.target.value
                                                    )
                                                }
                                                className={
                                                    errores.idNutriente
                                                        ?"error"
                                                        :""
                                                }
                                                placeholder="Selecciona un nutriente..."
                                                searchPlaceholder="Buscar nutriente..."
                                                options={nutrientes.map(
                                                    nutriente => ({
                                                        value: idNutriente(nutriente),
                                                        label: `${nutriente.nombre}${nutriente.categoria ? ` (${nutriente.categoria})` : ""}`
                                                    })
                                                )}
                                            />

                                            <button
                                                type="button"
                                                className="an-register-btn"
                                                onClick={registrarNutriente}
                                                title="Registrar un nuevo nutriente"
                                            >
                                                <Plus size={15}/>
                                                <span>
                                                    Registrar nutriente
                                                </span>
                                            </button>

                                        </div>

                                        {errores.idNutriente&&(
                                            <small className="an-error">
                                                {errores.idNutriente}
                                            </small>
                                        )}

                                    </div>

                                </div>

                                <div className="an-grid-3">

                                    <div className="an-field">
                                        <label>
                                            Cantidad
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={
                                                form.cantidad
                                            }
                                            onChange={evento=>
                                                cambiarCampo(
                                                    "cantidad",
                                                    evento.target.value
                                                )
                                            }
                                            placeholder="Ej. 15.5"
                                            className={
                                                errores.cantidad
                                                    ?"error"
                                                    :""
                                            }
                                        />

                                        {errores.cantidad&&(
                                            <small className="an-error">
                                                {errores.cantidad}
                                            </small>
                                        )}
                                    </div>

                                    <div className="an-field">
                                        <label>
                                            Unidad
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={30}
                                            value={
                                                form.unidadMedida
                                            }
                                            onChange={evento=>
                                                cambiarCampo(
                                                    "unidadMedida",
                                                    evento.target.value
                                                )
                                            }
                                            placeholder="mg, g, kcal..."
                                            className={
                                                errores.unidadMedida
                                                    ?"error"
                                                    :""
                                            }
                                        />

                                        <div className="an-units">
                                            {UNIDADES.map(
                                                unidad=>(
                                                    <button
                                                        type="button"
                                                        key={unidad}
                                                        className={
                                                            form.unidadMedida===unidad
                                                                ?"on"
                                                                :""
                                                        }
                                                        onClick={()=>
                                                            cambiarCampo(
                                                                "unidadMedida",
                                                                unidad
                                                            )
                                                        }
                                                    >
                                                        {unidad}
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        {errores.unidadMedida&&(
                                            <small className="an-error">
                                                {errores.unidadMedida}
                                            </small>
                                        )}
                                    </div>

                                    <div className="an-field">
                                        <label>
                                            Porción de referencia *
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={100}
                                            value={
                                                form.porcionReferencia
                                            }
                                            onChange={evento=>
                                                cambiarCampo(
                                                    "porcionReferencia",
                                                    evento.target.value
                                                )
                                            }
                                            placeholder="Ej. 100 g"
                                            className={
                                                errores.porcionReferencia
                                                    ?"error"
                                                    :""
                                            }
                                        />

                                        {errores.porcionReferencia&&(
                                            <small className="an-error">
                                                {errores.porcionReferencia}
                                            </small>
                                        )}
                                    </div>

                                </div>

                                <div className="an-grid-2">

                                    <div className="an-field">
                                        <label>
                                            Fuente bibliográfica
                                        </label>

                                        <div className="an-select-action-row">

                                            <ComboBuscable
                                                id="an-fuente"
                                                name="idFuente"
                                                ariaLabel="Fuente bibliográfica"
                                                value={
                                                    form.idFuente
                                                }
                                                onChange={evento=>
                                                    cambiarCampo(
                                                        "idFuente",
                                                        evento.target.value
                                                    )
                                                }
                                                placeholder="Sin fuente"
                                                searchPlaceholder="Buscar fuente..."
                                                options={[
                                                    {
                                                        value: "",
                                                        label: "Sin fuente"
                                                    },
                                                    ...fuentes.map(fuente => ({
                                                        value: idFuente(fuente),
                                                        label: fuente.titulo || fuente.nombre
                                                    }))
                                                ]}
                                            />

                                            <button
                                                type="button"
                                                className="an-register-btn"
                                                onClick={registrarFuente}
                                                title="Registrar una nueva fuente"
                                            >
                                                <Plus size={15}/>
                                                <span>
                                                    Registrar fuente
                                                </span>
                                            </button>

                                        </div>
                                    </div>

                                    <div className="an-field">
                                        <label>
                                            Observación
                                        </label>

                                        <textarea
                                            rows={4}
                                            maxLength={1000}
                                            value={
                                                form.observacion
                                            }
                                            onChange={evento=>
                                                cambiarCampo(
                                                    "observacion",
                                                    evento.target.value
                                                )
                                            }
                                            placeholder="Información adicional del aporte..."
                                            className={
                                                errores.observacion
                                                    ?"error"
                                                    :""
                                            }
                                        />

                                        {errores.observacion&&(
                                            <small className="an-error">
                                                {errores.observacion}
                                            </small>
                                        )}
                                    </div>

                                </div>

                                <div className="an-info">
                                    <Info size={18}/>

                                    <div>
                                        <strong>
                                            Aporte asociado a una parte comestible
                                        </strong>

                                        <span>
                                            La especie ya está seleccionada. Cada nutriente se registra sobre una de sus partes comestibles.
                                        </span>
                                    </div>
                                </div>

                            </div>

                            <div className="an-modal-foot">

                                <button
                                    type="button"
                                    className="an-btn an-btn-ghost"
                                    onClick={cerrarModal}
                                    disabled={guardando}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="an-btn an-btn-primary"
                                    disabled={guardando}
                                >
                                    {guardando?(
                                        <RefreshCw
                                            size={16}
                                            className="girando"
                                        />
                                    ):(
                                        <Save size={16}/>
                                    )}

                                    {guardando
                                        ?"Guardando..."
                                        :editando
                                            ?"Guardar cambios"
                                            :"Registrar aporte"
                                    }
                                </button>

                            </div>

                        </form>

                    </section>

                </div>
            )}

        </div>
    );
}

export default AportesNutricionales;