import { useState, useRef } from 'react';
import Button from './Button';
import { COLORS, SPACING, FONTS, SHADOWS, PARTY_COLORS, STATE_COLORS, SEX_COLORS, COMMUNITY_COLORS } from '../constants/theme';
import { Pin, PinOff } from 'lucide-react';

const SEX_LABELS = { M: 'Masculino', F: 'Feminino', O: 'Outro' };

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
            const idx = parseInt(key, 10);
            if (isNaN(idx)) return COLORS.textMedium;
            return COMMUNITY_COLORS[idx % COMMUNITY_COLORS.length];
        }
        default:
            return PARTY_COLORS[key] || COLORS.textMedium;
    }
}

/**
 * Returns the display label for a group key based on separateBy.
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
 * Determines if text is readable on a given background color.
 * Returns 'white' or dark color based on luminance.
 */
function getContrastColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#2d2d2d' : '#ffffff';
}

/**
 * DeputyCard - Card de deputado com barra colorida, foto circular sobreposta, informações e botões
 * Props:
 * - deputy: objeto { nome, partido, estado, nodeColor, conexoes, presenca, maxConexoes, connectionBreakdown, ... }
 * - visible: se o card deve ser exibido
 * - onClose: callback ao fechar
 * - onPin: callback ao fixar
 * - onProfile: callback ao clicar em perfil
 * - separateBy: critério de separação ('partido', 'estado', 'sexo')
 * - onBarSegmentHover: callback (groupKey | null) ao hover/leave em segmento da barra
 */
export default function DeputyCard({
    deputy = null,
    visible = true,
    isPinned = false,
    onClose,
    onPin,
    onProfile,
    separateBy = 'partido',
    graphType = 'similaridade',
    onBarSegmentHover,
    onConnectionHover,
}) {
    const [hoveredSegment, setHoveredSegment] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [connectionsExpanded, setConnectionsExpanded] = useState(false);
    const barRef = useRef(null);

    if (!visible || !deputy) return null;

    const headerColor = deputy.nodeColor || COLORS.deputyHeaderGreen;
    const photoUrl = deputy.url_foto || deputy.urlFoto;
    const presenca = deputy.presenca !== undefined ? Number(deputy.presenca) : null;
    const conexoes = deputy.conexoes !== undefined ? deputy.conexoes : 0;
    const maxConexoes = deputy.maxConexoes || Math.max(conexoes, 1);
    const connectionBreakdown = deputy.connectionBreakdown || {};

    const topOffset = `calc(52px + ${SPACING.frameGap} + ${SPACING.frameGap})`;

    const PHOTO_SIZE = 90;
    const HEADER_HEIGHT = 36;
    const PHOTO_OVERLAP = 28;

    // Outer wrapper — has NO overflow:hidden so photo can stick out
    const outerStyle = {
        position: 'fixed',
        top: topOffset,
        left: SPACING.frameGap,
        width: '280px',
        zIndex: 10,
    };

    // Card body — white box with rounded corners and shadow
    const cardStyle = {
        backgroundColor: COLORS.frameBg,
        borderRadius: SPACING.radiusLg,
        boxShadow: SHADOWS.frame,
        overflow: 'hidden',
    };

    // Colored header bar
    const headerBarStyle = {
        height: `${HEADER_HEIGHT}px`,
        backgroundColor: headerColor,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingRight: SPACING.md,
    };

    // Close button
    const closeButtonStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: SPACING.xs,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.textWhite,
        borderRadius: SPACING.radiusSm,
    };

    // Photo circle — positioned relative to the outer wrapper, overlapping the header
    const photoWrapperStyle = {
        position: 'absolute',
        top: `${HEADER_HEIGHT - PHOTO_OVERLAP}px`,
        left: SPACING.lg,
        width: `${PHOTO_SIZE}px`,
        height: `${PHOTO_SIZE}px`,
        borderRadius: '50%',
        border: `3px solid ${headerColor}`,
        backgroundColor: COLORS.borderLight,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    };

    const photoImgStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'top',
    };

    const photoPlaceholderStyle = {
        fontSize: FONTS.sizeMd,
        color: COLORS.textLight,
        textAlign: 'center',
    };

    // Body area below header — needs padding-top to make room for the photo
    const bodyPaddingTop = PHOTO_SIZE - PHOTO_OVERLAP + 8;

    const bodyStyle = {
        paddingTop: `${bodyPaddingTop}px`,
        paddingLeft: SPACING.lg,
        paddingRight: SPACING.lg,
        paddingBottom: SPACING.md,
    };

    // Name and party info — next to the photo
    const infoBlockStyle = {
        marginLeft: `${PHOTO_SIZE + 12}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        minHeight: `${PHOTO_SIZE - PHOTO_OVERLAP - 4}px`,
        justifyContent: 'center',
        marginTop: `-${bodyPaddingTop - 8}px`,
    };

    const nameStyle = {
        fontSize: FONTS.sizeLg,
        fontWeight: FONTS.weightSemibold,
        color: COLORS.textDark,
        lineHeight: 1.2,
    };

    const detailStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        fontSize: FONTS.sizeSm,
        color: COLORS.textMedium,
    };

    const badgeStyle = {
        backgroundColor: headerColor,
        color: COLORS.partyBadgeText,
        padding: `1px ${SPACING.sm}`,
        borderRadius: SPACING.radiusSm,
        fontSize: FONTS.sizeXs,
        fontWeight: FONTS.weightSemibold,
    };

    // Stats section
    const statsStyle = {
        padding: `${SPACING.sm} ${SPACING.lg} ${SPACING.md}`,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.md,
    };

    const statRowStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
    };

    const statLabelStyle = {
        fontSize: FONTS.sizeSm,
        color: COLORS.textDark,
        fontWeight: FONTS.weightMedium,
        whiteSpace: 'nowrap',
    };

    // Progress bar background
    const progressTrackStyle = {
        flex: 1,
        height: '14px',
        backgroundColor: COLORS.sliderTrack,
        borderRadius: '7px',
        overflow: 'hidden',
    };

    // Progress bar fill
    const progressFillStyle = (percent, color) => ({
        height: '100%',
        width: `${Math.min(100, Math.max(0, percent))}%`,
        backgroundColor: color,
        borderRadius: '7px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'width 0.4s ease',
        flexShrink: 0,
    });

    const progressTextStyle = {
        fontSize: '10px',
        fontWeight: FONTS.weightSemibold,
        color: COLORS.white,
        lineHeight: 1,
    };

    // Buttons
    const buttonsStyle = {
        display: 'flex',
        gap: SPACING.md,
        padding: `${SPACING.xs} ${SPACING.lg} ${SPACING.lg}`,
    };

    const pinIconEl = isPinned
        ? <PinOff size={14} />
        : <Pin size={14} />;

    const profileIcon = (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="5" r="3" />
            <path d="M2 13c0-3 2.5-5 5-5s5 2 5 5" />
        </svg>
    );

    const conexoesPercent = maxConexoes > 0 ? (conexoes / maxConexoes) * 100 : 0;

    // Build segmented bar data from connectionBreakdown
    const breakdownEntries = Object.entries(connectionBreakdown)
        .map(([key, count]) => ({
            key,
            label: getGroupLabel(key, separateBy),
            color: getGroupColor(key, separateBy),
            count,
            percent: conexoes > 0 ? (count / conexoes) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

    const hasBreakdown = breakdownEntries.length > 0;

    // Handle segment hover
    const handleSegmentEnter = (entry, e) => {
        setHoveredSegment(entry.key);
        if (barRef.current) {
            const barRect = barRef.current.getBoundingClientRect();
            const x = e.clientX - barRect.left;
            const y = -8; // above the bar
            setTooltipPos({ x, y });
        }
        if (onBarSegmentHover) onBarSegmentHover(entry.key);
    };

    const handleSegmentMove = (entry, e) => {
        if (barRef.current) {
            const barRect = barRef.current.getBoundingClientRect();
            const x = e.clientX - barRect.left;
            setTooltipPos(prev => ({ ...prev, x }));
        }
    };

    const handleSegmentLeave = () => {
        setHoveredSegment(null);
        if (onBarSegmentHover) onBarSegmentHover(null);
    };

    // Get tooltip data for the hovered segment
    const hoveredEntry = breakdownEntries.find(e => e.key === hoveredSegment);

    // Tooltip style
    const tooltipStyle = {
        position: 'absolute',
        bottom: '100%',
        left: `${tooltipPos.x}px`,
        transform: 'translateX(-50%)',
        marginBottom: '6px',
        backgroundColor: 'rgba(40, 40, 40, 0.95)',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    };

    // Minimum width in pixels for showing percentage text inside a segment
    const MIN_PX_FOR_TEXT = 30;
    // The bar track total width (approx — we use percentage-based, but estimate for text check)
    // The track is flex:1 in a ~280px card minus label, so roughly 160px
    const TRACK_ESTIMATED_WIDTH = 150;

    return (
        <div style={outerStyle}>
            {/* Photo — sits ABOVE the card, overlapping the header */}
            <div style={photoWrapperStyle}>
                {photoUrl ? (
                    <img src={photoUrl} alt={deputy.nome} style={photoImgStyle} />
                ) : (
                    <span style={photoPlaceholderStyle}>Foto</span>
                )}
            </div>

            {/* Card body */}
            <div style={cardStyle}>
                {/* Colored header bar */}
                <div style={headerBarStyle}>
                    <button
                        onClick={onClose}
                        style={closeButtonStyle}
                        title="Fechar"
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.15)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 1L11 11M11 1L1 11" />
                        </svg>
                    </button>
                </div>

                {/* Body with name/info */}
                <div style={bodyStyle}>
                    <div style={infoBlockStyle}>
                        <span style={nameStyle}>{deputy.nome}</span>
                        <div style={detailStyle}>
                            <span style={badgeStyle}>{deputy.sigla_partido || deputy.partido}</span>
                            <span>•</span>
                            <span>{deputy.sigla_uf || deputy.estado}</span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div style={statsStyle}>
                    {/* Presença */}
                    {presenca !== null && (
                        <div style={statRowStyle}>
                            <span style={statLabelStyle}>Presença:</span>
                            <div style={{ ...progressTrackStyle, display: 'flex', alignItems: 'center' }}>
                                <div style={progressFillStyle(presenca, COLORS.orange)}>
                                    {presenca >= 20 && (
                                        <span style={progressTextStyle}>{presenca}%</span>
                                    )}
                                </div>
                                {presenca < 20 && (
                                    <span style={{ 
                                        fontSize: '10px', 
                                        fontWeight: FONTS.weightSemibold, 
                                        color: COLORS.textMedium,
                                        marginLeft: '6px'
                                    }}>
                                        {presenca}%
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Conexões — label + segmented bar inline */}
                    <div style={statRowStyle}>
                        <span style={statLabelStyle}>{conexoes} conexões</span>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <div
                                ref={barRef}
                                style={{
                                    ...progressTrackStyle,
                                    position: 'relative',
                                    display: 'flex',
                                    overflow: 'hidden',
                                }}
                            >
                                {hasBreakdown ? (
                                    <>
                                        {/* Segmented fill — all segments sit within the conexoesPercent width */}
                                        <div style={{
                                            display: 'flex',
                                            width: `${Math.min(100, Math.max(0, conexoesPercent))}%`,
                                            height: '100%',
                                            borderRadius: '7px',
                                            overflow: 'hidden',
                                            transition: 'width 0.4s ease',
                                        }}>
                                            {breakdownEntries.map((entry) => {
                                                // Each segment width is relative to total conexoes
                                                const segmentWidthPercent = conexoes > 0 ? (entry.count / conexoes) * 100 : 0;
                                                const segmentPxEstimate = (segmentWidthPercent / 100) * (conexoesPercent / 100) * TRACK_ESTIMATED_WIDTH;
                                                const showText = segmentPxEstimate >= MIN_PX_FOR_TEXT;
                                                const bgColor = entry.color;
                                                const textColor = getContrastColor(bgColor);
                                                const isHovered = hoveredSegment === entry.key;

                                                return (
                                                    <div
                                                        key={entry.key}
                                                        onMouseEnter={(e) => handleSegmentEnter(entry, e)}
                                                        onMouseMove={(e) => handleSegmentMove(entry, e)}
                                                        onMouseLeave={handleSegmentLeave}
                                                        style={{
                                                            width: `${segmentWidthPercent}%`,
                                                            height: '100%',
                                                            backgroundColor: bgColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            transition: 'opacity 0.15s, filter 0.15s',
                                                            opacity: hoveredSegment && !isHovered ? 0.5 : 1,
                                                            filter: isHovered ? 'brightness(1.15)' : 'none',
                                                            position: 'relative',
                                                            overflow: 'hidden',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {showText && (
                                                            <span style={{
                                                                fontSize: '9px',
                                                                fontWeight: FONTS.weightSemibold,
                                                                color: textColor,
                                                                lineHeight: 1,
                                                                whiteSpace: 'nowrap',
                                                                textShadow: '0 0 2px rgba(0,0,0,0.2)',
                                                            }}>
                                                                {entry.percent.toFixed(0)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    /* Fallback: solid orange bar when no breakdown data */
                                    <div style={progressFillStyle(conexoesPercent, COLORS.orange)} />
                                )}
                            </div>

                            {/* Tooltip — rendered outside the overflow:hidden bar */}
                            {hoveredEntry && (
                                <div style={tooltipStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: hoveredEntry.color,
                                            flexShrink: 0,
                                        }} />
                                        <strong>{hoveredEntry.label}</strong>
                                    </div>
                                    <div>{hoveredEntry.count} conexões ({hoveredEntry.percent.toFixed(1)}%)</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expandable connections list */}
                {conexoes > 0 && (
                    <div style={{ padding: `0 ${SPACING.lg}` }}>
                        <button
                            onClick={() => setConnectionsExpanded(!connectionsExpanded)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: SPACING.xs,
                                fontSize: FONTS.sizeXs,
                                color: COLORS.orange,
                                fontFamily: FONTS.family,
                                fontWeight: FONTS.weightMedium,
                                padding: `${SPACING.xs} 0`,
                                transition: 'color 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = COLORS.orangeHover}
                            onMouseLeave={(e) => e.currentTarget.style.color = COLORS.orange}
                        >
                            <svg
                                width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
                                style={{ transition: 'transform 0.2s', transform: connectionsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                                <path d="M3 1L7 5L3 9" />
                            </svg>
                            {connectionsExpanded ? 'Ocultar conexões' : 'Ver conexões'}
                        </button>

                        {connectionsExpanded && (() => {
                            const rawList = deputy.connectionsList || [];
                            const sortField = graphType === 'coautoria' ? 'coautoria' : 'similaridade';
                            const sorted = [...rawList].sort((a, b) => b[sortField] - a[sortField]);

                            return (
                                <div style={{
                                    maxHeight: '240px',
                                    overflow: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1px',
                                    paddingBottom: SPACING.sm,
                                }}>
                                    {sorted.map((conn) => (
                                        <div
                                            key={conn.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: SPACING.sm,
                                                padding: `3px ${SPACING.xs}`,
                                                borderRadius: SPACING.radiusSm,
                                                cursor: 'default',
                                                transition: 'background-color 0.12s',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f0f4ff';
                                                if (onConnectionHover) onConnectionHover(conn.nodeId);
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                if (onConnectionHover) onConnectionHover(null);
                                            }}
                                        >
                                            {/* Color dot */}
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: conn.nodeColor || COLORS.textMedium,
                                                flexShrink: 0,
                                            }} />
                                            {/* Name + party */}
                                            <div style={{
                                                flex: 1,
                                                minWidth: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                overflow: 'hidden',
                                            }}>
                                                <span style={{
                                                    fontSize: FONTS.sizeXs,
                                                    color: COLORS.textDark,
                                                    fontWeight: FONTS.weightMedium,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}>
                                                    {conn.nome}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: COLORS.textLight,
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0,
                                                }}>
                                                    {conn.sigla_partido}
                                                </span>
                                            </div>
                                            {/* Similarity/coautoria value */}
                                            <span style={{
                                                fontSize: FONTS.sizeXs,
                                                color: COLORS.orange,
                                                fontWeight: FONTS.weightSemibold,
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                            }}>
                                                {graphType === 'coautoria'
                                                    ? conn.coautoria
                                                    : `${conn.similaridade.toFixed(1)}%`
                                                }
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Buttons */}
                <div style={buttonsStyle}>
                    <Button variant="outline" icon={pinIconEl} onClick={onPin} style={{ flex: 1, fontSize: FONTS.sizeSm, padding: `${SPACING.sm} ${SPACING.md}` }}>
                        {isPinned ? 'Desfixar' : 'Fixar'}
                    </Button>
                    <Button variant="outline" icon={profileIcon} onClick={onProfile} style={{ flex: 1, fontSize: FONTS.sizeSm, padding: `${SPACING.sm} ${SPACING.md}` }}>
                        Perfil
                    </Button>
                </div>
            </div>
        </div>
    );
}
