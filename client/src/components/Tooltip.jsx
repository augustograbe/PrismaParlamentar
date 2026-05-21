import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip - Componente que exibe um ícone de interrogação e mostra mais informações ao passar o mouse.
 * Props:
 * - text: texto explicativo a ser exibido no tooltip
 */
export default function Tooltip({ text }) {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, arrowLeft: '50%' });
    const ref = useRef(null);

    const handleMouseEnter = () => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            
            const tooltipWidth = 256; // 64 * 4px = 256px
            const padding = 16;
            
            let idealLeft = rect.left + rect.width / 2;
            let finalLeft = idealLeft;
            let arrowOffset = 0;

            if (idealLeft + tooltipWidth / 2 > window.innerWidth - padding) {
                finalLeft = window.innerWidth - padding - tooltipWidth / 2;
                arrowOffset = idealLeft - finalLeft;
            } else if (idealLeft - tooltipWidth / 2 < padding) {
                finalLeft = padding + tooltipWidth / 2;
                arrowOffset = idealLeft - finalLeft;
            }

            setCoords({
                top: rect.top - 6,
                left: finalLeft,
                arrowLeft: `calc(50% + ${arrowOffset}px)`
            });
        }
        setVisible(true);
    };

    return (
        <span 
            className="inline-flex items-center justify-center relative align-middle"
            onMouseLeave={() => setVisible(false)}
        >
            {/* Ícone */}
            <div 
                ref={ref}
                onMouseEnter={handleMouseEnter}
                className="w-[16px] h-[16px] rounded-full bg-[#f2f2f2] text-[#aaa] flex items-center justify-center text-[10px] font-bold hover:bg-[#e8850c] hover:text-white transition-colors cursor-help"
            >
                ?
            </div>
            
            {/* Conteúdo do Tooltip em Portal para não ser cortado pelo Frame */}
            {visible && createPortal(
                <div 
                    className="fixed z-[9999] p-2.5 bg-[#3d3d3d] text-white text-xs rounded-md shadow-lg text-center font-normal whitespace-normal leading-relaxed w-64 pointer-events-none"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    {text}
                    {/* Seta do tooltip */}
                    <div 
                        className="absolute top-full border-[5px] border-transparent border-t-[#3d3d3d]" 
                        style={{ left: coords.arrowLeft, transform: 'translateX(-50%)' }}
                    />
                </div>,
                document.body
            )}
        </span>
    );
}
