import { COLORS, SPACING, FONTS, SHADOWS } from '../constants/theme';

/**
 * Button - Botão estilizado
 * Props:
 * - variant: 'primary' (laranja) ou 'outline' (branco com borda laranja)
 * - children: conteúdo do botão
 * - icon: ícone (ReactNode) opcional antes do texto
 * - onClick: callback
 * - style: estilos adicionais
 * - disabled: desabilitado
 */
export default function Button({
    variant = 'primary',
    children,
    icon,
    onClick,
    style = {},
    disabled = false,
    onMouseEnter,
    onMouseLeave,
}) {
    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        padding: `${SPACING.sm} ${SPACING.lg}`,
        borderRadius: SPACING.radiusMd,
        fontSize: FONTS.sizeMd,
        fontFamily: FONTS.family,
        fontWeight: FONTS.weightMedium,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        border: 'none',
        opacity: disabled ? 0.6 : 1,
        boxShadow: SHADOWS.button,
    };

    const variants = {
        primary: {
            backgroundColor: COLORS.orange,
            color: COLORS.textWhite,
            border: `2px solid ${COLORS.orange}`,
        },
        outline: {
            backgroundColor: COLORS.white,
            color: COLORS.orange,
            border: `2px solid ${COLORS.orange}`,
        },
    };

    const combinedStyle = {
        ...baseStyle,
        ...variants[variant],
        ...style,
    };

    return (
        <button
            onClick={onClick}
            style={combinedStyle}
            disabled={disabled}
            onMouseEnter={(e) => {
                if (!disabled) {
                    if (variant === 'primary') {
                        e.currentTarget.style.backgroundColor = COLORS.orangeHover;
                        e.currentTarget.style.borderColor = COLORS.orangeHover;
                    } else {
                        e.currentTarget.style.backgroundColor = COLORS.orange;
                        e.currentTarget.style.color = COLORS.textWhite;
                    }
                }
                if (onMouseEnter) onMouseEnter(e);
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    e.currentTarget.style.backgroundColor = variants[variant].backgroundColor;
                    e.currentTarget.style.color = variants[variant].color;
                    e.currentTarget.style.borderColor = variants[variant].border ? COLORS.orange : 'transparent';
                }
                if (onMouseLeave) onMouseLeave(e);
            }}
        >
            {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
            {children}
        </button>
    );
}
