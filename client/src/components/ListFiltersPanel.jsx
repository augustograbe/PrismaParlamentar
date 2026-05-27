/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import Frame from './Frame';
import Checkbox from './Checkbox';
import RangeSlider from './RangeSlider';
import Button from './Button';
import Tooltip from './Tooltip';
import { COLORS, SPACING } from '../constants/theme';

/**
 * ListFiltersPanel - Painel de filtros para a página Lista
 * Props:
 * - onApply: callback (filters)
 * - isMinimized / onToggleMinimize
 */
export default function ListFiltersPanel({ filters, onApply, isMinimized, onToggleMinimize }) {
    const [onlyActive, setOnlyActive] = useState(true);
    const [presence, setPresence] = useState({ min: 0, max: 100 });

    useEffect(() => {
        if (filters) {
            if (filters.onlyActive !== undefined) setOnlyActive(filters.onlyActive);
            if (filters.presence) setPresence(filters.presence);
        }
    }, [filters]);

    const filterIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 2h14L9.5 8.5V13L6.5 14.5V8.5L1 2z" />
        </svg>
    );

    const handleApply = () => {
        if (onApply) {
            onApply({ onlyActive, presence });
        }
    };

    return (
        <Frame
            width="250px"
            height="auto"
            position={{ position: 'relative' }}
            style={{ flex: isMinimized ? '0 0 auto' : '0 1 auto', minHeight: 0 }}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    <span style={{ color: COLORS.orange, display: 'flex' }}>{filterIcon}</span> Filtros
                </span>
            }
            showMinimize={true}
            isMinimized={isMinimized}
            onToggleMinimize={onToggleMinimize}
        >
            <div style={{ padding: SPACING.lg, display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
                <Checkbox
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Apenas em exercício <Tooltip text="Oculta deputados que não estão atualmente em exercício (ex: suplentes não convocados)." />
                        </span>
                    }
                    checked={onlyActive}
                    onChange={setOnlyActive}
                />

                <RangeSlider
                    label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Presença <Tooltip text="Filtra os deputados pelo percentual de presença nas sessões (ex: 80% a 100%)." />
                        </span>
                    }
                    min={0}
                    max={100}
                    valueMin={presence.min}
                    valueMax={presence.max}
                    onChange={setPresence}
                />
            </div>

            <div style={{
                position: 'sticky',
                bottom: 0,
                backgroundColor: COLORS.white,
                padding: SPACING.lg,
                display: 'flex',
                justifyContent: 'center',
                borderTop: `1px solid ${COLORS.borderLight}`,
                zIndex: 10,
                marginTop: 'auto',
            }}>
                <Button
                    variant="outline"
                    icon={filterIcon}
                    onClick={handleApply}
                >
                    Aplicar
                </Button>
            </div>
        </Frame>
    );
}
