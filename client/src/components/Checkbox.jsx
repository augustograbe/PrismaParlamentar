import { COLORS, SPACING, FONTS } from '../constants/theme';

/**
 * Checkbox - Checkbox estilizado
 * Props:
 * - label: texto ao lado do checkbox
 * - checked: estado do checkbox
 * - onChange: callback (boolean)
 * - disabled: desabilita o checkbox
 * - style: estilos adicionais
 */
export default function Checkbox({
    label = '',
    checked = false,
    onChange,
    disabled = false,
    style = {},
}) {
    const containerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
    };

    const boxStyle = {
        width: '18px',
        height: '18px',
        borderRadius: SPACING.radiusSm,
        border: `2px solid ${checked ? COLORS.checkboxChecked : COLORS.checkboxUnchecked}`,
        backgroundColor: checked ? COLORS.checkboxChecked : COLORS.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        flexShrink: 0,
    };

    const labelStyle = {
        fontSize: FONTS.sizeMd,
        color: COLORS.textDark,
        userSelect: 'none',
    };

    return (
        <div
            style={containerStyle}
            onClick={() => !disabled && onChange && onChange(!checked)}
        >
            <div style={boxStyle}>
                {checked && (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="white" strokeWidth="2">
                        <path d="M1 5L4.5 8.5L11 1.5" />
                    </svg>
                )}
            </div>
            {label && <span style={labelStyle}>{label}</span>}
        </div>
    );
}

