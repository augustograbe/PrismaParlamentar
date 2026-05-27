from django.db import models

class ExecucaoUpdate(models.Model):
    data_inicio = models.DateTimeField(auto_now_add=True)
    data_fim = models.DateTimeField(null=True, blank=True)
    sucesso = models.BooleanField(default=False)
    erro_mensagem = models.TextField(null=True, blank=True)
    
    # Métricas de alteração
    deputados_atualizados = models.IntegerField(default=0)
    partidos_atualizados = models.IntegerField(default=0)
    orgaos_atualizados = models.IntegerField(default=0)
    votacoes_adicionadas = models.IntegerField(default=0)
    votos_adicionados = models.IntegerField(default=0)
    proposicoes_adicionadas = models.IntegerField(default=0)
    autores_adicionados = models.IntegerField(default=0)
    discursos_adicionados = models.IntegerField(default=0)
    presencas_adicionadas = models.IntegerField(default=0)
    despesas_adicionadas = models.IntegerField(default=0)
    
    tempo_execucao_segundos = models.FloatField(default=0.0)
    detalhes = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'execucao_update'
        ordering = ['-data_inicio']
        verbose_name = 'Execução de Update de Dados'
        verbose_name_plural = 'Execuções de Update de Dados'

    def __str__(self):
        status = 'Sucesso' if self.sucesso else 'Falha'
        return f"Update em {self.data_inicio.strftime('%d/%m/%Y %H:%M:%S')} - {status}"

