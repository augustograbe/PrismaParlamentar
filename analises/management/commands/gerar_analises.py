from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models.functions import TruncDate
from deputados.models import Deputado, Voto, ProposicaoAutor, PresencaEvento, Discurso
from analises.models import DeputadoAnalise, AtividadeDiaria
from collections import defaultdict
import numpy as np
from tqdm import tqdm

# --- CONFIGURAÇÃO DE PESOS DA ATIVIDADE DIÁRIA ---
# Você pode alterar esses pesos para calibrar o gráfico de contribuições.
PESOS_ATIVIDADE = {
    'PEC': 5.0,        # Proposta de Emenda à Constituição
    'PLP': 5.0,        # Projeto de Lei Complementar
    'PL': 3.0,         # Projeto de Lei
    'MPV': 3.0,        # Medida Provisória
    'EMENDA': 1.5,     # Emendas (EMC, EMP, etc)
    'VOTO': 1.0,       # Votos em Plenário/Comissões
    'PRESENCA': 0.8,   # Presença em comissão/evento
    'DISCURSO': 0.5,   # Discurso em Plenário
    'INDICACAO': 0.1,  # Indicações (INC, etc)
    'OUTROS': 0.1      # Qualquer outra proposição não mapeada
}

def get_peso_proposicao(sigla):
    if not sigla:
        return PESOS_ATIVIDADE['OUTROS']
    sigla = sigla.upper()
    if sigla in ['PEC', 'PLP', 'PL', 'MPV']:
        return PESOS_ATIVIDADE[sigla]
    if 'EM' in sigla:
        return PESOS_ATIVIDADE['EMENDA']
    if 'INC' in sigla:
        return PESOS_ATIVIDADE['INDICACAO']
    return PESOS_ATIVIDADE['OUTROS']


class Command(BaseCommand):
    help = 'Calcula e salva analises dos deputados.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--legislatura',
            type=int,
            default=57,
            help='ID da Legislatura para calcular as analises (padrao: 57)'
        )

    def handle(self, *args, **options):
        leg = options['legislatura']
        self.stdout.write(f"Iniciando calculo de analises para a Legislatura {leg}...\n")

        self.calcular_presenca(leg)
        self.calcular_atividade_diaria(leg)

        self.stdout.write(self.style.SUCCESS(f"\nAnalises geradas com sucesso para a Legislatura {leg}!"))

    def calcular_presenca(self, leg):
        """Calcula a presenca de cada deputado nas votacoes da legislatura."""
        self.stdout.write("Calculando presenca dos deputados nas votacoes...\n")

        deputados = list(Deputado.objects.filter(id_legislatura=leg))
        if not deputados:
            self.stdout.write(self.style.ERROR("Nenhum deputado encontrado para esta legislatura."))
            return

        self.stdout.write(f"  Deputados encontrados: {len(deputados)}")

        votacoes_ids = set(
            Voto.objects.filter(deputado__in=deputados)
            .values_list('votacao_id', flat=True)
            .distinct()
        )
        total_votacoes = len(votacoes_ids)

        if total_votacoes == 0:
            self.stdout.write(self.style.ERROR("Nenhuma votacao encontrada para esta legislatura."))
            return

        self.stdout.write(f"  Total de votacoes na legislatura: {total_votacoes}")

        votos_por_deputado = dict(
            Voto.objects.filter(deputado__in=deputados, votacao_id__in=votacoes_ids)
            .values('deputado_id')
            .annotate(total=Count('votacao_id', distinct=True))
            .values_list('deputado_id', 'total')
        )

        DeputadoAnalise.objects.filter(legislatura=leg).delete()

        registros = []
        for dep in tqdm(deputados, desc="Calculando presenca"):
            presente = votos_por_deputado.get(dep.id, 0)
            percentual = round((presente / total_votacoes) * 100, 2) if total_votacoes > 0 else 0

            registros.append(
                DeputadoAnalise(
                    deputado=dep,
                    legislatura=leg,
                    presenca_percentual=percentual,
                    votacoes_presente=presente,
                    votacoes_total=total_votacoes,
                )
            )

        DeputadoAnalise.objects.bulk_create(registros)

        self.stdout.write(
            f"  Presenca calculada para {len(registros)} deputados. "
            f"Total de registros: {DeputadoAnalise.objects.filter(legislatura=leg).count()}"
        )

    def calcular_atividade_diaria(self, leg):
        """Calcula o índice de atividade diária para gerar o gráfico de contribuições."""
        self.stdout.write("\nCalculando atividade diária (Gráfico estilo GitHub)...\n")
        
        deputados = list(Deputado.objects.filter(id_legislatura=leg))
        if not deputados:
            return
            
        deps_ids = [d.id for d in deputados]
        
        # Estrutura: atividades[deputado_id][data_str] = {'votos': 0, 'proposicoes': 0, 'presencas': 0, 'discursos': 0, 'pontuacao': 0.0}
        atividades = defaultdict(lambda: defaultdict(lambda: {
            'votos': 0, 'proposicoes': 0, 'presencas': 0, 'discursos': 0, 'pontuacao': 0.0
        }))
        
        # 1. Processar Votos
        self.stdout.write("  -> Coletando Votos...")
        votos = Voto.objects.filter(deputado_id__in=deps_ids, data_registro__isnull=False).annotate(data=TruncDate('data_registro'))
        for v in votos:
            data_str = v.data.strftime('%Y-%m-%d')
            atividades[v.deputado_id][data_str]['votos'] += 1
            atividades[v.deputado_id][data_str]['pontuacao'] += PESOS_ATIVIDADE['VOTO']
            
        # 2. Processar Proposições
        self.stdout.write("  -> Coletando Proposições...")
        autores = ProposicaoAutor.objects.filter(deputado_id__in=deps_ids).select_related('proposicao')
        for a in autores:
            # Assumindo o ano da proposicao e 1 de janeiro como fallback caso não haja data exata, 
            # já que a API não fornece data de apresentação no csv de autores diretamente facilmente.
            # Ideal seria ter data_apresentacao, mas usaremos 01/01/ano ou a data do ano.
            # Para refinar, poderíamos cruzar com eventos de apresentação. 
            # Para este MVP, se não houver data, colocamos 01/01/ano.
            ano = a.proposicao.ano
            if not ano: continue
            data_str = f"{ano}-01-01" # TODO: melhorar a precisão da data da proposição se necessário
            
            atividades[a.deputado_id][data_str]['proposicoes'] += 1
            atividades[a.deputado_id][data_str]['pontuacao'] += get_peso_proposicao(a.proposicao.sigla_tipo)
            
        # 3. Processar Presenças
        self.stdout.write("  -> Coletando Presenças...")
        presencas = PresencaEvento.objects.filter(deputado_id__in=deps_ids, data_presenca__isnull=False)
        for p in presencas:
            data_str = p.data_presenca.strftime('%Y-%m-%d')
            atividades[p.deputado_id][data_str]['presencas'] += 1
            atividades[p.deputado_id][data_str]['pontuacao'] += PESOS_ATIVIDADE['PRESENCA']
            
        # 4. Processar Discursos
        self.stdout.write("  -> Coletando Discursos...")
        discursos = Discurso.objects.filter(deputado_id__in=deps_ids, data_hora_inicio__isnull=False).annotate(data=TruncDate('data_hora_inicio'))
        for d in discursos:
            data_str = d.data.strftime('%Y-%m-%d')
            atividades[d.deputado_id][data_str]['discursos'] += 1
            atividades[d.deputado_id][data_str]['pontuacao'] += PESOS_ATIVIDADE['DISCURSO']

        # Limpar registros anteriores da legislatura para evitar duplicatas ao rodar várias vezes
        # (Neste caso AtividadeDiaria só tem ForeignKey para deputado, então deletamos os destes deps)
        AtividadeDiaria.objects.filter(deputado_id__in=deps_ids).delete()

        # Calcular quartis globais ou por deputado para definir a 'intensidade' (1 a 4)
        # Vamos calcular quartis globais para que a comparação entre deputados seja justa (cores significam a mesma coisa)
        todas_pontuacoes = []
        for d_id, datas in atividades.items():
            for data_str, metrics in datas.items():
                if metrics['pontuacao'] > 0:
                    todas_pontuacoes.append(metrics['pontuacao'])
                    
        quartis = [0, 0, 0, 0]
        if todas_pontuacoes:
            quartis = np.percentile(todas_pontuacoes, [25, 50, 75, 90])
            
        def obter_intensidade(pts):
            if pts <= 0: return 0
            if pts <= quartis[0]: return 1
            if pts <= quartis[1]: return 2
            if pts <= quartis[2]: return 3
            return 4

        self.stdout.write("  -> Gerando e salvando registros...")
        novos_registros = []
        for d in tqdm(deputados, desc="Processando Deputados"):
            if d.id not in atividades: continue
            
            datas_dep = atividades[d.id]
            for data_str, metrics in datas_dep.items():
                if metrics['pontuacao'] > 0:
                    intensidade = obter_intensidade(metrics['pontuacao'])
                    detalhes = {
                        'votos': metrics['votos'],
                        'proposicoes': metrics['proposicoes'],
                        'presencas': metrics['presencas'],
                        'discursos': metrics['discursos'],
                        'pontuacao_total': round(metrics['pontuacao'], 2)
                    }
                    novos_registros.append(
                        AtividadeDiaria(
                            deputado=d,
                            data=data_str,
                            pontuacao=metrics['pontuacao'],
                            intensidade=intensidade,
                            detalhes=detalhes
                        )
                    )
                    
            if len(novos_registros) >= 10000:
                AtividadeDiaria.objects.bulk_create(novos_registros)
                novos_registros = []
                
        if novos_registros:
            AtividadeDiaria.objects.bulk_create(novos_registros)

        self.stdout.write(self.style.SUCCESS(f"  Finalizado! Foram gerados {AtividadeDiaria.objects.count()} registros de AtividadeDiaria."))
