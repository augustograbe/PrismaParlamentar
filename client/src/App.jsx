import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Grafo from './pages/Grafo';
import Deputados from './pages/Deputados';
import PerfilDeputado from './pages/PerfilDeputado';
import Sobre from './pages/Sobre';

export default function App() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('prisma_theme') || 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('prisma_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Grafo theme={theme} toggleTheme={toggleTheme} />} />
                <Route path="/deputados" element={<Deputados theme={theme} toggleTheme={toggleTheme} />} />
                <Route path="/deputado/:id" element={<PerfilDeputado theme={theme} toggleTheme={toggleTheme} />} />
                <Route path="/sobre" element={<Sobre theme={theme} toggleTheme={toggleTheme} />} />
            </Routes>
        </BrowserRouter>
    );
}
