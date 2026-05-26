from django.db import models

class Partido(models.Model):
    id = models.IntegerField(primary_key=True)
    sigla = models.CharField(max_length=15, unique=True)
    nome = models.CharField(max_length=100, null=True, blank=True)
    uri = models.URLField(null=True, blank=True)
    
    def __str__(self):
        return self.sigla

class Deputado(models.Model):
    id = models.IntegerField(primary_key=True)
    uri = models.URLField(null=True, blank=True)
    nome = models.CharField(max_length=200)
    sigla_partido = models.CharField(max_length=15, null=True, blank=True)
    partido = models.ForeignKey(Partido, on_delete=models.SET_NULL, null=True, blank=True)
    sigla_uf = models.CharField(max_length=2, null=True, blank=True)
    id_legislatura = models.IntegerField(null=True, blank=True)
    url_foto = models.URLField(null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    
    # Novos campos detalhados
    cpf = models.CharField(max_length=14, null=True, blank=True)
    data_nascimento = models.DateField(null=True, blank=True)
    data_falecimento = models.DateField(null=True, blank=True)
    escolaridade = models.CharField(max_length=100, null=True, blank=True)
    municipio_nascimento = models.CharField(max_length=100, null=True, blank=True)
    nome_civil = models.CharField(max_length=200, null=True, blank=True)
    sexo = models.CharField(max_length=1, null=True, blank=True)
    uf_nascimento = models.CharField(max_length=2, null=True, blank=True)
    condicao_eleitoral = models.CharField(max_length=100, null=True, blank=True)
    situacao = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome} ({self.sigla_partido}-{self.sigla_uf})'

class Orgao(models.Model):
    id = models.IntegerField(primary_key=True)
    uri = models.URLField(null=True, blank=True)
    sigla = models.CharField(max_length=50)
    nome = models.CharField(max_length=300)
    tipo_orgao = models.CharField(max_length=100, null=True, blank=True) 

    def __str__(self):
        return self.sigla

class FrenteParlamentar(models.Model):
    id = models.IntegerField(primary_key=True)
    uri = models.URLField(null=True, blank=True)
    titulo = models.CharField(max_length=300)
    id_legislatura = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.titulo

class Proposicao(models.Model):
    id = models.IntegerField(primary_key=True)
    uri = models.URLField(null=True, blank=True)
    sigla_tipo = models.CharField(max_length=10, null=True, blank=True)
    numero = models.IntegerField(null=True, blank=True)
    ano = models.IntegerField(null=True, blank=True)
    ementa = models.TextField(null=True, blank=True)
    situacao = models.CharField(max_length=200, null=True, blank=True)
    num_autores_deputados = models.IntegerField(
        null=True, blank=True,
        help_text='Qtd de deputados coautores desta proposição (cache denormalizado)'
    )

    def __str__(self):
        return f'{self.sigla_tipo} {self.numero}/{self.ano}'

class Votacao(models.Model):
    id = models.CharField(max_length=100, primary_key=True)
    uri = models.URLField(null=True, blank=True)
    data = models.DateField(null=True, blank=True)
    data_hora = models.DateTimeField(null=True, blank=True)
    orgao = models.ForeignKey(Orgao, on_delete=models.SET_NULL, null=True, blank=True)
    proposicao = models.ForeignKey(Proposicao, on_delete=models.SET_NULL, null=True, blank=True)
    descricao = models.TextField(null=True, blank=True)
    aprovada = models.IntegerField(null=True, blank=True)
    polarizacao = models.FloatField(
        null=True, blank=True,
        help_text='Fração do voto dominante (0.5 a 1.0). Ex: 0.95 = 95% votaram igual'
    )

    def __str__(self):
        return f'Votação {self.id} em {self.data}'

class Voto(models.Model):
    votacao = models.ForeignKey(Votacao, on_delete=models.CASCADE, related_name='votos')
    deputado = models.ForeignKey(Deputado, on_delete=models.CASCADE, related_name='votos')
    tipo_voto = models.CharField(max_length=30) # Sim, Não, Abstenção, Obstrução, Art. 17, etc
    data_registro = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('votacao', 'deputado')

    def __str__(self):
        return f'{self.deputado.nome} -> {self.tipo_voto} ({self.votacao.id})'

class ProposicaoAutor(models.Model):
    proposicao = models.ForeignKey(Proposicao, on_delete=models.CASCADE, related_name='autores')
    deputado = models.ForeignKey(Deputado, on_delete=models.CASCADE, related_name='proposicoes_autoradas')

    class Meta:
        unique_together = ('proposicao', 'deputado')
        verbose_name_plural = 'Autores de Proposições'

    def __str__(self):
        return f'{self.deputado.nome} -> {self.proposicao}'

class PresencaEvento(models.Model):
    id_evento = models.IntegerField()
    deputado = models.ForeignKey(Deputado, on_delete=models.CASCADE, related_name='presencas_eventos')
    data_presenca = models.DateField(null=True, blank=True)
    tipo_participacao = models.CharField(max_length=100, null=True, blank=True)
    status_presenca = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        unique_together = ('id_evento', 'deputado')
        verbose_name_plural = 'Presenças em Eventos'

    def __str__(self):
        return f'{self.deputado.nome} presente no evento {self.id_evento} em {self.data_presenca}'

class Discurso(models.Model):
    deputado = models.ForeignKey(Deputado, on_delete=models.CASCADE, related_name='discursos')
    data_hora_inicio = models.DateTimeField(null=True, blank=True)
    tipo_evento = models.CharField(max_length=100, null=True, blank=True)
    fase_evento = models.CharField(max_length=100, null=True, blank=True)
    transcricao = models.TextField(null=True, blank=True)

    def __str__(self):
        return f'Discurso de {self.deputado.nome} em {self.data_hora_inicio}'

class Despesa(models.Model):
    deputado = models.ForeignKey(Deputado, on_delete=models.CASCADE, related_name='despesas')
    ano = models.IntegerField()
    mes = models.IntegerField()
    tipo_despesa = models.CharField(max_length=200)
    cod_documento = models.CharField(max_length=100, null=True, blank=True)
    cod_lote = models.IntegerField(null=True, blank=True)
    cod_tipo_documento = models.IntegerField(null=True, blank=True)
    data_documento = models.DateField(null=True, blank=True)
    nome_fornecedor = models.CharField(max_length=500, null=True, blank=True)
    cnpj_cpf_fornecedor = models.CharField(max_length=20, null=True, blank=True)
    num_documento = models.CharField(max_length=100, null=True, blank=True)
    num_ressarcimento = models.CharField(max_length=100, null=True, blank=True)
    parcela = models.IntegerField(null=True, blank=True)
    tipo_documento = models.CharField(max_length=100, null=True, blank=True)
    url_documento = models.URLField(max_length=1000, null=True, blank=True)
    valor_documento = models.DecimalField(max_digits=12, decimal_places=2)
    valor_glosa = models.DecimalField(max_digits=12, decimal_places=2)
    valor_liquido = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        verbose_name = 'Despesa'
        verbose_name_plural = 'Despesas'
        indexes = [
            models.Index(fields=['deputado', 'ano', 'mes']),
        ]

    def __str__(self):
        return f'{self.deputado.nome} - {self.tipo_despesa} ({self.mes}/{self.ano}) - R$ {self.valor_liquido}'
