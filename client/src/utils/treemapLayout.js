/**
 * Algoritmo de Treemap Squarified em JS puro.
 * Calcula as coordenadas retangulares (x, y, width, height) para uma lista de itens com 'value'.
 * 
 * @param {Array<{value: number, [key: string]: any}>} items - Lista de itens contendo um valor numérico positivo.
 * @param {number} width - Largura total da área disponível.
 * @param {number} height - Altura total da área disponível.
 * @param {number} [startX=0] - Coordenada X inicial.
 * @param {number} [startY=0] - Coordenada Y inicial.
 * @returns {Array<{x: number, y: number, width: number, height: number, data: any}>}
 */
export function computeTreemapLayout(items, width, height, startX = 0, startY = 0) {
    if (!items || items.length === 0 || width <= 0 || height <= 0) return [];

    const validItems = items
        .filter(item => item && typeof item.value === 'number' && item.value > 0)
        .sort((a, b) => b.value - a.value);

    if (validItems.length === 0) return [];

    const totalValue = validItems.reduce((sum, item) => sum + item.value, 0);
    const results = [];

    function worst(row, sideLen, totalArea) {
        if (row.length === 0) return Infinity;
        const rowSum = row.reduce((s, item) => s + item.value, 0);
        const rowArea = (rowSum / totalValue) * totalArea;
        if (sideLen <= 0 || rowArea <= 0) return Infinity;

        let maxAspect = 0;
        for (const item of row) {
            const itemArea = (item.value / totalValue) * totalArea;
            const itemLen = itemArea / (rowArea / sideLen);
            const otherLen = rowArea / sideLen;
            if (itemLen <= 0 || otherLen <= 0) continue;
            const aspect = Math.max(itemLen / otherLen, otherLen / itemLen);
            if (aspect > maxAspect) maxAspect = aspect;
        }
        return maxAspect || Infinity;
    }

    function layoutRow(row, rect, totalArea) {
        const rowSum = row.reduce((s, item) => s + item.value, 0);
        const rowArea = (rowSum / totalValue) * totalArea;
        const isHorizontal = rect.width >= rect.height;

        const rowWidth = isHorizontal ? rowArea / rect.height : rect.width;
        const rowHeight = isHorizontal ? rect.height : rowArea / rect.width;

        let currentX = rect.x;
        let currentY = rect.y;

        for (const item of row) {
            const itemArea = (item.value / totalValue) * totalArea;
            const itemWidth = isHorizontal ? rowWidth : itemArea / rowHeight;
            const itemHeight = isHorizontal ? itemArea / rowWidth : rowHeight;

            results.push({
                x: currentX,
                y: currentY,
                width: itemWidth,
                height: itemHeight,
                data: item
            });

            if (isHorizontal) {
                currentY += itemHeight;
            } else {
                currentX += itemWidth;
            }
        }

        if (isHorizontal) {
            return {
                x: rect.x + rowWidth,
                y: rect.y,
                width: Math.max(0, rect.width - rowWidth),
                height: rect.height
            };
        } else {
            return {
                x: rect.x,
                y: rect.y + rowHeight,
                width: rect.width,
                height: Math.max(0, rect.height - rowHeight)
            };
        }
    }

    function squarify(children, row, rect, totalArea) {
        if (children.length === 0) {
            if (row.length > 0) layoutRow(row, rect, totalArea);
            return;
        }

        const c = children[0];
        const sideLen = Math.min(rect.width, rect.height);

        if (row.length === 0) {
            squarify(children.slice(1), [c], rect, totalArea);
        } else {
            const currentWorst = worst(row, sideLen, totalArea);
            const nextWorst = worst([...row, c], sideLen, totalArea);

            if (currentWorst >= nextWorst) {
                squarify(children.slice(1), [...row, c], rect, totalArea);
            } else {
                const newRect = layoutRow(row, rect, totalArea);
                squarify(children, [], newRect, totalArea);
            }
        }
    }

    const totalArea = width * height;
    squarify(validItems, [], { x: startX, y: startY, width, height }, totalArea);

    return results;
}
