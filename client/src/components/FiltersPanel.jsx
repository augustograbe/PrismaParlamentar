import { useState, useEffect } from 'react';
import Frame from './Frame';
import Dropdown from './Dropdown';
import Checkbox from './Checkbox';
import RangeSlider from './RangeSlider';
import Button from './Button';
import PanelSection from './PanelSection';
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
                    label="Separar por"
                    options={separateOptions}
                    value={separateBy}
                    onChange={(e) => setSeparateBy(e.target.value)}
                />

                <Checkbox
                    label="Apenas em exercício"
                    checked={onlyActive}
                    onChange={setOnlyActive}
                />

                <Checkbox
                    label="Destacar Fixados"
                    checked={highlightPinned}
                    onChange={setHighlightPinned}
                />

                <Checkbox
                    label="Apenas com conexões"
                    checked={onlyWithConnections}
                    onChange={setOnlyWithConnections}
                />

                <RangeSlider
                    label="Presença"
                    min={0}
                    max={100}
                    valueMin={presence.min}
                    valueMax={presence.max}
                    onChange={setPresence}
                />

                {graphType === 'coautoria' ? (
                    <RangeSlider
                        label="Coautorias"
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
                        label="Similaridade dos votos"
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
                    label="Layout do grafo"
                    options={layoutOptions}
                    value={graphLayout}
                    onChange={(e) => setGraphLayout(e.target.value)}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                />
                <div style={{ height: SPACING.sm }} />
                <Dropdown
                    label="Tamanho do vértice"
                    options={vertexSizeOptions}
                    value={vertexSize}
                    onChange={(e) => setVertexSize(e.target.value)}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                />
            </PanelSection>

            <div style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                <PanelSection
                    icon={advancedIcon}
                    title="Avançado"
                    defaultExpanded={false}
                >
                    <Dropdown
                        label="Algoritmo de comunidades"
                        options={communityAlgorithmOptions}
                        value={communityAlgorithm}
                        onChange={(e) => setCommunityAlgorithm(e.target.value)}
                        disabled={separateBy !== 'comunidade'}
                        style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                    />
                    <div style={{ height: SPACING.md }} />
                    <Checkbox
                        label="Backbone"
                        checked={backboneEnabled}
                        onChange={setBackboneEnabled}
                    />
                    <div style={{ height: SPACING.sm }} />
                    <Dropdown
                        label="Método do backbone"
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

