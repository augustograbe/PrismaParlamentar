import Frame from './Frame';
import MultiSelect from './MultiSelect';
import { COLORS, SPACING } from '../constants/theme';

/**
 * FieldsPanel - Painel para selecionar colunas visíveis na lista
 * Props:
 * - selectedFields: array de strings (field values selecionados)
 * - onFieldsChange: callback (newFields: string[])
 * - isMinimized / onToggleMinimize
 */

// Campos obrigatórios (sempre visíveis, não removíveis)
const REQUIRED_FIELDS = ['nome', 'sigla_partido'];

// Todos os campos disponíveis
const ALL_FIELD_OPTIONS = [
    { value: 'nome', label: 'Nome' },
    { value: 'sigla_partido', label: 'Partido' },
    { value: 'foto', label: 'Foto' },
    { value: 'sigla_uf', label: 'Estado' },
    { value: 'sexo', label: 'Sexo' },
    { value: 'email', label: 'Email' },
    { value: 'escolaridade', label: 'Escolaridade' },
    { value: 'situacao', label: 'Situação' },
    { value: 'presenca', label: 'Presença' },
    { value: 'municipio_nascimento', label: 'Município Nasc.' },
    { value: 'uf_nascimento', label: 'UF Nasc.' },
    { value: 'data_nascimento', label: 'Data Nasc.' },
    { value: 'despesas', label: 'Despesas' },
    { value: 'discursos', label: 'Discursos' },
    { value: 'proposicoes', label: 'Proposições' },
];

export default function FieldsPanel({ selectedFields, onFieldsChange, isMinimized, onToggleMinimize, width = '250px' }) {

    const fieldsIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={COLORS.orange} strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="2" width="12" height="3" rx="1" />
            <rect x="2" y="6.5" width="12" height="3" rx="1" />
            <rect x="2" y="11" width="12" height="3" rx="1" />
        </svg>
    );

    return (
        <Frame
            width={width}
            height="auto"
            position={{ position: 'relative' }}
            style={{ flex: isMinimized ? '0 0 auto' : '0 1 auto', minHeight: 0 }}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    {fieldsIcon} Campos
                </span>
            }
            showMinimize={true}
            isMinimized={isMinimized}
            onToggleMinimize={onToggleMinimize}
        >
            <div style={{ padding: `0 ${SPACING.lg} ${SPACING.lg}` }}>
                <MultiSelect
                    options={ALL_FIELD_OPTIONS}
                    value={selectedFields}
                    onChange={onFieldsChange}
                    disabledValues={REQUIRED_FIELDS}
                    placeholder="Adicionar campo..."
                />
            </div>
        </Frame>
    );
}

export { REQUIRED_FIELDS, ALL_FIELD_OPTIONS };
