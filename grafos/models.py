from django.db import models
from deputados.models import Deputado

class GrafoAresta(models.Model):
    deputado_1 = models.ForeignKey(
        Deputado, on_delete=models.CASCADE, related_name='arestas_como_1'
    )
    deputado_2 = models.ForeignKey(
        Deputado, on_delete=models.CASCADE, related_name='arestas_como_2'
    )
    legislatura = models.IntegerField()
    similaridade = models.FloatField(help_text='Percentual de similaridade de votos (0 a 100)')
    votos_em_comum = models.IntegerField(default=0, help_text='Qtd de votações em que ambos participaram')
    coautoria = models.IntegerField(default=0, help_text='Qtd de projetos de lei coautorados pelo par')

    class Meta:
        unique_together = ('deputado_1', 'deputado_2', 'legislatura')
        ordering = ['-similaridade']
        verbose_name_plural = 'Arestas do Grafo'

        indexes = [
            models.Index(fields=['legislatura', 'similaridade']),
        ]

    def __str__(self):
        return f'Leg {self.legislatura} | {self.deputado_1.nome} ↔ {self.deputado_2.nome}: {self.similaridade}%'


class BackboneAresta(models.Model):
    """Aresta pré-calculada de backbone (High Salience Skeleton ou LANS)."""

    METODO_CHOICES = [
        ('high_salience_skeleton', 'High Salience Skeleton'),
        ('lans', 'LANS'),
    ]
    TIPO_GRAFO_CHOICES = [
        ('similaridade', 'Similaridade de votos'),
        ('coautoria', 'Coautoria'),
    ]

    deputado_1 = models.ForeignKey(
        Deputado, on_delete=models.CASCADE, related_name='backbone_arestas_como_1'
    )
    deputado_2 = models.ForeignKey(
        Deputado, on_delete=models.CASCADE, related_name='backbone_arestas_como_2'
    )
    legislatura = models.IntegerField()
    metodo = models.CharField(max_length=30, choices=METODO_CHOICES)
    tipo_grafo = models.CharField(max_length=20, choices=TIPO_GRAFO_CHOICES)
    peso = models.FloatField(help_text='Peso original da aresta (similaridade ou coautoria)')

    class Meta:
        unique_together = ('deputado_1', 'deputado_2', 'legislatura', 'metodo', 'tipo_grafo')
        ordering = ['-peso']
        verbose_name = 'Aresta de Backbone'
        verbose_name_plural = 'Arestas de Backbone'

        indexes = [
            models.Index(fields=['legislatura', 'metodo', 'tipo_grafo']),
        ]

    def __str__(self):
        return f'Backbone {self.metodo} ({self.tipo_grafo}) Leg {self.legislatura} | {self.deputado_1.nome} ↔ {self.deputado_2.nome}: {self.peso}'
