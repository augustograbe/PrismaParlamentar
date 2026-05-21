import requests
import time
import zipfile
import io
import pandas as pd
from datetime import datetime
from django.core.management.base import BaseCommand
from deputados.models import Deputado, Despesa
from tqdm import tqdm

class Command(BaseCommand):
    help = 'Coleta despesas dos deputados de forma rápida e completa via arquivos CSV compactados da Câmara.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--ano',
            type=int,
            nargs='+',
            default=[2023, 2024, 2025, 2026],
            help='Anos das despesas a serem coletadas (padrão: 2023 2024 2025 2026)'
        )
        parser.add_argument(
            '--deputado',
            type=int,
            default=None,
            help='ID de um deputado específico para filtrar na importação'
        )

    def handle(self, *args, **options):
        anos = options['ano']
        deputado_id = options['deputado']

        # Pegar deputados válidos cadastrados no banco
        if deputado_id:
            deputados_qs = Deputado.objects.filter(id=deputado_id)
            if not deputados_qs.exists():
                self.stdout.write(self.style.ERROR(f"Deputado com ID {deputado_id} não encontrado no banco."))
                return
            deps_validos = {deputado_id}
        else:
            deps_validos = set(Deputado.objects.values_list('id', flat=True))

        self.stdout.write(self.style.WARNING(
            f"Iniciando coleta rápida de despesas via CSV para {len(deps_validos)} deputado(s) nos anos: {anos}\n"
        ))

        def parse_float(val):
            if not val or pd.isna(val) or val == 'nan':
                return 0.0
            try:
                return float(str(val).replace(',', '.'))
            except ValueError:
                return 0.0

        def parse_int(val):
            if not val or pd.isna(val) or val == 'nan':
                return None
            try:
                return int(float(str(val)))
            except ValueError:
                return None

        def parse_date(val):
            if not val or pd.isna(val) or val == 'nan':
                return None
            val_str = str(val).split('T')[0]
            try:
                return datetime.strptime(val_str, "%Y-%m-%d").date()
            except ValueError:
                return None

        for ano in anos:
            self.stdout.write(self.style.WARNING(f"\n--- Processando Ano {ano} ---"))
            
            # Limpar despesas antigas correspondentes para garantir idempotência total
            if deputado_id:
                Despesa.objects.filter(deputado_id=deputado_id, ano=ano).delete()
            else:
                Despesa.objects.filter(ano=ano).delete()

            # URL oficial do arquivo de despesas consolidadas por ano
            url = f"http://www.camara.leg.br/cotas/Ano-{ano}.csv.zip"
            self.stdout.write(f"Baixando arquivo consolidado: {url}")
            
            try:
                response = requests.get(url, timeout=120)
                response.raise_for_status()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Erro ao baixar despesas de {ano}: {e}"))
                continue

            self.stdout.write("Extraindo e decodificando arquivo CSV...")
            try:
                # Extrair o CSV da pasta compactada ZIP
                zip_file = zipfile.ZipFile(io.BytesIO(response.content))
                csv_filename = zip_file.namelist()[0]
                csv_bytes = zip_file.read(csv_filename)
                
                # Tentar UTF-8 primeiro e fallback para ISO-8859-1
                try:
                    csv_text = csv_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    csv_text = csv_bytes.decode('iso-8859-1')
                    
                df = pd.read_csv(io.StringIO(csv_text), delimiter=';', dtype=str)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Erro ao ler arquivo CSV de {ano}: {e}"))
                continue

            if df.empty:
                self.stdout.write(self.style.ERROR(f"CSV de despesas de {ano} está vazio."))
                continue

            # Filtrar colunas obrigatórias
            if 'ideCadastro' not in df.columns:
                self.stdout.write(self.style.ERROR("Coluna 'ideCadastro' não encontrada no arquivo de despesas."))
                continue

            # Se filtrou por deputado específico
            if deputado_id:
                df = df[df['ideCadastro'] == str(deputado_id)]

            self.stdout.write(f"Total de registros encontrados no arquivo de despesas de {ano}: {len(df)}")
            
            despesas_objs = []
            
            # Iterar pelas linhas do CSV com barra de progresso
            for _, row in tqdm(df.iterrows(), total=len(df), desc=f"Importando despesas {ano}"):
                dep_id = parse_int(row.get('ideCadastro'))
                
                # Apenas importar despesa se o deputado estiver na nossa base local
                if dep_id and dep_id in deps_validos:
                    data_doc = parse_date(row.get('datEmissao'))
                    
                    despesas_objs.append(
                        Despesa(
                            deputado_id=dep_id,
                            ano=parse_int(row.get('numAno')) or ano,
                            mes=parse_int(row.get('numMes')) or 1,
                            tipo_despesa=str(row.get('txtDescricao') or "OUTRAS DESPESAS").strip(),
                            cod_documento=str(row.get('ideDocumento') or ""),
                            cod_lote=parse_int(row.get('numLote')),
                            cod_tipo_documento=parse_int(row.get('indTipoDocumento')),
                            data_documento=data_doc,
                            nome_fornecedor=str(row.get('txtFornecedor') or "").strip()[:500],
                            cnpj_cpf_fornecedor=str(row.get('txtCNPJCPF') or "").strip()[:20],
                            num_documento=str(row.get('txtNumero') or "").strip()[:100],
                            num_ressarcimento=str(row.get('numRessarcimento') or "").strip()[:100],
                            parcela=parse_int(row.get('numParcela')),
                            tipo_documento=str(row.get('indTipoDocumento') or "")[:100],
                            url_documento=None, # O CSV consolidado não possui a URL do documento por padrão
                            valor_documento=parse_float(row.get('vlrDocumento')),
                            valor_glosa=parse_float(row.get('vlrGlosa')),
                            valor_liquido=parse_float(row.get('vlrLiquido'))
                        )
                    )
                    
                    # Salvar em lotes de 10.000 para gerenciar uso de memória do SQLite
                    if len(despesas_objs) >= 10000:
                        Despesa.objects.bulk_create(despesas_objs, ignore_conflicts=True)
                        despesas_objs = []

            # Inserir registros restantes
            if despesas_objs:
                Despesa.objects.bulk_create(despesas_objs, ignore_conflicts=True)
                
            self.stdout.write(self.style.SUCCESS(f"Importação do ano {ano} concluída com sucesso!"))

        self.stdout.write(self.style.SUCCESS("\nProcesso rápido de coleta de despesas concluído com sucesso!"))
