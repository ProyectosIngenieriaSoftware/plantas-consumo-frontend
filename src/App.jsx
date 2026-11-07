import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
    RouterProvider
} from "react-router-dom";
import Layout from "./components/Layout";
import Pagina from "./pages/Pagina";

import Catalogos from "./pages/catalogos/Catalogos";
import Habitats from "./pages/catalogos/Habitats";
import Fuentes from "./pages/catalogos/Fuentes";
import Nutrientes from "./pages/catalogos/Nutrientes";
import Beneficios from "./pages/catalogos/Beneficios";
import PartesPlanta from "./pages/catalogos/PartesPlanta";

import NuevaEspecie from "./pages/especies/NuevaEspecie";
import CatalogoEspecies from "./pages/especies/CatalogoEspecies";
import DetalleCatalogoEspecie from "./pages/especies/DetalleCatalogoEspecie";
import GestionEspecies from "./pages/especies/GestionEspecies";

import AlimentacionAprovechamiento from "./pages/especies/contenido/AlimentacionAprovechamiento";
import EntornoLocalizacion from "./pages/especies/contenido/EntornoLocalizacion";
import DocumentacionMultimedia from "./pages/especies/contenido/DocumentacionMultimedia";

import PartesComestibles from "./pages/especies/contenido/PartesComestibles";
import ParteBeneficios from "./pages/especies/contenido/ParteBeneficios";
import AportesNutricionales from "./pages/especies/contenido/AportesNutricionales";
import EpocasCosecha from "./pages/especies/contenido/EpocasCosecha";
import PreparacionesConsumo from "./pages/especies/contenido/PreparacionesConsumo";

import HabitatsEspecie from "./pages/especies/contenido/HabitatsEspecie";
import MultimediaPreparacion from "./pages/especies/contenido/MultimediaPreparacion";
import EspecieFuentes from "./pages/especies/contenido/Especie_Fuentes";

import MapaEspecies from "./pages/mapa/MapaEspecies";
import UbicacionesEspecie from "./pages/especies/contenido/UbicacionesEspecie";
import VideosEspecie from "./pages/especies/contenido/VideosEspecie";
import ImagenesEspecie from "./pages/especies/contenido/ImagenesEspecie";
import NoEncontrada from "./pages/NoEncontrada";

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<Layout />}>

                    <Route
                        path="/"
                        element={
                            <Pagina
                                titulo="Panel principal"
                                descripcion="Resumen general del Catálogo Botánico."
                            />
                        }
                    />

                    <Route
                        path="/catalogo"
                        element={<CatalogoEspecies />}
                    />

                    <Route
                        path="/catalogo/especie/:idEspecie"
                        element={<DetalleCatalogoEspecie />}
                    />

                    <Route
                        path="/agregar-planta"
                        element={<NuevaEspecie />}
                    />

                    <Route
                        path="/gestion-especies"
                        element={<GestionEspecies />}
                    />

                    <Route
                        path="/contenido-especies/alimentacion"
                        element={<AlimentacionAprovechamiento />}
                    />

                    <Route
                        path="/especies/:idEspecie/epocas-cosecha"
                        element={<EpocasCosecha />}
                    />

                    <Route
                        path="/especies/:idEspecie/preparaciones-consumo"
                        element={<PreparacionesConsumo />}
                    />

                    <Route
                        path="/contenido-especies/entorno"
                        element={<EntornoLocalizacion />}
                    />

                    <Route
                        path="/contenido-especies/documentacion"
                        element={<DocumentacionMultimedia />}
                    />

                    <Route
                        path="/especies/:idEspecie/imagenes"
                        element={<ImagenesEspecie />}
                    />

                    <Route
                        path="/especies/:idEspecie/multimedia-preparacion"
                        element={<MultimediaPreparacion />}
                    />

                    <Route
                        path="/especies/:idEspecie/fuentes"
                        element={<EspecieFuentes />}
                    />

                    <Route
                        path="/especies/:idEspecie/contenido/partes-comestibles"
                        element={<PartesComestibles />}
                    />

                    <Route
                        path="/especies/:idEspecie/aportes-nutricionales"
                        element={<AportesNutricionales />}
                    />

                    <Route
                        path="/especies/:idEspecie/videos"
                        element={<VideosEspecie />}
                    />

                    <Route
                        path="/especies/:idEspecie/parte-beneficios"
                        element={<ParteBeneficios />}
                    />

                    <Route
                        path="/especies/:idEspecie/habitats"
                        element={<HabitatsEspecie />}
                    />

                    <Route
                        path="/catalogos"
                        element={<Catalogos />}
                    />

                    <Route
                        path="/catalogos/habitats"
                        element={<Habitats />}
                    />

                    <Route
                        path="/catalogos/fuentes"
                        element={<Fuentes />}
                    />

                    <Route
                        path="/catalogos/nutrientes"
                        element={<Nutrientes />}
                    />

                    <Route
                        path="/catalogos/beneficios"
                        element={<Beneficios />}
                    />

                    <Route
                        path="/catalogos/partes-planta"
                        element={<PartesPlanta />}
                    />

                    <Route
                        path="/mapa"
                        element={<MapaEspecies />}
                    />

                    <Route
                        path="/especies/:idEspecie/ubicaciones"
                        element={<UbicacionesEspecie />}
                    />

                    <Route
                        path="/usuarios"
                        element={
                            <Pagina
                                titulo="Usuarios"
                                descripcion="Administra los usuarios del sistema."
                            />
                        }
                    />

                    <Route
                        path="/estadisticas"
                        element={
                            <Pagina
                                titulo="Estadísticas"
                                descripcion="Consulta indicadores y estadísticas del catálogo."
                            />
                        }
                    />

                    <Route
                        path="/configuracion"
                        element={
                            <Pagina
                                titulo="Configuración"
                                descripcion="Administra la configuración general del sistema."
                            />
                        }
                    />

            <Route path="*" element={<NoEncontrada />} />
        </Route>
    )
);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
