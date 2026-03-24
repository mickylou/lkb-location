# LKB Location — Application de gestion
## Version 2.0 — Multi-administrateurs synchronisés

---

## 🚀 MISE EN PLACE (30 minutes)

### ÉTAPE 1 — Créer le projet Supabase

1. Aller sur **https://supabase.com** → Créer un compte gratuit
2. Cliquer **"New project"** → Nommer le projet `lkb-location`
3. Choisir une région proche (ex: eu-central-1 Frankfurt)
4. Attendre la création (~2 minutes)

### ÉTAPE 2 — Créer la base de données

1. Dans le dashboard Supabase → **SQL Editor**
2. Copier-coller tout le contenu du fichier `supabase-schema.sql`
3. Cliquer **Run** → Toutes les tables sont créées

### ÉTAPE 3 — Récupérer les clés API

1. Supabase → **Settings → API**
2. Copier :
   - **Project URL** → ex: `https://abcdefgh.supabase.co`
   - **anon public key** → longue chaîne commençant par `eyJ...`

### ÉTAPE 4 — Configurer l'application

Ouvrir `js/config.js` et remplacer :

```js
const SUPABASE_URL = 'https://VOTRE_PROJECT_ID.supabase.co';
// → remplacer par votre vraie URL

const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY_ICI';
// → remplacer par votre vraie clé anon
```

Également remplir les infos société dans ce même fichier :
```js
const SOCIETE = {
  nom: 'LKB Location',
  siret: '...',
  adresse: '...',
  // etc.
};
```

### ÉTAPE 5 — Créer les comptes administrateurs

1. Supabase → **Authentication → Users → Invite user**
2. Entrer l'email de chaque admin
3. Ils reçoivent un email pour définir leur mot de passe
4. Connexion directement dans l'app

### ÉTAPE 6 — Déployer sur Netlify

1. Aller sur **https://netlify.com** → Créer un compte
2. **"Add new site" → "Deploy manually"**
3. Glisser-déposer le dossier `lkb-location/` entier
4. L'app est en ligne en 30 secondes avec une URL du type :
   `https://lkb-location-xxx.netlify.app`

---

## 🔄 SYNCHRONISATION MULTI-ADMINS

L'application utilise **Supabase Realtime** :
- Toutes les modifications sont **instantanément visibles** par tous les admins connectés
- Chaque admin se connecte avec son email/mot de passe
- Tous partagent la même base de données

---

## 📋 MODULES DISPONIBLES

| Module | Fonctionnalités |
|--------|----------------|
| **Tableau de bord** | KPIs, alertes, mouvements du jour, bilan mensuel |
| **Planning** | Grille 14 jours, code couleur par type |
| **Réservations** | Création contrat, impression PDF légal |
| **États des lieux** | Schéma SVG cliquable, checklist, historique |
| **Véhicules** | Fiches, propre/sous-location, tarifs |
| **Entretien** | Alertes CT/révision, historique interventions |
| **Clients** | CRM, statut VIP, recherche |
| **Documents** | Validité assurance/CT/permis |
| **Facturation** | Auto-générées à la création contrat |
| **Comptabilité** | Journal de caisse, export CSV |
| **Propriétaires** | Reversements, relevé imprimable |
| **Sinistres** | Déclarations, suivi dossiers |
| **Paramètres** | Infos société, gestion accès |

---

## 🖨 DOCUMENTS IMPRIMABLES

- Contrat de location (avec zones de signature)
- État des lieux départ/retour
- Factures
- Relevé propriétaire partenaire

---

## 📁 STRUCTURE DES FICHIERS

```
lkb-location/
├── index.html              ← Page principale
├── supabase-schema.sql     ← À exécuter une seule fois dans Supabase
├── README.md               ← Ce fichier
├── css/
│   └── style.css           ← Styles (thème noir/or)
└── js/
    ├── config.js           ← ⚠ À CONFIGURER avec vos clés Supabase
    ├── db.js               ← Couche base de données
    ├── auth.js             ← Authentification
    ├── ui.js               ← Utilitaires interface
    ├── app.js              ← Initialisation + Realtime
    └── pages/
        ├── dashboard.js
        ├── vehicules.js
        ├── reservations.js ← Contient aussi EDL et Clients
        └── maintenance.js  ← Contient aussi Compta, Factures, Propriétaires, Sinistres, Documents, Paramètres
```

---

## 💡 CONSEILS

- **Sauvegarde** : Supabase propose des backups automatiques (plan Pro)
- **Domaine custom** : Dans Netlify → Domain settings → Add custom domain
- **Mise à jour** : Re-déposer le dossier sur Netlify pour mettre à jour
- **Support** : Toutes les données sont dans Supabase → Tables Editor

---

*LKB Location © 2025 — Application de gestion interne*
