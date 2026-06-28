import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import RankingPanel from '../components/RankingPanel';
import ListFiltersPanel from '../components/ListFiltersPanel';
import FieldsPanel, { ALL_FIELD_OPTIONS } from '../components/FieldsPanel';
import PinnedPanel from '../components/PinnedPanel';
import DeputyProfile from '../components/DeputyProfile';
import { COLORS, SPACING, FONTS, SHADOWS, PARTY_COLORS } from '../constants/theme';
import { Pin, PinOff, ArrowUpDown, Filter, Columns } from 'lucide-react';
import { useIsMobile } from '../utils/useIsMobile';
import { useDocumentTitle } from '../utils/useDocumentTitle';

const PINNED_STORAGE_KEY = 'prisma_parlamentar_pinned';
const PAGE_SIZE = 100;

// Field labels for table headers
const FIELD_LABELS = {};
ALL_FIELD_OPTIONS.forEach((o) => { FIELD_LABELS[o.value] = o.label; });

function loadPinnedFromStorage() {
    try {
        const stored = localStorage.getItem(PINNED_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function savePinnedToStorage(pinned) {
    try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Deputados - Página de listagem de deputados
 * Tabela paginada com painéis laterais (Ranking, Filtros, Campos, Fixados)
 */
const DEFAULT_DEPUTADOS_FILTERS = {
    onlyActive: true,
    presence: { min: 0, max: 100 }
};

const DEFAULT_DEPUTADOS_FIELDS = [
    'nome', 'sigla_partido', 'foto', 'sigla_uf', 'presenca', 'situacao'
];

function serializeDeputadosParams({ filters, sortBy, selectedFields, currentPage, expenseCategory, expenseYear, proposalType }) {
    const params = {};
    params.onlyActive = String(filters.onlyActive);
    params.presence_min = String(filters.presence.min);
    params.presence_max = String(filters.presence.max);
    params.sortBy = sortBy;
    params.fields = selectedFields.join(',');
    params.page = String(currentPage);
    params.expenseCategory = expenseCategory || 'Todas';
    params.expenseYear = expenseYear || 'mandato';
    params.proposalType = proposalType || 'PL+PLP+PEC';
    return params;
}

function deserializeDeputadosParams(searchParams) {
    const getBool = (key, def) => {
        const val = searchParams.get(key);
        if (val === null) return def;
        return val === 'true';
    };
    
    const getNum = (key, def) => {
        const val = searchParams.get(key);
        if (val === null) return def;
        const num = Number(val);
        return isNaN(num) ? def : num;
    };
    
    const getStr = (key, def) => {
        const val = searchParams.get(key);
        return val !== null ? val : def;
    };
    
    const filters = {
        onlyActive: getBool('onlyActive', DEFAULT_DEPUTADOS_FILTERS.onlyActive),
        presence: {
            min: getNum('presence_min', DEFAULT_DEPUTADOS_FILTERS.presence.min),
            max: getNum('presence_max', DEFAULT_DEPUTADOS_FILTERS.presence.max)
        }
    };
    
    const sortBy = getStr('sortBy', 'nome_asc');
    
    const fieldsStr = searchParams.get('fields');
    const selectedFields = fieldsStr ? fieldsStr.split(',') : [...DEFAULT_DEPUTADOS_FIELDS];
    
    const currentPage = getNum('page', 1);
    
    const expenseCategory = getStr('expenseCategory', 'Todas');
    const expenseYear = getStr('expenseYear', 'mandato');
    const proposalType = getStr('proposalType', 'PL+PLP+PEC');
    
    return {
        filters,
        sortBy,
        selectedFields,
        currentPage,
        expenseCategory,
        expenseYear,
        proposalType
    };
}

export default function Deputados({ theme, toggleTheme }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialParams = useMemo(() => deserializeDeputadosParams(searchParams), [searchParams]);

    const [allDeputies, setAllDeputies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pinnedDeputies, setPinnedDeputies] = useState(() => loadPinnedFromStorage());
    const [profileDeputy, setProfileDeputy] = useState(null);
    useDocumentTitle(profileDeputy?.nome ? profileDeputy.nome : 'Lista');
    const isMobile = useIsMobile();
    const [currentPage, setCurrentPage] = useState(() => initialParams.currentPage);
    const [openPanel, setOpenPanel] = useState(null);
    
    // Adjust panel state dynamically for mobile/desktop viewports
    useEffect(() => {
        if (!isMobile) {
            setOpenPanel('filtros');
        } else {
            setOpenPanel(null);
        }
    }, [isMobile]);
    const [highlightedDeputyId, setHighlightedDeputyId] = useState(null);
    const [hoveredRowId, setHoveredRowId] = useState(null);
    const [speechTotals, setSpeechTotals] = useState({});
    const [proposalTotals, setProposalTotals] = useState({});
    const [expenseTotals, setExpenseTotals] = useState({});
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [selectedExpenseCategory, setSelectedExpenseCategory] = useState(() => initialParams.expenseCategory);
    const [selectedExpenseYear, setSelectedExpenseYear] = useState(() => initialParams.expenseYear);
    const [selectedProposalType, setSelectedProposalType] = useState(() => initialParams.proposalType);
    const [dynamicFieldTotals, setDynamicFieldTotals] = useState({});

    // Filters
    const [filters, setFilters] = useState(() => initialParams.filters);

    // Sort
    const [sortBy, setSortBy] = useState(() => initialParams.sortBy);

    // Fields (columns)
    const [selectedFields, setSelectedFields] = useState(() => initialParams.selectedFields);

    const searchParamsString = searchParams.toString();

    // 1. Sync URL -> States on mount or when URL changes
    useEffect(() => {
        const params = deserializeDeputadosParams(searchParams);
        
        setFilters(prev => {
            if (prev.onlyActive === params.filters.onlyActive &&
                prev.presence.min === params.filters.presence.min &&
                prev.presence.max === params.filters.presence.max) {
                return prev;
            }
            return params.filters;
        });
        
        setSortBy(prev => prev === params.sortBy ? prev : params.sortBy);
        
        setSelectedFields(prev => {
            if (prev.length === params.selectedFields.length &&
                prev.every((f, i) => f === params.selectedFields[i])) {
                return prev;
            }
            return params.selectedFields;
        });
        
        setCurrentPage(prev => prev === params.currentPage ? prev : params.currentPage);
        setSelectedExpenseCategory(prev => prev === params.expenseCategory ? prev : params.expenseCategory);
        setSelectedExpenseYear(prev => prev === params.expenseYear ? prev : params.expenseYear);
        setSelectedProposalType(prev => prev === params.proposalType ? prev : params.proposalType);
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParamsString]);

    // 2. Sync States -> URL when states change
    useEffect(() => {
        const nextParams = serializeDeputadosParams({
            filters,
            sortBy,
            selectedFields,
            currentPage,
            expenseCategory: selectedExpenseCategory,
            expenseYear: selectedExpenseYear,
            proposalType: selectedProposalType
        });
        
        let changed = false;
        for (const key of Object.keys(nextParams)) {
            if (searchParams.get(key) !== nextParams[key]) {
                changed = true;
                break;
            }
        }
        
        if (changed) {
            setSearchParams(nextParams, { replace: true });
        }
    }, [filters, sortBy, selectedFields, currentPage, selectedExpenseCategory, selectedExpenseYear, selectedProposalType, setSearchParams, searchParams]);

    // Persist pinned list
    useEffect(() => {
        savePinnedToStorage(pinnedDeputies);
    }, [pinnedDeputies]);

    // Fetch deputies from API
    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                const res = await fetch('/api/deputados/');
                const data = await res.json();
                if (isMounted) {
                    setAllDeputies(data);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Erro ao carregar deputados:', error);
                if (isMounted) setLoading(false);
            }
        }
        load();
        return () => { isMounted = false; };
    }, []);

    // Fetch expense categories on mount
    useEffect(() => {
        let isMounted = true;
        async function fetchCategories() {
            try {
                const res = await fetch('/api/despesas-categorias/');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setExpenseCategories(data);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar categorias de despesas:", err);
            }
        }
        fetchCategories();
        return () => { isMounted = false; };
    }, []);

    // Fetch discursos aggregates from API
    useEffect(() => {
        let isMounted = true;
        async function loadSpeeches() {
            try {
                const res = await fetch('/api/deputados-discursos-totais/');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setSpeechTotals(data);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar discursos totais para a lista:", err);
            }
        }
        loadSpeeches();
        return () => { isMounted = false; };
    }, []);

    // Fetch despesas aggregates from API (reacts to category and year)
    useEffect(() => {
        let isMounted = true;
        const query = new URLSearchParams({
            categoria: selectedExpenseCategory,
            ano: selectedExpenseYear
        });
        async function loadExpenses() {
            try {
                const res = await fetch(`/api/deputados-despesas-totais/?${query.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setExpenseTotals(data);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar despesas totais para a lista:", err);
            }
        }
        loadExpenses();
        return () => { isMounted = false; };
    }, [selectedExpenseCategory, selectedExpenseYear]);

    // Fetch proposicoes aggregates from API (reacts to proposal type)
    useEffect(() => {
        let isMounted = true;
        const query = new URLSearchParams({
            tipo: selectedProposalType
        });
        async function loadProposals() {
            try {
                const res = await fetch(`/api/deputados-proposicoes-totais/?${query.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        setProposalTotals(data);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar proposições totais para a lista:", err);
            }
        }
        loadProposals();
        return () => { isMounted = false; };
    }, [selectedProposalType]);

    // Fetch dynamic totals on demand for custom hovered submenu columns
    useEffect(() => {
        let isMounted = true;
        
        selectedFields.forEach((field) => {
            if (dynamicFieldTotals[field]) return; // already loaded

            if (field.startsWith('despesas__')) {
                const category = field.replace('despesas__', '');
                const query = new URLSearchParams({ categoria: category });
                
                fetch(`/api/deputados-despesas-totais/?${query.toString()}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data && isMounted) {
                            setDynamicFieldTotals(prev => ({ ...prev, [field]: data }));
                        }
                    })
                    .catch(err => console.error(`Erro ao carregar despesas para campo ${field}:`, err));
            } else if (field.startsWith('proposicoes__')) {
                const type = field.replace('proposicoes__', '');
                const query = new URLSearchParams({ tipo: type });
                
                fetch(`/api/deputados-proposicoes-totais/?${query.toString()}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data && isMounted) {
                            setDynamicFieldTotals(prev => ({ ...prev, [field]: data }));
                        }
                    })
                    .catch(err => console.error(`Erro ao carregar proposições para campo ${field}:`, err));
            }
        });

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFields]);

    // Apply filters
    const filteredDeputies = useMemo(() => {
        let list = [...allDeputies];

        if (filters.onlyActive) {
            list = list.filter((d) => !d.situacao || d.situacao === 'Exercício');
        }

        list = list.filter((d) => {
            if (d.presenca === undefined || d.presenca === null) return true;
            return d.presenca >= filters.presence.min && d.presenca <= filters.presence.max;
        });

        return list;
    }, [allDeputies, filters]);

    // Apply sort
    const sortedDeputies = useMemo(() => {
        const list = [...filteredDeputies];
        const [field, dir] = sortBy.split('_');
        const asc = dir === 'asc';

        list.sort((a, b) => {
            let va, vb;
            switch (field) {
                case 'nome':
                    va = (a.nome || '').toLowerCase();
                    vb = (b.nome || '').toLowerCase();
                    return asc ? va.localeCompare(vb) : vb.localeCompare(va);
                case 'partido':
                    va = (a.sigla_partido || '').toLowerCase();
                    vb = (b.sigla_partido || '').toLowerCase();
                    return asc ? va.localeCompare(vb) : vb.localeCompare(va);
                case 'estado':
                    va = (a.sigla_uf || '').toLowerCase();
                    vb = (b.sigla_uf || '').toLowerCase();
                    return asc ? va.localeCompare(vb) : vb.localeCompare(va);
                case 'presenca':
                    va = a.presenca ?? -1;
                    vb = b.presenca ?? -1;
                    return asc ? va - vb : vb - va;
                case 'despesas':
                    va = expenseTotals[a.id] || 0;
                    vb = expenseTotals[b.id] || 0;
                    return asc ? va - vb : vb - va;
                case 'discursos':
                    va = speechTotals[a.id] || 0;
                    vb = speechTotals[b.id] || 0;
                    return asc ? va - vb : vb - va;
                case 'proposicoes':
                    va = proposalTotals[a.id] || 0;
                    vb = proposalTotals[b.id] || 0;
                    return asc ? va - vb : vb - va;
                default:
                    return 0;
            }
        });

        return list;
    }, [filteredDeputies, sortBy, expenseTotals, speechTotals, proposalTotals]);

    // Map of deputy ID to their current sorted rank index (1-based)
    const deputyRankings = useMemo(() => {
        const ranks = {};
        sortedDeputies.forEach((d, idx) => {
            ranks[d.id] = idx + 1;
        });
        return ranks;
    }, [sortedDeputies]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(sortedDeputies.length / PAGE_SIZE));
    const paginatedDeputies = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return sortedDeputies.slice(start, start + PAGE_SIZE);
    }, [sortedDeputies, currentPage]);

    // Reset to page 1 when filters/sort change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortBy]);

    // Handlers
    const handleApplyFilters = useCallback((newFilters) => {
        setFilters(newFilters);
    }, []);

    const handleTogglePanel = useCallback((panelId) => {
        setOpenPanel((prev) => (prev === panelId ? null : panelId));
    }, []);

    const handleTogglePin = useCallback((deputy) => {
        const depId = deputy.id;
        setPinnedDeputies((prev) => {
            const exists = prev.some((p) => p.id === depId);
            if (exists) {
                return prev.filter((p) => p.id !== depId);
            } else {
                return [...prev, {
                    id: depId,
                    nome: deputy.nome,
                    sigla_partido: deputy.sigla_partido || deputy.partido,
                }];
            }
        });
    }, []);

    const handleRemovePinned = useCallback((depId) => {
        setPinnedDeputies((prev) => prev.filter((p) => p.id !== depId));
    }, []);



    const handleOpenProfile = useCallback((deputy) => {
        const color = PARTY_COLORS[deputy.sigla_partido] || COLORS.textMedium;
        setProfileDeputy({ ...deputy, nodeColor: color });
    }, []);

    const handleCloseProfile = useCallback(() => {
        setProfileDeputy(null);
    }, []);

    const handleSearchSelectProfile = useCallback((dep) => {
        const color = PARTY_COLORS[dep.sigla_partido] || COLORS.textMedium;
        setProfileDeputy({ ...dep, nodeColor: color });
    }, []);

    const handleSearchSelectDeputyList = useCallback((dep) => {
        const index = sortedDeputies.findIndex((d) => d.id === dep.id);
        
        if (index === -1) {
            // Deputy is filtered out, open their profile modal directly!
            const color = PARTY_COLORS[dep.sigla_partido] || COLORS.textMedium;
            setProfileDeputy({ ...dep, nodeColor: color });
        } else {
            // Deputy is present in the list, go to them and highlight
            const page = Math.floor(index / PAGE_SIZE) + 1;
            setCurrentPage(page);
            setHighlightedDeputyId(dep.id);
        }
    }, [sortedDeputies]);

    // Scroll to highlighted deputy when it is set/changes
    useEffect(() => {
        if (highlightedDeputyId) {
            const rowElement = document.getElementById(`deputy-row-${highlightedDeputyId}`);
            if (rowElement) {
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedDeputyId, currentPage]);

    const pinnedIds = pinnedDeputies.map((p) => p.id);

    // Layout
    const pageStyle = {
        width: '100vw',
        height: '100vh',
        backgroundColor: COLORS.backgroundLight,
        position: 'relative',
        overflow: 'hidden',
    };

    const topOffset = `calc(52px + ${SPACING.frameGap} + ${SPACING.frameGap})`;
    const panelWidth = '250px';

    // Table container — fills the space below TopBar, to the left of panels
    const tableContainerStyle = {
        position: 'absolute',
        top: isMobile ? '60px' : topOffset,
        left: isMobile ? '8px' : SPACING.frameGap,
        right: isMobile ? '8px' : `calc(${panelWidth} + ${SPACING.frameGap} + ${SPACING.frameGap})`,
        bottom: isMobile ? '12px' : SPACING.frameGap,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    };

    const tableWrapperStyle = {
        flex: 1,
        overflow: 'auto',
        backgroundColor: COLORS.white,
        borderRadius: SPACING.radiusLg,
        boxShadow: SHADOWS.frame,
    };

    // Table styles
    const tableStyle = {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        fontFamily: FONTS.family,
        fontSize: FONTS.sizeSm,
    };

    const thStyle = {
        position: 'sticky',
        top: 0,
        backgroundColor: COLORS.backgroundAlt,
        padding: `${SPACING.md} ${SPACING.lg}`,
        textAlign: 'left',
        fontWeight: FONTS.weightSemibold,
        color: COLORS.textDark,
        fontSize: FONTS.sizeSm,
        borderBottom: `2px solid ${COLORS.borderLight}`,
        whiteSpace: 'nowrap',
        zIndex: 2,
    };

    const getTdStyle = (rowIdx, isPinned, isHighlighted, isHovered) => {
        let bgColor = rowIdx % 2 === 0 ? COLORS.white : COLORS.backgroundAlt;
        if (isPinned) {
            bgColor = 'rgba(232, 133, 12, 0.08)'; // Light orange
        }
        if (isHighlighted) {
            bgColor = 'rgba(232, 133, 12, 0.35)'; // Strong orange
        }
        if (isHovered) {
            bgColor = COLORS.backgroundHover; // Dynamic hover color
        }
        const hasFoto = selectedFields.includes('foto');
        return {
            padding: hasFoto ? `6px ${SPACING.lg}` : `${SPACING.sm} ${SPACING.lg}`,
            color: COLORS.textDark,
            borderBottom: `1px solid ${COLORS.borderLight}`,
            backgroundColor: bgColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '200px',
            verticalAlign: 'middle',
            transition: 'background-color 0.15s ease',
        };
    };

    const trHoverStyle = {
        cursor: 'pointer',
        transition: 'background-color 0.12s',
    };

    // Render cell value
    const renderCell = (dep, field) => {
        if (field === 'despesas') {
            const total = expenseTotals[dep.id] || 0;
            return `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (field === 'discursos') {
            return String(speechTotals[dep.id] || 0);
        }
        if (field === 'proposicoes') {
            return String(proposalTotals[dep.id] || 0);
        }
        if (field.startsWith('despesas__')) {
            const totals = dynamicFieldTotals[field] || {};
            const total = totals[dep.id] || 0;
            return `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (field.startsWith('proposicoes__')) {
            const totals = dynamicFieldTotals[field] || {};
            return String(totals[dep.id] || 0);
        }

        const val = dep[field];
        if (val === null || val === undefined) return '—';

        switch (field) {
            case 'nome':
                return (
                    <span style={{ fontWeight: FONTS.weightSemibold }}>
                        {val}
                    </span>
                );
            case 'sigla_partido': {
                const color = PARTY_COLORS[val] || COLORS.textMedium;
                return (
                    <span style={{
                        backgroundColor: color,
                        color: COLORS.partyBadgeText,
                        padding: `1px ${SPACING.sm}`,
                        borderRadius: SPACING.radiusSm,
                        fontSize: FONTS.sizeXs,
                        fontWeight: FONTS.weightSemibold,
                    }}>
                        {val}
                    </span>
                );
            }
            case 'presenca':
                return val !== null && val !== undefined ? `${Number(val).toFixed(1)}%` : '—';
            case 'data_nascimento':
                if (!val) return '—';
                try {
                    return new Date(val).toLocaleDateString('pt-BR');
                } catch {
                    return val;
                }
            case 'sexo':
                return val === 'M' ? 'Masculino' : val === 'F' ? 'Feminino' : val;
            default:
                return String(val);
        }
    };

    // Pagination bar
    const paginationStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'space-between',
        padding: `${SPACING.md} 0`,
        flexShrink: 0,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        gap: isMobile ? SPACING.sm : 0,
    };

    const paginationInfoStyle = {
        fontSize: FONTS.sizeSm,
        color: COLORS.textMedium,
        fontFamily: FONTS.family,
        whiteSpace: 'nowrap',
        textAlign: isMobile ? 'center' : 'left',
        width: isMobile ? '100%' : 'auto',
    };

    const paginationButtonsStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '4px' : SPACING.sm,
        justifyContent: 'center',
    };

    const pageButtonStyle = (isActive) => ({
        minWidth: isMobile ? '28px' : '32px',
        height: isMobile ? '28px' : '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${isActive ? COLORS.orange : COLORS.borderMedium}`,
        borderRadius: SPACING.radiusMd,
        backgroundColor: isActive ? COLORS.orange : COLORS.white,
        color: isActive ? COLORS.textWhite : COLORS.textDark,
        fontSize: isMobile ? '11px' : FONTS.sizeSm,
        fontFamily: FONTS.family,
        fontWeight: isActive ? FONTS.weightSemibold : FONTS.weightNormal,
        cursor: 'pointer',
        transition: 'all 0.15s',
    });

    // Build visible pagination pages (show at most 7 buttons)
    const getPageNumbers = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages = [];
        if (currentPage <= 4) {
            for (let i = 1; i <= 5; i++) pages.push(i);
            pages.push('...');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
            pages.push(1);
            pages.push('...');
            for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            pages.push('...');
            for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
            pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    // Pin button in table
    const pinButtonStyle = (isPinned) => ({
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: SPACING.xs,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isPinned ? COLORS.orange : COLORS.textLight,
        borderRadius: SPACING.radiusSm,
        transition: 'color 0.15s, background-color 0.15s',
    });

    return (
        <div style={pageStyle}>
            {/* TopBar */}
            <TopBar
                deputyList={allDeputies}
                onSelectDeputy={handleSearchSelectDeputyList}
                onSelectProfile={handleSearchSelectProfile}
                activePage="lista"
                theme={theme}
                toggleTheme={toggleTheme}
            />

            {/* Table area */}
            <div style={tableContainerStyle}>
                {loading ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: COLORS.textMedium,
                        fontSize: FONTS.sizeLg,
                        fontFamily: FONTS.family,
                    }}>
                        Carregando deputados...
                    </div>
                ) : (
                    <>
                        {isMobile && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: SPACING.sm,
                                flexShrink: 0,
                                width: '100%',
                            }}>
                                <span style={{
                                    fontSize: '12px',
                                    color: COLORS.textMedium,
                                    fontFamily: FONTS.family,
                                }}>
                                    {sortedDeputies.length} deputados
                                </span>
                                <div style={{ display: 'flex', gap: SPACING.sm }}>
                                    <button
                                        onClick={() => handleTogglePanel('ordenar')}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            backgroundColor: openPanel === 'ordenar' ? COLORS.orange : COLORS.white,
                                            color: openPanel === 'ordenar' ? COLORS.textWhite : COLORS.textDark,
                                            border: `1px solid ${openPanel === 'ordenar' ? COLORS.orange : COLORS.borderMedium}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                        }}
                                        title="Ordenar"
                                    >
                                        <ArrowUpDown size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleTogglePanel('filtros')}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            backgroundColor: openPanel === 'filtros' ? COLORS.orange : COLORS.white,
                                            color: openPanel === 'filtros' ? COLORS.textWhite : COLORS.textDark,
                                            border: `1px solid ${openPanel === 'filtros' ? COLORS.orange : COLORS.borderMedium}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                        }}
                                        title="Filtros"
                                    >
                                        <Filter size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleTogglePanel('campos')}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            backgroundColor: openPanel === 'campos' ? COLORS.orange : COLORS.white,
                                            color: openPanel === 'campos' ? COLORS.textWhite : COLORS.textDark,
                                            border: `1px solid ${openPanel === 'campos' ? COLORS.orange : COLORS.borderMedium}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                        }}
                                        title="Campos"
                                    >
                                        <Columns size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleTogglePanel('fixados')}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            backgroundColor: openPanel === 'fixados' ? COLORS.orange : COLORS.white,
                                            color: openPanel === 'fixados' ? COLORS.textWhite : COLORS.textDark,
                                            border: `1px solid ${openPanel === 'fixados' ? COLORS.orange : COLORS.borderMedium}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                                            position: 'relative',
                                        }}
                                        title="Fixados"
                                    >
                                        <Pin size={16} />
                                        {pinnedDeputies.length > 0 && (
                                            <span style={{
                                                position: 'absolute',
                                                bottom: '-4px',
                                                right: '-4px',
                                                backgroundColor: COLORS.orange,
                                                color: COLORS.textWhite,
                                                borderRadius: '50%',
                                                minWidth: '14px',
                                                height: '14px',
                                                fontSize: '9px',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 2px',
                                                border: `1.5px solid ${COLORS.white}`,
                                            }}>
                                                {pinnedDeputies.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Table */}
                        <div style={tableWrapperStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={{ ...thStyle, textAlign: 'center', width: '44px' }}>#</th>
                                        {selectedFields.includes('foto') && (
                                            <th style={{ ...thStyle, textAlign: 'center', width: '76px' }}>Foto</th>
                                        )}
                                        {selectedFields.filter(f => f !== 'foto').map((field) => {
                                            let label = FIELD_LABELS[field];
                                            if (!label) {
                                                if (field.startsWith('despesas__')) {
                                                    const cat = field.replace('despesas__', '');
                                                    label = `Despesas (${cat})`;
                                                } else if (field.startsWith('proposicoes__')) {
                                                    const type = field.replace('proposicoes__', '');
                                                    label = `Proposições (${type})`;
                                                } else {
                                                    label = field;
                                                }
                                            }
                                            return (
                                                <th key={field} style={thStyle}>
                                                    {label}
                                                </th>
                                            );
                                        })}
                                        <th style={{ ...thStyle, textAlign: 'center', width: '50px' }}>
                                            <Pin size={14} color={COLORS.textMedium} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedDeputies.map((dep, idx) => {
                                        const isPinned = pinnedIds.includes(dep.id);
                                        const isHighlighted = highlightedDeputyId === dep.id;
                                        const isHovered = hoveredRowId === dep.id;
                                        const globalIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
                                        return (
                                            <tr
                                                key={dep.id}
                                                id={`deputy-row-${dep.id}`}
                                                style={trHoverStyle}
                                                onClick={() => handleOpenProfile(dep)}
                                                onMouseEnter={() => {
                                                    setHoveredRowId(dep.id);
                                                    if (highlightedDeputyId === dep.id) {
                                                        setHighlightedDeputyId(null);
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredRowId(null);
                                                }}
                                            >
                                                <td style={{ ...getTdStyle(idx, isPinned, isHighlighted, isHovered), textAlign: 'center', width: '44px', color: COLORS.textLight, fontSize: FONTS.sizeXs }}>
                                                    {globalIndex}
                                                </td>
                                                {selectedFields.includes('foto') && (
                                                    <td style={{ ...getTdStyle(idx, isPinned, isHighlighted, isHovered), textAlign: 'center', width: '76px' }}>
                                                        <div style={{
                                                            width: '48px',
                                                            height: '48px',
                                                            borderRadius: '50%',
                                                            border: `2px solid ${PARTY_COLORS[dep.sigla_partido] || COLORS.deputyHeaderGreen}`,
                                                            backgroundColor: COLORS.borderLight,
                                                            overflow: 'hidden',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            margin: '0 auto',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                                        }}>
                                                            {dep.url_foto || dep.urlFoto ? (
                                                                <img
                                                                    src={dep.url_foto || dep.urlFoto}
                                                                    alt={dep.nome}
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        objectFit: 'cover',
                                                                        objectPosition: 'top',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span style={{ fontSize: '11px', color: COLORS.textLight }}>Foto</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                                {selectedFields.filter(f => f !== 'foto').map((field) => (
                                                    <td key={field} style={getTdStyle(idx, isPinned, isHighlighted, isHovered)}>
                                                        {renderCell(dep, field)}
                                                    </td>
                                                ))}
                                                <td style={{ ...getTdStyle(idx, isPinned, isHighlighted, isHovered), textAlign: 'center', width: '50px' }}>
                                                    <button
                                                        style={pinButtonStyle(isPinned)}
                                                        title={isPinned ? 'Desfixar' : 'Fixar'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleTogglePin(dep);
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'rgba(232,133,12,0.1)';
                                                            e.currentTarget.style.color = COLORS.orange;
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                            e.currentTarget.style.color = isPinned ? COLORS.orange : COLORS.textLight;
                                                        }}
                                                    >
                                                        {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer: page info + pagination + count */}
                        <div style={paginationStyle}>
                            {!isMobile && (
                                <span style={paginationInfoStyle}>
                                    {totalPages > 1 ? `Página ${currentPage} de ${totalPages}` : ''}
                                </span>
                            )}

                            {totalPages > 1 && (
                                <div style={paginationButtonsStyle}>
                                    <button
                                        style={pageButtonStyle(false)}
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = COLORS.orange}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = COLORS.borderMedium}
                                    >
                                        ‹
                                    </button>
                                    {getPageNumbers().map((page, i) => (
                                        page === '...' ? (
                                            <span key={`ellipsis-${i}`} style={{
                                                padding: `0 ${SPACING.xs}`,
                                                color: COLORS.textLight,
                                                fontSize: FONTS.sizeSm,
                                            }}>
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={page}
                                                style={pageButtonStyle(page === currentPage)}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}
                                    <button
                                        style={pageButtonStyle(false)}
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = COLORS.orange}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = COLORS.borderMedium}
                                    >
                                        ›
                                    </button>
                                </div>
                            )}

                            {!isMobile && (
                                <span style={paginationInfoStyle}>
                                    {sortedDeputies.length} deputados encontrados
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Right panels */}
            {!isMobile && (
                <div style={{
                    position: 'absolute',
                    top: topOffset,
                    right: SPACING.frameGap,
                    bottom: SPACING.frameGap,
                    width: panelWidth,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: SPACING.frameGap,
                    pointerEvents: 'none',
                    zIndex: 10,
                }}>
                    <div style={{ pointerEvents: 'auto' }}>
                        <RankingPanel
                            sortBy={sortBy}
                            onSortChange={(e) => setSortBy(e.target.value)}
                            expenseCategories={expenseCategories}
                            selectedExpenseCategory={selectedExpenseCategory}
                            onExpenseCategoryChange={setSelectedExpenseCategory}
                            selectedExpenseYear={selectedExpenseYear}
                            onExpenseYearChange={setSelectedExpenseYear}
                            selectedProposalType={selectedProposalType}
                            onProposalTypeChange={setSelectedProposalType}
                        />
                    </div>

                    <div style={{ pointerEvents: 'auto', flex: openPanel === 'filtros' ? '0 1 auto' : '0 0 auto', minHeight: 0 }}>
                        <ListFiltersPanel
                            filters={filters}
                            onApply={handleApplyFilters}
                            isMinimized={openPanel !== 'filtros'}
                            onToggleMinimize={() => handleTogglePanel('filtros')}
                        />
                    </div>

                    <div style={{ pointerEvents: 'auto', flex: openPanel === 'campos' ? '0 1 auto' : '0 0 auto', minHeight: 0, position: 'relative', zIndex: 20 }}>
                        <FieldsPanel
                            selectedFields={selectedFields}
                            onFieldsChange={setSelectedFields}
                            isMinimized={openPanel !== 'campos'}
                            onToggleMinimize={() => handleTogglePanel('campos')}
                        />
                    </div>

                    <div style={{ pointerEvents: 'auto', flex: openPanel === 'fixados' ? '0 1 auto' : '0 0 auto', minHeight: 0 }}>
                        <PinnedPanel
                            pinnedDeputies={pinnedDeputies}
                            onRemove={handleRemovePinned}
                            onSelect={handleSearchSelectDeputyList}
                            isMinimized={openPanel !== 'fixados'}
                            onToggleMinimize={() => handleTogglePanel('fixados')}
                            deputyRankings={deputyRankings}
                        />
                    </div>
                </div>
            )}

            {/* Mobile Drawers & Bottom Bar */}
            {isMobile && (
                <>
                    {/* Bottom Drawer Overlay */}
                    {openPanel && (
                        <>
                            {/* Backdrop */}
                            <div
                                onClick={() => setOpenPanel(null)}
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    zIndex: 101,
                                }}
                            />
                            {/* Drawer Content */}
                            <div style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                maxHeight: '80vh',
                                backgroundColor: COLORS.frameBg,
                                borderRadius: '16px 16px 0 0',
                                boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                                zIndex: 102,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                paddingBottom: '24px',
                            }}>
                                {/* Drawer Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: `${SPACING.md} ${SPACING.lg}`,
                                    borderBottom: `1px solid ${COLORS.borderLight}`,
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: COLORS.frameBg,
                                    zIndex: 5,
                                }}>
                                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: COLORS.textDark }}>
                                        {openPanel === 'ordenar' ? 'Ordenar Lista' : openPanel === 'filtros' ? 'Filtros da Lista' : openPanel === 'campos' ? 'Selecionar Campos' : 'Fixados'}
                                    </span>
                                </div>

                                {/* Drawer Body */}
                                <div style={{ padding: SPACING.md }}>
                                    {openPanel === 'ordenar' && (
                                        <RankingPanel
                                            sortBy={sortBy}
                                            onSortChange={(e) => setSortBy(e.target.value)}
                                            expenseCategories={expenseCategories}
                                            selectedExpenseCategory={selectedExpenseCategory}
                                            onExpenseCategoryChange={setSelectedExpenseCategory}
                                            selectedExpenseYear={selectedExpenseYear}
                                            onExpenseYearChange={setSelectedExpenseYear}
                                            selectedProposalType={selectedProposalType}
                                            onProposalTypeChange={setSelectedProposalType}
                                            isMinimized={false}
                                            width="100%"
                                        />
                                    )}

                                    {openPanel === 'filtros' && (
                                        <ListFiltersPanel
                                            filters={filters}
                                            onApply={(newFilters) => {
                                                handleApplyFilters(newFilters);
                                                setOpenPanel(null); // Close drawer on apply
                                            }}
                                            isMinimized={false}
                                            width="100%"
                                        />
                                    )}

                                    {openPanel === 'campos' && (
                                        <FieldsPanel
                                            selectedFields={selectedFields}
                                            onFieldsChange={setSelectedFields}
                                            isMinimized={false}
                                            width="100%"
                                        />
                                    )}

                                    {openPanel === 'fixados' && (
                                        <PinnedPanel
                                            pinnedDeputies={pinnedDeputies}
                                            onRemove={handleRemovePinned}
                                            onSelect={(dep) => {
                                                handleSearchSelectDeputyList(dep);
                                                setOpenPanel(null); // Close drawer on select
                                            }}
                                            isMinimized={false}
                                            width="100%"
                                            deputyRankings={deputyRankings}
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* No Bottom Nav Bar */}
                </>
            )}

            {/* Deputy Profile modal */}
            <DeputyProfile
                deputy={profileDeputy}
                visible={!!profileDeputy}
                onClose={handleCloseProfile}
            />
        </div>
    );
}
