// ============================================================
// LKB LOCATION — Configuration Supabase
// ============================================================

const SUPABASE_URL = 'https://zchokerouwajyiqigknx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjaG9rZXJvdXdhanlpcWlna254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTYxODEsImV4cCI6MjA5MzM5MjE4MX0.93XxssR_LhJpf6bgEheLwLWk3lGN5ZVC6jC_n1BEoZc';

// Initialisation Supabase (attend que la lib CDN soit chargée)
let supabase;
function _initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return true;
  }
  return false;
}
if (!_initSupabase()) {
  let _tries = 0;
  const _iv = setInterval(() => {
    if (_initSupabase() || _tries++ > 50) clearInterval(_iv);
  }, 100);
}

const PREFIXES = { reservation:'LC', facture:'FAC', sinistre:'SIN', avoir:'AV' };

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
