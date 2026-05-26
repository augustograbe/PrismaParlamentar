import numpy as np
from collections import defaultdict
from itertools import combinations
from django.core.cache import cache

from deputados.models import Deputado, Voto, Votacao, Proposicao, ProposicaoAutor


def calcular_similaridade_filtrada(legislatura=57, max_polarizacao=1.0):
    """
    Calcula similaridade de votos entre deputados excluindo votações
    com polarização acima do threshold.

    Returns: list of dicts with keys: deputado_1, deputado_2, similaridade, votos_em_comum
    """
    # Arredondar para 2 casas para maximizar cache hits
    max_pol_rounded = round(max_polarizacao, 2)
    cache_key = f'sim_filtrada:{legislatura}:{max_pol_rounded}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Buscar deputados da legislatura
    deputados = list(
        Deputado.objects.filter(id_legislatura=legislatura)
        .values_list('id', flat=True)
    )
    if len(deputados) < 2:
        return []

    dep_set = set(deputados)
    dep_list = sorted(deputados)
    dep_index = {dep_id: idx for idx, dep_id in enumerate(dep_list)}
    n_deps = len(dep_list)

    # Votos inválidos (mesma lógica do gerar_grafo_similaridade)
    votos_invalidos = ['Abstenção', 'Não compareceu', 'Art. 17']

    # Buscar votos válidos, filtrando votações por polarização
    votos_qs = Voto.objects.filter(
        deputado_id__in=dep_set
    ).exclude(
        tipo_voto__in=votos_invalidos
    )

    if max_pol_rounded < 1.0:
        votos_qs = votos_qs.filter(votacao__polarizacao__lte=max_pol_rounded)

    # Construir dicionário de votos: {deputado_id: {votacao_id: tipo_voto}}
    votos_por_deputado = defaultdict(dict)
    for dep_id, votacao_id, tipo_voto in votos_qs.values_list(
        'deputado_id', 'votacao_id', 'tipo_voto'
    ):
        votos_por_deputado[dep_id][votacao_id] = tipo_voto

    # Coletar todos os IDs de votação
    all_votacao_ids = set()
    for votes in votos_por_deputado.values():
        all_votacao_ids.update(votes.keys())

    votacao_list = sorted(all_votacao_ids)
    votacao_index = {vid: idx for idx, vid in enumerate(votacao_list)}
    n_votacoes = len(votacao_list)

    if n_votacoes == 0:
        return []

    # Codificar tipos de voto como inteiros
    tipo_encoding = {}
    tipo_counter = 1

    # Montar matriz: deputados × votações
    # 0 = ausente, inteiros positivos = diferentes tipos de voto
    matrix = np.zeros((n_deps, n_votacoes), dtype=np.int8)

    for dep_id, votes in votos_por_deputado.items():
        if dep_id not in dep_index:
            continue
        dep_idx = dep_index[dep_id]
        for votacao_id, tipo_voto in votes.items():
            if votacao_id not in votacao_index:
                continue
            vot_idx = votacao_index[votacao_id]
            if tipo_voto not in tipo_encoding:
                tipo_encoding[tipo_voto] = tipo_counter
                tipo_counter += 1
            matrix[dep_idx, vot_idx] = tipo_encoding[tipo_voto]

    # Calcular similaridade par-a-par com numpy vetorizado
    result = []

    for i in range(n_deps):
        if np.count_nonzero(matrix[i]) == 0:
            continue

        # Comparar deputado i contra todos j > i
        row_i = matrix[i]
        remaining = matrix[i + 1:]

        if remaining.shape[0] == 0:
            break

        # Máscara: ambos presentes
        present_i = row_i != 0
        present_remaining = remaining != 0
        both_present = present_i & present_remaining

        # Contar votos em comum
        votos_em_comum = both_present.sum(axis=1)

        # Contar votos iguais
        equal_votes = (remaining == row_i) & both_present
        votos_iguais = equal_votes.sum(axis=1)

        # Calcular similaridade (evitar divisão por zero)
        valid_mask = votos_em_comum > 0
        similaridade = np.zeros(remaining.shape[0])
        similaridade[valid_mask] = np.round(
            (votos_iguais[valid_mask] / votos_em_comum[valid_mask]) * 100, 2
        )

        # Coletar resultados
        for j_offset in range(remaining.shape[0]):
            j = i + 1 + j_offset
            if votos_em_comum[j_offset] == 0:
                continue
            result.append({
                'deputado_1': dep_list[i],
                'deputado_2': dep_list[j],
                'similaridade': float(similaridade[j_offset]),
                'votos_em_comum': int(votos_em_comum[j_offset]),
            })

    # Cache por 24 horas
    cache.set(cache_key, result, 86400)
    return result


def calcular_coautoria_filtrada(legislatura=57, min_autores=2, max_autores=999):
    """
    Calcula coautorias entre deputados considerando apenas PLs
    com número de autores dentro do range especificado.

    Returns: list of dicts with keys: deputado_1, deputado_2, coautoria
    """
    cache_key = f'coaut_filtrada:{legislatura}:{min_autores}:{max_autores}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    deputados = list(
        Deputado.objects.filter(id_legislatura=legislatura)
        .values_list('id', flat=True)
    )
    if len(deputados) < 2:
        return []

    deps_ids = set(deputados)

    # Filtrar PLs pelo número de autores
    pls_ids = set(
        Proposicao.objects.filter(
            sigla_tipo='PL',
            num_autores_deputados__gte=min_autores,
            num_autores_deputados__lte=max_autores,
        ).values_list('id', flat=True)
    )

    # Carregar autores dos PLs filtrados
    autores_qs = ProposicaoAutor.objects.filter(
        proposicao_id__in=pls_ids,
        deputado_id__in=deps_ids,
    ).values_list('proposicao_id', 'deputado_id')

    proposicao_autores = defaultdict(set)
    for prop_id, dep_id in autores_qs:
        proposicao_autores[prop_id].add(dep_id)

    # Contar coautorias por par
    coautoria_count = defaultdict(int)
    for prop_id, autores in proposicao_autores.items():
        autores_validos = autores.intersection(deps_ids)
        if len(autores_validos) < 2:
            continue
        for d1_id, d2_id in combinations(sorted(autores_validos), 2):
            coautoria_count[(d1_id, d2_id)] += 1

    result = [
        {
            'deputado_1': d1,
            'deputado_2': d2,
            'coautoria': count,
        }
        for (d1, d2), count in coautoria_count.items()
    ]

    # Cache por 24 horas
    cache.set(cache_key, result, 86400)
    return result
