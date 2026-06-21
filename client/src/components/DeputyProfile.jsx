import { useState } from 'react';
import Frame from './Frame';
import { COLORS, SPACING, FONTS, SHADOWS } from '../constants/theme';
import ActivityCalendar from './ActivityCalendar';
import DeputyStats from './DeputyStats';
import DeputyExpenses from './DeputyExpenses';
import { useIsMobile } from '../utils/useIsMobile';

/**
 * DeputyProfile - Painel de perfil expandido do deputado
 * Abre centralizado abaixo do TopBar, com overlay escurecido no fundo.
 *
 * Props:
 * - deputy: objeto { nome, partido, estado, nodeColor, url_foto, sigla_partido, sigla_uf, ... }
 * - visible: se o perfil deve ser exibido
 * - onClose: callback ao fechar
 */
const TABS = [
    { id: 'atividade', label: 'Atividade' },
    { id: 'gastos', label: 'Gastos' },
    { id: 'emendas', label: 'Emendas' },
    { id: 'eleicao', label: 'Eleição' },
];

export default function DeputyProfile({ deputy = null, visible = false, onClose }) {
    const [activeTab, setActiveTab] = useState('atividade');
    const isMobile = useIsMobile();

    if (!visible || !deputy) return null;

    const headerColor = deputy.nodeColor || COLORS.deputyHeaderGreen;
    const photoUrl = deputy.url_foto || deputy.urlFoto;

    const PHOTO_SIZE = isMobile ? 100 : 130;
    const HEADER_HEIGHT = 40;
    const PHOTO_OVERLAP = isMobile ? 0 : 30;


    // Overlay — covers entire page, but keeps profile below topbar via padding
    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        zIndex: 150,
        display: 'flex',
        justifyContent: 'center',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        paddingTop: isMobile ? '0' : `calc(52px + ${SPACING.frameGap} * 3)`,
    };

    // Profile card container
    const profileStyle = {
        width: isMobile ? '100%' : '1000px',
        maxWidth: isMobile ? '100vw' : 'calc(100vw - 64px)',
        height: isMobile ? '100%' : 'auto',
        maxHeight: isMobile ? '100vh' : `calc(100vh - 52px - ${SPACING.frameGap} - ${SPACING.frameGap} - ${SPACING.frameGap} - ${SPACING.frameGap})`,
        backgroundColor: COLORS.frameBg,
        borderRadius: isMobile ? 0 : SPACING.radiusLg,
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        animation: 'profileSlideIn 0.25s ease-out',
    };

    // Colored header bar
    const headerBarStyle = {
        height: `${HEADER_HEIGHT}px`,
        backgroundColor: headerColor,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingRight: SPACING.md,
        flexShrink: 0,
    };

    const closeButtonStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: SPACING.xs,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: COLORS.textWhite,
        borderRadius: SPACING.radiusSm,
        transition: 'background-color 0.15s',
    };

    // Photo circle
    const photoWrapperStyle = {
        position: isMobile ? 'relative' : 'absolute',
        top: isMobile ? '12px' : `${HEADER_HEIGHT - PHOTO_OVERLAP}px`,
        left: isMobile ? '50%' : SPACING.xl,
        transform: isMobile ? 'translateX(-50%)' : 'none',
        width: `${PHOTO_SIZE}px`,
        height: `${PHOTO_SIZE}px`,
        borderRadius: '50%',
        border: `3px solid ${headerColor}`,
        backgroundColor: COLORS.borderLight,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        flexShrink: 0,
    };

    const photoImgStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'top',
    };

    // Body area below header
    const bodyPaddingTop = isMobile ? 12 : PHOTO_SIZE - PHOTO_OVERLAP + 12;

    const bodyStyle = {
        paddingTop: isMobile ? '8px' : `${bodyPaddingTop}px`,
        paddingLeft: SPACING.xl,
        paddingRight: SPACING.xl,
        paddingBottom: isMobile ? '8px' : SPACING.lg,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    };

    // Info block — next to photo
    const infoBlockStyle = {
        marginLeft: isMobile ? '0' : `${PHOTO_SIZE + 16}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minHeight: isMobile ? 'auto' : `${PHOTO_SIZE - PHOTO_OVERLAP - 4}px`,
        justifyContent: 'center',
        marginTop: isMobile ? '12px' : `-${bodyPaddingTop - 12}px`,
        alignItems: isMobile ? 'center' : 'flex-start',
        textAlign: isMobile ? 'center' : 'left',
    };

    const nameStyle = {
        fontSize: isMobile ? '18px' : FONTS.sizeXl,
        fontWeight: FONTS.weightSemibold,
        color: COLORS.textDark,
        lineHeight: 1.2,
    };

    const detailStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        fontSize: FONTS.sizeMd,
        color: COLORS.textMedium,
    };

    const badgeStyle = {
        backgroundColor: headerColor,
        color: COLORS.partyBadgeText,
        padding: `2px ${SPACING.sm}`,
        borderRadius: SPACING.radiusSm,
        fontSize: FONTS.sizeSm,
        fontWeight: FONTS.weightSemibold,
    };

    // Tab bar
    const tabBarStyle = {
        display: 'flex',
        borderBottom: `2px solid ${COLORS.borderLight}`,
        marginTop: isMobile ? SPACING.sm : SPACING.lg,
        flexShrink: 0,
        overflowX: isMobile ? 'auto' : 'visible',
        width: '100%',
        scrollbarWidth: 'none', // for Firefox
        WebkitOverflowScrolling: 'touch',
    };

    const getTabStyle = (tabId) => ({
        flex: isMobile ? '0 0 auto' : 1,
        padding: isMobile ? `${SPACING.sm} ${SPACING.md}` : `${SPACING.md} ${SPACING.md}`,
        fontSize: isMobile ? '13px' : FONTS.sizeMd,
        fontWeight: activeTab === tabId ? FONTS.weightSemibold : FONTS.weightMedium,
        fontFamily: FONTS.family,
        color: activeTab === tabId ? COLORS.orange : COLORS.textMedium,
        background: 'none',
        border: 'none',
        borderBottom: activeTab === tabId ? `3px solid ${COLORS.orange}` : '3px solid transparent',
        cursor: 'pointer',
        transition: 'color 0.2s, border-color 0.2s, background-color 0.2s',
        textAlign: 'center',
        marginBottom: '-2px',
        whiteSpace: 'nowrap',
    });

    // Tab content area
    const tabContentStyle = {
        flex: 1,
        overflow: 'auto',
        padding: isMobile ? SPACING.md : SPACING.xl,
        minHeight: isMobile ? '200px' : '300px',
    };

    const emptyTabStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '200px',
        color: COLORS.textLight,
        fontSize: FONTS.sizeMd,
        fontStyle: 'italic',
    };

    const handleOverlayClick = (e) => {
        // Close only if clicking the overlay itself, not the profile card
        if (e.target === e.currentTarget) {
            onClose?.();
        }
    };

    return (
        <>
            {/* Keyframe animation */}
            <style>{`
                @keyframes profileSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            {/* Dark overlay below topbar */}
            <div style={overlayStyle} onClick={handleOverlayClick}>
                {/* Profile card */}
                <div style={profileStyle}>
                    {/* Photo — absolute positioned overlapping header */}
                    <div style={photoWrapperStyle}>
                        {photoUrl ? (
                            <img src={photoUrl} alt={deputy.nome} style={photoImgStyle} />
                        ) : (
                            <span style={{ fontSize: FONTS.sizeMd, color: COLORS.textLight, textAlign: 'center' }}>
                                Foto
                            </span>
                        )}
                    </div>

                    {/* Colored header bar with close button */}
                    <div style={headerBarStyle}>
                        <button
                            onClick={onClose}
                            style={closeButtonStyle}
                            title="Fechar"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 1L11 11M11 1L1 11" />
                            </svg>
                        </button>
                    </div>

                    {/* Body with name/info */}
                    <div style={bodyStyle}>
                        <div style={infoBlockStyle}>
                            <span style={nameStyle}>{deputy.nome}</span>
                            <div style={detailStyle}>
                                <span style={badgeStyle}>{deputy.sigla_partido || deputy.partido}</span>
                                <span>•</span>
                                <span>{deputy.sigla_uf || deputy.estado}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div style={{ padding: `0 ${SPACING.xl}` }}>
                        <div style={tabBarStyle}>
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    style={getTabStyle(tab.id)}
                                    onClick={() => setActiveTab(tab.id)}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== tab.id) {
                                            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
                                            e.currentTarget.style.color = COLORS.textDark;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== tab.id) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = COLORS.textMedium;
                                        }
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div style={tabContentStyle}>
                        {activeTab === 'atividade' ? (
                            <>
                                <DeputyStats deputyId={deputy.id} />
                                <ActivityCalendar deputyId={deputy.id} />
                            </>
                        ) : activeTab === 'gastos' ? (
                            <DeputyExpenses deputyId={deputy.id} />
                        ) : (
                            <div style={emptyTabStyle}>
                                {/* Placeholder for future content */}
                                <p>Conteúdo de {activeTab} em breve.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
