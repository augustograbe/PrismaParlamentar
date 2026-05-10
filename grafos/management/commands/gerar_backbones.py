from django.core.management.base import BaseCommand
from deputados.models import Deputado
from grafos.models import GrafoAresta, BackboneAresta
from tqdm import tqdm
import networkx as nx
import netbone as nb


class Command(BaseCommand):
    help = 'Pre-calcula backbones (High Salience Skeleton e LANS) para os grafos de similaridade e coautoria.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--legislatura',
            type=int,
            default=57,
            help='ID da Legislatura para calcular os backbones (padrao: 57)'
        )
        parser.add_argument(
            '--densidade-votos',
            type=float,
            default=0.1,
            help='Fracao de arestas a manter no backbone de votos (padrao: 0.1)'
        )
        parser.add_argument(
            '--densidade-coautoria',
            type=float,
            default=0.05,
            help='Fracao de arestas a manter no backbone de coautoria (padrao: 0.05)'
        )

    def _build_graph(self, arestas, weight_attr):
        """Constroi um grafo NetworkX a partir das arestas do banco de dados."""
        G = nx.Graph()
        for aresta in arestas:
            n1 = aresta.deputado_1_id
            n2 = aresta.deputado_2_id
            peso = getattr(aresta, weight_attr)
            if peso > 0:
                G.add_edge(n1, n2, weight=float(peso))
        return G

    def _compute_and_save_backbone(self, G, metodo, tipo_grafo, legislatura, densidade, dep_map):
        """Calcula o backbone e salva as arestas resultantes no banco."""
        self.stdout.write(f"  Calculando backbone {metodo} para {tipo_grafo} (densidade={densidade})...")

        if G.number_of_edges() == 0:
            self.stdout.write(self.style.WARNING(f"  Grafo de {tipo_grafo} sem arestas. Pulando."))
            return 0

        # Aplicar backbone
        if metodo == 'high_salience_skeleton':
            backbone_result = nb.high_salience_skeleton(G)
        elif metodo == 'lans':
            backbone_result = nb.lans(G)
        else:
            self.stdout.write(self.style.ERROR(f"  Metodo desconhecido: {metodo}"))
            return 0

        # Filtrar por fracao
        filtered_graph = nb.fraction_filter(backbone_result, densidade)

        self.stdout.write(
            f"  Arestas originais: {G.number_of_edges()} -> "
            f"Backbone: {filtered_graph.number_of_edges()}"
        )

        # Remover arestas antigas deste backbone especifico
        BackboneAresta.objects.filter(
            legislatura=legislatura,
            metodo=metodo,
            tipo_grafo=tipo_grafo,
        ).delete()

        # Salvar novas arestas
        arestas_para_criar = []
        batch_size = 5000

        for n1, n2, data in filtered_graph.edges(data=True):
            peso = data.get('weight', 0)
            d1_id = min(n1, n2)
            d2_id = max(n1, n2)

            if d1_id in dep_map and d2_id in dep_map:
                arestas_para_criar.append(
                    BackboneAresta(
                        deputado_1_id=d1_id,
                        deputado_2_id=d2_id,
                        legislatura=legislatura,
                        metodo=metodo,
                        tipo_grafo=tipo_grafo,
                        peso=peso,
                    )
                )

            if len(arestas_para_criar) >= batch_size:
                BackboneAresta.objects.bulk_create(arestas_para_criar)
                arestas_para_criar.clear()

        if arestas_para_criar:
            BackboneAresta.objects.bulk_create(arestas_para_criar)

        total = BackboneAresta.objects.filter(
            legislatura=legislatura, metodo=metodo, tipo_grafo=tipo_grafo
        ).count()

        self.stdout.write(self.style.SUCCESS(f"  OK - {total} arestas salvas para {metodo}/{tipo_grafo}"))
        return total

    def handle(self, *args, **options):
        leg = options['legislatura']
        densidade_votos = options['densidade_votos']
        densidade_coautoria = options['densidade_coautoria']

        self.stdout.write(f"\nIniciando calculo de backbones para a Legislatura {leg}...\n")

        deputados = list(Deputado.objects.filter(id_legislatura=leg))
        dep_map = {d.id: d for d in deputados}

        if len(deputados) < 2:
            self.stdout.write(self.style.ERROR("Menos de 2 deputados encontrados para esta legislatura."))
            return

        metodos = ['high_salience_skeleton', 'lans']

        # ---- Grafo de Similaridade ----
        self.stdout.write("\n[Similaridade] Construindo grafo de similaridade...")
        arestas_sim = GrafoAresta.objects.filter(
            legislatura=leg,
            similaridade__gte=80.0,  # Mesmo filtro padrao do endpoint de arestas
        )
        G_sim = self._build_graph(arestas_sim, 'similaridade')
        self.stdout.write(f"  Grafo de similaridade: {G_sim.number_of_nodes()} nos, {G_sim.number_of_edges()} arestas")

        for metodo in tqdm(metodos, desc="Backbones de similaridade"):
            self._compute_and_save_backbone(G_sim, metodo, 'similaridade', leg, densidade_votos, dep_map)

        # ---- Grafo de Coautoria ----
        self.stdout.write("\n[Coautoria] Construindo grafo de coautoria...")
        arestas_coaut = GrafoAresta.objects.filter(
            legislatura=leg,
            coautoria__gte=1,
        )
        G_coaut = self._build_graph(arestas_coaut, 'coautoria')
        self.stdout.write(f"  Grafo de coautoria: {G_coaut.number_of_nodes()} nos, {G_coaut.number_of_edges()} arestas")

        for metodo in tqdm(metodos, desc="Backbones de coautoria"):
            self._compute_and_save_backbone(G_coaut, metodo, 'coautoria', leg, densidade_coautoria, dep_map)

        # Resumo final
        total = BackboneAresta.objects.filter(legislatura=leg).count()
        self.stdout.write(self.style.SUCCESS(
            f"\nBackbones calculados com sucesso!"
            f"\n   Total de arestas de backbone: {total}"
        ))
