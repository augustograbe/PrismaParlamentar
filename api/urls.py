from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ArestaCoautoriaViewSet,
    BackboneArestaViewSet,
    ComunidadesCoautoriaView,
    ComunidadesVotosView,
    DeputadoViewSet,
    GrafoArestaViewSet,
)

router = DefaultRouter()
router.register(r'deputados', DeputadoViewSet)
router.register(r'arestas', GrafoArestaViewSet)
router.register(r'arestas-coautoria', ArestaCoautoriaViewSet, basename='arestas-coautoria')
router.register(r'arestas-backbone', BackboneArestaViewSet, basename='arestas-backbone')

urlpatterns = [
    path('comunidades-votos/', ComunidadesVotosView.as_view(), name='comunidades-votos'),
    path('comunidades-coautoria/', ComunidadesCoautoriaView.as_view(), name='comunidades-coautoria'),
    path('', include(router.urls)),
]
