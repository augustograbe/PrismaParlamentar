import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONTS } from '../../constants/theme';
import SearchBar from '../SearchBar';
import logo from '../../assets/logo.png';

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
    const barStyle = {
        position: 'fixed',
        top: SPACING.frameGap,
        left: SPACING.frameGap,
        right: SPACING.frameGap,
        height: '52px',
        backgroundColor: COLORS.frameBg,
        borderRadius: SPACING.radiusLg,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${SPACING.xl}`,
        zIndex: 100,
    };

    const leftStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
    };

    const logoStyle = {
        width: '56px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const titleStyle = {
        fontSize: FONTS.sizeTitle,
        fontWeight: FONTS.weightMedium,
        color: COLORS.textDark,
    };

    const centerStyle = {
        flex: 1,
        maxWidth: '450px',
        margin: `0 ${SPACING.xl}`,
    };

    const rightStyle = {
        display: 'flex',
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
                    <img src={logo} alt="Prisma Político logo" style={{ width: '56px', height: '44px', objectFit: 'contain' }} />
                </div>
                <span style={titleStyle}>Prisma Político</span>
            </div>

            {/* Center: Search bar */}
            <div style={centerStyle}>
                <SearchBar
                    placeholder="Pesquisar deputado"
                    suggestions={deputyList}
                    onSelectSuggestion={onSelectDeputy}
                    onSelectProfile={onSelectProfile}
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
        </div>
    );
}
