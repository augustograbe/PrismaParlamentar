# Prisma Político

## Requisitos

Para rodar o projeto localmente, você precisará instalar em sua máquina:

- **Python 3.x** (O projeto utiliza Django 5+)
- **Node.js** (Versão 18+ ou superior recomendada)
- **npm** (Gerenciador de pacotes do Node, normalmente já incluído na instalação do Node.js)

### 1. Inicializando o Backend

1. Abra um terminal na pasta onde este arquivo se encontra (pasta raiz do projeto).
2. Instale as dependências Python necessárias:
   ```bash
   pip install django djangorestframework django-cors-headers
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

## Popular o Banco de Dados e Gerar Grafos

Para baixar os dados reais e gerar as estruturas de grafos e análises, execute os comandos abaixo na raiz do projeto:

### 1. Coleta de Dados

Os dados são coletados da API pública da Câmara dos Deputados.

- **Coleta Principal** (Deputados, Partidos, Órgãos, Votações, Votos e Proposições):
  ```bash
  python manage.py coletar_api_camara
  ```
  *Nota: Esse script pode demorar alguns minutos pois faz múltiplas requisições.*

- **Coleta de Presenças**:
  ```bash
  python manage.py coletar_presencas
  ```

- **Coleta de Discursos**:
  ```bash
  python manage.py coletar_discursos
  ```

### 2. Geração de Grafos

Após coletar os dados, você pode gerar os grafos de conexões entre os deputados.

- **Grafo de Similaridade de Votos**:
  ```bash
  python manage.py gerar_grafo_similaridade
  ```

- **Grafo de Coautoria**:
  ```bash
  python manage.py gerar_grafo_coautoria
  ```

- **Gerar Backbones** (Estruturas simplificadas dos grafos para otimização):
  ```bash
  python manage.py gerar_backbones
  ```

### 3. Geração de Análises

Para gerar métricas, comunidades e estatísticas sobre os dados coletados:

```bash
python manage.py gerar_analises --legislatura 57
```

