# DevSync

DevSync est un tableau de bord collaboratif conçu pour le travail en binôme de développeurs. Il regroupe en une interface unique (Soft-UI claire) un espace de planification Kanban, une vitrine de déploiements Vercel/GitHub, un gestionnaire de rappels, un timer Pomodoro synchronisé et un partage d'activité Spotify en direct.

---

## Architecture & Stack Technique

- **Framework** : Next.js 16 (App Router) & React 19.
- **Stylisation** : Tailwind CSS v4.
- **Base de données & Temps Réel** : Client Supabase (supportant le basculement dynamique entre stockage LocalStorage hors-ligne et synchronisation Supabase Realtime).
- **Défilement & Animations** : Lenis (smooth scroll) couplé à GSAP / ScrollTrigger.
- **Polices** : Satoshi (Titres & Chiffres) et Inter (Données & Corps), auto-hébergées.

---

## Configuration & Variables d'environnement

Créez un fichier `.env` ou `.env.local` à la racine du projet et renseignez les variables suivantes :

```env
# Configuration de la base de données Supabase (Mode Cloud)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Intégration Spotify (Morceau en écoute)
SPOTIFY_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SPOTIFY_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
```

---

## Installation & Lancement

1. Installez les dépendances :
```bash
npm install
```

2. Lancez le serveur de développement local :
```bash
npm run dev
```

3. Accédez à l'application dans votre navigateur :
`http://localhost:3000` (ou `http://127.0.0.1:3000` pour contourner les interférences de Service Worker local).

---

## Structure du Projet

- `/src/app` : Routes de l'application Next.js (pages d'authentification, de configuration, de boîte à outils et endpoints API Spotify).
- `/src/components` : Composants UI autonomes (Bento Grid, Kanban, ShowcaseCarousel, CommandPalette ⌘K).
- `/src/lib` : Logique d'authentification (`auth.ts`), de base de données dynamique (`supabase.ts`) et de stockage à double adaptateur (`storage.ts`).
- `/src/proxy.ts` : Middleware de routage et de protection de session conforme à la norme Next.js 16.
