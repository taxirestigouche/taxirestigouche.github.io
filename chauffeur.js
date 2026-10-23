/* Taxi Restigouche — appli chauffeur */
(async function () {
  var T = Taxi, $ = T.$, $$ = T.$$, sb = T.sb, esc = T.esc;
  var moi = await T.exigerRole(['chauffeur']);
  if (!moi) return;
  var tarifs = await T.tarifs();
  $('#ent-nom').textContent = moi.nom + (moi.voiture ? ' · ' + moi.voiture : '');
  $('#lbl-minute').textContent = T.argent(tarifs.NB.minute) + ' / minute';

  // ---------- Navigation ----------
  var vue = 'courses';
  $$('.navbas button').forEach(function (b) {
    b.onclick = function () {
      vue = b.dataset.v;
      $$('.navbas button').forEach(function (x) { x.classList.toggle('actif', x === b); });
      ['courses', 'journee', 'messages', 'dossier'].forEach(function (v) { $('#vue-' + v).classList.toggle('cache', v !== vue); });
      if (vue === 'courses') setTimeout(function () { if (carteA) carteA.invalidateSize(); if (carteK) carteK.invalidateSize(); }, 60);
      if (vue === 'journee') journee();
      if (vue === 'messages') messages(true);
      if (vue === 'dossier') dossier();
    };
  });

  // ---------- GPS ----------
  var pos = null, dernierEnvoi = 0, dernierEnvoiPos = null, montre = null, verrou = null;
  function surPosition(p) {
    $('#gps-err').classList.add('cache');
    var c = p.coords;
    pos = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, t: Date.now(), v: c.speed };
    compteurGps(pos);
    var bouge = !dernierEnvoiPos || T.distance(dernierEnvoiPos.lat, dernierEnvoiPos.lng, pos.lat, pos.lng) > 0.03;
    if (moi.statut !== 'hors' && (Date.now() - dernierEnvoi > 15000 || (bouge && Date.now() - dernierEnvoi > 5000))) {
      dernierEnvoi = Date.now(); dernierEnvoiPos = pos;
      sb.rpc('chauffeur_position', { p_lat: pos.lat, p_lng: pos.lng }).then(function () {});
    }
    majCartes();
  }
  function demarrerGps() {
    if (!navigator.geolocation) { $('#gps-err').classList.remove('cache'); return; }
    if (montre == null) montre = navigator.geolocation.watchPosition(surPosition, function () { $('#gps-err').classList.remove('cache'); }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
    garderEcran();
  }
  async function garderEcran() {
    try { if ('wakeLock' in navigator && !verrou && moi.statut !== 'hors') { verrou = await navigator.wakeLock.request('screen'); verrou.addEventListener('release', function () { verrou = null; }); } } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { garderEcran(); rafraichir(); } });

  // ---------- Cartes ----------
  var carteA = null, carteK = null, mMoiA = null, mMoiK = null, mCible = null;
  function majCartes() {
    if (!pos) return;
    if (!$('#s-attente').classList.contains('cache')) {
      if (!carteA) carteA = T.carte('carteC', [pos.lat, pos.lng], 14);
      if (mMoiA) mMoiA.setLatLng([pos.lat, pos.lng]); else mMoiA = T.marqueur(carteA, pos.lat, pos.lng, esc(moi.voiture || 'MOI'));
      carteA.setView([pos.lat, pos.lng]);
    }
    if (!$('#s-course').classList.contains('cache') && carteK) {
      if (mMoiK) mMoiK.setLatLng([pos.lat, pos.lng]); else mMoiK = T.marqueur(carteK, pos.lat, pos.lng, esc(moi.voiture || 'MOI'));
      if (mCible) carteK.fitBounds([[pos.lat, pos.lng], mCible.getLatLng()], { padding: [40, 40], maxZoom: 16 });
    }
  }

  // ---------- Compteur virtuel (gardé dans le téléphone, même sans réseau) ----------
  var cpt = null, course = null;
  function chargerCpt(id) {
    try { cpt = JSON.parse(localStorage.getItem('compteur-' + id)) || null; } catch (e) { cpt = null; }
    if (!cpt || cpt.id !== id) cpt = { id: id, mode: 'off', km: 0, attenteS: 0, dernier: null, tic: Date.now() };
  }
  function sauverCpt() { if (cpt) localStorage.setItem('compteur-' + cpt.id, JSON.stringify(cpt)); }
  function compteurGps(p) {
    if (!cpt || cpt.mode !== 'route') return;
    if (p.acc > 50) return;
    if (cpt.dernier) {
      var d = T.distance(cpt.dernier.lat, cpt.dernier.lng, p.lat, p.lng), dt = (p.t - cpt.dernier.t) / 1000;
      if (d < 0.015) return;                       // moins de 15 m : bruit du GPS
      if (dt > 0 && d / dt * 3600 > 160) { cpt.dernier = p; return; } // saut impossible
      cpt.km += d;
    }
    cpt.dernier = { lat: p.lat, lng: p.lng, t: p.t };
    sauverCpt(); afficherCpt();
  }
  setInterval(function () {
    if (!cpt) return;
    var now = Date.now();
    if (cpt.mode === 'attente') cpt.attenteS += Math.round((now - cpt.tic) / 1000);
    cpt.tic = now; sauverCpt(); afficherCpt();
  }, 1000);
  function afficherCpt() {
    if (!cpt || !course) return;
    var tourne = cpt.mode !== 'off';
    var p = T.prix(tarifs, course.dep_prov, cpt.km, cpt.attenteS, new Date());
    $('#m-total').textContent = tourne ? T.argent(p.total) : T.argent(0);
    var mm = Math.floor(cpt.attenteS / 60) + ' min ' + String(cpt.attenteS % 60).padStart(2, '0') + ' s';
    $('#m-info').textContent = tourne ? T.km(cpt.km) + ' · attente ' + mm : 'Démarre à l’arrivée';
    var md = { off: ['Compteur arrêté', 'p-hors'], attente: ['Attente · ' + T.argent(tarifs[course.dep_prov].minute) + '/min', 'p-pause'], route: ['Compteur régulier · ' + (course.dep_prov === 'QC' ? 'tarif Québec' : 'tarif N.-B.'), 'p-dispo'] }[cpt.mode];
    $('#m-mode').textContent = md[0]; $('#m-mode').className = 'pastille ' + md[1];
    var b = $('#b-arret');
    b.textContent = cpt.mode === 'attente' ? 'Reprendre la route' : 'Attente (arrêt)';
    b.style.background = cpt.mode === 'attente' ? 'var(--sauge)' : 'var(--ambre-pale)';
    b.style.color = cpt.mode === 'attente' ? '#fffbf8' : 'var(--texte)';
  }
  setInterval(function () { if (cpt && course && cpt.mode !== 'off') sb.rpc('course_etape', { p_id: course.id, p_etape: 'compteur', p_km: Math.round(cpt.km * 100) / 100, p_attente_s: cpt.attenteS }).then(function () {}); }, 30000);

  // ---------- État principal ----------
  var offre = null, idOffreVue = null;
  function montrer(id) { ['s-hors', 's-attente', 's-offre', 's-course'].forEach(function (s) { $('#' + s).classList.toggle('cache', s !== id); }); }
  function pastille() {
    var m = { hors: ['Hors service', 'p-hors'], dispo: ['Disponible', 'p-dispo'], pause: ['En pause', 'p-pause'], course: ['En course', 'p-course'] }[moi.statut];
    $('#pastille').className = 'pastille ' + m[1]; $('#pastille-t').textContent = m[0];
  }
  async function rafraichir() {
    var p = await T.monProfil(); if (p) moi = p;
    if (!moi.actif) { T.toast('Ton compte est suspendu. Appelle la centrale.', true); }
    pastille();
    var q = await sb.from('quarts').select('*').eq('chauffeur_id', moi.id).is('fin', null).order('debut', { ascending: false }).limit(1);
    var quart = q.data && q.data[0];
    $('#ent-quart').textContent = quart ? 'Quart commencé à ' + T.heure(quart.debut) + ' · GPS en direct' : 'Quart non commencé';
    var r = await sb.from('courses').select('*').or('and(offerte_a.eq.' + moi.id + ',statut.eq.offerte),and(chauffeur_id.eq.' + moi.id + ',statut.in.(acceptee,arrivee,en_course))').order('cree_le', { ascending: false });
    var l = r.data || [];
    var active = l.find(function (c) { return c.chauffeur_id === moi.id; });
    var off = l.find(function (c) { return c.statut === 'offerte'; });
    if (active) { offre = null; afficherCourse(active); return; }
    course = null; cpt = null;
    if (off) { afficherOffre(off); return; }
    offre = null;
    if (moi.statut === 'hors') { montrer('s-hors'); return; }
    montrer('s-attente');
    $('#att-titre').textContent = moi.statut === 'pause' ? 'Tu es en pause' : 'En attente d’une course';
    $('#att-txt').textContent = moi.statut === 'pause' ? 'Tu ne recevras aucune course tant que tu n’auras pas repris.' : (noteAttente || 'Ta position est partagée en direct avec la centrale.');
    $('#b-pause').textContent = moi.statut === 'pause' ? 'Reprendre' : 'Pause';
    demarrerGps(); setTimeout(majCartes, 50);
  }
  var noteAttente = '';

  // ---------- Statut ----------
  async function statut(s) {
    var r = await sb.rpc('chauffeur_statut', { p_statut: s });
    if (r.error) { T.toast(r.error.message, true); return; }
    if (s === 'hors' && verrou) { try { verrou.release(); } catch (e) {} verrou = null; }
    if (s !== 'hors') { demarrerGps(); if (pos) sb.rpc('chauffeur_position', { p_lat: pos.lat, p_lng: pos.lng }).then(function () {}); T.demanderAvis(); }
    noteAttente = '';
    rafraichir();
  }
  $('#b-in').onclick = function () { statut('dispo'); };
  $('#b-out').onclick = function () { if (confirm('Terminer ton quart ?')) statut('hors'); };
  $('#b-pause').onclick = function () { statut(moi.statut === 'pause' ? 'dispo' : 'pause'); };

  // ---------- Offre ----------
  function afficherOffre(c) {
    offre = c; montrer('s-offre');
    if (idOffreVue !== c.id) { idOffreVue = c.id; T.avis('Nouvelle course', c.dep_adresse + ' → ' + c.dest_adresse); }
    var d = pos && c.dep_lat != null ? T.distance(pos.lat, pos.lng, c.dep_lat, c.dep_lng) * 1.3 : null;
    $('#o-dist').textContent = d != null ? T.km(d) + ' · ' + Math.max(1, Math.round(d / 50 * 60)) + ' min' : 'Nouvelle course';
    $('#o-dep').textContent = c.dep_adresse + (c.dep_ville ? ', ' + c.dep_ville : '');
    $('#o-dest').textContent = c.dest_adresse + (c.dest_ville ? ', ' + c.dest_ville : '');
    var o = c.options || {}, extra = [c.passagers + ' passager' + (c.passagers > 1 ? 's' : '')];
    if (o.adapte) extra.push('véhicule adapté'); if (o.siege) extra.push('siège d’enfant'); if (o.animal) extra.push('animal'); if (o.bagages) extra.push('bagages');
    extra.push(c.dep_prov === 'QC' ? 'tarif Québec' : 'tarif N.-B.');
    $('#o-info').textContent = extra.join(' · ') + (c.note ? ' — « ' + c.note + ' »' : '');
    compteARebours();
  }
  function compteARebours() {
    if (!offre) return;
    var reste = Math.max(0, 20 - Math.floor((Date.now() - new Date(offre.offerte_le).getTime()) / 1000));
    $('#o-sec').textContent = reste + ' s'; $('#o-barre').style.width = (reste / 20 * 100) + '%';
    if (reste <= 0) { offre = null; noteAttente = 'Pas de réponse : la course a été envoyée au chauffeur suivant.'; sb.rpc('verifier_offres').then(rafraichir); }
  }
  setInterval(compteARebours, 1000);
  $('#b-accepter').onclick = async function () {
    if (!offre) return;
    var r = await sb.rpc('repondre_offre', { p_id: offre.id, p_accepte: true });
    if (r.error) T.toast(r.error.message, true);
    offre = null; rafraichir();
  };
  $('#b-refuser').onclick = async function () {
    if (!offre) return;
    await sb.rpc('repondre_offre', { p_id: offre.id, p_accepte: false });
    offre = null; noteAttente = 'Course refusée : elle a été envoyée au chauffeur suivant le plus proche.'; rafraichir();
  };

  // ---------- Course ----------
  function afficherCourse(c) {
    var nouvelle = !course || course.id !== c.id;
    course = c; montrer('s-course'); demarrerGps();
    if (nouvelle) {
      chargerCpt(c.id);
      if (c.statut === 'en_course' && cpt.mode === 'off') cpt.mode = 'route';
      if (!carteK) carteK = T.carte('carteK', [c.dep_lat || 48.005, c.dep_lng || -66.673], 14);
      setTimeout(function () { carteK.invalidateSize(); }, 60);
    }
    var versClient = c.statut === 'acceptee' || c.statut === 'arrivee';
    var cible = versClient ? [c.dep_lat, c.dep_lng, c.dep_adresse + ', ' + (c.dep_ville || '')] : [c.dest_lat, c.dest_lng, c.dest_adresse + ', ' + (c.dest_ville || '')];
    $('#c-etape').textContent = c.statut === 'acceptee' ? 'En route vers le client' : c.statut === 'arrivee' ? 'Chez le client' : (cpt.mode === 'attente' ? 'Arrêt en cours, attente facturée' : 'Client à bord, vers la destination');
    $('#c-cible').textContent = cible[2];
    $('#c-nav').href = T.lienNavigation(cible[0], cible[1], cible[2]);
    if (mCible) { carteK.removeLayer(mCible); mCible = null; }
    if (cible[0] != null) mCible = T.marqueur(carteK, cible[0], cible[1], '', versClient ? 'marq-dep' : 'marq-dest');
    $('#c-client').textContent = (c.client_nom || 'Client') + (c.source === 'telephone' ? ' (appel)' : '');
    if (c.client_tel) { $('#c-tel').href = 'tel:' + c.client_tel; $('#c-tel').textContent = T.telJoli(c.client_tel); $('#c-tel').classList.remove('cache'); } else $('#c-tel').classList.add('cache');
    var o = c.options || {}, ex = [c.passagers + ' passager' + (c.passagers > 1 ? 's' : '')];
    if (o.adapte) ex.push('véhicule adapté'); if (o.siege) ex.push('siège d’enfant'); if (o.animal) ex.push('animal'); if (o.bagages) ex.push('bagages');
    $('#c-opts').textContent = ex.join(' · ') + (c.note ? ' — « ' + c.note + ' »' : '');
    $('#k-route').classList.toggle('cache', c.statut !== 'acceptee');
    $('#k-choix').classList.toggle('cache', !(c.statut === 'arrivee' && cpt.mode === 'off'));
    $('#k-attente').classList.toggle('cache', !(c.statut === 'arrivee' && cpt.mode === 'attente'));
    $('#k-ride').classList.toggle('cache', c.statut !== 'en_course');
    $('#b-absent').classList.toggle('cache', c.statut !== 'arrivee');
    afficherCpt(); majCartes();
  }
  async function etape(e) {
    var r = await sb.rpc('course_etape', { p_id: course.id, p_etape: e, p_km: Math.round(cpt.km * 100) / 100, p_attente_s: cpt.attenteS });
    if (r.error) { T.toast(r.error.message, true); return null; }
    return r;
  }
  $('#b-arrive').onclick = async function () { if (await etape('arrivee')) rafraichir(); };
  $('#b-attente').onclick = function () { cpt.mode = 'attente'; cpt.tic = Date.now(); sauverCpt(); afficherCourse(course); };
  async function depart() {
    cpt.mode = 'route'; cpt.dernier = pos && pos.acc <= 50 ? { lat: pos.lat, lng: pos.lng, t: pos.t } : null; cpt.tic = Date.now(); sauverCpt();
    if (await etape('depart')) rafraichir();
  }
  $('#b-depart').onclick = depart; $('#b-depart2').onclick = depart;
  $('#b-arret').onclick = function () {
    cpt.mode = cpt.mode === 'attente' ? 'route' : 'attente';
    cpt.tic = Date.now(); if (cpt.mode === 'route') cpt.dernier = pos ? { lat: pos.lat, lng: pos.lng, t: pos.t } : null;
    sauverCpt(); afficherCourse(course);
  };
  $('#b-absent').onclick = async function () {
    await sb.rpc('envoyer_message', { p_a: null, p_cible: 'centrale', p_texte: 'Client absent à ' + course.dep_adresse + ' (course ' + course.id + ').' });
    T.toast('La centrale est avertie');
  };
  $('#b-fin').onclick = function () {
    var p = T.prix(tarifs, course.dep_prov, cpt.km, cpt.attenteS, new Date());
    modal('<div class="titre" style="font-size: 22px">Terminer la course</div><div class="entre"><span class="doux">Total au compteur</span><span class="titre" style="font-size: 30px">' + T.argent(p.total) + '</span></div>' +
      (p.redevance ? '<div class="petit doux">Inclut la redevance de ' + T.argent(p.redevance) + ' (Québec)</div>' : '') +
      '<div class="petit gras doux">Comment le client a-t-il payé ?</div><div class="grille2"><button class="btn btn-plein" data-p="comptant">Comptant</button><button class="btn btn-plein" data-p="carte">Carte (terminal)</button></div><button class="btn btn-contour" data-p="">Retour</button>');
    $$('#modal-boite [data-p]').forEach(function (b) {
      b.onclick = async function () {
        if (!b.dataset.p) { fermerModal(); return; }
        b.disabled = true;
        var r = await sb.rpc('course_etape', { p_id: course.id, p_etape: 'fin', p_km: Math.round(cpt.km * 100) / 100, p_attente_s: cpt.attenteS, p_paiement: b.dataset.p });
        if (r.error) { T.toast(r.error.message, true); b.disabled = false; return; }
        localStorage.removeItem('compteur-' + course.id);
        var tot = r.data && r.data.total;
        fermerModal(); noteAttente = 'Course terminée (' + T.argent(tot) + ', ' + b.dataset.p + '). Tu es de nouveau disponible.';
        course = null; cpt = null; rafraichir();
      };
    });
  };
  function modal(html) { $('#modal-boite').innerHTML = html; $('#modal').classList.remove('cache'); }
  function fermerModal() { $('#modal').classList.add('cache'); }

  // ---------- Ma journée ----------
  async function journee() {
    var debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
    var r = await sb.from('courses').select('*').eq('chauffeur_id', moi.id).eq('statut', 'terminee').gte('fin_le', debutJour.toISOString()).order('fin_le', { ascending: false });
    var l = r.data || [];
    var total = l.reduce(function (s, c) { return s + Number(c.total || 0); }, 0);
    var comptant = l.filter(function (c) { return c.paiement !== 'carte'; }).reduce(function (s, c) { return s + Number(c.total || 0); }, 0);
    var kms = l.reduce(function (s, c) { return s + Number(c.compteur_km || 0); }, 0);
    var q = await sb.from('quarts').select('*').eq('chauffeur_id', moi.id).gte('debut', debutJour.toISOString()).order('debut');
    var quarts = q.data || [], secs = 0, pauses = 0;
    quarts.forEach(function (x) {
      var fin = x.fin ? new Date(x.fin) : new Date();
      var p = x.pause_s + (x.pause_debut ? (Date.now() - new Date(x.pause_debut)) / 1000 : 0);
      secs += (fin - new Date(x.debut)) / 1000 - p; pauses += p;
    });
    function hm(s) { s = Math.max(0, Math.round(s / 60)); return Math.floor(s / 60) + ' h ' + String(s % 60).padStart(2, '0'); }
    $('#j-stats').innerHTML = [['Heures travaillées', hm(secs), 'pauses déduites'], ['Courses', l.length, 'terminées'], ['Total compteur', T.argent(total), 'taxes incluses'], ['Comptant à remettre', T.argent(comptant), T.km(kms) + ' facturés']].map(function (s) {
      return '<div class="bloc"><div class="petit doux gras">' + s[0] + '</div><div class="titre" style="font-size: 24px">' + s[1] + '</div><div class="petit doux">' + s[2] + '</div></div>';
    }).join('');
    $('#j-quart').innerHTML = quarts.length ? quarts.map(function (x) {
      return '<div class="ligne-tab" style="border-color: var(--nuit-3)"><span class="doux">Quart</span><span>' + T.heure(x.debut) + ' – ' + (x.fin ? T.heure(x.fin) : 'en cours') + '</span></div>';
    }).join('') + '<div class="ligne-tab" style="border-color: var(--nuit-3)"><span class="doux">Pauses</span><span>' + hm(pauses) + '</span></div>' : '<div class="vide" style="color: var(--nuit-doux)">Aucun quart aujourd’hui.</div>';
    $('#j-courses').innerHTML = l.length ? l.map(function (c) {
      return '<div class="ligne-tab" style="border-color: var(--nuit-3)"><span><div class="gras">' + esc(c.dep_ville || c.dep_adresse) + ' → ' + esc(c.dest_ville || c.dest_adresse) + '</div><div class="petit doux">' + T.heure(c.fin_le) + ' · ' + (c.paiement === 'carte' ? 'Carte' : 'Comptant') + '</div></span><span class="gras">' + T.argent(c.total) + '</span></div>';
    }).join('') : '<div class="vide" style="color: var(--nuit-doux)">Aucune course terminée aujourd’hui.</div>';
  }

  // ---------- Messages et urgence ----------
  var vusMsg = {};
  async function messages(marquer) {
    var r = await sb.from('messages').select('*').order('cree_le', { ascending: false }).limit(40);
    var l = (r.data || []).reverse();
    var nonLus = l.filter(function (m) { return m.de !== moi.id && (m.lu_par || []).indexOf(moi.id) < 0; });
    $('#n-msg').textContent = nonLus.length ? 'Messages (' + nonLus.length + ')' : 'Messages';
    nonLus.forEach(function (m) { if (!vusMsg[m.id]) { vusMsg[m.id] = 1; if (!marquer) T.avis('Message de la centrale', m.texte); } });
    if (vue === 'messages' || marquer) {
      $('#fil').innerHTML = l.length ? l.map(function (m) {
        var cl = m.de === moi.id ? 'moi' : (m.a ? 'eux' : 'tous');
        return '<div class="bulle ' + cl + '">' + (cl === 'tous' ? '<b>À tous : </b>' : '') + esc(m.texte) + '<div class="petit" style="opacity: .75; margin-top: 4px">' + T.dateHeure(m.cree_le) + '</div></div>';
      }).join('') : '<div class="vide" style="color: var(--nuit-doux)">Aucun message.</div>';
      if (marquer && nonLus.length) { await sb.rpc('marquer_lu', { p_ids: nonLus.map(function (m) { return m.id; }) }); $('#n-msg').textContent = 'Messages'; }
    }
  }
  $('#rapides').innerHTML = ['OK', 'En route', 'Client absent', 'Panne / problème', 'Je finis bientôt'].map(function (q) { return '<button class="puce" style="background: var(--nuit-2); border-color: var(--nuit-3); color: #fffbf8">' + q + '</button>'; }).join('');
  $$('#rapides button').forEach(function (b) { b.onclick = function () { envoyer(b.textContent); }; });
  async function envoyer(txt) {
    if (!txt.trim()) return;
    var r = await sb.rpc('envoyer_message', { p_a: null, p_cible: 'centrale', p_texte: txt.trim() });
    if (r.error) { T.toast(r.error.message, true); return; }
    $('#msg').value = ''; messages(true);
  }
  $('#b-msg').onclick = function () { envoyer($('#msg').value); };
  $('#b-sos').onclick = function () {
    var n = 3, alerteId = null;
    modal('<div style="text-align: center" class="pile"><div id="sos-n" style="width: 140px; height: 140px; border-radius: 50%; background: var(--rouge); margin: 0 auto; display: flex; align-items: center; justify-content: center; font-family: Fraunces, serif; font-size: 60px; font-weight: 700">3</div><div class="titre" style="font-size: 22px" id="sos-t">Alerte dans 3 secondes</div><div class="petit doux" id="sos-d">La centrale recevra ta position et t’appellera tout de suite.</div><a href="tel:911" class="btn btn-rouge btn-large">Appeler le 911</a><button id="sos-x" class="btn btn-contour btn-large">Annuler, fausse alerte</button></div>');
    var iv = setInterval(async function () {
      n -= 1;
      if (n > 0) { $('#sos-n').textContent = n; $('#sos-t').textContent = 'Alerte dans ' + n + ' secondes'; return; }
      clearInterval(iv);
      var r = await sb.rpc('alerte', { p_lat: pos ? pos.lat : null, p_lng: pos ? pos.lng : null });
      alerteId = r.data;
      $('#sos-n').textContent = '!'; $('#sos-t').textContent = 'Alerte envoyée'; $('#sos-d').textContent = 'La centrale voit ta position. Si tu es en danger immédiat, appelle le 911.';
      $('#sos-x').textContent = 'Je suis en sécurité, terminer l’alerte';
    }, 1000);
    $('#sos-x').onclick = async function () { clearInterval(iv); if (alerteId) await sb.rpc('terminer_alerte', { p_id: alerteId }); fermerModal(); };
  };

  // ---------- Dossier ----------
  async function dossier() {
    $('#d-profil').innerHTML = '<div class="gras" style="font-size: 17px">' + esc(moi.nom) + (moi.voiture ? ' · voiture ' + esc(moi.voiture) : '') + '</div><div class="petit doux">' + esc(moi.vehicule || 'Véhicule à préciser') + (moi.plaque ? ' · plaque ' + esc(moi.plaque) : '') + ' · ' + T.telJoli(moi.telephone) + '</div>';
    var r = await sb.from('documents').select('*').eq('chauffeur_id', moi.id).order('type');
    var l = r.data || [];
    $('#d-docs').innerHTML = l.length ? l.map(function (d) {
      var jours = d.expire_le ? Math.round((new Date(d.expire_le) - new Date()) / 864e5) : null;
      var st = jours == null ? ['À fournir', 'p-hors'] : jours < 0 ? ['Expiré', 'p-course'] : jours <= 30 ? ['Expire dans ' + jours + ' j', 'p-pause'] : ['Valide', 'p-dispo'];
      return '<div class="bloc entre"><div><div class="gras">' + esc(d.type) + '</div><div class="petit doux">' + (d.expire_le ? 'Expire le ' + new Date(d.expire_le + 'T12:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date à fournir à la centrale') + '</div></div><span class="pastille ' + st[1] + '">' + st[0] + '</span></div>';
    }).join('') : '<div class="bloc petit doux">La centrale n’a pas encore inscrit tes documents (permis, assurance, inspection).</div>';
  }
  $('#b-nip').onclick = async function () { try { await T.changerMonNip(moi.telephone, $('#d-nip').value.trim()); $('#d-nip').value = ''; T.toast('NIP changé'); } catch (e) { T.toast(T.erreurMsg(e), true); } };
  $('#b-deco').onclick = async function () {
    if (moi.statut === 'course') { T.toast('Termine ta course d’abord', true); return; }
    if (moi.statut !== 'hors') await sb.rpc('chauffeur_statut', { p_statut: 'hors' });
    T.deconnexion();
  };

  // ---------- Démarrage ----------
  if (moi.statut !== 'hors') demarrerGps();
  await rafraichir();
  messages(false);
  sb.channel('chauffeur-' + moi.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courses', filter: 'offerte_a=eq.' + moi.id }, function () { rafraichir(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courses', filter: 'chauffeur_id=eq.' + moi.id }, function () { rafraichir(); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, function () { messages(vue === 'messages'); })
    .subscribe();
  setInterval(function () { if (moi.statut !== 'hors') { sb.rpc('verifier_offres').then(function () { if (!offre) rafraichir(); }); } }, 8000);
  setInterval(function () { messages(vue === 'messages'); }, 30000);
})();
