import React, { useState, useEffect, useRef } from 'react';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useIsMobile } from '../utils/useIsMobile';

const MONTH_NAMES = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const MONTH_FULL_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function DeputyExpenses({ deputyId }) {
    const [selectedYear, setSelectedYear] = useState(2025);
    const [selectedMonth, setSelectedMonth] = useState(null); // null means year aggregate
    const [expensesData, setExpensesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tooltip state for the bar chart
    const [hoveredBar, setHoveredBar] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const chartRef = useRef(null);
    const isMobile = useIsMobile();

    const years = [2026, 2025, 2024, 2023];

    const [expandedCategory, setExpandedCategory] = useState(null);
    const [expandedCompany, setExpandedCompany] = useState(null);

    // Reset expanded category and company when filters change
    useEffect(() => {
        setExpandedCategory(null);
        setExpandedCompany(null);
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        if (!deputyId) return;

        const fetchExpenses = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/deputados/${deputyId}/despesas/?ano=${selectedYear}`);
                if (!response.ok) {
                    throw new Error('Falha ao carregar as despesas parlamentares.');
                }
                const data = await response.json();
                setExpensesData(data);
                
                // Clear selected month when year changes to ensure view consistency
                setSelectedMonth(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchExpenses();
    }, [deputyId, selectedYear]);

    // Helpers
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
                color: COLORS.textMedium,
                fontSize: FONTS.sizeMd,
                fontFamily: FONTS.family
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: `3px solid ${COLORS.borderLight}`,
                        borderTopColor: COLORS.orange,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <span>Carregando dados da cota parlamentar (CEAP)...</span>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: SPACING.radiusMd,
                padding: SPACING.lg,
                color: '#ef4444',
                fontSize: FONTS.sizeMd,
                fontFamily: FONTS.family,
                textAlign: 'center',
                margin: `${SPACING.lg} 0`
            }}>
                <strong>Erro ao carregar despesas:</strong> {error}
            </div>
        );
    }

    if (!expensesData) return null;

    const {
        limite_mensal,
        limite_anual,
        total_gasto_ano,
        percentual_gasto_ano,
        gastos_por_mes,
        detalhes_ano
    } = expensesData;

    // Selected month data if any
    const selectedMonthData = selectedMonth 
        ? gastos_por_mes.find(m => m.mes === selectedMonth) 
        : null;

    // Calculate Gauge Values
    const gaugeTitle = selectedMonth 
        ? `Uso da Cota em ${MONTH_FULL_NAMES[selectedMonth - 1]}`
        : `Uso da Cota Anual`;

    const gaugePercent = selectedMonth
        ? (selectedMonthData ? (selectedMonthData.total / limite_mensal) * 100 : 0)
        : percentual_gasto_ano;

    const gaugeValueText = selectedMonth
        ? (selectedMonthData ? formatCurrency(selectedMonthData.total) : 'R$ 0,00')
        : formatCurrency(total_gasto_ano);

    const gaugeLimitText = selectedMonth
        ? formatCurrency(limite_mensal)
        : formatCurrency(limite_anual);

    // Dynamic color for gauge based on usage
    let gaugeColor = COLORS.orange;
    if (gaugePercent > 100) {
        gaugeColor = '#ef4444'; // Red for exceeded
    } else if (gaugePercent > 85) {
        gaugeColor = '#f59e0b'; // Amber for warning
    } else if (gaugePercent < 40) {
        gaugeColor = '#10b981'; // Green for low usage
    }

    // SVG parameters
    const r = 38;
    const circ = 2 * Math.PI * r;
    const strokeDashoffset = circ - (Math.min(gaugePercent, 100) / 100) * circ;

    // Interactive Breakdown list
    const breakdownList = selectedMonthData 
        ? selectedMonthData.detalhes 
        : detalhes_ano;

    const breakdownTitle = selectedMonth
        ? `Detalhamento das Despesas — ${MONTH_FULL_NAMES[selectedMonth - 1]} de ${selectedYear}`
        : `Detalhamento das Despesas — Acumulado de ${selectedYear}`;

    // Tooltip handling
    const handleBarEnter = (monthData, e) => {
        setHoveredBar(monthData);
        if (chartRef.current) {
            const chartRect = chartRef.current.getBoundingClientRect();
            const x = e.clientX - chartRect.left;
            const y = e.clientY - chartRect.top;
            setTooltipPos({ x, y });
        }
    };

    const handleBarMove = (e) => {
        if (chartRef.current) {
            const chartRect = chartRef.current.getBoundingClientRect();
            const x = e.clientX - chartRect.left;
            const y = e.clientY - chartRect.top;
            setTooltipPos({ x, y });
        }
    };

    const handleBarLeave = () => {
        setHoveredBar(null);
    };

    // Card common style
    const cardStyle = {
        backgroundColor: COLORS.backgroundLight,
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: SPACING.radiusMd,
        padding: SPACING.md,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xl, fontFamily: FONTS.family }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: FONTS.sizeTitle, fontWeight: FONTS.weightSemibold, color: COLORS.textDark, margin: 0 }}>
                        Cota de Exercício Parlamentar (CEAP)
                    </h3>
                    <p style={{ fontSize: FONTS.sizeSm, color: COLORS.textMedium, margin: '4px 0 0 0' }}>
                        Acompanhe os gastos mensais do deputado reembolsados pela Câmara.
                    </p>
                </div>
            </div>

            {/* Top row: Interactive monthly chart + Years Selector & Gauge statistics card */}
            <div style={{ display: 'flex', gap: SPACING.lg, alignItems: 'stretch', flexWrap: 'wrap' }}>
                
                {/* 1. Monthly Bar Chart Card */}
                <div style={{
                    ...cardStyle,
                    flex: '2 1 500px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                }} ref={chartRef}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
                        <span style={{ fontSize: FONTS.sizeMd, fontWeight: FONTS.weightSemibold, color: COLORS.textMedium }}>
                            Evolução Mensal dos Gastos ({selectedYear})
                        </span>
                        {selectedMonth && (
                            <button
                                onClick={() => setSelectedMonth(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: COLORS.orange,
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(232, 133, 12, 0.08)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                Limpar Filtro de Mês
                            </button>
                        )}
                    </div>
                    {/* Years Selector on Mobile (horizontal above chart) */}
                    {isMobile && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '6px',
                            marginBottom: SPACING.md,
                            flexShrink: 0,
                        }}>
                            {years.map(year => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    style={{
                                        background: selectedYear === year ? COLORS.orange : 'transparent',
                                        color: selectedYear === year ? 'white' : COLORS.textMedium,
                                        border: selectedYear === year ? 'none' : `1px solid ${COLORS.borderLight}`,
                                        padding: '0 8px',
                                        height: '22px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: selectedYear === year ? 'bold' : 'normal',
                                        transition: 'background 0.2s, border-color 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flex: 1,
                                        boxShadow: selectedYear === year ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
                                    }}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Chart columns row */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1 }}>
                        {/* Years Selector aligned vertically on Desktop */}
                        {!isMobile && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: '120px',
                                marginRight: SPACING.lg,
                                marginBottom: '20px',
                                flexShrink: 0,
                            }}>
                                {years.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => setSelectedYear(year)}
                                        style={{
                                            background: selectedYear === year ? COLORS.orange : 'transparent',
                                            color: selectedYear === year ? 'white' : COLORS.textMedium,
                                            border: selectedYear === year ? 'none' : `1px solid ${COLORS.borderLight}`,
                                            padding: '0 8px',
                                            height: '22px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            fontWeight: selectedYear === year ? 'bold' : 'normal',
                                            transition: 'background 0.2s, border-color 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: selectedYear === year ? '0 1px 3px rgba(0,0,0,0.15)' : 'none'
                                        }}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Chart columns area */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            position: 'relative',
                            height: '140px',
                            justifyContent: 'flex-end',
                            paddingBottom: '20px'
                        }}>
                            {/* Visual Dashed Limit Line - Aligned at exactly 100px (100% of normal limit cota) */}
                            <div style={{
                                position: 'absolute',
                                bottom: 'calc(100px + 20px)',
                                left: 0,
                                right: 0,
                                borderTop: '1px dashed #ef4444',
                                zIndex: 5,
                                pointerEvents: 'none'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    right: 4,
                                    bottom: '2px',
                                    fontSize: '9px',
                                    color: '#ef4444',
                                    fontWeight: 'bold',
                                    backgroundColor: 'rgba(245, 245, 245, 0.85)',
                                    padding: '0 4px',
                                    borderRadius: '2px'
                                }}>
                                    Limite: {formatCurrency(limite_mensal)}
                                </span>
                            </div>

                            {/* Monthly columns */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                height: '120px',
                                position: 'relative',
                                zIndex: 6
                            }}>
                                {gastos_por_mes.map((m) => {
                                    const heightVal = Math.min((m.total / limite_mensal) * 100, 120);
                                    const isExceeded = m.total > limite_mensal;
                                    const isSelected = selectedMonth === m.mes;

                                    // Bar styles
                                    let barColor = `linear-gradient(180deg, ${COLORS.orange} 0%, ${COLORS.orangeLight} 100%)`;
                                    if (isExceeded) {
                                        barColor = 'linear-gradient(180deg, #ef4444 0%, #f87171 100%)';
                                    }

                                    return (
                                        <div
                                            key={m.mes}
                                            onClick={() => setSelectedMonth(selectedMonth === m.mes ? null : m.mes)}
                                            onMouseEnter={(e) => handleBarEnter(m, e)}
                                            onMouseMove={handleBarMove}
                                            onMouseLeave={handleBarLeave}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                margin: '0 4px',
                                                height: '100%',
                                                justifyContent: 'flex-end',
                                                position: 'relative',
                                            }}
                                        >
                                            {/* Actual colored bar */}
                                            <div style={{
                                                width: '100%',
                                                height: `${Math.max(heightVal, 4)}px`,
                                                background: barColor,
                                                borderRadius: '3px 3px 0 0',
                                                transition: 'height 0.3s ease, filter 0.2s, opacity 0.2s',
                                                opacity: selectedMonth === null || isSelected ? 1 : 0.45,
                                                boxShadow: isSelected ? '0 0 10px rgba(232, 133, 12, 0.45)' : 'none',
                                                border: isSelected ? `2px solid ${COLORS.orange}` : 'none',
                                                boxSizing: 'border-box'
                                            }} />

                                            {/* Month Label */}
                                            <span style={{
                                                fontSize: '11px',
                                                color: isSelected ? COLORS.orange : COLORS.textMedium,
                                                fontWeight: isSelected ? 'bold' : 'normal',
                                                position: 'absolute',
                                                bottom: '-20px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                textAlign: 'center',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {MONTH_NAMES[m.mes - 1]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Chart Local Tooltip */}
                    {hoveredBar && (
                        <div style={{
                            position: 'absolute',
                            top: `${tooltipPos.y}px`,
                            left: `${tooltipPos.x}px`,
                            transform: 'translate(-50%, -100%)',
                            marginTop: '-12px',
                            backgroundColor: 'rgba(40, 40, 40, 0.95)',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            lineHeight: 1.4,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            zIndex: 20,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}>
                            <div style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '3px', marginBottom: '3px' }}>
                                {MONTH_FULL_NAMES[hoveredBar.mes - 1]} / {selectedYear}
                            </div>
                            <div>Gasto Total: <strong>{formatCurrency(hoveredBar.total)}</strong></div>
                            <div style={{ color: hoveredBar.total > limite_mensal ? '#f87171' : '#f5a623' }}>
                                % do Limite: {hoveredBar.percentual_limite.toFixed(1)}%
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Beautiful SVG Gauge & Numeric Statistics Card */}
                <div style={{
                    ...cardStyle,
                    flex: '1 1 300px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <span style={{
                        fontSize: FONTS.sizeMd,
                        fontWeight: FONTS.weightSemibold,
                        color: COLORS.textMedium,
                        marginBottom: SPACING.md
                    }}>
                        {gaugeTitle}
                    </span>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: SPACING.lg,
                        flex: 1,
                        flexDirection: isMobile ? 'column' : 'row',
                        textAlign: isMobile ? 'center' : 'left',
                    }}>
                        {/* Circular Gauge */}
                        <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
                            <svg width="96" height="96" viewBox="0 0 96 96">
                                {/* Base/Bg Ring */}
                                <circle
                                    cx="48"
                                    cy="48"
                                    r={r}
                                    fill="transparent"
                                    stroke="#e5e7eb"
                                    strokeWidth="7"
                                />
                                {/* Colored Progress Ring */}
                                <circle
                                    cx="48"
                                    cy="48"
                                    r={r}
                                    fill="transparent"
                                    stroke={gaugeColor}
                                    strokeWidth="7"
                                    strokeDasharray={circ}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    transform="rotate(-90 48 48)"
                                    style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                />
                            </svg>
                            {/* Inner Percentage Label */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                pointerEvents: 'none'
                            }}>
                                <span style={{ fontSize: '15px', fontWeight: 'bold', color: COLORS.textDark }}>
                                    {gaugePercent.toFixed(1)}%
                                </span>
                                <span style={{ fontSize: '9px', color: COLORS.textLight, marginTop: '-2px' }}>
                                    usado
                                </span>
                            </div>
                        </div>

                        {/* Financial Statistics List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            <div>
                                <span style={{ fontSize: '10px', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {selectedMonth ? 'Gasto no Mês' : 'Total Acumulado'}
                                </span>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.orange }}>
                                    {gaugeValueText}
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: '10px', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {selectedMonth ? 'Cota Mensal (Teto)' : 'Cota Anual (Teto)'}
                                </span>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: COLORS.textDark }}>
                                    {gaugeLimitText}
                                </div>
                            </div>
                            {selectedMonth && (
                                <div>
                                    <span style={{ fontSize: '10px', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Saldo
                                    </span>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        color: (selectedMonthData && selectedMonthData.total > limite_mensal) ? '#ef4444' : '#10b981'
                                    }}>
                                        {selectedMonthData && selectedMonthData.total > limite_mensal 
                                            ? `Estouro: ${formatCurrency(selectedMonthData.total - limite_mensal)}`
                                            : `Livre: ${formatCurrency(limite_mensal - (selectedMonthData ? selectedMonthData.total : 0))}`
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Row: Detailed Category Breakdown (Bar Chart Table) */}
            <div style={cardStyle}>
                <div style={{ marginBottom: SPACING.md }}>
                    <h4 style={{ fontSize: FONTS.sizeMd, fontWeight: FONTS.weightSemibold, color: COLORS.textDark, margin: 0 }}>
                        {breakdownTitle}
                    </h4>
                    <p style={{ fontSize: '11px', color: COLORS.textMedium, margin: '2px 0 0 0' }}>
                        {selectedMonth 
                            ? 'Exibindo categorias de despesas desse mês. Clique fora das barras para retornar ao acumulado anual.'
                            : 'Clique em um mês específico no gráfico acima para ver o detalhamento do mês correspondente.'
                        }
                    </p>
                </div>

                {breakdownList.length === 0 ? (
                    <div style={{
                        padding: '30px',
                        textAlign: 'center',
                        color: COLORS.textLight,
                        fontSize: FONTS.sizeMd,
                        fontStyle: 'italic'
                    }}>
                        Nenhuma despesa declarada para este período.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {breakdownList.map((item, index) => {
                            const isCategoryExpanded = expandedCategory === item.tipo;
                            return (
                                <div
                                    key={index}
                                    style={{
                                        position: 'relative',
                                        borderRadius: '6px',
                                        border: `1px solid ${COLORS.borderLight}`,
                                        backgroundColor: '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {/* Subtle progress bar at the background of the header area */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        height: '40px',
                                        width: `${item.percentual}%`,
                                        backgroundColor: 'rgba(232, 133, 12, 0.07)',
                                        transition: 'width 0.4s ease',
                                        zIndex: 1,
                                        pointerEvents: 'none'
                                    }} />

                                    {/* Clickable Header Row */}
                                    <div
                                        onClick={() => {
                                            const nextVal = isCategoryExpanded ? null : item.tipo;
                                            setExpandedCategory(nextVal);
                                            setExpandedCompany(null); // Reset company expansion when changing categories
                                        }}
                                        style={{
                                            padding: '10px 14px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            minHeight: '40px',
                                            boxSizing: 'border-box',
                                            backgroundColor: isCategoryExpanded ? 'rgba(232, 133, 12, 0.02)' : 'transparent',
                                            transition: 'background-color 0.2s',
                                            zIndex: 2,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isCategoryExpanded) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.01)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isCategoryExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {/* Category Label */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                            {/* Chevron icon */}
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMedium} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isCategoryExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                            <span style={{
                                                fontSize: FONTS.sizeMd,
                                                fontWeight: '500',
                                                color: COLORS.textDark,
                                                textOverflow: 'ellipsis',
                                                overflow: 'hidden',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {item.tipo}
                                            </span>
                                        </div>

                                        {/* Category Price and Percentage */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: SPACING.sm,
                                            flexShrink: 0
                                        }}>
                                            <span style={{ fontSize: '13px', color: COLORS.textMedium }}>
                                                {item.percentual.toFixed(1)}%
                                            </span>
                                            <span style={{ fontSize: FONTS.sizeMd, fontWeight: 'bold', color: COLORS.orange }}>
                                                {formatCurrency(item.valor)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expanded Category Content */}
                                    {isCategoryExpanded && (
                                        <div style={{
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            borderTop: `1px solid ${COLORS.borderLight}`,
                                            backgroundColor: '#f9fafb',
                                            zIndex: 2,
                                        }}>
                                            {item.empresas && item.empresas.length > 0 ? (
                                                item.empresas.map((emp, empIdx) => {
                                                    const empKey = `${emp.cnpj_cpf}-${emp.nome}`;
                                                    const isCompanyExpanded = expandedCompany === empKey;
                                                    return (
                                                        <div
                                                            key={empIdx}
                                                            style={{
                                                                borderRadius: '6px',
                                                                border: `1px solid ${COLORS.borderLight}`,
                                                                backgroundColor: '#ffffff',
                                                                overflow: 'hidden',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                transition: 'all 0.2s ease',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                                                            }}
                                                        >
                                                            {/* Company Header Row */}
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedCompany(isCompanyExpanded ? null : empKey);
                                                                }}
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    cursor: 'pointer',
                                                                    backgroundColor: isCompanyExpanded ? 'rgba(232, 133, 12, 0.04)' : 'transparent',
                                                                    transition: 'background-color 0.2s',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (!isCompanyExpanded) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (!isCompanyExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                                    {/* Chevron */}
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMedium} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isCompanyExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                                        <polyline points="9 18 15 12 9 6"></polyline>
                                                                    </svg>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: COLORS.textDark, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                            {emp.nome}
                                                                        </span>
                                                                        {emp.cnpj_cpf && (
                                                                            <span style={{ fontSize: '10px', color: COLORS.textLight }}>
                                                                                CNPJ/CPF: {emp.cnpj_cpf}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: COLORS.textDark }}>
                                                                    {formatCurrency(emp.valor)}
                                                                </span>
                                                            </div>

                                                            {/* Company Invoices / Documents Expanded List */}
                                                            {isCompanyExpanded && (
                                                                <div style={{
                                                                    padding: '8px 12px 12px',
                                                                    borderTop: `1px solid ${COLORS.borderLight}`,
                                                                    backgroundColor: '#ffffff',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '8px'
                                                                }}>
                                                                    <div style={{
                                                                        display: 'grid',
                                                                        gridTemplateColumns: isMobile ? '70px 1fr 80px 40px' : '80px 1fr 100px 80px',
                                                                        gap: '8px',
                                                                        borderBottom: `1px solid ${COLORS.borderLight}`,
                                                                        paddingBottom: '4px',
                                                                        fontSize: '10px',
                                                                        fontWeight: 'bold',
                                                                        color: COLORS.textLight,
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        <span>Data</span>
                                                                        <span>Nº Doc.</span>
                                                                        <span style={{ textAlign: 'right' }}>Valor</span>
                                                                        <span style={{ textAlign: 'center' }}>Doc</span>
                                                                    </div>
                                                                    {emp.despesas && emp.despesas.map((desp, despIdx) => {
                                                                        let formattedDate = desp.data;
                                                                        if (desp.data) {
                                                                            const parts = desp.data.split('-');
                                                                            if (parts.length === 3) {
                                                                                formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                                                                            }
                                                                        } else {
                                                                            formattedDate = '—';
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={despIdx}
                                                                                style={{
                                                                                    display: 'grid',
                                                                                    gridTemplateColumns: isMobile ? '70px 1fr 80px 40px' : '80px 1fr 100px 80px',
                                                                                    gap: '8px',
                                                                                    alignItems: 'center',
                                                                                    fontSize: '12px',
                                                                                    color: COLORS.textDark,
                                                                                    padding: '4px 0',
                                                                                    borderBottom: despIdx < emp.despesas.length - 1 ? '1px dashed #f3f4f6' : 'none'
                                                                                }}
                                                                            >
                                                                                <span style={{ color: COLORS.textMedium }}>{formattedDate}</span>
                                                                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={desp.num_documento}>
                                                                                    {desp.num_documento || '—'}
                                                                                </span>
                                                                                <span style={{ textAlign: 'right', fontWeight: '600' }}>
                                                                                    {formatCurrency(desp.valor)}
                                                                                </span>
                                                                                <span style={{ textAlign: 'center' }}>
                                                                                    {desp.url_documento ? (
                                                                                        <a
                                                                                            href={desp.url_documento}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            style={{
                                                                                                color: COLORS.orange,
                                                                                                textDecoration: 'none',
                                                                                                fontWeight: 'bold',
                                                                                                display: 'inline-flex',
                                                                                                alignItems: 'center',
                                                                                                gap: '2px',
                                                                                                transition: 'opacity 0.2s'
                                                                                            }}
                                                                                            onMouseEnter={(e) => e.currentTarget.style.opacity = 0.7}
                                                                                            onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                        >
                                                                                            {!isMobile && 'Nota'}
                                                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                                                                            </svg>
                                                                                        </a>
                                                                                    ) : (
                                                                                        <span style={{ color: COLORS.textLight }}>—</span>
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div style={{ padding: '10px', fontSize: '12px', color: COLORS.textMedium, fontStyle: 'italic', textAlign: 'center' }}>
                                                    Nenhum detalhamento de fornecedor disponível.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
