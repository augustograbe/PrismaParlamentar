import { useNavigate } from 'react-router-dom';
import { COLORS, SPACING, FONTS } from '../../constants/theme';

/**
 * BottomNavBar - Barra de navegação inferior para dispositivos móveis
 *
 * Props:
 * - activePage: a página atualmente ativa ('grafos', 'lista', 'sobre')
 */
export default function BottomNavBar({ activePage = 'grafos' }) {
    const navigate = useNavigate();

    const barStyle = {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: COLORS.frameBg,
        borderTop: `1px solid ${COLORS.borderLight}`,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
    };

    const tabStyle = (isActive) => ({
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        fontSize: '11px',
        fontFamily: FONTS.family,
        fontWeight: isActive ? FONTS.weightSemibold : FONTS.weightMedium,
        color: isActive ? COLORS.orange : COLORS.textMedium,
        padding: `${SPACING.xs} ${SPACING.sm}`,
        flex: 1,
        height: '100%',
        transition: 'color 0.15s ease',
    });

    const menuItems = [
        {
            label: 'Grafos',
            page: 'grafos',
            route: '/',
            icon: (isActive) => (
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke={isActive ? COLORS.orange : 'currentColor'} strokeWidth="1.5">
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
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke={isActive ? COLORS.orange : 'currentColor'} strokeWidth="1.5">
                    <path d="M2 3H14M2 8H14M2 13H14" />
                </svg>
            ),
        },
        {
            label: 'Sobre',
            page: 'sobre',
            route: '/sobre',
            icon: (isActive) => (
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke={isActive ? COLORS.orange : 'currentColor'} strokeWidth="1.5">
                    <circle cx="8" cy="8" r="6.5" />
                    <path d="M8 7V12M8 5V5.5" />
                </svg>
            ),
        },
    ];

    return (
        <div style={barStyle}>
            {menuItems.map((item) => {
                const isActive = activePage === item.page;
                return (
                    <button
                        key={item.label}
                        style={tabStyle(isActive)}
                        onClick={() => navigate(item.route)}
                    >
                        {item.icon(isActive)}
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
