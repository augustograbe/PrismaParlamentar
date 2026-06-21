import { useState, useEffect } from 'react';

/**
 * Hook customizado para detectar se o viewport atual está abaixo do breakpoint mobile.
 * @param {number} breakpoint - Largura máxima em pixels para mobile (padrão: 768)
 * @returns {boolean} true se a largura do viewport for menor ou igual ao breakpoint
 */
export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth <= breakpoint;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setIsMobile(window.innerWidth <= breakpoint);
        };

        window.addEventListener('resize', handleResize);
        
        // Executa uma vez para garantir alinhamento inicial
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
}
