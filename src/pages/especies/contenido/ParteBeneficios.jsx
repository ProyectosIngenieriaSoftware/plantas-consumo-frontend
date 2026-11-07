import {useEffect,useMemo,useState} from "react";
import {useLocation,useNavigate,useParams} from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
    HeartPulse,
    Search,
    RefreshCw,
    Plus,
    Pencil,
    PowerOff,
    RotateCcw,
    X,
    Save,
    Leaf,
    Sprout,
    BookOpen,
    CheckCircle2,
    Ban,
    Layers3,
    ChevronLeft,
    ChevronRight,
    Info,
    ArrowLeft
} from "lucide-react";
import {API_URL} from "../../../config";
import ComboBuscable from "../../../components/ComboBuscable";
import {
    listarBeneficios,
    idDeBeneficio
} from "../../../api/beneficioService";
import {listarFuentes} from "../../../api/fuenteService";
import {listarPartesComestibles} from "../../../api/parteComestibleService";
import {
    crearEstadoRegistro,
    obtenerFormularioRetornado
} from "../../../utils/formularioRetorno";
import {
    listarParteBeneficios,
    crearParteBeneficio,
    actualizarParteBeneficio,
    desactivarParteBeneficio
} from "../../../api/parteBeneficioService";
import "../../../styles/parteBeneficios.css";
import "../../../styles/alertas.css";

const POR_PAGINA=7;

const FORMULARIO_INICIAL={
    idEspecieParte:"",
    idBeneficio:"",
    idFuente:"",
    observacion:"",
    activa:true
};

function obtenerLista(datos){
    if(Array.isArray(datos)){
        return datos;
    }

    if(Array.isArray(datos?.content)){
        return datos.content;
    }

    return [];
}

function idDeFuente(fuente){
    return fuente?.idFuente??fuente?.id;
}

function claveRegistro(registro){
    return `${registro.idEspecieParte}-${registro.idBeneficio}`;
}

function obtenerMensaje(error){
    const data=
        error?.body||
        error?.response?.data;

    if(typeof data==="string"){
        return data;
    }

    const mensaje=
        data?.mensaje||
        data?.message||
        data?.error||
        error?.message||
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

function nombreComunPrincipal(especie){
    if(especie?.nombreComun){
        return especie.nombreComun;
    }

    const nombres=
        Array.isArray(
            especie?.nombresComunes
        )
            ?especie.nombresComunes
            :[];

    const principal=
        nombres.find(
            nombre=>
                nombre?.esPrincipal===true||
                nombre?.principal===true
        );

    return principal?.nombre||
        nombres[0]?.nombre||
        "Sin nombre común";
}

function beneficioActivo(beneficio){
    return beneficio?.activo!==false;
}

function fuenteActiva(fuente){
    return fuente?.activa!==false;
}

function ParteBeneficios(){
    const location=useLocation();
    const navigate=useNavigate();
    const {idEspecie}=useParams();

    const [especie,setEspecie]=useState(
        location.state?.especie||null
    );

    const [partes,setPartes]=useState([]);
    const [registros,setRegistros]=useState([]);
    const [beneficios,setBeneficios]=useState([]);
    const [fuentes,setFuentes]=useState([]);
    const [cargando,setCargando]=useState(true);
    const [guardando,setGuardando]=useState(false);
    const [accionando,setAccionando]=useState(false);
    const [busqueda,setBusqueda]=useState("");
    const [estado,setEstado]=useState("TODAS");
    const [pagina,setPagina]=useState(1);
    const [modal,setModal]=useState(
        Boolean(location.state?.abrirFormulario)
    );
    const [editando,setEditando]=useState(
        location.state?.contextoFormulario?.editando||null
    );
    const [errorFormulario,setErrorFormulario]=useState("");

    const [formulario,setFormulario]=useState(
        obtenerFormularioRetornado(
            FORMULARIO_INICIAL,
            location
        )
    );

    useEffect(()=>{
        cargarDatos();
    },[idEspecie]);

    useEffect(()=>{
        setPagina(1);
    },[busqueda,estado]);

    function cambiarEspecie(){
        navigate("/gestion-especies",{
            state:{
                abrirContenido:"beneficios",
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
                    desde:"parte-beneficios",
                    categoria:"alimentacion",
                    rutaRetorno:location.pathname,
                    ...crearEstadoRegistro(
                        location,
                        "idEspecieParte",
                        formulario,
                        {editando}
                    )
                }
            }
        );
    }

    function registrarBeneficio(){
        navigate("/catalogos/beneficios",{
            state:{
                desde:"parte-beneficios",
                idEspecie:Number(idEspecie),
                especie,
                categoria:"alimentacion",
                rutaRetorno:location.pathname,
                ...crearEstadoRegistro(
                    location,
                    "idBeneficio",
                    formulario,
                    {editando}
                )
            }
        });
    }

    function registrarFuente(){
        navigate("/catalogos/fuentes",{
            state:{
                desde:"parte-beneficios",
                idEspecie:Number(idEspecie),
                especie,
                categoria:"alimentacion",
                rutaRetorno:location.pathname,
                ...crearEstadoRegistro(
                    location,
                    "idFuente",
                    formulario,
                    {editando}
                )
            }
        });
    }

    async function cargarDatos(){
        try{
            setCargando(true);

            const [
                datosRegistros,
                datosBeneficios,
                datosFuentes,
                datosPartes,
                respuestaEspecie
            ]=await Promise.all([
                listarParteBeneficios(),
                listarBeneficios(),
                listarFuentes(),
                listarPartesComestibles(
                    idEspecie,
                    false
                ),
                axios.get(
                    `${API_URL}/api/especies/${idEspecie}`
                )
            ]);

            const listaPartes=
                obtenerLista(
                    datosPartes
                );

            setPartes(
                listaPartes
            );

            const idsPartes=
                new Set(
                    listaPartes.map(
                        parte=>
                            String(
                                parte.idEspecieParte
                            )
                    )
                );

            setRegistros(
                obtenerLista(
                    datosRegistros
                ).filter(
                    registro=>
                        idsPartes.has(
                            String(
                                registro.idEspecieParte
                            )
                        )
                )
            );

            setBeneficios(
                obtenerLista(
                    datosBeneficios
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

    const beneficiosPorId=useMemo(
        ()=>new Map(
            beneficios.map(
                beneficio=>[
                    String(
                        idDeBeneficio(
                            beneficio
                        )
                    ),
                    beneficio
                ]
            )
        ),
        [beneficios]
    );

    const fuentesPorId=useMemo(
        ()=>new Map(
            fuentes.map(
                fuente=>[
                    String(
                        idDeFuente(
                            fuente
                        )
                    ),
                    fuente
                ]
            )
        ),
        [fuentes]
    );

    function nombreParte(id){
        return partesPorId
            .get(String(id))
            ?.nombreParte||
            "Parte no disponible";
    }

    function nombreBeneficio(id){
        return beneficiosPorId
            .get(String(id))
            ?.nombre||
            "Beneficio no disponible";
    }

    function nombreFuente(id){
        const fuente=
            fuentesPorId.get(
                String(id)
            );

        return fuente?.titulo||
            fuente?.nombre||
            "Fuente no disponible";
    }

    const partesActivas=useMemo(
        ()=>partes.filter(
            parte=>
                parte.activa!==false
        ),
        [partes]
    );

    const filtrados=useMemo(()=>{
        const consulta=
            busqueda
                .trim()
                .toLowerCase();

        return registros.filter(
            registro=>{
                const parte=
                    partesPorId.get(
                        String(
                            registro.idEspecieParte
                        )
                    );

                const beneficio=
                    beneficiosPorId.get(
                        String(
                            registro.idBeneficio
                        )
                    );

                const fuente=
                    fuentesPorId.get(
                        String(
                            registro.idFuente
                        )
                    );

                const contenido=[
                    parte?.nombreParte,
                    beneficio?.nombre,
                    fuente?.titulo,
                    fuente?.nombre,
                    registro.observacion
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const coincideBusqueda=
                    !consulta||
                    contenido.includes(
                        consulta
                    );

                const activa=
                    registro.activa===true;

                const coincideEstado=
                    estado==="TODAS"||
                    (
                        estado==="ACTIVAS"&&
                        activa
                    )||
                    (
                        estado==="INACTIVAS"&&
                        !activa
                    );

                return(
                    coincideBusqueda&&
                    coincideEstado
                );
            }
        );
    },[
        registros,
        partesPorId,
        beneficiosPorId,
        fuentesPorId,
        busqueda,
        estado
    ]);

    const activas=useMemo(
        ()=>registros.filter(
            registro=>
                registro.activa===true
        ).length,
        [registros]
    );

    const inactivas=
        registros.length-activas;

    const beneficiosDisponibles=
        useMemo(()=>{
            const activos=
                beneficios.filter(
                    beneficio=>
                        beneficioActivo(
                            beneficio
                        )
                );

            if(
                !formulario.idEspecieParte
            ){
                return activos;
            }

            const asociados=
                new Set(
                    registros
                        .filter(
                            registro=>
                                String(
                                    registro.idEspecieParte
                                )===
                                String(
                                    formulario.idEspecieParte
                                )
                        )
                        .map(
                            registro=>
                                String(
                                    registro.idBeneficio
                                )
                        )
                );

            return activos.filter(
                beneficio=>
                    !asociados.has(
                        String(
                            idDeBeneficio(
                                beneficio
                            )
                        )
                    )
            );
        },[
            beneficios,
            registros,
            formulario.idEspecieParte
        ]);

    const fuentesFormulario=
        useMemo(
            ()=>fuentes.filter(
                fuente=>
                    fuenteActiva(fuente)||
                    (
                        editando&&
                        String(
                            idDeFuente(fuente)
                        )===
                        String(
                            formulario.idFuente
                        )
                    )
            ),
            [
                fuentes,
                editando,
                formulario.idFuente
            ]
        );

    const totalPaginas=
        Math.max(
            1,
            Math.ceil(
                filtrados.length/
                POR_PAGINA
            )
        );

    const paginaActual=
        Math.min(
            pagina,
            totalPaginas
        );

    const visibles=
        filtrados.slice(
            (paginaActual-1)*
            POR_PAGINA,
            paginaActual*
            POR_PAGINA
        );

    function abrirNuevo(){
        if(
            partesActivas.length===0
        ){
            Swal.fire({
                icon:"info",
                title:"No hay partes comestibles activas",
                text:"Primero debes registrar o reactivar una parte comestible para esta especie.",
                showCancelButton:true,
                confirmButtonText:
                    "Registrar parte",
                cancelButtonText:
                    "Cerrar",
                reverseButtons:true,
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:
                        "flora-alert-confirm",
                    cancelButton:
                        "flora-alert-cancel"
                }
            }).then(resultado=>{
                if(resultado.isConfirmed){
                    registrarParteComestible();
                }
            });

            return;
        }

        setEditando(null);

        setFormulario(
            FORMULARIO_INICIAL
        );

        setErrorFormulario("");
        setModal(true);
    }

    function abrirEditar(registro){
        setEditando(
            registro
        );

        setFormulario({
            idEspecieParte:
                String(
                    registro.idEspecieParte
                ),
            idBeneficio:
                String(
                    registro.idBeneficio
                ),
            idFuente:
                String(
                    registro.idFuente??""
                ),
            observacion:
                registro.observacion??"",
            activa:
                registro.activa===true
        });

        setErrorFormulario("");
        setModal(true);
    }

    function cerrarModal(){
        if(guardando){
            return;
        }

        setModal(false);
        setEditando(null);

        setFormulario(
            FORMULARIO_INICIAL
        );

        setErrorFormulario("");
    }

    function cambiarCampo(
        campo,
        valor
    ){
        setFormulario(
            anterior=>({
                ...anterior,
                [campo]:valor,
                ...(campo==="idEspecieParte"
                    ?{idBeneficio:""}
                    :{}
                )
            })
        );

        setErrorFormulario("");
    }

    function validarFormulario(){
        if(
            !formulario.idEspecieParte
        ){
            return "Selecciona una parte comestible.";
        }

        if(
            !editando&&
            !formulario.idBeneficio
        ){
            return "Selecciona un beneficio.";
        }

        if(
            !formulario.idFuente
        ){
            return "Selecciona una fuente.";
        }

        if(
            !formulario
                .observacion
                .trim()
        ){
            return "La observación es obligatoria.";
        }

        if(
            formulario
                .observacion
                .trim()
                .length>1000
        ){
            return "La observación no puede superar 1000 caracteres.";
        }

        if(!editando){
            const parte=
                partesPorId.get(
                    String(
                        formulario.idEspecieParte
                    )
                );

            if(
                !parte||
                parte.activa===false
            ){
                return "Selecciona una parte comestible activa.";
            }

            const beneficio=
                beneficiosPorId.get(
                    String(
                        formulario.idBeneficio
                    )
                );

            if(
                !beneficio||
                !beneficioActivo(
                    beneficio
                )
            ){
                return "Selecciona un beneficio activo.";
            }

            const fuente=
                fuentesPorId.get(
                    String(
                        formulario.idFuente
                    )
                );

            if(
                !fuente||
                !fuenteActiva(
                    fuente
                )
            ){
                return "Selecciona una fuente activa.";
            }

            const existe=
                registros.some(
                    registro=>
                        String(
                            registro.idEspecieParte
                        )===
                        String(
                            formulario.idEspecieParte
                        )&&
                        String(
                            registro.idBeneficio
                        )===
                        String(
                            formulario.idBeneficio
                        )
                );

            if(existe){
                return "Esta parte ya tiene asociado ese beneficio.";
            }
        }

        return "";
    }

    async function guardar(evento){
        evento.preventDefault();

        if(guardando){
            return;
        }

        const validacion=
            validarFormulario();

        if(validacion){
            setErrorFormulario(
                validacion
            );

            return;
        }

        try{
            setGuardando(true);

            if(editando){
                await actualizarParteBeneficio(
                    Number(
                        editando.idEspecieParte
                    ),
                    Number(
                        editando.idBeneficio
                    ),
                    {
                        idFuente:Number(
                            formulario.idFuente
                        ),
                        observacion:
                            formulario
                                .observacion
                                .trim(),
                        activa:
                            formulario.activa
                    }
                );
            }else{
                await crearParteBeneficio({
                    idEspecieParte:Number(
                        formulario.idEspecieParte
                    ),
                    idBeneficio:Number(
                        formulario.idBeneficio
                    ),
                    idFuente:Number(
                        formulario.idFuente
                    ),
                    observacion:
                        formulario
                            .observacion
                            .trim()
                });
            }

            await Swal.fire({
                icon:"success",
                title:editando
                    ?"Asociación actualizada"
                    :"Beneficio asociado",
                text:editando
                    ?"Los cambios fueron guardados correctamente."
                    :"El beneficio fue asociado correctamente a la parte comestible.",
                timer:1700,
                timerProgressBar:true,
                showConfirmButton:false,
                customClass:{
                    popup:"flora-alert"
                }
            });

            setModal(false);
            setEditando(null);

            setFormulario(
                FORMULARIO_INICIAL
            );

            setErrorFormulario("");

            await cargarDatos();
        }catch(error){
            setErrorFormulario(
                obtenerMensaje(error)
            );
        }finally{
            setGuardando(false);
        }
    }

    async function desactivar(registro){
        const confirmacion=
            await Swal.fire({
                icon:"warning",
                title:"¿Desactivar asociación?",
                html:`El beneficio <b>${nombreBeneficio(registro.idBeneficio)}</b> quedará inactivo para <b>${nombreParte(registro.idEspecieParte)}</b>.`,
                showCancelButton:true,
                confirmButtonText:
                    "Sí, desactivar",
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
            setAccionando(true);

            await desactivarParteBeneficio(
                Number(
                    registro.idEspecieParte
                ),
                Number(
                    registro.idBeneficio
                )
            );

            await cargarDatos();

            await Swal.fire({
                icon:"success",
                title:"Asociación desactivada",
                timer:1400,
                showConfirmButton:false,
                customClass:{
                    popup:"flora-alert"
                }
            });
        }catch(error){
            await Swal.fire({
                icon:"error",
                title:"No se pudo desactivar",
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
            setAccionando(false);
        }
    }

    async function reactivar(registro){
        const parte=
            partesPorId.get(
                String(
                    registro.idEspecieParte
                )
            );

        const beneficio=
            beneficiosPorId.get(
                String(
                    registro.idBeneficio
                )
            );

        const fuente=
            fuentesPorId.get(
                String(
                    registro.idFuente
                )
            );

        if(
            parte?.activa===false||
            !beneficioActivo(
                beneficio
            )||
            !fuenteActiva(
                fuente
            )
        ){
            await Swal.fire({
                icon:"warning",
                title:"No se puede reactivar",
                text:"La parte comestible, el beneficio y la fuente deben estar activos.",
                confirmButtonText:"Entendido",
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:
                        "flora-alert-confirm"
                }
            });

            return;
        }

        const confirmacion=
            await Swal.fire({
                icon:"question",
                title:"¿Reactivar asociación?",
                html:`El beneficio <b>${nombreBeneficio(registro.idBeneficio)}</b> volverá a estar activo.`,
                showCancelButton:true,
                confirmButtonText:
                    "Sí, reactivar",
                cancelButtonText:
                    "Cancelar",
                reverseButtons:true,
                buttonsStyling:false,
                customClass:{
                    popup:"flora-alert",
                    confirmButton:
                        "flora-alert-confirm",
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
            setAccionando(true);

            await actualizarParteBeneficio(
                Number(
                    registro.idEspecieParte
                ),
                Number(
                    registro.idBeneficio
                ),
                {
                    idFuente:Number(
                        registro.idFuente
                    ),
                    observacion:
                        registro.observacion,
                    activa:true
                }
            );

            await cargarDatos();

            await Swal.fire({
                icon:"success",
                title:"Asociación reactivada",
                timer:1400,
                showConfirmButton:false,
                customClass:{
                    popup:"flora-alert"
                }
            });
        }catch(error){
            await Swal.fire({
                icon:"error",
                title:"No se pudo reactivar",
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
            setAccionando(false);
        }
    }

    return(
        <div className="pb-page">

            <section className="pb-head">

                <div>

                    <span className="pb-crumb">
                        Contenido
                        <i>/</i>
                        Alimentación
                        <i>/</i>
                        {especie?.nombreComun||
                            "Especie"
                        }
                    </span>

                    <h1>
                        Beneficios por parte
                    </h1>

                    <p>
                        Administra los beneficios asociados a las partes comestibles de la especie seleccionada.
                    </p>

                </div>

                <div className="pb-head-actions">

                    <button
                        type="button"
                        className="pb-btn pb-btn-change pb-btn-lg"
                        onClick={cambiarEspecie}
                    >
                        <ArrowLeft size={17}/>
                        Cambiar especie
                    </button>

                    <button
                        type="button"
                        className="pb-btn pb-btn-primary pb-btn-lg"
                        disabled={cargando}
                        onClick={abrirNuevo}
                    >
                        <Plus size={18}/>
                        Nuevo beneficio
                    </button>

                </div>

            </section>

            <section className="pb-context">

                <div className="pb-context-block">

                    <span className="pb-context-avatar">
                        <Leaf size={21}/>
                    </span>

                    <div>

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
                                "Especie"
                            }
                        </em>

                    </div>

                </div>

                <div className="pb-context-divider"/>

                <div className="pb-context-block">

                    <span className="pb-context-avatar part">
                        <Sprout size={21}/>
                    </span>

                    <div>

                        <small>
                            PARTES COMESTIBLES
                        </small>

                        <strong>
                            {partesActivas.length} disponibles
                        </strong>

                        <em>
                            La parte se selecciona al registrar el beneficio.
                        </em>

                    </div>

                </div>

            </section>

            <section className="pb-stats">

                <button
                    type="button"
                    className="pb-stat pb-stat-total"
                    aria-pressed={
                        estado==="TODAS"
                    }
                    onClick={()=>
                        setEstado("TODAS")
                    }
                >
                    <span className="pb-stat-icon">
                        <Layers3 size={22}/>
                    </span>

                    <span className="pb-stat-text">
                        <strong>
                            {registros.length}
                        </strong>

                        <span>
                            Asociaciones
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    className="pb-stat pb-stat-ok"
                    aria-pressed={
                        estado==="ACTIVAS"
                    }
                    onClick={()=>
                        setEstado("ACTIVAS")
                    }
                >
                    <span className="pb-stat-icon">
                        <CheckCircle2 size={22}/>
                    </span>

                    <span className="pb-stat-text">
                        <strong>
                            {activas}
                        </strong>

                        <span>
                            Activas
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    className="pb-stat pb-stat-off"
                    aria-pressed={
                        estado==="INACTIVAS"
                    }
                    onClick={()=>
                        setEstado("INACTIVAS")
                    }
                >
                    <span className="pb-stat-icon">
                        <Ban size={22}/>
                    </span>

                    <span className="pb-stat-text">
                        <strong>
                            {inactivas}
                        </strong>

                        <span>
                            Inactivas
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    className="pb-stat pb-stat-free"
                    onClick={abrirNuevo}
                >
                    <span className="pb-stat-icon">
                        <HeartPulse size={22}/>
                    </span>

                    <span className="pb-stat-text">
                        <strong>
                            {partesActivas.length}
                        </strong>

                        <span>
                            Partes disponibles
                        </span>
                    </span>
                </button>

            </section>

            <section className="pb-card">

                <div className="pb-toolbar">

                    <label className="pb-search">

                        <Search size={18}/>

                        <input
                            type="search"
                            value={busqueda}
                            onChange={evento=>
                                setBusqueda(
                                    evento.target.value
                                )
                            }
                            placeholder="Buscar parte, beneficio, fuente u observación..."
                        />

                        {busqueda&&(
                            <button
                                type="button"
                                className="pb-clear"
                                onClick={()=>
                                    setBusqueda("")
                                }
                            >
                                <X size={14}/>
                            </button>
                        )}

                    </label>

                    <div className="pb-seg">

                        {[
                            ["TODAS","Todas"],
                            ["ACTIVAS","Activas"],
                            ["INACTIVAS","Inactivas"]
                        ].map(
                            ([valor,texto])=>(
                                <button
                                    type="button"
                                    key={valor}
                                    className={
                                        estado===valor
                                            ?"on"
                                            :""
                                    }
                                    onClick={()=>
                                        setEstado(valor)
                                    }
                                >
                                    {texto}
                                </button>
                            )
                        )}

                    </div>

                    <button
                        type="button"
                        className="pb-iconbtn pb-refresh"
                        title="Actualizar"
                        disabled={
                            cargando||
                            accionando
                        }
                        onClick={cargarDatos}
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

                <div className="pb-table-wrap">

                    <table className="pb-table">

                        <thead>
                            <tr>
                                <th>
                                    Parte comestible
                                </th>

                                <th>
                                    Beneficio
                                </th>

                                <th>
                                    Fuente
                                </th>

                                <th className="pb-col-observation">
                                    Observación
                                </th>

                                <th>
                                    Estado
                                </th>

                                <th className="pb-col-actions">
                                    Acciones
                                </th>
                            </tr>
                        </thead>

                        <tbody>

                            {cargando?(
                                <tr>
                                    <td colSpan="6">

                                        <div className="pb-state">

                                            <span className="pb-spinner"/>

                                            <strong>
                                                Cargando asociaciones...
                                            </strong>

                                        </div>

                                    </td>
                                </tr>
                            ):visibles.length===0?(
                                <tr>
                                    <td colSpan="6">

                                        <div className="pb-state pb-empty">

                                            <HeartPulse size={35}/>

                                            <strong>
                                                No hay beneficios para mostrar
                                            </strong>

                                            <span>
                                                {registros.length===0
                                                    ?"Esta especie todavía no tiene beneficios asociados a sus partes comestibles."
                                                    :"No hay resultados para los filtros seleccionados."
                                                }
                                            </span>

                                            {registros.length===0&&(
                                                <button
                                                    type="button"
                                                    className="pb-btn pb-btn-primary"
                                                    onClick={abrirNuevo}
                                                >
                                                    <Plus size={16}/>
                                                    Asociar primer beneficio
                                                </button>
                                            )}

                                        </div>

                                    </td>
                                </tr>
                            ):(
                                visibles.map(
                                    registro=>(
                                        <tr
                                            key={
                                                claveRegistro(
                                                    registro
                                                )
                                            }
                                            className={
                                                registro.activa
                                                    ?""
                                                    :"is-off"
                                            }
                                        >

                                            <td>

                                                <div className="pb-name">

                                                    <span className="pb-avatar">
                                                        <Sprout size={20}/>
                                                    </span>

                                                    <span>
                                                        <strong>
                                                            {nombreParte(
                                                                registro.idEspecieParte
                                                            )}
                                                        </strong>
                                                    </span>

                                                </div>

                                            </td>

                                            <td>

                                                <div className="pb-name">

                                                    <span>
                                                        <strong>
                                                            {nombreBeneficio(
                                                                registro.idBeneficio
                                                            )}
                                                        </strong>
                                                    </span>

                                                </div>

                                            </td>

                                            <td>

                                                <div className="pb-source">

                                                    <BookOpen size={15}/>

                                                    <span>
                                                        {nombreFuente(
                                                            registro.idFuente
                                                        )}
                                                    </span>

                                                </div>

                                            </td>

                                            <td className="pb-col-observation">

                                                <span className="pb-observation">
                                                    {registro.observacion}
                                                </span>

                                            </td>

                                            <td>

                                                <span
                                                    className={`pb-status ${
                                                        registro.activa
                                                            ?"active"
                                                            :"inactive"
                                                    }`}
                                                >
                                                    <i/>

                                                    {registro.activa
                                                        ?"Activa"
                                                        :"Inactiva"
                                                    }
                                                </span>

                                            </td>

                                            <td className="pb-col-actions">

                                                <div className="pb-actions">

                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        disabled={
                                                            accionando
                                                        }
                                                        onClick={()=>
                                                            abrirEditar(
                                                                registro
                                                            )
                                                        }
                                                    >
                                                        <Pencil size={16}/>
                                                    </button>

                                                    {registro.activa?(
                                                        <button
                                                            type="button"
                                                            className="off"
                                                            title="Desactivar"
                                                            disabled={
                                                                accionando
                                                            }
                                                            onClick={()=>
                                                                desactivar(
                                                                    registro
                                                                )
                                                            }
                                                        >
                                                            <PowerOff size={16}/>
                                                        </button>
                                                    ):(
                                                        <button
                                                            type="button"
                                                            className="on"
                                                            title="Reactivar"
                                                            disabled={
                                                                accionando
                                                            }
                                                            onClick={()=>
                                                                reactivar(
                                                                    registro
                                                                )
                                                            }
                                                        >
                                                            <RotateCcw size={16}/>
                                                        </button>
                                                    )}

                                                </div>

                                            </td>

                                        </tr>
                                    )
                                )
                            )}

                        </tbody>

                    </table>

                </div>

                <div className="pb-pagination">

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

                        <span className="pb-page-current">
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
                    className="pb-overlay"
                    onMouseDown={cerrarModal}
                >

                    <section
                        className="pb-panel"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={evento=>
                            evento.stopPropagation()
                        }
                    >

                        <div className="pb-modal-head">

                            <span className="pb-modal-head-icon">
                                <HeartPulse size={22}/>
                            </span>

                            <div className="pb-modal-head-text">

                                <span>
                                    {editando
                                        ?"Editar asociación"
                                        :"Nueva asociación"
                                    }
                                </span>

                                <h2>
                                    {editando
                                        ?"Editar beneficio"
                                        :"Nuevo beneficio por parte"
                                    }
                                </h2>

                            </div>

                            <button
                                type="button"
                                className="pb-iconbtn"
                                disabled={guardando}
                                onClick={cerrarModal}
                            >
                                <X size={19}/>
                            </button>

                        </div>

                        <form onSubmit={guardar}>

                            <div className="pb-modal-body">

                                <div className="pb-preview">

                                    <small>
                                        Especie seleccionada
                                    </small>

                                    <div>

                                        <span className="pb-preview-avatar">
                                            <Leaf size={19}/>
                                        </span>

                                        <span className="pb-preview-text">

                                            <strong>
                                                {especie?.nombreComun||
                                                    "Sin nombre común"
                                                }
                                            </strong>

                                            <em>
                                                {especie?.nombreCientifico||
                                                    "Especie"
                                                }
                                            </em>

                                        </span>

                                    </div>

                                </div>

                                {editando?(
                                    <div className="pb-preview-grid">

                                        <div className="pb-preview">

                                            <small>
                                                Parte comestible
                                            </small>

                                            <div>

                                                <span className="pb-preview-avatar">
                                                    <Sprout size={19}/>
                                                </span>

                                                <span className="pb-preview-text">

                                                    <strong>
                                                        {nombreParte(
                                                            editando.idEspecieParte
                                                        )}
                                                    </strong>

                                                    <em>
                                                        No puede modificarse.
                                                    </em>

                                                </span>

                                            </div>

                                        </div>

                                        <div className="pb-preview">

                                            <small>
                                                Beneficio
                                            </small>

                                            <div>

                                                <span className="pb-preview-avatar benefit">
                                                    <HeartPulse size={19}/>
                                                </span>

                                                <span className="pb-preview-text">

                                                    <strong>
                                                        {nombreBeneficio(
                                                            editando.idBeneficio
                                                        )}
                                                    </strong>

                                                    <em>
                                                        No puede modificarse.
                                                    </em>

                                                </span>

                                            </div>

                                        </div>

                                    </div>
                                ):(
                                    <>

                                        <div className="pb-field">

                                            <label htmlFor="pb-parte">
                                                Parte comestible
                                                <span> *</span>
                                            </label>

                                            <div className="pb-select-action-row">

                                                <ComboBuscable
                                                    id="pb-parte"
                                                    ariaLabel="Parte comestible"
                                                    value={
                                                        formulario.idEspecieParte
                                                    }
                                                    onChange={evento=>
                                                        cambiarCampo(
                                                            "idEspecieParte",
                                                            evento.target.value
                                                        )
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
                                                    className="pb-register-btn"
                                                    onClick={registrarParteComestible}
                                                >
                                                    <Plus size={15}/>
                                                    <span>
                                                        Registrar parte
                                                    </span>
                                                </button>

                                            </div>

                                        </div>

                                        <div className="pb-field">

                                            <label htmlFor="pb-beneficio">
                                                Beneficio
                                                <span> *</span>
                                            </label>

                                            <div className="pb-select-action-row">

                                                <ComboBuscable
                                                    id="pb-beneficio"
                                                    ariaLabel="Beneficio"
                                                    value={
                                                        formulario.idBeneficio
                                                    }
                                                    disabled={
                                                        !formulario.idEspecieParte
                                                    }
                                                    onChange={evento=>
                                                        cambiarCampo(
                                                            "idBeneficio",
                                                            evento.target.value
                                                        )
                                                    }
                                                    placeholder={
                                                        formulario.idEspecieParte
                                                            ?"Selecciona un beneficio..."
                                                            :"Selecciona primero una parte..."
                                                    }
                                                    searchPlaceholder="Buscar beneficio..."
                                                    options={beneficiosDisponibles.map(
                                                        beneficio => ({
                                                            value: idDeBeneficio(beneficio),
                                                            label: beneficio.nombre
                                                        })
                                                    )}
                                                />

                                                <button
                                                    type="button"
                                                    className="pb-register-btn"
                                                    onClick={registrarBeneficio}
                                                >
                                                    <Plus size={15}/>
                                                    <span>
                                                        Registrar beneficio
                                                    </span>
                                                </button>

                                            </div>

                                        </div>

                                    </>
                                )}

                                <div className="pb-field">

                                    <label htmlFor="pb-fuente">
                                        Fuente
                                        <span> *</span>
                                    </label>

                                    <div className="pb-select-action-row">

                                        <ComboBuscable
                                            id="pb-fuente"
                                            ariaLabel="Fuente bibliográfica"
                                            value={
                                                formulario.idFuente
                                            }
                                            onChange={evento=>
                                                cambiarCampo(
                                                    "idFuente",
                                                    evento.target.value
                                                )
                                            }
                                            placeholder="Selecciona una fuente..."
                                            searchPlaceholder="Buscar fuente..."
                                            options={fuentesFormulario.map(
                                                fuente => ({
                                                    value: idDeFuente(fuente),
                                                    label: `${fuente.titulo || fuente.tituloFuente || fuente.nombre || fuente.nombreFuente || "Fuente sin título"}${fuente.activa === false ? " (inactiva)" : ""}`
                                                })
                                            )}
                                        />

                                        <button
                                            type="button"
                                            className="pb-register-btn"
                                            onClick={registrarFuente}
                                        >
                                            <Plus size={15}/>
                                            <span>
                                                Registrar fuente
                                            </span>
                                        </button>

                                    </div>

                                </div>

                                <div className="pb-field">

                                    <label htmlFor="pb-observacion">
                                        Observación
                                        <span> *</span>
                                    </label>

                                    <textarea
                                        id="pb-observacion"
                                        rows={5}
                                        maxLength={1000}
                                        value={
                                            formulario.observacion
                                        }
                                        onChange={evento=>
                                            cambiarCampo(
                                                "observacion",
                                                evento.target.value
                                            )
                                        }
                                        placeholder="Describe el beneficio de esta parte comestible..."
                                    />

                                    <div className="pb-field-foot">

                                        <span/>

                                        <small>
                                            {formulario.observacion.length}/1000
                                        </small>

                                    </div>

                                </div>

                                {editando&&(
                                    <label className="pb-switch-row">

                                        <span>

                                            <strong>
                                                Asociación activa
                                            </strong>

                                            <small>
                                                Permite reactivar o mantener inactivo este registro.
                                            </small>

                                        </span>

                                        <input
                                            type="checkbox"
                                            checked={
                                                formulario.activa
                                            }
                                            onChange={evento=>
                                                cambiarCampo(
                                                    "activa",
                                                    evento.target.checked
                                                )
                                            }
                                        />

                                    </label>
                                )}

                                <div className="pb-backend-info">

                                    <Info size={18}/>

                                    <div>

                                        <strong>
                                            Relación por parte comestible
                                        </strong>

                                        <span>
                                            La especie ya está seleccionada. Elige una de sus partes comestibles y luego el beneficio que deseas documentar.
                                        </span>

                                    </div>

                                </div>

                                {errorFormulario&&(
                                    <div className="pb-form-error">
                                        {errorFormulario}
                                    </div>
                                )}

                            </div>

                            <div className="pb-modal-foot">

                                <button
                                    type="button"
                                    className="pb-btn pb-btn-ghost"
                                    disabled={guardando}
                                    onClick={cerrarModal}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="pb-btn pb-btn-primary"
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
                                            :"Asociar beneficio"
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

export default ParteBeneficios;