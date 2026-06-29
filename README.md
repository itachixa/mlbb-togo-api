# MLBB Togo — Backend (NestJS)

API REST de la plateforme MLBB Togo, construite avec NestJS 10, Prisma et SQLite.

## Démarrage

```bash
npm install
npx prisma generate
npx prisma migrate dev      # crée le schéma + seed
npm run start:dev           # http://localhost:3006/api
```

Variables d'environnement (`.env`, voir `.env.example`) : `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `FRONTEND_URL`.

## Scripts

- `npm run start:dev` : démarrage en mode watch
- `npm run build` puis `npm run start:prod` : build et exécution de production
- `npm run seed` : (re)peuple la base
- `npm run db:reset` : réinitialise la base puis seed

## Modèle de données

Schéma Prisma : `prisma/schema.prisma`. Les listes et objets (héros favoris, badges, membres, brackets, champs de formulaire, etc.) sont stockés en colonnes TEXT au format JSON pour rester portables sur SQLite ; ils sont désérialisés en tableaux/objets dans les réponses de l'API.

## Endpoints principaux (préfixe `/api`)

| Méthode | Route | Accès |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | public |
| GET | `/auth/me` | JWT |
| GET | `/users`, `/users/leaderboard`, `/users/:id` | public |
| PATCH/DELETE | `/users/:id`, `/users/:id/ban`, `/users/:id/role` | JWT (admin) |
| GET | `/teams`, `/teams/:id` | public |
| POST/PATCH/DELETE | `/teams`, `/teams/:id` | JWT |
| GET | `/posts`, `/posts/:id` | public |
| POST | `/posts`, `/posts/:id/comments` | JWT |
| POST | `/posts/:id/like` | public |
| GET | `/tournaments`, `/tournaments/:id` | public |
| POST/PATCH/DELETE | `/tournaments...` | JWT (admin) |
| GET | `/events`, `/events/:id` | public |
| POST/DELETE | `/events...` | JWT |
| GET | `/matches`, `/matches/:id` | public |
| POST | `/matches` | JWT |
| GET | `/heroes`, `/heroes/:id` | public |
| GET | `/admin/stats`, `/admin/logs`, `/admin/forms` | public |
| POST/PATCH/DELETE | `/admin/...` | JWT (admin / moderator) |
| POST | `/admin/forms/:id/responses` | public |

Règle générale : les lectures (GET) sont publiques, les écritures sont protégées par JWT, et les actions sensibles exigent le rôle `admin` (ou `moderator`).

## Note sur les moteurs Prisma hors-ligne

Le client est épinglé sur Prisma 6.19.2 afin de réutiliser les moteurs déjà présents dans le cache local (`~/.cache/prisma`), ce qui permet de générer le client et migrer sans accès au CDN de Prisma.
