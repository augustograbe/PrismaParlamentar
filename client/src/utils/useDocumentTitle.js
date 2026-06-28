import { useEffect } from 'react';

/**
 * Hook para atualizar o título da aba do navegador no formato:
 * (nome da página) - PrismaParlamentar
 *
 * @param {string} pageName Nome da página atual (ex: 'Grafos', 'Lista', 'Sobre')
 */
export function useDocumentTitle(pageName) {
    useEffect(() => {
        if (pageName) {
            document.title = `${pageName} - PrismaParlamentar`;
        } else {
            document.title = 'PrismaParlamentar';
        }
    }, [pageName]);
}
