import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import DeputyProfile from '../components/DeputyProfile';
import { COLORS, SPACING, FONTS, SHADOWS } from '../constants/theme';
import { useIsMobile } from '../utils/useIsMobile';
import logoSobrePositivo from '../assets/logo_sobre_positivo.png';
import logoSobreNegativo from '../assets/logo_sobre_negativo.png';
import logoUfrjPositivo from '../assets/ufrj_logo.png';
import logoUfrjNegativo from '../assets/ufrj_logo_negativo.png';
import logoBcc from '../assets/logo_bcc.png';

export default function Sobre({ theme, toggleTheme }) {
    const logoGrande = theme === 'dark' ? logoSobreNegativo : logoSobrePositivo;
    const ufrjLogo = theme === 'dark' ? logoUfrjNegativo : logoUfrjPositivo;
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [deputyList, setDeputyList] = useState([]);
    const [profileDeputy, setProfileDeputy] = useState(null);

    // Carregar a lista de deputados para a pesquisa da barra superior
    useEffect(() => {
        const fetchDeputados = async () => {
            try {
                const res = await fetch('/api/deputados/');
                if (res.ok) {
                    const data = await res.json();
                    setDeputyList(data.results || data);
                }
            } catch (err) {
                console.error('Erro ao buscar lista de deputados:', err);
            }
        };
        fetchDeputados();
    }, []);

    // Handlers para a pesquisa da barra superior
    const handleSearchSelectDeputy = (dep) => {
        // Navega para o grafo principal destacando o deputado selecionado
        navigate(`/?deputado=${dep.id}`);
    };

    const handleSearchSelectProfile = (dep) => {
        // Abre o perfil detalhado no modal sobre a página atual
        setProfileDeputy(dep);
    };

    // Estilos de Layout
    const pageStyle = {
        width: '100vw',
        height: '100vh',
        backgroundColor: COLORS.backgroundLight,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONTS.family,
    };

    const containerStyle = {
        position: 'absolute',
        top: isMobile ? '60px' : `calc(52px + ${SPACING.frameGap} + ${SPACING.frameGap})`,
        left: isMobile ? '8px' : SPACING.frameGap,
        right: isMobile ? '8px' : SPACING.frameGap,
        bottom: isMobile ? '12px' : SPACING.frameGap,
        overflowY: 'auto',
        padding: isMobile ? '24px 16px' : '48px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    };

    const innerContentStyle = {
        width: '100%',
        maxWidth: '850px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    };

    const logoSectionStyle = {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '32px',
        width: '100%',
        animation: 'fadeInDown 0.8s ease-out',
    };

    const logoImgStyle = {
        maxWidth: isMobile ? '280px' : '420px',
        width: '100%',
        height: 'auto',
    };

    const textSectionStyle = {
        color: COLORS.textMedium,
        fontSize: isMobile ? '14px' : '16px',
        lineHeight: '1.7',
        textAlign: 'justify',
        marginBottom: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    };

    const sectionTitleStyle = {
        fontSize: isMobile ? '18px' : '22px',
        fontWeight: FONTS.weightSemibold,
        color: COLORS.textDark,
        marginBottom: '20px',
        borderBottom: `2px solid ${COLORS.orange}`,
        paddingBottom: '6px',
        width: '100%',
        textAlign: 'left',
        letterSpacing: '0.5px',
    };

    const cardsGridStyle = {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '20px',
        width: '100%',
        marginBottom: '32px',
    };

    const cardStyle = {
        backgroundColor: COLORS.white,
        borderRadius: SPACING.radiusMd,
        padding: '20px',
        borderLeft: `4px solid ${COLORS.orange}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    };

    const cardTitleStyle = {
        fontSize: '16px',
        fontWeight: FONTS.weightSemibold,
        color: COLORS.textDark,
        margin: 0,
    };

    const badgeStyle = {
        fontSize: '11px',
        fontWeight: FONTS.weightBold,
        backgroundColor: 'rgba(232, 133, 12, 0.1)',
        color: COLORS.orange,
        padding: '2px 8px',
        borderRadius: '12px',
        alignSelf: 'flex-start',
        textTransform: 'uppercase',
    };

    const linkContainerStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '13px',
        color: COLORS.textMedium,
    };

    const linkStyle = {
        color: COLORS.orange,
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'color 0.2s ease',
    };

    const institutionalStyle = {
        marginTop: '24px',
        paddingTop: '32px',
        borderTop: `1px solid ${COLORS.borderLight}`,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
    };

    const ufrjLogoStyle = {
        maxWidth: isMobile ? '140px' : '180px',
        width: '100%',
        height: 'auto',
    };

    const bccLogoStyle = {
        maxWidth: isMobile ? '180px' : '220px',
        width: '100%',
        height: 'auto',
    };

    const footerLogosStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? '24px' : '40px',
        width: '100%',
    };

    return (
        <div style={pageStyle}>
            {/* TopBar */}
            <TopBar
                deputyList={deputyList}
                onSelectDeputy={handleSearchSelectDeputy}
                onSelectProfile={handleSearchSelectProfile}
                activePage="sobre"
                theme={theme}
                toggleTheme={toggleTheme}
            />

            {/* Container Principal */}
            <div style={containerStyle}>
                <div style={innerContentStyle}>

                    {/* Seção da Logo Grande */}
                    <div style={logoSectionStyle}>
                        <img src={logoGrande} alt="Prisma Parlamentar logo grande" style={logoImgStyle} />
                    </div>

                    {/* Seção de Texto Descritivo */}
                    <div style={textSectionStyle}>
                        <p>
                            A plataforma Prisma Parlamentar foi desenvolvida como parte do Trabalho de Conclusão de Curso do Bacharelado em Ciência da Computação da Universidade Federal do Rio de Janeiro (UFRJ), com o objetivo de ampliar o acesso e a compreensão dos dados públicos disponibilizados pela Câmara dos Deputados.
                        </p>
                        <p>
                            A aplicação reúne informações legislativas em uma interface moderna e intuitiva, permitindo que estudantes, pesquisadores, jornalistas e cidadãos explorem a atividade parlamentar de forma simples e interativa. Por meio de técnicas de Análise de Redes Sociais, a plataforma possibilita visualizar relações entre deputados, identificar comunidades políticas, analisar padrões de votação e colaboração em proposições, além de investigar métricas de influência e diferentes aspectos da atuação parlamentar.
                        </p>
                        <p>
                            Ao integrar métodos científicos de análise de redes com recursos avançados de visualização de dados, busca-se reduzir a barreira técnica existente no acesso aos dados legislativos, promovendo maior transparência, acessibilidade e compreensão do funcionamento da Câmara dos Deputados.
                        </p>
                        <p>
                            Os dados exibidos na plataforma são obtidos diretamente a partir do portal de <strong><a href="https://dadosabertos.camara.leg.br/" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.orange, textDecoration: 'underline', fontWeight: FONTS.weightMedium }} onMouseEnter={(e) => e.target.style.color = COLORS.orangeHover} onMouseLeave={(e) => e.target.style.color = COLORS.orange}>Dados Abertos da Câmara dos Deputados</a></strong>, contando com uma rotina de atualização diária para garantir informações sempre recentes das atividades legislativas.
                        </p>
                    </div>

                    {/* Seção de Autores / Desenvolvedores */}
                    <div style={sectionTitleStyle}>Desenvolvimento</div>
                    <div style={cardsGridStyle}>
                        {/* Augusto */}
                        <div
                            style={cardStyle}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                            }}
                        >
                            <span style={badgeStyle}>Aluno</span>
                            <h3 style={cardTitleStyle}>Augusto Grabe Guimarães</h3>
                            <div style={linkContainerStyle}>
                                <div>
                                    Email: <a href="mailto:augustograbe@gmail.com" style={linkStyle} onMouseEnter={(e) => e.target.style.color = COLORS.orangeHover} onMouseLeave={(e) => e.target.style.color = COLORS.orange}>augustograbe@gmail.com</a>
                                </div>
                                <div>
                                    LinkedIn: <a href="https://www.linkedin.com/in/augusto-grabe" target="_blank" rel="noopener noreferrer" style={linkStyle} onMouseEnter={(e) => e.target.style.color = COLORS.orangeHover} onMouseLeave={(e) => e.target.style.color = COLORS.orange}>linkedin.com/in/augusto-grabe</a>
                                </div>
                            </div>
                        </div>

                        {/* Pedro */}
                        <div
                            style={cardStyle}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                            }}
                        >
                            <span style={badgeStyle}>Aluno</span>
                            <h3 style={cardTitleStyle}>Pedro Luis Mello Otero</h3>
                            <div style={linkContainerStyle}>
                                <div>
                                    Email: <a href="mailto:pedrolmo@ic.ufrj.br" style={linkStyle} onMouseEnter={(e) => e.target.style.color = COLORS.orangeHover} onMouseLeave={(e) => e.target.style.color = COLORS.orange}>pedrolmo@ic.ufrj.br</a>
                                </div>
                                <div>
                                    LinkedIn: <a href="https://www.linkedin.com/in/pedro-luis-otero/" target="_blank" rel="noopener noreferrer" style={linkStyle} onMouseEnter={(e) => e.target.style.color = COLORS.orangeHover} onMouseLeave={(e) => e.target.style.color = COLORS.orange}>linkedin.com/in/pedro-luis-otero</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção do Orientador */}
                    <div style={sectionTitleStyle}>Orientação</div>
                    <div style={{ ...cardsGridStyle, gridTemplateColumns: '1fr' }}>
                        {/* Silas */}
                        <div
                            style={{ ...cardStyle, maxWidth: isMobile ? '100%' : 'calc(50% - 10px)' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                            }}
                        >
                            <span style={{ ...badgeStyle, backgroundColor: 'rgba(42, 157, 143, 0.1)', color: '#2a9d8f' }}>Orientador</span>
                            <h3 style={cardTitleStyle}>Silas Lima Filho</h3>
                            <div style={linkContainerStyle}>
                                <div>
                                    Email: <a href="mailto:silaslfilho@ic.ufrj.br" style={linkStyle} onMouseEnter={(e) => e.target.style.color = COLORS.orangeHover} onMouseLeave={(e) => e.target.style.color = COLORS.orange}>silaslfilho@ic.ufrj.br</a>
                                </div>
                                <div>
                                    LinkedIn: <a href="https://www.linkedin.com/in/silas-filho/" target="_blank" rel="noopener noreferrer" style={linkStyle} onMouseEnter={(e) => e.target.style.color = COLORS.orangeHover} onMouseLeave={(e) => e.target.style.color = COLORS.orange}>linkedin.com/in/silas-filho</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rodapé Institucional */}
                    <div style={institutionalStyle}>
                        <div style={footerLogosStyle}>
                            <img src={ufrjLogo} alt="Logo UFRJ" style={ufrjLogoStyle} />
                            <img src={logoBcc} alt="Logo BCC UFRJ" style={bccLogoStyle} />
                        </div>
                    </div>

                </div>
            </div>

            {/* Modal de perfil do deputado (se pesquisado) */}
            <DeputyProfile
                deputy={profileDeputy}
                visible={!!profileDeputy}
                onClose={() => setProfileDeputy(null)}
            />
        </div>
    );
}
