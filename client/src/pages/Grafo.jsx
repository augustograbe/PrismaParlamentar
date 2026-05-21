import { useState, useCallback, useEffect } from 'react';
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
export default function Grafo() {
    const [selectedDeputy, setSelectedDeputy] = useState(null);
    const [profileDeputy, setProfileDeputy] = useState(null);
    const [deputyList, setDeputyList] = useState([]);
    const [graphType, setGraphType] = useState('similaridade');
    const [maxCoautoriaLimit, setMaxCoautoriaLimit] = useState(50);
    const [pinnedDeputies, setPinnedDeputies] = useState(() => loadPinnedFromStorage());
    const [legendData, setLegendData] = useState([]);
    const [totalVisible, setTotalVisible] = useState(0);
    const [hoveredLegendGroup, setHoveredLegendGroup] = useState(null);
    const [hoveredBarGroup, setHoveredBarGroup] = useState(null);
    const [hoveredConnectionNode, setHoveredConnectionNode] = useState(null);
    const [openPanel, setOpenPanel] = useState('filtros'); // estado para o painel aberto
    const [recalcKey, setRecalcKey] = useState(0);
    const [filters, setFilters] = useState({
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
        backboneMethod: 'high_salience_skeleton',
    });

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
            <InfoFrame />

            {/* Agrupamento de painéis à direita */}
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
        </div>
    );
}
