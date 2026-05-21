// Prisma Político - Design Constants
// Todas as cores, fontes e espaçamentos do projeto

export const COLORS = {
    // Background
    backgroundDark: '#3d3d3d',
    backgroundLight: '#f5f5f5',
    white: '#ffffff',

    // Primary
    orange: '#e8850c',
    orangeHover: '#d47a0b',
    orangeLight: '#f5a623',

    // Text
    textDark: '#2d2d2d',
    textMedium: '#555555',
    textLight: '#888888',
    textWhite: '#ffffff',

    // Borders
    borderLight: '#e0e0e0',
    borderMedium: '#cccccc',

    // Frame
    frameBg: '#ffffff',
    frameShadow: 'rgba(0, 0, 0, 0.15)',

    // Deputy card
    deputyHeaderGreen: '#7ab648',
    partyBadgeBg: '#4a8c2a',
    partyBadgeText: '#ffffff',

    // Range slider
    sliderTrack: '#d9d9d9',
    sliderFilled: '#e8850c',

    // Checkbox
    checkboxChecked: '#e8850c',
    checkboxUnchecked: '#cccccc',

    // Graph
    nodeFade: '#cccccc',
    edgeFade: '#eeeeee',
    edgeDefault: '#cccccc',
};

// Cores por partido
// Cores por partido (Baseadas na imagem do plenário)
export const PARTY_COLORS = {
    PL: '#333170',
    PT: '#b11116',
    UNIÃO: '#2e8eb0',
    'UNIÃO BRASIL': '#2e8eb0',
    PP: '#29abb8',
    MDB: '#4e9d40',
    PSD: '#95b525',
    REPUBLICANOS: '#3c568d',
    PDT: '#2b76b2',
    PSB: '#f05523',
    PSDB: '#00509a',
    PSOL: '#ffcd00',
    PODEMOS: '#44774e',
    PODE: '#44774e',
    AVANTE: '#6b9ba1',
    PSC: '#19ae48',
    PCDOB: '#8c111e',
    'PCdoB': '#8c111e',
    PV: '#04441a',
    CIDADANIA: '#d41e7f',
    PATRIOTA: '#009ca6',
    SOLIDARIEDADE: '#ef7d00',
    SD: '#ef7d00',
    NOVO: '#5d7d85',
    PROS: '#b76d29',
    REDE: '#f4cecf',
    PTB: '#7f8d48',
    'MISSÃO': '#000000',
    'MISSAO': '#000000',
    OUTROS: '#888888',
};

// Cores por estado (UF)
export const STATE_COLORS = {
    SP: '#e63946',
    RJ: '#f4a261',
    MG: '#2a9d8f',
    RS: '#264653',
    BA: '#e76f51',
    PR: '#6a994e',
    SC: '#457b9d',
    GO: '#bc6c25',
    CE: '#9b2226',
    PE: '#ae2012',
    MT: '#669bbc',
    PA: '#386641',
    AM: '#606c38',
    DF: '#003049',
};

// Cores por sexo
export const SEX_COLORS = {
    M: '#4a90d9',
    F: '#e85d75',
    O: '#8e44ad',
};

// Cores para comunidades detectadas (paleta de 20 cores distintas)
export const COMMUNITY_COLORS = [
    '#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261',
    '#264653', '#6a994e', '#bc6c25', '#9b2226', '#ae2012',
    '#669bbc', '#003049', '#8338ec', '#f77f00', '#fcbf49',
    '#3a86ff', '#ff006e', '#fb5607', '#06d6a0', '#118ab2',
];

export const FONTS = {
    family: "'Inter', 'Segoe UI', sans-serif",
    sizeXs: '11px',
    sizeSm: '12px',
    sizeMd: '14px',
    sizeLg: '16px',
    sizeXl: '18px',
    sizeTitle: '20px',
    weightNormal: 400,
    weightMedium: 500,
    weightSemibold: 600,
    weightBold: 700,
};

export const SPACING = {
    // Gap uniforme entre frames e borda da tela
    frameGap: '16px',
    frameGapPx: 16,

    // Internal padding
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',

    // Border radius
    radiusSm: '4px',
    radiusMd: '8px',
    radiusLg: '12px',
    radiusRound: '50%',
};

export const SHADOWS = {
    frame: '0 2px 12px rgba(0, 0, 0, 0.15)',
    frameHover: '0 4px 20px rgba(0, 0, 0, 0.2)',
    button: '0 1px 4px rgba(0, 0, 0, 0.1)',
};
