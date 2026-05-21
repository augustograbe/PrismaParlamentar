import requests
from django.core.management.base import BaseCommand
from deputados.models import Deputado, Discurso
from tqdm import tqdm
from datetime import datetime
import warnings

warnings.filterwarnings('ignore', category=RuntimeWarning)

class Command(BaseCommand):
    help = 'Coleta discursos dos deputados via API da Câmara.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--legislatura',
            type=int,
            default=57,
            help='ID da Legislatura para filtrar deputados (padrão: 57)'
        )
        parser.add_argument(
            '--ano-inicio',
            type=int,
            default=2023,
            help='Ano inicial para buscar discursos'
        )
        parser.add_argument(
            '--ano-fim',
            type=int,
            default=datetime.now().year,
            help='Ano final para buscar discursos'
        )

    def get_api_data(self, url, params=None):
        paginas_restantes = True
        current_url = url
        dados_totais = []
        
        while paginas_restantes:
            try:
                response = requests.get(current_url, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                if 'dados' in data:
                    dados_totais.extend(data['dados'])
                
                params = None 
                next_link = next((link['href'] for link in data.get('links', []) if link['rel'] == 'next'), None)
                if next_link:
                    current_url = next_link
                else:
                    paginas_restantes = False
            except Exception as e:
                self.stderr.write(f"\nErro ao acessar {current_url}: {e}")
                paginas_restantes = False
                
        return dados_totais

    def handle(self, *args, **options):
        leg = options['legislatura']
        self.stdout.write(f"Iniciando coleta de discursos para a Legislatura {leg}...\n")

        data_inicio = f"{options['ano_inicio']}-01-01"
        data_fim = f"{options['ano_fim']}-12-31"
        
        deputados_db = Deputado.objects.filter(id_legislatura=leg)
        
        if not deputados_db.exists():
            self.stdout.write(self.style.ERROR(f"Nenhum deputado encontrado para a legislatura {leg} no banco de dados."))
            return

        self.stdout.write(self.style.WARNING(f">> Baixando Discursos via API ({data_inicio} até {data_fim})..."))
        
        discursos_objs = []
        for d in tqdm(deputados_db, desc="Baixando Discursos por Deputado"):
            discursos = self.get_api_data(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{d.id}/discursos", {'dataInicio': data_inicio, 'dataFim': data_fim})
            for disc in discursos:
                try:
                    dh_inicio = str(disc.get('dataHoraInicio', ''))
                    if not dh_inicio:
                        continue
                        
                    discursos_objs.append(
                        Discurso(
                            deputado_id=d.id,
                            data_hora_inicio=dh_inicio,
                            tipo_evento=disc.get('faseEvento', {}).get('titulo', ''),
                            fase_evento=disc.get('tipoDiscurso', ''),
                            transcricao=disc.get('transcricao', '')
                        )
                    )
                except Exception:
                    continue
                    
            if len(discursos_objs) >= 5000:
                Discurso.objects.bulk_create(discursos_objs, ignore_conflicts=True)
                discursos_objs = []
                
        if discursos_objs:
            Discurso.objects.bulk_create(discursos_objs, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS("\nColeta de discursos concluída com sucesso!"))
