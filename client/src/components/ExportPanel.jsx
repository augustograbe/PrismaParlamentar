import Frame from './Frame';
import Tooltip from './Tooltip';
import Button from './Button';
import { COLORS, SPACING } from '../constants/theme';
import { Download } from 'lucide-react';

/**
 * ExportPanel - Painel de exportação da imagem do grafo
 * Props:
 * - isMinimized: boolean indicando se o painel está recolhido
 * - onToggleMinimize: callback ao minimizar/expandir
 * - onGeneratePreview: callback executado ao clicar no botão de exportar (gera o preview modal)
 * - setShowHighlightOverlay: callback para ligar/desligar o highlight da área de captura
 * - sigmaInstance: referência da instância do Sigma.js
 */
export default function ExportPanel({
    isMinimized,
    onToggleMinimize,
    onGeneratePreview,
    setShowHighlightOverlay,
    sigmaInstance,
    width = '250px',
    height = 'auto',
    style = {},
    hideHeader = false
}) {
    const titleIcon = (
        <Download size={16} color={COLORS.orange} />
    );

    const buttonIcon = (
        <Download size={16} color="currentColor" />
    );

    const containerStyle = {
        padding: `0 ${SPACING.lg} ${SPACING.lg}`,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.md,
    };

    return (
        <Frame
            width={width}
            height={height}
            position={{ position: 'relative' }}
            style={{ flex: isMinimized ? '0 0 auto' : '0 1 auto', minHeight: 0, ...style }}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    {titleIcon} Exportar
                    <Tooltip text="Gere uma imagem do seu grafo. Passe o mouse sobre o botão 'Exportar' para visualizar o limite exato da área a ser capturada." />
                </span>
            }
            showMinimize={true}
            isMinimized={isMinimized}
            onToggleMinimize={onToggleMinimize}
            hideHeader={hideHeader}
        >
            <div style={containerStyle}>
                {/* Botão de Exportar */}
                <Button
                    variant="outline"
                    icon={buttonIcon}
                    onClick={onGeneratePreview}
                    disabled={!sigmaInstance}
                    style={{ width: '100%' }}
                    onMouseEnter={() => setShowHighlightOverlay(true)}
                    onMouseLeave={() => setShowHighlightOverlay(false)}
                >
                    Exportar
                </Button>
            </div>
        </Frame>
    );
}
