// ============================================================
// LKB LOCATION — Configuration Supabase
// ⚠ REMPLIR avec vos credentials Supabase
//   Dashboard Supabase → Settings → API
// ============================================================

const SUPABASE_URL = 'https://fwlyaikeroxxhqaihkbf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bHlhaWtlcm94eGhxYWloa2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjg1MzgsImV4cCI6MjA4OTg0NDUzOH0.7I5zq_Zxenp87M71Qv5ZwFzSSsIeNOoij6NQGhZL4uE';

// Initialisation du client Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});

// Numérotation contrats
const PREFIXES = {
  reservation: 'LC',
  facture: 'FAC',
  sinistre: 'SIN',
  avoir: 'AV',
};

// Infos société (imprimés sur les docs)
const SOCIETE = {
  nom: 'LKB Location',
  siret: '123 456 789 00012',
  adresse: '12 Avenue de la Prestige',
  cp: '75008',
  ville: 'Paris',
  email: 'contact@lkblocation.fr',
  tel: '+33 6 XX XX XX XX',
  iban: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX',
  tva_intracom: 'FR12 123456789',
  taux_tva: 20,
};
