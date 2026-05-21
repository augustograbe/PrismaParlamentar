import React, { useState, useEffect, useRef } from 'react';
import { COLORS, FONTS, SPACING } from '../constants/theme';

// Fixed colors for statuses, we can generate a random one if it doesn't exist,
// or just use a palette.
const STATUS_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

function getStatusColor(index) {
    return STATUS_COLORS[index % STATUS_COLORS.length];
}

function getContrastColor(hexColor) {
    if (!hexColor.startsWith('#')) return '#ffffff';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#2d2d2d' : '#ffffff';
}

export default function DeputyStats({ deputyId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [hoveredSegment, setHoveredSegment] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const barRef = useRef(null);

    useEffect(() => {
        if (!deputyId) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/deputados/${deputyId}/estatisticas_gerais/`);
                if (!response.ok) throw new Error('Falha ao buscar estatísticas');
                const data = await response.json();
                setStats(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [deputyId]);

    if (loading) return <div style={{ paddingBottom: SPACING.md, color: COLORS.textMedium, fontSize: FONTS.sizeSm }}>Carregando estatísticas...</div>;
    if (error) return null;
    if (!stats) return null;

    const handleSegmentEnter = (tipo, situacao, count, e) => {
        setHoveredSegment({ tipo, situacao, count });
        if (barRef.current) {
            const barRect = barRef.current.getBoundingClientRect();
            const x = e.clientX - barRect.left;
            const y = e.clientY - barRect.top;
            setTooltipPos({ x, y });
        }
    };

    const handleSegmentMove = (e) => {
        if (barRef.current) {
            const barRect = barRef.current.getBoundingClientRect();
            const x = e.clientX - barRect.left;
            const y = e.clientY - barRect.top;
            setTooltipPos({ x, y });
        }
    };

    const handleSegmentLeave = () => {
        setHoveredSegment(null);
    };

    const tooltipStyle = {
        position: 'absolute',
        top: `${tooltipPos.y}px`,
        left: `${tooltipPos.x}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px',
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

    // Extract stats for the 3 key types
    const plData = stats.tipos_proposicao?.['PL'] || { total: 0, situacoes: {} };
    const plpData = stats.tipos_proposicao?.['PLP'] || { total: 0, situacoes: {} };
    const pecData = stats.tipos_proposicao?.['PEC'] || { total: 0, situacoes: {} };

    const items = [
        {
            key: 'PL',
            label: 'Projetos de Lei (PL)',
            total: plData.total,
            showBar: false,
            situacoes: []
        },
        {
            key: 'PLP',
            label: 'Projetos de Lei Complementar (PLP)',
            total: plpData.total,
            showBar: false,
            situacoes: []
        },
        {
            key: 'PEC',
            label: 'Propostas de Emenda à Constituição (PEC)',
            total: pecData.total,
            showBar: true,
            situacoes: Object.entries(pecData.situacoes || {})
                .map(([sit, count], i) => ({ situacao: sit, count, color: getStatusColor(i) }))
                .sort((a, b) => b.count - a.count)
        }
    ];

    return (
        <div style={{ marginBottom: SPACING.xl, display: 'flex', gap: SPACING.xl, flexWrap: 'wrap' }}>
            {/* Left side card: Discursos */}
            <div style={{
                flex: '1 1 200px',
                backgroundColor: COLORS.backgroundLight,
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: SPACING.radiusMd,
                padding: SPACING.md,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                minHeight: '120px'
            }}>
                <span style={{ fontSize: FONTS.sizeMd, color: COLORS.textMedium, fontWeight: '500', marginBottom: '8px' }}>
                    Discursos no Mandato
                </span>
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: COLORS.textDark, lineHeight: 1 }}>
                    {stats.total_discursos}
                </span>
            </div>

            {/* Right side card: Proposições */}
            <div style={{
                flex: '3 1 500px',
                backgroundColor: COLORS.backgroundLight,
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: SPACING.radiusMd,
                padding: SPACING.md,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                position: 'relative'
            }} ref={barRef}>
                <h4 style={{ fontSize: FONTS.sizeMd, color: COLORS.textMedium, fontWeight: '500', margin: '0 0 12px 0' }}>
                    Proposições Apresentadas
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((item) => (
                        <div key={item.key} style={{ 
                            display: 'flex', 
                            flexDirection: item.showBar ? 'column' : 'row', 
                            alignItems: item.showBar ? 'flex-start' : 'center', 
                            minHeight: '24px', 
                            flexWrap: 'wrap', 
                            gap: item.showBar ? '4px' : '8px' 
                        }}>
                            {/* Label Column with fixed width for perfect vertical alignment */}
                            <div style={{ width: '350px', fontSize: FONTS.sizeMd, color: COLORS.textDark, display: 'flex', justifyContent: 'space-between', paddingRight: '12px' }}>
                                <span style={{ fontWeight: '500' }}>{item.label}</span>
                                <span style={{ fontWeight: 'bold', color: COLORS.orange }}>{item.total}</span>
                            </div>

                            {/* Bar segment (only for PEC, at half width: 280px) */}
                            {item.showBar && item.total > 0 ? (
                                <div style={{
                                    width: '280px',
                                    height: '14px',
                                    backgroundColor: COLORS.sliderTrack || '#e5e7eb',
                                    borderRadius: '7px',
                                    display: 'flex',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    marginTop: '2px',
                                }}>
                                    {item.situacoes.map((sit, idx) => {
                                        const percent = (sit.count / item.total) * 100;
                                        const showText = percent > 15;
                                        const textColor = getContrastColor(sit.color);

                                        return (
                                            <div
                                                key={idx}
                                                onMouseEnter={(e) => handleSegmentEnter(item.key, sit.situacao, sit.count, e)}
                                                onMouseMove={handleSegmentMove}
                                                onMouseLeave={handleSegmentLeave}
                                                style={{
                                                    width: `${percent}%`,
                                                    height: '100%',
                                                    backgroundColor: sit.color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'filter 0.2s',
                                                    filter: hoveredSegment?.tipo === item.key && hoveredSegment?.situacao === sit.situacao ? 'brightness(1.15)' : 'none',
                                                }}
                                            >
                                                {showText && (
                                                    <span style={{
                                                        fontSize: '9px',
                                                        fontWeight: 'bold',
                                                        color: textColor,
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {sit.count}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : item.showBar && item.total === 0 ? (
                                <div style={{ fontSize: '11px', color: COLORS.textLight, fontStyle: 'italic' }}>
                                    Sem proposições registradas
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>

                {/* Tooltip rendered absolutely inside the right side card */}
                {hoveredSegment && (
                    <div style={tooltipStyle}>
                        <div style={{ marginBottom: '2px' }}>
                            <strong>{hoveredSegment.situacao}</strong>
                        </div>
                        <div>{hoveredSegment.count} proposições ({hoveredSegment.tipo})</div>
                    </div>
                )}
            </div>
        </div>
    );
}
