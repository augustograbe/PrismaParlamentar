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
