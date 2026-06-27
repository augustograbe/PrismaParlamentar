import React, { useState, useEffect } from 'react';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function ActivityCalendar({ deputyId }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hoveredCell, setHoveredCell] = useState(null);

    // Anos do mandato 57
    const years = [2026, 2025, 2024, 2023];
    const currentYear = new Date().getFullYear();
    const defaultYear = years.includes(currentYear) ? currentYear : 2024;
    const [selectedYear, setSelectedYear] = useState(defaultYear);

    useEffect(() => {
        if (!deputyId) return;

        const fetchActivities = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/deputados/${deputyId}/atividades/`);
                if (!response.ok) throw new Error('Falha ao buscar atividades');
                const data = await response.json();
                setActivities(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, [deputyId]);

    const activityMap = new Map();
    activities.forEach(act => {
        activityMap.set(act.data, act);
    });

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    
    // Começa no domingo
    const startGridDate = new Date(startDate);
    startGridDate.setDate(startGridDate.getDate() - startGridDate.getDay());
    
    // Termina no sábado
    const endGridDate = new Date(endDate);
    endGridDate.setDate(endGridDate.getDate() + (6 - endGridDate.getDay()));

    const days = [];
    let currentDate = new Date(startGridDate);
    while (currentDate <= endGridDate) {
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        
        const isCurrentYear = currentDate.getFullYear() === selectedYear;
        
        days.push({
            date: dateStr,
            isCurrentYear,
            activity: activityMap.get(dateStr) || { intensidade: 0, detalhes: null }
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    const getColor = (intensidade, isCurrentYear) => {
        if (!isCurrentYear) return 'transparent';
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        switch(intensidade) {
            case 1: return '#ffc58a';
            case 2: return COLORS.orangeLight;
            case 3: return COLORS.orange;
            case 4: return '#b86604';
            case 0:
            default: return isDark ? '#161b22' : '#e0e0e0';
        }
    };

    if (loading) return <div style={{ padding: SPACING.md, color: COLORS.textMedium }}>Carregando atividades...</div>;
    if (error) return <div style={{ padding: SPACING.md, color: COLORS.textMedium }}>Erro: {error}</div>;

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const CELL_SIZE = 13;
    const CELL_GAP = 3;
    const WEEK_WIDTH = CELL_SIZE + CELL_GAP;

    return (
        <div style={{
            position: 'relative',
            marginTop: SPACING.md,
            backgroundColor: COLORS.backgroundLight,
            border: `1px solid ${COLORS.borderLight}`,
            borderRadius: SPACING.radiusMd,
            padding: SPACING.md,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
            <h3 style={{ fontSize: FONTS.sizeMd, fontWeight: '500', marginBottom: SPACING.md, marginTop: 0, color: COLORS.textMedium }}>
                Atividade Parlamentar ({selectedYear})
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, overflowX: 'auto', paddingBottom: SPACING.sm }}>
                    {/* Month headers */}
                    <div style={{ display: 'flex', marginLeft: '30px', position: 'relative', height: '20px' }}>
                        {weeks.map((week, i) => {
                            const firstDayInYear = week.find(d => d.isCurrentYear);
                            if (!firstDayInYear) return null;
                            
                            const d = new Date(firstDayInYear.date + 'T12:00:00');
                            const month = d.getMonth();
                            
                            const prevWeekFirstDay = i > 0 ? weeks[i-1].find(d => d.isCurrentYear) : null;
                            const prevMonth = prevWeekFirstDay ? new Date(prevWeekFirstDay.date + 'T12:00:00').getMonth() : -1;
                            
                            if (month !== prevMonth && i < weeks.length - 2) {
                                return (
                                    <div key={i} style={{ position: 'absolute', left: `${i * WEEK_WIDTH}px`, fontSize: '11px', color: COLORS.textMedium }}>
                                        {monthNames[month]}
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>

                    <div style={{ display: 'flex' }}>
                        {/* Day headers */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px`, marginRight: '6px', fontSize: '11px', color: COLORS.textMedium }}>
                            <div style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}></div>
                            <div style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}>Seg</div>
                            <div style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}></div>
                            <div style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}>Qua</div>
                            <div style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}></div>
                            <div style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}>Sex</div>
                            <div style={{ height: `${CELL_SIZE}px`, lineHeight: `${CELL_SIZE}px` }}></div>
                        </div>

                        {/* Grid */}
                        <div style={{ display: 'flex', gap: `${CELL_GAP}px` }}>
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: `${CELL_GAP}px` }}>
                                    {week.map((day) => (
                                        <div 
                                            key={day.date}
                                            onMouseEnter={(e) => setHoveredCell({ day, rect: e.target.getBoundingClientRect() })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                            style={{
                                                width: `${CELL_SIZE}px`,
                                                height: `${CELL_SIZE}px`,
                                                backgroundColor: getColor(day.activity.intensidade, day.isCurrentYear),
                                                borderRadius: '2px',
                                                cursor: day.isCurrentYear ? 'pointer' : 'default',
                                                transition: 'transform 0.1s',
                                                visibility: day.isCurrentYear ? 'visible' : 'hidden'
                                            }}
                                            onMouseOver={(e) => { if(day.isCurrentYear) e.currentTarget.style.transform = 'scale(1.2)'; }}
                                            onMouseOut={(e) => { if(day.isCurrentYear) e.currentTarget.style.transform = 'scale(1)'; }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Years Selector aligned with top and bottom rows */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: `${7 * CELL_SIZE + 6 * CELL_GAP}px`, // 109px - aligns exactly with the first and last row
                            marginLeft: '12px',
                            flexShrink: 0
                        }}>
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    style={{
                                        background: selectedYear === year ? COLORS.orange : 'transparent',
                                        color: selectedYear === year ? 'white' : COLORS.textMedium,
                                        border: 'none',
                                        padding: '0 6px',
                                        height: '18px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: selectedYear === year ? 'bold' : 'normal',
                                        transition: 'background 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: FONTS.sizeSm, color: COLORS.textMedium, marginTop: SPACING.sm, marginLeft: '30px' }}>
                <span>Menos</span>
                <div style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getColor(0, true), borderRadius: 2 }}></div>
                <div style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getColor(1, true), borderRadius: 2 }}></div>
                <div style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getColor(2, true), borderRadius: 2 }}></div>
                <div style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getColor(3, true), borderRadius: 2 }}></div>
                <div style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getColor(4, true), borderRadius: 2 }}></div>
                <span>Mais</span>
            </div>

            {/* Tooltip */}
            {hoveredCell && hoveredCell.day.isCurrentYear && (
                <div style={{
                    position: 'fixed',
                    top: hoveredCell.rect.top - 10,
                    left: hoveredCell.rect.left + 6,
                    transform: 'translate(-50%, -100%)',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    color: 'white',
                    padding: `${SPACING.xs} ${SPACING.sm}`,
                    borderRadius: SPACING.radiusSm,
                    fontSize: FONTS.sizeSm,
                    zIndex: 100,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap'
                }}>
                    <strong>{hoveredCell.day.date.split('-').reverse().join('/')}</strong>
                    {hoveredCell.day.activity.detalhes ? (
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {hoveredCell.day.activity.detalhes.votos > 0 && <span>Votos: {hoveredCell.day.activity.detalhes.votos}</span>}
                            {hoveredCell.day.activity.detalhes.proposicoes > 0 && <span>Proposições: {hoveredCell.day.activity.detalhes.proposicoes}</span>}
                            {hoveredCell.day.activity.detalhes.presencas > 0 && <span>Presenças: {hoveredCell.day.activity.detalhes.presencas}</span>}
                            {hoveredCell.day.activity.detalhes.discursos > 0 && <span>Discursos: {hoveredCell.day.activity.detalhes.discursos}</span>}
                            <span style={{ color: COLORS.orange, marginTop: '2px' }}>
                                Pontuação: {hoveredCell.day.activity.detalhes.pontuacao_total}
                            </span>
                        </div>
                    ) : (
                        <div style={{ marginTop: '4px', color: '#ccc' }}>Sem atividade</div>
                    )}
                </div>
            )}
        </div>
    );
}
