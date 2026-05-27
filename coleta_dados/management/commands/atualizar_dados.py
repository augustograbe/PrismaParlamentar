import requests
import traceback
import time
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.management import call_command
from django.core.management.base import BaseCommand
from deputados.models import (
    Partido, Deputado, Orgao, Proposicao, Votacao, Voto, 
    ProposicaoAutor, Discurso, PresencaEvento, Despesa
)
from coleta_dados.models import ExecucaoUpdate
from tqdm import tqdm

class Command(BaseCommand):
    help = 'Executa atualização diária incremental buscando novos dados na API da Câmara e atualiza os grafos e análises com visualização de progresso.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--desde',
            type=str,
            default=None,
            help='Data inicial para buscar novos dados (formato AAAA-MM-DD). Se omitido, busca desde a última execução bem-sucedida.'
        )
        parser.add_argument(
            '--legislatura',
            type=int,
            default=57,
            help='ID da Legislatura padrão para deputados (padrão: 57)'
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
        start_time = time.time()
        leg = options['legislatura']
        hoje = datetime.now().date()
        hoje_str = hoje.strftime('%Y-%m-%d')
        
        # 1. Criar registro inicial de execução (sucesso=False por padrão até concluir tudo)
        exec_log = ExecucaoUpdate.objects.create(
            data_inicio=timezone.now(),
            sucesso=False
        )
        self.stdout.write(self.style.WARNING(f"Iniciando atualização diária incremental (ID Log: {exec_log.id})..."))

        try:
            # 2. Definir a data de início da busca
            desde_opt = options['desde']
            if desde_opt:
                try:
                    data_inicio_busca = datetime.strptime(desde_opt, '%Y-%m-%d').date()
                except ValueError:
                    raise Exception("Formato de data '--desde' inválido. Use AAAA-MM-DD.")
            else:
                # Buscar última execução de sucesso
                ultima_exec = ExecucaoUpdate.objects.filter(sucesso=True).order_by('-data_inicio').first()
                if ultima_exec:
                    # Retroceder 1 dia da data de início para cobrir eventuais delays de atualização da API
                    data_inicio_busca = (ultima_exec.data_inicio - timedelta(days=1)).date()
                else:
                    # Default: Ontem
                    data_inicio_busca = hoje - timedelta(days=1)
            
            data_inicio_str = data_inicio_busca.strftime('%Y-%m-%d')
            self.stdout.write(f"Buscando novos dados na API desde: {data_inicio_str} até {hoje_str}")
            
            detalhes_execucao = {
                'data_inicio_busca': data_inicio_str,
                'data_fim_busca': hoje_str
            }

            # 3. Atualizar Partidos (Muito Rápido)
            self.stdout.write(self.style.WARNING("\n>> Atualizando Partidos..."))
            partidos_dados = self.get_api_data("https://dadosabertos.camara.leg.br/api/v2/partidos")
            partidos_count = 0
            for p in tqdm(partidos_dados, desc="Processando Partidos"):
                _, created = Partido.objects.update_or_create(
                    id=p['id'],
                    defaults={'sigla': p['sigla'], 'nome': p['nome'], 'uri': p['uri']}
                )
                if created: partidos_count += 1
            exec_log.partidos_atualizados = partidos_count
            self.stdout.write(f"Partidos novos adicionados: {partidos_count}")

            # 4. Atualizar Deputados (Legislatura Atual)
            self.stdout.write(self.style.WARNING("\n>> Atualizando Deputados e Detalhes..."))
            deputados_dados = self.get_api_data("https://dadosabertos.camara.leg.br/api/v2/deputados", {'idLegislatura': leg})
            deputados_count = 0
            deps_ids = set()
            
            for d in tqdm(deputados_dados, desc="Processando Deputados"):
                deps_ids.add(d['id'])
                partido = Partido.objects.filter(sigla=d['siglaPartido']).first()
                
                # Buscar detalhes
                detalhes_url = f"https://dadosabertos.camara.leg.br/api/v2/deputados/{d['id']}"
                try:
                    res = requests.get(detalhes_url, timeout=10)
                    res.raise_for_status()
                    detalhes = res.json().get('dados', {})
                    ultimo_status = detalhes.get('ultimoStatus', {})
                except Exception as e:
                    self.stderr.write(f"Erro ao buscar detalhes do deputado {d['id']}: {e}")
                    detalhes = {}
                    ultimo_status = {}

                dep_obj, created = Deputado.objects.update_or_create(
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
                if created: deputados_count += 1
            exec_log.deputados_atualizados = deputados_count
            self.stdout.write(f"Deputados novos adicionados: {deputados_count}")

            # 5. Atualizar Órgãos
            self.stdout.write(self.style.WARNING("\n>> Atualizando Órgãos..."))
            orgaos_dados = self.get_api_data("https://dadosabertos.camara.leg.br/api/v2/orgaos")
            orgaos_count = 0
            for o in tqdm(orgaos_dados, desc="Processando Órgãos"):
                _, created = Orgao.objects.update_or_create(
                    id=o['id'],
                    defaults={
                        'uri': o['uri'],
                        'sigla': o['sigla'],
                        'nome': o['nome'],
                        'tipo_orgao': o.get('tipoOrgao', '')
                    }
                )
                if created: orgaos_count += 1
            exec_log.orgaos_atualizados = orgaos_count
            self.stdout.write(f"Órgãos novos adicionados: {orgaos_count}")

            # 6. Atualizar Votações e Votos (Incremental por data)
            self.stdout.write(self.style.WARNING("\n>> Atualizando Votações e Votos (Incremental)..."))
            votacoes_dados = self.get_api_data("https://dadosabertos.camara.leg.br/api/v2/votacoes", {
                'dataInicio': data_inicio_str,
                'dataFim': hoje_str,
                'ordem': 'ASC',
                'ordenarPor': 'dataHoraRegistro'
            })
            self.stdout.write(f"Votações encontradas no período: {len(votacoes_dados)}")
            
            votacoes_count = 0
            votos_count = 0
            
            for v in tqdm(votacoes_dados, desc="Processando Votações"):
                v_id = str(v['id'])
                
                # Buscar detalhes completos da votação para pegar o órgão, proposição, descrição e resultado
                details_url = f"https://dadosabertos.camara.leg.br/api/v2/votacoes/{v_id}"
                try:
                    res = requests.get(details_url, timeout=10)
                    res.raise_for_status()
                    details = res.json().get('dados', {})
                except Exception as e:
                    self.stderr.write(f"Erro ao buscar detalhes da votação {v_id}: {e}")
                    details = {}

                # Parsing data
                dh = details.get('dataHora')
                data_v = dh[:10] if dh and len(dh) >= 10 else None
                
                # Órgão
                id_orgao = details.get('idOrgao')
                orgao = Orgao.objects.filter(id=id_orgao).first() if id_orgao else None
                
                # Proposição vinculada
                prop_obj = details.get('proposicaoObjeto')
                proposicao = None
                if prop_obj and prop_obj.get('id'):
                    proposicao = Proposicao.objects.filter(id=prop_obj['id']).first()
                    
                # Aprovada
                aprovada_val = details.get('aprovada')
                if aprovada_val is True or aprovada_val == 1:
                    aprovada = 1
                elif aprovada_val is False or aprovada_val == 0:
                    aprovada = 0
                else:
                    aprovada = None

                # Salvar/atualizar Votação
                vot_obj, created = Votacao.objects.update_or_create(
                    id=v_id,
                    defaults={
                        'uri': details.get('uri'),
                        'data': data_v,
                        'data_hora': dh,
                        'orgao': orgao,
                        'proposicao': proposicao,
                        'descricao': details.get('descricao', ''),
                        'aprovada': aprovada
                    }
                )
                if created: votacoes_count += 1
                
                # Buscar votos individuais desta votação
                votos_dados = self.get_api_data(f"https://dadosabertos.camara.leg.br/api/v2/votacoes/{v_id}/votos")
                votos_objs = []
                for vt in votos_dados:
                    dep_info = vt.get('deputado')
                    if not dep_info or not dep_info.get('id'):
                        continue
                    
                    dep_id = dep_info['id']
                    # Apenas guardar se for um deputado cadastrado em nossa base
                    if dep_id in deps_ids:
                        dh_reg = vt.get('dataHoraRegistro') or dh
                        votos_objs.append(
                            Voto(
                                votacao=vot_obj,
                                deputado_id=dep_id,
                                tipo_voto=str(vt.get('tipoVoto', '')).strip(),
                                data_registro=dh_reg
                            )
                        )
                
                if votos_objs:
                    Voto.objects.bulk_create(votos_objs, ignore_conflicts=True)
                    votos_count += len(votos_objs)

            exec_log.votacoes_adicionadas = votacoes_count
            exec_log.votos_adicionados = votos_count
            self.stdout.write(f"Novas votações salvas: {votacoes_count}")
            self.stdout.write(f"Novos votos individuais processados: {votos_count}")

            # 7. Atualizar Proposições (Incremental)
            self.stdout.write(self.style.WARNING("\n>> Atualizando Proposições e Autores (Incremental)..."))
            # Filtra por dataInicio (atividades e tramitações no período)
            props_dados = self.get_api_data("https://dadosabertos.camara.leg.br/api/v2/proposicoes", {
                'dataInicio': data_inicio_str,
                'dataFim': hoje_str,
                'ordem': 'ASC',
                'ordenarPor': 'id'
            })
            self.stdout.write(f"Proposições com movimentação no período: {len(props_dados)}")
            
            props_count = 0
            autores_count = 0
            
            for p in tqdm(props_dados, desc="Processando Proposições"):
                p_id = p['id']
                
                # Obter detalhes completos da proposição
                detail_url = f"https://dadosabertos.camara.leg.br/api/v2/proposicoes/{p_id}"
                try:
                    res = requests.get(detail_url, timeout=10)
                    res.raise_for_status()
                    details = res.json().get('dados', {})
                except Exception as e:
                    self.stderr.write(f"Erro ao buscar detalhes da proposição {p_id}: {e}")
                    details = {}

                # Salvar ou atualizar proposição
                prop_obj, created = Proposicao.objects.update_or_create(
                    id=p_id,
                    defaults={
                        'uri': details.get('uri', ''),
                        'sigla_tipo': details.get('siglaTipo', ''),
                        'numero': details.get('numero') if details.get('numero') else None,
                        'ano': details.get('ano') if details.get('ano') else None,
                        'ementa': details.get('ementa', ''),
                        'situacao': details.get('statusProposicao', {}).get('descricaoSituacao', '')
                    }
                )
                if created: props_count += 1

                # Coletar autores da proposição
                autores_dados = self.get_api_data(f"https://dadosabertos.camara.leg.br/api/v2/proposicoes/{p_id}/autores")
                for aut in autores_dados:
                    # A API da Câmara fornece a URI do autor. Se for deputado, extraímos o ID final.
                    uri_aut = aut.get('uri', '')
                    if 'deputados/' in uri_aut:
                        try:
                            dep_id = int(uri_aut.split('deputados/')[-1])
                            if dep_id in deps_ids:
                                _, aut_created = ProposicaoAutor.objects.get_or_create(
                                    proposicao=prop_obj,
                                    deputado_id=dep_id
                                )
                                if aut_created: autores_count += 1
                        except Exception:
                            continue

            exec_log.proposicoes_adicionadas = props_count
            exec_log.autores_adicionados = autores_count
            self.stdout.write(f"Novas proposições adicionadas/atualizadas: {props_count}")
            self.stdout.write(f"Novas autorias vinculadas: {autores_count}")

            # 8. Atualizar Discursos (Incremental)
            self.stdout.write(self.style.WARNING("\n>> Atualizando Discursos dos Deputados (Incremental)..."))
            discursos_count = 0
            for d_id in tqdm(deps_ids, desc="Coletando Discursos por Deputado"):
                disc_dados = self.get_api_data(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{d_id}/discursos", {
                    'dataInicio': data_inicio_str,
                    'dataFim': hoje_str
                })
                disc_objs = []
                for ds in disc_dados:
                    dh_inicio = ds.get('dataHoraInicio')
                    if not dh_inicio:
                        continue
                    
                    disc_objs.append(
                        Discurso(
                            deputado_id=d_id,
                            data_hora_inicio=dh_inicio,
                            tipo_evento=ds.get('faseEvento', {}).get('titulo', ''),
                            fase_evento=ds.get('tipoDiscurso', ''),
                            transcricao=ds.get('transcricao', '')
                        )
                    )
                if disc_objs:
                    Discurso.objects.bulk_create(disc_objs, ignore_conflicts=True)
                    discursos_count += len(disc_objs)
            exec_log.discursos_adicionados = discursos_count
            self.stdout.write(f"Novos discursos inseridos: {discursos_count}")

            # 9. Atualizar Presenças (Incremental)
            self.stdout.write(self.style.WARNING("\n>> Atualizando Presenças em Eventos (Incremental)..."))
            presencas_count = 0
            for d_id in tqdm(deps_ids, desc="Coletando Presenças por Deputado"):
                eventos_dados = self.get_api_data(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{d_id}/eventos", {
                    'dataInicio': data_inicio_str,
                    'dataFim': hoje_str
                })
                pres_objs = []
                for ev in eventos_dados:
                    data_p = str(ev.get('dataHoraInicio', ''))[:10]
                    if not data_p:
                        continue
                    
                    pres_objs.append(
                        PresencaEvento(
                            id_evento=ev.get('id'),
                            deputado_id=d_id,
                            data_presenca=data_p,
                            tipo_participacao='Titular',
                            status_presenca='Presente'
                        )
                    )
                if pres_objs:
                    PresencaEvento.objects.bulk_create(pres_objs, ignore_conflicts=True)
                    presencas_count += len(pres_objs)
            exec_log.presencas_adicionadas = presencas_count
            self.stdout.write(f"Novas presenças registradas: {presencas_count}")

            # 10. Atualizar Despesas (Apenas do Ano Corrente)
            self.stdout.write(self.style.WARNING("\n>> Atualizando Despesas do Ano Corrente..."))
            ano_corrente = hoje.year
            # Chamada de comando de despesas para o ano atual
            despesas_antes = Despesa.objects.filter(ano=ano_corrente).count()
            
            self.stdout.write(f"Chamando coletar_despesas para o ano {ano_corrente}...")
            call_command('coletar_despesas', ano=[ano_corrente])
            
            despesas_depois = Despesa.objects.filter(ano=ano_corrente).count()
            novas_despesas = max(0, despesas_depois - despesas_antes)
            exec_log.despesas_adicionadas = novas_despesas
            self.stdout.write(f"Novas despesas processadas no ano {ano_corrente}: {novas_despesas}")

            # 11. Recalcular Grafos e Análises (Para manter tudo sincronizado)
            self.stdout.write(self.style.WARNING("\n>> Recalculando Grafos Políticos e Análises..."))
            
            self.stdout.write("-> Gerando grafo de similaridade de votos...")
            call_command('gerar_grafo_similaridade', legislatura=leg)
            
            self.stdout.write("-> Gerando grafo de coautoria...")
            call_command('gerar_grafo_coautoria', legislatura=leg)
            
            self.stdout.write("-> Calculando metadados de polarização e autores...")
            call_command('calcular_metadados_grafos', legislatura=leg)
            
            self.stdout.write("-> Gerando backbones de rede...")
            call_command('gerar_backbones', legislatura=leg)
            
            self.stdout.write("-> Recalculando análises e atividade diária...")
            call_command('gerar_analises', legislatura=leg)

            # 12. Finalizar registro de execução de sucesso
            exec_log.sucesso = True
            exec_log.tempo_execucao_segundos = round(time.time() - start_time, 2)
            exec_log.data_fim = timezone.now()
            exec_log.detalhes = detalhes_execucao
            exec_log.save()

            self.stdout.write(self.style.SUCCESS(
                f"\n[SUCESSO] Atualização diária incremental concluída em {exec_log.tempo_execucao_segundos} segundos!"
            ))

        except Exception as e:
            # Capturar falhas críticas, salvar no banco e levantar o erro
            exec_log.sucesso = False
            exec_log.erro_mensagem = traceback.format_exc()
            exec_log.data_fim = timezone.now()
            exec_log.tempo_execucao_segundos = round(time.time() - start_time, 2)
            exec_log.save()
            
            self.stdout.write(self.style.ERROR(
                f"\n[FALHA] Erro crítico ocorrido durante a execução: {e}\nTraceback salvo no log (ID: {exec_log.id})"
            ))
            raise e
