import subprocess
import sys
import os

def run_command(command):
    print(f"\n==========================================")
    print(f"Executando: {command}")
    print(f"==========================================\n")
    res = subprocess.run(command, shell=True)
    if res.returncode != 0:
        print(f"\n[ERRO] Ocorreu uma falha ao executar o comando: {command}")
        sys.exit(res.returncode)

def main():
    print("==========================================")
    print("   PRISMA PARLAMENTAR: CONFIGURAÇÃO INICIAL  ")
    print("==========================================")
    
    # 1. Aplicar migrações
    print("\n[Etapa 1/3] Aplicando migrações do banco de dados...")
    run_command("python manage.py migrate")
    
    # 2. Coleta de dados reais
    print("\n[Etapa 2/3] Iniciando coleta de dados reais da API e CSVs da Câmara...")
    print("Isso pode levar alguns minutos devido à API e download de CSVs grandes.")
    
    print("\n-> Coletando dados fundamentais (Partidos, Deputados, Órgãos, Votações e Proposições)...")
    run_command("python manage.py coletar_api_camara --legislatura 57 --ano-inicio 2023 --ano-fim 2026")
    
    print("\n-> Coletando despesas parlamentares...")
    run_command("python manage.py coletar_despesas --ano 2023 2024 2025 2026")
    
    print("\n-> Coletando discursos dos deputados...")
    run_command("python manage.py coletar_discursos --legislatura 57 --ano-inicio 2023 --ano-fim 2026")
    
    print("\n-> Coletando presenças dos deputados...")
    run_command("python manage.py coletar_presencas --legislatura 57 --ano-inicio 2023 --ano-fim 2026")
    
    # 3. Geração de grafos e análises pré-calculadas
    print("\n[Etapa 3/3] Calculando grafos políticos e análises de desempenho...")
    
    print("\n-> Gerando grafo de similaridade de votos...")
    run_command("python manage.py gerar_grafo_similaridade --legislatura 57")
    
    print("\n-> Gerando grafo de coautoria de projetos de lei...")
    run_command("python manage.py gerar_grafo_coautoria --legislatura 57")
    
    print("\n-> Calculando metadados de grafos (polarização e autores)...")
    run_command("python manage.py calcular_metadados_grafos --legislatura 57")
    
    print("\n-> Pré-calculando backbones (HSS e LANS) para ambos os grafos...")
    run_command("python manage.py gerar_backbones --legislatura 57")
    
    print("\n-> Calculando análises de presença e atividade diária (Gráfico de Contribuição estilo GitHub)...")
    run_command("python manage.py gerar_analises --legislatura 57")
    
    print("\n==========================================")
    print("        CONFIGURAÇÃO CONCLUÍDA!           ")
    print("   O Prisma Parlamentar está pronto para uso!")
    print("==========================================")

if __name__ == '__main__':
    main()
