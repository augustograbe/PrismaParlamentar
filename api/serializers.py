from rest_framework import serializers
from deputados.models import Deputado, Orgao, Proposicao, Votacao
from grafos.models import GrafoAresta, BackboneAresta
from analises.models import DeputadoAnalise


class DeputadoSerializer(serializers.ModelSerializer):
    presenca = serializers.SerializerMethodField()

    class Meta:
        model = Deputado
        fields = '__all__'

    def _get_analise(self, obj):
        """Cache the analise lookup per object to avoid repeated queries."""
        cache_attr = '_analise_cache'
        if not hasattr(obj, cache_attr):
            try:
                obj._analise_cache = DeputadoAnalise.objects.get(
                    deputado=obj, legislatura=obj.id_legislatura
                )
            except DeputadoAnalise.DoesNotExist:
                obj._analise_cache = None
        return obj._analise_cache

    def get_presenca(self, obj):
        analise = self._get_analise(obj)
        return analise.presenca_percentual if analise else None


class GrafoArestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrafoAresta
        fields = '__all__'


class BackboneArestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackboneAresta
        fields = '__all__'
