from django.core.management.base import BaseCommand
from django.db.models import Count, Max
from deputados.models import Votacao, Voto, Proposicao, ProposicaoAutor
from tqdm import tqdm
from collections import Counter


class Command(BaseCommand):
    help = 'Calcula metadados de polarização das votações e número de autores das proposições.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--legislatura',
            type=int,
            default=57,
            help='ID da Legislatura (padrão: 57)'
        )

    def handle(self, *args, **options):
        leg = options['legislatura']
        self.calcular_polarizacao()
        self.calcular_num_autores()

    def calcular_polarizacao(self):
        self.stdout.write('Calculando polarização das votações...')
        votos_invalidos = ['Abstenção', 'Não compareceu', 'Art. 17']
        
        votacoes = Votacao.objects.all()
        batch = []
        batch_size = 1000
        
        for votacao in tqdm(votacoes.iterator(), total=votacoes.count(), desc='Polarização'):
            votos = Voto.objects.filter(votacao=votacao).exclude(tipo_voto__in=votos_invalidos)
            contagem = Counter(votos.values_list('tipo_voto', flat=True))
            
            if not contagem:
                votacao.polarizacao = None
            else:
                total = sum(contagem.values())
                max_tipo = max(contagem.values())
                votacao.polarizacao = round(max_tipo / total, 4) if total > 0 else None
            
            batch.append(votacao)
            if len(batch) >= batch_size:
                Votacao.objects.bulk_update(batch, ['polarizacao'], batch_size=batch_size)
                batch.clear()
        
        if batch:
            Votacao.objects.bulk_update(batch, ['polarizacao'], batch_size=batch_size)
        
        self.stdout.write(self.style.SUCCESS(f'Polarização calculada para {votacoes.count()} votações.'))

    def calcular_num_autores(self):
        self.stdout.write('Calculando número de autores por proposição...')
        
        # Get count of authors per proposicao
        autor_counts = (
            ProposicaoAutor.objects
            .values('proposicao_id')
            .annotate(total=Count('id'))
        )
        
        # Build a dict for fast lookup
        count_map = {item['proposicao_id']: item['total'] for item in autor_counts}
        
        proposicoes = Proposicao.objects.all()
        batch = []
        batch_size = 1000
        
        for prop in tqdm(proposicoes.iterator(), total=proposicoes.count(), desc='Num autores'):
            prop.num_autores_deputados = count_map.get(prop.id, 0)
            batch.append(prop)
            if len(batch) >= batch_size:
                Proposicao.objects.bulk_update(batch, ['num_autores_deputados'], batch_size=batch_size)
                batch.clear()
        
        if batch:
            Proposicao.objects.bulk_update(batch, ['num_autores_deputados'], batch_size=batch_size)
        
        self.stdout.write(self.style.SUCCESS(f'Num autores calculado para {proposicoes.count()} proposições.'))
