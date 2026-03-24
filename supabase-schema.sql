-- ============================================================
-- LKB LOCATION — Schéma Supabase
-- À exécuter dans l'éditeur SQL de ton projet Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROPRIÉTAIRES (partenaires sous-location)
-- ============================================================
create table proprietaires (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  prenom text,
  email text,
  telephone text,
  adresse text,
  iban text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- VÉHICULES
-- ============================================================
create table vehicules (
  id uuid primary key default uuid_generate_v4(),
  marque text not null,
  modele text not null,
  immatriculation text unique not null,
  annee int,
  couleur text,
  carburant text default 'Essence',
  boite text default 'Automatique',
  puissance_ch int,
  type_propriete text default 'own' check (type_propriete in ('own','sub')),
  proprietaire_id uuid references proprietaires(id),
  taux_reversement numeric(5,2) default 0,
  tarif_jour numeric(10,2) not null,
  caution numeric(10,2) not null,
  km_actuel int default 0,
  km_limite_par_jour int default 300,
  km_supplement_eur numeric(6,2) default 2.50,
  statut text default 'dispo' check (statut in ('dispo','loue','maint','indispo')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CLIENTS / CONDUCTEURS
-- ============================================================
create table clients (
  id uuid primary key default uuid_generate_v4(),
  civilite text default 'M.',
  nom text not null,
  prenom text,
  date_naissance date,
  nationalite text default 'Française',
  adresse text,
  code_postal text,
  ville text,
  email text,
  telephone text,
  permis_numero text,
  permis_date_obtention date,
  permis_expiration date,
  permis_categories text default 'B',
  cni_numero text,
  cni_expiration date,
  statut text default 'Actif',
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- RÉSERVATIONS / CONTRATS
-- ============================================================
create table reservations (
  id text primary key, -- ex: LC-2025-001
  vehicule_id uuid references vehicules(id),
  client_id uuid references clients(id),
  date_depart timestamptz not null,
  date_retour_prevue timestamptz not null,
  date_retour_effective timestamptz,
  tarif_jour numeric(10,2) not null,
  km_depart int,
  km_retour int,
  km_limite int default 300,
  km_supplement_eur numeric(6,2) default 2.50,
  caution numeric(10,2),
  caution_encaissee boolean default false,
  conducteur_additionnel text,
  mode_paiement text default 'Virement',
  total_prevu numeric(10,2),
  total_final numeric(10,2),
  statut text default 'active' check (statut in ('active','retour-j','retard','cloture','annule')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ÉTATS DES LIEUX
-- ============================================================
create table etats_des_lieux (
  id uuid primary key default uuid_generate_v4(),
  reservation_id text references reservations(id),
  type text not null check (type in ('depart','retour')),
  date_edl timestamptz default now(),
  km int,
  niveau_carburant text,
  proprete_ext text,
  proprete_int text,
  pression_pneus text,
  doc_bord boolean default true,
  kit_securite boolean default true,
  roue_secours boolean default true,
  cles boolean default true,
  voyants_tb boolean default true,
  observations text,
  dommages jsonb default '[]',
  agent text,
  created_at timestamptz default now()
);

-- ============================================================
-- ENTRETIENS / MAINTENANCE
-- ============================================================
create table maintenances (
  id uuid primary key default uuid_generate_v4(),
  vehicule_id uuid references vehicules(id),
  type_intervention text not null,
  date_intervention date not null,
  prestataire text,
  km_intervention int,
  cout_ht numeric(10,2),
  cout_ttc numeric(10,2),
  description text,
  facture_ref text,
  created_at timestamptz default now()
);

-- Alertes entretien planifiées
create table alertes_entretien (
  id uuid primary key default uuid_generate_v4(),
  vehicule_id uuid references vehicules(id),
  type text not null,
  echeance_date date,
  echeance_km int,
  statut text default 'actif' check (statut in ('actif','traite','ignore')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table documents (
  id uuid primary key default uuid_generate_v4(),
  entite_type text not null check (entite_type in ('vehicule','client','societe')),
  entite_id uuid,
  type_document text not null,
  numero text,
  date_debut date,
  date_fin date,
  fichier_url text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- FACTURATION
-- ============================================================
create table factures (
  id text primary key, -- ex: FAC-2025-001
  reservation_id text references reservations(id),
  client_id uuid references clients(id),
  date_emission date default current_date,
  date_echeance date,
  montant_ht numeric(10,2),
  tva numeric(10,2),
  montant_ttc numeric(10,2),
  statut text default 'emise' check (statut in ('brouillon','emise','payee','annulee')),
  mode_paiement text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- COMPTABILITÉ — Journal
-- ============================================================
create table journal_comptable (
  id uuid primary key default uuid_generate_v4(),
  date_operation date not null,
  libelle text not null,
  categorie text,
  reference text,
  debit numeric(10,2) default 0,
  credit numeric(10,2) default 0,
  reservation_id text references reservations(id),
  vehicule_id uuid references vehicules(id),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- SINISTRES
-- ============================================================
create table sinistres (
  id text primary key,
  vehicule_id uuid references vehicules(id),
  client_id uuid references clients(id),
  reservation_id text references reservations(id),
  date_sinistre date not null,
  description text,
  assureur text,
  numero_declaration text,
  montant_estime numeric(10,2),
  franchise numeric(10,2),
  statut text default 'ouvert' check (statut in ('ouvert','en_cours','cloture')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- UTILISATEURS / ADMINS (profils)
-- ============================================================
create table admin_profiles (
  id uuid primary key references auth.users(id),
  nom text,
  prenom text,
  role text default 'admin' check (role in ('super_admin','admin','lecteur')),
  created_at timestamptz default now()
);

-- ============================================================
-- RLS (Row Level Security) — accès réservé aux admins authentifiés
-- ============================================================
alter table vehicules enable row level security;
alter table clients enable row level security;
alter table reservations enable row level security;
alter table etats_des_lieux enable row level security;
alter table maintenances enable row level security;
alter table alertes_entretien enable row level security;
alter table documents enable row level security;
alter table factures enable row level security;
alter table journal_comptable enable row level security;
alter table sinistres enable row level security;
alter table proprietaires enable row level security;
alter table admin_profiles enable row level security;

-- Politique : tout utilisateur authentifié peut tout lire/écrire
create policy "Admins full access" on vehicules for all using (auth.role() = 'authenticated');
create policy "Admins full access" on clients for all using (auth.role() = 'authenticated');
create policy "Admins full access" on reservations for all using (auth.role() = 'authenticated');
create policy "Admins full access" on etats_des_lieux for all using (auth.role() = 'authenticated');
create policy "Admins full access" on maintenances for all using (auth.role() = 'authenticated');
create policy "Admins full access" on alertes_entretien for all using (auth.role() = 'authenticated');
create policy "Admins full access" on documents for all using (auth.role() = 'authenticated');
create policy "Admins full access" on factures for all using (auth.role() = 'authenticated');
create policy "Admins full access" on journal_comptable for all using (auth.role() = 'authenticated');
create policy "Admins full access" on sinistres for all using (auth.role() = 'authenticated');
create policy "Admins full access" on proprietaires for all using (auth.role() = 'authenticated');
create policy "Admins full access" on admin_profiles for all using (auth.role() = 'authenticated');

-- ============================================================
-- TRIGGER: mise à jour automatique updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_vehicules_updated before update on vehicules for each row execute function update_updated_at();
create trigger trg_reservations_updated before update on reservations for each row execute function update_updated_at();
