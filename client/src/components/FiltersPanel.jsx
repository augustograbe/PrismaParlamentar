import { useState, useEffect } from 'react';
import Frame from './Frame';
import Dropdown from './Dropdown';
import Checkbox from './Checkbox';
import RangeSlider from './RangeSlider';
import Button from './Button';
import PanelSection from './PanelSection';
import Tooltip from './Tooltip';
import { COLORS, SPACING } from '../constants/theme';

/**
 * FiltersPanel - Painel de filtros no canto superior direito
 * Props:
 * - onApply: callback (filters) ao clicar em Aplicar
 */
export default function FiltersPanel({ onApply, graphType = 'similaridade', maxCoautoriaLimit = 50, isMinimized, onToggleMinimize }) {
    const [separateBy, setSeparateBy] = useState('partido');
    const [onlyActive, setOnlyActive] = useState(true);
    const [highlightPinned, setHighlightPinned] = useState(true);
    const [onlyWithConnections, setOnlyWithConnections] = useState(false);
    const [presence, setPresence] = useState({ min: 0, max: 100 });
    const [voteSimilarity, setVoteSimilarity] = useState({ min: 80, max: 100 });
    const [coautoria, setCoautoria] = useState({ min: 1, max: 50 });
    const [vertexSize, setVertexSize] = useState('padrao');
    const [graphLayout, setGraphLayout] = useState('forceatlas2_clusters');
    const [communityAlgorithm, setCommunityAlgorithm] = useState('louvain');
    const [backboneEnabled, setBackboneEnabled] = useState(false);
    const [backboneMethod, setBackboneMethod] = useState('high_salience_skeleton');

    const [expenseCategories, setExpenseCategories] = useState([]);
    const [selectedExpenseCategory, setSelectedExpenseCategory] = useState('Todas');
    const [selectedExpenseYear, setSelectedExpenseYear] = useState('mandato');
    const [selectedProposalType, setSelectedProposalType] = useState('PL+PLP+PEC');

    useEffect(() => {
        let isMounted = true;
        async function fetchCategories() {
            try {
                const res = await fetch('http://localhost:8000/api/despesas-categorias/');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setExpenseCategories(data);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar categorias de despesas:", err);
            }
        }
        fetchCategories();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        setCoautoria({ min: 1, max: maxCoautoriaLimit });
    }, [maxCoautoriaLimit]);

    const separateOptions = [
        { value: 'partido', label: 'Partido' },
        { value: 'estado', label: 'Estado' },
        { value: 'sexo', label: 'Sexo' },
        { value: 'comunidade', label: 'Comunidades' },
    ];

    const communityAlgorithmOptions = [
        { value: 'louvain', label: 'Louvain' },
        { value: 'leiden', label: 'Leiden' },
    ];

    const vertexSizeOptions = [
        { value: 'padrao', label: 'Padrão' },
        { value: 'presenca', label: 'Presença' },
        { value: 'conexoes', label: 'Conexões' },
        { value: 'despesas', label: 'Despesas' },
        { value: 'discursos', label: 'Discursos' },
        { value: 'proposicoes', label: 'Proposições' },
    ];

    const layoutOptions = [
        { value: 'forceatlas2_spread', label: 'ForceAtlas2 (Espalhado)' },
        { value: 'forceatlas2_clusters', label: 'ForceAtlas2 (Clusters)' },
    ];

    const backboneMethodOptions = [
        { value: 'high_salience_skeleton', label: 'High Salience Skeleton' },
        { value: 'lans', label: 'LANS' },
    ];

    const filterIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={COLORS.orange} strokeWidth="1.5">
            <path d="M1 2h14L9.5 8.5V13L6.5 14.5V8.5L1 2z" />
        </svg>
    );

    // Ícone de telescópio/visualização
    const viewIcon = (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMedium} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );

    // Ícone de engrenagem/avançado
    const advancedIcon = (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMedium} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
        </svg>
    );

    const contentStyle = {
        padding: SPACING.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.lg,
    };

    const handleApply = () => {
        if (onApply) {
            onApply({
                separateBy,
                onlyActive,
                highlightPinned,
                onlyWithConnections,
                presence,
                voteSimilarity,
                coautoria,
                vertexSize,
                expenseCategory: selectedExpenseCategory,
                expenseYear: selectedExpenseYear,
                proposalType: selectedProposalType,
                graphLayout,
                communityAlgorithm,
                backboneEnabled,
                backboneMethod,
            });
        }
    };

    return (
        <Frame
            width="250px"
            height="auto"
            position={{ position: 'relative' }}
            style={{ flex: isMinimized ? '0 0 auto' : '0 1 auto', minHeight: 0 }}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    {filterIcon} Filtros
                </span>
            }
            showMinimize={true}
            isMinimized={isMinimized}
            onToggleMinimize={onToggleMinimize}
        >
            <div style={contentStyle}>
                <Dropdown
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Separar por <Tooltip text="Altera as cores dos vértices para representar partidos, estados, sexo ou comunidades detectadas." />
                        </span>
                    }
                    options={separateOptions}
                    value={separateBy}
                    onChange={(e) => setSeparateBy(e.target.value)}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                />

                <Checkbox
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Apenas em exercício <Tooltip text="Oculta deputados que não estão atualmente em exercício (ex: suplentes não convocados)." />
                        </span>
                    }
                    checked={onlyActive}
                    onChange={setOnlyActive}
                />

                <Checkbox
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Destacar Fixados <Tooltip text="Mantém os deputados fixados 100% visíveis, escurecendo os demais para facilitar a visualização." />
                        </span>
                    }
                    checked={highlightPinned}
                    onChange={setHighlightPinned}
                />

                <Checkbox
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Apenas com conexões <Tooltip text="Remove do grafo os deputados que não possuem nenhuma ligação, mostrando apenas a rede conectada." />
                        </span>
                    }
                    checked={onlyWithConnections}
                    onChange={setOnlyWithConnections}
                />

                <RangeSlider
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Presença <Tooltip text="Filtra os deputados pelo percentual de presença nas sessões (ex: 80% a 100%)." />
                        </span>
                    }
                    min={0}
                    max={100}
                    valueMin={presence.min}
                    valueMax={presence.max}
                    onChange={setPresence}
                />

                {graphType === 'coautoria' ? (
                    <RangeSlider
                        label={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Coautorias <Tooltip text="Define a quantidade mínima e máxima de projetos em comum para exibir a conexão." />
                            </span>
                        }
                        min={1}
                        max={maxCoautoriaLimit}
                        valueMin={coautoria.min}
                        valueMax={coautoria.max}
                        onChange={setCoautoria}
                        formatLabel={(val) => String(val)}
                        disabled={backboneEnabled}
                    />
                ) : (
                    <RangeSlider
                        label={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Similaridade dos votos <Tooltip text="Define o percentual mínimo e máximo de concordância em votos para exibir a conexão." />
                            </span>
                        }
                        min={80}
                        max={100}
                        valueMin={voteSimilarity.min}
                        valueMax={voteSimilarity.max}
                        onChange={setVoteSimilarity}
                        disabled={backboneEnabled}
                    />
                )}
            </div>

            {/* Seções colapsáveis - fora do padding para ocupar largura total */}
            <PanelSection
                icon={viewIcon}
                title="Visualização"
                defaultExpanded={true}
            >
                <Dropdown
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Layout do grafo <Tooltip text="Define como os vértices se organizam fisicamente no espaço (ex: espalhado ou em clusters)." />
                        </span>
                    }
                    options={layoutOptions}
                    value={graphLayout}
                    onChange={(e) => setGraphLayout(e.target.value)}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                />
                <div style={{ height: SPACING.sm }} />
                <Dropdown
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Tamanho do vértice <Tooltip text="Altera o tamanho da bolinha com base em métricas como presença ou quantidade de conexões." />
                        </span>
                    }
                    options={vertexSizeOptions}
                    value={vertexSize}
                    onChange={(e) => setVertexSize(e.target.value)}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                />
                {vertexSize === 'despesas' && (
                    <div style={{
                        display: 'flex',
                        gap: SPACING.xs,
                        marginTop: SPACING.sm,
                        width: '100%'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                            <label style={{ fontSize: '10px', color: COLORS.textLight, marginBottom: '2px', fontWeight: 'bold' }}>Categoria</label>
                            <select
                                value={selectedExpenseCategory}
                                onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    fontSize: '11px',
                                    border: `1px solid ${COLORS.borderMedium}`,
                                    borderRadius: '4px',
                                    backgroundColor: COLORS.white,
                                    color: COLORS.textDark,
                                    outline: 'none',
                                    height: '26px'
                                }}
                            >
                                <option value="Todas">Todas</option>
                                {expenseCategories.map((cat, idx) => (
                                    <option key={idx} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', width: '90px', flexShrink: 0 }}>
                            <label style={{ fontSize: '10px', color: COLORS.textLight, marginBottom: '2px', fontWeight: 'bold' }}>Ano</label>
                            <select
                                value={selectedExpenseYear}
                                onChange={(e) => setSelectedExpenseYear(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    fontSize: '11px',
                                    border: `1px solid ${COLORS.borderMedium}`,
                                    borderRadius: '4px',
                                    backgroundColor: COLORS.white,
                                    color: COLORS.textDark,
                                    outline: 'none',
                                    height: '26px'
                                }}
                            >
                                <option value="mandato">mandato</option>
                                <option value="2026">2026</option>
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                            </select>
                        </div>
                    </div>
                )}
                {vertexSize === 'proposicoes' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: SPACING.sm,
                        width: '100%'
                    }}>
                        <label style={{ fontSize: '10px', color: COLORS.textLight, marginBottom: '2px', fontWeight: 'bold' }}>Tipo de Proposição</label>
                        <select
                            value={selectedProposalType}
                            onChange={(e) => setSelectedProposalType(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '4px 6px',
                                fontSize: '11px',
                                border: `1px solid ${COLORS.borderMedium}`,
                                borderRadius: '4px',
                                backgroundColor: COLORS.white,
                                color: COLORS.textDark,
                                outline: 'none',
                                height: '26px'
                            }}
                        >
                            <option value="PL+PLP+PEC">(PL+PLP+PEC)</option>
                            <option value="PL">PL</option>
                            <option value="PLP">PLP</option>
                            <option value="PEC">PEC</option>
                        </select>
                    </div>
                )}
            </PanelSection>

            <div style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <PanelSection
                    icon={advancedIcon}
                    title="Avançado"
                    defaultExpanded={false}
                >
                    <Dropdown
                        label={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Algoritmo de comunidades <Tooltip text="Escolhe o método matemático (Louvain ou Leiden) para agrupar deputados com conexões mais fortes entre si." />
                            </span>
                        }
                        options={communityAlgorithmOptions}
                        value={communityAlgorithm}
                        onChange={(e) => setCommunityAlgorithm(e.target.value)}
                        disabled={separateBy !== 'comunidade'}
                        style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                    />
                    <div style={{ height: SPACING.md }} />
                    <Checkbox
                        label={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Backbone <Tooltip text="Aplica um filtro estrutural avançado que destaca a espinha dorsal do grafo, desativando o filtro por peso de aresta." />
                            </span>
                        }
                        checked={backboneEnabled}
                        onChange={setBackboneEnabled}
                    />
                    <div style={{ height: SPACING.sm }} />
                    <Dropdown
                        label={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Método do backbone <Tooltip text="Escolhe entre algoritmos (High Salience Skeleton ou LANS) para extrair as ligações mais significativas." />
                            </span>
                        }
                        options={backboneMethodOptions}
                        value={backboneMethod}
                        onChange={(e) => setBackboneMethod(e.target.value)}
                        disabled={!backboneEnabled}
                        style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                    />
                </PanelSection>
            </div>

            <div style={{ padding: SPACING.lg, display: 'flex', justifyContent: 'center' }}>
                <Button
                    variant="outline"
                    icon={filterIcon}
                    onClick={handleApply}
                >
                    Aplicar
                </Button>
            </div>
        </Frame>
    );
}

