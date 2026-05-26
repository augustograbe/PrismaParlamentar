from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ArestaCoautoriaViewSet,
    ArestasCoautoriaFiltradaView,
    ArestasSimilaridadeFiltradaView,
    ArestasBackboneFiltradaView,
    BackboneArestaViewSet,
    ComunidadesCoautoriaView,
    ComunidadesVotosView,
    DeputadoViewSet,
    GrafoArestaViewSet,
    DeputadoDespesasTotaisView,
    DespesasCategoriasView,
    DeputadoDiscursosTotaisView,
    DeputadoProposicoesTotaisView,
)

router = DefaultRouter()
router.register(r'deputados', DeputadoViewSet)
router.register(r'arestas', GrafoArestaViewSet)
router.register(r'arestas-coautoria', ArestaCoautoriaViewSet, basename='arestas-coautoria')
router.register(r'arestas-backbone', BackboneArestaViewSet, basename='arestas-backbone')

urlpatterns = [
    path('comunidades-votos/', ComunidadesVotosView.as_view(), name='comunidades-votos'),
    path('comunidades-coautoria/', ComunidadesCoautoriaView.as_view(), name='comunidades-coautoria'),
    path('deputados-despesas-totais/', DeputadoDespesasTotaisView.as_view(), name='deputados-despesas-totais'),
    path('despesas-categorias/', DespesasCategoriasView.as_view(), name='despesas-categorias'),
    path('deputados-discursos-totais/', DeputadoDiscursosTotaisView.as_view(), name='deputados-discursos-totais'),
    path('deputados-proposicoes-totais/', DeputadoProposicoesTotaisView.as_view(), name='deputados-proposicoes-totais'),
    path('arestas-similaridade-filtrada/', ArestasSimilaridadeFiltradaView.as_view(), name='arestas-similaridade-filtrada'),
    path('arestas-coautoria-filtrada/', ArestasCoautoriaFiltradaView.as_view(), name='arestas-coautoria-filtrada'),
    path('arestas-backbone-filtrada/', ArestasBackboneFiltradaView.as_view(), name='arestas-backbone-filtrada'),
    path('', include(router.urls)),
]

