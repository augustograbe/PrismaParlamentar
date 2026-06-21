import Frame from './Frame';
import Tooltip from './Tooltip';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { Pin } from 'lucide-react';

/**
 * PinnedPanel - Frame que lista os deputados fixados
 * Props:
 * - pinnedDeputies: array de { id, nome, sigla_partido }
 * - onRemove: callback (id) ao remover um deputado da lista
 * - onSelect: callback (dep) ao clicar no nome de um deputado
 */
export default function PinnedPanel({ 
    pinnedDeputies = [], 
    onRemove, 
    onSelect, 
    isMinimized, 
    onToggleMinimize, 
    deputyRankings, 
    width = '250px', 
    height = 'auto',
    style = {},
    hideHeader = false 
}) {


    const pinIcon = (
        <Pin size={16} color={COLORS.orange} />
    );

    const listStyle = {
        padding: `0 ${SPACING.lg} ${SPACING.md}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    };

    const itemStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${SPACING.sm} ${SPACING.sm}`,
        borderRadius: SPACING.radiusSm,
        fontSize: FONTS.sizeSm,
        color: COLORS.textDark,
        transition: 'background-color 0.15s',
    };

    const partyStyle = {
        fontSize: FONTS.sizeXs,
        color: COLORS.textMedium,
        marginLeft: SPACING.xs,
    };

    const removeButtonStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: COLORS.textLight,
        fontSize: FONTS.sizeMd,
        padding: `0 ${SPACING.xs}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: SPACING.radiusSm,
        transition: 'color 0.15s, background-color 0.15s',
        lineHeight: 1,
    };

    const emptyStyle = {
        padding: `${SPACING.md} ${SPACING.lg}`,
        fontSize: FONTS.sizeSm,
        color: COLORS.textLight,
        textAlign: 'center',
        fontStyle: 'italic',
    };

    return (
        <Frame
            width={width}
            height={height}
            position={{ position: 'relative' }}
            style={{ flex: isMinimized ? '0 0 auto' : '0 1 auto', minHeight: 0, ...style }}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    {pinIcon} Fixados ({pinnedDeputies.length})
                    <Tooltip text="Para fixar um deputado, clique em seu vértice no grafo e depois no ícone de alfinete (Pin) no card." />
                </span>
            }
            showMinimize={true}
            isMinimized={isMinimized}
            onToggleMinimize={onToggleMinimize}
            hideHeader={hideHeader}
        >
            {pinnedDeputies.length === 0 ? (
                <div style={emptyStyle}>
                    Nenhum deputado fixado
                </div>
            ) : (
                <div style={listStyle}>
                    {pinnedDeputies.map((dep) => (
                        <div
                            key={dep.id}
                            style={itemStyle}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div 
                                style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, minWidth: 0, cursor: 'pointer' }}
                                onClick={() => onSelect && onSelect(dep)}
                                title={`Selecionar ${dep.nome}`}
                            >
                                {deputyRankings && deputyRankings[dep.id] !== undefined && (
                                    <span style={{
                                        fontSize: FONTS.sizeXs,
                                        fontWeight: FONTS.weightBold,
                                        color: COLORS.orange,
                                        marginRight: SPACING.xs,
                                        flexShrink: 0,
                                        backgroundColor: 'rgba(232, 133, 12, 0.1)',
                                        padding: '1px 4px',
                                        borderRadius: SPACING.radiusSm,
                                    }}>
                                        #{deputyRankings[dep.id]}
                                    </span>
                                )}
                                <span style={{ 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    fontWeight: FONTS.weightMedium,
                                }}>
                                    {dep.nome}
                                </span>
                                <span style={partyStyle}>{dep.sigla_partido || dep.partido}</span>
                            </div>
                            <button
                                style={removeButtonStyle}
                                title="Remover dos fixados"
                                onClick={() => onRemove(dep.id)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#e74c3c';
                                    e.currentTarget.style.backgroundColor = 'rgba(231,76,60,0.08)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = COLORS.textLight;
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 1L11 11M11 1L1 11" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Frame>
    );
}
