import Frame from './Frame';
import Tooltip from './Tooltip';
import Button from './Button';
import { COLORS, SPACING, FONTS } from '../constants/theme';

/**
 * LegendPanel - Frame de legenda mostrando as categorias do grafo
 * Props:
 * - legendData: array de { key, label, color, count }
 * - totalVisible: total de vértices visíveis
 * - onHoverGroup: callback (groupKey | null) ao hover/leave
 * - separateBy: critério atual de separação do grafo
 * - onOpenTreeMap: callback para abrir o modal de mapa de árvores
 */
export default function LegendPanel({ 
    legendData = [], 
    totalVisible = 0, 
    onHoverGroup, 
    isMinimized, 
    onToggleMinimize, 
    width = '250px', 
    height = 'auto',
    style = {},
    hideHeader = false,
    separateBy,
    onOpenTreeMap
}) {
    const legendIcon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );

    const listStyle = {
        padding: `0 ${SPACING.md} ${SPACING.md}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        overflowY: 'visible',
    };

    const itemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: `${SPACING.xs} ${SPACING.sm}`,
        borderRadius: SPACING.radiusSm,
        cursor: 'default',
        transition: 'background-color 0.15s',
        fontSize: FONTS.sizeSm,
        color: COLORS.textDark,
    };

    const dotStyle = (color) => ({
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
    });

    const nameStyle = {
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontWeight: FONTS.weightMedium,
    };

    const countStyle = {
        fontSize: FONTS.sizeXs,
        color: COLORS.textMedium,
        whiteSpace: 'nowrap',
    };

    // Sort by count descending
    const sorted = [...legendData].sort((a, b) => b.count - a.count);

    return (
        <Frame
            width={width}
            height={height}
            position={{ position: 'relative' }}
            style={{ flex: isMinimized ? '0 0 auto' : '0 1 auto', minHeight: 0, ...style }}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    {legendIcon} Legenda ({totalVisible})
                    <Tooltip text="O número no título representa o total de deputados visíveis no grafo. Os números abaixo mostram a quantidade por grupo e a porcentagem correspondente." />
                </span>
            }
            showMinimize={true}
            isMinimized={isMinimized}
            onToggleMinimize={onToggleMinimize}
            hideHeader={hideHeader}
        >
            {sorted.length === 0 ? (
                <div style={{ padding: `${SPACING.md} ${SPACING.lg}`, fontSize: FONTS.sizeSm, color: COLORS.textLight, textAlign: 'center', fontStyle: 'italic' }}>
                    Carregando...
                </div>
            ) : (
                <div style={listStyle}>
                    {sorted.map((item) => {
                        const pct = totalVisible > 0 ? ((item.count / totalVisible) * 100).toFixed(1) : '0.0';
                        return (
                            <div
                                key={item.key}
                                style={itemStyle}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = COLORS.backgroundHover;
                                    if (onHoverGroup) onHoverGroup(item.key);
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    if (onHoverGroup) onHoverGroup(null);
                                }}
                            >
                                <span style={dotStyle(item.color)} />
                                <span style={nameStyle}>{item.label}</span>
                                <span style={countStyle}>{item.count} ({pct}%)</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {separateBy === 'comunidade' && (
                <div style={{ padding: SPACING.sm, borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'center' }}>
                    <Button
                        variant="primary"
                        onClick={onOpenTreeMap}
                        style={{ width: '100%', fontSize: FONTS.sizeSm, padding: `${SPACING.xs} ${SPACING.md}` }}
                        icon={
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                        }
                    >
                        Mapa de árvores
                    </Button>
                </div>
            )}
        </Frame>
    );
}
