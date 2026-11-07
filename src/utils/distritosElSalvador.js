let distritosPromesa = null;

function puntoEnAnillo(longitud, latitud, anillo) {
    let dentro = false;

    for (
        let actual = 0, anterior = anillo.length - 1;
        actual < anillo.length;
        anterior = actual++
    ) {
        const [longitudActual, latitudActual] = anillo[actual];
        const [longitudAnterior, latitudAnterior] = anillo[anterior];
        const productoCruzado =
            (longitud - longitudActual) *
                (latitudAnterior - latitudActual) -
            (latitud - latitudActual) *
                (longitudAnterior - longitudActual);
        const estaEnSegmento =
            Math.abs(productoCruzado) < 1e-10 &&
            longitud >= Math.min(longitudActual, longitudAnterior) - 1e-10 &&
            longitud <= Math.max(longitudActual, longitudAnterior) + 1e-10 &&
            latitud >= Math.min(latitudActual, latitudAnterior) - 1e-10 &&
            latitud <= Math.max(latitudActual, latitudAnterior) + 1e-10;

        if (estaEnSegmento) {
            return true;
        }

        const intersecta =
            (latitudActual > latitud) !==
                (latitudAnterior > latitud) &&
            longitud <
                ((longitudAnterior - longitudActual) *
                    (latitud - latitudActual)) /
                    (latitudAnterior - latitudActual) +
                    longitudActual;

        if (intersecta) {
            dentro = !dentro;
        }
    }

    return dentro;
}

function puntoEnPoligono(longitud, latitud, anillos) {
    if (
        !Array.isArray(anillos) ||
        anillos.length === 0 ||
        !puntoEnAnillo(longitud, latitud, anillos[0])
    ) {
        return false;
    }

    return !anillos.slice(1).some(
        anillo => puntoEnAnillo(longitud, latitud, anillo)
    );
}

function geometriaContienePunto(geometria, longitud, latitud) {
    if (geometria?.type === "Polygon") {
        return puntoEnPoligono(
            longitud,
            latitud,
            geometria.coordinates
        );
    }

    if (geometria?.type === "MultiPolygon") {
        return geometria.coordinates.some(
            poligono =>
                puntoEnPoligono(longitud, latitud, poligono)
        );
    }

    return false;
}

function geometriaValida(geometria) {
    if (geometria?.type === "Polygon") {
        return poligonoValido(geometria.coordinates);
    }

    if (geometria?.type === "MultiPolygon") {
        return (
            Array.isArray(geometria.coordinates) &&
            geometria.coordinates.length > 0 &&
            geometria.coordinates.every(poligonoValido)
        );
    }

    return false;
}

function poligonoValido(anillos) {
    return (
        Array.isArray(anillos) &&
        anillos.length > 0 &&
        anillos.every(
            anillo =>
                Array.isArray(anillo) &&
                anillo.length >= 4 &&
                anillo.every(
                    coordenada =>
                        Array.isArray(coordenada) &&
                        coordenada.length >= 2 &&
                        Number.isFinite(coordenada[0]) &&
                        Number.isFinite(coordenada[1])
                )
        )
    );
}

export async function cargarDistritosElSalvador() {
    if (!distritosPromesa) {
        distritosPromesa = fetch(
            `${import.meta.env.BASE_URL}distritos-el-salvador.geojson`
        )
            .then(async respuesta => {
                if (!respuesta.ok) {
                    throw new Error(
                        `No se pudo cargar el GeoJSON de distritos (HTTP ${respuesta.status}).`
                    );
                }

                const datos = await respuesta.json();

                if (
                    datos?.type !== "FeatureCollection" ||
                    !Array.isArray(datos.features) ||
                    datos.features.length === 0 ||
                    !datos.features.every(
                        feature =>
                            feature?.type === "Feature" &&
                            feature.properties &&
                            geometriaValida(feature.geometry)
                    )
                ) {
                    throw new Error(
                        "El catálogo de distritos no contiene geometrías GeoJSON válidas."
                    );
                }

                return datos.features;
            })
            .catch(error => {
                distritosPromesa = null;
                throw error;
            });
    }

    return distritosPromesa;
}

export function buscarDistritoPorCoordenadas(
    latitud,
    longitud,
    distritos,
    idDistrito
) {
    const lat = Number(latitud);
    const lng = Number(longitud);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < 13.1 ||
        lat > 14.5 ||
        lng < -90.2 ||
        lng > -87.6 ||
        !Array.isArray(distritos)
    ) {
        return null;
    }

    const id = idDistrito === "" || idDistrito == null
        ? null
        : Number(idDistrito);

    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
        return null;
    }

    const candidatos = id === null
        ? distritos
        : distritos.filter(
            feature =>
                Number(feature.properties.idDistrito) === id
        );

    return candidatos.find(
        feature =>
            geometriaContienePunto(feature.geometry, lng, lat)
    )?.properties || null;
}
