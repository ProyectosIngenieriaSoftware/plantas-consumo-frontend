export function obtenerFormularioRetornado(inicial, location) {
    const formulario = {
        ...inicial,
        ...location.state?.formularioRetorno
    };
    const seleccion = location.state?.seleccionFormulario;

    if (
        seleccion &&
        Object.prototype.hasOwnProperty.call(
            inicial,
            seleccion.campo
        ) &&
        seleccion.id !== undefined &&
        seleccion.id !== null
    ) {
        formulario[seleccion.campo] = String(
            seleccion.id
        );
    }

    return formulario;
}

export function crearEstadoRegistro(
    location,
    campo,
    formulario,
    contextoFormulario = {}
) {
    return {
        abrirFormulario: true,
        formularioRetorno: formulario,
        contextoFormulario,
        retornoFormulario: {
            ruta: location.pathname,
            campo,
            estado: {
                ...location.state,
                abrirFormulario: true,
                formularioRetorno: formulario,
                contextoFormulario
            }
        }
    };
}

export function volverAlFormulario(
    navigate,
    retorno,
    registro,
    clavesId
) {
    if (!retorno?.ruta) {
        return false;
    }

    const entidad = registro?.data || registro;
    const id = clavesId
        .map(clave => entidad?.[clave])
        .find(valor => valor !== undefined && valor !== null);

    if (id === undefined) {
        return false;
    }

    navigate(retorno.ruta, {
        replace: true,
        state: {
            ...retorno.estado,
            seleccionFormulario: {
                campo: retorno.campo,
                id
            }
        }
    });

    return true;
}
