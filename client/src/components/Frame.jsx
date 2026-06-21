import { useState } from 'react';
import { COLORS, SPACING, SHADOWS, FONTS } from '../constants/theme';

/**
 * Frame - Componente de quadro flutuante
 * 
 * Props:
 * - width: largura do frame (CSS value)
 * - height: altura do frame (CSS value)
 * - backgroundColor: cor de fundo (default: COLORS.frameBg)
 * - position: objeto { top, left, right, bottom } para posicionamento fixo
 * - title: título exibido na barra superior
 * - headerColor: cor da barra superior (default: transparente)
 * - showClose: exibir botão de fechar (X)
 * - showMinimize: exibir botão de minimizar
 * - children: conteúdo interno
 * - onClose: callback quando fechar
 * - style: estilos adicionais
 * - className: classes adicionais
 */
export default function Frame({
    width = 'auto',
    height = 'auto',
    backgroundColor = COLORS.frameBg,
    position = {},
    title = '',
    headerColor = 'transparent',
    showClose = false,
    showMinimize = false,
    isMinimized: controlledIsMinimized,
    onToggleMinimize,
    children,
    onClose,
    style = {},
    className = '',
    hideHeader = false,
}) {
    const [internalIsMinimized, setInternalIsMinimized] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    const isMinimized = controlledIsMinimized !== undefined ? controlledIsMinimized : internalIsMinimized;

    if (!isVisible) return null;

    const handleClose = () => {
        setIsVisible(false);
        if (onClose) onClose();
    };

    const handleMinimize = () => {
        if (onToggleMinimize) {
            onToggleMinimize(!isMinimized);
        } else {
            setInternalIsMinimized(!isMinimized);
        }
    };

    const hasHeader = !hideHeader && (title || showClose || showMinimize || headerColor !== 'transparent');

    const frameStyle = {
        position: 'fixed',
        width,
        backgroundColor,
        borderRadius: SPACING.radiusLg,
        boxShadow: SHADOWS.frame,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        pointerEvents: 'auto',
        ...position,
        ...style,
    };

    // Se minimizado, altura é apenas do header
    if (!isMinimized) {
        frameStyle.height = height;
    }

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${SPACING.sm} ${SPACING.md}`,
        backgroundColor: headerColor,
        minHeight: '36px',
        flexShrink: 0,
    };

    const titleStyle = {
        fontSize: FONTS.sizeMd,
        fontWeight: FONTS.weightSemibold,
        color: headerColor !== 'transparent' ? COLORS.textWhite : COLORS.textDark,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
    };

    const iconButtonStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: SPACING.xs,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: headerColor !== 'transparent' ? COLORS.textWhite : COLORS.textMedium,
        fontSize: FONTS.sizeLg,
        lineHeight: 1,
        borderRadius: SPACING.radiusSm,
        transition: 'background-color 0.15s',
    };

    const contentStyle = {
        flex: 1,
        overflow: 'auto',
        display: isMinimized ? 'none' : 'flex',
        flexDirection: 'column',
    };

    return (
        <div style={frameStyle} className={className}>
            {hasHeader && (
                <div style={headerStyle}>
                    <span style={titleStyle}>{title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xs }}>
                        {showMinimize && (
                            <button
                                onClick={handleMinimize}
                                style={iconButtonStyle}
                                title={isMinimized ? 'Expandir' : 'Minimizar'}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.08)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                {isMinimized ? (
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 9L7 3L13 9" />
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 5L7 11L13 5" />
                                    </svg>
                                )}
                            </button>
                        )}
                        {showClose && (
                            <button
                                onClick={handleClose}
                                style={iconButtonStyle}
                                title="Fechar"
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.08)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 1L11 11M11 1L1 11" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}
            <div style={contentStyle}>
                {children}
            </div>
        </div>
    );
}
