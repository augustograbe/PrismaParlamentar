import networkx as nx
from django.core.cache import cache

from grafos.models import GrafoAresta


ALGORITMOS_COMUNIDADE = {'louvain', 'leiden'}


def construir_grafo_votos_por_similaridade(legislatura, min_similaridade, max_similaridade):
    G = nx.Graph()
    arestas = GrafoAresta.objects.filter(
        legislatura=legislatura,
        similaridade__gte=min_similaridade,
        similaridade__lte=max_similaridade,
    ).values_list('deputado_1_id', 'deputado_2_id', 'similaridade')

    for d1, d2, peso in arestas:
        G.add_edge(str(d1), str(d2), weight=float(peso))

    return G


def construir_grafo_coautoria_por_quantidade(legislatura, min_coautoria, max_coautoria):
    G = nx.Graph()
    arestas = GrafoAresta.objects.filter(
        legislatura=legislatura,
        coautoria__gte=min_coautoria,
        coautoria__lte=max_coautoria,
    ).values_list('deputado_1_id', 'deputado_2_id', 'coautoria')

    for d1, d2, peso in arestas:
        G.add_edge(str(d1), str(d2), weight=float(peso))

    return G


def executar_louvain(G):
    import community as community_louvain

    if G.number_of_nodes() == 0:
        return {}

    return community_louvain.best_partition(G, weight='weight', random_state=42)


def executar_leiden(G):
    import igraph as ig
    import leidenalg

    if G.number_of_nodes() == 0:
        return {}

    nodes = list(G.nodes())
    node_to_idx = {node: i for i, node in enumerate(nodes)}

    ig_graph = ig.Graph()
    ig_graph.add_vertices(len(nodes))
    ig_graph.vs['name'] = nodes

    edges = []
    weights = []
    for u, v, data in G.edges(data=True):
        edges.append((node_to_idx[u], node_to_idx[v]))
        weights.append(data.get('weight', 1.0))

    ig_graph.add_edges(edges)
    ig_graph.es['weight'] = weights

    partition = leidenalg.find_partition(
        ig_graph,
        leidenalg.ModularityVertexPartition,
        weights=weights,
        seed=42,
    )

    comunidades = {}
    for community_id, members in enumerate(partition):
        for node_idx in members:
            comunidades[nodes[node_idx]] = community_id

    return comunidades


def calcular_comunidades(G, algoritmo):
    algoritmo = algoritmo.lower()
    if algoritmo not in ALGORITMOS_COMUNIDADE:
        raise ValueError("Algoritmo deve ser 'louvain' ou 'leiden'.")

    if algoritmo == 'louvain':
        return executar_louvain(G)
    return executar_leiden(G)


def calcular_comunidades_votos(legislatura, min_similaridade, max_similaridade, algoritmo):
    # Arredondar para maximizar cache hits
    min_sim_r = round(min_similaridade, 2)
    max_sim_r = round(max_similaridade, 2)
    alg = algoritmo.lower()
    cache_key = f'comunidades_votos:{legislatura}:{min_sim_r}:{max_sim_r}:{alg}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    G = construir_grafo_votos_por_similaridade(
        legislatura=legislatura,
        min_similaridade=min_similaridade,
        max_similaridade=max_similaridade,
    )
    comunidades = calcular_comunidades(G, algoritmo)

    resultado = {
        'legislatura': legislatura,
        'min_similaridade': min_similaridade,
        'max_similaridade': max_similaridade,
        'algoritmo': alg,
        'tipo': 'votos',
        'node_count': G.number_of_nodes(),
        'edge_count': G.number_of_edges(),
        'comunidades': comunidades,
    }

    cache.set(cache_key, resultado, 86400)  # 24 horas
    return resultado


def calcular_comunidades_coautoria(legislatura, min_coautoria, max_coautoria, algoritmo):
    alg = algoritmo.lower()
    cache_key = f'comunidades_coautoria:{legislatura}:{min_coautoria}:{max_coautoria}:{alg}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    G = construir_grafo_coautoria_por_quantidade(
        legislatura=legislatura,
        min_coautoria=min_coautoria,
        max_coautoria=max_coautoria,
    )
    comunidades = calcular_comunidades(G, algoritmo)

    resultado = {
        'legislatura': legislatura,
        'min_coautoria': min_coautoria,
        'max_coautoria': max_coautoria,
        'algoritmo': alg,
        'tipo': 'coautoria',
        'node_count': G.number_of_nodes(),
        'edge_count': G.number_of_edges(),
        'comunidades': comunidades,
    }

    cache.set(cache_key, resultado, 86400)  # 24 horas
    return resultado

