/**
 * Gera um nome de arquivo padronizado para exportação de imagens de grafos e treemaps.
 * Formato: [prefixo]_tipo-[graphType]_[filtros]_[DD-MM-YYYY].png
 * 
 * @param {string} prefix - Prefixo do arquivo (ex: 'grafo' ou 'mapa-de-arvores')
 * @param {string} graphType - Tipo do grafo ('similaridade' ou 'coautoria')
 * @param {object} filters - Objeto com os filtros aplicados no momento
 * @returns {string} Nome de arquivo formatado
 */
export function generateExportFilename(prefix, graphType, filters) {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const parts = [prefix, `tipo-${graphType}`];

    if (filters) {
        if (filters.separateBy) {
            parts.push(`separar-${filters.separateBy}`);
        }
        if (graphType === 'coautoria' && filters.coautoria) {
            parts.push(`coautoria-${filters.coautoria.min}a${filters.coautoria.max}`);
        } else if (filters.voteSimilarity) {
            parts.push(`similaridade-${filters.voteSimilarity.min}a${filters.voteSimilarity.max}`);
        }
        if (filters.onlyActive) {
            parts.push('apenas-ativos');
        }
    }

    parts.push(dateStr);
    return parts.join('_') + '.png';
}
