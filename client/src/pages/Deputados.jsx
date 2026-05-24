import { useState, useCallback, useEffect, useMemo } from 'react';
import TopBar from '../components/layout/TopBar';
import RankingPanel from '../components/RankingPanel';
import ListFiltersPanel from '../components/ListFiltersPanel';
import FieldsPanel, { ALL_FIELD_OPTIONS } from '../components/FieldsPanel';
import PinnedPanel from '../components/PinnedPanel';
import DeputyProfile from '../components/DeputyProfile';
import { COLORS, SPACING, FONTS, SHADOWS, PARTY_COLORS } from '../constants/theme';
import { Pin, PinOff } from 'lucide-react';

const PINNED_STORAGE_KEY = 'prisma_politico_pinned';
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
export default function Deputados() {
    const [allDeputies, setAllDeputies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pinnedDeputies, setPinnedDeputies] = useState(() => loadPinnedFromStorage());
    const [profileDeputy, setProfileDeputy] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [openPanel, setOpenPanel] = useState('filtros');

    // Filters
    const [filters, setFilters] = useState({
        onlyActive: true,
        presence: { min: 0, max: 100 },
    });

    // Sort
    const [sortBy, setSortBy] = useState('nome_asc');

    // Fields (columns)
    const [selectedFields, setSelectedFields] = useState([
        'nome', 'sigla_partido', 'sigla_uf', 'presenca', 'situacao',
    ]);

    // Persist pinned list
    useEffect(() => {
        savePinnedToStorage(pinnedDeputies);
    }, [pinnedDeputies]);

    // Fetch deputies from API
    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                const res = await fetch('http://localhost:8000/api/deputados/');
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
                default:
                    return 0;
            }
        });

        return list;
    }, [filteredDeputies, sortBy]);

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

    const handleSelectPinned = useCallback((pinnedDep) => {
        const fullDep = allDeputies.find((d) => d.id === pinnedDep.id);
        setProfileDeputy(fullDep || pinnedDep);
    }, [allDeputies]);

    const handleOpenProfile = useCallback((deputy) => {
        const color = PARTY_COLORS[deputy.sigla_partido] || COLORS.textMedium;
        setProfileDeputy({ ...deputy, nodeColor: color });
    }, []);

    const handleCloseProfile = useCallback(() => {
        setProfileDeputy(null);
    }, []);

    const handleSearchSelectDeputy = useCallback((dep) => {
        const color = PARTY_COLORS[dep.sigla_partido] || COLORS.textMedium;
        setProfileDeputy({ ...dep, nodeColor: color });
    }, []);

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
        top: topOffset,
        left: SPACING.frameGap,
        right: `calc(${panelWidth} + ${SPACING.frameGap} + ${SPACING.frameGap})`,
        bottom: SPACING.frameGap,
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
        backgroundColor: '#fafafa',
        padding: `${SPACING.md} ${SPACING.lg}`,
        textAlign: 'left',
        fontWeight: FONTS.weightSemibold,
        color: COLORS.textDark,
        fontSize: FONTS.sizeSm,
        borderBottom: `2px solid ${COLORS.borderLight}`,
        whiteSpace: 'nowrap',
        zIndex: 2,
    };

    const getTdStyle = (rowIdx) => ({
        padding: `${SPACING.sm} ${SPACING.lg}`,
        color: COLORS.textDark,
        borderBottom: `1px solid ${COLORS.borderLight}`,
        backgroundColor: rowIdx % 2 === 0 ? COLORS.white : '#fafafa',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '200px',
    });

    const trHoverStyle = {
        cursor: 'pointer',
        transition: 'background-color 0.12s',
    };

    // Render cell value
    const renderCell = (dep, field) => {
        const val = dep[field];
        if (val === null || val === undefined) return '—';

        switch (field) {
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
        justifyContent: 'space-between',
        padding: `${SPACING.md} 0`,
        flexShrink: 0,
    };

    const paginationInfoStyle = {
        fontSize: FONTS.sizeSm,
        color: COLORS.textMedium,
        fontFamily: FONTS.family,
        whiteSpace: 'nowrap',
    };

    const paginationButtonsStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
    };

    const pageButtonStyle = (isActive) => ({
        minWidth: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${isActive ? COLORS.orange : COLORS.borderMedium}`,
        borderRadius: SPACING.radiusMd,
        backgroundColor: isActive ? COLORS.orange : COLORS.white,
        color: isActive ? COLORS.textWhite : COLORS.textDark,
        fontSize: FONTS.sizeSm,
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
                onSelectDeputy={handleSearchSelectDeputy}
                onSelectProfile={handleSearchSelectDeputy}
                activePage="lista"
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
                        {/* Table */}
                        <div style={tableWrapperStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={{ ...thStyle, textAlign: 'center', width: '44px' }}>#</th>
                                        {selectedFields.map((field) => (
                                            <th key={field} style={thStyle}>
                                                {FIELD_LABELS[field] || field}
                                            </th>
                                        ))}
                                        <th style={{ ...thStyle, textAlign: 'center', width: '50px' }}>
                                            <Pin size={14} color={COLORS.textMedium} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedDeputies.map((dep, idx) => {
                                        const isPinned = pinnedIds.includes(dep.id);
                                        const globalIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
                                        return (
                                            <tr
                                                key={dep.id}
                                                style={trHoverStyle}
                                                onClick={() => handleOpenProfile(dep)}
                                                onMouseEnter={(e) => {
                                                    const cells = e.currentTarget.querySelectorAll('td');
                                                    cells.forEach((c) => c.style.backgroundColor = '#eef4ff');
                                                }}
                                                onMouseLeave={(e) => {
                                                    const cells = e.currentTarget.querySelectorAll('td');
                                                    const bg = idx % 2 === 0 ? COLORS.white : '#fafafa';
                                                    cells.forEach((c) => c.style.backgroundColor = bg);
                                                }}
                                            >
                                                <td style={{ ...getTdStyle(idx), textAlign: 'center', width: '44px', color: COLORS.textLight, fontSize: FONTS.sizeXs }}>
                                                    {globalIndex}
                                                </td>
                                                {selectedFields.map((field) => (
                                                    <td key={field} style={getTdStyle(idx)}>
                                                        {renderCell(dep, field)}
                                                    </td>
                                                ))}
                                                <td style={{ ...getTdStyle(idx), textAlign: 'center', width: '50px' }}>
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
                            <span style={paginationInfoStyle}>
                                {totalPages > 1 ? `Página ${currentPage} de ${totalPages}` : ''}
                            </span>

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

                            <span style={paginationInfoStyle}>
                                {sortedDeputies.length} deputados encontrados
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Right panels */}
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
                    />
                </div>

                <div style={{ pointerEvents: 'auto', flex: openPanel === 'filtros' ? '0 1 auto' : '0 0 auto', minHeight: 0 }}>
                    <ListFiltersPanel
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
                        onSelect={handleSelectPinned}
                        isMinimized={openPanel !== 'fixados'}
                        onToggleMinimize={() => handleTogglePanel('fixados')}
                    />
                </div>
            </div>

            {/* Deputy Profile modal */}
            <DeputyProfile
                deputy={profileDeputy}
                visible={!!profileDeputy}
                onClose={handleCloseProfile}
            />
        </div>
    );
}
