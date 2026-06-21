import { useState, useRef, useEffect } from 'react';
import { COLORS, SPACING, FONTS, SHADOWS } from '../constants/theme';

/**
 * Remove acentos e diacríticos de uma string
 */
const removeAccents = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * SearchBar - Barra de pesquisa com autocomplete de deputados
 * Props:
 * - placeholder: texto placeholder
 * - value: valor controlado
 * - onChange: callback de mudança
 * - style: estilos adicionais
 * - suggestions: array de { id, nome, sigla_partido, sigla_uf } para autocomplete
 * - onSelectSuggestion: callback quando uma sugestão é selecionada (recebe o objeto do deputado)
 */
export default function SearchBar({
    placeholder = 'Pesquisar...',
    value,
    onChange,
    style = {},
    suggestions = [],
    onSelectSuggestion,
    onSelectProfile,
    isMobile = false,
    searchActive = false,
    onToggleSearch,
}) {
    const [query, setQuery] = useState(value || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Sincronizar com value externo
    useEffect(() => {
        if (value !== undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setQuery(value);
        }
    }, [value]);

    // Filtrar sugestões baseado na query (mínimo 1 caractere, ignorando acentos)
    const filteredSuggestions = query.length >= 1
        ? suggestions
            .filter((dep) => {
                const nome = (dep.nome || dep.label || '').toLowerCase();
                const normalizedNome = removeAccents(nome);
                const searchTerms = query.toLowerCase().trim().split(/\s+/).map(term => removeAccents(term));
                
                return searchTerms.every((term) => normalizedNome.includes(term));
            })
        : [];

    const hasQuery = query.length >= 1;
    const showResults = showDropdown && hasQuery;

    // Fechar dropdown e barra de pesquisa ao clicar fora (usa capture phase para evitar stopPropagation do canvas/sigma)
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowDropdown(false);
                if (isMobile && searchActive) {
                    onToggleSearch?.();
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isMobile, searchActive, onToggleSearch]);

    // Limpar pesquisa e tirar foco ao colapsar no mobile
    useEffect(() => {
        if (isMobile && !searchActive) {
            inputRef.current?.blur();
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setQuery('');
        }
    }, [searchActive, isMobile]);

    // Reset highlighted index quando sugestões mudam
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHighlightedIndex(0);
    }, [filteredSuggestions.length, query]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setShowDropdown(true);
        if (onChange) onChange(e);
    };

    const handleSelect = (dep) => {
        setQuery('');
        setShowDropdown(false);
        if (onSelectSuggestion) onSelectSuggestion(dep);
        inputRef.current?.blur();
    };

    const handleProfileSelect = (dep) => {
        setQuery('');
        setShowDropdown(false);
        if (onSelectProfile) {
            onSelectProfile(dep);
        } else if (onSelectSuggestion) {
            onSelectSuggestion(dep);
        }
        inputRef.current?.blur();
    };

    const handleKeyDown = (e) => {
        if (!showResults) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                Math.min(prev + 1, filteredSuggestions.length - 1)
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredSuggestions.length > 0) {
                handleSelect(filteredSuggestions[highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    const containerStyle = {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: isMobile ? (searchActive ? '100%' : '36px') : '100%',
        transition: isMobile ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        ...style,
    };

    const inputContainerStyle = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: isMobile && !searchActive ? 'transparent' : COLORS.white,
        border: isMobile && !searchActive ? '1px solid transparent' : `1px solid ${
            isFocused || showResults 
                ? COLORS.orange 
                : isHovered 
                    ? COLORS.borderMedium 
                    : COLORS.borderLight
        }`,
        borderRadius: showResults ? `${SPACING.radiusMd} ${SPACING.radiusMd} 0 0` : SPACING.radiusMd,
        padding: isMobile 
            ? (searchActive ? `${SPACING.sm} 36px ${SPACING.sm} ${SPACING.md}` : '0') 
            : `${SPACING.sm} ${SPACING.md}`,
        width: '100%',
        height: isMobile ? '36px' : 'auto',
        cursor: isMobile && !searchActive ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxSizing: 'border-box',
    };

    const inputStyle = {
        border: 'none',
        outline: 'none',
        flex: 1,
        width: '100%',
        opacity: isMobile ? (searchActive ? 1 : 0) : 1,
        pointerEvents: isMobile && !searchActive ? 'none' : 'auto',
        fontSize: FONTS.sizeMd,
        fontFamily: FONTS.family,
        color: COLORS.textDark,
        backgroundColor: 'transparent',
        transition: 'opacity 0.2s ease',
    };

    const dropdownStyle = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        border: `1px solid ${COLORS.orange}`,
        borderTop: 'none',
        borderRadius: `0 0 ${SPACING.radiusMd} ${SPACING.radiusMd}`,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        zIndex: 200,
        overflowY: 'auto',
        maxHeight: '220px', // Aproximadamente 5.5 itens para mostrar que há scroll
    };

    const suggestionStyle = (isHighlighted) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${SPACING.sm} ${SPACING.md}`,
        cursor: 'pointer',
        backgroundColor: isHighlighted ? 'rgba(232, 133, 12, 0.08)' : 'transparent',
        transition: 'background-color 0.12s ease',
        borderBottom: `1px solid ${COLORS.borderLight}`,
    });

    const nameStyle = {
        fontSize: FONTS.sizeMd,
        fontFamily: FONTS.family,
        fontWeight: FONTS.weightMedium,
        color: COLORS.textDark,
    };

    const badgeContainerStyle = {
        display: 'flex',
        gap: SPACING.xs,
        alignItems: 'center',
    };

    const badgeStyle = {
        fontSize: FONTS.sizeXs,
        fontFamily: FONTS.family,
        fontWeight: FONTS.weightSemibold,
        padding: `2px ${SPACING.xs}`,
        borderRadius: SPACING.radiusSm,
        backgroundColor: 'rgba(232, 133, 12, 0.12)',
        color: COLORS.orange,
    };

    const noResultStyle = {
        padding: `${SPACING.md} ${SPACING.md}`,
        fontSize: FONTS.sizeMd,
        fontFamily: FONTS.family,
        color: COLORS.textLight,
        textAlign: 'center',
    };

    // Função para destacar o texto que deu match (ignorando acentos para o match, mas mantendo o original)
    const highlightMatch = (text, searchQuery) => {
        if (!searchQuery || searchQuery.length < 1) return text;
        
        const normalizedText = removeAccents(text).toLowerCase();
        const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/).map(term => removeAccents(term));
        
        // Vamos criar uma lista de intervalos que devem ser destacados
        let highlights = [];
        searchTerms.forEach(term => {
            if (!term) return;
            let startPos = 0;
            while ((startPos = normalizedText.indexOf(term, startPos)) !== -1) {
                highlights.push({ start: startPos, end: startPos + term.length });
                startPos += term.length;
            }
        });
        
        // Mesclar intervalos sobrepostos
        if (highlights.length === 0) return text;
        highlights.sort((a, b) => a.start - b.start);
        
        let mergedHighlights = [highlights[0]];
        for (let i = 1; i < highlights.length; i++) {
            let last = mergedHighlights[mergedHighlights.length - 1];
            if (highlights[i].start <= last.end) {
                last.end = Math.max(last.end, highlights[i].end);
            } else {
                mergedHighlights.push(highlights[i]);
            }
        }
        
        // Construir o array de elementos React
        const result = [];
        let lastIndex = 0;
        
        mergedHighlights.forEach((h, index) => {
            // Texto antes do match
            if (h.start > lastIndex) {
                result.push(text.substring(lastIndex, h.start));
            }
            // Texto do match (original com destaque)
            result.push(
                <span key={index} style={{ color: COLORS.orange, fontWeight: FONTS.weightSemibold }}>
                    {text.substring(h.start, h.end)}
                </span>
            );
            lastIndex = h.end;
        });
        
        // Restante do texto
        if (lastIndex < text.length) {
            result.push(text.substring(lastIndex));
        }
        
        return result;
    };

    const handleContainerClick = (e) => {
        if (isMobile && !searchActive) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSearch?.();
        }
    };

    const handleIconClick = (e) => {
        if (isMobile) {
            e.preventDefault();
            e.stopPropagation();
            onToggleSearch?.();
        }
    };

    return (
        <div ref={containerRef} style={containerStyle} onClick={handleContainerClick}>
            <div 
                style={inputContainerStyle}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        setShowDropdown(true);
                        setIsFocused(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    style={inputStyle}
                />
                <svg
                    onClick={handleIconClick}
                    width={isMobile ? "20" : "16"}
                    height={isMobile ? "20" : "16"}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke={showResults || (isMobile && searchActive) ? COLORS.orange : COLORS.textLight}
                    strokeWidth="2"
                    style={{
                        position: isMobile ? 'absolute' : 'static',
                        right: isMobile ? '8px' : 'auto',
                        transition: 'stroke 0.2s ease',
                        cursor: isMobile ? 'pointer' : 'default',
                        flexShrink: 0,
                    }}
                >
                    <circle cx="7" cy="7" r="5" />
                    <path d="M11 11L15 15" />
                </svg>
            </div>

            {showResults && (
                <div style={dropdownStyle}>
                    {filteredSuggestions.length > 0 ? (
                        filteredSuggestions.map((dep, index) => (
                            <div
                                key={dep.id || dep.nodeId || index}
                                style={suggestionStyle(index === highlightedIndex)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Previne blur do input
                                    handleSelect(dep);
                                }}
                            >
                                <span style={nameStyle}>
                                    {highlightMatch(dep.nome || dep.label || '', query)}
                                </span>
                                <div style={badgeContainerStyle}>
                                    {(dep.sigla_partido || dep.partido) && (
                                        <span style={badgeStyle}>
                                            {dep.sigla_partido || dep.partido}
                                        </span>
                                    )}
                                    {(dep.sigla_uf || dep.estado) && (
                                        <span style={{
                                            ...badgeStyle,
                                            backgroundColor: 'rgba(85, 85, 85, 0.08)',
                                            color: COLORS.textMedium,
                                        }}>
                                            {dep.sigla_uf || dep.estado}
                                        </span>
                                    )}
                                    <button
                                        style={{
                                            fontSize: '11px',
                                            fontFamily: FONTS.family,
                                            fontWeight: FONTS.weightMedium,
                                            padding: `1px ${SPACING.sm}`,
                                            borderRadius: SPACING.radiusSm,
                                            backgroundColor: 'transparent',
                                            border: `1px solid ${COLORS.orange}`,
                                            color: COLORS.orange,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            marginLeft: SPACING.xs,
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleProfileSelect(dep);
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = COLORS.orange;
                                            e.currentTarget.style.color = COLORS.white;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = COLORS.orange;
                                        }}
                                    >
                                        Perfil
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={noResultStyle}>
                            Nenhum deputado encontrado
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
