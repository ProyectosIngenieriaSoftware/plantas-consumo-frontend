import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import GestionEspecies from "./pages/especies/GestionEspecies";

function App() {
  return (
    <BrowserRouter>
      <Routes>

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
            path="/agregar-planta"
            element={<NuevaEspecie />}
          />

          <Route
            path="/gestion-especies"
            element={<GestionEspecies />}
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
            element={
              <Pagina
                titulo="Mapa"
                descripcion="Visualiza la distribución geográfica de las especies."
              />
            }
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

        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;