import { COLORS, SPACING, FONTS } from '../constants/theme';

/**
 * Dropdown - Menu dropdown estilizado
 * Props:
 * - label: rótulo
 * - options: array de { value, label }
 * - value: valor selecionado
 * - onChange: callback (event)
 * - style: estilos adicionais
 */
export default function Dropdown({
    label = '',
    options = [],
    value,
    onChange,
    style = {},
    disabled = false,
}) {
    const containerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        ...style,
    };

    const labelStyle = {
        fontSize: FONTS.sizeMd,
        color: COLORS.textDark,
        fontWeight: FONTS.weightNormal,
        whiteSpace: 'nowrap',
    };

    const selectStyle = {
        appearance: 'none',
        backgroundColor: disabled ? COLORS.backgroundLight : COLORS.white,
        border: `1px solid ${COLORS.borderMedium}`,
        borderRadius: SPACING.radiusMd,
        padding: `${SPACING.xs} ${SPACING.xl} ${SPACING.xs} ${SPACING.md}`,
        fontSize: FONTS.sizeSm,
        fontFamily: FONTS.family,
        color: disabled ? COLORS.textLight : COLORS.textDark,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        opacity: disabled ? 0.6 : 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23555' stroke-width='1.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right ${SPACING.sm} center`,
        minWidth: '120px',
    };

    return (
        <div style={containerStyle}>
            {label && <span style={labelStyle}>{label}</span>}
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                style={selectStyle}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
