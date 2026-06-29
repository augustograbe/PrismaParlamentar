import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { computeTreemapLayout } from '../utils/treemapLayout';
import Button from './Button';
import { COLORS, SPACING, FONTS, SHADOWS } from '../constants/theme';

/**
 * Computa a configuração e o tamanho exato de texto para um tile de partido.
 * Garante que a fonte NUNCA extrapole as dimensões do retângulo.
 */
function computePartyTileLayout(partyName, count, width, height, fontMultiplier) {
    if (width < 22 || height < 14) {
        return { mode: 0 };
    }

    const countStr = `(${count})`;

    // Modo 2: Duas linhas empilhadas (Nome do Partido + Contagem)
    if (height >= 38 && width >= 44) {
        const availW = width - 6;
        const availH1 = (height - 6) * 0.48;
        const availH2 = (height - 6) * 0.38;

        const targetSize1 = Math.round(13 * fontMultiplier);
        const targetSize2 = Math.round(11 * fontMultiplier);

        const fitted1 = Math.min(targetSize1, Math.floor(availH1), Math.floor(availW / (partyName.length * 0.72)));
        const fitted2 = Math.min(targetSize2, Math.floor(availH2), Math.floor(availW / (countStr.length * 0.68)));

        if (fitted1 >= 8 && fitted2 >= 7) {
            return {
                mode: 2,
                text1: partyName,
                text2: countStr,
                size1: fitted1,
                size2: fitted2
            };
        }
    }

    // Modo 1: Linha única combinada
    const availW = width - 6;
    const availH = height - 4;

    const fullStr = width >= 54 ? `${partyName} ${countStr}` : partyName;
    const targetSize = Math.round(12 * fontMultiplier);

    const fitted = Math.min(targetSize, Math.floor(availH), Math.floor(availW / (fullStr.length * 0.7)));

    if (fitted >= 7) {
        return {
            mode: 1,
            text1: fullStr,
            size1: fitted
        };
    }

    return { mode: 0 };
}

/**
 * TreeMapModal - Exibe o mapa de árvores das comunidades e seus partidos.
 */
export default function TreeMapModal({
    isOpen,
    onClose,
    legendData = [],
    legendDetails = {},
    totalVisible = 0
}) {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredTile, setHoveredTile] = useState(null);
    const [fontMultiplier, setFontMultiplier] = useState(1.0);

    // Atualiza dimensões do contêiner para o cálculo responsivo do treemap
    useEffect(() => {
        if (!isOpen) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: Math.max(0, rect.width),
                    height: Math.max(0, rect.height)
                });
            }
        };

        updateDimensions();
        const resizeObserver = new ResizeObserver(() => updateDimensions());
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [isOpen]);

    // Prepara a estrutura hierárquica dos dados para o treemap
    const communityItems = useMemo(() => {
        if (!legendData || legendData.length === 0) return [];

        return legendData.map(comm => {
            const details = legendDetails[comm.key] || { partyCounts: {}, total: comm.count };
            const partyCounts = details.partyCounts || {};

            const parties = Object.entries(partyCounts).map(([party, count]) => ({
                key: `${comm.key}-${party}`,
                party,
                value: count,
                communityKey: comm.key,
                communityLabel: comm.label,
                communityColor: comm.color
            })).sort((a, b) => b.value - a.value);

            return {
                key: comm.key,
                value: comm.count,
                label: comm.label,
                color: comm.color,
                parties
            };
        }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
    }, [legendData, legendDetails]);

    // Calcula o leiaute de 2 níveis (Comunidades -> Partidos)
    const treemapStructure = useMemo(() => {
        if (dimensions.width <= 0 || dimensions.height <= 0 || communityItems.length === 0) {
            return [];
        }

        const commLayouts = computeTreemapLayout(communityItems, dimensions.width, dimensions.height);

        return commLayouts.map(commLayout => {
            const commData = commLayout.data;
            const PADDING = 4;
            const HEADER_HEIGHT = 28;

            const innerWidth = Math.max(0, commLayout.width - PADDING * 2);
            const innerHeight = Math.max(0, commLayout.height - HEADER_HEIGHT - PADDING * 2);

            let partyTiles = [];
            if (innerWidth > 0 && innerHeight > 0 && commData.parties.length > 0) {
                partyTiles = computeTreemapLayout(
                    commData.parties,
                    innerWidth,
                    innerHeight,
                    commLayout.x + PADDING,
                    commLayout.y + HEADER_HEIGHT + PADDING
                );
            }

            return {
                ...commLayout,
                headerHeight: HEADER_HEIGHT,
                padding: PADDING,
                partyTiles
            };
        });
    }, [communityItems, dimensions]);

    // Exportação de Imagem em alta resolução usando Canvas HTML5
    const handleExportImage = useCallback(() => {
        if (communityItems.length === 0) return;

        const canvas = document.createElement('canvas');
        const exportWidth = 2400;
        const exportHeight = 1350;
        canvas.width = exportWidth;
        canvas.height = exportHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportWidth, exportHeight);

        // Área do Treemap no Canvas (ocupa a tela inteira com margem de 20px)
        const margin = 20;
        const treemapW = exportWidth - margin * 2;
        const treemapH = exportHeight - margin * 2;
        const startX = margin;
        const startY = margin;

        const commLayouts = computeTreemapLayout(communityItems, treemapW, treemapH, startX, startY);

        commLayouts.forEach(commLayout => {
            const commData = commLayout.data;
            const padding = 6;
            const commHeaderH = 38;

            // Fundo da comunidade (transparente/suave)
            ctx.fillStyle = commData.color + '18';
            ctx.fillRect(commLayout.x, commLayout.y, commLayout.width, commLayout.height);

            // Borda da comunidade
            ctx.strokeStyle = commData.color;
            ctx.lineWidth = 4;
            ctx.strokeRect(commLayout.x, commLayout.y, commLayout.width, commLayout.height);

            // Cabeçalho da comunidade
            ctx.fillStyle = commData.color;
            ctx.fillRect(commLayout.x, commLayout.y, commLayout.width, commHeaderH);

            // Texto do cabeçalho
            const pctComm = totalVisible > 0 ? ((commData.value / totalVisible) * 100).toFixed(1) : 0;
            const headerText = `${commData.label} (${commData.value} - ${pctComm}%)`;
            
            let headerFontSize = Math.round(18 * fontMultiplier);
            ctx.font = `bold ${headerFontSize}px Inter, "Segoe UI", sans-serif`;
            let textWidth = ctx.measureText(headerText).width;
            while (textWidth > commLayout.width - 20 && headerFontSize > 10) {
                headerFontSize -= 1;
                ctx.font = `bold ${headerFontSize}px Inter, "Segoe UI", sans-serif`;
                textWidth = ctx.measureText(headerText).width;
            }

            if (headerFontSize >= 10 && textWidth <= commLayout.width - 10) {
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(headerText, commLayout.x + 12, commLayout.y + commHeaderH / 2);
            }

            // Sub-tiles dos partidos
            const innerW = Math.max(0, commLayout.width - padding * 2);
            const innerH = Math.max(0, commLayout.height - commHeaderH - padding * 2);

            if (innerW > 0 && innerH > 0 && commData.parties.length > 0) {
                const partyTiles = computeTreemapLayout(
                    commData.parties,
                    innerW,
                    innerH,
                    commLayout.x + padding,
                    commLayout.y + commHeaderH + padding
                );

                partyTiles.forEach(tile => {
                    const partyData = tile.data;
                    const tileX = tile.x;
                    const tileY = tile.y;
                    const tileW = tile.width;
                    const tileH = tile.height;

                    // Bloco do partido
                    ctx.fillStyle = commData.color;
                    ctx.fillRect(tileX, tileY, tileW, tileH);

                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(tileX, tileY, tileW, tileH);

                    // Renderização de texto com auto-fit rigoroso
                    const tileLayout = computePartyTileLayout(partyData.party, partyData.value, tileW, tileH, fontMultiplier);

                    if (tileLayout.mode > 0) {
                        ctx.fillStyle = '#ffffff';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        if (tileLayout.mode === 2) {
                            ctx.font = `bold ${tileLayout.size1}px Inter, "Segoe UI", sans-serif`;
                            ctx.fillText(tileLayout.text1, tileX + tileW / 2, tileY + tileH / 2 - tileLayout.size2 / 2 - 1);

                            ctx.font = `normal ${tileLayout.size2}px Inter, "Segoe UI", sans-serif`;
                            ctx.fillText(tileLayout.text2, tileX + tileW / 2, tileY + tileH / 2 + tileLayout.size1 / 2 + 1);
                        } else {
                            ctx.font = `bold ${tileLayout.size1}px Inter, "Segoe UI", sans-serif`;
                            ctx.fillText(tileLayout.text1, tileX + tileW / 2, tileY + tileH / 2);
                        }
                    }
                });
            }
        });

        const link = document.createElement('a');
        link.download = `mapa-de-arvores-comunidades-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }, [communityItems, totalVisible, fontMultiplier]);

    if (!isOpen) return null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <div>
                        <h2 style={titleStyle}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                            Mapa de Árvores por Comunidade
                        </h2>
                        <p style={subtitleStyle}>
                            Distribuição proporcional dos {totalVisible} deputados visíveis entre comunidades e seus respectivos partidos políticos.
                        </p>
                    </div>
                    <button style={closeButtonStyle} onClick={onClose} title="Fechar">
                        ✕
                    </button>
                </div>

                {/* Barra de Ferramentas (Exportar e Ajuste de Fonte) */}
                <div style={toolbarStyle}>
                    <div style={sliderContainerStyle}>
                        <label style={labelStyle}>
                            Tamanho do Texto: <strong>{fontMultiplier.toFixed(1)}x</strong>
                        </label>
                        <input
                            type="range"
                            min="0.8"
                            max="3.0"
                            step="0.1"
                            value={fontMultiplier}
                            onChange={(e) => setFontMultiplier(parseFloat(e.target.value))}
                            style={sliderStyle}
                            title="Ajustar escala da fonte sem ultrapassar os retângulos"
                        />
                    </div>
                    <Button
                        variant="primary"
                        onClick={handleExportImage}
                        style={{ padding: `${SPACING.xs} ${SPACING.lg}`, fontSize: FONTS.sizeSm }}
                        icon={
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        }
                    >
                        Exportar imagem
                    </Button>
                </div>

                {/* Body / Container do Treemap */}
                <div style={bodyStyle} ref={containerRef}>
                    {treemapStructure.length === 0 ? (
                        <div style={emptyStyle}>Nenhum dado de comunidade disponível para exibição.</div>
                    ) : (
                        treemapStructure.map((comm) => {
                            const commData = comm.data;
                            const pctComm = totalVisible > 0 ? ((commData.value / totalVisible) * 100).toFixed(1) : 0;

                            // Cálculo dinâmico do tamanho da fonte do cabeçalho da comunidade
                            const baseHeaderSize = 13 * fontMultiplier;
                            const maxHeaderW = comm.width - 24;
                            const fullHeaderText = `${commData.label} (${commData.value} - ${pctComm}%)`;
                            const headerFittedSize = maxHeaderW > 0 
                                ? Math.min(baseHeaderSize, Math.max(9, Math.floor(maxHeaderW / (fullHeaderText.length * 0.58))))
                                : 12;

                            return (
                                <div
                                    key={commData.key}
                                    style={{
                                        position: 'absolute',
                                        left: comm.x,
                                        top: comm.y,
                                        width: comm.width,
                                        height: comm.height,
                                        padding: `${comm.padding}px`,
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    {/* Caixa da Comunidade */}
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: commData.color + '15',
                                            border: `2px solid ${commData.color}`,
                                            borderRadius: SPACING.radiusSm,
                                            overflow: 'hidden',
                                            boxSizing: 'border-box',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        {/* Cabeçalho da Comunidade */}
                                        <div
                                            style={{
                                                height: `${comm.headerHeight}px`,
                                                backgroundColor: commData.color,
                                                color: COLORS.textWhite,
                                                padding: `0 ${SPACING.sm}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: `${headerFittedSize}px`,
                                                fontWeight: FONTS.weightSemibold,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                flexShrink: 0
                                            }}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {commData.label}
                                            </span>
                                            <span style={{ fontSize: `${Math.max(8, headerFittedSize * 0.85)}px`, opacity: 0.9, marginLeft: SPACING.xs }}>
                                                {commData.value} ({pctComm}%)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tiles dos Partidos */}
                                    {comm.partyTiles.map((tile) => {
                                        const partyData = tile.data;
                                        const isHovered = hoveredTile === partyData.key;
                                        const pctPartyInComm = commData.value > 0 ? ((partyData.value / commData.value) * 100).toFixed(1) : 0;

                                        const tileLayout = computePartyTileLayout(partyData.party, partyData.value, tile.width, tile.height, fontMultiplier);

                                        return (
                                            <div
                                                key={partyData.key}
                                                style={{
                                                    position: 'absolute',
                                                    left: tile.x - comm.x,
                                                    top: tile.y - comm.y,
                                                    width: tile.width,
                                                    height: tile.height,
                                                    padding: '1px',
                                                    boxSizing: 'border-box',
                                                    zIndex: isHovered ? 10 : 1
                                                }}
                                                onMouseEnter={() => setHoveredTile(partyData.key)}
                                                onMouseLeave={() => setHoveredTile(null)}
                                                title={`${commData.label} | ${partyData.party}: ${partyData.value} deputados (${pctPartyInComm}% da comunidade)`}
                                            >
                                                <div
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        backgroundColor: commData.color,
                                                        filter: isHovered ? 'brightness(1.15)' : 'brightness(0.95)',
                                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                                        borderRadius: '3px',
                                                        boxSizing: 'border-box',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: COLORS.textWhite,
                                                        padding: '1px 2px',
                                                        overflow: 'hidden',
                                                        transition: 'all 0.15s ease',
                                                        cursor: 'pointer',
                                                        boxShadow: isHovered ? SHADOWS.cardHover : 'none'
                                                    }}
                                                >
                                                    {tileLayout.mode === 2 && (
                                                        <>
                                                            <span
                                                                style={{
                                                                    fontWeight: FONTS.weightSemibold,
                                                                    fontSize: `${tileLayout.size1}px`,
                                                                    lineHeight: 1,
                                                                    textAlign: 'center',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'clip',
                                                                    maxWidth: '100%'
                                                                }}
                                                            >
                                                                {tileLayout.text1}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: `${tileLayout.size2}px`,
                                                                    lineHeight: 1,
                                                                    opacity: 0.9,
                                                                    textAlign: 'center',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'clip',
                                                                    maxWidth: '100%',
                                                                    marginTop: '1px'
                                                                }}
                                                            >
                                                                {tileLayout.text2}
                                                            </span>
                                                        </>
                                                    )}
                                                    {tileLayout.mode === 1 && (
                                                        <span
                                                            style={{
                                                                fontWeight: FONTS.weightSemibold,
                                                                fontSize: `${tileLayout.size1}px`,
                                                                lineHeight: 1,
                                                                textAlign: 'center',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'clip',
                                                                maxWidth: '100%'
                                                            }}
                                                        >
                                                            {tileLayout.text1}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

// Estilos
const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(3px)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
};

const modalStyle = {
    backgroundColor: COLORS.frameBg,
    borderRadius: SPACING.radiusLg,
    boxShadow: SHADOWS.card,
    width: '92vw',
    maxWidth: '1200px',
    height: '88vh',
    maxHeight: '850px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out',
};

const headerStyle = {
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderBottom: `1px solid ${COLORS.borderLight}`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundAlt,
};

const titleStyle = {
    margin: 0,
    fontSize: FONTS.sizeXl,
    fontWeight: FONTS.weightSemibold,
    color: COLORS.textDark,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
};

const subtitleStyle = {
    margin: `${SPACING.xs} 0 0 0`,
    fontSize: FONTS.sizeSm,
    color: COLORS.textMedium,
};

const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    fontWeight: 'bold',
    color: COLORS.textMedium,
    cursor: 'pointer',
    padding: SPACING.xs,
    borderRadius: SPACING.radiusSm,
    lineHeight: 1,
    transition: 'color 0.15s',
};

const toolbarStyle = {
    padding: `${SPACING.xs} ${SPACING.lg}`,
    borderBottom: `1px solid ${COLORS.borderLight}`,
    backgroundColor: COLORS.frameBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
};

const sliderContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
};

const labelStyle = {
    fontSize: FONTS.sizeSm,
    color: COLORS.textDark,
    whiteSpace: 'nowrap',
};

const sliderStyle = {
    accentColor: COLORS.orange,
    cursor: 'pointer',
    width: '140px',
};

const bodyStyle = {
    flex: 1,
    position: 'relative',
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundAlt,
    overflow: 'hidden',
};

const emptyStyle = {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.textLight,
    fontStyle: 'italic',
};
