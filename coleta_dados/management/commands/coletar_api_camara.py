import requests
import pandas as pd
import io
from django.core.management.base import BaseCommand
from deputados.models import Deputado, Partido, Orgao, Proposicao, Votacao, Voto, ProposicaoAutor
from tqdm import tqdm
from datetime import datetime
import warnings
import time

warnings.filterwarnings('ignore', category=RuntimeWarning)

class Command(BaseCommand):
    help = 'Coleta dados reais da API da Câmara (Deputados, Partidos, Órgãos, Votações, Proposições) e via CSV (Votos) para maior velocidade.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--legislatura',
            type=int,
            default=57,
            help='ID da Legislatura para buscar deputados (padrão: 57)'
        )
        parser.add_argument(
            '--ano-inicio',
            type=int,
            default=2023,
            help='Ano inicial para buscar votações em CSV'
        )
        parser.add_argument(
            '--ano-fim',
            type=int,
            default=datetime.now().year,
            help='Ano final para buscar votações em CSV'
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

    def download_and_read_csv(self, url):
        self.stdout.write(f"Baixando {url} ...")
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            csv_content = io.StringIO(response.text)
            df = pd.read_csv(csv_content, delimiter=';', dtype=str)
            return df
        except Exception as e:
            self.stderr.write(f"\nErro ao baixar {url}: {e}")
            return pd.DataFrame()

    def handle(self, *args, **options):
        leg = options['legislatura']
        self.stdout.write(f"Iniciando coleta para a Legislatura {leg}...\n")

        # 1. Partidos
        self.stdout.write(self.style.WARNING(">> Baixando Partidos (API)..."))
        partidos_dados = self.get_api_data("https://dadosabertos.camara.leg.br/api/v2/partidos")
        for p in tqdm(partidos_dados, desc="Salvando Partidos"):
            Partido.objects.update_or_create(
                id=p['id'],
                defaults={'sigla': p['sigla'], 'nome': p['nome'], 'uri': p['uri']}
            )
            
        # 2. Deputados
        self.stdout.write(self.style.WARNING("\n>> Baixando Deputados (API)..."))
        deputados_dados = self.get_api_data("https://dadosabertos.camara.leg.br/api/v2/deputados", {'idLegislatura': leg})
        for d in tqdm(deputados_dados, desc="Salvando Deputados"):
            partido = Partido.objects.filter(sigla=d['siglaPartido']).first()
            
            # Buscar dados completos do deputado
            detalhes_url = f"https://dadosabertos.camara.leg.br/api/v2/deputados/{d['id']}"
            try:
                res = requests.get(detalhes_url, timeout=10)
                res.raise_for_status()
                detalhes = res.json().get('dados', {})
                ultimo_status = detalhes.get('ultimoStatus', {})
            except Exception as e:
                self.stderr.write(f"\nErro ao buscar detalhes do deputado {d['id']}: {e}")
                detalhes = {}
                ultimo_status = {}
            
            Deputado.objects.update_or_create(
                id=d['id'],
                defaults={
                    'uri': d['uri'],
                    'nome': d['nome'],
                    'sigla_partido': d['siglaPartido'],
                    'partido': partido,
                    'sigla_uf': d['siglaUf'],
                    'id_legislatura': d['idLegislatura'],
                    'url_foto': d['urlFoto'],
                    'email': d['email'],
                    'cpf': detalhes.get('cpf'),
                    'data_nascimento': detalhes.get('dataNascimento'),
                    'data_falecimento': detalhes.get('dataFalecimento'),
                    'escolaridade': detalhes.get('escolaridade'),
                    'municipio_nascimento': detalhes.get('municipioNascimento'),
                    'nome_civil': detalhes.get('nomeCivil'),
                    'sexo': detalhes.get('sexo'),
                    'uf_nascimento': detalhes.get('ufNascimento'),
                    'condicao_eleitoral': ultimo_status.get('condicaoEleitoral'),
                    'situacao': ultimo_status.get('situacao'),
                }
            )

        # 3. Órgãos
        self.stdout.write(self.style.WARNING("\n>> Baixando Órgãos (API)..."))
        orgaos_dados = self.get_api_data("https://dadosabertos.camara.leg.br/api/v2/orgaos")
        for o in tqdm(orgaos_dados, desc="Salvando Órgãos"):
            Orgao.objects.update_or_create(
                id=o['id'],
                defaults={
                    'uri': o['uri'],
                    'sigla': o['sigla'],
                    'nome': o['nome'],
                    'tipo_orgao': o.get('tipoOrgao', '')
                }
            )

        # 4. Histórico de Votações via CSVs
        self.stdout.write(self.style.WARNING("\n>> Baixando e Processando Votos via CSV..."))
        
        ano_inicio = options['ano_inicio']
        ano_fim = options['ano_fim']
        anos = list(range(ano_inicio, ano_fim + 1))
        
        deps_validos = set(Deputado.objects.values_list('id', flat=True))
        
        for ano in anos:
            self.stdout.write(self.style.WARNING(f"\n--- Ano {ano} ---"))
            
            df_votacoes = self.download_and_read_csv(f'http://dadosabertos.camara.leg.br/arquivos/votacoesVotos/csv/votacoesVotos-{ano}.csv')
            
            if df_votacoes.empty:
                self.stdout.write(self.style.ERROR(f"Arquivo CSV de {ano} vazio ou não acessível."))
                continue
                
            # Extrair Votações únicas
            votacoes_unicas = df_votacoes[['idVotacao', 'uriVotacao', 'dataHoraVoto']].drop_duplicates('idVotacao')
            v_objs = []
            
            for _, row in tqdm(votacoes_unicas.iterrows(), total=len(votacoes_unicas), desc=f"Salvando Cabeçalho Votações {ano}"):
                v_id = str(row['idVotacao'])
                dh = str(row.get('dataHoraVoto', ''))
                if dh == 'nan': dh = None
                
                data_v = None
                if dh and len(dh) >= 10:
                    data_v = dh[:10]
                    
                uri_v = str(row.get('uriVotacao', ''))
                if uri_v == 'nan': uri_v = None

                v_objs.append(
                    Votacao(
                        id=v_id,
                        uri=uri_v,
                        data_hora=dh,
                        data=data_v
                    )
                )
                
            if v_objs:
                Votacao.objects.bulk_create(v_objs, ignore_conflicts=True)
                
            # Salvando os Votos Individuais
            votos_objs = []
            votos_ids_validos = set(Votacao.objects.values_list('id', flat=True))
            
            for _, row in tqdm(df_votacoes.iterrows(), total=len(df_votacoes), desc=f"Salvando Votos Individuais {ano}"):
                v_id = str(row['idVotacao'])
                
                try:
                    d_id = int(float(row['deputado_id']))
                except:
                    continue
                    
                if d_id in deps_validos and v_id in votos_ids_validos:
                    dh = str(row.get('dataHoraVoto', ''))
                    if dh == 'nan': dh = None
                    
                    votos_objs.append(
                        Voto(
                            votacao_id=v_id,
                            deputado_id=d_id,
                            tipo_voto=str(row['voto']),
                            data_registro=dh
                        )
                    )
                    
                    if len(votos_objs) > 20000:
                        Voto.objects.bulk_create(votos_objs, ignore_conflicts=True)
                        votos_objs = []
                        
            if votos_objs:
                Voto.objects.bulk_create(votos_objs, ignore_conflicts=True)

        # 5. Proposições (Projetos de Lei) e seus Autores via CSVs
        self.stdout.write(self.style.WARNING("\n>> Baixando e Processando Proposições e Autores via CSV..."))
        
        for ano in anos:
            self.stdout.write(self.style.WARNING(f"\n--- Proposições Ano {ano} ---"))
            
            # Baixar proposicoes
            url_props = f'http://dadosabertos.camara.leg.br/arquivos/proposicoes/csv/proposicoes-{ano}.csv'
            df_props = self.download_and_read_csv(url_props)
            
            if df_props.empty:
                self.stdout.write(self.style.ERROR(f"Arquivo de proposições de {ano} vazio ou não acessível."))
                continue
                
            # Remover o filtro de Projetos de Lei (PL) para coletar todos os tipos
            if 'siglaTipo' in df_props.columns:
                df_pls = df_props
            else:
                self.stdout.write(self.style.ERROR("Coluna 'siglaTipo' não encontrada no CSV de proposições."))
                continue

            self.stdout.write(f"Total de proposições em {ano}: {len(df_pls)}")
            
            # Salvar proposições
            prop_objs = []
            prop_ids_validos = set()
            
            for _, row in tqdm(df_pls.iterrows(), total=len(df_pls), desc=f"Salvando Proposições {ano}"):
                p_id = int(row['id'])
                prop_ids_validos.add(p_id)
                prop_objs.append(
                    Proposicao(
                        id=p_id,
                        uri=str(row.get('uri', '')),
                        sigla_tipo=str(row.get('siglaTipo', '')),
                        numero=int(row['numero']) if pd.notna(row.get('numero')) else None,
                        ano=int(row['ano']) if pd.notna(row.get('ano')) else None,
                        ementa=str(row.get('ementa', '')),
                        situacao=str(row.get('ultimoStatus_descricaoSituacao', '')) if pd.notna(row.get('ultimoStatus_descricaoSituacao')) else None
                    )
                )
                
                if len(prop_objs) >= 5000:
                    Proposicao.objects.bulk_create(prop_objs, ignore_conflicts=True)
                    prop_objs = []
                    
            if prop_objs:
                Proposicao.objects.bulk_create(prop_objs, ignore_conflicts=True)
                
            # Baixar autores
            self.stdout.write(self.style.WARNING(f"Baixando autores {ano}..."))
            url_autores = f'http://dadosabertos.camara.leg.br/arquivos/proposicoesAutores/csv/proposicoesAutores-{ano}.csv'
            df_autores = self.download_and_read_csv(url_autores)
            
            if df_autores.empty:
                self.stdout.write(self.style.ERROR(f"Arquivo de autores de {ano} vazio ou não acessível."))
                continue
                
            # Salvar relações
            autores_objs = []
            
            # Colunas esperadas: idProposicao, uriProposicao, idDeputadoAutor, uriAutor, codTipoAutor, tipoAutor, nomeAutor...
            # A API usa idDeputadoAutor quando o autor é deputado
            col_id_prop = 'idProposicao'
            col_id_dep = 'idDeputadoAutor'
            
            if col_id_prop not in df_autores.columns or col_id_dep not in df_autores.columns:
                 self.stdout.write(self.style.ERROR("Colunas necessárias não encontradas no CSV de autores."))
                 continue
                 
            for _, row in tqdm(df_autores.iterrows(), total=len(df_autores), desc=f"Salvando Autores {ano}"):
                try:
                    p_id = int(row[col_id_prop])
                    
                    if pd.isna(row[col_id_dep]):
                        continue
                        
                    d_id = int(float(row[col_id_dep]))
                    
                    if p_id in prop_ids_validos and d_id in deps_validos:
                        autores_objs.append(
                            ProposicaoAutor(
                                proposicao_id=p_id,
                                deputado_id=d_id,
                            )
                        )
                        
                        if len(autores_objs) >= 10000:
                            ProposicaoAutor.objects.bulk_create(autores_objs, ignore_conflicts=True)
                            autores_objs = []
                except Exception:
                    continue
                    
            if autores_objs:
                ProposicaoAutor.objects.bulk_create(autores_objs, ignore_conflicts=True)

        # Os pontos 6 (Presenças) e 7 (Discursos) foram movidos para scripts separados.


        self.stdout.write(self.style.SUCCESS("\nProcesso concluído com sucesso!"))
