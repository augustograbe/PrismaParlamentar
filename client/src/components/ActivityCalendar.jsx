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
        switch(intensidade) {
            case 1: return '#ffc58a';
            case 2: return COLORS.orangeLight;
            case 3: return COLORS.orange;
            case 4: return '#b86604';
            case 0:
            default: return '#ebedf0';
        }
    };

    if (loading) return <div style={{ padding: SPACING.md, color: COLORS.textMedium }}>Carregando atividades...</div>;
    if (error) return <div style={{ padding: SPACING.md, color: COLORS.textMedium }}>Erro: {error}</div>;

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return (
        <div style={{ position: 'relative', marginTop: SPACING.md }}>
            <h3 style={{ fontSize: FONTS.sizeMd, marginBottom: SPACING.md, color: COLORS.textDark }}>
                Atividade Parlamentar ({selectedYear})
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, overflowX: 'auto', paddingBottom: SPACING.sm }}>
                    {/* Month headers */}
                    <div style={{ display: 'flex', marginLeft: '30px', position: 'relative', height: '20px' }}>
                        {weeks.map((week, i) => {
                            const d = new Date(week[0].date + 'T12:00:00');
                            const month = d.getMonth();
                            const prevMonth = i > 0 ? new Date(weeks[i-1][0].date + 'T12:00:00').getMonth() : -1;
                            if (month !== prevMonth && i < weeks.length - 2) {
                                return (
                                    <div key={i} style={{ position: 'absolute', left: `${i * 15}px`, fontSize: '12px', color: COLORS.textMedium }}>
                                        {monthNames[month]}
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>

                    <div style={{ display: 'flex' }}>
                        {/* Day headers */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginRight: '8px', fontSize: '12px', color: COLORS.textMedium }}>
                            <div style={{ height: '12px', lineHeight: '12px' }}></div>
                            <div style={{ height: '12px', lineHeight: '12px' }}>Seg</div>
                            <div style={{ height: '12px', lineHeight: '12px' }}></div>
                            <div style={{ height: '12px', lineHeight: '12px' }}>Qua</div>
                            <div style={{ height: '12px', lineHeight: '12px' }}></div>
                            <div style={{ height: '12px', lineHeight: '12px' }}>Sex</div>
                            <div style={{ height: '12px', lineHeight: '12px' }}></div>
                        </div>

                        {/* Grid */}
                        <div style={{ display: 'flex', gap: '3px' }}>
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {week.map((day, dayIndex) => (
                                        <div 
                                            key={day.date}
                                            onMouseEnter={(e) => setHoveredCell({ day, rect: e.target.getBoundingClientRect() })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                            style={{
                                                width: '12px',
                                                height: '12px',
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
                    </div>
                </div>

                {/* Years Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: SPACING.xl }}>
                    {years.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            style={{
                                background: selectedYear === year ? COLORS.orange : 'transparent',
                                color: selectedYear === year ? 'white' : COLORS.textMedium,
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: selectedYear === year ? 'bold' : 'normal',
                                transition: 'background 0.2s',
                            }}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: FONTS.sizeSm, color: COLORS.textMedium, marginTop: SPACING.sm, marginLeft: '30px' }}>
                <span>Menos</span>
                <div style={{ width: 12, height: 12, backgroundColor: getColor(0, true), borderRadius: 2 }}></div>
                <div style={{ width: 12, height: 12, backgroundColor: getColor(1, true), borderRadius: 2 }}></div>
                <div style={{ width: 12, height: 12, backgroundColor: getColor(2, true), borderRadius: 2 }}></div>
                <div style={{ width: 12, height: 12, backgroundColor: getColor(3, true), borderRadius: 2 }}></div>
                <div style={{ width: 12, height: 12, backgroundColor: getColor(4, true), borderRadius: 2 }}></div>
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
