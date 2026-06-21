import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import FiltersPanel from '../components/FiltersPanel';
import InfoFrame from '../components/layout/InfoFrame';
import DeputyCard from '../components/DeputyCard';
import DeputyProfile from '../components/DeputyProfile';
import PinnedPanel from '../components/PinnedPanel';
import LegendPanel from '../components/LegendPanel';
import GraphContainer from '../components/graph/GraphContainer';
import Frame from '../components/Frame';
import Tooltip from '../components/Tooltip';
import { COLORS, SPACING, FONTS, PARTY_COLORS, STATE_COLORS, SEX_COLORS } from '../constants/theme';
import { useIsMobile } from '../utils/useIsMobile';

const PINNED_STORAGE_KEY = 'prisma_politico_pinned';

const SEX_LABELS = { M: 'Masculino', F: 'Feminino', O: 'Outro' };

function loadPinnedFromStorage() {
    try {
        const stored = localStorage.getItem(PINNED_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function savePinnedToStorage(pinned) {
    try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Returns the color for a legend group key based on separateBy.
 */
function getGroupColor(key, separateBy) {
    switch (separateBy) {
        case 'partido':
            return PARTY_COLORS[key] || COLORS.textMedium;
        case 'estado':
            return STATE_COLORS[key] || COLORS.textMedium;
        case 'sexo':
            return SEX_COLORS[key] || COLORS.textMedium;
        default:
            return PARTY_COLORS[key] || COLORS.textMedium;
    }
}

/**
 * Returns the label for a legend group key based on separateBy.
 */
function getGroupLabel(key, separateBy) {
    if (separateBy === 'sexo') {
        return SEX_LABELS[key] || key;
    }
    if (separateBy === 'comunidade') {
        if (key === 'sem_comunidade') return 'Sem Comunidade';
        const num = parseInt(key, 10);
        if (!isNaN(num)) return `Comunidade ${num + 1}`;
    }
    return key;
}

/**
 * Grafo - Página principal com visualização de grafos
 * Orquestra todos os componentes: grafo no fundo + frames flutuantes por cima
 */
const DEFAULT_GRAFO_FILTERS = {
    separateBy: 'partido',
    onlyActive: true,
    highlightPinned: true,
    onlyWithConnections: false,
    presence: { min: 0, max: 100 },
    voteSimilarity: { min: 80, max: 100 },
    coautoria: { min: 1, max: 50 },
    vertexSize: 'padrao',
    graphLayout: 'forceatlas2_clusters',
    backboneEnabled: false,
    backboneMethod: 'lans',
    coautoresRange: { min: 2, max: 333 },
    polarizacaoRange: { min: 50, max: 100 },
    proposalTypes: ['PL'],
    expenseCategory: 'Todas',
    expenseYear: 'mandato',
    proposalType: 'PL+PLP+PEC',
    communityAlgorithm: 'louvain'
};

function serializeGrafoFilters(filters, graphType) {
    const params = {};
    params.graphType = graphType;
    params.separateBy = filters.separateBy;
    params.onlyActive = String(filters.onlyActive);
    params.highlightPinned = String(filters.highlightPinned);
    params.onlyWithConnections = String(filters.onlyWithConnections);
    params.presence_min = String(filters.presence.min);
    params.presence_max = String(filters.presence.max);
    
    if (graphType === 'similaridade') {
        params.voteSimilarity_min = String(filters.voteSimilarity.min);
        params.voteSimilarity_max = String(filters.voteSimilarity.max);
    } else {
        params.coautoria_min = String(filters.coautoria.min);
        params.coautoria_max = String(filters.coautoria.max);
    }
    
    params.vertexSize = filters.vertexSize;
    if (filters.vertexSize === 'despesas') {
        params.expenseCategory = filters.expenseCategory || 'Todas';
        params.expenseYear = filters.expenseYear || 'mandato';
    } else if (filters.vertexSize === 'proposicoes') {
        params.proposalType = filters.proposalType || 'PL+PLP+PEC';
    }
    
    params.graphLayout = filters.graphLayout;
    params.communityAlgorithm = filters.communityAlgorithm || 'louvain';
    params.backboneEnabled = String(filters.backboneEnabled);
    params.backboneMethod = filters.backboneMethod || 'lans';
    
    if (graphType === 'coautoria') {
        params.coautores_min = String(filters.coautoresRange?.min ?? 2);
        params.coautores_max = String(filters.coautoresRange?.max ?? 333);
        params.proposalTypes = (filters.proposalTypes || ['PL']).join(',');
    } else {
        params.polarizacao_min = String(filters.polarizacaoRange?.min ?? 50);
        params.polarizacao_max = String(filters.polarizacaoRange?.max ?? 100);
    }
    
    return params;
}

function deserializeGrafoFilters(searchParams) {
    const filters = { ...DEFAULT_GRAFO_FILTERS };
    
    const getBool = (key, def) => {
        const val = searchParams.get(key);
        if (val === null) return def;
        return val === 'true';
    };
    
    const getNum = (key, def) => {
        const val = searchParams.get(key);
        if (val === null) return def;
        const num = Number(val);
        return isNaN(num) ? def : num;
    };
    
    const getStr = (key, def) => {
        const val = searchParams.get(key);
        return val !== null ? val : def;
    };
    
    filters.separateBy = getStr('separateBy', DEFAULT_GRAFO_FILTERS.separateBy);
    filters.onlyActive = getBool('onlyActive', DEFAULT_GRAFO_FILTERS.onlyActive);
    filters.highlightPinned = getBool('highlightPinned', DEFAULT_GRAFO_FILTERS.highlightPinned);
    filters.onlyWithConnections = getBool('onlyWithConnections', DEFAULT_GRAFO_FILTERS.onlyWithConnections);
    
    filters.presence = {
        min: getNum('presence_min', DEFAULT_GRAFO_FILTERS.presence.min),
        max: getNum('presence_max', DEFAULT_GRAFO_FILTERS.presence.max)
    };
    
    filters.voteSimilarity = {
        min: getNum('voteSimilarity_min', DEFAULT_GRAFO_FILTERS.voteSimilarity.min),
        max: getNum('voteSimilarity_max', DEFAULT_GRAFO_FILTERS.voteSimilarity.max)
    };
    
    filters.coautoria = {
        min: getNum('coautoria_min', DEFAULT_GRAFO_FILTERS.coautoria.min),
        max: getNum('coautoria_max', DEFAULT_GRAFO_FILTERS.coautoria.max)
    };
    
    filters.vertexSize = getStr('vertexSize', DEFAULT_GRAFO_FILTERS.vertexSize);
    filters.expenseCategory = getStr('expenseCategory', DEFAULT_GRAFO_FILTERS.expenseCategory);
    filters.expenseYear = getStr('expenseYear', DEFAULT_GRAFO_FILTERS.expenseYear);
    filters.proposalType = getStr('proposalType', DEFAULT_GRAFO_FILTERS.proposalType);
    
    filters.graphLayout = getStr('graphLayout', DEFAULT_GRAFO_FILTERS.graphLayout);
    filters.communityAlgorithm = getStr('communityAlgorithm', DEFAULT_GRAFO_FILTERS.communityAlgorithm);
    filters.backboneEnabled = getBool('backboneEnabled', DEFAULT_GRAFO_FILTERS.backboneEnabled);
    filters.backboneMethod = getStr('backboneMethod', DEFAULT_GRAFO_FILTERS.backboneMethod);
    
    filters.coautoresRange = {
        min: getNum('coautores_min', DEFAULT_GRAFO_FILTERS.coautoresRange.min),
        max: getNum('coautores_max', DEFAULT_GRAFO_FILTERS.coautoresRange.max)
    };
    
    filters.polarizacaoRange = {
        min: getNum('polarizacao_min', DEFAULT_GRAFO_FILTERS.polarizacaoRange.min),
        max: getNum('polarizacao_max', DEFAULT_GRAFO_FILTERS.polarizacaoRange.max)
    };
    
    const propTypes = searchParams.get('proposalTypes');
    filters.proposalTypes = propTypes ? propTypes.split(',') : DEFAULT_GRAFO_FILTERS.proposalTypes;
    
    return filters;
}

export default function Grafo() {
    const [searchParams, setSearchParams] = useSearchParams();
    const isMobile = useIsMobile();
    
    const [selectedDeputy, setSelectedDeputy] = useState(null);
    const [profileDeputy, setProfileDeputy] = useState(null);
    const [deputyList, setDeputyList] = useState([]);
    
    const [graphType, setGraphType] = useState(() => searchParams.get('graphType') || 'similaridade');
    const [maxCoautoriaLimit, setMaxCoautoriaLimit] = useState(50);
    const [pinnedDeputies, setPinnedDeputies] = useState(() => loadPinnedFromStorage());
    const [legendData, setLegendData] = useState([]);
    const [totalVisible, setTotalVisible] = useState(0);
    const [hoveredLegendGroup, setHoveredLegendGroup] = useState(null);
    const [hoveredBarGroup, setHoveredBarGroup] = useState(null);
    const [hoveredConnectionNode, setHoveredConnectionNode] = useState(null);
    const [openPanel, setOpenPanel] = useState(null); // estado para o painel aberto
    const [recalcKey, setRecalcKey] = useState(0);
    const [graphSelectOpen, setGraphSelectOpen] = useState(false);
    const [filters, setFilters] = useState(() => deserializeGrafoFilters(searchParams));

    // Fecha/abre painel padrão dependendo de mobile
    useEffect(() => {
        if (!isMobile) {
            setOpenPanel('filtros');
        } else {
            setOpenPanel(null);
        }
    }, [isMobile]);

    const searchParamsString = searchParams.toString();

    // 1. Sync URL -> States
    useEffect(() => {
        const params = deserializeGrafoFilters(searchParams);
        
        setFilters(prev => {
            if (prev.separateBy === params.separateBy &&
                prev.onlyActive === params.onlyActive &&
                prev.highlightPinned === params.highlightPinned &&
                prev.onlyWithConnections === params.onlyWithConnections &&
                prev.presence.min === params.presence.min &&
                prev.presence.max === params.presence.max &&
                prev.voteSimilarity.min === params.voteSimilarity.min &&
                prev.voteSimilarity.max === params.voteSimilarity.max &&
                prev.coautoria.min === params.coautoria.min &&
                prev.coautoria.max === params.coautoria.max &&
                prev.vertexSize === params.vertexSize &&
                prev.expenseCategory === params.expenseCategory &&
                prev.expenseYear === params.expenseYear &&
                prev.proposalType === params.proposalType &&
                prev.graphLayout === params.graphLayout &&
                prev.communityAlgorithm === params.communityAlgorithm &&
                prev.backboneEnabled === params.backboneEnabled &&
                prev.backboneMethod === params.backboneMethod &&
                prev.coautoresRange.min === params.coautoresRange.min &&
                prev.coautoresRange.max === params.coautoresRange.max &&
                prev.polarizacaoRange.min === params.polarizacaoRange.min &&
                prev.polarizacaoRange.max === params.polarizacaoRange.max &&
                prev.proposalTypes.length === params.proposalTypes.length &&
                prev.proposalTypes.every((val, idx) => val === params.proposalTypes[idx])) {
                return prev;
            }
            return params;
        });
        
        setGraphType(prev => prev === (searchParams.get('graphType') || 'similaridade') ? prev : (searchParams.get('graphType') || 'similaridade'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParamsString]);

    // 2. Sync States -> URL
    useEffect(() => {
        const nextParams = serializeGrafoFilters(filters, graphType);
        
        let changed = false;
        for (const key of Object.keys(nextParams)) {
            if (searchParams.get(key) !== nextParams[key]) {
                changed = true;
                break;
            }
        }
        
        if (changed) {
            setSearchParams(nextParams, { replace: true });
        }
    }, [filters, graphType, setSearchParams, searchParams]);

    // Persist pinned list to localStorage whenever it changes
    useEffect(() => {
        savePinnedToStorage(pinnedDeputies);
    }, [pinnedDeputies]);

    const graphTypeOptions = [
        { value: 'similaridade', label: 'Similaridade de votos' },
        { value: 'coautoria', label: 'Coautoria' },
    ];

    const pageStyle = {
        width: '100vw',
        height: '100vh',
        backgroundColor: COLORS.backgroundLight,
        position: 'relative',
        overflow: 'hidden',
    };

    const handleNodeClick = useCallback((deputyData) => {
        setSelectedDeputy(deputyData);
    }, []);

    const handleApplyFilters = useCallback((newFilters) => {
        setFilters(newFilters);
        // Deselect ao aplicar filtros
        setSelectedDeputy(null);
    }, []);

    const handleTogglePanel = useCallback((panelId) => {
        setOpenPanel(prev => prev === panelId ? null : panelId);
    }, []);

    const handleCloseCard = useCallback(() => {
        setSelectedDeputy(null);
    }, []);

    // Abrir perfil expandido: fecha o card e abre o profile
    const handleOpenProfile = useCallback(() => {
        if (selectedDeputy) {
            setProfileDeputy(selectedDeputy);
            setSelectedDeputy(null);
        }
    }, [selectedDeputy]);

    const handleCloseProfile = useCallback(() => {
        setProfileDeputy(null);
    }, []);

    const handleDeputiesLoaded = useCallback((deputies) => {
        setDeputyList(deputies);
    }, []);

    const handleMaxCoautoriaLoaded = useCallback((maxC) => {
        setMaxCoautoriaLimit(maxC);
        setFilters(prev => ({
            ...prev,
            coautoria: { min: 1, max: maxC }
        }));
    }, []);

    // Handle visible stats from GraphContainer for the legend
    const handleVisibleStatsChanged = useCallback(({ separateBy, groupCounts, groupColors = {}, totalVisible: total }) => {
        const data = Object.entries(groupCounts).map(([key, count]) => ({
            key,
            label: getGroupLabel(key, separateBy),
            color: groupColors[key] || getGroupColor(key, separateBy),
            count,
        }));
        setLegendData(data);
        setTotalVisible(total);
    }, []);

    // Fixar/Desfixar deputado
    const handleTogglePin = useCallback(() => {
        if (!selectedDeputy) return;
        const depId = selectedDeputy.id;

        setPinnedDeputies(prev => {
            const exists = prev.some(p => p.id === depId);
            if (exists) {
                return prev.filter(p => p.id !== depId);
            } else {
                return [...prev, {
                    id: depId,
                    nome: selectedDeputy.nome,
                    sigla_partido: selectedDeputy.sigla_partido || selectedDeputy.partido,
                }];
            }
        });
    }, [selectedDeputy]);

    // Remover da lista de fixados
    const handleRemovePinned = useCallback((depId) => {
        setPinnedDeputies(prev => prev.filter(p => p.id !== depId));
    }, []);

    // Quando um deputado é selecionado pela pesquisa no TopBar,
    // simula o mesmo comportamento de clicar no vértice dele
    const handleSearchSelectDeputy = useCallback((dep) => {
        const nodeId = String(dep.id);
        setSelectedDeputy({
            ...dep,
            nodeId,
        });
    }, []);

    // Quando o botão "Perfil" é clicado na pesquisa do TopBar,
    // abre o perfil diretamente sem carregar o card no grafo
    const handleSearchSelectProfile = useCallback((dep) => {
        const color = PARTY_COLORS[dep.sigla_partido || dep.partido] || COLORS.textMedium;
        setProfileDeputy({
            ...dep,
            nodeColor: color,
        });
        setSelectedDeputy(null);
    }, []);

    // Quando um deputado fixado é clicado na lista
    const handleSelectPinned = useCallback((pinnedDep) => {
        // Tentar encontrar dados completos na deputyList
        const fullDep = deputyList.find(d => d.id === pinnedDep.id);
        const dep = fullDep || pinnedDep;
        const nodeId = String(dep.id);
        setSelectedDeputy({
            ...dep,
            nodeId,
        });
    }, [deputyList]);

    // Ícone de grafo para o seletor
    const graphIcon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="12" cy="18" r="3" />
            <line x1="8.5" y1="7.5" x2="10.5" y2="16" />
            <line x1="15.5" y1="7.5" x2="13.5" y2="16" />
            <line x1="9" y1="6" x2="15" y2="6" />
        </svg>
    );

    const selectLargeStyle = {
        appearance: 'none',
        backgroundColor: COLORS.white,
        border: `1px solid ${COLORS.borderMedium}`,
        borderRadius: SPACING.radiusMd,
        padding: `${SPACING.sm} 32px ${SPACING.sm} ${SPACING.md}`,
        fontSize: FONTS.sizeMd,
        fontFamily: FONTS.family,
        color: COLORS.textDark,
        cursor: 'pointer',
        outline: 'none',
        width: '100%',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23555' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right ${SPACING.md} center`,
    };

    const pinnedIds = pinnedDeputies.map(p => p.id);
    const isSelectedPinned = selectedDeputy ? pinnedIds.includes(selectedDeputy.id) : false;

    return (
        <div style={pageStyle}>
            {/* Grafo no fundo - ocupa toda a tela */}
            <GraphContainer
                filters={filters}
                graphType={graphType}
                selectedNode={selectedDeputy ? String(selectedDeputy.nodeId || selectedDeputy.id) : null}
                selectedDeputy={selectedDeputy}
                onNodeClick={handleNodeClick}
                onDeputiesLoaded={handleDeputiesLoaded}
                onMaxCoautoriaLoaded={handleMaxCoautoriaLoaded}
                onVisibleStatsChanged={handleVisibleStatsChanged}
                pinnedIds={pinnedIds}
                highlightPinned={filters.highlightPinned}
                hoveredLegendGroup={hoveredLegendGroup}
                hoveredBarGroup={hoveredBarGroup}
                hoveredConnectionNode={hoveredConnectionNode}
                recalcKey={recalcKey}
            />

            {/* Barra superior */}
            <TopBar
                deputyList={deputyList}
                onSelectDeputy={handleSearchSelectDeputy}
                onSelectProfile={handleSearchSelectProfile}
                activePage="grafos"
            />

            {/* Card de deputado - canto superior esquerdo (aparece ao clicar num vértice) */}
            <DeputyCard
                deputy={selectedDeputy}
                visible={!!selectedDeputy}
                isPinned={isSelectedPinned}
                onClose={handleCloseCard}
                onPin={handleTogglePin}
                onProfile={handleOpenProfile}
                separateBy={filters.separateBy}
                communityAlgorithm={filters.communityAlgorithm || 'louvain'}
                graphType={graphType}
                onBarSegmentHover={setHoveredBarGroup}
                onConnectionHover={setHoveredConnectionNode}
            />

            {/* Perfil expandido do deputado */}
            <DeputyProfile
                deputy={profileDeputy}
                visible={!!profileDeputy}
                onClose={handleCloseProfile}
            />

            {/* Info frame - canto inferior esquerdo */}
            {!isMobile && <InfoFrame graphType={graphType} filters={filters} />}

            {/* Agrupamento de painéis à direita */}
            {!isMobile && (
                <div style={{
                    position: 'absolute',
                    top: `calc(52px + ${SPACING.frameGap} + ${SPACING.frameGap})`,
                    right: SPACING.frameGap,
                    bottom: SPACING.frameGap,
                    width: '250px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: SPACING.frameGap,
                    pointerEvents: 'none',
                    zIndex: 10,
                }}>
                    {/* Seletor de grafo - acima dos filtros */}
                    <Frame
                        width="250px"
                        height="auto"
                        position={{ position: 'relative' }}
                        style={{ flex: '0 0 auto' }}
                        title={
                            <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                                {graphIcon} Selecionar grafo
                                <Tooltip text="Similaridade conecta deputados com votos parecidos; Coautoria conecta deputados que propuseram leis juntos." />
                            </span>
                        }
                    >
                        <div style={{ padding: `0 ${SPACING.lg} ${SPACING.lg}`, display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                            <select
                                id="graph-type-selector"
                                value={graphType}
                                onChange={(e) => setGraphType(e.target.value)}
                                style={{ ...selectLargeStyle, flex: 1 }}
                            >
                                {graphTypeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                id="recalc-graph-btn"
                                title="Recalcular grafo"
                                onClick={() => setRecalcKey(k => k + 1)}
                                style={{
                                    flex: '0 0 auto',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px solid ${COLORS.borderMedium}`,
                                    borderRadius: SPACING.radiusMd,
                                    backgroundColor: COLORS.white,
                                    cursor: 'pointer',
                                    transition: 'background-color 0.15s, border-color 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COLORS.backgroundLight; e.currentTarget.style.borderColor = COLORS.orange; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.borderColor = COLORS.borderMedium; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 4v6h-6" />
                                    <path d="M1 20v-6h6" />
                                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10" />
                                    <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14" />
                                </svg>
                            </button>
                        </div>
                    </Frame>

                    {/* Painel de filtros */}
                    <FiltersPanel 
                        filters={filters}
                        onApply={handleApplyFilters} 
                        graphType={graphType} 
                        maxCoautoriaLimit={maxCoautoriaLimit}
                        isMinimized={openPanel !== 'filtros'}
                        onToggleMinimize={() => handleTogglePanel('filtros')}
                    />

                    {/* Painel de legenda */}
                    <LegendPanel
                        legendData={legendData}
                        totalVisible={totalVisible}
                        onHoverGroup={setHoveredLegendGroup}
                        isMinimized={openPanel !== 'legenda'}
                        onToggleMinimize={() => handleTogglePanel('legenda')}
                    />

                    {/* Painel de fixados */}
                    <PinnedPanel
                        pinnedDeputies={pinnedDeputies}
                        onRemove={handleRemovePinned}
                        onSelect={handleSelectPinned}
                        isMinimized={openPanel !== 'fixados'}
                        onToggleMinimize={() => handleTogglePanel('fixados')}
                    />
                </div>
            )}

            {/* Mobile Bottom Sheets & Controls */}
            {isMobile && (
                <>
                    {/* Floating Action Buttons (FABs) on mobile */}
                    {!openPanel && (
                        <>
                            {/* Pinned FAB */}
                            <button
                                onClick={() => handleTogglePanel('fixados')}
                                style={{
                                    position: 'fixed',
                                    bottom: '188px',
                                    right: '22px',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    backgroundColor: COLORS.white,
                                    color: COLORS.orange,
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 90,
                                }}
                                title="Fixados"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="17" x2="12" y2="22" />
                                    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.54l-2.78 3.5a2 2 0 0 0-.44 1.24z" />
                                </svg>
                            </button>

                            {/* Legend FAB */}
                            <button
                                onClick={() => handleTogglePanel('legenda')}
                                style={{
                                    position: 'fixed',
                                    bottom: '136px',
                                    right: '22px',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    backgroundColor: COLORS.white,
                                    color: COLORS.orange,
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 90,
                                }}
                                title="Legenda"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                            </button>

                            {/* Filters FAB (large, orange) */}
                            <button
                                onClick={() => handleTogglePanel('filtros')}
                                style={{
                                    position: 'fixed',
                                    bottom: '72px',
                                    right: '16px',
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    backgroundColor: COLORS.orange,
                                    color: COLORS.textWhite,
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 90,
                                }}
                                title="Filtros"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                </svg>
                            </button>
                        </>
                    )}

                    {/* Bottom Drawer Overlay */}
                    {openPanel && (
                        <>
                            {/* Backdrop */}
                            <div
                                onClick={() => setOpenPanel(null)}
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    zIndex: 101,
                                }}
                            />
                            {/* Drawer Content */}
                            <div style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '80vh',
                                maxHeight: '80vh',
                                backgroundColor: COLORS.frameBg,
                                borderRadius: '16px 16px 0 0',
                                boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                                zIndex: 102,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}>
                                {/* Drawer Header Tabs */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: `1px solid ${COLORS.borderLight}`,
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: COLORS.frameBg,
                                    zIndex: 5,
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    flexShrink: 0,
                                }}>
                                    {['filtros', 'legenda', 'fixados', 'sobre_grafo'].map((panelKey) => {
                                        let label = '';
                                        let icon = null;
                                        
                                        if (panelKey === 'filtros') {
                                            label = 'Filtros';
                                            icon = (
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0 }}>
                                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                                </svg>
                                            );
                                        } else if (panelKey === 'legenda') {
                                            label = 'Legenda';
                                            icon = (
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0 }}>
                                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                                </svg>
                                            );
                                        } else if (panelKey === 'fixados') {
                                            label = `Fixados (${pinnedDeputies.length})`;
                                            icon = (
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0 }}>
                                                    <line x1="12" y1="17" x2="12" y2="22" />
                                                    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.26V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.26a2 2 0 0 1-.78 1.54l-2.78 3.5a2 2 0 0 0-.44 1.24z" />
                                                </svg>
                                            );
                                        } else if (panelKey === 'sobre_grafo') {
                                            label = '';
                                            icon = (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                    <circle cx="12" cy="12" r="10" />
                                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                                </svg>
                                            );
                                        }

                                        const isActive = openPanel === panelKey;
                                        const isSobre = panelKey === 'sobre_grafo';
                                        
                                        return (
                                            <button
                                                key={panelKey}
                                                onClick={() => setOpenPanel(panelKey)}
                                                style={{
                                                    flex: isSobre ? '0 0 48px' : 1,
                                                    padding: '16px 4px',
                                                    fontSize: '13px',
                                                    fontWeight: isActive ? 'bold' : 'normal',
                                                    color: isActive ? COLORS.orange : COLORS.textMedium,
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    borderBottom: isActive ? `3px solid ${COLORS.orange}` : '3px solid transparent',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: 0,
                                                }}
                                            >
                                                {icon}
                                                {label && <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{label}</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Drawer Body */}
                                <div style={{ 
                                    flex: 1, 
                                    padding: `${SPACING.md} ${SPACING.md} 24px`, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    overflow: 'hidden',
                                    minHeight: 0 
                                }}>
                                    {openPanel === 'filtros' && (
                                        <FiltersPanel 
                                            filters={filters}
                                            onApply={(newFilters) => {
                                                handleApplyFilters(newFilters);
                                                setOpenPanel(null); // Close on mobile apply
                                            }} 
                                            graphType={graphType} 
                                            maxCoautoriaLimit={maxCoautoriaLimit}
                                            isMinimized={false}
                                            width="100%"
                                            height="100%"
                                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                            hideHeader={true}
                                        />
                                    )}

                                    {openPanel === 'legenda' && (
                                        <LegendPanel
                                            legendData={legendData}
                                            totalVisible={totalVisible}
                                            onHoverGroup={setHoveredLegendGroup}
                                            isMinimized={false}
                                            width="100%"
                                            height="100%"
                                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                            hideHeader={true}
                                        />
                                    )}

                                    {openPanel === 'fixados' && (
                                        <PinnedPanel
                                            pinnedDeputies={pinnedDeputies}
                                            onRemove={handleRemovePinned}
                                            onSelect={(dep) => {
                                                handleSelectPinned(dep);
                                                setOpenPanel(null); // Close on select on mobile
                                            }}
                                            isMinimized={false}
                                            width="100%"
                                            height="100%"
                                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                            hideHeader={true}
                                        />
                                    )}

                                    {openPanel === 'sobre_grafo' && (
                                        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '24px' }}>
                                            <InfoFrame graphType={graphType} filters={filters} isMobileInline={true} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Mobile Bottom Selector & Explanation Bar */}
                    <div style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '56px',
                        backgroundColor: COLORS.frameBg,
                        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
                        borderTop: `1px solid ${COLORS.borderLight}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: `0 ${SPACING.md}`,
                        zIndex: 95,
                    }}>
                        {/* Info Button "?" on the left */}
                        <button
                            onClick={() => handleTogglePanel('sobre_grafo')}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: openPanel === 'sobre_grafo' ? COLORS.textMedium : 'transparent',
                                color: openPanel === 'sobre_grafo' ? COLORS.textWhite : COLORS.textMedium,
                                border: `2px solid ${COLORS.textMedium}`,
                                fontSize: '18px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                marginRight: SPACING.md,
                            }}
                            title="O que estou vendo"
                        >
                            ?
                        </button>

                        {/* Select Graph Container */}
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
                            {/* Backdrop to close dropdown when clicking outside */}
                            {graphSelectOpen && (
                                <div
                                    onClick={() => setGraphSelectOpen(false)}
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'transparent',
                                        zIndex: 199,
                                    }}
                                />
                            )}

                            {/* Trigger Button */}
                            <button
                                onClick={() => setGraphSelectOpen(!graphSelectOpen)}
                                style={{
                                    flex: 1,
                                    height: '36px',
                                    backgroundColor: COLORS.white,
                                    border: `1px solid ${COLORS.borderMedium}`,
                                    borderRadius: SPACING.radiusMd,
                                    padding: `0 ${SPACING.md} 0 ${SPACING.sm}`,
                                    fontSize: '12px',
                                    color: COLORS.textDark,
                                    fontFamily: FONTS.family,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                    position: 'relative',
                                    zIndex: 200,
                                }}
                            >
                                <span>
                                    {graphTypeOptions.find(opt => opt.value === graphType)?.label || graphType}
                                </span>
                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" style={{ transition: 'transform 0.2s', transform: graphSelectOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                                    <path d="M1 1.5L6 6.5L11 1.5" />
                                </svg>
                            </button>

                            {/* Dropdown Options Popup (extends upwards!) */}
                            {graphSelectOpen && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 8px)',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: COLORS.white,
                                    border: `1px solid ${COLORS.borderMedium}`,
                                    borderRadius: SPACING.radiusMd,
                                    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)',
                                    zIndex: 200,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    animation: 'selectSlideUp 0.18s ease-out',
                                }}>
                                    <style>{`
                                        @keyframes selectSlideUp {
                                            from { opacity: 0; transform: translateY(8px); }
                                            to { opacity: 1; transform: translateY(0); }
                                        }
                                    `}</style>
                                    {graphTypeOptions.map((opt) => {
                                        const isSelected = opt.value === graphType;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setGraphType(opt.value);
                                                    setGraphSelectOpen(false);
                                                }}
                                                style={{
                                                    padding: '12px 16px',
                                                    fontSize: '13px',
                                                    color: isSelected ? COLORS.orange : COLORS.textDark,
                                                    fontWeight: isSelected ? 'bold' : 'normal',
                                                    backgroundColor: isSelected ? 'rgba(232, 133, 12, 0.05)' : 'transparent',
                                                    border: 'none',
                                                    borderBottom: `1px solid ${COLORS.borderLight}`,
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    fontFamily: FONTS.family,
                                                }}
                                                onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
                                                onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
