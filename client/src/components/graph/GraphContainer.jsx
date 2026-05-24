import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { SigmaContainer } from '@react-sigma/core';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { random } from 'graphology-layout';
import noverlap from 'graphology-layout-noverlap';
import '@react-sigma/core/lib/style.css';

import { PARTY_COLORS, STATE_COLORS, SEX_COLORS, COLORS, SPACING, FONTS } from '../../constants/theme';
import GraphEventsController from './GraphEventsController';
import GraphSettingsController from './GraphSettingsController';

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

function getCommunityCacheKey(graphType, filters) {
    const algorithm = filters?.communityAlgorithm || 'louvain';
    if (graphType === 'coautoria') {
        const coautoria = filters?.coautoria || { min: 1, max: 999 };
        return `${graphType}-${coautoria.min}-${coautoria.max}-${algorithm}`;
    }
    const voteSimilarity = filters?.voteSimilarity || { min: 80, max: 100 };
    return `${graphType}-${voteSimilarity.min}-${voteSimilarity.max}-${algorithm}`;
}

function getCommunityRequest(graphType, filters) {
    const algorithm = filters?.communityAlgorithm || 'louvain';
    if (graphType === 'coautoria') {
        const coautoria = filters?.coautoria || { min: 1, max: 999 };
        return {
            endpoint: 'http://localhost:8000/api/comunidades-coautoria/',
            params: {
                legislatura: '57',
                min_coautoria: String(coautoria.min),
                max_coautoria: String(coautoria.max),
                algoritmo: algorithm,
            },
        };
    }

    const voteSimilarity = filters?.voteSimilarity || { min: 80, max: 100 };
    return {
        endpoint: 'http://localhost:8000/api/comunidades-votos/',
        params: {
            legislatura: '57',
            min_similaridade: String(voteSimilarity.min),
            max_similaridade: String(voteSimilarity.max),
            algoritmo: algorithm,
        },
    };
}

function getPartyKey(deputy) {
    return deputy?.sigla_partido || deputy?.partido || 'OUTROS';
}

function getCommunityColorMap(graph, graphType, dynamicCommunityMap = null) {
    if (!dynamicCommunityMap) {
        return {};
    }

    const partyCountsByCommunity = {};
    graph.forEachNode((nodeId) => {
        const dep = graph.getNodeAttribute(nodeId, 'deputyData');
        const cId = getCommunityId(dep, graphType, dynamicCommunityMap);
        if (cId == null) return;

        const communityKey = String(cId);
        const partyKey = getPartyKey(dep);
        if (!partyCountsByCommunity[communityKey]) {
            partyCountsByCommunity[communityKey] = {};
        }
        partyCountsByCommunity[communityKey][partyKey] = (partyCountsByCommunity[communityKey][partyKey] || 0) + 1;
    });

    const communityColorMap = {};
    Object.entries(partyCountsByCommunity).forEach(([communityKey, partyCounts]) => {
        const dominantParty = Object.entries(partyCounts)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
        communityColorMap[communityKey] = PARTY_COLORS[dominantParty] || COLORS.textMedium;
    });

    return communityColorMap;
}

/**
 * Retorna a cor de um deputado baseado no critério de separação
 */
function getNodeColor(deputy, separateBy, graphType, dynamicCommunityMap = null, communityColorMap = {}) {
    const partido = getPartyKey(deputy);
    const estado = deputy.sigla_uf || deputy.estado;
    const sexo = deputy.sexo;

    switch (separateBy) {
        case 'partido':
            return PARTY_COLORS[partido] || COLORS.textMedium;
        case 'estado':
            return STATE_COLORS[estado] || COLORS.textMedium;
        case 'sexo':
            return SEX_COLORS[sexo] || COLORS.textMedium;
        case 'comunidade': {
            const cId = getCommunityId(deputy, graphType, dynamicCommunityMap);
            if (cId == null) return COLORS.textMedium;
            return communityColorMap[String(cId)] || COLORS.textMedium;
        }
        default:
            return PARTY_COLORS[partido] || COLORS.textMedium;
    }
}

/**
 * GraphContainer - Componente principal do grafo com React Sigma
 * Props:
 * - filters: { separateBy, onlyActive, presence, voteSimilarity }
 * - selectedNode: id do nó selecionado (string | null)
 * - onNodeClick: callback quando um nó é clicado
 */
export default function GraphContainer({ filters, graphType = 'similaridade', selectedNode, selectedDeputy, onNodeClick, onDeputiesLoaded, onMaxCoautoriaLoaded, onVisibleStatsChanged, pinnedIds = [], highlightPinned = true, hoveredLegendGroup = null, hoveredBarGroup = null, hoveredConnectionNode = null, recalcKey = 0, onLayoutReady }) {
    const graph = useMemo(() => new Graph(), []);
    const sigmaRef = useRef(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [edgesVersion, setEdgesVersion] = useState(0);
    const lastLayoutRef = useRef(null);
    const lastGraphTypeRef = useRef(null);
    const [isComputing, setIsComputing] = useState(true);
    const [progress, setProgress] = useState(0);
    const computeIdRef = useRef(0);
    const communityCacheRef = useRef({});
    const [dynamicCommunities, setDynamicCommunities] = useState(null);
    const [expenseTotals, setExpenseTotals] = useState(null);
    const lastBackboneKeyRef = useRef(null); // tracks backbone state to detect changes

    // Inicializar o grafo uma vez buscando deputados da API
    useEffect(() => {
        let isMounted = true;
        async function loadNodes() {
            try {
                const depReq = await fetch('http://localhost:8000/api/deputados/');
                const deputados = await depReq.json();

                if (!isMounted) return;

                // Adicionar todos os nós
                deputados.forEach((dep) => {
                    if (!graph.hasNode(String(dep.id))) {
                        graph.addNode(String(dep.id), {
                            label: dep.nome,
                            x: Math.random() * 100,
                            y: Math.random() * 100,
                            size: 8,
                            color: getNodeColor(dep, 'partido'),
                            deputyData: dep,
                        });
                    }
                });

                setDataLoaded(true);
                if (onDeputiesLoaded) onDeputiesLoaded(deputados);

            } catch (error) {
                console.error("Erro ao carregar deputados:", error);
            }
        }

        loadNodes();
        return () => { isMounted = false; };
    }, [graph, onDeputiesLoaded]);

    // Carregar arestas quando o tipo de grafo muda
    const loadEdges = useCallback(async (type, backboneConfig = null) => {
        if (graph.order === 0) return;

        // Mostrar loading imediatamente
        setIsComputing(true);
        setProgress(0);

        // Remover todas as arestas atuais
        graph.clearEdges();

        let edgeUrl;
        if (backboneConfig && backboneConfig.enabled) {
            const params = new URLSearchParams({
                metodo: backboneConfig.method,
                tipo_grafo: type === 'coautoria' ? 'coautoria' : 'similaridade',
            });
            edgeUrl = `http://localhost:8000/api/arestas-backbone/?${params.toString()}`;
        } else {
            edgeUrl = type === 'coautoria'
                ? 'http://localhost:8000/api/arestas-coautoria/'
                : 'http://localhost:8000/api/arestas/';
        }

        try {
            const res = await fetch(edgeUrl);
            const arestas = await res.json();
            
            let maxC = 0;

            arestas.forEach((sim) => {
                const n1 = String(sim.deputado_1);
                const n2 = String(sim.deputado_2);
                const edgeId = `${n1}-${n2}`;
                
                // For backbone edges, peso is the weight; for normal edges, use existing fields
                const simVal = Number(sim.similaridade || sim.peso || 0);
                const cVal = Number(sim.coautoria || sim.peso || 0);
                if (cVal > maxC) maxC = cVal;

                if (graph.hasNode(n1) && graph.hasNode(n2) && !graph.hasEdge(edgeId)) {
                    graph.addEdge(n1, n2, {
                        id: edgeId,
                        size: 1,
                        color: COLORS.edgeDefault,
                        similaridade: simVal,
                        coautoria: type === 'coautoria' ? cVal : Number(sim.coautoria || 0),
                    });
                }
            });

            lastGraphTypeRef.current = type;
            // Forçar re-layout após troca de arestas
            lastLayoutRef.current = null;
            if (type === 'coautoria' && onMaxCoautoriaLoaded) {
                onMaxCoautoriaLoaded(maxC > 0 ? maxC : 50);
            }
            setEdgesVersion(v => v + 1);
        } catch (error) {
            console.error("Erro ao carregar arestas:", error);
        }
    }, [graph, onMaxCoautoriaLoaded]);

    // Efeito: carregar arestas quando dados estiverem prontos, graphType mudar, ou backbone mudar
    useEffect(() => {
        if (!dataLoaded) return;
        const backboneEnabled = filters?.backboneEnabled || false;
        const backboneMethod = filters?.backboneMethod || 'high_salience_skeleton';
        const backboneKey = backboneEnabled ? `backbone-${backboneMethod}-${graphType}` : `normal-${graphType}`;

        if (lastBackboneKeyRef.current !== backboneKey) {
            lastBackboneKeyRef.current = backboneKey;
            lastGraphTypeRef.current = graphType;
            loadEdges(graphType, backboneEnabled ? { enabled: true, method: backboneMethod } : null);
        }
    }, [dataLoaded, graphType, filters?.backboneEnabled, filters?.backboneMethod, loadEdges]);

    useEffect(() => {
        if (!dataLoaded || filters?.separateBy !== 'comunidade') {
            setDynamicCommunities(null);
            return;
        }

        const algorithm = filters.communityAlgorithm || 'louvain';
        const cacheKey = getCommunityCacheKey(graphType, filters);

        if (communityCacheRef.current[cacheKey]) {
            setDynamicCommunities(communityCacheRef.current[cacheKey]);
            return;
        }

        let isMounted = true;
        const { endpoint, params } = getCommunityRequest(graphType, filters);
        const query = new URLSearchParams(params);

        async function loadCommunities() {
            try {
                const res = await fetch(`${endpoint}?${query.toString()}`);
                if (!res.ok) {
                    throw new Error(`Erro ${res.status} ao calcular comunidades`);
                }
                const data = await res.json();
                const result = {
                    key: cacheKey,
                    algorithm,
                    comunidades: data.comunidades || {},
                };
                communityCacheRef.current[cacheKey] = result;
                if (isMounted) {
                    setDynamicCommunities(result);
                }
            } catch (error) {
                console.error("Erro ao carregar comunidades dinamicas:", error);
                if (isMounted) {
                    setDynamicCommunities(null);
                }
            }
        }

        loadCommunities();
        return () => { isMounted = false; };
    }, [dataLoaded, graphType, filters]);

    useEffect(() => {
        if (!dataLoaded || filters?.vertexSize !== 'despesas') {
            setExpenseTotals(null);
            return;
        }

        let isMounted = true;
        const category = filters.expenseCategory || 'Todas';
        const year = filters.expenseYear || 'mandato';
        const query = new URLSearchParams({
            categoria: category,
            ano: year
        });

        async function loadExpenses() {
            try {
                const res = await fetch(`http://localhost:8000/api/deputados-despesas-totais/?${query.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setExpenseTotals(data);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar despesas totais para tamanho de vértice:", err);
            }
        }

        loadExpenses();
        return () => { isMounted = false; };
    }, [dataLoaded, filters?.vertexSize, filters?.expenseCategory, filters?.expenseYear]);

    // Função para aplicar layout ao grafo com progresso
    const applyLayout = useCallback((layoutType) => {
        if (graph.order === 0) return;

        const myId = ++computeIdRef.current;
        setIsComputing(true);
        setProgress(0);

        // Run layout in chunked steps via setTimeout so UI can update progress
        const runAsync = () => {
            return new Promise((resolve) => {
                // Step 1: random assign (5%)
                setTimeout(() => {
                    if (computeIdRef.current !== myId) { resolve(); return; }
                    random.assign(graph);
                    setProgress(5);

                    // Step 2: ForceAtlas2 in chunks
                    const TOTAL_ITERATIONS = 200;
                    const CHUNK = 40;
                    const isSpread = layoutType === 'forceatlas2_spread';
                    const inferredSettings = forceAtlas2.inferSettings(graph);
                    const fa2Settings = isSpread
                        ? { ...inferredSettings, gravity: 0.5, scalingRatio: 80, strongGravityMode: false, barnesHutOptimize: true, edgeWeightInfluence: 0.1 }
                        : { ...inferredSettings, gravity: 3, scalingRatio: 10 };

                    let done = 0;
                    const runChunk = () => {
                        if (computeIdRef.current !== myId) { resolve(); return; }
                        const iter = Math.min(CHUNK, TOTAL_ITERATIONS - done);
                        try {
                            forceAtlas2.assign(graph, { iterations: iter, settings: fa2Settings });
                        } catch (e) { console.error('FA2 error:', e); }
                        done += iter;
                        // FA2 progress maps to 5%-80%
                        setProgress(5 + Math.round((done / TOTAL_ITERATIONS) * 75));

                        if (done < TOTAL_ITERATIONS) {
                            setTimeout(runChunk, 0);
                        } else {
                            // Step 3: noverlap (80%-100%)
                            setTimeout(() => {
                                if (computeIdRef.current !== myId) { resolve(); return; }
                                try {
                                    if (isSpread) {
                                        noverlap.assign(graph, { maxIterations: 300, settings: { margin: 180, ratio: 80 } });
                                    } else {
                                        noverlap.assign(graph, { maxIterations: 50, settings: { margin: 1, ratio: 1.2 } });
                                    }
                                } catch (e) { console.error('Noverlap error:', e); }
                                setProgress(100);
                                lastLayoutRef.current = layoutType;
                                setTimeout(() => {
                                    if (computeIdRef.current !== myId) { resolve(); return; }
                                    setIsComputing(false);
                                    if (onLayoutReady) onLayoutReady();
                                    resolve();
                                }, 60);
                            }, 0);
                        }
                    };
                    setTimeout(runChunk, 0);
                }, 0);
            });
        };

        runAsync();
    }, [graph, onLayoutReady]);

    // Aplicar filtros quando mudam
    const applyFilters = useCallback(() => {
        if (!filters || !dataLoaded) return;

        const { separateBy, onlyActive, onlyWithConnections, presence, voteSimilarity, vertexSize, graphLayout } = filters;
        const communityKey = getCommunityCacheKey(graphType, filters);
        const dynamicCommunityMap = dynamicCommunities?.key === communityKey
            ? dynamicCommunities.comunidades
            : null;
        const communityColorMap = getCommunityColorMap(graph, graphType, dynamicCommunityMap);

        // Atualizar nós (cor e visibilidade)
        graph.forEachNode((nodeId) => {
            const dep = graph.getNodeAttribute(nodeId, 'deputyData');
            if (!dep) return;

            // Cor baseada no critério de separação
            const color = getNodeColor(dep, separateBy, graphType, dynamicCommunityMap, communityColorMap);
            graph.setNodeAttribute(nodeId, 'color', color);

            // Visibilidade baseada nos filtros
            let hidden = false;

            // Filtro: apenas em exercício (baseado no campo situacao da tabela deputados_deputado)
            if (onlyActive && dep.situacao && dep.situacao !== 'Exercício') {
                hidden = true;
            }

            // Filtro: presença dentro do range. Se a API real não tiver, ignoramos.
            if (!hidden && dep.presenca !== undefined && (dep.presenca < presence.min || dep.presenca > presence.max)) {
                hidden = true;
            }

            graph.setNodeAttribute(nodeId, 'hidden', hidden);
        });

        // Atualizar arestas baseado no tipo de grafo
        graph.forEachEdge((edgeId, attrs, source, target) => {
            const sourceHidden = graph.getNodeAttribute(source, 'hidden');
            const targetHidden = graph.getNodeAttribute(target, 'hidden');

            let hidden = sourceHidden || targetHidden;

            // Quando backbone está ativo, não filtra por similaridade/coautoria
            if (!hidden && !filters.backboneEnabled) {
                if (graphType === 'coautoria') {
                    // Filtrar por coautorias
                    const coaut = attrs.coautoria || 0;
                    const coautoriaRange = filters.coautoria || { min: 1, max: 999 };
                    hidden = coaut < coautoriaRange.min || coaut > coautoriaRange.max;
                } else {
                    // Filtrar por similaridade
                    const sim = attrs.similaridade;
                    hidden = sim < voteSimilarity.min || sim > voteSimilarity.max;
                }
            }

            graph.setEdgeAttribute(edgeId, 'hidden', hidden);
        });

        // Contar arestas válidas por nó (útil para filtro e tamanho)
        const connectionCounts = {};
        graph.forEachEdge((edgeId, attrs, source, target) => {
            if (attrs.hidden) return;
            connectionCounts[source] = (connectionCounts[source] || 0) + 1;
            connectionCounts[target] = (connectionCounts[target] || 0) + 1;
        });

        // Ocultar nós isolados se o filtro estiver ativo
        if (onlyWithConnections) {
            graph.forEachNode((nodeId) => {
                if (graph.getNodeAttribute(nodeId, 'hidden')) return;
                const count = connectionCounts[nodeId] || 0;
                if (count === 0) {
                    graph.setNodeAttribute(nodeId, 'hidden', true);
                }
            });
        }

        // Aplicar tamanho dos vértices baseado no critério selecionado
        const DEFAULT_SIZE = 8;
        const MIN_SIZE = 4;
        const MAX_SIZE = 20;

        if (vertexSize === 'padrao' || !vertexSize) {
            // Tamanho padrão uniforme
            graph.forEachNode((nodeId) => {
                graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
            });
        } else if (vertexSize === 'presenca') {
            // Tamanho proporcional à presença do deputado
            // Coletar os valores de presença dos nós visíveis para normalizar
            let minPresenca = Infinity;
            let maxPresenca = -Infinity;

            graph.forEachNode((nodeId) => {
                if (graph.getNodeAttribute(nodeId, 'hidden')) return;
                const dep = graph.getNodeAttribute(nodeId, 'deputyData');
                if (dep && dep.presenca !== undefined) {
                    const p = Number(dep.presenca);
                    if (p < minPresenca) minPresenca = p;
                    if (p > maxPresenca) maxPresenca = p;
                }
            });

            // Se não há variação, usar tamanho padrão
            if (minPresenca === Infinity || maxPresenca === minPresenca) {
                graph.forEachNode((nodeId) => {
                    graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                });
            } else {
                const range = maxPresenca - minPresenca;
                graph.forEachNode((nodeId) => {
                    if (graph.getNodeAttribute(nodeId, 'hidden')) {
                        graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                        return;
                    }
                    const dep = graph.getNodeAttribute(nodeId, 'deputyData');
                    if (dep && dep.presenca !== undefined) {
                        const normalized = (Number(dep.presenca) - minPresenca) / range;
                        const size = MIN_SIZE + normalized * (MAX_SIZE - MIN_SIZE);
                        graph.setNodeAttribute(nodeId, 'size', size);
                    } else {
                        graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                    }
                });
            }
        } else if (vertexSize === 'conexoes') {
            // Tamanho proporcional ao número de arestas visíveis conectadas ao nó (já calculado acima)

            // Encontrar min e max para normalizar
            let minConn = Infinity;
            let maxConn = -Infinity;
            graph.forEachNode((nodeId) => {
                if (graph.getNodeAttribute(nodeId, 'hidden')) return;
                const count = connectionCounts[nodeId] || 0;
                if (count < minConn) minConn = count;
                if (count > maxConn) maxConn = count;
            });

            if (minConn === Infinity || maxConn === minConn) {
                graph.forEachNode((nodeId) => {
                    graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                });
            } else {
                const range = maxConn - minConn;
                graph.forEachNode((nodeId) => {
                    if (graph.getNodeAttribute(nodeId, 'hidden')) {
                        graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                        return;
                    }
                    const count = connectionCounts[nodeId] || 0;
                    const normalized = (count - minConn) / range;
                    const size = MIN_SIZE + normalized * (MAX_SIZE - MIN_SIZE);
                    graph.setNodeAttribute(nodeId, 'size', size);
                });
            }
        } else if (vertexSize === 'despesas' && expenseTotals) {
            // Tamanho proporcional à despesa acumulada do deputado
            let minExpense = Infinity;
            let maxExpense = -Infinity;

            graph.forEachNode((nodeId) => {
                if (graph.getNodeAttribute(nodeId, 'hidden')) return;
                const total = expenseTotals[nodeId] || 0;
                if (total < minExpense) minExpense = total;
                if (total > maxExpense) maxExpense = total;
            });

            if (minExpense === Infinity || maxExpense === minExpense) {
                graph.forEachNode((nodeId) => {
                    graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                });
            } else {
                const range = maxExpense - minExpense;
                graph.forEachNode((nodeId) => {
                    if (graph.getNodeAttribute(nodeId, 'hidden')) {
                        graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                        return;
                    }
                    const total = expenseTotals[nodeId] || 0;
                    const normalized = (total - minExpense) / range;
                    const size = MIN_SIZE + normalized * (MAX_SIZE - MIN_SIZE);
                    graph.setNodeAttribute(nodeId, 'size', size);
                });
            }
        }

        // Aplicar layout se mudou
        const layoutToApply = graphLayout || 'forceatlas2';
        if (lastLayoutRef.current !== layoutToApply) {
            setTimeout(() => applyLayout(layoutToApply), 50);
        } else {
            // Filters changed but layout didn't — still show computing briefly
            setIsComputing(true);
            setProgress(50);
            setTimeout(() => {
                setProgress(100);
                setTimeout(() => setIsComputing(false), 80);
            }, 80);
        }

        // Compute visible stats for legend
        if (onVisibleStatsChanged) {
            const groupCounts = {};
            const groupColors = {};
            let totalVisible = 0;
            graph.forEachNode((nodeId) => {
                if (graph.getNodeAttribute(nodeId, 'hidden')) return;
                totalVisible++;
                const dep = graph.getNodeAttribute(nodeId, 'deputyData');
                if (!dep) return;
                let groupKey;
                switch (separateBy) {
                    case 'partido':
                        groupKey = dep.sigla_partido || dep.partido || 'OUTROS';
                        break;
                    case 'estado':
                        groupKey = dep.sigla_uf || dep.estado || 'Outros';
                        break;
                    case 'sexo':
                        groupKey = dep.sexo || 'O';
                        break;
                    case 'comunidade': {
                        const cId = getCommunityId(dep, graphType, dynamicCommunityMap);
                        groupKey = cId != null ? String(cId) : 'sem_comunidade';
                        break;
                    }
                    default:
                        groupKey = dep.sigla_partido || dep.partido || 'OUTROS';
                }
                groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
                if (!groupColors[groupKey]) {
                    groupColors[groupKey] = graph.getNodeAttribute(nodeId, 'color') || COLORS.textMedium;
                }
            });
            onVisibleStatsChanged({ separateBy, groupCounts, groupColors, totalVisible });
        }
    }, [graph, filters, dataLoaded, applyLayout, graphType, edgesVersion, onVisibleStatsChanged, dynamicCommunities, expenseTotals]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    // Aplicar layout inicial quando dados carregam
    useEffect(() => {
        if (dataLoaded && !lastLayoutRef.current) {
            setTimeout(() => applyLayout('forceatlas2_clusters'), 50);
        }
    }, [dataLoaded, applyLayout]);

    // Recalcular layout quando recalcKey muda (botão de recalcular)
    useEffect(() => {
        if (recalcKey > 0 && dataLoaded) {
            const layoutToApply = filters.graphLayout || 'forceatlas2_clusters';
            lastLayoutRef.current = null; // force recalc
            setTimeout(() => applyLayout(layoutToApply, true), 50);
        }
    }, [recalcKey]); // intentionally minimal deps

    const containerStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        backgroundColor: COLORS.backgroundLight,
    };

    const sigmaSettings = useMemo(
        () => ({
            labelDensity: 0.07,
            labelGridCellSize: 60,
            labelRenderedSizeThreshold: 10,
            labelFont: "'Inter', sans-serif",
            labelColor: { color: COLORS.textDark },
            defaultEdgeType: 'line',
            renderEdgeLabels: false,
            zoomingRatio: 1.15,
            zIndex: true,
            minCameraRatio: 0.2,
            maxCameraRatio: 5,
            drawLabel: (context, data, settings) => {
                if (!data.label) return;

                // 1. Draw standard label
                const size = settings.labelSize;
                const font = settings.labelFont;
                const weight = settings.labelWeight;
                context.font = `${weight} ${size}px ${font}`;
                context.fillStyle = settings.labelColor.color;
                context.fillText(data.label, data.x + data.size + 3, data.y + size / 3);

                // 2. Pinned decorations
                if (data.isPinned) {
                    const BORDER_SIZE = 3;
                    // Orange border
                    context.beginPath();
                    context.arc(data.x, data.y, data.size + BORDER_SIZE / 2, 0, Math.PI * 2);
                    context.strokeStyle = COLORS.orange;
                    context.lineWidth = BORDER_SIZE;
                    context.stroke();

                    // Pin icon
                    const s = data.size * 0.5;
                    context.save();
                    context.translate(data.x, data.y);
                    
                    // Pin body
                    context.beginPath();
                    context.arc(0, -s * 0.15, s * 0.45, 0, Math.PI * 2);
                    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    context.fill();

                    // Pin needle
                    context.beginPath();
                    context.moveTo(0, s * 0.25);
                    context.lineTo(0, s * 0.65);
                    context.strokeStyle = 'rgba(255, 255, 255, 0.95)';
                    context.lineWidth = s * 0.15;
                    context.lineCap = 'round';
                    context.stroke();

                    // Pin head outline
                    context.beginPath();
                    context.arc(0, -s * 0.15, s * 0.45, 0, Math.PI * 2);
                    context.strokeStyle = COLORS.orange;
                    context.lineWidth = s * 0.12;
                    context.stroke();
                    
                    context.restore();
                }
            }
        }),
        [],
    );

    const handleNodeClick = useCallback(
        (nodeId) => {
            if (nodeId === null) {
                onNodeClick(null);
                return;
            }
            const dep = graph.getNodeAttribute(nodeId, 'deputyData');
            const color = graph.getNodeAttribute(nodeId, 'color');
            if (dep) {
                // Count visible edges connected to this node
                let conexoes = 0;
                graph.forEachEdge(nodeId, (edgeId) => {
                    if (!graph.getEdgeAttribute(edgeId, 'hidden')) {
                        conexoes++;
                    }
                });
                // Find max connections among all visible nodes
                let maxConexoes = 0;
                graph.forEachNode((nId) => {
                    if (graph.getNodeAttribute(nId, 'hidden')) return;
                    let count = 0;
                    graph.forEachEdge(nId, (eId) => {
                        if (!graph.getEdgeAttribute(eId, 'hidden')) count++;
                    });
                    if (count > maxConexoes) maxConexoes = count;
                });

                // Compute connection breakdown by group (partido/estado/sexo)
                const separateBy = filters.separateBy || 'partido';
                const communityKey = getCommunityCacheKey(graphType, filters);
                const dynamicCommunityMap = dynamicCommunities?.key === communityKey
                    ? dynamicCommunities.comunidades
                    : null;
                const connectionBreakdown = {};
                const connectionsList = [];
                graph.forEachEdge(nodeId, (edgeId, attrs, source, target) => {
                    if (graph.getEdgeAttribute(edgeId, 'hidden')) return;
                    const neighborId = source === nodeId ? target : source;
                    const neighborDep = graph.getNodeAttribute(neighborId, 'deputyData');
                    if (!neighborDep) return;
                    const neighborColor = graph.getNodeAttribute(neighborId, 'color');
                    let groupKey;
                    switch (separateBy) {
                        case 'partido':
                            groupKey = neighborDep.sigla_partido || neighborDep.partido || 'OUTROS';
                            break;
                        case 'estado':
                            groupKey = neighborDep.sigla_uf || neighborDep.estado || 'Outros';
                            break;
                        case 'sexo':
                            groupKey = neighborDep.sexo || 'O';
                            break;
                        case 'comunidade': {
                            const cId = getCommunityId(neighborDep, graphType, dynamicCommunityMap);
                            groupKey = cId != null ? String(cId) : 'sem_comunidade';
                            break;
                        }
                        default:
                            groupKey = neighborDep.sigla_partido || neighborDep.partido || 'OUTROS';
                    }
                    connectionBreakdown[groupKey] = (connectionBreakdown[groupKey] || 0) + 1;

                    // Build connections list entry
                    connectionsList.push({
                        id: neighborDep.id,
                        nodeId: neighborId,
                        nome: neighborDep.nome,
                        sigla_partido: neighborDep.sigla_partido || neighborDep.partido,
                        nodeColor: neighborColor,
                        similaridade: attrs.similaridade || 0,
                        coautoria: attrs.coautoria || 0,
                    });
                });

                onNodeClick({ ...dep, nodeColor: color, nodeId, conexoes, maxConexoes, connectionBreakdown, connectionsList, graphType });
            }
        },
        [graph, onNodeClick, filters, graphType, dynamicCommunities],
    );

    useEffect(() => {
        if (selectedNode && dataLoaded && !isComputing) {
            const isFullyLoaded = selectedDeputy &&
                String(selectedDeputy.id) === selectedNode &&
                selectedDeputy.connectionsList !== undefined &&
                selectedDeputy.nodeColor !== undefined &&
                selectedDeputy.graphType === graphType;

            if (!isFullyLoaded && graph.hasNode(selectedNode)) {
                handleNodeClick(selectedNode);
            }
        }
    }, [selectedNode, selectedDeputy, dataLoaded, isComputing, graph, graphType, handleNodeClick]);

    const loadingOverlayStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
        zIndex: 5,
        gap: SPACING.lg,
    };

    const progressBarOuter = {
        width: '260px',
        height: '6px',
        borderRadius: '3px',
        backgroundColor: COLORS.borderLight,
        overflow: 'hidden',
    };

    const progressBarInner = {
        height: '100%',
        width: `${progress}%`,
        backgroundColor: COLORS.orange,
        borderRadius: '3px',
        transition: 'width 0.2s ease',
    };

    const activeCommunityKey = getCommunityCacheKey(graphType, filters);
    const activeDynamicCommunityMap = dynamicCommunities?.key === activeCommunityKey
        ? dynamicCommunities.comunidades
        : null;
    const showLoading = !dataLoaded || isComputing;

    return (
        <div style={containerStyle}>
            {dataLoaded && (
                <SigmaContainer
                    ref={sigmaRef}
                    graph={graph}
                    settings={sigmaSettings}
                    style={{ width: '100%', height: '100%', visibility: isComputing ? 'hidden' : 'visible' }}
                >
                    <GraphEventsController setSelectedNode={handleNodeClick} />
                    <GraphSettingsController selectedNode={selectedNode} pinnedIds={pinnedIds} highlightPinned={highlightPinned} hoveredLegendGroup={hoveredLegendGroup} hoveredBarGroup={hoveredBarGroup} hoveredConnectionNode={hoveredConnectionNode} separateBy={filters.separateBy} graphType={graphType} dynamicCommunityMap={activeDynamicCommunityMap} />
                </SigmaContainer>
            )}
            {showLoading && (
                <div style={loadingOverlayStyle}>
                    <span style={{ fontFamily: FONTS.family, fontSize: FONTS.sizeLg, fontWeight: FONTS.weightSemibold, color: COLORS.textMedium }}>
                        Carregando...
                    </span>
                    <div style={progressBarOuter}>
                        <div style={progressBarInner} />
                    </div>
                    <span style={{ fontFamily: FONTS.family, fontSize: FONTS.sizeXs, color: COLORS.textLight }}>
                        {progress}%
                    </span>
                </div>
            )}
        </div>
    );
}
