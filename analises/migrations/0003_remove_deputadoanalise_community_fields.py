from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('analises', '0002_rename_to_deputado_analise_and_add_communities'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='deputadoanalise',
            name='louvain_votos',
        ),
        migrations.RemoveField(
            model_name='deputadoanalise',
            name='leiden_votos',
        ),
        migrations.RemoveField(
            model_name='deputadoanalise',
            name='louvain_coautoria',
        ),
        migrations.RemoveField(
            model_name='deputadoanalise',
            name='leiden_coautoria',
        ),
    ]
