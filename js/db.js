// ============================================================
// LKB LOCATION — Couche base de données (Supabase)
// ============================================================

const DB = {

  // ---- VÉHICULES ----
  async getVehicules() {
    const { data, error } = await supabase.from('vehicules').select('*, proprietaires(nom,prenom)').order('marque');
    if (error) throw error; return data;
  },
  async getVehicule(id) {
    const { data, error } = await supabase.from('vehicules').select('*').eq('id', id).single();
    if (error) throw error; return data;
  },
  async saveVehicule(v) {
    const { data, error } = v.id
      ? await supabase.from('vehicules').update(v).eq('id', v.id).select().single()
      : await supabase.from('vehicules').insert(v).select().single();
    if (error) throw error; return data;
  },
  async deleteVehicule(id) {
    const { error } = await supabase.from('vehicules').delete().eq('id', id);
    if (error) throw error;
  },
  async updateVehiculeKm(id, km) {
    const { error } = await supabase.from('vehicules').update({ km_actuel: km }).eq('id', id);
    if (error) throw error;
  },

  // ---- CLIENTS ----
  async getClients() {
    const { data, error } = await supabase.from('clients').select('*').order('nom');
    if (error) throw error; return data;
  },
  async getClient(id) {
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error) throw error; return data;
  },
  async saveClient(c) {
    const { data, error } = c.id
      ? await supabase.from('clients').update(c).eq('id', c.id).select().single()
      : await supabase.from('clients').insert(c).select().single();
    if (error) throw error; return data;
  },

  // ---- RÉSERVATIONS ----
  async getReservations(filters = {}) {
    let q = supabase.from('reservations').select(`
      *, 
      vehicules(marque, modele, immatriculation, type_propriete, tarif_jour),
      clients(civilite, nom, prenom, email, telephone)
    `).order('date_depart', { ascending: false });
    if (filters.statut) q = q.eq('statut', filters.statut);
    if (filters.vehicule_id) q = q.eq('vehicule_id', filters.vehicule_id);
    const { data, error } = await q;
    if (error) throw error; return data;
  },
  async getReservation(id) {
    const { data, error } = await supabase.from('reservations').select(`
      *, vehicules(*), clients(*)
    `).eq('id', id).single();
    if (error) throw error; return data;
  },
  async saveReservation(r) {
    const { data, error } = r.id
      ? await supabase.from('reservations').update(r).eq('id', r.id).select().single()
      : await supabase.from('reservations').insert(r).select().single();
    if (error) throw error; return data;
  },
  async nextReservationId() {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).like('id', `LC-${year}-%`);
    return `LC-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
  },

  // ---- EDL ----
  async getEDLs(reservationId) {
    const { data, error } = await supabase.from('etats_des_lieux').select('*').eq('reservation_id', reservationId);
    if (error) throw error; return data;
  },
  async getAllEDLs() {
    const { data, error } = await supabase.from('etats_des_lieux').select(`
      *, reservations(id, vehicules(marque, modele), clients(nom, prenom))
    `).order('created_at', { ascending: false });
    if (error) throw error; return data;
  },
  async saveEDL(edl) {
    const { data, error } = await supabase.from('etats_des_lieux').insert(edl).select().single();
    if (error) throw error; return data;
  },

  // ---- MAINTENANCE ----
  async getMaintenances() {
    const { data, error } = await supabase.from('maintenances').select('*, vehicules(marque,modele,immatriculation)').order('date_intervention', { ascending: false });
    if (error) throw error; return data;
  },
  async saveMaintenance(m) {
    const { data, error } = await supabase.from('maintenances').insert(m).select().single();
    if (error) throw error; return data;
  },
  async getAlertes() {
    const { data, error } = await supabase.from('alertes_entretien').select('*, vehicules(marque,modele)').eq('statut', 'actif').order('echeance_date');
    if (error) throw error; return data;
  },
  async saveAlerte(a) {
    const { data, error } = await supabase.from('alertes_entretien').insert(a).select().single();
    if (error) throw error; return data;
  },

  // ---- DOCUMENTS ----
  async getDocuments(entiteType, entiteId) {
    let q = supabase.from('documents').select('*');
    if (entiteType) q = q.eq('entite_type', entiteType);
    if (entiteId) q = q.eq('entite_id', entiteId);
    const { data, error } = await q.order('date_fin');
    if (error) throw error; return data;
  },
  async saveDocument(d) {
    const { data, error } = await supabase.from('documents').insert(d).select().single();
    if (error) throw error; return data;
  },

  // ---- FACTURES ----
  async getFactures() {
    const { data, error } = await supabase.from('factures').select('*, clients(nom,prenom), reservations(id)').order('date_emission', { ascending: false });
    if (error) throw error; return data;
  },
  async saveFacture(f) {
    const { data, error } = f.id
      ? await supabase.from('factures').update(f).eq('id', f.id).select().single()
      : await supabase.from('factures').insert(f).select().single();
    if (error) throw error; return data;
  },
  async nextFactureId() {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('factures').select('*', { count: 'exact', head: true }).like('id', `FAC-${year}-%`);
    return `FAC-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
  },

  // ---- COMPTABILITÉ ----
  async getJournal(mois, annee) {
    let q = supabase.from('journal_comptable').select('*').order('date_operation', { ascending: false });
    if (mois && annee) {
      const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
      const fin = `${annee}-${String(mois).padStart(2,'0')}-31`;
      q = q.gte('date_operation', debut).lte('date_operation', fin);
    }
    const { data, error } = await q;
    if (error) throw error; return data;
  },
  async addEcriture(e) {
    const { data, error } = await supabase.from('journal_comptable').insert({ ...e, created_by: (await supabase.auth.getUser()).data.user?.id }).select().single();
    if (error) throw error; return data;
  },

  // ---- PROPRIÉTAIRES ----
  async getProprietaires() {
    const { data, error } = await supabase.from('proprietaires').select('*, vehicules(id,marque,modele,immatriculation)').order('nom');
    if (error) throw error; return data;
  },
  async saveProprietaire(p) {
    const { data, error } = p.id
      ? await supabase.from('proprietaires').update(p).eq('id', p.id).select().single()
      : await supabase.from('proprietaires').insert(p).select().single();
    if (error) throw error; return data;
  },

  // ---- SINISTRES ----
  async getSinistres() {
    const { data, error } = await supabase.from('sinistres').select('*, vehicules(marque,modele), clients(nom,prenom)').order('date_sinistre', { ascending: false });
    if (error) throw error; return data;
  },
  async saveSinistre(s) {
    const { data, error } = s.id
      ? await supabase.from('sinistres').update(s).eq('id', s.id).select().single()
      : await supabase.from('sinistres').insert(s).select().single();
    if (error) throw error; return data;
  },

  // ---- STATS DASHBOARD ----
  async getDashboardStats() {
    const [vehRes, resRes, journalRes] = await Promise.all([
      supabase.from('vehicules').select('statut'),
      supabase.from('reservations').select('statut, total_prevu, date_retour_prevue').in('statut', ['active','retard','retour-j']),
      supabase.from('journal_comptable').select('credit,debit,date_operation').gte('date_operation', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
    ]);
    const vehicules = vehRes.data || [];
    const reservations = resRes.data || [];
    const journal = journalRes.data || [];
    const today = new Date().toISOString().split('T')[0];
    return {
      total_vehicules: vehicules.length,
      dispo: vehicules.filter(v => v.statut === 'dispo').length,
      loue: vehicules.filter(v => v.statut === 'loue').length,
      maint: vehicules.filter(v => v.statut === 'maint').length,
      locations_actives: reservations.length,
      retards: reservations.filter(r => r.statut === 'retard').length,
      retours_today: reservations.filter(r => r.date_retour_prevue?.startsWith(today)).length,
      ca_mois: journal.reduce((s, e) => s + (e.credit || 0), 0),
      charges_mois: journal.reduce((s, e) => s + (e.debit || 0), 0),
    };
  },

  // ---- REALTIME ----
  subscribeToChanges(table, callback) {
    return supabase.channel(`lkb-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, payload => callback(payload))
      .subscribe();
  }
};
