import {useEffect,useMemo,useRef,useState} from "react";
import {useBlocker,useNavigate} from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    FlaskConical,
    Leaf,
    Plus,
    Trash2,
    UserRound,
    BookOpen,
    Tags,
    TriangleAlert
} from "lucide-react";
import Swal from "sweetalert2";
import {crearEspecie} from "../../api/especieService";
import {USUARIO_ID} from "../../config";
import "../../styles/nuevaEspecie.css";
import "../../styles/alertas.css";

const inicial={
    nombreCientifico:"",
    descripcion:"",
    origen:"",
    propiedades:"",
    importanciaCultural:"",
    advertencias:"",
    taxonomia:{
        reino:"Plantae",
        division:"",
        clase:"",
        ordenTaxonomico:"",
        familia:"",
        genero:"",
        especieTaxonomica:"",
        subespecie:""
    },
    nombresComunes:[]
};

const MAX_DESCRIPCION=2000;
const MAX_TEXTO_EXTENDIDO=2000;
const MAX_ORIGEN=250;
const MAX_NOMBRE_COMUN=150;
const MAX_REGION=150;

const PATRON_GENERO=/^\p{Lu}[\p{Ll}\p{M}-]*$/u;
const PATRON_EPITETO=/^\p{Ll}[\p{Ll}\p{M}-]*$/u;
const PATRON_BINOMIO=/^(\p{Lu}[\p{Ll}\p{M}-]*)\s+(\p{Ll}[\p{Ll}\p{M}-]*)$/u;
const PATRON_TAXON=/^[\p{L}\p{M}]+(?:[-\s][\p{L}\p{M}]+)*$/u;

function normalizarTexto(valor){
    return String(valor||"")
        .normalize("NFD")
        .replace(/n\u0303/gi,"\u00f1")
        .replace(/[\u0300-\u036f]/g,"")
        .toLocaleLowerCase("es")
        .trim()
        .replace(/\s+/g," ");
}

function normalizarCampoTexto(valor){
    return String(valor||"").trim().replace(/\s+/g," ");
}

function obtenerMensaje(error){
    const data=error?.response?.data;

    if(typeof data==="string"){
        return data;
    }

    return data?.mensaje||
        data?.message||
        data?.error||
        "Ocurrió un error al comunicarse con el servidor.";
}

function normalizarErroresBackend(error){
    const data=error?.response?.data;

    const origen=
        data?.erroresValidacion||
        data?.errors;

    if(!origen||typeof origen!=="object"){
        return {};
    }

    const resultado={};

    Object.entries(origen).forEach(
        ([campo,mensaje])=>{
            resultado[campo]=Array.isArray(mensaje)
                ?mensaje[0]
                :mensaje;
        }
    );

    return resultado;
}

function alertaError(titulo,mensaje){
    return Swal.fire({
        icon:"error",
        title:titulo,
        text:mensaje,
        confirmButtonText:"Entendido",
        buttonsStyling:false,
        customClass:{
            popup:"flora-alert",
            confirmButton:"flora-alert-confirm"
        }
    });
}

function alertaValidacion(){
    return Swal.fire({
        icon:"warning",
        title:"Revisa los datos",
        text:"Hay campos con información inválida o incompleta.",
        confirmButtonText:"Entendido",
        buttonsStyling:false,
        customClass:{
            popup:"flora-alert",
            confirmButton:"flora-alert-confirm"
        }
    });
}

function normalizarNombreCientifico(nombre){
    return String(nombre||"")
        .trim()
        .replace(/\s+/g," ");
}

function validarNombreCientifico(nombre){
    const limpio=
        normalizarNombreCientifico(nombre);

    if(!limpio){
        return "";
    }

    if(!PATRON_BINOMIO.test(limpio)){
        return "Usa el formato binomial «Género especie»: género con inicial mayúscula y epíteto específico en minúscula, por ejemplo: Mangifera indica";
    }

    return "";
}

function NuevaEspecie(){
    const navigate=useNavigate();

    const[paso,setPaso]=useState(1);
    const[form,setForm]=useState(inicial);
    const[errores,setErrores]=useState({});
    const[guardando,setGuardando]=useState(false);
    const[bloqueoSiguiente,setBloqueoSiguiente]=useState(false);
    const bloqueoSiguienteRef=useRef(false);
    const guardadoRef=useRef(false);
    const registroRef=useRef(false);

    const hayCambios=useMemo(
        ()=>JSON.stringify(form)!==JSON.stringify(inicial),
        [form]
    );

    const blocker=useBlocker(
        ({currentLocation,nextLocation})=>
            hayCambios&&
            !guardadoRef.current&&
            currentLocation.pathname!==nextLocation.pathname
    );
    const{
        state:blockerState,
        proceed:blockerProceed,
        reset:blockerReset
    }=blocker;

    useEffect(()=>{
        if(blockerState!=="blocked"){
            return undefined;
        }

        let vigente=true;

        Swal.fire({
            icon:"warning",
            title:"¿Salir sin guardar?",
            text:"La información ingresada se perderá si abandonas este formulario.",
            showCancelButton:true,
            confirmButtonText:"Salir",
            cancelButtonText:"Seguir editando",
            reverseButtons:true,
            buttonsStyling:false,
            customClass:{
                popup:"flora-alert",
                confirmButton:"flora-alert-confirm flora-alert-danger",
                cancelButton:"flora-alert-cancel"
            }
        }).then(resultado=>{
            if(!vigente){
                return;
            }

            if(resultado.isConfirmed){
                blockerProceed();
            }else{
                blockerReset();
            }
        });

        return ()=>{
            vigente=false;
        };
    },[
        blockerState,
        blockerProceed,
        blockerReset
    ]);

    useEffect(()=>{
        if(!hayCambios){
            return undefined;
        }

        const advertirSalida=evento=>{
            evento.preventDefault();
            evento.returnValue="";
        };

        window.addEventListener(
            "beforeunload",
            advertirSalida
        );

        return ()=>{
            window.removeEventListener(
                "beforeunload",
                advertirSalida
            );
        };
    },[hayCambios]);

    const errorCampo=campo=>{
        return errores[campo]||"";
    };

    function limpiarError(campo){
        setErrores(prev=>{
            const copia={...prev};
            delete copia[campo];
            return copia;
        });
    }

    function cambiarCampo(campo,valor){
        setForm(prev=>({
            ...prev,
            [campo]:valor
        }));

        limpiarError(campo);
    }

    function revisarNombreCientifico(){
        const limpio=
            normalizarNombreCientifico(
                form.nombreCientifico
            );

        setForm(prev=>({
            ...prev,
            nombreCientifico:limpio
        }));

        let mensaje="";

        if(!limpio){
            mensaje=
                "El nombre científico es obligatorio";
        }else if(limpio.length>250){
            mensaje=
                "El nombre científico no puede exceder 250 caracteres";
        }else{
            mensaje=
                validarNombreCientifico(limpio);
        }

        setErrores(prev=>{
            const copia={...prev};

            if(mensaje){
                copia.nombreCientifico=
                    mensaje;
            }else{
                delete copia.nombreCientifico;
            }

            return copia;
        });
    }

    function cambiarTaxonomia(campo,valor){
        setForm(prev=>({
            ...prev,
            taxonomia:{
                ...prev.taxonomia,
                [campo]:valor
            }
        }));

        limpiarError(
            `taxonomia.${campo}`
        );

        limpiarError(campo);
    }

    function agregarNombreComun(){
        setForm(prev=>({
            ...prev,
            nombresComunes:[
                ...prev.nombresComunes,
                {
                    nombre:"",
                    region:"",
                    esPrincipal:
                        prev.nombresComunes.length===0
                }
            ]
        }));
    }

    function cambiarNombreComun(
        index,
        campo,
        valor
    ){
        setForm(prev=>({
            ...prev,
            nombresComunes:
                prev.nombresComunes
                    .map((item,i)=>{
                        if(i!==index){
                            return item;
                        }

                        if(
                            campo==="esPrincipal"&&
                            valor===true
                        ){
                            return{
                                ...item,
                                esPrincipal:true
                            };
                        }

                        return{
                            ...item,
                            [campo]:valor
                        };
                    })
                    .map((item,i)=>{
                        if(
                            campo==="esPrincipal"&&
                            valor===true&&
                            i!==index
                        ){
                            return{
                                ...item,
                                esPrincipal:false
                            };
                        }

                        return item;
                    })
        }));

        limpiarError(
            `nombresComunes[${index}].${campo}`
        );

        limpiarError(
            `nombresComunes.${index}.${campo}`
        );

        limpiarError(
            "nombresComunes"
        );
    }

    function eliminarNombreComun(index){
        setForm(prev=>{
            const nuevos=
                prev.nombresComunes.filter(
                    (_,i)=>i!==index
                );

            if(
                nuevos.length>0&&
                !nuevos.some(
                    n=>n.esPrincipal
                )
            ){
                nuevos[0]={
                    ...nuevos[0],
                    esPrincipal:true
                };
            }

            return{
                ...prev,
                nombresComunes:nuevos
            };
        });

        limpiarError(
            "nombresComunes"
        );
    }

    function validarPaso1(){
        const nuevos={};

        const nombre=
            normalizarNombreCientifico(
                form.nombreCientifico
            );

        const descripcion=
            form.descripcion.trim();

        const origen=
            form.origen.trim();

        if(!nombre){
            nuevos.nombreCientifico=
                "El nombre científico es obligatorio";
        }else if(nombre.length>250){
            nuevos.nombreCientifico=
                "El nombre científico no puede exceder 250 caracteres";
        }else{
            const errorNombre=
                validarNombreCientifico(
                    nombre
                );

            if(errorNombre){
                nuevos.nombreCientifico=
                    errorNombre;
            }
        }

        if(!descripcion){
            nuevos.descripcion=
                "La descripción es obligatoria";
        }

        if(descripcion.length>MAX_DESCRIPCION){
            nuevos.descripcion=
                `La descripción no puede exceder ${MAX_DESCRIPCION} caracteres`;
        }

        if(origen.length>MAX_ORIGEN){
            nuevos.origen=
                `El origen no puede exceder ${MAX_ORIGEN} caracteres`;
        }

        [
            ["propiedades","Las propiedades"],
            ["importanciaCultural","La importancia cultural"],
            ["advertencias","Las advertencias"]
        ].forEach(([campo,etiqueta])=>{
            if(form[campo].length>MAX_TEXTO_EXTENDIDO){
                nuevos[campo]=
                    `${etiqueta} no pueden exceder ${MAX_TEXTO_EXTENDIDO} caracteres`;
            }
        });

        setForm(prev=>({
            ...prev,
            nombreCientifico:nombre
        }));

        setErrores(prev=>({
            ...prev,
            ...nuevos
        }));

        return Object.keys(
            nuevos
        ).length===0;
    }

    function validarPaso2(){
        const nuevos={};
        const t=form.taxonomia;

        if(
            t.reino.trim()&&
            t.reino
                .trim()
                .toLowerCase()!=="plantae"
        ){
            nuevos["taxonomia.reino"]=
                "El reino debe ser 'Plantae'; este catálogo es exclusivamente de flora";
        }

        const max100=[
            ["division","La división"],
            ["clase","La clase"],
            [
                "ordenTaxonomico",
                "El orden taxonómico"
            ],
            ["familia","La familia"]
        ];

        max100.forEach(
            ([campo,nombre])=>{
                const valor=normalizarCampoTexto(
                    t[campo]
                );

                if(
                    valor.length>100
                ){
                    nuevos[
                        `taxonomia.${campo}`
                    ]=
                        `${nombre} no puede exceder 100 caracteres`;
                }else if(
                    valor&&
                    !PATRON_TAXON.test(valor)
                ){
                    nuevos[
                        `taxonomia.${campo}`
                    ]=
                        `${nombre} solo puede contener palabras taxonómicas, sin símbolos ni código`;
                }
            }
        );

        if(!t.genero.trim()){
            nuevos["taxonomia.genero"]=
                "El género es obligatorio";
        }else if(
            normalizarCampoTexto(t.genero).length>100
        ){
            nuevos["taxonomia.genero"]=
                "El género no puede exceder 100 caracteres";
        }else if(
            !PATRON_GENERO.test(
                normalizarCampoTexto(t.genero)
            )
        ){
            nuevos["taxonomia.genero"]=
                "El género debe ser un nombre taxonómico de una sola palabra con inicial mayúscula";
        }

        if(
            !t.especieTaxonomica.trim()
        ){
            nuevos[
                "taxonomia.especieTaxonomica"
            ]=
                "La especie taxonómica es obligatoria";
        }else if(
            normalizarCampoTexto(t.especieTaxonomica).length>150
        ){
            nuevos[
                "taxonomia.especieTaxonomica"
            ]=
                "La especie taxonómica no puede exceder 150 caracteres";
        }else if(
            !PATRON_EPITETO.test(
                normalizarCampoTexto(t.especieTaxonomica)
            )
        ){
            nuevos[
                "taxonomia.especieTaxonomica"
            ]=
                "El epíteto específico debe ser una sola palabra en minúscula";
        }

        if(
            t.subespecie
                .trim()
                .length>150
        ){
            nuevos[
                "taxonomia.subespecie"
            ]=
                "La subespecie no puede exceder 150 caracteres";
        }else if(
            t.subespecie.trim()&&
            !PATRON_EPITETO.test(
                normalizarCampoTexto(t.subespecie)
            )
        ){
            nuevos["taxonomia.subespecie"]=
                "La subespecie debe ser un epíteto taxonómico en minúscula";
        }

        const binomio=PATRON_BINOMIO.exec(
            normalizarNombreCientifico(
                form.nombreCientifico
            )
        );
        const genero=normalizarCampoTexto(t.genero);
        const epiteto=normalizarCampoTexto(
            t.especieTaxonomica
        );

        if(
            binomio&&
            genero&&
            epiteto&&
            (
                binomio[1]!==genero||
                binomio[2]!==epiteto
            )
        ){
            nuevos["taxonomia.especieTaxonomica"]=
                "El género y el epíteto deben coincidir con el nombre científico (Género especie)";
        }

        if(
            t.reino.trim()&&
            t.reino.trim().toLocaleLowerCase("es")==="plantae"
        ){
            cambiarTaxonomia("reino","Plantae");
        }

        setErrores(prev=>{
            const copia={...prev};

            Object.keys(copia)
                .filter(campo=>campo.startsWith("taxonomia."))
                .forEach(campo=>delete copia[campo]);

            return{
                ...copia,
                ...nuevos
            };
        });

        return Object.keys(
            nuevos
        ).length===0;
    }

    function validarPaso3(){
        const nuevos={};

        let principales=0;
        const nombresVistos=new Set();

        form.nombresComunes.forEach(
            (item,index)=>{
                const nombre=
                    item.nombre.trim();

                const region=
                    item.region.trim();

                if(!nombre){
                    nuevos[
                        `nombresComunes[${index}].nombre`
                    ]=
                        "El nombre es obligatorio";
                }else if(
                    nombre.length>MAX_NOMBRE_COMUN
                ){
                    nuevos[
                        `nombresComunes[${index}].nombre`
                    ]=
                        `El nombre no puede exceder ${MAX_NOMBRE_COMUN} caracteres`;
                }else{
                    const nombreNormalizado=
                        normalizarTexto(nombre);

                    if(nombresVistos.has(nombreNormalizado)){
                        nuevos[
                            `nombresComunes[${index}].nombre`
                        ]=
                            `El nombre común "${nombre}" está repetido en esta lista`;
                    }else{
                        nombresVistos.add(nombreNormalizado);
                    }
                }

                if(region.length>MAX_REGION){
                    nuevos[
                        `nombresComunes[${index}].region`
                    ]=
                        `La región no puede exceder ${MAX_REGION} caracteres`;
                }

                if(
                    item.esPrincipal===null||
                    item.esPrincipal===undefined
                ){
                    nuevos[
                        `nombresComunes[${index}].esPrincipal`
                    ]=
                        "Debe indicarse si el nombre es el principal de la especie";
                }

                if(
                    item.esPrincipal===true
                ){
                    principales++;
                }
            }
        );

        if(
            form.nombresComunes.length>0&&
            principales!==1
        ){
            nuevos.nombresComunes=
                "Si registra nombres comunes, exactamente uno debe ser el principal";
        }

        setErrores(prev=>{
            const copia={...prev};

            Object.keys(copia)
                .filter(campo=>
                    campo.startsWith("nombresComunes")
                )
                .forEach(campo=>delete copia[campo]);

            return{
                ...copia,
                ...nuevos
            };
        });

        return Object.keys(
            nuevos
        ).length===0;
    }

    async function siguiente(){
        if(bloqueoSiguienteRef.current||guardando){
            return;
        }

        bloqueoSiguienteRef.current=true;
        setBloqueoSiguiente(true);

        window.setTimeout(()=>{
            bloqueoSiguienteRef.current=false;
            setBloqueoSiguiente(false);
        },500);

        if(
            paso===1&&
            !validarPaso1()
        ){
            alertaValidacion();
            return;
        }

        if(
            paso===2&&
            !validarPaso2()
        ){
            alertaValidacion();
            return;
        }

        if(paso===1){
            const binomio=PATRON_BINOMIO.exec(
                normalizarNombreCientifico(
                    form.nombreCientifico
                )
            );
            const genero=normalizarCampoTexto(
                form.taxonomia.genero
            );
            const epiteto=normalizarCampoTexto(
                form.taxonomia.especieTaxonomica
            );

            if(
                binomio&&
                genero&&
                epiteto&&
                (
                    binomio[1]!==genero||
                    binomio[2]!==epiteto
                )
            ){
                setErrores(prev=>({
                    ...prev,
                    "taxonomia.especieTaxonomica":
                        "El género y el epíteto deben coincidir con el nombre científico (Género especie)"
                }));
                await alertaValidacion();
                return;
            }
        }

        setPaso(
            p=>Math.min(
                3,
                p+1
            )
        );
    }

    function anterior(){
        setPaso(
            p=>Math.max(
                1,
                p-1
            )
        );
    }

    const nombrePrincipal=
        useMemo(
            ()=>{
                return form.nombresComunes.find(
                    n=>n.esPrincipal
                )?.nombre.trim()||
                    "Sin nombre común";
            },
            [
                form.nombresComunes
            ]
        );

    async function registrar(){
        if(registroRef.current||guardando){
            return;
        }

        const ok1=
            validarPaso1();

        const ok2=
            validarPaso2();

        const ok3=
            validarPaso3();

        if(
            !ok1||
            !ok2||
            !ok3
        ){
            await alertaValidacion();

            if(!ok1){
                setPaso(1);
            }else if(!ok2){
                setPaso(2);
            }else{
                setPaso(3);
            }

            return;
        }

        const payload={
            nombreCientifico:
                normalizarNombreCientifico(
                    form.nombreCientifico
                ),

            descripcion:
                form.descripcion.trim(),

            origen:
                form.origen.trim()||
                null,

            propiedades:
                form.propiedades.trim()||
                null,

            importanciaCultural:
                form.importanciaCultural.trim()||
                null,

            advertencias:
                form.advertencias.trim()||
                null,

            creadaPor:
                USUARIO_ID,

            taxonomia:{
                reino:"Plantae",

                division:
                    normalizarCampoTexto(form.taxonomia.division)||
                    null,

                clase:
                    normalizarCampoTexto(form.taxonomia.clase)||
                    null,

                ordenTaxonomico:
                    normalizarCampoTexto(
                        form.taxonomia.ordenTaxonomico
                    )||
                    null,

                familia:
                    normalizarCampoTexto(form.taxonomia.familia)||
                    null,

                genero:
                    normalizarCampoTexto(form.taxonomia.genero),

                especieTaxonomica:
                    normalizarCampoTexto(
                        form.taxonomia.especieTaxonomica
                    ),

                subespecie:
                    normalizarCampoTexto(form.taxonomia.subespecie)||
                    null
            },

            nombresComunes:
                form.nombresComunes.length===0
                    ?[]
                    :form.nombresComunes.map(
                        n=>({
                            nombre:
                                n.nombre.trim(),

                            region:
                                n.region.trim()||
                                null,

                            esPrincipal:
                                n.esPrincipal
                        })
                    )
        };

        try{
            registroRef.current=true;
            setGuardando(true);

            await crearEspecie(
                payload
            );

            await Swal.fire({
                icon:"success",
                title:"Especie registrada",
                text:"La especie fue creada correctamente.",
                timer:2000,
                timerProgressBar:true,
                showConfirmButton:false,
                customClass:{
                    popup:"flora-alert"
                }
            });

            guardadoRef.current=true;

            navigate(
                "/gestion-especies",
                {
                    state:{
                        especieRegistrada:true
                    }
                }
            );
        }catch(error){
            const validaciones=
                normalizarErroresBackend(
                    error
                );
            const mensajeServidor=obtenerMensaje(error);
            const detalleBackend=JSON.stringify(
                error?.response?.data||{}
            );
            const textoError=
                `${mensajeServidor} ${detalleBackend}`;
            const conflictoDuplicado=
                error?.response?.status===409||
                /duplic|ya existe|unique|constraint/i.test(
                    textoError
                );
            const errorEnNombreComun=
                /nombre.{0,30}com[uú]n.{0,30}(duplic|existe)|(?:duplic|existe).{0,30}nombre.{0,15}com[uú]n|nombresComunes/i.test(
                    textoError
                )||
                (
                    conflictoDuplicado&&
                    Object.keys(validaciones).some(campo=>
                        campo.startsWith("nombresComunes")
                    )
                );

            if(
                conflictoDuplicado&&
                errorEnNombreComun
            ){
                const nombreDuplicado=
                    payload.nombresComunes.find(nombre=>
                        normalizarTexto(textoError).includes(
                            normalizarTexto(nombre.nombre)
                        )
                    )?.nombre;
                const nombresRegistrados=
                    payload.nombresComunes
                        .map(nombre=>normalizarCampoTexto(nombre.nombre))
                        .filter(Boolean);
                const referencia=nombreDuplicado
                    ?`"${normalizarCampoTexto(nombreDuplicado)}"`
                    :nombresRegistrados.length===1
                        ?`"${nombresRegistrados[0]}"`
                        :"uno de los nombres comunes ingresados";
                const mensaje=
                    `El nombre común ${referencia} ya está registrado para otra especie. Revisa la lista antes de continuar.`;

                setErrores(prev=>({
                    ...prev,
                    nombresComunes:mensaje
                }));
                setPaso(3);
                await alertaError(
                    "Nombre común duplicado",
                    mensaje
                );
                return;
            }

            if(conflictoDuplicado){
                await alertaError(
                    "Registro duplicado",
                    `El servidor rechazó la especie por un dato duplicado. Revisa el nombre científico "${payload.nombreCientifico}" y los nombres comunes antes de continuar.`
                );
                return;
            }

            if(
                Object.keys(
                    validaciones
                ).length>0
            ){
                setErrores(prev=>({
                    ...prev,
                    ...validaciones
                }));

                const campos=
                    Object.keys(
                        validaciones
                    );

                if(
                    campos.some(
                        c=>
                            c.startsWith(
                                "nombreCientifico"
                            )||
                            c.startsWith(
                                "descripcion"
                            )||
                            c.startsWith(
                                "origen"
                            )||
                            c.startsWith(
                                "propiedades"
                            )||
                            c.startsWith(
                                "importanciaCultural"
                            )||
                            c.startsWith(
                                "advertencias"
                            )
                    )
                ){
                    setPaso(1);
                }else if(
                    campos.some(
                        c=>
                            c.startsWith(
                                "taxonomia"
                            )
                    )
                ){
                    setPaso(2);
                }else if(
                    campos.some(
                        c=>
                            c.startsWith(
                                "nombresComunes"
                            )
                    )
                ){
                    setPaso(3);
                }

                await alertaValidacion();
                return;
            }

            await alertaError(
                "No se pudo registrar la especie",
                obtenerMensaje(error)
            );
        }finally{
            registroRef.current=false;
            setGuardando(false);
        }
    }

    return(
        <div className="ne-page">

            <div className="ne-heading">

                <div>

                    <span className="ne-crumb">
                        Especies / Nueva especie
                    </span>

                    <h1>
                        Nueva especie
                    </h1>

                    <p>
                        Registra la información científica
                        y descriptiva de la planta.
                    </p>

                </div>

                <button
                    type="button"
                    className="ne-back"
                    disabled={guardando}
                    onClick={()=>
                        navigate(
                            "/catalogo"
                        )
                    }
                >
                    <ArrowLeft size={17}/>
                    Volver
                </button>

            </div>

            <div className="ne-shell">

                <div className="ne-steps">

                    {[
                        [
                            1,
                            "Datos generales",
                            "Información principal"
                        ],
                        [
                            2,
                            "Taxonomía",
                            "Clasificación científica"
                        ],
                        [
                            3,
                            "Nombres comunes",
                            "Nombres vernaculares"
                        ]
                    ].map(
                        ([
                            numero,
                            titulo,
                            subtitulo
                        ])=>(
                            <button
                                type="button"
                                key={numero}
                                className={`ne-step ${
                                    paso===numero
                                        ?"active"
                                        :""
                                } ${
                                    paso>numero
                                        ?"done"
                                        :""
                                }`}
                                disabled={guardando}
                                onClick={()=>{
                                    if(
                                        numero<paso
                                    ){
                                        setPaso(
                                            numero
                                        );
                                    }
                                }}
                            >

                                <span className="ne-step-number">
                                    {paso>numero
                                        ?(
                                            <Check size={16}/>
                                        )
                                        :numero
                                    }
                                </span>

                                <span>

                                    <strong>
                                        {titulo}
                                    </strong>

                                    <small>
                                        {subtitulo}
                                    </small>

                                </span>

                            </button>
                        )
                    )}

                </div>

                <div className="ne-content">

                    <section
                        className="ne-form-card"
                        aria-busy={guardando}
                    >

                        <fieldset
                            className="ne-fields"
                            disabled={guardando}
                        >

                        {paso===1&&(
                            <>

                                <div className="ne-section-head">

                                    <span>
                                        <Leaf size={20}/>
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

                                <div
                                    className={`ne-field ${
                                        errorCampo(
                                            "nombreCientifico"
                                        )
                                            ?"error"
                                            :""
                                    }`}
                                >

                                    <label>
                                        Nombre científico *
                                    </label>

                                    <input
                                        className="ne-scientific-input"
                                        value={
                                            form.nombreCientifico
                                        }
                                        maxLength={250}
                                        onChange={e=>
                                            cambiarCampo(
                                                "nombreCientifico",
                                                e.target.value
                                            )
                                        }
                                        onBlur={
                                            revisarNombreCientifico
                                        }
                                        placeholder="Ej. Mangifera indica"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                    />

                                    <div className="ne-field-foot">

                                        <small className="ne-error">
                                            {errorCampo(
                                                "nombreCientifico"
                                            )}
                                        </small>

                                        <small>
                                            {
                                                form
                                                    .nombreCientifico
                                                    .length
                                            }/250
                                        </small>

                                    </div>

                                    <small className="ne-scientific-help">
                                        Formato:{" "}
                                        <em>
                                            Género especie
                                        </em>
                                        . La segunda palabra
                                        debe iniciar con
                                        minúscula.
                                    </small>

                                </div>

                                <div
                                    className={`ne-field ${
                                        errorCampo(
                                            "descripcion"
                                        )
                                            ?"error"
                                            :""
                                    }`}
                                >

                                    <label>
                                        Descripción *
                                    </label>

                                    <textarea
                                        rows={5}
                                        maxLength={MAX_DESCRIPCION}
                                        value={
                                            form.descripcion
                                        }
                                        onChange={e=>
                                            cambiarCampo(
                                                "descripcion",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Describe la especie, sus características principales..."
                                    />

                                    <div className="ne-field-foot">
                                        <small className="ne-error">
                                            {errorCampo(
                                                "descripcion"
                                            )}
                                        </small>
                                        <small>
                                            {form.descripcion.length}/{MAX_DESCRIPCION}
                                        </small>
                                    </div>

                                </div>

                                <div className="ne-grid-2">

                                    <div
                                        className={`ne-field ${
                                            errorCampo(
                                                "origen"
                                            )
                                                ?"error"
                                                :""
                                        }`}
                                    >

                                        <label>
                                            Origen
                                        </label>

                                        <textarea
                                            rows={3}
                                            maxLength={MAX_ORIGEN}
                                            value={
                                                form.origen
                                            }
                                            onChange={e=>
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
                                                {
                                                    form
                                                        .origen
                                                        .length
                                                }/{MAX_ORIGEN}
                                            </small>

                                        </div>

                                    </div>

                                    <div className="ne-field">

                                        <label>
                                            Propiedades
                                        </label>

                                        <textarea
                                            rows={3}
                                            maxLength={MAX_TEXTO_EXTENDIDO}
                                            value={
                                                form.propiedades
                                            }
                                            onChange={e=>
                                                cambiarCampo(
                                                    "propiedades",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Describe propiedades de la especie..."
                                        />

                                        <div className="ne-field-foot">
                                            <small className="ne-error">
                                                {errorCampo("propiedades")}
                                            </small>
                                            <small>
                                                {form.propiedades.length}/{MAX_TEXTO_EXTENDIDO}
                                            </small>
                                        </div>
                                    </div>

                                    <div className="ne-field">

                                        <label>
                                            Importancia cultural
                                        </label>

                                        <textarea
                                            rows={3}
                                            maxLength={MAX_TEXTO_EXTENDIDO}
                                            value={
                                                form.importanciaCultural
                                            }
                                            onChange={e=>
                                                cambiarCampo(
                                                    "importanciaCultural",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Describe su importancia cultural..."
                                        />

                                        <div className="ne-field-foot">
                                            <small className="ne-error">
                                                {errorCampo("importanciaCultural")}
                                            </small>
                                            <small>
                                                {form.importanciaCultural.length}/{MAX_TEXTO_EXTENDIDO}
                                            </small>
                                        </div>
                                    </div>

                                    <div className="ne-field">

                                        <label>
                                            Advertencias
                                        </label>

                                        <textarea
                                            rows={3}
                                            maxLength={MAX_TEXTO_EXTENDIDO}
                                            value={
                                                form.advertencias
                                            }
                                            onChange={e=>
                                                cambiarCampo(
                                                    "advertencias",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Precauciones, toxicidad u otras advertencias..."
                                        />

                                        <div className="ne-field-foot">
                                            <small className="ne-error">
                                                {errorCampo("advertencias")}
                                            </small>
                                            <small>
                                                {form.advertencias.length}/{MAX_TEXTO_EXTENDIDO}
                                            </small>
                                        </div>
                                    </div>

                                </div>

                            </>
                        )}

                        {paso===2&&(
                            <>

                                <div className="ne-section-head">

                                    <span>
                                        <FlaskConical size={20}/>
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

                                {errorCampo("taxonomia")&&(
                                    <div className="ne-global-error">
                                        {errorCampo("taxonomia")}
                                    </div>
                                )}

                                {errorCampo("taxonomia.especieTaxonomica")&&(
                                    <div className="ne-global-error">
                                        {errorCampo("taxonomia.especieTaxonomica")}
                                    </div>
                                )}

                                <div className="ne-tax-grid">

                                    <CampoTaxonomia
                                        label="Reino"
                                        campo="reino"
                                        value={
                                            form.taxonomia
                                                .reino
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
                                        onBlur={()=>{
                                            if(
                                                form.taxonomia.reino
                                                    .trim()
                                                    .toLocaleLowerCase("es")==="plantae"
                                            ){
                                                cambiarTaxonomia(
                                                    "reino",
                                                    "Plantae"
                                                );
                                            }
                                        }}
                                    />

                                    <CampoTaxonomia
                                        label="División"
                                        campo="division"
                                        value={
                                            form.taxonomia
                                                .division
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
                                            form.taxonomia
                                                .clase
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
                                            form.taxonomia
                                                .familia
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
                                            form.taxonomia
                                                .genero
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
                                        cientifico
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
                                        cientifico
                                    />

                                </div>

                                <div className="ne-info">

                                    <TriangleAlert size={18}/>

                                    <span>
                                        El reino debe ser Plantae.
                                        Si se deja vacío, el servidor
                                        lo asignará automáticamente.
                                    </span>

                                </div>

                            </>
                        )}

                        {paso===3&&(
                            <>

                                <div className="ne-section-head ne-section-head-action">

                                    <span>
                                        <Tags size={20}/>
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
                                        <Plus size={16}/>
                                        Agregar nombre
                                    </button>

                                </div>

                                {errorCampo(
                                    "nombresComunes"
                                )&&(
                                    <div className="ne-global-error">
                                        {
                                            errorCampo(
                                                "nombresComunes"
                                            )
                                        }
                                    </div>
                                )}

                                {form.nombresComunes.length===0?(
                                    <div className="ne-common-empty">

                                        <UserRound size={28}/>

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
                                            <Plus size={16}/>
                                            Agregar nombre común
                                        </button>

                                    </div>
                                ):(
                                    <div className="ne-common-list">

                                        {form.nombresComunes.map(
                                            (
                                                nombre,
                                                index
                                            )=>(
                                                <div
                                                    className="ne-common-card"
                                                    key={index}
                                                >

                                                    <div className="ne-common-number">
                                                        {index+1}
                                                    </div>

                                                    <div className="ne-common-fields">

                                                        <div
                                                            className={`ne-field ${
                                                                errorCampo(
                                                                    `nombresComunes[${index}].nombre`
                                                                )
                                                                    ?"error"
                                                                    :""
                                                            }`}
                                                        >

                                                            <label>
                                                                Nombre *
                                                            </label>

                                                            <input
                                                                value={
                                                                    nombre.nombre
                                                                }
                                                                maxLength={MAX_NOMBRE_COMUN}
                                                                onChange={e=>
                                                                    cambiarNombreComun(
                                                                        index,
                                                                        "nombre",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Ej. Mango"
                                                            />

                                                            <div className="ne-field-foot">
                                                                <small className="ne-error">
                                                                    {
                                                                        errorCampo(
                                                                            `nombresComunes[${index}].nombre`
                                                                        )
                                                                    }
                                                                </small>
                                                                <small>
                                                                    {nombre.nombre.length}/{MAX_NOMBRE_COMUN}
                                                                </small>
                                                            </div>

                                                        </div>

                                                        <div
                                                            className={`ne-field ${
                                                                errorCampo(
                                                                    `nombresComunes[${index}].region`
                                                                )
                                                                    ?"error"
                                                                    :""
                                                            }`}
                                                        >

                                                            <label>
                                                                Región
                                                            </label>

                                                            <input
                                                                value={
                                                                    nombre.region
                                                                }
                                                                maxLength={MAX_REGION}
                                                                onChange={e=>
                                                                    cambiarNombreComun(
                                                                        index,
                                                                        "region",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Ej. El Salvador"
                                                            />

                                                            <div className="ne-field-foot">
                                                                <small className="ne-error">
                                                                    {
                                                                        errorCampo(
                                                                            `nombresComunes[${index}].region`
                                                                        )
                                                                    }
                                                                </small>
                                                                <small>
                                                                    {nombre.region.length}/{MAX_REGION}
                                                                </small>
                                                            </div>

                                                        </div>

                                                        <label className="ne-principal">

                                                            <input
                                                                type="radio"
                                                                name="principal"
                                                                checked={
                                                                    nombre.esPrincipal===true
                                                                }
                                                                onChange={()=>
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
                                                        onClick={()=>
                                                            eliminarNombreComun(
                                                                index
                                                            )
                                                        }
                                                        title="Eliminar"
                                                        aria-label={`Eliminar nombre común ${index+1}`}
                                                    >
                                                        <Trash2 size={17}/>
                                                    </button>

                                                </div>
                                            )
                                        )}

                                    </div>
                                )}

                            </>
                        )}

                        <div className="ne-form-actions">

                            {paso>1&&(
                                <button
                                    type="button"
                                    className="ne-btn-secondary"
                                    onClick={
                                        anterior
                                    }
                                >
                                    <ArrowLeft size={17}/>
                                    Anterior
                                </button>
                            )}

                            <div className="ne-action-spacer"/>

                            {paso<3?(
                                <button
                                    type="button"
                                    className="ne-btn-primary"
                                    disabled={bloqueoSiguiente||guardando}
                                    onClick={
                                        siguiente
                                    }
                                >
                                    Siguiente
                                    <ArrowRight size={17}/>
                                </button>
                            ):(
                                <button
                                    type="button"
                                    className="ne-btn-primary"
                                    onClick={
                                        registrar
                                    }
                                    disabled={
                                        guardando
                                    }
                                >
                                    <Check size={17}/>

                                    {guardando
                                        ?"Registrando..."
                                        :"Registrar especie"
                                    }
                                </button>
                            )}

                        </div>

                        </fieldset>

                    </section>

                    <aside className="ne-preview">

                        <div className="ne-preview-head">

                            <BookOpen size={19}/>

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
                                <Leaf size={28}/>
                            </div>

                            <div>

                                <h3 className="ne-scientific-name">
                                    {
                                        normalizarNombreCientifico(
                                            form.nombreCientifico
                                        )||
                                        "Nombre científico"
                                    }
                                </h3>

                                <span>
                                    {nombrePrincipal}
                                </span>

                            </div>

                        </div>

                        <PreviewDato
                            titulo="Descripción"
                            valor={
                                form.descripcion.trim()
                            }
                        />

                        <PreviewDato
                            titulo="Origen"
                            valor={
                                form.origen.trim()
                            }
                        />

                        <PreviewDato
                            titulo="Propiedades"
                            valor={
                                form.propiedades.trim()
                            }
                        />

                        <PreviewDato
                            titulo="Importancia cultural"
                            valor={
                                form.importanciaCultural.trim()
                            }
                        />

                        <PreviewDato
                            titulo="Advertencias"
                            valor={
                                form.advertencias.trim()
                            }
                        />

                        <div className="ne-preview-divider"/>

                        <h4>
                            Clasificación taxonómica
                        </h4>

                        {[
                            [
                                "Reino",
                                "Plantae",
                                false
                            ],
                            [
                                "División",
                                normalizarCampoTexto(form.taxonomia.division),
                                false
                            ],
                            [
                                "Clase",
                                normalizarCampoTexto(form.taxonomia.clase),
                                false
                            ],
                            [
                                "Orden",
                                normalizarCampoTexto(form.taxonomia.ordenTaxonomico),
                                false
                            ],
                            [
                                "Familia",
                                normalizarCampoTexto(form.taxonomia.familia),
                                false
                            ],
                            [
                                "Género",
                                normalizarCampoTexto(form.taxonomia.genero),
                                false
                            ],
                            [
                                "Especie",
                                normalizarCampoTexto(form.taxonomia.especieTaxonomica),
                                true
                            ],
                            [
                                "Subespecie",
                                normalizarCampoTexto(form.taxonomia.subespecie),
                                true
                            ]
                        ].map(
                            ([
                                titulo,
                                valor,
                                cientifico
                            ])=>(
                                <PreviewDato
                                    key={titulo}
                                    titulo={titulo}
                                    valor={valor}
                                    compacto
                                    cientifico={
                                        cientifico
                                    }
                                />
                            )
                        )}

                        <div className="ne-preview-divider"/>

                        <h4>
                            Nombres comunes
                        </h4>

                        {form.nombresComunes.length===0?(
                            <span className="ne-none">
                                Sin nombres comunes.
                            </span>
                        ):(
                            <div className="ne-common-tags">

                                {form.nombresComunes.map(
                                    (
                                        nombre,
                                        index
                                    )=>(
                                        <span
                                            key={index}
                                            className={
                                                nombre.esPrincipal
                                                    ?"principal"
                                                    :""
                                            }
                                        >
                                            {
                                                [
                                                    nombre.nombre.trim(),
                                                    nombre.region.trim()
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · ")||"—"
                                            }
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
    onChange,
    onBlur,
    cientifico=false
}){
    return(
        <div
            className={`ne-field ${
                error
                    ?"error"
                    :""
            }`}
        >

            <label>
                {label}
            </label>

            <input
                className={
                    cientifico
                        ?"ne-scientific-input"
                        :""
                }
                value={value}
                maxLength={maxLength}
                onChange={e=>
                    onChange(
                        campo,
                        e.target.value
                    )
                }
                onBlur={onBlur}
                autoCapitalize={
                    cientifico
                        ?"none"
                        :undefined
                }
                spellCheck={
                    cientifico
                        ?false
                        :undefined
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
    compacto=false,
    cientifico=false
}){
    return(
        <div
            className={`ne-preview-row ${
                compacto
                    ?"compact"
                    :""
            }`}
        >

            <span>
                {titulo}
            </span>

            <strong
                className={
                    cientifico
                        ?"ne-scientific-value"
                        :""
                }
            >
                {valor||"-"}
            </strong>

        </div>
    );
}

export default NuevaEspecie;