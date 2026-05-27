from django.contrib import admin
from .models import ExecucaoUpdate

@admin.register(ExecucaoUpdate)
class ExecucaoUpdateAdmin(admin.ModelAdmin):
    list_display = (
        'data_inicio', 
        'data_fim', 
        'sucesso', 
        'votacoes_adicionadas', 
        'votos_adicionados', 
        'proposicoes_adicionadas', 
        'despesas_adicionadas',
        'tempo_execucao_segundos'
    )
    list_filter = ('sucesso', 'data_inicio')
    readonly_fields = (
        'data_inicio', 'data_fim', 'sucesso', 'erro_mensagem',
        'deputados_atualizados', 'partidos_atualizados', 'orgaos_atualizados',
        'votacoes_adicionadas', 'votos_adicionados', 'proposicoes_adicionadas',
        'autores_adicionados', 'discursos_adicionados', 'presencas_adicionadas',
        'despesas_adicionadas', 'tempo_execucao_segundos', 'detalhes'
    )
    ordering = ('-data_inicio',)

