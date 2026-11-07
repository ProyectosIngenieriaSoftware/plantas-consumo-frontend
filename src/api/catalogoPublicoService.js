import { listarEspeciesPublicadas } from "./especieService";
import { listarPartesComestibles } from "./parteComestibleService";
import { listarAportesPorEspecie } from "./aporteNutricionalService";
import { listarNutrientesActivos } from "./nutrienteService";
import { listarParteBeneficiosActivas } from "./parteBeneficioService";
import { listarBeneficios } from "./beneficioService";
import { listarPreparacionesPorEspecie } from "./preparacionConsumoService";
import { listarEpocasPorEspecie } from "./epocaCosechaService";
import {
    listarHabitatsDeEspecie,
    listarHabitatsDisponibles
} from "./especieHabitatService";
import { listarUbicacionesEspecie } from "./ubicacionEspecieService";
import { listarImagenes } from "./imagenEspecieService";
import { listarVideosPorEspecie } from "./videoEspecieService";
import {
    listarFuentesDeEspecie
} from "./especiesFuentesService";
import { listarFuentes } from "./fuenteService";
import { listarMedia } from "./preparacionMediaService";

function lista(datos) {
    return Array.isArray(datos)
        ? datos
        : Array.isArray(datos?.content)
            ? datos.content
            : [];
}

function activa(registro) {
    return (
        registro?.activa !== false &&
        registro?.activo !== false
    );
}

function idDe(objeto, ...claves) {
    for (const clave of claves) {
        const valor = objeto?.[clave];

        if (
            valor !== undefined &&
            valor !== null
        ) {
            return String(valor);
        }
    }

    return "";
}

async function seguro(
    promesa,
    valor = []
) {
    try {
        const datos = await promesa;

        return datos ?? valor;
    } catch {
        return valor;
    }
}

function enriquecerPorCatalogo(
    registros,
    catalogo,
    claveRegistro,
    clavesCatalogo,
    nombreCampo
) {
    const mapa = new Map(
        lista(catalogo).map(
            item => [
                idDe(
                    item,
                    ...clavesCatalogo
                ),
                item
            ]
        )
    );

    return lista(registros).map(
        registro => {
            const item = mapa.get(
                idDe(
                    registro,
                    claveRegistro
                )
            );

            return {
                ...registro,
                [nombreCampo]: item || null
            };
        }
    );
}

async function cargarMultimediaPreparaciones(
    preparaciones
) {
    const activas = lista(
        preparaciones
    ).filter(activa);

    const resultados =
        await Promise.all(
            activas.map(
                async preparacion => {
                    const idPreparacion =
                        preparacion.idPreparacion ??
                        preparacion.id;

                    const [
                        imagenes,
                        videos
                    ] = await Promise.all([
                        seguro(
                            listarMedia(
                                idPreparacion,
                                "imagenes"
                            )
                        ),
                        seguro(
                            listarMedia(
                                idPreparacion,
                                "videos"
                            )
                        )
                    ]);

                    return {
                        preparacion,
                        imagenes:
                            lista(
                                imagenes
                            ).filter(
                                activa
                            ),
                        videos:
                            lista(
                                videos
                            ).filter(
                                activa
                            )
                    };
                }
            )
        );

    return resultados.filter(
        item =>
            item.imagenes.length > 0 ||
            item.videos.length > 0
    );
}

export async function obtenerDetalleCatalogoPublico(
    idEspecie
) {
    const publicadas = lista(
        await listarEspeciesPublicadas()
    );

    const especie = publicadas.find(
        item =>
            String(
                item.idEspecie ??
                item.id
            ) ===
            String(idEspecie)
    );

    if (!especie) {
        const error = new Error(
            "La especie no está disponible en el catálogo público."
        );

        error.codigo =
            "ESPECIE_NO_PUBLICADA";

        throw error;
    }

    const [
        partes,
        aportes,
        nutrientes,
        relacionesBeneficio,
        beneficios,
        preparaciones,
        epocas,
        habitats,
        catalogoHabitats,
        ubicaciones,
        imagenes,
        videos,
        relacionesFuentes,
        catalogoFuentes
    ] = await Promise.all([
        seguro(
            listarPartesComestibles(
                idEspecie,
                true
            )
        ),

        seguro(
            listarAportesPorEspecie(
                idEspecie
            )
        ),

        seguro(
            listarNutrientesActivos()
        ),

        seguro(
            listarParteBeneficiosActivas()
        ),

        seguro(
            listarBeneficios()
        ),

        seguro(
            listarPreparacionesPorEspecie(
                idEspecie,
                true
            )
        ),

        seguro(
            listarEpocasPorEspecie(
                idEspecie,
                true
            )
        ),

        seguro(
            listarHabitatsDeEspecie(
                idEspecie
            )
        ),

        seguro(
            listarHabitatsDisponibles()
        ),

        seguro(
            listarUbicacionesEspecie(
                idEspecie
            )
        ),

        seguro(
            listarImagenes(
                idEspecie,
                true
            )
        ),

        seguro(
            listarVideosPorEspecie(
                idEspecie,
                true
            )
        ),

        seguro(
            listarFuentesDeEspecie(
                idEspecie
            )
        ),

        seguro(
            listarFuentes(true)
        )
    ]);

    const partesActivas =
        lista(partes).filter(
            activa
        );

    const idsPartes =
        new Set(
            partesActivas.map(
                parte =>
                    String(
                        parte.idEspecieParte
                    )
            )
        );

    const aportesEspecie =
        lista(aportes)
            .filter(activa)
            .filter(
                aporte =>
                    idsPartes.has(
                        String(
                            aporte.idEspecieParte
                        )
                    )
            );

    const aportesEnriquecidos =
        enriquecerPorCatalogo(
            aportesEspecie,
            nutrientes,
            "idNutriente",
            [
                "idNutriente",
                "id"
            ],
            "nutriente"
        );

    const relacionesBeneficioEspecie =
        lista(
            relacionesBeneficio
        )
            .filter(activa)
            .filter(
                relacion =>
                    idsPartes.has(
                        String(
                            relacion.idEspecieParte
                        )
                    )
            );

    const beneficiosEnriquecidos =
        enriquecerPorCatalogo(
            relacionesBeneficioEspecie,
            lista(
                beneficios
            ).filter(
                activa
            ),
            "idBeneficio",
            [
                "idBeneficio",
                "id"
            ],
            "beneficio"
        );

    const habitatsEnriquecidos =
        enriquecerPorCatalogo(
            lista(
                habitats
            ).filter(
                activa
            ),
            catalogoHabitats,
            "idHabitat",
            [
                "idHabitat",
                "id"
            ],
            "habitat"
        );

    const fuentesActivas =
        lista(
            catalogoFuentes
        ).filter(
            activa
        );

    const fuentesEnriquecidas =
        enriquecerPorCatalogo(
            lista(
                relacionesFuentes
            ).filter(
                activa
            ),
            fuentesActivas,
            "idFuente",
            [
                "idFuente",
                "id"
            ],
            "fuente"
        ).filter(
            item =>
                item.fuente
        );

    const preparacionesActivas =
        lista(
            preparaciones
        ).filter(
            activa
        );

    const multimediaPreparaciones =
        await cargarMultimediaPreparaciones(
            preparacionesActivas
        );

    return {
        especie,

        alimentacion: {
            partes:
                partesActivas,

            aportes:
                aportesEnriquecidos,

            beneficios:
                beneficiosEnriquecidos,

            preparaciones:
                preparacionesActivas,

            epocas:
                lista(
                    epocas
                ).filter(
                    activa
                )
        },

        entorno: {
            habitats:
                habitatsEnriquecidos,

            ubicaciones:
                lista(
                    ubicaciones
                ).filter(
                    activa
                )
        },

        multimedia: {
            imagenes:
                lista(
                    imagenes
                ).filter(
                    activa
                ),

            videos:
                lista(
                    videos
                ).filter(
                    activa
                ),

            preparaciones:
                multimediaPreparaciones
        },

        fuentes:
            fuentesEnriquecidas
    };
}

export function obtenerImagenPrincipalPublica(
    detalle
) {
    const imagenes =
        detalle?.multimedia
            ?.imagenes || [];

    return (
        imagenes.find(
            imagen =>
                imagen?.esPrincipal === true ||
                imagen?.principal === true
        ) ||
        imagenes[0] ||
        null
    );
}