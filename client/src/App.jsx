import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Grafo from './pages/Grafo';
import Deputados from './pages/Deputados';
import PerfilDeputado from './pages/PerfilDeputado';
import Sobre from './pages/Sobre';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Grafo />} />
        <Route path="/deputados" element={<Deputados />} />
        <Route path="/deputado/:id" element={<PerfilDeputado />} />
        <Route path="/sobre" element={<Sobre />} />
      </Routes>
    </BrowserRouter>
  );
}
