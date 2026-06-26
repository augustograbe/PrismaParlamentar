import { useSigma } from '@react-sigma/core';
import { useLayoutEffect } from 'react';
import { COLORS, PARTY_COLORS, STATE_COLORS, SEX_COLORS } from '../../constants/theme';

/**
 * Converte cor hex para rgba com opacidade.
 */
function withOpacity(hex, alpha) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Retorna o ID da comunidade do deputado baseado no algoritmo e tipo de grafo.
 */
function getCommunityId(deputy, graphType, dynamicCommunityMap = null) {
    if (!deputy) return null;
    const depId = String(deputy.id);
    if (dynamicCommunityMap && Object.prototype.hasOwnProperty.call(dynamicCommunityMap, depId)) {
        return dynamicCommunityMap[depId];
    }
    return null;
}

/**
 * Gets the group key for a node based on the separateBy criterion.
 */
function getNodeGroupKey(dep, separateBy, graphType, dynamicCommunityMap = null) {
    if (!dep) return null;
    switch (separateBy) {
        case 'partido':
            return dep.sigla_partido || dep.partido || 'OUTROS';
        case 'estado':
            return dep.sigla_uf || dep.estado || 'Outros';
        case 'sexo':
            return dep.sexo || 'O';
        case 'comunidade': {
            const cId = getCommunityId(dep, graphType, dynamicCommunityMap);
            return cId != null ? String(cId) : 'sem_comunidade';
        }
        default:
            return dep.sigla_partido || dep.partido || 'OUTROS';
    }
}

/**
 * Returns the color for a group key based on separateBy.
 */
function getGroupColor(key, separateBy) {
    switch (separateBy) {
        case 'partido':
            return PARTY_COLORS[key] || COLORS.textMedium;
        case 'estado':
            return STATE_COLORS[key] || COLORS.textMedium;
        case 'sexo':
            return SEX_COLORS[key] || COLORS.textMedium;
        case 'comunidade': {
            return COLORS.textMedium;
        }
        default:
            return PARTY_COLORS[key] || COLORS.textMedium;
    }
}

/**
 * GraphSettingsController - Controla o destaque de vizinhança ao selecionar um nó,
 * o destaque visual dos nós fixados (pinned) e o highlight ao passar mouse na legenda.
 *
 * Utiliza o nodeReducer para passar o atributo 'isPinned' que é consumido
 * pelo drawLabel customizado no GraphContainer.
 */
export default function GraphSettingsController({ theme = 'light', selectedNode, pinnedIds = [], highlightPinned = true, hoveredLegendGroup = null, hoveredBarGroup = null, hoveredConnectionNode = null, separateBy = 'partido', graphType = 'similaridade', dynamicCommunityMap = null }) {
    const sigma = useSigma();
    const graph = sigma.getGraph();

    useLayoutEffect(() => {
        const NODE_FADE_COLOR = theme === 'dark' ? '#333333' : '#cccccc';
        const EDGE_FADE_COLOR = theme === 'dark' ? '#222222' : '#eeeeee';

        sigma.setSetting('labelColor', { color: theme === 'dark' ? '#f5f5f5' : '#2d2d2d' });

        const drawHoverFn = (context, data, settings) => {
            const size = data.size;
            const font = settings.labelFont;
            const weight = settings.labelWeight || 'normal';
            const fontSize = settings.labelSize || 12;

            context.font = `${weight} ${fontSize}px ${font}`;
            const textWidth = context.measureText(data.label).width;

            const x = data.x;
            const y = data.y;

            // Box dimensions
            const boxWidth = textWidth + 10;
            const boxHeight = fontSize + 8;
            const boxX = x + size + 3;
            const boxY = y - boxHeight / 2;

            const isDark = theme === 'dark';

            // 1. Draw node hover disc/shadow
            context.beginPath();
            context.arc(x, y, size + 4, 0, Math.PI * 2);
            context.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
            context.fill();

            // 2. Draw label background box
            context.beginPath();
            if (typeof context.roundRect === 'function') {
                context.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
            } else {
                context.rect(boxX, boxY, boxWidth, boxHeight);
            }
            context.fillStyle = isDark ? '#1a1b20' : '#ffffff';
            context.shadowColor = 'rgba(0, 0, 0, 0.25)';
            context.shadowBlur = 6;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 2;
            context.fill();
            
            // Reset shadow so it doesn't affect subsequent drawings
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;

            // 3. Draw label border
            context.strokeStyle = isDark ? '#3d3d3d' : '#e0e0e0';
            context.lineWidth = 1;
            context.stroke();

            // 4. Draw node itself (so it sits on top of the hover disc)
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fillStyle = data.color;
            context.fill();

            // 5. Draw label text
            context.fillStyle = isDark ? '#ffffff' : '#2d2d2d';
            context.fillText(data.label, boxX + 5, y + fontSize / 3);
        };

        sigma.setSetting('defaultDrawNodeHover', drawHoverFn);
        sigma.setSetting('hoverRenderer', drawHoverFn);

        const pinnedSet = new Set(pinnedIds.map(String));
        const shouldHighlightPinned = highlightPinned && pinnedSet.size > 0;

        if (selectedNode) {
            const selectedColor = graph.getNodeAttribute(selectedNode, 'color') || COLORS.orange;

            // Pegar vizinhos apenas por arestas visíveis (não hidden)
            const neighbors = new Set();
            const neighborGroups = {}; // nodeId -> groupKey
            graph.forEachEdge(selectedNode, (edge, attrs, source, target) => {
                if (!attrs.hidden) {
                    const neighbor = source === selectedNode ? target : source;
                    if (!graph.getNodeAttribute(neighbor, 'hidden')) {
                        neighbors.add(neighbor);
                        const dep = graph.getNodeAttribute(neighbor, 'deputyData');
                        neighborGroups[neighbor] = getNodeGroupKey(dep, separateBy, graphType, dynamicCommunityMap);
                    }
                }
            });

            if (hoveredConnectionNode) {
                // A specific connection is hovered: highlight only the two nodes and their edge
                const hoveredNodeColor = graph.getNodeAttribute(hoveredConnectionNode, 'color') || COLORS.textMedium;

                sigma.setSetting('nodeReducer', (node, data) => {
                    const isPinned = shouldHighlightPinned && pinnedSet.has(node);

                    if (node === selectedNode || node === hoveredConnectionNode) {
                        return {
                            ...data,
                            color: withOpacity(data.color, 1.0),
                            zIndex: 2,
                            highlighted: true,
                            isPinned,
                            forceLabel: true,
                            alpha: 1.0,
                        };
                    }

                    return {
                        ...data,
                        zIndex: 0,
                        label: isPinned ? data.label : '',
                        color: withOpacity(NODE_FADE_COLOR, 0.9),
                        highlighted: false,
                        isPinned,
                        forceLabel: isPinned,
                        alpha: 0.9,
                    };
                });

                sigma.setSetting('edgeReducer', (edge, data) => {
                    if (graph.hasExtremity(edge, selectedNode) && graph.hasExtremity(edge, hoveredConnectionNode) && !data.hidden) {
                        return { ...data, color: hoveredNodeColor, size: 3 };
                    }
                    return { ...data, color: EDGE_FADE_COLOR, hidden: true };
                });
            } else if (hoveredBarGroup) {
                // A bar segment is hovered: highlight only edges to neighbors of that group
                const hoveredGroupColor = getGroupColor(hoveredBarGroup, separateBy);

                sigma.setSetting('nodeReducer', (node, data) => {
                    const isPinned = shouldHighlightPinned && pinnedSet.has(node);

                        if (node === selectedNode) {
                            return {
                                ...data,
                                color: withOpacity(data.color, 1.0),
                                zIndex: 2,
                                highlighted: true,
                                isPinned,
                                alpha: 1.0,
                            };
                        }
                        if (neighbors.has(node)) {
                            const isMatchGroup = neighborGroups[node] === hoveredBarGroup;
                            if (isMatchGroup) {
                                return {
                                    ...data,
                                    color: withOpacity(data.color, 0.9),
                                    zIndex: 1,
                                    isPinned,
                                    forceLabel: isPinned || data.forceLabel,
                                    alpha: 0.9,
                                };
                            }
                            // Neighbor but not matching group — fade
                            return {
                                ...data,
                                zIndex: 0,
                                label: isPinned ? data.label : '',
                                color: withOpacity(NODE_FADE_COLOR, 0.9),
                                highlighted: false,
                                isPinned,
                                forceLabel: isPinned,
                                alpha: 0.9,
                            };
                        }

                    // Not selected, not neighbor
                    if (isPinned) {
                        return {
                            ...data,
                            color: withOpacity(data.color, 0.9),
                            zIndex: 1,
                            forceLabel: true,
                            isPinned: true,
                            alpha: 0.9,
                        };
                    }

                    return {
                        ...data,
                        zIndex: 0,
                        label: '',
                        color: withOpacity(NODE_FADE_COLOR, 0.9),
                        highlighted: false,
                        isPinned: false,
                        alpha: 0.9,
                    };
                });

                sigma.setSetting('edgeReducer', (edge, data) => {
                    if (graph.hasExtremity(edge, selectedNode) && !data.hidden) {
                        // Check if the other end belongs to the hovered group
                        const source = graph.source(edge);
                        const target = graph.target(edge);
                        const neighborId = source === selectedNode ? target : source;
                        const neighborGroupKey = neighborGroups[neighborId];

                        if (neighborGroupKey === hoveredBarGroup) {
                            return { ...data, color: hoveredGroupColor, size: 2 };
                        }
                        // Edge to neighbor of other group — fade
                        return { ...data, color: EDGE_FADE_COLOR, size: 1 };
                    }
                    return { ...data, color: EDGE_FADE_COLOR, hidden: true };
                });
            } else {
                // No bar segment hovered — normal selected node behavior
                sigma.setSetting('nodeReducer', (node, data) => {
                    const isPinned = shouldHighlightPinned && pinnedSet.has(node);

                        if (node === selectedNode) {
                            return {
                                ...data,
                                color: withOpacity(data.color, 1.0),
                                zIndex: 2,
                                highlighted: true,
                                isPinned,
                                alpha: 1.0,
                            };
                        }
                        if (neighbors.has(node)) {
                            return {
                                ...data,
                                color: withOpacity(data.color, 0.9),
                                zIndex: 1,
                                isPinned,
                                forceLabel: isPinned || data.forceLabel,
                                alpha: 0.9,
                            };
                        }

                    // Not selected, not neighbor
                    if (isPinned) {
                        return {
                            ...data,
                            color: withOpacity(data.color, 0.9),
                            zIndex: 1,
                            forceLabel: true,
                            isPinned: true,
                            alpha: 0.9,
                        };
                    }

                    return {
                        ...data,
                        zIndex: 0,
                        label: '',
                        color: withOpacity(NODE_FADE_COLOR, 0.9),
                        highlighted: false,
                        isPinned: false,
                        alpha: 0.9,
                    };
                });

                sigma.setSetting('edgeReducer', (edge, data) => {
                    if (graph.hasExtremity(edge, selectedNode) && !data.hidden) {
                        return { ...data, color: selectedColor, size: 2 };
                    }
                    return { ...data, color: EDGE_FADE_COLOR, hidden: true };
                });
            }
        } else if (hoveredLegendGroup) {
            // Legend hover: highlight only nodes matching the hovered group
            sigma.setSetting('nodeReducer', (node, data) => {
                const isPinned = shouldHighlightPinned && pinnedSet.has(node);
                const dep = graph.getNodeAttribute(node, 'deputyData');
                const groupKey = getNodeGroupKey(dep, separateBy, graphType, dynamicCommunityMap);
                const isMatch = groupKey === hoveredLegendGroup;

                    if (isMatch) {
                        return {
                            ...data,
                            color: withOpacity(data.color, 0.9),
                            isPinned,
                            forceLabel: isPinned,
                            zIndex: isPinned ? 2 : 1,
                            alpha: 0.9,
                        };
                    }
                    return {
                        ...data,
                        color: withOpacity(NODE_FADE_COLOR, 0.9),
                        label: '',
                        isPinned: false,
                        zIndex: 0,
                        highlighted: false,
                        alpha: 0.9,
                    };
            });
            sigma.setSetting('edgeReducer', (edge, data) => {
                return { ...data, color: EDGE_FADE_COLOR, hidden: true };
            });
        } else {
            // No node selected, no legend hover
            sigma.setSetting('nodeReducer', (node, data) => {
                const isPinned = shouldHighlightPinned && pinnedSet.has(node);
                return {
                    ...data,
                    color: withOpacity(data.color, 0.9),
                    isPinned,
                    forceLabel: isPinned || data.forceLabel,
                    zIndex: isPinned ? 2 : data.zIndex,
                    alpha: 0.9,
                };
            });
            sigma.setSetting('edgeReducer', (edge, data) => {
                const defaultEdgeColor = theme === 'dark' ? '#2d3139' : '#cccccc';
                return {
                    ...data,
                    color: defaultEdgeColor
                };
            });
        }

        sigma.refresh();

        return () => {
            // nodeReducer and edgeReducer are cleared by the next effect or when unmounted
        };
    }, [selectedNode, pinnedIds, highlightPinned, hoveredLegendGroup, hoveredBarGroup, hoveredConnectionNode, separateBy, graphType, dynamicCommunityMap, sigma, graph, theme]);

    return null;
}
