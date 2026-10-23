/* Taxi Restigouche — appli client */
(async function () {
  var T = Taxi, $ = T.$, $$ = T.$$, sb = T.sb, esc = T.esc;
  var moi = await T.exigerRole(['client', 'centrale']);
  if (!moi) return;
  var PARAMS = await T.parametres();
  var L_ = moi.langue === 'en' ? 'en' : 'fr';
  localStorage.setItem('taxi-langue', L_);

  var D = {
    fr: {
      ou: 'Où allez-vous ?', dep: 'Départ', dest: 'Destination', depPh: 'Adresse de départ', destPh: 'Adresse de destination', estim: 'Estimation du compteur',
      quand: 'Quand ?', now: 'Maintenant', plus: 'Plus tard', pass: 'Passagers',
      o1: 'Véhicule adapté', o1b: 'Fauteuil roulant, rampe', o2: 'Siège d’enfant', o2b: 'Précisez l’âge dans la note', o3: 'Animal', o3b: 'Chien guide toujours accepté', o4: 'Bagages', o4b: 'Valises, épicerie, marchette',
      note: 'Note au chauffeur (facultatif)', notePh: 'Ex. : entrée principale, je suis au banc près de la porte',
      commander: 'Commander mon taxi', reserver: 'Réserver', choisir: 'Choisissez le départ et la destination dans la liste',
      maPos: 'Ma position', libres: function (n) { return n === 1 ? '1 taxi libre' : n + ' taxis libres'; }, aucunLibre: 'Aucun taxi libre pour le moment',
      recherche: 'On cherche le taxi le plus proche…', rechercheSous: 'Commande envoyée', attente: 'En attente d’un chauffeur', attenteSous: 'La centrale s’en occupe',
      arrive: 'Votre taxi arrive', arriveDans: function (m) { return 'Arrive dans ' + m + ' min'; }, aLaPorte: 'Votre taxi est là !', aLaPorteSous: 'Le chauffeur vous attend',
      enRoute: 'En route', enRouteSous: 'Bon trajet', reservee: 'Course réservée', reserveeSous: function (d) { return 'Pour le ' + d; },
      e1: 'Commandé', e2: 'Accepté', e3: 'À la porte', e4: 'En route', sestim: 'Estimation', partager: 'Partager mon trajet', appeler: 'Appeler la centrale', annuler: 'Annuler la course',
      confAnnuler: 'Annuler cette course ?', annulee: 'Course annulée', fSous: 'Vous êtes arrivé', fTitre: function (n) { return 'Comment était votre course avec ' + n + ' ?'; },
      ftotal: 'Total au compteur', fcomm: 'Un commentaire (facultatif)', envoyer: 'Envoyer mon évaluation', passer: 'Fermer', merci: 'Merci !',
      mescourses: 'Mes courses', avenir: 'À venir', historique: 'Historique', aucune: 'Aucune course pour l’instant.', recommander: 'Recommander', facture: 'Facture',
      cnom: 'Nom', ccour: 'Courriel (pour vos reçus)', clang: 'Langue', sauver: 'Enregistrer', sauve: 'Enregistré', adr: 'Mes adresses', ajout: 'Ajouter cette adresse', adrPh: 'Rechercher l’adresse',
      maison: 'Maison', travail: 'Travail', autre: 'Autre', secu: 'Sécurité et avis', cnip: 'Nouveau NIP (4 à 6 chiffres)', nipb: 'Changer mon NIP', nipOk: 'NIP changé',
      avis: 'Activer les avis (taxi arrivé, etc.)', avisOk: 'Avis activés', deco: 'Me déconnecter', paie: 'Paiement à bord seulement, comptant ou carte.',
      n1: 'Commander', n2: 'Mes courses', n3: 'Compte', supprimer: 'Retirer', partageTxt: function (c) { return 'Je suis en taxi (' + (c.chauffeur && c.chauffeur.voiture ? 'voiture ' + c.chauffeur.voiture : 'Taxi Restigouche') + (c.chauffeur && c.chauffeur.plaque ? ', plaque ' + c.chauffeur.plaque : '') + ') de ' + c.dep_adresse + ' vers ' + c.dest_adresse + '.'; },
      statut: { terminee: 'Terminée', annulee: 'Annulée', reservee: 'Réservée' }, imprimer: 'Imprimer ou enregistrer en PDF', fermer: 'Fermer'
    },
    en: {
      ou: 'Where to?', dep: 'Pickup', dest: 'Destination', depPh: 'Pickup address', destPh: 'Destination address', estim: 'Meter estimate',
      quand: 'When?', now: 'Now', plus: 'Later', pass: 'Passengers',
      o1: 'Accessible vehicle', o1b: 'Wheelchair, ramp', o2: 'Child seat', o2b: 'Add the child’s age in the note', o3: 'Pet', o3b: 'Guide dogs always welcome', o4: 'Luggage', o4b: 'Suitcases, groceries, walker',
      note: 'Note to driver (optional)', notePh: 'E.g. main entrance, I’m on the bench by the door',
      commander: 'Book my taxi', reserver: 'Book for', choisir: 'Pick the pickup and destination from the list',
      maPos: 'My location', libres: function (n) { return n === 1 ? '1 taxi available' : n + ' taxis available'; }, aucunLibre: 'No taxi available right now',
      recherche: 'Finding the nearest taxi…', rechercheSous: 'Request sent', attente: 'Waiting for a driver', attenteSous: 'Dispatch is on it',
      arrive: 'Your taxi is coming', arriveDans: function (m) { return 'Arriving in ' + m + ' min'; }, aLaPorte: 'Your taxi is here!', aLaPorteSous: 'Your driver is waiting',
      enRoute: 'On the way', enRouteSous: 'Enjoy the ride', reservee: 'Ride booked', reserveeSous: function (d) { return 'For ' + d; },
      e1: 'Booked', e2: 'Accepted', e3: 'At the door', e4: 'On the way', sestim: 'Estimate', partager: 'Share my trip', appeler: 'Call dispatch', annuler: 'Cancel ride',
      confAnnuler: 'Cancel this ride?', annulee: 'Ride cancelled', fSous: 'You have arrived', fTitre: function (n) { return 'How was your ride with ' + n + '?'; },
      ftotal: 'Meter total', fcomm: 'A comment (optional)', envoyer: 'Send my rating', passer: 'Close', merci: 'Thank you!',
      mescourses: 'My rides', avenir: 'Upcoming', historique: 'History', aucune: 'No rides yet.', recommander: 'Book again', facture: 'Receipt',
      cnom: 'Name', ccour: 'Email (for receipts)', clang: 'Language', sauver: 'Save', sauve: 'Saved', adr: 'My places', ajout: 'Add this place', adrPh: 'Search the address',
      maison: 'Home', travail: 'Work', autre: 'Other', secu: 'Security and alerts', cnip: 'New PIN (4 to 6 digits)', nipb: 'Change my PIN', nipOk: 'PIN changed',
      avis: 'Turn on alerts (taxi arrived, etc.)', avisOk: 'Alerts on', deco: 'Log out', paie: 'Payment in the car only, cash or card.',
      n1: 'Book', n2: 'My rides', n3: 'Account', supprimer: 'Remove', partageTxt: function (c) { return 'I’m in a taxi (' + (c.chauffeur && c.chauffeur.voiture ? 'car ' + c.chauffeur.voiture : 'Taxi Restigouche') + (c.chauffeur && c.chauffeur.plaque ? ', plate ' + c.chauffeur.plaque : '') + ') from ' + c.dep_adresse + ' to ' + c.dest_adresse + '.'; },
      statut: { terminee: 'Completed', annulee: 'Cancelled', reservee: 'Booked' }, imprimer: 'Print or save as PDF', fermer: 'Close'
    }
  };
  var t = D[L_];
  function txt(id, v) { var e = $('#' + id); if (e) e.textContent = v; }
  function appliquerTextes() {
    t = D[L_];
    ['ou', 'dep', 'dest', 'estim', 'quand', 'pass', 'o1', 'o1b', 'o2', 'o2b', 'o3', 'o3b', 'o4', 'o4b', 'note', 'sestim', 'mescourses', 'cnom', 'ccour', 'clang', 'adr', 'secu', 'cnip', 'paie', 'ftotal'].forEach(function (k) { txt('t-' + k, t[k]); });
    txt('q-now', t.now); txt('q-plus', t.plus); txt('n1', t.n1); txt('n2', t.n2); txt('n3', t.n3);
    txt('partager', t.partager); txt('appeler', t.appeler); txt('annuler', t.annuler); txt('c-sauver', t.sauver); txt('a-ajout', t.ajout);
    txt('c-nipb', t.nipb); txt('c-avis', t.avis); txt('deco', t.deco); txt('f-envoyer', t.passer);
    $('#dep').placeholder = t.depPh; $('#dest').placeholder = t.destPh; $('#note').placeholder = t.notePh; $('#a-adr').placeholder = t.adrPh; $('#f-comm').placeholder = t.fcomm;
    var bs = $$('#a-noms button'); bs[0].textContent = t.maison; bs[1].textContent = t.travail; bs[2].textContent = t.autre;
    document.documentElement.lang = L_;
    majBouton();
  }

  // ---------- Navigation ----------
  var vue = 'commander';
  $$('.navbas button').forEach(function (b) {
    b.onclick = function () {
      vue = b.dataset.v;
      $$('.navbas button').forEach(function (x) { x.classList.toggle('actif', x === b); });
      ['commander', 'courses', 'compte'].forEach(function (v) { $('#vue-' + v).classList.toggle('cache', v !== vue); });
      if (vue === 'commander') setTimeout(function () { carte.invalidateSize(); }, 50);
      if (vue === 'courses') chargerCourses();
      if (vue === 'compte') chargerCompte();
    };
  });

  // ---------- Carte ----------
  var carte = T.carte('carte', [48.005, -66.673], 13);
  var mMoi = null, mLibres = [], mChauffeur = null, mDep = null, mDest = null, maPos = null;
  function placerMoi(lat, lng) {
    maPos = { lat: lat, lng: lng };
    if (mMoi) mMoi.setLatLng([lat, lng]); else mMoi = T.marqueur(carte, lat, lng, '', 'marq-moi');
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async function (p) {
      placerMoi(p.coords.latitude, p.coords.longitude);
      if (!courseActive) carte.setView([p.coords.latitude, p.coords.longitude], 14);
      if (!dep.valeur()) { var a = await T.adresseDePosition(p.coords.latitude, p.coords.longitude); a.adresse = a.adresse === 'Ma position' ? t.maPos : a.adresse; dep.definir(a); }
    }, function () {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }
  async function majLibres() {
    var r = await sb.rpc('taxis_libres');
    var l = r.data || [];
    mLibres.forEach(function (m) { carte.removeLayer(m); }); mLibres = [];
    if (!courseActive) l.forEach(function (p) { mLibres.push(T.marqueur(carte, p.lat, p.lng, 'TAXI')); });
    txt('libres', l.length ? t.libres(l.length) : t.aucunLibre);
  }

  // ---------- Formulaire ----------
  var tarifs = await T.tarifs();
  var options = { adapte: false, siege: false, animal: false, bagages: false }, passagers = 1, plusTard = false, estimation = null;
  var dep = T.champAdresse($('#dep'), $('#dep-sug'), function () { majEstimation(); }, function () { return maPos; });
  var dest = T.champAdresse($('#dest'), $('#dest-sug'), function () { majEstimation(); }, function () { return maPos; });
  $$('#passagers button').forEach(function (b) { b.onclick = function () { passagers = +b.dataset.n; $$('#passagers button').forEach(function (x) { x.classList.toggle('choisi', x === b); }); }; });
  $$('.opt .basculer').forEach(function (b) { b.onclick = function () { options[b.dataset.o] = !options[b.dataset.o]; b.classList.toggle('on', options[b.dataset.o]); }; });
  $('#q-now').onclick = function () { plusTard = false; $('#q-now').classList.add('choisi'); $('#q-plus').classList.remove('choisi'); $('#q-date').classList.add('cache'); majBouton(); };
  $('#q-plus').onclick = function () {
    plusTard = true; $('#q-plus').classList.add('choisi'); $('#q-now').classList.remove('choisi'); $('#q-date').classList.remove('cache');
    if (!$('#q-date').value) { var d = new Date(Date.now() + 3600e3); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); $('#q-date').value = new Date(d - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16); }
    majBouton();
  };
  $('#q-date').onchange = majBouton;
  function majBouton() {
    var ok = dep.valeur() && dest.valeur();
    var b = $('#commander'); b.disabled = !ok;
    b.textContent = !ok ? t.choisir : (plusTard && $('#q-date').value ? t.reserver + ' ' + T.dateHeure(new Date($('#q-date').value)) : t.commander);
  }
  async function majEstimation() {
    majBouton();
    var a = dep.valeur(), b = dest.valeur();
    if (mDep) { carte.removeLayer(mDep); mDep = null; } if (mDest) { carte.removeLayer(mDest); mDest = null; }
    if (a) mDep = T.marqueur(carte, a.lat, a.lng, '', 'marq-dep');
    if (b) mDest = T.marqueur(carte, b.lat, b.lng, '', 'marq-dest');
    if (!a || !b) { $('#estim').classList.add('cache'); estimation = null; return; }
    carte.fitBounds([[a.lat, a.lng], [b.lat, b.lng]], { padding: [40, 40], maxZoom: 15 });
    var tr = await T.trajet(a, b);
    var p1 = T.prix(tarifs, a.prov, tr.km, 0), p2 = T.prix(tarifs, a.prov, tr.km * 1.08, 120);
    estimation = { total: p1.total, km: tr.km };
    $('#estim-prix').textContent = T.argent(p1.total) + ' – ' + T.argent(p2.total);
    $('#estim-km').textContent = T.km(tr.km) + ' · ' + Math.round(tr.min) + ' min';
    $('#estim-tarif').textContent = a.prov === 'QC' ? (L_ === 'en' ? 'Quebec rate + $1.05 fee' : 'Tarif Québec + redevance 1,05 $') : (L_ === 'en' ? 'N.B. rate' : 'Tarif N.-B.');
    $('#estim').classList.remove('cache');
  }

  // Favoris et récents
  var adresses = [], recents = [];
  async function chargerFavoris() {
    var r = await sb.from('adresses').select('*').order('cree_le');
    adresses = r.data || [];
    var h = await sb.from('courses').select('dep_adresse,dep_ville,dep_prov,dep_lat,dep_lng,dest_adresse,dest_ville,dest_prov,dest_lat,dest_lng').eq('client_id', moi.id).eq('statut', 'terminee').order('cree_le', { ascending: false }).limit(10);
    var vus = {}; recents = [];
    (h.data || []).forEach(function (c) { var k = c.dest_adresse; if (!vus[k] && recents.length < 3) { vus[k] = 1; recents.push({ adresse: c.dest_adresse, ville: c.dest_ville, prov: c.dest_prov || 'NB', lat: c.dest_lat, lng: c.dest_lng }); } });
    function puces(el, champ, avecRecents) {
      var l = adresses.map(function (a) { return { nom: a.nom, a: { adresse: a.adresse, ville: a.ville, prov: a.province, lat: a.lat, lng: a.lng } }; });
      if (avecRecents) recents.forEach(function (r) { l.push({ nom: '↺ ' + r.adresse, a: r }); });
      el.innerHTML = l.map(function (x, i) { return '<button class="puce" data-i="' + i + '">' + esc(x.nom) + '</button>'; }).join('');
      $$('button', el).forEach(function (b) { b.onclick = function () { champ.definir(l[+b.dataset.i].a); }; });
    }
    puces($('#favoris-dep'), dep, false);
    puces($('#favoris-dest'), dest, true);
  }

  $('#commander').onclick = async function () {
    var a = dep.valeur(), b = dest.valeur(), err = $('#err-cmd');
    err.textContent = '';
    if (!a || !b) return;
    var prevue = plusTard && $('#q-date').value ? new Date($('#q-date').value) : null;
    if (prevue && prevue < new Date()) { err.textContent = L_ === 'en' ? 'Pick a future time.' : 'Choisissez une heure à venir.'; return; }
    $('#commander').disabled = true;
    var r = await sb.rpc('commander', {
      p_dep_adresse: a.adresse, p_dep_ville: a.ville, p_dep_prov: a.prov, p_dep_lat: a.lat, p_dep_lng: a.lng,
      p_dest_adresse: b.adresse, p_dest_ville: b.ville, p_dest_prov: b.prov, p_dest_lat: b.lat, p_dest_lng: b.lng,
      p_passagers: passagers, p_options: options, p_note: $('#note').value.trim() || null, p_prevue_le: prevue ? prevue.toISOString() : null,
      p_estimation: estimation ? Math.round(estimation.total * 100) / 100 : null, p_distance_km: estimation ? Math.round(estimation.km * 10) / 10 : null
    });
    $('#commander').disabled = false;
    if (r.error) { err.textContent = r.error.message; return; }
    T.demanderAvis();
    if (prevue) { T.toast(t.reservee + ' · ' + T.dateHeure(prevue)); dest.definir(null); $('#note').value = ''; $('#q-now').onclick(); return; }
    await suivre();
  };

  // ---------- Suivi ----------
  var courseActive = null, dernierStatut = null, finCourse = null, note = 0;
  function etapes(n) { ['e1', 'e2', 'e3', 'e4'].forEach(function (id, i) { txt(id, t[id]); $('#' + id).classList.toggle('fait', i < n); }); }
  async function suivre() {
    var r = await sb.rpc('ma_course');
    var c = r.data;
    if (!c) {
      if (courseActive) {
        var f = await sb.from('courses').select('*').eq('id', courseActive.id).maybeSingle();
        courseActive = null;
        if (f.data && f.data.statut === 'terminee') montrerFin(f.data);
        else { if (f.data && f.data.statut === 'annulee') T.toast(t.annulee); montrerForm(); }
      }
      return;
    }
    courseActive = c;
    $('#etat-form').classList.add('cache'); $('#etat-fin').classList.add('cache'); $('#etat-suivi').classList.remove('cache');
    txt('s-dep', c.dep_adresse + (c.dep_ville ? ', ' + c.dep_ville : '')); txt('s-dest', c.dest_adresse + (c.dest_ville ? ', ' + c.dest_ville : ''));
    txt('s-estim', c.estimation ? '≈ ' + T.argent(c.estimation) : '—');
    var ch = c.chauffeur;
    $('#s-chauffeur').classList.toggle('cache', !ch); $('#s-voiture').classList.toggle('cache', !ch || !ch.voiture);
    if (ch) { txt('s-nom', ch.nom); txt('s-init', (ch.nom || '?')[0]); txt('s-veh', [ch.vehicule, ch.plaque ? (L_ === 'en' ? 'plate ' : 'plaque ') + ch.plaque : ''].filter(Boolean).join(' · ')); txt('s-voiture', ch.voiture || ''); }
    var st = c.statut;
    if (st === 'attente' || st === 'offerte') { txt('s-titre', st === 'offerte' ? t.recherche : t.attente); txt('s-sous', st === 'offerte' ? t.rechercheSous : t.attenteSous); etapes(1); }
    else if (st === 'acceptee') {
      var min = null;
      if (ch && ch.lat != null && c.dep_lat != null) min = Math.max(1, Math.round(T.distance(ch.lat, ch.lng, c.dep_lat, c.dep_lng) * 1.3 / 50 * 60));
      txt('s-titre', t.arrive); txt('s-sous', min ? t.arriveDans(min) : ''); etapes(2);
    }
    else if (st === 'arrivee') { txt('s-titre', t.aLaPorte); txt('s-sous', t.aLaPorteSous); etapes(3); }
    else if (st === 'en_course') { txt('s-titre', t.enRoute); txt('s-sous', t.enRouteSous); etapes(4); }
    $('#annuler').classList.toggle('cache', st === 'en_course' || st === 'arrivee');
    if (dernierStatut && dernierStatut !== st) {
      if (st === 'acceptee') T.avis('Taxi Restigouche', t.arrive);
      if (st === 'arrivee') T.avis('Taxi Restigouche', t.aLaPorte);
    }
    dernierStatut = st;
    // carte
    mLibres.forEach(function (m) { carte.removeLayer(m); }); mLibres = [];
    if (!mDep && c.dep_lat != null) mDep = T.marqueur(carte, c.dep_lat, c.dep_lng, '', 'marq-dep');
    if (!mDest && c.dest_lat != null) mDest = T.marqueur(carte, c.dest_lat, c.dest_lng, '', 'marq-dest');
    if (ch && ch.lat != null) {
      if (mChauffeur) mChauffeur.setLatLng([ch.lat, ch.lng]); else mChauffeur = T.marqueur(carte, ch.lat, ch.lng, esc(ch.voiture || 'TAXI'));
      var cible = st === 'en_course' ? [c.dest_lat, c.dest_lng] : [c.dep_lat, c.dep_lng];
      if (cible[0] != null) carte.fitBounds([[ch.lat, ch.lng], cible], { padding: [50, 50], maxZoom: 16 });
    }
  }
  function montrerForm() {
    if (mChauffeur) { carte.removeLayer(mChauffeur); mChauffeur = null; }
    dernierStatut = null;
    $('#etat-suivi').classList.add('cache'); $('#etat-fin').classList.add('cache'); $('#etat-form').classList.remove('cache');
    dest.definir(null); $('#note').value = '';
    chargerFavoris(); majLibres();
  }
  function montrerFin(c) {
    finCourse = c; note = 0;
    if (mChauffeur) { carte.removeLayer(mChauffeur); mChauffeur = null; }
    $('#etat-suivi').classList.add('cache'); $('#etat-form').classList.add('cache'); $('#etat-fin').classList.remove('cache');
    txt('f-sous', t.fSous); txt('f-titre', t.fTitre((c.detail && c.detail.chauffeur) || (L_ === 'en' ? 'your driver' : 'votre chauffeur')));
    txt('f-total', T.argent(c.total));
    txt('f-detail', T.km(c.compteur_km) + (c.compteur_attente_s ? ' · ' + Math.round(c.compteur_attente_s / 60) + ' min ' + (L_ === 'en' ? 'waiting' : 'd’attente') : '') + ' · ' + (c.paiement === 'carte' ? (L_ === 'en' ? 'card' : 'carte') : (L_ === 'en' ? 'cash' : 'comptant')));
    $('#etoiles').innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<button data-n="' + n + '" aria-label="' + n + '">☆</button>'; }).join('');
    $$('#etoiles button').forEach(function (b) {
      b.onclick = function () { note = +b.dataset.n; $$('#etoiles button').forEach(function (x) { x.textContent = +x.dataset.n <= note ? '★' : '☆'; }); txt('f-envoyer', t.envoyer); };
    });
    T.avis('Taxi Restigouche', t.fSous);
  }
  $('#f-envoyer').onclick = async function () {
    if (note && finCourse) { await sb.rpc('evaluer', { p_id: finCourse.id, p_note: note, p_commentaire: $('#f-comm').value.trim() || null }); T.toast(t.merci); }
    $('#f-comm').value = ''; montrerForm();
  };
  $('#annuler').onclick = async function () {
    if (!courseActive) return;
    var rp = PARAMS.repartition || {}, fr = Number(rp.frais_annulation || 0), msg = t.confAnnuler;
    if (fr && courseActive.acceptee_le && (Date.now() - new Date(courseActive.acceptee_le)) > (rp.annulation_gratuite_min || 2) * 60e3)
      msg += (L_ === 'en' ? '\nA cancellation fee of ' : '\nDes frais d’annulation de ') + T.argent(fr) + (L_ === 'en' ? ' apply.' : ' s’appliquent.');
    if (!confirm(msg)) return;
    var r = await sb.rpc('annuler_course', { p_id: courseActive.id });
    if (r.error) { T.toast(r.error.message, true); return; }
    courseActive = null; T.toast(t.annulee); montrerForm();
  };
  $('#partager').onclick = async function () {
    if (!courseActive) return;
    var msg = t.partageTxt(courseActive);
    if (navigator.share) { try { await navigator.share({ text: msg }); } catch (e) {} }
    else { try { await navigator.clipboard.writeText(msg); T.toast(L_ === 'en' ? 'Copied' : 'Copié'); } catch (e) {} }
  };
  if (T.ENTREPRISE.telephone) { $('#appeler').href = 'tel:' + T.ENTREPRISE.telephone; $('#appeler').classList.remove('cache'); }

  // ---------- Mes courses et factures ----------
  async function chargerCourses() {
    var r = await sb.from('courses').select('*').eq('client_id', moi.id).order('cree_le', { ascending: false }).limit(60);
    var l = r.data || [];
    var av = l.filter(function (c) { return c.statut === 'reservee'; }), hi = l.filter(function (c) { return c.statut === 'terminee' || c.statut === 'annulee'; });
    $('#avenir').innerHTML = av.length ? '<h2 style="font-size: 18px">' + t.avenir + '</h2>' + av.map(function (c) {
      return '<div class="carte pile" style="gap: 6px"><div class="entre"><span class="gras">' + T.dateHeure(c.prevue_le) + '</span><span class="pastille p-dispo">' + t.statut.reservee + '</span></div><div style="font-size: 14px">' + esc(c.dep_adresse) + ' → ' + esc(c.dest_adresse) + '</div><button class="btn btn-lien" style="color: var(--terra-fonce); align-self: flex-start" data-annuler="' + c.id + '">' + t.annuler + '</button></div>';
    }).join('') : '';
    $('#historique').innerHTML = '<h2 style="font-size: 18px">' + t.historique + '</h2>' + (hi.length ? hi.map(function (c) {
      return '<div class="carte pile" style="gap: 6px"><div class="entre"><span class="petit doux gras">' + T.dateHeure(c.cree_le) + '</span><span class="gras">' + (c.statut === 'terminee' ? T.argent(c.total) : '<span class="pastille p-hors">' + t.statut.annulee + '</span>') + '</span></div>' +
        '<div style="font-size: 15px; font-weight: 700">' + esc(c.dep_adresse) + ' → ' + esc(c.dest_adresse) + '</div>' +
        '<div class="ligne">' + (c.statut === 'terminee' ? '<button class="btn btn-contour" style="min-height: 44px; flex: 1" data-facture="' + c.id + '">' + t.facture + '</button>' : '') +
        '<button class="btn btn-contour" style="min-height: 44px; flex: 1" data-refaire="' + c.id + '">' + t.recommander + '</button></div></div>';
    }).join('') : '<div class="vide">' + t.aucune + '</div>');
    $$('[data-annuler]').forEach(function (b) { b.onclick = async function () { if (!confirm(t.confAnnuler)) return; var x = await sb.rpc('annuler_course', { p_id: +b.dataset.annuler }); if (x.error) T.toast(x.error.message, true); chargerCourses(); }; });
    $$('[data-facture]').forEach(function (b) { b.onclick = function () { facture(l.find(function (c) { return c.id === +b.dataset.facture; })); }; });
    $$('[data-refaire]').forEach(function (b) {
      b.onclick = function () {
        var c = l.find(function (x) { return x.id === +b.dataset.refaire; });
        dep.definir({ adresse: c.dep_adresse, ville: c.dep_ville, prov: c.dep_prov, lat: c.dep_lat, lng: c.dep_lng });
        dest.definir({ adresse: c.dest_adresse, ville: c.dest_ville, prov: c.dest_prov || 'NB', lat: c.dest_lat, lng: c.dest_lng });
        $$('.navbas button')[0].click();
      };
    });
  }
  function facture(c) {
    var d = c.detail || {}, prov = c.dep_prov, compteur = Number(d.compteur || c.total), red = Number(d.redevance || 0);
    var lignes = [[L_ === 'en' ? 'Meter (taxes included)' : 'Compteur (taxes incluses)', compteur]];
    if (red) lignes.push([L_ === 'en' ? 'Quebec ride fee' : 'Redevance (Québec)', red]);
    var tx = T.taxes(prov, compteur, red);
    var E = T.ENTREPRISE;
    $('#modal-boite').innerHTML = '<div id="facture-imp" class="carte pile">' +
      '<div class="entre"><div><div class="titre" style="font-size: 22px">' + t.facture + '</div><div class="petit doux">N° ' + String(c.id).padStart(6, '0') + ' · ' + T.dateHeure(c.fin_le || c.cree_le) + '</div></div><div class="titre" style="width: 40px; height: 40px; border-radius: 12px; background: var(--sauge); color: #fffbf8; display: flex; align-items: center; justify-content: center">T</div></div>' +
      '<div class="petit doux">' + esc(E.nom) + '<br>' + esc(E.adresse) + '</div>' +
      '<div style="font-size: 14px" class="pile" style="gap: 4px"><div>' + (L_ === 'en' ? 'From: ' : 'De : ') + esc(c.dep_adresse) + ', ' + esc(c.dep_ville || '') + '</div><div>' + (L_ === 'en' ? 'To: ' : 'À : ') + esc(c.dest_adresse) + ', ' + esc(c.dest_ville || '') + '</div><div class="doux">' + T.km(c.compteur_km) + (c.compteur_attente_s ? ' · ' + Math.round(c.compteur_attente_s / 60) + ' min ' + (L_ === 'en' ? 'waiting' : 'd’attente') : '') + ' · ' + (prov === 'QC' ? (L_ === 'en' ? 'Quebec rate' : 'Tarif Québec') : (L_ === 'en' ? 'N.B. rate' : 'Tarif N.-B.')) + '</div></div>' +
      '<div>' + lignes.map(function (l) { return '<div class="ligne-tab"><span class="doux">' + l[0] + '</span><span>' + T.argent(l[1]) + '</span></div>'; }).join('') +
      tx.map(function (l) { return '<div class="ligne-tab petit"><span class="doux">' + l[0] + '</span><span>' + T.argent(l[1]) + '</span></div>'; }).join('') +
      '<div class="ligne-tab gras" style="font-size: 18px"><span>Total</span><span>' + T.argent(c.total) + '</span></div></div>' +
      '<div class="petit doux">' + (prov === 'QC' ? 'N° TPS : ' + esc(E.tps) + ' · N° TVQ : ' + esc(E.tvq) : 'N° TPS/TVH : ' + esc(E.tps)) + '<br>' + (L_ === 'en' ? 'Paid in the car · ' : 'Payé à bord · ') + (c.paiement === 'carte' ? (L_ === 'en' ? 'card' : 'carte') : (L_ === 'en' ? 'cash' : 'comptant')) + '</div></div>' +
      '<div class="pile noimp" style="margin-top: 12px"><button class="btn btn-plein" id="imp">' + t.imprimer + '</button><button class="btn btn-contour" id="fermer">' + t.fermer + '</button></div>';
    $('#modal').classList.remove('cache');
    $('#imp').onclick = function () { window.print(); };
    $('#fermer').onclick = function () { $('#modal').classList.add('cache'); };
  }
  $('#modal').onclick = function (e) { if (e.target.id === 'modal') $('#modal').classList.add('cache'); };

  // ---------- Compte ----------
  var nomAdr = 'Maison';
  var nouvelleAdr = T.champAdresse($('#a-adr'), $('#a-sug'), function (a) { $('#a-ajout').disabled = !a; }, function () { return maPos; });
  $$('#a-noms button').forEach(function (b) { b.onclick = function () { nomAdr = b.dataset.n; $$('#a-noms button').forEach(function (x) { x.classList.toggle('choisi', x === b); }); $('#a-autre').classList.toggle('cache', nomAdr !== 'Autre'); }; });
  async function chargerCompte() {
    txt('c-nom', moi.nom); txt('c-init', (moi.nom || '?')[0]); txt('c-tel', T.telJoli(moi.telephone));
    $('#c-nomin').value = moi.nom || ''; $('#c-courriel').value = moi.courriel || '';
    $('#cl-fr').classList.toggle('choisi', L_ === 'fr'); $('#cl-en').classList.toggle('choisi', L_ === 'en');
    var r = await sb.from('adresses').select('*').order('cree_le');
    $('#adresses').innerHTML = (r.data || []).map(function (a) {
      return '<div class="carte entre" style="padding: 12px 14px"><div><div class="gras">' + esc(a.nom) + '</div><div class="petit doux">' + esc(a.adresse) + ', ' + esc(a.ville || '') + '</div></div><button class="btn btn-lien" style="color: var(--terra-fonce)" data-sup="' + a.id + '">' + t.supprimer + '</button></div>';
    }).join('');
    $$('[data-sup]').forEach(function (b) { b.onclick = async function () { await sb.from('adresses').delete().eq('id', +b.dataset.sup); chargerCompte(); chargerFavoris(); }; });
  }
  $('#cl-fr').onclick = function () { L_ = 'fr'; $('#cl-fr').classList.add('choisi'); $('#cl-en').classList.remove('choisi'); };
  $('#cl-en').onclick = function () { L_ = 'en'; $('#cl-en').classList.add('choisi'); $('#cl-fr').classList.remove('choisi'); };
  $('#c-sauver').onclick = async function () {
    var r = await sb.from('profils').update({ nom: $('#c-nomin').value.trim() || moi.nom, courriel: $('#c-courriel').value.trim() || null, langue: L_ }).eq('id', moi.id);
    if (r.error) { T.toast(r.error.message, true); return; }
    moi.nom = $('#c-nomin').value.trim() || moi.nom; moi.langue = L_; localStorage.setItem('taxi-langue', L_);
    appliquerTextes(); chargerCompte(); T.toast(t.sauve);
  };
  $('#a-ajout').onclick = async function () {
    var a = nouvelleAdr.valeur(); if (!a) return;
    var nom = nomAdr === 'Autre' ? ($('#a-autre').value.trim() || t.autre) : (nomAdr === 'Maison' ? t.maison : t.travail);
    var r = await sb.from('adresses').insert({ client_id: moi.id, nom: nom, adresse: a.adresse, ville: a.ville, province: a.prov, lat: a.lat, lng: a.lng });
    if (r.error) { T.toast(r.error.message, true); return; }
    nouvelleAdr.definir(null); $('#a-autre').value = ''; chargerCompte(); chargerFavoris();
  };
  $('#c-nipb').onclick = async function () {
    try { await T.changerMonNip(moi.telephone, $('#c-nip').value.trim()); $('#c-nip').value = ''; T.toast(t.nipOk); } catch (e) { T.toast(T.erreurMsg(e), true); }
  };
  $('#c-avis').onclick = async function () { try { var p = await Notification.requestPermission(); if (p === 'granted') T.toast(t.avisOk); } catch (e) {} };
  $('#deco').onclick = function () { T.deconnexion(); };
  txt('t-paie', t.paie);

  // ---------- Démarrage et mises à jour en direct ----------
  appliquerTextes();
  await chargerFavoris();
  await suivre();
  if (!courseActive) majLibres();
  sb.channel('client-' + moi.id).on('postgres_changes', { event: '*', schema: 'public', table: 'courses', filter: 'client_id=eq.' + moi.id }, function () { suivre(); }).subscribe();
  setInterval(function () { if (!document.hidden) { sb.rpc('verifier_offres').then(function () {}); suivre(); if (!courseActive && vue === 'commander') majLibres(); } }, 6000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) suivre(); });
})();
