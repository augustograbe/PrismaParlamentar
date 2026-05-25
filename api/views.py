from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from deputados.models import Deputado, ProposicaoAutor
from grafos.models import GrafoAresta, BackboneAresta
from analises.services import calcular_comunidades_coautoria, calcular_comunidades_votos
from .serializers import DeputadoSerializer, GrafoArestaSerializer, BackboneArestaSerializer, AtividadeDiariaSerializer


class DeputadoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Deputado.objects.all()
    serializer_class = DeputadoSerializer

    @action(detail=True, methods=['get'])
    def atividades(self, request, pk=None):
        deputado = self.get_object()
        atividades = deputado.atividades_diarias.all().order_by('data')
        serializer = AtividadeDiariaSerializer(atividades, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def estatisticas_gerais(self, request, pk=None):
        deputado = self.get_object()
        
        total_discursos = deputado.discursos.count()
        
        proposicoes_qs = ProposicaoAutor.objects.filter(
            deputado=deputado,
            proposicao__sigla_tipo__in=['PL', 'PLP', 'PEC']
        ).select_related('proposicao')
        total_proposicoes = proposicoes_qs.count()


        tipos_proposicao = {}
        for pa in proposicoes_qs:
            prop = pa.proposicao
            tipo = prop.sigla_tipo or 'Outros'
            situacao = prop.situacao or 'Desconhecida'

            if tipo not in tipos_proposicao:
                tipos_proposicao[tipo] = {'total': 0, 'situacoes': {}}
            
            tipos_proposicao[tipo]['total'] += 1
            if situacao not in tipos_proposicao[tipo]['situacoes']:
                tipos_proposicao[tipo]['situacoes'][situacao] = 0
            tipos_proposicao[tipo]['situacoes'][situacao] += 1

        return Response({
            'total_discursos': total_discursos,
            'total_proposicoes': total_proposicoes,
            'tipos_proposicao': tipos_proposicao
        })

    @action(detail=True, methods=['get'])
    def despesas(self, request, pk=None):
        deputado = self.get_object()
        
        from datetime import datetime
        ano_corrente = datetime.now().year
        try:
            selected_year = int(request.query_params.get('ano', ano_corrente))
        except ValueError:
            selected_year = ano_corrente
            
        despesas_ano = deputado.despesas.filter(ano=selected_year)
        
        from django.db import models
        total_gasto_ano = despesas_ano.aggregate(total=models.Sum('valor_liquido'))['total'] or 0.0
        total_gasto_ano = float(total_gasto_ano)
        
        # Limite da cota CEAP por estado reajustado
        LIMITS_BY_STATE = {
            'AC': 57359.87, 'AL': 53164.36, 'AM': 56151.46, 'AP': 55929.26,
            'BA': 50965.29, 'CE': 54879.34, 'DF': 41612.55, 'ES': 49160.15,
            'GO': 46979.73, 'MA': 54537.99, 'MG': 47645.91, 'MS': 52707.93,
            'MT': 51439.83, 'PA': 54624.17, 'PB': 54402.48, 'PE': 53997.81,
            'PI': 53195.84, 'PR': 50807.19, 'RJ': 47267.41, 'RN': 55198.09,
            'RO': 56267.90, 'RR': 58474.70, 'RS': 53086.78, 'SC': 51951.42,
            'SE': 52248.86, 'SP': 48727.46, 'TO': 51525.80
        }
        
        uf = deputado.sigla_uf or 'SP'
        limite_mensal = LIMITS_BY_STATE.get(uf.upper(), 50000.00)
        limite_anual = limite_mensal * 12
        percentual_gasto_ano = (total_gasto_ano / limite_anual) * 100 if limite_anual > 0 else 0
        
        gastos_mensais_raw = despesas_ano.values('mes').annotate(total=models.Sum('valor_liquido')).order_by('mes')
        gastos_mensais_map = {item['mes']: float(item['total']) for item in gastos_mensais_raw}
        
        all_despesas_ano = list(despesas_ano.only(
            'tipo_despesa', 'nome_fornecedor', 'cnpj_cpf_fornecedor',
            'valor_liquido', 'data_documento', 'num_documento', 'url_documento', 'mes'
        ))
        
        # Grouping in memory for year aggregate
        grouped_ano = {}
        for d in all_despesas_ano:
            tipo = d.tipo_despesa
            fornecedor_nome = d.nome_fornecedor or "Não Identificado"
            fornecedor_cnpj = d.cnpj_cpf_fornecedor or ""
            valor = float(d.valor_liquido)
            
            if tipo not in grouped_ano:
                grouped_ano[tipo] = {
                    'tipo': tipo,
                    'valor': 0.0,
                    'fornecedores_map': {}
                }
            
            grouped_ano[tipo]['valor'] += valor
            
            forn_key = (fornecedor_cnpj, fornecedor_nome)
            if forn_key not in grouped_ano[tipo]['fornecedores_map']:
                grouped_ano[tipo]['fornecedores_map'][forn_key] = {
                    'nome': fornecedor_nome,
                    'cnpj_cpf': fornecedor_cnpj,
                    'valor': 0.0,
                    'despesas': []
                }
            
            grouped_ano[tipo]['fornecedores_map'][forn_key]['valor'] += valor
            grouped_ano[tipo]['fornecedores_map'][forn_key]['despesas'].append({
                'id': d.id,
                'data': d.data_documento.strftime('%Y-%m-%d') if d.data_documento else None,
                'valor': valor,
                'num_documento': d.num_documento,
                'url_documento': d.url_documento
            })

        detalhes_ano = []
        for tipo, data in grouped_ano.items():
            fornecedores_list = []
            for forn_key, forn_data in data['fornecedores_map'].items():
                forn_data['despesas'].sort(key=lambda x: x['data'] or '', reverse=True)
                fornecedores_list.append(forn_data)
            
            fornecedores_list.sort(key=lambda x: x['valor'], reverse=True)
            
            detalhes_ano.append({
                'tipo': tipo,
                'valor': data['valor'],
                'percentual': (data['valor'] / total_gasto_ano) * 100 if total_gasto_ano > 0 else 0,
                'empresas': fornecedores_list
            })
        
        detalhes_ano.sort(key=lambda x: x['valor'], reverse=True)

        # Grouping in memory for month-by-month
        grouped_mensal = {m: {} for m in range(1, 13)}
        for d in all_despesas_ano:
            m = d.mes
            tipo = d.tipo_despesa
            fornecedor_nome = d.nome_fornecedor or "Não Identificado"
            fornecedor_cnpj = d.cnpj_cpf_fornecedor or ""
            valor = float(d.valor_liquido)
            
            if tipo not in grouped_mensal[m]:
                grouped_mensal[m][tipo] = {
                    'tipo': tipo,
                    'valor': 0.0,
                    'fornecedores_map': {}
                }
                
            grouped_mensal[m][tipo]['valor'] += valor
            
            forn_key = (fornecedor_cnpj, fornecedor_nome)
            if forn_key not in grouped_mensal[m][tipo]['fornecedores_map']:
                grouped_mensal[m][tipo]['fornecedores_map'][forn_key] = {
                    'nome': fornecedor_nome,
                    'cnpj_cpf': fornecedor_cnpj,
                    'valor': 0.0,
                    'despesas': []
                }
                
            grouped_mensal[m][tipo]['fornecedores_map'][forn_key]['valor'] += valor
            grouped_mensal[m][tipo]['fornecedores_map'][forn_key]['despesas'].append({
                'id': d.id,
                'data': d.data_documento.strftime('%Y-%m-%d') if d.data_documento else None,
                'valor': valor,
                'num_documento': d.num_documento,
                'url_documento': d.url_documento
            })
            
        gastos_por_mes = []
        for m in range(1, 13):
            total_mes = gastos_mensais_map.get(m, 0.0)
            
            detalhes_mes = []
            for tipo, data in grouped_mensal[m].items():
                fornecedores_list = []
                for forn_key, forn_data in data['fornecedores_map'].items():
                    forn_data['despesas'].sort(key=lambda x: x['data'] or '', reverse=True)
                    fornecedores_list.append(forn_data)
                
                fornecedores_list.sort(key=lambda x: x['valor'], reverse=True)
                
                detalhes_mes.append({
                    'tipo': tipo,
                    'valor': data['valor'],
                    'percentual': (data['valor'] / total_mes) * 100 if total_mes > 0 else 0,
                    'empresas': fornecedores_list
                })
                
            detalhes_mes.sort(key=lambda x: x['valor'], reverse=True)
            
            gastos_por_mes.append({
                'mes': m,
                'total': total_mes,
                'percentual_limite': (total_mes / limite_mensal) * 100 if limite_mensal > 0 else 0,
                'detalhes': detalhes_mes
            })
            
        return Response({
            'ano': selected_year,
            'limite_mensal': limite_mensal,
            'limite_anual': limite_anual,
            'total_gasto_ano': total_gasto_ano,
            'percentual_gasto_ano': percentual_gasto_ano,
            'gastos_por_mes': gastos_por_mes,
            'detalhes_ano': detalhes_ano
        })


class GrafoArestaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GrafoAresta.objects.all()
    serializer_class = GrafoArestaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Opcionalmente filtrar por mínimo de similaridade para não travar o frontend
        min_sim = self.request.query_params.get('min_similaridade', None)
        if min_sim is not None:
            queryset = queryset.filter(similaridade__gte=float(min_sim))
        else:
            # Se não fornecer, retorna um padrão alto para evitar 200 mil arestas de uma vez (ex: 80%)
            queryset = queryset.filter(similaridade__gte=80.0)
            
        return queryset


class ArestaCoautoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoint para arestas de coautoria (apenas pares com coautoria >= 1)."""
    queryset = GrafoAresta.objects.all()
    serializer_class = GrafoArestaSerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(coautoria__gte=1)
        
        # Filtro opcional por mínimo de coautorias
        min_coautoria = self.request.query_params.get('min_coautoria', None)
        if min_coautoria is not None:
            queryset = queryset.filter(coautoria__gte=int(min_coautoria))
            
        return queryset


class ComunidadesVotosView(APIView):
    def get(self, request):
        try:
            legislatura = int(request.query_params.get('legislatura', 57))
            min_similaridade = float(request.query_params.get('min_similaridade', 80))
            max_similaridade = float(request.query_params.get('max_similaridade', 100))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'legislatura, min_similaridade e max_similaridade devem ser numericos.'},
                status=400,
            )

        algoritmo = request.query_params.get('algoritmo', 'louvain').lower()

        if min_similaridade > max_similaridade:
            return Response(
                {'detail': 'min_similaridade deve ser menor ou igual a max_similaridade.'},
                status=400,
            )

        try:
            resultado = calcular_comunidades_votos(
                legislatura=legislatura,
                min_similaridade=min_similaridade,
                max_similaridade=max_similaridade,
                algoritmo=algoritmo,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)

        return Response(resultado)


class ComunidadesCoautoriaView(APIView):
    def get(self, request):
        try:
            legislatura = int(request.query_params.get('legislatura', 57))
            min_coautoria = int(request.query_params.get('min_coautoria', 1))
            max_coautoria = int(request.query_params.get('max_coautoria', 999))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'legislatura, min_coautoria e max_coautoria devem ser numericos.'},
                status=400,
            )

        algoritmo = request.query_params.get('algoritmo', 'louvain').lower()

        if min_coautoria > max_coautoria:
            return Response(
                {'detail': 'min_coautoria deve ser menor ou igual a max_coautoria.'},
                status=400,
            )

        try:
            resultado = calcular_comunidades_coautoria(
                legislatura=legislatura,
                min_coautoria=min_coautoria,
                max_coautoria=max_coautoria,
                algoritmo=algoritmo,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)

        return Response(resultado)


class BackboneArestaViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoint para arestas de backbone pré-calculadas."""
    queryset = BackboneAresta.objects.all()
    serializer_class = BackboneArestaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro obrigatório: método do backbone
        metodo = self.request.query_params.get('metodo', None)
        if metodo:
            queryset = queryset.filter(metodo=metodo)

        # Filtro obrigatório: tipo de grafo
        tipo_grafo = self.request.query_params.get('tipo_grafo', None)
        if tipo_grafo:
            queryset = queryset.filter(tipo_grafo=tipo_grafo)

        # Filtro opcional: legislatura
        legislatura = self.request.query_params.get('legislatura', None)
        if legislatura:
            queryset = queryset.filter(legislatura=int(legislatura))

        return queryset


class DeputadoDespesasTotaisView(APIView):
    def get(self, request):
        from deputados.models import Despesa
        from django.db.models import Sum
        
        ano = request.query_params.get('ano', '')
        categoria = request.query_params.get('categoria', '')
        
        qs = Despesa.objects.all()
        
        if ano and ano != 'mandato':
            try:
                qs = qs.filter(ano=int(ano))
            except ValueError:
                pass
                
        if categoria and categoria != 'Todas':
            qs = qs.filter(tipo_despesa=categoria)
            
        aggregates = qs.values('deputado_id').annotate(total=Sum('valor_liquido'))
        
        resultado = {str(item['deputado_id']): float(item['total']) for item in aggregates}
        return Response(resultado)


class DespesasCategoriasView(APIView):
    def get(self, request):
        from deputados.models import Despesa
        categorias = Despesa.objects.values_list('tipo_despesa', flat=True).distinct().order_by('tipo_despesa')
        return Response(list(categorias))


class DeputadoDiscursosTotaisView(APIView):
    def get(self, request):
        from deputados.models import Discurso
        from django.db.models import Count
        
        aggregates = Discurso.objects.values('deputado_id').annotate(total=Count('id'))
        resultado = {str(item['deputado_id']): item['total'] for item in aggregates}
        return Response(resultado)


class DeputadoProposicoesTotaisView(APIView):
    def get(self, request):
        from deputados.models import ProposicaoAutor
        from django.db.models import Count
        
        tipo = request.query_params.get('tipo', 'PL+PLP+PEC')
        
        qs = ProposicaoAutor.objects.all()
        
        if tipo == 'PL+PLP+PEC' or not tipo:
            qs = qs.filter(proposicao__sigla_tipo__in=['PL', 'PLP', 'PEC'])
        else:
            qs = qs.filter(proposicao__sigla_tipo=tipo)
            
        aggregates = qs.values('deputado_id').annotate(total=Count('id'))
        resultado = {str(item['deputado_id']): item['total'] for item in aggregates}
        return Response(resultado)
