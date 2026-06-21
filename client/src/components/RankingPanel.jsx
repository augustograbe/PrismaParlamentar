import Frame from './Frame';
import Dropdown from './Dropdown';
import { COLORS, SPACING } from '../constants/theme';

/**
 * RankingPanel - Painel de ordenação da lista (sempre visível, sem minimizar)
 * Props:
 * - sortBy: valor atual da ordenação
 * - onSortChange: callback (event)
 */
export default function RankingPanel({
    sortBy = 'nome_asc',
    onSortChange,
    expenseCategories = [],
    selectedExpenseCategory = 'Todas',
    onExpenseCategoryChange,
    selectedExpenseYear = 'mandato',
    onExpenseYearChange,
    selectedProposalType = 'PL+PLP+PEC',
    onProposalTypeChange,
    width = '250px'
}) {

    const rankingIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 13V7" />
            <path d="M8 13V3" />
            <path d="M12 13V9" />
        </svg>
    );

    const sortOptions = [
        { value: 'nome_asc', label: 'Nome (A–Z)' },
        { value: 'nome_desc', label: 'Nome (Z–A)' },
        { value: 'partido_asc', label: 'Partido (A–Z)' },
        { value: 'estado_asc', label: 'Estado (A–Z)' },
        { value: 'presenca_desc', label: 'Presença (↓ maior)' },
        { value: 'presenca_asc', label: 'Presença (↑ menor)' },
        { value: 'despesas_desc', label: 'Despesas (↓ maior)' },
        { value: 'despesas_asc', label: 'Despesas (↑ menor)' },
        { value: 'discursos_desc', label: 'Discursos (↓ maior)' },
        { value: 'discursos_asc', label: 'Discursos (↑ menor)' },
        { value: 'proposicoes_desc', label: 'Proposições (↓ maior)' },
        { value: 'proposicoes_asc', label: 'Proposições (↑ menor)' },
    ];

    const isDespesas = sortBy.startsWith('despesas');
    const isProposicoes = sortBy.startsWith('proposicoes');

    return (
        <Frame
            width={width}
            height="auto"
            position={{ position: 'relative' }}
            style={{ flex: '0 0 auto' }}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    {rankingIcon} Ranking
                </span>
            }
        >
            <div style={{ padding: `0 ${SPACING.lg} ${SPACING.lg}` }}>
                <Dropdown
                    label="Ordenar por"
                    options={sortOptions}
                    value={sortBy}
                    onChange={onSortChange}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.sm }}
                />

                {isDespesas && (
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
                                onChange={(e) => onExpenseCategoryChange(e.target.value)}
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
                                onChange={(e) => onExpenseYearChange(e.target.value)}
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

                {isProposicoes && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: SPACING.sm,
                        width: '100%'
                    }}>
                        <label style={{ fontSize: '10px', color: COLORS.textLight, marginBottom: '2px', fontWeight: 'bold' }}>Tipo de Proposição</label>
                        <select
                            value={selectedProposalType}
                            onChange={(e) => onProposalTypeChange(e.target.value)}
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
            </div>
        </Frame>
    );
}
