import requests
from django.core.management.base import BaseCommand
from deputados.models import Deputado, PresencaEvento
from tqdm import tqdm
from datetime import datetime
import warnings

warnings.filterwarnings('ignore', category=RuntimeWarning)

class Command(BaseCommand):
    help = 'Coleta presença em eventos dos deputados via API da Câmara.'

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
            help='Ano inicial para buscar presenças'
        )
        parser.add_argument(
            '--ano-fim',
            type=int,
            default=datetime.now().year,
            help='Ano final para buscar presenças'
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
        self.stdout.write(f"Iniciando coleta de presenças para a Legislatura {leg}...\n")

        data_inicio = f"{options['ano_inicio']}-01-01"
        data_fim = f"{options['ano_fim']}-12-31"
        
        deputados_db = Deputado.objects.filter(id_legislatura=leg)
        
        if not deputados_db.exists():
            self.stdout.write(self.style.ERROR(f"Nenhum deputado encontrado para a legislatura {leg} no banco de dados."))
            return

        self.stdout.write(self.style.WARNING(f">> Baixando Presenças em Eventos via API ({data_inicio} até {data_fim})..."))
        
        presencas_objs = []
        for d in tqdm(deputados_db, desc="Baixando Presenças por Deputado"):
            eventos = self.get_api_data(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{d.id}/eventos", {'dataInicio': data_inicio, 'dataFim': data_fim})
            for ev in eventos:
                try:
                    data_p = str(ev.get('dataHoraInicio', ''))[:10]
                    if not data_p:
                        continue
                        
                    presencas_objs.append(
                        PresencaEvento(
                            id_evento=ev.get('id'),
                            deputado_id=d.id,
                            data_presenca=data_p,
                            tipo_participacao='Titular', 
                            status_presenca='Presente' 
                        )
                    )
                except Exception:
                    continue
                    
            if len(presencas_objs) >= 5000:
                PresencaEvento.objects.bulk_create(presencas_objs, ignore_conflicts=True)
                presencas_objs = []
                
        if presencas_objs:
            PresencaEvento.objects.bulk_create(presencas_objs, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS("\nColeta de presenças concluída com sucesso!"))
