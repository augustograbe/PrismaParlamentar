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


def calcular_coautoria_filtrada(legislatura=57, min_autores=2, max_autores=999, tipos_proposicao='PL'):
    """
    Calcula coautorias entre deputados considerando apenas as proposições
    com número de autores dentro do range especificado e dos tipos indicados (ex: 'PL,PLP,PEC').

    Returns: list of dicts with keys: deputado_1, deputado_2, coautoria
    """
    cache_key = f'coaut_filtrada:{legislatura}:{min_autores}:{max_autores}:{tipos_proposicao}'
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
    tipos_list = tipos_proposicao.split(',')

    # Filtrar proposições pelo tipo e número de autores
    pls_ids = set(
        Proposicao.objects.filter(
            sigla_tipo__in=tipos_list,
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


def calcular_backbone_filtrado(
    tipo_grafo='similaridade',
    metodo='lans',
    legislatura=57,
    max_polarizacao=1.0,
    min_autores=2,
    max_autores=999,
    densidade=None,
    tipos_proposicao='PL'
):
    """
    Calcula dinamicamente o backbone (LANS ou High Salience Skeleton)
    considerando todos os outros filtros avançados aplicados (polarização, coautores ou tipos de proposição).
    """
    if densidade is None:
        densidade = 0.1 if tipo_grafo == 'similaridade' else 0.05

    # Arredondar polarização para evitar redundância no cache
    max_pol_rounded = round(max_polarizacao, 2)
    cache_key = f'backbone_filtrado:{tipo_grafo}:{metodo}:{legislatura}:{max_pol_rounded}:{min_autores}:{max_autores}:{densidade}:{tipos_proposicao}'
    
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    import networkx as nx
    import netbone as nb

    # 1. Obter arestas filtradas
    if tipo_grafo == 'similaridade':
        arestas_filtradas = calcular_similaridade_filtrada(
            legislatura=legislatura,
            max_polarizacao=max_polarizacao,
        )
        G = nx.Graph()
        for aresta in arestas_filtradas:
            peso = aresta['similaridade']
            # Pré-filtragem de similaridade >= 80% idêntica ao script estático
            if peso >= 80.0:
                G.add_edge(aresta['deputado_1'], aresta['deputado_2'], weight=float(peso))
    elif tipo_grafo == 'coautoria':
        arestas_filtradas = calcular_coautoria_filtrada(
            legislatura=legislatura,
            min_autores=min_autores,
            max_autores=max_autores,
            tipos_proposicao=tipos_proposicao,
        )
        G = nx.Graph()
        for aresta in arestas_filtradas:
            peso = aresta['coautoria']
            if peso >= 1:
                G.add_edge(aresta['deputado_1'], aresta['deputado_2'], weight=float(peso))
    else:
        return []

    if G.number_of_edges() == 0:
        return []

    # 2. Computar backbone
    if metodo == 'high_salience_skeleton':
        backbone_result = nb.high_salience_skeleton(G)
    elif metodo == 'lans':
        backbone_result = nb.lans(G)
    else:
        return []

    # 3. Filtrar pela densidade desejada
    filtered_graph = nb.fraction_filter(backbone_result, densidade)

    # 4. Formatar resultado compatível com serializer
    resultado = []
    for n1, n2, data in filtered_graph.edges(data=True):
        peso = data.get('weight', 0.0)
        resultado.append({
            'deputado_1': int(min(n1, n2)),
            'deputado_2': int(max(n1, n2)),
            'peso': float(peso),
            'legislatura': legislatura,
            'metodo': metodo,
            'tipo_grafo': tipo_grafo,
        })

    # Cache por 24 horas
    cache.set(cache_key, resultado, 86400)
    return resultado

