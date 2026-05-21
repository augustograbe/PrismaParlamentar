# Hand-written migration: rename DeputadoPresenca → DeputadoAnalise,
# rename table to 'deputados_analise', and add community columns.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analises', '0001_initial'),
        ('deputados', '0005_proposicaoautor'),
    ]

    operations = [
        # 1. Rename the model class
        migrations.RenameModel(
            old_name='DeputadoPresenca',
            new_name='DeputadoAnalise',
        ),
        # 2. Rename the table
        migrations.AlterModelTable(
            name='DeputadoAnalise',
            table='deputados_analise',
        ),
        # 3. Add community columns
        migrations.AddField(
            model_name='DeputadoAnalise',
            name='louvain_votos',
            field=models.IntegerField(blank=True, help_text='Comunidade Louvain (grafo de votos)', null=True),
        ),
        migrations.AddField(
            model_name='DeputadoAnalise',
            name='leiden_votos',
            field=models.IntegerField(blank=True, help_text='Comunidade Leiden (grafo de votos)', null=True),
        ),
        migrations.AddField(
            model_name='DeputadoAnalise',
            name='louvain_coautoria',
            field=models.IntegerField(blank=True, help_text='Comunidade Louvain (grafo de coautoria)', null=True),
        ),
        migrations.AddField(
            model_name='DeputadoAnalise',
            name='leiden_coautoria',
            field=models.IntegerField(blank=True, help_text='Comunidade Leiden (grafo de coautoria)', null=True),
        ),
        # 4. Update meta options
        migrations.AlterModelOptions(
            name='DeputadoAnalise',
            options={
                'ordering': ['-presenca_percentual'],
                'verbose_name': 'Análise de Deputado',
                'verbose_name_plural': 'Análises de Deputados',
            },
        ),
        # 5. Update unique_together
        migrations.AlterUniqueTogether(
            name='DeputadoAnalise',
            unique_together={('deputado', 'legislatura')},
        ),
    ]
