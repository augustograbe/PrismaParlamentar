# AGENTS.md

## Project Overview

Prisma Politico is a Django 5 + Django REST Framework backend with a React 19 + Vite frontend. The project models Brazilian Camara dos Deputados data, including deputies, votes, analyses, similarity graphs, and coauthorship graphs.

## Repository Layout

- `manage.py`: Django entrypoint.
- `config/`: Django project settings and root URL configuration.
- `api/`: REST API routing, viewsets, and serializers.
- `deputados/`: Core political/deputy domain models.
- `coleta_dados/`: Data collection models, services, and management commands.
- `grafos/`: Graph models and graph-generation management commands.
- `analises/`: Analysis models, services, and analysis-generation commands.
- `client/`: React/Vite frontend.
- `db.sqlite3`: Local SQLite database with project data. Treat as a large generated/local data file.

## Backend

Install the minimal backend dependencies from the root:

```bash
pip install django djangorestframework django-cors-headers
```

Run migrations:

```bash
python manage.py migrate
```

Run the API server:

```bash
python manage.py runserver
```

Useful data commands:

```bash
python manage.py coletar_api_camara
python manage.py gerar_grafo_similaridade
python manage.py gerar_grafo_coautoria
python manage.py gerar_analises --legislatura 57
```

These commands can be slow and may require network access because they call public Camara data sources.

## Frontend

From `client/`:

```bash
npm install
npm run dev
npm run build
npm run lint
```

Vite proxies `/api` to `http://localhost:8000`, so run Django alongside the frontend when testing integrated API behavior.

## Verification

Prefer targeted checks for the area changed:

- Backend model/API changes: `python manage.py test`
- Backend migrations/settings sanity: `python manage.py check`
- Frontend changes: `npm run lint` and `npm run build` from `client/`

If dependencies are missing or network access is blocked, report that clearly instead of silently skipping verification.

## Coding Notes

- Keep backend changes aligned with Django/DRF patterns already used in the apps.
- Keep frontend changes aligned with the existing React component structure in `client/src/components` and `client/src/pages`.
- Reuse existing graph libraries (`sigma`, `graphology`, and related packages) for graph behavior rather than hand-rolling graph logic.
- Do not rewrite or regenerate `db.sqlite3` unless the user explicitly asks for data refresh or migration work that requires it.
- Avoid unrelated formatting churn, especially in generated migrations and large data files.
- The project text is Portuguese-facing; preserve Portuguese UI/domain terms unless the user asks otherwise.

## Current Local Branch

At initialization time, the workspace was on `feat/comunidades` tracking `origin/feat/comunidades`.
