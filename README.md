<p align="center">
  <img src="client/src/assets/logo_sobre_positivo.png" alt="Prisma Parlamentar" width="420">
</p>

A plataforma **Prisma Parlamentar** foi desenvolvida como parte do Trabalho de Conclusão de Curso do Bacharelado em Ciência da Computação da Universidade Federal do Rio de Janeiro (UFRJ), com o objetivo de ampliar o acesso e a compreensão dos dados públicos disponibilizados pela Câmara dos Deputados.

A aplicação reúne informações legislativas em uma interface moderna e intuitiva, permitindo que estudantes, pesquisadores, jornalistas e cidadãos explorem a atividade parlamentar de forma simples e interativa. Por meio de técnicas de Análise de Redes Sociais, a plataforma possibilita visualizar relações entre deputados, identificar comunidades políticas, analisar padrões de votação e colaboração em proposições, além de investigar métricas de influência e diferentes aspectos da atuação parlamentar.

Ao integrar métodos científicos de análise de redes com recursos avançados de visualização de dados, busca-se reduzir a barreira técnica existente no acesso aos dados legislativos, promovendo maior transparência, acessibilidade e compreensão do funcionamento da Câmara dos Deputados.

***

## Requisitos

Para rodar o projeto localmente, você precisará instalar em sua máquina:

- **Python 3.x** (O projeto utiliza Django 5+)
- **Node.js** (Versão 18+ ou superior recomendada)
- **npm** (Gerenciador de pacotes do Node, normalmente já incluído na instalação do Node.js)

### 1. Inicializando o Backend

1. Abra um terminal na pasta onde este arquivo se encontra (pasta raiz do projeto).
2. Instale as dependências Python necessárias:
   ```bash
   pip install -r requirements.txt
   ```
3. Execute as migrações (para garantir que o banco `db.sqlite3` esteja atualizado com as tabelas de cada Modulo Django):
   ```bash
   python manage.py migrate
   ```
4. Por último, inicie o servidor:
   ```bash
   python manage.py runserver
   ```
   O backend será iniciado no endereço `http://127.0.0.1:8000/`.

### 2. Inicializando o Frontend

1. Abra **outro terminal** (para não parar a execução do backend) e navegue para o diretório de cliente:
   ```bash
   cd client
   ```
2. Instale todas as dependências JavaScript presentes no `package.json`:
   ```bash
   npm install
   ```
3. Coloque o servidor web de desenvolvimento no ar com o Vite:
   ```bash
   npm run dev
   ```   
Abra o navegador no endereço do Frontend apontado no terminal.

## ⚙️ Inicialização Completa e Atualização Incremental

Para facilitar a implantação local e em servidores de produção, criamos scripts dedicados que gerenciam todo o ciclo de vida dos dados do Prisma Parlamentar.

### 🚀 1. Configuração Inicial do Projeto (`first_start.py`)

Se você está rodando o projeto pela primeira vez ou acabou de clonar o repositório, execute o script automatizado de inicialização a partir do diretório raiz:
```bash
python first_start.py
```
**O que este script faz:**
1. Executa todas as migrações do Django (`migrate`).
2. Popula o banco com os dados políticos completos de 2023 a 2026 para a legislatura 57.
3. Coleta despesas, presenças e transcrições de discursos para todos os deputados.
4. Gera e pré-calcula todos os grafos de similaridade e coautoria, seus backbones de rede (HSS e LANS) e as análises diárias.

---

### 🔄 2. Atualização Diária Incremental (`atualizar_dados`)

Para manter os dados do site atualizados de forma rápida e leve, utilize o comando de atualização:
```bash
python manage.py atualizar_dados
```
**Características e Otimizações:**
* **Busca Incremental:** Rastreia a data do último update bem-sucedido e busca na API da Câmara apenas o que mudou desde então.
* **Sobrescrita de Data:** Você pode forçar a busca a partir de uma data específica com o argumento `--desde AAAA-MM-DD` (ex: `--desde 2026-05-20`).
* **Despesas Eficientes:** Re-importa automaticamente apenas a tabela consolidada do ano corrente para capturar alterações e inserções retroativas de forma ultrarrápida.
* **Registro de Logs de Operação:** Grava um histórico detalhado de cada execução (sucesso/falha, tempo decorrido, erros e quantidade de registros modificados por tabela) visível na tabela **Execução de Update de Dados** no Django Admin.
* **Sincronização Integrada:** Recalcula de forma automatizada toda a malha de grafos, metadados e gráficos estilo GitHub ao final de cada execução com sucesso.



## 🛠️ Comandos de Gerenciamento Disponíveis (Django Commands)

Se você preferir executar as etapas individualmente para testes ou desenvolvimento, os seguintes comandos Django (`python manage.py <comando>`) estão disponíveis:

### 1. Coleta de Dados (`coleta_dados`)
*   `coletar_api_camara --legislatura 57 --ano-inicio 2023 --ano-fim 2026`
    Coleta dados estruturais básicos (Partidos, Deputados, Órgãos, cabeçalhos de Votações e Proposições com seus autores).
*   `coletar_despesas --ano 2023 2024 2025 2026 --deputado <id>`
    Baixa os arquivos compactados de despesas parlamentares anuais e popula o banco de dados. Permite filtragem por deputado específico.
*   `coletar_discursos --legislatura 57 --ano-inicio 2023 --ano-fim 2026`
    Coleta as transcrições das falas e discursos de cada deputado no período.
*   `coletar_presencas --legislatura 57 --ano-inicio 2023 --ano-fim 2026`
    Coleta a presença dos parlamentares em sessões plenárias e de comissões.
*   `seed_data`
    Remove a base existente e popula com dados fictícios de teste e similaridades aleatórias (ideal para validar layouts do frontend sem gastar conexões de rede).

### 2. Processamento de Grafos (`grafos`)
*   `gerar_grafo_similaridade --legislatura 57`
    Calcula a similaridade percentual de votos entre todos os pares possíveis de deputados baseada nas votações nominais.
*   `gerar_grafo_coautoria --legislatura 57`
    Calcula o número de coautorias de Projetos de Lei (PL) entre todos os pares de deputados.
*   `calcular_metadados_grafos`
    Calcula de forma desnormalizada a polarização de cada votação e o número total de autores de cada proposição.
*   `gerar_backbones --legislatura 57 --densidade-votos 0.1 --densidade-coautoria 0.05`
    Pré-calcula os backbones simplificados da rede (High Salience Skeleton e LANS) para otimização de renderização e performance no frontend.

### 3. Geração de Análises (`analises`)
*   `gerar_analises --legislatura 57`
    Recalcula a taxa de presença consolidada de cada deputado e gera o histórico detalhado de contribuições diárias (`AtividadeDiaria`) utilizado para renderizar o gráfico estilo GitHub no perfil do deputado.
