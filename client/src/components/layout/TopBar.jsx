import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONTS } from '../../constants/theme';
import SearchBar from '../SearchBar';
import logo from '../../assets/logo.png';
import { useIsMobile } from '../../utils/useIsMobile';

/**
 * TopBar - Barra superior da aplicação
 * Logo + Título + Barra de pesquisa + Botões de menu (Grafos, Lista, Sobre)
 *
 * Props:
 * - deputyList: array de deputados para autocomplete na SearchBar
 * - onSelectDeputy: callback quando um deputado é selecionado na pesquisa
 */
export default function TopBar({ deputyList = [], onSelectDeputy, onSelectProfile, activePage = 'grafos' }) {
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
        fontSize: isMobile ? '16px' : FONTS.sizeTitle,
        fontWeight: FONTS.weightMedium,
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
                    <img src={logo} alt="Prisma Político logo" style={{ width: isMobile ? '40px' : '56px', height: isMobile ? '32px' : '44px', objectFit: 'contain' }} />
                </div>
                <span style={titleStyle}>Prisma Político</span>
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
            </div>

            {/* Mobile-only Hamburger trigger */}
            {isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md, flexShrink: 0 }}>
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
