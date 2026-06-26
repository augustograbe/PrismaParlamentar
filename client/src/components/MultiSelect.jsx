import { useState, useRef, useEffect } from 'react';
import { COLORS, SPACING, FONTS } from '../constants/theme';

/**
 * MultiSelect - Select com tags removíveis
 * Props:
 * - label: rótulo do campo
 * - options: array de { value, label }
 * - value: array de strings (valores selecionados)
 * - onChange: callback (newValues: string[])
 * - disabledValues: array de strings (valores que não podem ser removidos)
 * - placeholder: texto do select quando todos estão selecionados
 */
export default function MultiSelect({
    label = '',
    options = [],
    value = [],
    onChange,
    disabledValues = [],
    placeholder = 'Adicionar campo...',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [hoveredItem, setHoveredItem] = useState(null);

    // Fetch expense categories on mount
    useEffect(() => {
        let isMounted = true;
        fetch('/api/despesas-categorias/')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && isMounted) setExpenseCategories(data);
            })
            .catch(err => console.error("Erro ao carregar categorias em MultiSelect:", err));
        return () => { isMounted = false; };
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                containerRef.current && !containerRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Compute dropdown position from button rect
    const openDropdown = () => {
        if (availableOptions.length === 0) return;
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 2,
                left: rect.left,
                width: rect.width,
            });
        }
        setIsOpen((prev) => !prev);
    };

    // Options not yet selected
    const availableOptions = options.filter((opt) => !value.includes(opt.value));

    const handleAdd = (optValue) => {
        if (!value.includes(optValue)) {
            onChange([...value, optValue]);
        }
        setIsOpen(false);
    };

    const handleRemove = (optValue) => {
        if (disabledValues.includes(optValue)) return;
        onChange(value.filter((v) => v !== optValue));
    };

    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm,
    };

    const labelStyle = {
        fontSize: FONTS.sizeMd,
        color: COLORS.textDark,
        fontWeight: FONTS.weightNormal,
    };

    const selectWrapperStyle = {
        position: 'relative',
    };

    const selectButtonStyle = {
        width: '100%',
        appearance: 'none',
        backgroundColor: availableOptions.length === 0 ? '#f9f9f9' : COLORS.white,
        border: `1px solid ${COLORS.borderMedium}`,
        borderRadius: SPACING.radiusMd,
        padding: `${SPACING.xs} ${SPACING.xl} ${SPACING.xs} ${SPACING.md}`,
        fontSize: FONTS.sizeSm,
        fontFamily: FONTS.family,
        color: availableOptions.length === 0 ? COLORS.textLight : COLORS.textDark,
        cursor: availableOptions.length === 0 ? 'default' : 'pointer',
        outline: 'none',
        textAlign: 'left',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23555' stroke-width='1.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `right ${SPACING.sm} center`,
    };

    const dropdownStyle = {
        position: 'fixed',
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        width: `${dropdownPos.width}px`,
        backgroundColor: COLORS.white,
        border: `1px solid ${COLORS.borderMedium}`,
        borderRadius: SPACING.radiusMd,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        zIndex: 1000,
        overflow: 'visible',
    };

    const dropdownItemStyle = {
        padding: `${SPACING.sm} ${SPACING.md}`,
        fontSize: FONTS.sizeSm,
        fontFamily: FONTS.family,
        color: COLORS.textDark,
        cursor: 'pointer',
        transition: 'background-color 0.12s',
    };

    const tagsContainerStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
    };

    const getTagStyle = (isDisabled) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: `2px ${isDisabled ? SPACING.sm : '4px'} 2px ${SPACING.sm}`,
        backgroundColor: isDisabled ? `${COLORS.orange}18` : `${COLORS.orange}12`,
        border: `1px solid ${isDisabled ? COLORS.orange : `${COLORS.orange}40`}`,
        borderRadius: '20px',
        fontSize: FONTS.sizeXs,
        color: isDisabled ? COLORS.orange : COLORS.textDark,
        fontWeight: isDisabled ? FONTS.weightSemibold : FONTS.weightMedium,
    });

    const tagRemoveStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '1px',
        borderRadius: '50%',
        color: COLORS.textLight,
        transition: 'color 0.12s, background-color 0.12s',
        width: '16px',
        height: '16px',
    };

    // Map values to labels
    const optionMap = {};
    options.forEach((o) => { optionMap[o.value] = o.label; });

    return (
        <div style={containerStyle} ref={containerRef}>
            {label && <span style={labelStyle}>{label}</span>}

            {/* Select trigger */}
            <div style={selectWrapperStyle}>
                <button
                    ref={buttonRef}
                    type="button"
                    style={selectButtonStyle}
                    onClick={openDropdown}
                    disabled={availableOptions.length === 0}
                >
                    {availableOptions.length === 0 ? 'Todos selecionados' : placeholder}
                </button>

            </div>

            {/* Dropdown — rendered with position:fixed to escape overflow:hidden parents */}
            {isOpen && availableOptions.length > 0 && (
                <div ref={dropdownRef} style={dropdownStyle}>
                    {availableOptions.map((opt) => {
                        const hasSubmenu = opt.value === 'despesas' || opt.value === 'proposicoes';
                        const isHovered = hoveredItem === opt.value;

                        return (
                            <div
                                key={opt.value}
                                style={{ ...dropdownItemStyle, position: 'relative' }}
                                onClick={() => !hasSubmenu && handleAdd(opt.value)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = COLORS.backgroundHover;
                                    setHoveredItem(opt.value);
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    setHoveredItem(null);
                                }}
                            >
                                {hasSubmenu ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                        <span>{opt.label}</span>
                                        <span style={{ color: COLORS.orange, fontWeight: 'bold', fontSize: '12px', marginLeft: '6px' }}>‹</span>
                                    </div>
                                ) : opt.label}

                                {isHovered && opt.value === 'despesas' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: '100%',
                                        marginRight: '0px',
                                        width: '220px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        backgroundColor: COLORS.white,
                                        border: `1px solid ${COLORS.borderMedium}`,
                                        borderRadius: SPACING.radiusMd,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                        zIndex: 1010,
                                    }}>
                                        <div
                                            style={{ ...dropdownItemStyle, fontWeight: 'bold', borderBottom: `1px solid ${COLORS.borderLight}` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAdd('despesas');
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.backgroundHover}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            Todas
                                        </div>
                                        {expenseCategories.map((cat) => (
                                            <div
                                                key={cat}
                                                style={dropdownItemStyle}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAdd('despesas__' + cat);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.backgroundHover}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                {cat}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isHovered && opt.value === 'proposicoes' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: '100%',
                                        marginRight: '0px',
                                        width: '180px',
                                        backgroundColor: COLORS.white,
                                        border: `1px solid ${COLORS.borderMedium}`,
                                        borderRadius: SPACING.radiusMd,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                        zIndex: 1010,
                                    }}>
                                        {['PL+PLP+PEC', 'PL', 'PLP', 'PEC'].map((type) => (
                                            <div
                                                key={type}
                                                style={dropdownItemStyle}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAdd('proposicoes__' + type);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.backgroundHover}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                {type}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tags */}
            {value.length > 0 && (
                <div style={tagsContainerStyle}>
                    {value.map((val) => {
                        const isDisabled = disabledValues.includes(val);
                        return (
                            <span key={val} style={getTagStyle(isDisabled)}>
                                {optionMap[val] || val}
                                {!isDisabled && (
                                    <button
                                        type="button"
                                        style={tagRemoveStyle}
                                        onClick={() => handleRemove(val)}
                                        title={`Remover ${optionMap[val] || val}`}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = '#e74c3c';
                                            e.currentTarget.style.backgroundColor = 'rgba(231,76,60,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = COLORS.textLight;
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M1 1L7 7M7 1L1 7" />
                                        </svg>
                                    </button>
                                )}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
