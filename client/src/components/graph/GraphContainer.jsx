import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { SigmaContainer, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { random } from 'graphology-layout';
import noverlap from 'graphology-layout-noverlap';
import '@react-sigma/core/lib/style.css';

import { NodeCircleProgram } from 'sigma/rendering';

import { PARTY_COLORS, STATE_COLORS, SEX_COLORS, COLORS, SPACING, FONTS } from '../../constants/theme';
import GraphEventsController from './GraphEventsController';
import GraphSettingsController from './GraphSettingsController';

class PinnedNodeProgram extends NodeCircleProgram {
    drawLabel(context, data, settings) {
        if (!data.label) return;

        // 1. Pinned decorations (drawn FIRST so they sit behind the label text)
        const isPinned = window.highlightPinned && window.pinnedLabels && window.pinnedLabels.has(data.label);
        if (isPinned) {
            // Circulo amarelado claro em volta do vertice (Halo de Destaque)
            const HALO_SIZE = 6;
            context.beginPath();
            context.arc(data.x, data.y, data.size + HALO_SIZE, 0, Math.PI * 2);
            context.strokeStyle = 'rgba(253, 224, 71, 0.8)';
            context.lineWidth = HALO_SIZE;
            context.stroke();
        }

        // 2. Draw standard label text (drawn LAST so it is on top of any highlights)
        const size = settings.labelSize;
        const font = settings.labelFont;
        const weight = settings.labelWeight;
        context.font = `${weight} ${size}px ${font}`;
        context.fillStyle = settings.labelColor.color;
        context.fillText(data.label, data.x + data.size + 3, data.y + size / 3);
    }
}

const SigmaInstanceListener = ({ onSigmaReady }) => {
    const sigma = useSigma();
    useEffect(() => {
        if (onSigmaReady) {
            onSigmaReady(sigma);
        }
        return () => {
            if (onSigmaReady) onSigmaReady(null);
        };
    }, [sigma, onSigmaReady]);
    return null;
};

/**
 * Calcula a centralidade de proximidade (Closeness Centrality) não ponderada
 * para todos os nós visíveis do grafo usando busca em largura (BFS).
 * Usa a fórmula com wf_improved=True do NetworkX:
 * C(u) = (n-1)/(N-1) * (n-1)/sum(d(v,u))
 */
function computeClosenessCentrality(graph) {
    const visibleNodes = [];
    graph.forEachNode((nodeId) => {
        if (!graph.getNodeAttribute(nodeId, 'hidden')) {
            visibleNodes.push(nodeId);
        }
    });

    const N = visibleNodes.length;
    const centrality = {};

    if (N <= 1) {
        visibleNodes.forEach(nodeId => {
            centrality[nodeId] = 0;
        });
        return centrality;
    }

    // Construir lista de adjacência de nós visíveis
    const adj = {};
    visibleNodes.forEach(nodeId => {
        adj[nodeId] = [];
    });

    graph.forEachEdge((edgeId, attrs, source, target) => {
        if (attrs.hidden) return;
        if (!graph.getNodeAttribute(source, 'hidden') && !graph.getNodeAttribute(target, 'hidden')) {
            adj[source].push(target);
            adj[target].push(source);
        }
    });

    for (let i = 0; i < N; i++) {
        const startNode = visibleNodes[i];
        const distances = {};
        distances[startNode] = 0;
        const queue = [startNode];
        let head = 0;

        while (head < queue.length) {
            const u = queue[head++];
            const distU = distances[u];
            const neighbors = adj[u] || [];
            for (let j = 0; j < neighbors.length; j++) {
                const v = neighbors[j];
                if (distances[v] === undefined) {
                    distances[v] = distU + 1;
                    queue.push(v);
                }
            }
        }

        const n = queue.length; // Componente conectado alcançável
        if (n <= 1) {
            centrality[startNode] = 0;
        } else {
            let sumDistances = 0;
            for (let j = 0; j < n; j++) {
                sumDistances += distances[queue[j]];
            }
            centrality[startNode] = ((n - 1) / (N - 1)) * ((n - 1) / sumDistances);
        }
    }

    return centrality;
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
            endpoint: '/api/comunidades-coautoria/',
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
        endpoint: '/api/comunidades-votos/',
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
const GraphContainer = memo(function GraphContainer({ theme = 'light', filters, graphType = 'similaridade', selectedNode, selectedDeputy, onNodeClick, onDeputiesLoaded, onMaxCoautoriaLoaded, onVisibleStatsChanged, pinnedIds = [], highlightPinned = true, hoveredLegendGroup = null, hoveredBarGroup = null, hoveredConnectionNode = null, recalcKey = 0, onLayoutReady, onSigmaReady }) {
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
    const [speechTotals, setSpeechTotals] = useState(null);
    const [proposalTotals, setProposalTotals] = useState(null);
    const lastBackboneKeyRef = useRef(null); // tracks backbone state to detect changes
    const loadingEdgesRef = useRef(false); // previne applyFilters de rodar durante carregamento de arestas

    // Inicializar o grafo uma vez buscando deputados da API
    useEffect(() => {
        let isMounted = true;
        async function loadNodes() {
            try {
                const depReq = await fetch('/api/deputados/');
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
    const loadEdges = useCallback(async (type, backboneConfig = null, advancedFilters = null) => {
        if (graph.order === 0) return;

        // Mostrar loading imediatamente
        setIsComputing(true);
        setProgress(0);

        // Marcar que estamos carregando arestas (impede applyFilters de rodar em grafo vazio)
        loadingEdgesRef.current = true;

        // Remover todas as arestas atuais
        graph.clearEdges();

        let edgeUrl;
        if (backboneConfig && backboneConfig.enabled) {
            if (advancedFilters) {
                const params = new URLSearchParams({
                    tipo_grafo: type === 'coautoria' ? 'coautoria' : 'similaridade',
                    metodo: backboneConfig.method,
                    legislatura: '57',
                });
                if (type === 'coautoria') {
                    params.append('min_autores', String(advancedFilters.coautoresRange?.min || 2));
                    params.append('max_autores', String(advancedFilters.coautoresRange?.max || 999));
                    params.append('tipos_proposicao', (advancedFilters.proposalTypes || ['PL']).join(','));
                } else if (type === 'similaridade' && advancedFilters.polarizacaoRange) {
                    params.append('max_polarizacao', String(advancedFilters.polarizacaoRange.max / 100));
                }
                edgeUrl = `/api/arestas-backbone-filtrada/?${params.toString()}`;
            } else {
                const params = new URLSearchParams({
                    metodo: backboneConfig.method,
                    tipo_grafo: type === 'coautoria' ? 'coautoria' : 'similaridade',
                });
                edgeUrl = `/api/arestas-backbone/?${params.toString()}`;
            }
        } else if (advancedFilters) {
            // Usar endpoints filtrados quando filtros avançados estão ativos
            if (type === 'coautoria') {
                const params = new URLSearchParams({
                    legislatura: '57',
                    min_autores: String(advancedFilters.coautoresRange?.min || 2),
                    max_autores: String(advancedFilters.coautoresRange?.max || 999),
                    tipos_proposicao: (advancedFilters.proposalTypes || ['PL']).join(','),
                });
                edgeUrl = `/api/arestas-coautoria-filtrada/?${params.toString()}`;
            } else if (type === 'similaridade' && advancedFilters.polarizacaoRange) {
                const params = new URLSearchParams({
                    legislatura: '57',
                    max_polarizacao: String(advancedFilters.polarizacaoRange.max / 100), // converter % para fração
                });
                edgeUrl = `/api/arestas-similaridade-filtrada/?${params.toString()}`;
            } else {
                edgeUrl = type === 'coautoria'
                    ? '/api/arestas-coautoria/'
                    : '/api/arestas/';
            }
        } else {
            edgeUrl = type === 'coautoria'
                ? '/api/arestas-coautoria/'
                : '/api/arestas/';
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
        } finally {
            loadingEdgesRef.current = false;
        }
    }, [graph, onMaxCoautoriaLoaded]);

    // Efeito: carregar arestas quando dados estiverem prontos, graphType mudar, backbone mudar, ou filtros avançados mudarem
    useEffect(() => {
        if (!dataLoaded) return;
        const backboneEnabled = filters?.backboneEnabled || false;
        const backboneMethod = filters?.backboneMethod || 'lans';

        // Detectar se filtros avançados estão ativos (valores diferentes do padrão)
        const coautoresRange = filters?.coautoresRange || { min: 2, max: 333 };
        const polarizacaoRange = filters?.polarizacaoRange || { min: 50, max: 100 };
        const proposalTypes = filters?.proposalTypes || ['PL'];

        const hasCoautoresFilter = graphType === 'coautoria' && (coautoresRange.min !== 2 || coautoresRange.max !== 333);
        const hasPolarizacaoFilter = graphType === 'similaridade' && polarizacaoRange.max < 100;
        const hasProposalTypesFilter = graphType === 'coautoria' && (proposalTypes.length !== 1 || proposalTypes[0] !== 'PL');
        const hasAdvancedFilter = hasCoautoresFilter || hasPolarizacaoFilter || hasProposalTypesFilter;

        // Construir chave que inclui filtros avançados
        let edgeKey;
        if (backboneEnabled) {
            if (hasAdvancedFilter) {
                if (graphType === 'coautoria') {
                    edgeKey = `backbone-${backboneMethod}-coautoria-filtered-${coautoresRange.min}-${coautoresRange.max}-${proposalTypes.join('-')}`;
                } else {
                    edgeKey = `backbone-${backboneMethod}-similaridade-filtered-pol${polarizacaoRange.max}`;
                }
            } else {
                edgeKey = `backbone-${backboneMethod}-${graphType}`;
            }
        } else if (hasAdvancedFilter) {
            if (graphType === 'coautoria') {
                edgeKey = `filtered-coautoria-${coautoresRange.min}-${coautoresRange.max}-${proposalTypes.join('-')}`;
            } else {
                edgeKey = `filtered-similaridade-pol${polarizacaoRange.max}`;
            }
        } else {
            edgeKey = `normal-${graphType}`;
        }

        if (lastBackboneKeyRef.current !== edgeKey) {
            lastBackboneKeyRef.current = edgeKey;
            lastGraphTypeRef.current = graphType;

            const backboneConfig = backboneEnabled ? { enabled: true, method: backboneMethod } : null;
            const advancedFilters = hasAdvancedFilter
                ? { coautoresRange, polarizacaoRange, proposalTypes }
                : null;

            loadEdges(graphType, backboneConfig, advancedFilters);
        }
    }, [dataLoaded, graphType, filters?.backboneEnabled, filters?.backboneMethod, filters?.coautoresRange, filters?.polarizacaoRange, filters?.proposalTypes, loadEdges]);

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
                const res = await fetch(`/api/deputados-despesas-totais/?${query.toString()}`);
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

    useEffect(() => {
        if (!dataLoaded || filters?.vertexSize !== 'discursos') {
            setSpeechTotals(null);
            return;
        }

        let isMounted = true;

        async function loadSpeeches() {
            try {
                const res = await fetch('/api/deputados-discursos-totais/');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setSpeechTotals(data);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar discursos totais para tamanho de vértice:", err);
            }
        }

        loadSpeeches();
        return () => { isMounted = false; };
    }, [dataLoaded, filters?.vertexSize]);

    useEffect(() => {
        if (!dataLoaded || filters?.vertexSize !== 'proposicoes') {
            setProposalTotals(null);
            return;
        }

        let isMounted = true;
        const type = filters.proposalType || 'PL+PLP+PEC';
        const query = new URLSearchParams({ tipo: type });

        async function loadProposals() {
            try {
                const res = await fetch(`/api/deputados-proposicoes-totais/?${query.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setProposalTotals(data);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar proposições totais para tamanho de vértice:", err);
            }
        }

        loadProposals();
        return () => { isMounted = false; };
    }, [dataLoaded, filters?.vertexSize, filters?.proposalType]);

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
                        : { ...inferredSettings, gravity: 3, scalingRatio: 10, edgeWeightInfluence: 1 };

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
        // Não rodar applyFilters enquanto arestas estão sendo carregadas;
        // quando loadEdges terminar, edgesVersion vai incrementar e applyFilters roda de novo.
        if (loadingEdgesRef.current) return;

        const { separateBy, onlyActive, onlyWithConnections, presence, voteSimilarity, vertexSize, graphLayout } = filters;
        const communityKey = getCommunityCacheKey(graphType, filters);

        // Se separar por comunidade, esperar as comunidades carregarem para evitar visualização cinza temporária
        if (separateBy === 'comunidade') {
            if (!dynamicCommunities || dynamicCommunities.key !== communityKey) {
                setIsComputing(true);
                return;
            }
        }

        // Se usar tamanho por despesas/discursos/proposições, esperar carregar para evitar double-render/tamanho errado
        if (vertexSize === 'despesas' && !expenseTotals) {
            setIsComputing(true);
            return;
        }
        if (vertexSize === 'discursos' && !speechTotals) {
            setIsComputing(true);
            return;
        }
        if (vertexSize === 'proposicoes' && !proposalTotals) {
            setIsComputing(true);
            return;
        }

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

        // Setar peso das arestas para ForceAtlas2:
        // Arestas escondidas recebem weight=0 para que o FA2 as ignore no layout.
        // Arestas visíveis recebem peso proporcional ao valor (similaridade/coautoria).
        graph.forEachEdge((edgeId, attrs) => {
            if (attrs.hidden) {
                graph.setEdgeAttribute(edgeId, 'weight', 0);
            } else {
                const w = graphType === 'coautoria'
                    ? (attrs.coautoria || 1)
                    : ((attrs.similaridade || 0) / 100);
                graph.setEdgeAttribute(edgeId, 'weight', w);
            }
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
        } else if (vertexSize === 'centralidade') {
            // Tamanho baseado no ranking de centralidade no grafo atual para garantir contraste visual
            const centralityMap = computeClosenessCentrality(graph);
            const visibleNodesList = [];
            graph.forEachNode((nodeId) => {
                if (!graph.getNodeAttribute(nodeId, 'hidden')) {
                    visibleNodesList.push(nodeId);
                }
            });

            const N = visibleNodesList.length;
            if (N <= 1) {
                graph.forEachNode((nodeId) => {
                    graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                });
            } else {
                // Ordenar nós por valor de centralidade (crescente)
                const sortedByCentrality = visibleNodesList
                    .map(nodeId => ({ nodeId, val: centralityMap[nodeId] || 0 }))
                    .sort((a, b) => a.val - b.val);

                // Atribuir tamanhos baseados na posição ordenada (ranking) com escala quadrática
                // para dar maior destaque e diferenciação visual aos líderes do ranking
                sortedByCentrality.forEach((item, index) => {
                    const normalized = index / (N - 1);
                    const scaled = Math.pow(normalized, 2);
                    const size = MIN_SIZE + scaled * (MAX_SIZE - MIN_SIZE);
                    graph.setNodeAttribute(item.nodeId, 'size', size);
                });

                // Definir tamanho padrão para nós ocultos
                graph.forEachNode((nodeId) => {
                    if (graph.getNodeAttribute(nodeId, 'hidden')) {
                        graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                    }
                });
            }
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
        } else if (vertexSize === 'discursos' && speechTotals) {
            // Tamanho proporcional à quantidade de discursos no mandato
            let minSpeech = Infinity;
            let maxSpeech = -Infinity;

            graph.forEachNode((nodeId) => {
                if (graph.getNodeAttribute(nodeId, 'hidden')) return;
                const total = speechTotals[nodeId] || 0;
                if (total < minSpeech) minSpeech = total;
                if (total > maxSpeech) maxSpeech = total;
            });

            if (minSpeech === Infinity || maxSpeech === minSpeech) {
                graph.forEachNode((nodeId) => {
                    graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                });
            } else {
                const range = maxSpeech - minSpeech;
                graph.forEachNode((nodeId) => {
                    if (graph.getNodeAttribute(nodeId, 'hidden')) {
                        graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                        return;
                    }
                    const total = speechTotals[nodeId] || 0;
                    const normalized = (total - minSpeech) / range;
                    const size = MIN_SIZE + normalized * (MAX_SIZE - MIN_SIZE);
                    graph.setNodeAttribute(nodeId, 'size', size);
                });
            }
        } else if (vertexSize === 'proposicoes' && proposalTotals) {
            // Tamanho proporcional à quantidade de proposições no mandato (filtradas pelo tipo)
            let minProp = Infinity;
            let maxProp = -Infinity;

            graph.forEachNode((nodeId) => {
                if (graph.getNodeAttribute(nodeId, 'hidden')) return;
                const total = proposalTotals[nodeId] || 0;
                if (total < minProp) minProp = total;
                if (total > maxProp) maxProp = total;
            });

            if (minProp === Infinity || maxProp === minProp) {
                graph.forEachNode((nodeId) => {
                    graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                });
            } else {
                const range = maxProp - minProp;
                graph.forEachNode((nodeId) => {
                    if (graph.getNodeAttribute(nodeId, 'hidden')) {
                        graph.setNodeAttribute(nodeId, 'size', DEFAULT_SIZE);
                        return;
                    }
                    const total = proposalTotals[nodeId] || 0;
                    const normalized = (total - minProp) / range;
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
            const groupDetails = {};
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

                if (separateBy === 'comunidade') {
                    if (!groupDetails[groupKey]) {
                        groupDetails[groupKey] = { partyCounts: {}, total: 0 };
                    }
                    const party = dep.sigla_partido || dep.partido || 'OUTROS';
                    groupDetails[groupKey].partyCounts[party] = (groupDetails[groupKey].partyCounts[party] || 0) + 1;
                    groupDetails[groupKey].total += 1;
                }
            });
            onVisibleStatsChanged({ separateBy, groupCounts, groupColors, totalVisible, groupDetails });
        }
    }, [graph, filters, dataLoaded, applyLayout, graphType, onVisibleStatsChanged, dynamicCommunities, expenseTotals, speechTotals, proposalTotals]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters, edgesVersion]);

    // Recalcular layout quando recalcKey muda (botão de recalcular)
    useEffect(() => {
        if (recalcKey > 0 && dataLoaded) {
            const layoutToApply = filters.graphLayout || 'forceatlas2_clusters';
            lastLayoutRef.current = null; // force recalc
            setTimeout(() => applyLayout(layoutToApply, true), 50);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            nodeProgramClasses: {
                circle: PinnedNodeProgram,
            },
            labelDensity: 0.07,
            labelGridCellSize: 60,
            labelRenderedSizeThreshold: 10,
            labelFont: "'Inter', sans-serif",
            labelColor: { color: '#2d2d2d' },
            defaultEdgeType: 'line',
            renderEdgeLabels: false,
            zoomingRatio: 1.15,
            zIndex: true,
            minCameraRatio: 0.2,
            maxCameraRatio: 5,
            defaultDrawNodeHover: (context, data, settings) => {
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

                const isDark = document.documentElement.classList.contains('dark') || 
                               document.documentElement.getAttribute('data-theme') === 'dark';

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

                // 4.5. Pinned decorations inside hover
                const isPinned = window.highlightPinned && window.pinnedLabels && window.pinnedLabels.has(data.label);
                if (isPinned) {
                    // Circulo amarelado claro em volta do vertice (Halo de Destaque)
                    const HALO_SIZE = 6;
                    context.beginPath();
                    context.arc(x, y, size + HALO_SIZE, 0, Math.PI * 2);
                    context.strokeStyle = 'rgba(253, 224, 71, 0.8)';
                    context.lineWidth = HALO_SIZE;
                    context.stroke();
                }

                // 5. Draw label text
                context.fillStyle = isDark ? '#ffffff' : '#2d2d2d';
                context.fillText(data.label, boxX + 5, y + fontSize / 3);
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

                // Calcular Centralidade de Proximidade (Closeness Centrality) dinamicamente para todos os nós visíveis
                const centralityMap = computeClosenessCentrality(graph);
                const sortedNodes = Object.entries(centralityMap)
                    .map(([id, val]) => ({ id, val }))
                    .sort((a, b) => b.val - a.val);
                const rankIndex = sortedNodes.findIndex(item => item.id === nodeId);
                const rank = rankIndex !== -1 ? rankIndex + 1 : null;
                const totalVisible = sortedNodes.length;
                const closenessCentrality = centralityMap[nodeId] || 0;

                const graphStateKey = `${graphType}-${edgesVersion}-${JSON.stringify(filters)}`;

                onNodeClick({
                    ...dep,
                    nodeColor: color,
                    nodeId,
                    conexoes,
                    maxConexoes,
                    connectionBreakdown,
                    connectionsList,
                    graphType,
                    closenessCentrality,
                    centralityRank: rank,
                    totalVisibleNodes: totalVisible,
                    graphStateKey
                });
            }
        },
        [graph, onNodeClick, filters, graphType, dynamicCommunities, edgesVersion],
    );

    useEffect(() => {
        if (selectedNode && dataLoaded && !isComputing) {
            const graphStateKey = `${graphType}-${edgesVersion}-${JSON.stringify(filters)}`;
            const isFullyLoaded = selectedDeputy &&
                String(selectedDeputy.id) === selectedNode &&
                selectedDeputy.connectionsList !== undefined &&
                selectedDeputy.nodeColor !== undefined &&
                selectedDeputy.graphStateKey === graphStateKey;

            if (!isFullyLoaded && graph.hasNode(selectedNode)) {
                handleNodeClick(selectedNode);
            }
        }
    }, [selectedNode, selectedDeputy, dataLoaded, isComputing, graph, graphType, handleNodeClick, filters, edgesVersion]);

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
                    <SigmaInstanceListener onSigmaReady={onSigmaReady} />
                    <GraphEventsController setSelectedNode={handleNodeClick} />
                    <GraphSettingsController theme={theme} selectedNode={selectedNode} pinnedIds={pinnedIds} highlightPinned={highlightPinned} hoveredLegendGroup={hoveredLegendGroup} hoveredBarGroup={hoveredBarGroup} hoveredConnectionNode={hoveredConnectionNode} separateBy={filters.separateBy} graphType={graphType} dynamicCommunityMap={activeDynamicCommunityMap} />
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
});

export default GraphContainer;
