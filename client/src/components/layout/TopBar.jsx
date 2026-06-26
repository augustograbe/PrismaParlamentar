import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONTS } from '../../constants/theme';
import SearchBar from '../SearchBar';
import logoPositivo from '../../assets/logo.png';
import logoNegativo from '../../assets/logo_negativo.png';
import { useIsMobile } from '../../utils/useIsMobile';

/**
 * TopBar - Barra superior da aplicação
 * Logo + Título + Barra de pesquisa + Botões de menu (Grafos, Lista, Sobre)
 *
 * Props:
 * - deputyList: array de deputados para autocomplete na SearchBar
 * - onSelectDeputy: callback quando um deputado é selecionado na pesquisa
 */
export default function TopBar({ deputyList = [], onSelectDeputy, onSelectProfile, activePage = 'grafos', theme = 'light', toggleTheme }) {
    const activeLogo = theme === 'dark' ? logoNegativo : logoPositivo;
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [searchActive, setSearchActive] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const barStyle = {
        position: 'fixed',
        top: isMobile ? 0 : SPACING.frameGap,
        left: isMobile ? 0 : SPACING.frameGap,
        right: isMobile ? 0 : SPACING.frameGap,
        height: '52px',
        backgroundColor: COLORS.frameBg,
        borderRadius: isMobile ? 0 : SPACING.radiusLg,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${isMobile ? SPACING.md : SPACING.xl}`,
        zIndex: 100,
    };

    const leftStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? SPACING.xs : SPACING.md,
        flexShrink: 0,
    };

    const logoStyle = {
        width: isMobile ? '40px' : '56px',
        height: isMobile ? '32px' : '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const titleStyle = {
        fontFamily: '"Bahnschrift SemiBold SemiCondensed", "Bahnschrift", sans-serif',
        fontSize: isMobile ? '16px' : FONTS.sizeTitle,
        fontWeight: 600,
        color: COLORS.textDark,
        display: isMobile ? (searchActive ? 'none' : 'inline') : 'inline',
    };

    const centerStyle = {
        flex: 1,
        maxWidth: isMobile ? 'none' : '450px',
        margin: `0 ${isMobile ? SPACING.xs : SPACING.xl}`,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
    };

    const rightStyle = {
        display: isMobile ? 'none' : 'flex',
        alignItems: 'center',
        gap: SPACING.lg,
    };

    const menuBtnStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        fontSize: FONTS.sizeMd,
        fontFamily: FONTS.family,
        fontWeight: FONTS.weightMedium,
        color: COLORS.textMedium,
        padding: `${SPACING.sm} ${SPACING.md}`,
        borderRadius: SPACING.radiusMd,
        transition: 'color 0.15s, background-color 0.15s',
    };

    const mobileMenuDropdownStyle = {
        position: 'absolute',
        top: '52px',
        left: 0,
        right: 0,
        backgroundColor: COLORS.frameBg,
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
        borderBottom: `1px solid ${COLORS.borderLight}`,
        display: 'flex',
        flexDirection: 'column',
        padding: SPACING.md,
        gap: SPACING.xs,
        zIndex: 99,
    };

    const menuItems = [
        {
            label: 'Grafos',
            page: 'grafos',
            route: '/',
            icon: (isActive) => (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={isActive ? COLORS.orange : 'currentColor'} strokeWidth="1.5">
                    <circle cx="4" cy="4" r="2.5" />
                    <circle cx="12" cy="4" r="2.5" />
                    <circle cx="8" cy="13" r="2.5" />
                    <path d="M6 5.5L7 11" />
                    <path d="M10 5.5L9 11" />
                </svg>
            ),
        },
        {
            label: 'Lista',
            page: 'lista',
            route: '/deputados',
            icon: (isActive) => (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={isActive ? COLORS.orange : 'currentColor'} strokeWidth="1.5">
                    <path d="M2 3H14M2 8H14M2 13H14" />
                </svg>
            ),
        },
        {
            label: 'Sobre',
            page: 'sobre',
            route: '/sobre',
            icon: (isActive) => (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={isActive ? COLORS.orange : 'currentColor'} strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6.5" />
                    <path d="M8 7V12M8 5V5.5" />
                </svg>
            ),
        },
    ];

    return (
        <div style={barStyle}>
            {/* Left: Logo + Title */}
            <div style={leftStyle}>
                <div style={logoStyle}>
                    <img src={activeLogo} alt="Prisma Parlamentar logo" style={{ width: isMobile ? '40px' : '56px', height: isMobile ? '32px' : '44px', objectFit: 'contain' }} />
                </div>
                <span style={titleStyle}>Prisma Parlamentar</span>
            </div>

            {/* Center: Search bar */}
            <div style={centerStyle}>
                <SearchBar
                    placeholder="Pesquisar deputado"
                    suggestions={deputyList}
                    onSelectSuggestion={(dep) => {
                        setSearchActive(false);
                        onSelectDeputy(dep);
                    }}
                    onSelectProfile={(dep) => {
                        setSearchActive(false);
                        onSelectProfile(dep);
                    }}
                    isMobile={isMobile}
                    searchActive={searchActive}
                    onToggleSearch={() => setSearchActive(!searchActive)}
                />
            </div>

            {/* Right: Menu buttons */}
            <div style={rightStyle}>
                {menuItems.map((item) => {
                    const isActive = activePage === item.page;
                    return (
                        <button
                            key={item.label}
                            style={{
                                ...menuBtnStyle,
                                color: isActive ? COLORS.orange : COLORS.textMedium,
                            }}
                            onClick={() => navigate(item.route)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            {item.icon(isActive)}
                            {item.label}
                        </button>
                    );
                })}
                <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
            </div>

            {/* Mobile-only Hamburger trigger */}
            {isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md, flexShrink: 0 }}>
                    <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
                    {/* Hamburger button */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: menuOpen ? COLORS.orange : COLORS.textMedium,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: SPACING.xs,
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {menuOpen ? (
                                <>
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </>
                            ) : (
                                <>
                                    <line x1="3" y1="12" x2="21" y2="12"></line>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <line x1="3" y1="18" x2="21" y2="18"></line>
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            )}

            {/* Mobile Expanded Menu Dropdown */}
            {isMobile && menuOpen && (
                <div style={mobileMenuDropdownStyle}>
                    {menuItems.map((item) => {
                        const isActive = activePage === item.page;
                        return (
                            <button
                                key={item.label}
                                style={{
                                    ...menuBtnStyle,
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    padding: `${SPACING.md} ${SPACING.lg}`,
                                    color: isActive ? COLORS.orange : COLORS.textDark,
                                    backgroundColor: isActive ? 'rgba(232, 133, 12, 0.08)' : 'transparent',
                                }}
                                onClick={() => {
                                    setMenuOpen(false);
                                    navigate(item.route);
                                }}
                            >
                                {item.icon(isActive)}
                                <span style={{ marginLeft: SPACING.sm }}>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ThemeSwitch({ theme, toggleTheme }) {
    const isDark = theme === 'dark';

    const trackStyle = {
        width: '46px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: isDark ? '#151517' : '#eef2f3',
        border: isDark ? '1.5px solid #2d2d2d' : '1.5px solid transparent',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        padding: 0,
        outline: 'none',
        flexShrink: 0,
    };

    const thumbStyle = {
        width: '16px',
        height: '16px',
        position: 'absolute',
        left: isDark ? '25px' : '3px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    return (
        <button
            onClick={toggleTheme}
            style={trackStyle}
            title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            aria-label="Alternar tema"
        >
            <div style={thumbStyle}>
                {isDark ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill={COLORS.orange}>
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={COLORS.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" fill={COLORS.orange} />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                )}
            </div>
        </button>
    );
}
