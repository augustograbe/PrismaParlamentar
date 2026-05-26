import { useState, useRef, useEffect } from 'react';
import Frame from '../Frame';
import { COLORS, SPACING, FONTS, SHADOWS } from '../../constants/theme';

/**
 * InfoFrame - Frame "O que estou vendo?" no canto inferior esquerdo
 * Expande ao passar o mouse para fornecer explicações personalizadas em tempo real.
 */
export default function InfoFrame({ graphType = 'similaridade', filters }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const timeoutRef = useRef(null);

    // Limpa qualquer timeout ativo ao desmontar
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Garante que filters não seja nulo ou indefinido
    const activeFilters = filters || {
        separateBy: 'partido',
        onlyActive: true,
        highlightPinned: true,
        onlyWithConnections: false,
        presence: { min: 0, max: 100 },
        voteSimilarity: { min: 80, max: 100 },
        coautoria: { min: 1, max: 50 },
        vertexSize: 'padrao',
        graphLayout: 'forceatlas2_clusters',
        communityAlgorithm: 'louvain',
        backboneEnabled: false,
        backboneMethod: 'lans',
        coautoresRange: { min: 2, max: 333 },
        polarizacaoRange: { min: 50, max: 100 },
        proposalTypes: ['PL'],
    };

    // Handlers para mouse hover com pequeno delay para evitar trigger acidental
    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsExpanded(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsExpanded(false);
        }, 300); // pequeno delay para suavidade
    };

    const handleToggle = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsExpanded(prev => !prev);
    };

    // --- Funções Geradoras do Texto Narrativo ---

    const getGraphTitle = () => {
        return graphType === 'coautoria' 
            ? 'Rede de Coautoria de Projetos' 
            : 'Rede de Similaridade de Votos';
    };

    const getNarrativeParagraphs = () => {
        const isCoautoria = graphType === 'coautoria';
        
        // 1. O que é o grafo
        const introParagraph = isCoautoria ? (
            <span>
                Este grafo mapeia a <strong>Rede de Coautoria de Projetos</strong> entre os deputados federais brasileiros. Cada círculo (vértice) representa um parlamentar, e as linhas (arestas) conectam aqueles que propuseram e assinaram projetos de lei em conjunto.
            </span>
        ) : (
            <span>
                Este grafo representa a <strong>Rede de Similaridade de Votos</strong> entre os deputados federais brasileiros. Cada círculo (vértice) representa um parlamentar, e as conexões indicam que eles votaram de forma muito parecida nas sessões deliberativas da Câmara.
            </span>
        );

        // 2. Por que ele está desse jeito (Cores + Layout + Conexões/Backbone)
        let colorText = null;
        switch (activeFilters.separateBy) {
            case 'estado':
                colorText = (
                    <span>
                        Os parlamentares estão coloridos e organizados por <strong>estado (UF) de eleição</strong>, permitindo perceber se existem blocos regionais ou bancadas estaduais fortes que atuam em conjunto.
                    </span>
                );
                break;
            case 'sexo':
                colorText = (
                    <span>
                        A segmentação por <strong>sexo</strong> destaca a representação de gênero e ajuda a visualizar as conexões e o alinhamento político entre deputadas e deputados.
                    </span>
                );
                break;
            case 'comunidade': {
                const algo = activeFilters.communityAlgorithm === 'leiden' ? 'Leiden' : 'Louvain';
                colorText = (
                    <span>
                        As cores identificam <strong>comunidades estruturais</strong> detectadas pelo algoritmo matemático <strong>{algo}</strong>. Este método agrupa automaticamente parlamentares com padrões de conexão extremamente similares, revelando blocos e coalizões que transcendem os partidos oficiais.
                    </span>
                );
                break;
            }
            case 'partido':
            default:
                colorText = (
                    <span>
                        Os parlamentares estão coloridos e organizados por <strong>partido político</strong>, o que evidencia como as bancadas partidárias se comportam e se alinham na prática legislativa.
                    </span>
                );
        }

        let layoutText = "";
        if (activeFilters.graphLayout === 'forceatlas2_clusters') {
            layoutText = " A física do grafo usa o layout ForceAtlas2 focado em clusters, aproximando deputados muito conectados e empurrando blocos ideológicos divergentes para extremidades opostas.";
        } else {
            layoutText = " A física espalhada do layout distribui os deputados pelo plano de forma uniforme, priorizando a clareza de cada conexão individual.";
        }

        let connectionText = null;
        if (activeFilters.backboneEnabled) {
            if (activeFilters.backboneMethod === 'high_salience_skeleton') {
                connectionText = (
                    <span>
                        {" "}Para tornar a estrutura visível, aplicamos o filtro avançado de Backbone com o método <strong>High Salience Skeleton</strong>. Este algoritmo foca na importância global das conexões, identificando as arestas mais "salientes" a partir das árvores de caminhos mínimos calculadas entre todos os nós. Ele destaca as conexões frequentes que de fato formam a espinha dorsal mais estrutural e global da rede.
                    </span>
                );
            } else {
                connectionText = (
                    <span>
                        {" "}Para tornar a estrutura visível, aplicamos o filtro avançado de Backbone com o método <strong>LANS (Locally Adaptive Network Sparsification)</strong>. Este algoritmo foca na relevância local das conexões, adaptando o filtro ao contexto de cada nó e enxugando a rede mantendo as ligações mais importantes de cada vizinhança sem usar um corte global único.
                    </span>
                );
            }
        } else {
            if (isCoautoria) {
                const types = activeFilters.proposalTypes && activeFilters.proposalTypes.length > 0 
                    ? activeFilters.proposalTypes.map(t => {
                        if (t === 'PL') return 'Projeto de Lei (PL)';
                        if (t === 'PLP') return 'Projeto de Lei Complementar (PLP)';
                        if (t === 'PEC') return 'Proposta de Emenda à Constituição (PEC)';
                        return t;
                    }).join(', ') 
                    : 'Projeto de Lei (PL)';
                connectionText = (
                    <span>
                        {" "}As conexões exibidas representam apenas coautorias de <strong>{activeFilters.coautoria?.min || 1} a {activeFilters.coautoria?.max || 50} projetos em comum</strong> (considerando: <strong>{types}</strong>).
                    </span>
                );
            } else {
                connectionText = (
                    <span>
                        {" "}Para evitar poluição visual, exibimos conexões apenas entre deputados com similaridade de voto muito alta, situada no intervalo de <strong>{activeFilters.voteSimilarity?.min || 80}% e {activeFilters.voteSimilarity?.max || 100}%</strong> de concordância.
                    </span>
                );
            }
        }

        const designParagraph = (
            <span>
                As cores, a física e a densidade da rede revelam sua organização atual. {colorText}{layoutText}{connectionText}
            </span>
        );

        // 3. O que ele está mostrando (População + Tamanhos + Filtros Finos)
        let populationText = activeFilters.onlyActive 
            ? "A visualização foca exclusivamente em deputados atualmente em exercício ativo"
            : "A rede inclui todos os deputados cadastrados, mesmo licenciados ou suplentes temporários";

        let presenceFilter = "";
        if (activeFilters.presence && (activeFilters.presence.min > 0 || activeFilters.presence.max < 100)) {
            presenceFilter = ` que registraram presença em sessões entre ${activeFilters.presence.min}% e ${activeFilters.presence.max}%`;
        }

        let isolatedFilter = activeFilters.onlyWithConnections
            ? " (ocultando parlamentares isolados que não possuem nenhuma ligação forte)."
            : ".";

        let sizeText = null;
        switch (activeFilters.vertexSize) {
            case 'presenca':
                sizeText = (
                    <span>
                        {" "}O <strong>tamanho do círculo</strong> de cada deputado é proporcional à sua <strong>presença em plenário</strong>, destacando os parlamentares mais assíduos.
                    </span>
                );
                break;
            case 'conexoes':
                sizeText = (
                    <span>
                        {" "}O <strong>tamanho do círculo</strong> é proporcional ao seu <strong>número de conexões na rede</strong>, tornando fácil identificar os principais articuladores.
                    </span>
                );
                break;
            case 'despesas': {
                const cat = activeFilters.expenseCategory || 'Todas';
                const ano = activeFilters.expenseYear || 'mandato';
                const catText = cat === 'Todas' ? 'todas as categorias' : `a categoria "${cat}"`;
                sizeText = (
                    <span>
                        {" "}O <strong>tamanho do círculo</strong> reflete o volume de <strong>despesas parlamentares</strong> (ano: <strong>{ano}</strong>, categoria: <strong>{catText}</strong>), realçando quem registrou maior utilização da cota.
                    </span>
                );
                break;
            }
            case 'discursos':
                sizeText = (
                    <span>
                        {" "}O <strong>tamanho do círculo</strong> é baseado na <strong>quantidade de discursos</strong> proferidos, evidenciando os deputados com maior participação na tribuna.
                    </span>
                );
                break;
            case 'proposicoes': {
                const propType = activeFilters.proposalType || 'PL+PLP+PEC';
                let propTypeText = propType;
                if (propType === 'PL+PLP+PEC') {
                    propTypeText = 'Projeto de Lei (PL), Projeto de Lei Complementar (PLP) e Proposta de Emenda à Constituição (PEC)';
                } else if (propType === 'PL') {
                    propTypeText = 'Projeto de Lei (PL)';
                } else if (propType === 'PLP') {
                    propTypeText = 'Projeto de Lei Complementar (PLP)';
                } else if (propType === 'PEC') {
                    propTypeText = 'Proposta de Emenda à Constituição (PEC)';
                }
                sizeText = (
                    <span>
                        {" "}O <strong>tamanho do círculo</strong> é proporcional à <strong>quantidade de proposições apresentadas</strong> (considerando <strong>{propTypeText}</strong>), evidenciando os parlamentares mais ativos na elaboração de leis.
                    </span>
                );
                break;
            }
            case 'padrao':
            default:
                sizeText = (
                    <span>
                        {" "}Os círculos possuem <strong>tamanho uniforme</strong>, mantendo a igualdade na representação visual de cada parlamentar.
                    </span>
                );
        }

        let advancedText = null;
        if (isCoautoria && activeFilters.coautoresRange && (activeFilters.coautoresRange.min > 2 || activeFilters.coautoresRange.max < 333)) {
            advancedText = (
                <span>
                    {" "}Para evitar distorções de projetos com assinaturas em massa (como frentes parlamentares inteiras ou projetos de bancadas inteiras), foram considerados apenas projetos que contam com um número de coautores entre <strong>{activeFilters.coautoresRange.min} e {activeFilters.coautoresRange.max}</strong>.
                </span>
            );
        }
        if (!isCoautoria && activeFilters.polarizacaoRange && (activeFilters.polarizacaoRange.min > 50 || activeFilters.polarizacaoRange.max < 100)) {
            advancedText = (
                <span>
                    {" "}O cálculo de afinidade focou em votações polarizadas e descartou votações quase unânimes (com alinhamento fora de <strong>{activeFilters.polarizacaoRange.min}% a {activeFilters.polarizacaoRange.max}%</strong>), garantindo que apenas votações que realmente diferenciam o posicionamento político fossem contabilizadas.
                </span>
            );
        }

        const showingParagraph = (
            <span>
                Neste exato momento, {populationText}{presenceFilter}{isolatedFilter}{sizeText}{advancedText}
            </span>
        );

        const interactionParagraph = (
            <span>
                <strong>Dica:</strong> Você pode <strong>clicar em um deputado</strong> para destacar todos os parlamentares conectados a ele e obter mais informações no painel de perfil.
            </span>
        );

        return (
            <>
                <p style={sectionDescStyle}>{introParagraph}</p>
                <p style={sectionDescStyle}>{designParagraph}</p>
                <p style={sectionDescStyle}>{showingParagraph}</p>
                <p style={{ ...sectionDescStyle, borderTop: `1px dashed ${COLORS.borderLight}`, paddingTop: '8px', marginTop: '4px', fontSize: FONTS.sizeXs, color: COLORS.textLight }}>
                    {interactionParagraph}
                </p>
            </>
        );
    };

    // --- Estilos de Visualização ---

    const headerStyle = {
        padding: `${SPACING.sm} ${SPACING.md}`,
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        cursor: 'pointer',
        userSelect: 'none',
        height: '44px',
        boxSizing: 'border-box',
    };

    const iconStyle = {
        width: '20px',
        height: '20px',
        borderRadius: SPACING.radiusRound,
        border: `2px solid ${isExpanded ? COLORS.orange : COLORS.textMedium}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: isExpanded ? `${COLORS.orange}15` : 'transparent',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    const textStyle = {
        fontSize: FONTS.sizeMd,
        color: isExpanded ? COLORS.orange : COLORS.textDark,
        fontWeight: FONTS.weightMedium,
        transition: 'color 0.25s ease',
        whiteSpace: 'nowrap',
    };

    const bodyStyle = {
        borderTop: `1px solid ${COLORS.borderLight}`,
        padding: SPACING.md,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm,
        backgroundColor: COLORS.white,
        maxHeight: '380px',
        overflowY: 'auto',
        opacity: isExpanded ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out',
    };

    const sectionTitleStyle = {
        fontSize: FONTS.sizeXs,
        fontWeight: FONTS.weightBold,
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        color: COLORS.orange,
        marginBottom: '4px',
    };

    const sectionDescStyle = {
        fontSize: FONTS.sizeSm,
        color: COLORS.textMedium,
        lineHeight: '1.45',
        margin: 0,
    };

    const framePosition = {
        bottom: SPACING.frameGap,
        left: SPACING.frameGap,
    };

    return (
        <Frame
            width={isExpanded ? '380px' : '185px'}
            height="auto"
            position={framePosition}
            style={{
                transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease, border-color 0.3s ease',
                overflow: 'hidden',
                borderRadius: SPACING.radiusLg,
                border: `1px solid ${isExpanded ? `${COLORS.orange}50` : COLORS.borderMedium}`,
                boxShadow: isExpanded ? SHADOWS.frameHover : SHADOWS.frame,
            }}
        >
            <div 
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleToggle}
            >
                <div style={headerStyle}>
                    <div style={iconStyle}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: 'transform 0.3s ease' }}>
                            <text x="5" y="8.5" textAnchor="middle" fontSize="10" fontWeight="bold" fill={isExpanded ? COLORS.orange : COLORS.textMedium}>?</text>
                        </svg>
                    </div>
                    <span style={textStyle}>O que estou vendo?</span>
                </div>

                {isExpanded && (
                    <div style={bodyStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ ...sectionTitleStyle, fontSize: FONTS.sizeSm, marginBottom: '2px', borderBottom: `1px dashed ${COLORS.borderLight}`, paddingBottom: '6px' }}>
                            {getGraphTitle()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
                            {getNarrativeParagraphs()}
                        </div>
                    </div>
                )}
            </div>
        </Frame>
    );
}
