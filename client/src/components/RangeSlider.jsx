import { useState, useRef, useCallback, useEffect } from 'react';
import { COLORS, SPACING, FONTS } from '../constants/theme';

/**
 * RangeSlider - Seletor de range com valor mínimo e máximo
 * Props:
 * - label: rótulo
 * - min: valor mínimo possível (default: 0)
 * - max: valor máximo possível (default: 100)
 * - valueMin: valor mínimo selecionado
 * - valueMax: valor máximo selecionado
 * - onChange: callback ({ min, max })
 * - style: estilos adicionais
 */
export default function RangeSlider({
    label = '',
    min = 0,
    max = 100,
    valueMin = 0,
    valueMax = 100,
    onChange,
    formatLabel,
    disabled = false,
    style = {},
}) {
    const trackRef = useRef(null);
    const [dragging, setDragging] = useState(null); // 'min' or 'max'

    const getPercent = (value) => ((value - min) / (max - min)) * 100;

    const getValueFromPosition = useCallback((clientX) => {
        const track = trackRef.current;
        if (!track) return min;
        const rect = track.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(min + percent * (max - min));
    }, [min, max]);

    const handleMouseDown = (thumb) => (e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(thumb);
    };

    const handleMouseMove = useCallback((e) => {
        if (!dragging) return;
        const newValue = getValueFromPosition(e.clientX);
        if (dragging === 'min') {
            onChange({ min: Math.min(newValue, valueMax), max: valueMax });
        } else {
            onChange({ min: valueMin, max: Math.max(newValue, valueMin) });
        }
    }, [dragging, getValueFromPosition, onChange, valueMin, valueMax]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragging, handleMouseMove, handleMouseUp]);

    const minPercent = getPercent(valueMin);
    const maxPercent = getPercent(valueMax);

    const containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.xs,
        width: '100%',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        ...style,
    };

    const labelStyle = {
        fontSize: FONTS.sizeMd,
        color: COLORS.textDark,
        fontWeight: FONTS.weightNormal,
    };

    const trackStyle = {
        position: 'relative',
        height: '6px',
        backgroundColor: COLORS.sliderTrack,
        borderRadius: '3px',
        cursor: 'pointer',
        marginTop: SPACING.sm,
        marginBottom: SPACING.xs,
    };

    const filledStyle = {
        position: 'absolute',
        height: '100%',
        backgroundColor: COLORS.sliderFilled,
        borderRadius: '3px',
        left: `${minPercent}%`,
        width: `${maxPercent - minPercent}%`,
    };

    const thumbStyle = (percent) => ({
        position: 'absolute',
        top: '50%',
        left: `${percent}%`,
        transform: 'translate(-50%, -50%)',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: COLORS.orange,
        border: `2px solid ${COLORS.white}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        cursor: 'grab',
        zIndex: 2,
    });

    const valuesStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: FONTS.sizeSm,
        color: COLORS.textMedium,
    };

    return (
        <div style={containerStyle}>
            {label && <span style={labelStyle}>{label}</span>}
            <div style={trackStyle} ref={trackRef}>
                <div style={filledStyle} />
                <div
                    style={thumbStyle(minPercent)}
                    onMouseDown={handleMouseDown('min')}
                />
                <div
                    style={thumbStyle(maxPercent)}
                    onMouseDown={handleMouseDown('max')}
                />
            </div>
            <div style={valuesStyle}>
                <span>{formatLabel ? formatLabel(valueMin) : `${valueMin}%`}</span>
                <span>{formatLabel ? formatLabel(valueMax) : `${valueMax}%`}</span>
            </div>
        </div>
    );
}
