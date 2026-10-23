/* Taxi Restigouche — centrale de répartition */
(async function () {
  var T = Taxi, $ = T.$, $$ = T.$$, sb = T.sb, esc = T.esc;
  var moi = await T.exigerRole(['centrale']);
  if (!moi) return;
  $('#moi-nom').textContent = moi.nom;
  $('#deco').onclick = function () { T.deconnexion(); };
  $('#mode-ch').onclick = function () { location.href = 'chauffeur.html'; };
  var tarifs = await T.tarifs();
  await T.parametres();

  var vue = 'repartition';
  $$('header nav button[data-v]').forEach(function (b) {
    b.onclick = function () {
      vue = b.dataset.v;
      $$('header nav button[data-v]').forEach(function (x) { x.classList.toggle('actif', x === b); });
      $$('main > section').forEach(function (s) { s.classList.toggle('cache', s.id !== 'v-' + vue); });
      ({ repartition: function () { setTimeout(function () { carte.invalidateSize(); }, 60); charger(); }, rapports: rapports, chauffeurs: chauffeurs, clients: clients, tarifs: vueTarifs, comptes: comptes, messages: function () { messages(true); }, reglages: reglages })[vue]();
    };
  });
  function modal(html) { $('#modal-boite').innerHTML = html; $('#modal').classList.remove('cache'); }
  function fermer() { $('#modal').classList.add('cache'); }
  $('#modal').onclick = function (e) { if (e.target.id === 'modal') fermer(); };

  // Un compte centrale qui conduit (n° de voiture inscrit, ou en service) compte aussi comme chauffeur
  function conduit(c) { return c.role === 'chauffeur' || (c.role === 'centrale' && (!!c.voiture || c.statut !== 'hors')); }
  var LIB = { reservee: ['Réservée', 'p-dispo'], attente: ['En attente', 'p-course'], offerte: ['Offerte', 'p-pause'], acceptee: ['Acceptée', 'p-dispo'], arrivee: ['À la porte', 'p-dispo'], en_course: ['En course', 'p-course'], terminee: ['Terminée', 'p-hors'], annulee: ['Annulée', 'p-hors'] };
  var COUL = { dispo: '#5f8570', course: '#a85743', pause: '#a8741f', hors: '#b5a89c' };
  var STL = { dispo: ['Disponible', 'p-dispo'], course: ['En course', 'p-course'], pause: ['En pause', 'p-pause'], hors: ['Hors service', 'p-hors'] };

  // ---------- Répartition ----------
  var carte = T.carte('carteR', [47.95, -66.55], 9);
  var REGION = [[47.45, -67.6], [48.4, -65.5]];
  carte.fitBounds(REGION);
  $('#z-region').onclick = function () { carte.fitBounds(REGION); $('#z-region').classList.add('choisi'); $('#z-ville').classList.remove('choisi'); };
  $('#z-ville').onclick = function () { carte.setView([48.005, -66.68], 14); $('#z-ville').classList.add('choisi'); $('#z-region').classList.remove('choisi'); };
  var couches = L.layerGroup().addTo(carte);
  var chauffeursL = [], coursesL = [], comptesL = [];

  async function charger() {
    var a = await sb.from('profils').select('*').in('role', ['chauffeur', 'centrale']).order('nom');
    chauffeursL = (a.data || []).filter(conduit);
    var b = await sb.from('courses').select('*').in('statut', ['reservee', 'attente', 'offerte', 'acceptee', 'arrivee', 'en_course']).order('cree_le', { ascending: false });
    coursesL = b.data || [];
    dessiner();
  }
  function nomCh(id) { var c = chauffeursL.find(function (x) { return x.id === id; }); return c ? (c.voiture ? c.voiture + ' · ' : '') + c.nom : '—'; }
  function enLigne(c) { return c.statut !== 'hors' && c.position_le && (Date.now() - new Date(c.position_le)) < 15 * 60e3; }
  function dessiner() {
    var actifs = chauffeursL.filter(function (c) { return c.actif; });
    var n = { dispo: 0, course: 0, pause: 0, hors: 0 };
    actifs.forEach(function (c) { n[c.statut] = (n[c.statut] || 0) + 1; });
    var att = coursesL.filter(function (c) { return c.statut === 'attente'; }).length;
    $('#compteurs').innerHTML = '<span class="pastille p-dispo" style="font-size: 14px; padding: 8px 14px">' + n.dispo + ' disponibles</span><span class="pastille p-course" style="font-size: 14px; padding: 8px 14px">' + n.course + ' en course</span><span class="pastille p-pause" style="font-size: 14px; padding: 8px 14px">' + n.pause + ' en pause</span><span class="pastille p-hors" style="font-size: 14px; padding: 8px 14px">' + n.hors + ' hors service</span>' + (att ? '<span class="pastille" style="background: var(--terra); color: #fffbf8; font-size: 14px; padding: 8px 14px">' + att + ' course' + (att > 1 ? 's' : '') + ' sans chauffeur</span>' : '');

    // Carte
    couches.clearLayers();
    actifs.filter(function (c) { return c.lat != null && c.statut !== 'hors'; }).forEach(function (c) {
      var ic = L.divIcon({ className: '', html: '<div class="marq" style="border-color: ' + COUL[c.statut] + (enLigne(c) ? '' : '; opacity: .45') + '">' + esc(c.voiture || c.nom.split(' ')[0]) + '</div>', iconSize: [0, 0] });
      L.marker([c.lat, c.lng], { icon: ic }).bindTooltip(esc(c.nom) + ' · ' + STL[c.statut][0]).addTo(couches);
    });
    coursesL.filter(function (c) { return (c.statut === 'attente' || c.statut === 'offerte') && c.dep_lat != null; }).forEach(function (c) {
      var ic = L.divIcon({ className: '', html: '<div class="marq-client">' + esc(c.client_nom || 'Client') + '</div>', iconSize: [0, 0] });
      L.marker([c.dep_lat, c.dep_lng], { icon: ic }).addTo(couches);
    });

    // Liste des courses
    var dispo = actifs.filter(function (c) { return c.statut === 'dispo'; });
    $('#liste-courses').innerHTML = coursesL.length ? coursesL.map(function (c) {
      var l = LIB[c.statut];
      var opts = c.options || {}, ex = [c.passagers + ' pass.'];
      if (opts.adapte) ex.push('adapté'); if (opts.siege) ex.push('siège enfant'); if (opts.animal) ex.push('animal'); if (opts.bagages) ex.push('bagages');
      var proches = dispo.slice().sort(function (x, y) { return (T.distance(x.lat, x.lng, c.dep_lat, c.dep_lng) || 999) - (T.distance(y.lat, y.lng, c.dep_lat, c.dep_lng) || 999); });
      var h = '<div class="cc' + (c.statut === 'attente' ? ' attente' : '') + '">' +
        '<div class="entre"><span class="gras">' + esc(c.client_nom || 'Client') + (c.source === 'telephone' ? ' <span class="petit doux">(appel)</span>' : '') + '</span><span class="pastille ' + l[1] + '">' + l[0] + '</span></div>' +
        '<div style="font-size: 14px"><span class="doux">De :</span> ' + esc(c.dep_adresse) + (c.dep_ville ? ', ' + esc(c.dep_ville) : '') + '<br><span class="doux">À :</span> ' + esc(c.dest_adresse) + (c.dest_ville ? ', ' + esc(c.dest_ville) : '') + '</div>' +
        '<div class="petit doux">' + (c.prevue_le ? 'Pour ' + T.dateHeure(c.prevue_le) + ' · ' : 'Commandée à ' + T.heure(c.cree_le) + ' · ') + ex.join(', ') + ' · ' + c.dep_prov + (c.client_tel ? ' · ' + T.telJoli(c.client_tel) : '') + (c.note ? '<br>« ' + esc(c.note) + ' »' : '') + '</div>';
      if (c.note_centrale) h += '<div class="petit" style="background: var(--ambre-pale); padding: 6px 10px; border-radius: 10px">Note interne : ' + esc(c.note_centrale) + '</div>';
      if (c.statut === 'offerte') h += '<div class="petit gras" style="color: var(--ambre-fonce)">Offerte à ' + esc(nomCh(c.offerte_a)) + '…</div>';
      if (c.chauffeur_id) h += '<div class="petit gras" style="color: var(--sauge-fonce)">Chauffeur : ' + esc(nomCh(c.chauffeur_id)) + '</div>';
      if (['reservee', 'attente', 'offerte'].indexOf(c.statut) >= 0) {
        h += '<div class="petit gras doux">Attribuer (du plus proche au plus loin) :</div><div class="puces">' + (proches.length ? proches.map(function (d) {
          var km = T.distance(d.lat, d.lng, c.dep_lat, c.dep_lng);
          return '<button class="puce" style="min-height: 40px" data-attr="' + c.id + '" data-ch="' + d.id + '">' + esc(d.voiture || '') + ' ' + esc(d.nom.split(' ')[0]) + (km != null ? ' · ' + T.km(km) : '') + '</button>';
        }).join('') : '<span class="petit doux">Aucun chauffeur disponible</span>') + '</div>';
      }
      h += '<div class="ligne" style="flex-wrap: wrap">';
      if (['acceptee', 'arrivee', 'offerte'].indexOf(c.statut) >= 0) h += '<button class="btn btn-contour btn-p" data-retirer="' + c.id + '">Retirer le chauffeur</button>';
      h += '<button class="btn btn-contour btn-p" data-modcourse="' + c.id + '">Modifier</button>';
      if (c.statut !== 'en_course') h += '<button class="btn btn-lien" style="color: var(--terra-fonce); min-height: 40px" data-annuler="' + c.id + '">Annuler</button>';
      h += '</div></div>';
      return h;
    }).join('') : '<div class="carte vide">Aucune course en cours.</div>';
    $$('[data-attr]').forEach(function (b) { b.onclick = async function () { var r = await sb.rpc('attribuer', { p_id: +b.dataset.attr, p_chauffeur: b.dataset.ch }); if (r.error) T.toast(r.error.message, true); charger(); }; });
    $$('[data-modcourse]').forEach(function (b) { b.onclick = function () { modifierCourse(coursesL.find(function (x) { return x.id === +b.dataset.modcourse; })); }; });
    $$('[data-retirer]').forEach(function (b) { b.onclick = async function () { var r = await sb.rpc('retirer', { p_id: +b.dataset.retirer }); if (r.error) T.toast(r.error.message, true); charger(); }; });
    $$('[data-annuler]').forEach(function (b) { b.onclick = async function () { if (!confirm('Annuler cette course ?')) return; var r = await sb.rpc('annuler_course', { p_id: +b.dataset.annuler }); if (r.error) T.toast(r.error.message, true); charger(); }; });

    // Liste des chauffeurs
    $('#liste-ch').innerHTML = actifs.length ? actifs.sort(function (x, y) { return ['dispo', 'course', 'pause', 'hors'].indexOf(x.statut) - ['dispo', 'course', 'pause', 'hors'].indexOf(y.statut); }).map(function (c) {
      var s = STL[c.statut];
      var vu = c.position_le ? 'GPS ' + Math.max(0, Math.round((Date.now() - new Date(c.position_le)) / 60e3)) + ' min' : 'pas de GPS';
      return '<div class="carte ligne" style="padding: 10px 12px"><div style="width: 44px; height: 36px; border-radius: 10px; border: 2.5px solid ' + COUL[c.statut] + '; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex: none">' + esc(c.voiture || '—') + '</div><div style="flex: 1; min-width: 0"><div class="gras" style="font-size: 14px">' + esc(c.nom) + '</div><div class="petit doux">' + (c.statut === 'hors' ? '' : vu) + '</div></div><span class="pastille ' + s[1] + '">' + s[0] + '</span></div>';
    }).join('') : '<div class="carte vide">Aucun chauffeur. Ajoute-les dans l’onglet Chauffeurs.</div>';
  }

  // Appel téléphonique
  var aOpts = {};
  var aDep = T.champAdresse($('#a-dep'), $('#a-dep-s'), majAppel), aDest = T.champAdresse($('#a-dest'), $('#a-dest-s'), majAppel);
  function majAppel() {
    var ok = aDep.valeur() && aDest.valeur();
    $('#a-envoyer').disabled = !ok;
    $('#a-envoyer').textContent = ok ? ($('#a-quand').value ? 'Réserver pour ' + T.dateHeure(new Date($('#a-quand').value)) : 'Envoyer au chauffeur disponible le plus proche') : 'Choisissez le départ et la destination dans la liste';
    var a = aDep.valeur();
    $('#a-tarif').textContent = a ? 'Tarif appliqué : ' + (a.prov === 'QC' ? 'Québec + redevance 1,05 $' : 'Nouveau-Brunswick') + ' (selon la ville de départ)' : '';
  }
  $('#a-quand').onchange = majAppel;
  $$('#a-opts .puce').forEach(function (b) { b.onclick = function () { aOpts[b.dataset.o] = !aOpts[b.dataset.o]; b.classList.toggle('choisie', aOpts[b.dataset.o]); }; });
  $('#b-appel').onclick = async function () {
    var f = $('#f-appel'); f.classList.toggle('cache');
    $('#b-appel').textContent = f.classList.contains('cache') ? '+ Appel téléphonique' : 'Fermer';
    if (!f.classList.contains('cache')) {
      var r = await sb.from('comptes').select('id,nom').eq('actif', true).order('nom');
      $('#a-compte').innerHTML = '<option value="">Aucun (paie à bord)</option>' + (r.data || []).map(function (c) { return '<option value="' + c.id + '">' + esc(c.nom) + '</option>'; }).join('');
      $('#a-nom').focus();
    }
  };
  $('#a-envoyer').onclick = async function () {
    var a = aDep.valeur(), b = aDest.valeur(); if (!a || !b) return;
    $('#a-err').textContent = '';
    var q = $('#a-quand').value ? new Date($('#a-quand').value) : null;
    var est = null; try { var tr = await T.trajet(a, b); est = { t: T.prix(tarifs, a.prov, tr.km, 0).total, km: tr.km }; } catch (e) {}
    var r = await sb.rpc('commander', {
      p_dep_adresse: a.adresse, p_dep_ville: a.ville, p_dep_prov: a.prov, p_dep_lat: a.lat, p_dep_lng: a.lng,
      p_dest_adresse: b.adresse, p_dest_ville: b.ville, p_dest_prov: b.prov, p_dest_lat: b.lat, p_dest_lng: b.lng,
      p_passagers: +$('#a-pass').value, p_options: aOpts, p_note: $('#a-note').value.trim() || null, p_prevue_le: q ? q.toISOString() : null,
      p_estimation: est ? Math.round(est.t * 100) / 100 : null, p_distance_km: est ? Math.round(est.km * 10) / 10 : null,
      p_client_nom: $('#a-nom').value.trim() || null, p_client_tel: T.tel10($('#a-tel').value) || null, p_compte_id: $('#a-compte').value ? +$('#a-compte').value : null
    });
    if (r.error) { $('#a-err').textContent = r.error.message; return; }
    T.toast(q ? 'Course réservée' : 'Course envoyée aux chauffeurs');
    aDep.definir(null); aDest.definir(null); ['#a-nom', '#a-tel', '#a-note', '#a-quand'].forEach(function (s) { $(s).value = ''; });
    aOpts = {}; $$('#a-opts .puce').forEach(function (x) { x.classList.remove('choisie'); });
    $('#b-appel').click(); charger();
  };

  // ---------- Alertes d'urgence ----------
  async function alertes() {
    var r = await sb.from('alertes').select('*').is('terminee_le', null).order('cree_le', { ascending: false });
    var l = r.data || [];
    var el = $('#alerte');
    if (!l.length) { el.classList.add('cache'); return; }
    el.classList.remove('cache');
    el.innerHTML = l.map(function (a) {
      var c = chauffeursL.find(function (x) { return x.id === a.chauffeur_id; }) || {};
      return '<span>URGENCE · ' + esc(c.nom || 'Chauffeur') + (c.voiture ? ' (' + esc(c.voiture) + ')' : '') + ' à ' + T.heure(a.cree_le) + (c.telephone ? ' · ' + T.telJoli(c.telephone) : '') + '</span><span class="ligne">' +
        (a.lat != null ? '<a class="btn btn-p" style="background: #fffbf8; color: var(--rouge)" target="_blank" rel="noopener" href="https://www.google.com/maps?q=' + a.lat + ',' + a.lng + '">Voir la position</a>' : '') +
        (c.telephone ? '<a class="btn btn-p" style="background: #fffbf8; color: var(--rouge)" href="tel:' + c.telephone + '">Appeler</a>' : '') +
        '<button class="btn btn-p" style="background: transparent; color: #fffbf8; border: 1px solid #fffbf8" data-fin-alerte="' + a.id + '">Terminer</button></span>';
    }).join('');
    T.bip();
    $$('[data-fin-alerte]').forEach(function (b) { b.onclick = async function () { await sb.rpc('terminer_alerte', { p_id: +b.dataset.finAlerte }); alertes(); }; });
  }

  // ---------- Rapports ----------
  var periode = 'jour', donneesRapport = [];
  $$('#periodes button').forEach(function (b) { b.onclick = function () { periode = b.dataset.p; $$('#periodes button').forEach(function (x) { x.classList.toggle('choisi', x === b); }); rapports(); }; });
  function debutPeriode() {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    if (periode === '7') d.setDate(d.getDate() - 6);
    if (periode === '30') d.setDate(d.getDate() - 29);
    if (periode === 'mois') d.setDate(1);
    return d;
  }
  async function rapports() {
    var deb = debutPeriode().toISOString();
    var r = await sb.from('courses').select('*').gte('cree_le', deb).order('cree_le', { ascending: false }).limit(5000);
    var l = r.data || []; donneesRapport = l;
    var term = l.filter(function (c) { return c.statut === 'terminee'; }), ann = l.filter(function (c) { return c.statut === 'annulee'; });
    var tot = term.reduce(function (s, c) { return s + Number(c.total || 0); }, 0);
    var comptant = term.filter(function (c) { return c.paiement !== 'carte'; }).reduce(function (s, c) { return s + Number(c.total || 0); }, 0);
    var att = term.filter(function (c) { return c.arrivee_le; }).map(function (c) { return (new Date(c.arrivee_le) - new Date(c.prevue_le || c.cree_le)) / 60e3; }).filter(function (x) { return x >= 0 && x < 240; });
    var moy = att.length ? Math.round(att.reduce(function (s, x) { return s + x; }, 0) / att.length) : null;
    var app = term.filter(function (c) { return c.source === 'appli'; }).length;
    $('#kpis').innerHTML = [['Courses terminées', term.length, app + ' par l’appli · ' + (term.length - app) + ' par téléphone'], ['Total au compteur', T.argent(tot), 'taxes incluses'], ['Comptant', T.argent(comptant), 'carte : ' + T.argent(tot - comptant)], ['Attente moyenne du client', moy != null ? moy + ' min' : '—', 'commande → taxi à la porte'], ['Annulations', ann.length, l.length ? Math.round(ann.length / l.length * 100) + ' % des commandes' : '']].map(function (k) {
      return '<div class="carte kpi"><div class="petit gras doux">' + k[0] + '</div><div class="v">' + k[1] + '</div><div class="petit doux">' + k[2] + '</div></div>';
    }).join('');
    var h = new Array(24).fill(0); term.forEach(function (c) { h[new Date(c.cree_le).getHours()]++; });
    var mx = Math.max.apply(null, h) || 1;
    $('#barres').innerHTML = h.map(function (v, i) { return '<div title="' + i + ' h : ' + v + ' course(s)" style="height: ' + (v / mx * 100) + '%; background: ' + (v === mx && v ? 'var(--terra)' : 'var(--sauge)') + '"></div>'; }).join('');
    var parV = {}; term.forEach(function (c) { var v = c.dep_ville || 'Autre'; parV[v] = (parV[v] || 0) + 1; });
    var vs = Object.keys(parV).sort(function (a, b) { return parV[b] - parV[a]; }), vmx = vs.length ? parV[vs[0]] : 1;
    $('#villes').innerHTML = vs.length ? vs.map(function (v) { return '<div style="margin-bottom: 10px"><div class="entre petit"><span class="gras">' + esc(v) + '</span><span class="doux">' + parV[v] + '</span></div><div style="height: 8px; border-radius: 4px; background: var(--teinte)"><div style="height: 8px; border-radius: 4px; background: var(--sauge); width: ' + (parV[v] / vmx * 100) + '%"></div></div></div>'; }).join('') : '<div class="vide">Aucune course</div>';
    var pc = {};
    term.forEach(function (c) { var k = c.chauffeur_id || 'x'; pc[k] = pc[k] || { n: 0, t: 0, cash: 0, km: 0, ev: [] }; pc[k].n++; pc[k].t += Number(c.total || 0); if (c.paiement !== 'carte') pc[k].cash += Number(c.total || 0); pc[k].km += Number(c.compteur_km || 0); if (c.evaluation) pc[k].ev.push(c.evaluation); });
    if (!chauffeursL.length) { var a = await sb.from('profils').select('*').in('role', ['chauffeur', 'centrale']); chauffeursL = (a.data || []).filter(conduit); }
    $('#t-chauffeurs').innerHTML = '<tr><th>Chauffeur</th><th>Courses</th><th>Total compteur</th><th>Comptant à remettre</th><th>Km facturés</th><th>Note moyenne</th></tr>' + Object.keys(pc).map(function (k) {
      var x = pc[k]; return '<tr><td class="gras">' + esc(nomCh(k)) + '</td><td>' + x.n + '</td><td>' + T.argent(x.t) + '</td><td>' + T.argent(x.cash) + '</td><td>' + T.km(x.km) + '</td><td>' + (x.ev.length ? (x.ev.reduce(function (s, v) { return s + v; }, 0) / x.ev.length).toFixed(1).replace('.', ',') + ' ★' : '—') + '</td></tr>';
    }).join('');
    $('#t-hist').innerHTML = '<tr><th>Date</th><th>Client</th><th>Trajet</th><th>Chauffeur</th><th>Statut</th><th>Total</th><th></th></tr>' + l.slice(0, 300).map(function (c) {
      return '<tr><td>' + T.dateHeure(c.cree_le) + '</td><td>' + esc(c.client_nom || '') + '</td><td>' + esc(c.dep_ville || c.dep_adresse) + ' → ' + esc(c.dest_ville || c.dest_adresse) + '</td><td>' + esc(c.chauffeur_id ? nomCh(c.chauffeur_id) : '—') + '</td><td><span class="pastille ' + LIB[c.statut][1] + '">' + LIB[c.statut][0] + '</span></td><td>' + (c.total ? T.argent(c.total) + (c.corrige_le ? ' <span class="petit doux">(corrigé)</span>' : '') : '') + (c.frais_annulation ? '<span class="petit" style="color: var(--terra-fonce)">Frais d’annulation : ' + T.argent(c.frais_annulation) + '</span>' : '') + '</td><td>' + (c.statut === 'terminee' ? '<button class="btn btn-contour btn-p" data-corr="' + c.id + '">Corriger</button>' : '') + '</td></tr>';
    }).join('');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-corr]'); if (!b) return;
    var c = donneesRapport.find(function (x) { return x.id === +b.dataset.corr; }); if (!c) return;
    modal('<div class="h2">Corriger la course du ' + T.dateHeure(c.cree_le) + '</div><div class="petit doux">' + esc(c.dep_adresse) + ' → ' + esc(c.dest_adresse) + ' · ' + T.km(c.compteur_km) + '</div>' +
      '<div class="grille2"><div><label for="k-tot">Total payé ($)</label><input id="k-tot" type="number" step="0.01" value="' + (c.total || 0) + '"></div><div><label for="k-pai">Paiement</label><select id="k-pai"><option value="comptant"' + (c.paiement !== 'carte' ? ' selected' : '') + '>Comptant</option><option value="carte"' + (c.paiement === 'carte' ? ' selected' : '') + '>Carte</option></select></div></div>' +
      '<div><label for="k-note">Raison (note interne)</label><input id="k-note" value="' + esc(c.note_centrale || '') + '" placeholder="Ex. : erreur de GPS, rabais, client régulier"></div><div class="erreur-txt" id="k-err"></div>' +
      '<div class="grille2"><button class="btn btn-contour" id="k-x">Annuler</button><button class="btn btn-plein" id="k-ok">Enregistrer</button></div>');
    $('#k-x').onclick = fermer;
    $('#k-ok').onclick = async function () {
      var r = await sb.rpc('corriger_course', { p_id: c.id, p_total: Number($('#k-tot').value), p_paiement: $('#k-pai').value, p_note: $('#k-note').value.trim() || null });
      if (r.error) { $('#k-err').textContent = r.error.message; return; }
      fermer(); T.toast('Course corrigée'); rapports();
    };
  });
  $('#b-csv').onclick = function () {
    var cols = ['id', 'cree_le', 'statut', 'source', 'client_nom', 'client_tel', 'dep_adresse', 'dep_ville', 'dep_prov', 'dest_adresse', 'dest_ville', 'chauffeur', 'compteur_km', 'compteur_attente_s', 'total', 'paiement', 'evaluation'];
    var lignes = [cols.join(';')].concat(donneesRapport.map(function (c) {
      return cols.map(function (k) { var v = k === 'chauffeur' ? (c.chauffeur_id ? nomCh(c.chauffeur_id) : '') : (c[k] == null ? '' : c[k]); return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';');
    }));
    var url = URL.createObjectURL(new Blob(['﻿' + lignes.join('\n')], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'courses-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  };

  // ---------- Chauffeurs ----------
  var DOCS = ['Permis de conduire', 'Autorisation de chauffeur (Québec)', 'Assurance commerciale', 'Inspection mécanique', 'Vérification des antécédents'];
  $('#b-nouveau').onclick = function () { $('#f-nouveau').classList.toggle('cache'); };
  $('#n-creer').onclick = async function () {
    $('#n-err').textContent = '';
    try {
      await T.fonctionCompte({ action: 'creer_chauffeur', nom: $('#n-nom').value, telephone: $('#n-tel').value, nip: $('#n-nip').value.trim(), voiture: $('#n-voit').value.trim(), vehicule: $('#n-veh').value.trim(), plaque: $('#n-pl').value.trim() });
      T.toast('Compte chauffeur créé');
      ['#n-nom', '#n-tel', '#n-nip', '#n-voit', '#n-veh', '#n-pl'].forEach(function (s) { $(s).value = ''; });
      $('#f-nouveau').classList.add('cache'); chauffeurs();
    } catch (e) { $('#n-err').textContent = T.erreurMsg(e); }
  };
  async function chauffeurs() {
    var a = await sb.from('profils').select('*').in('role', ['chauffeur', 'centrale']).order('role').order('nom');
    var l = a.data || []; chauffeursL = l.filter(conduit);
    var d = await sb.from('documents').select('*');
    var docs = d.data || [];
    $('#t-ch').innerHTML = '<tr><th>Voiture</th><th>Nom</th><th>Cellulaire</th><th>Véhicule</th><th>Documents</th><th>Statut</th><th></th></tr>' + l.map(function (c) {
      var mes = docs.filter(function (x) { return x.chauffeur_id === c.id; });
      var exp = mes.filter(function (x) { return x.expire_le && new Date(x.expire_le) < new Date(Date.now() + 30 * 864e5); }).length;
      var docTxt = c.role === 'centrale' ? '<span class="pastille p-dispo">Centrale</span>' : !mes.length ? '<span class="pastille p-hors">À inscrire</span>' : exp ? '<span class="pastille p-pause">' + exp + ' à renouveler</span>' : '<span class="pastille p-dispo">À jour</span>';
      return '<tr><td class="gras">' + esc(c.voiture || '—') + '</td><td>' + esc(c.nom) + '</td><td>' + T.telJoli(c.telephone) + '</td><td class="petit">' + esc([c.vehicule, c.plaque].filter(Boolean).join(' · ')) + '</td><td>' + docTxt + '</td><td>' + (c.actif ? '<span class="pastille ' + STL[c.statut][1] + '">' + STL[c.statut][0] + '</span>' : '<span class="pastille p-hors">Suspendu</span>') + '</td><td><button class="btn btn-contour btn-p" data-modif="' + c.id + '">Modifier</button></td></tr>';
    }).join('');
    $$('[data-modif]').forEach(function (b) { b.onclick = function () { modifier(l.find(function (x) { return x.id === b.dataset.modif; }), docs); }; });
  }
  function modifier(c, docs) {
    var mes = {}; docs.filter(function (x) { return x.chauffeur_id === c.id; }).forEach(function (x) { mes[x.type] = x.expire_le; });
    modal('<div class="h2">' + esc(c.nom) + '</div>' +
      '<div class="grille2"><div><label for="e-nom">Nom</label><input id="e-nom" value="' + esc(c.nom) + '"></div><div><label for="e-voit">N° de voiture</label><input id="e-voit" value="' + esc(c.voiture || '') + '"></div><div><label for="e-veh">Véhicule</label><input id="e-veh" value="' + esc(c.vehicule || '') + '"></div><div><label for="e-pl">Plaque</label><input id="e-pl" value="' + esc(c.plaque || '') + '"></div>' +
      '<div><label for="e-role">Rôle</label><select id="e-role"><option value="chauffeur"' + (c.role === 'chauffeur' ? ' selected' : '') + '>Chauffeur</option><option value="centrale"' + (c.role === 'centrale' ? ' selected' : '') + '>Centrale</option><option value="client">Client</option></select></div>' +
      '<div><label for="e-places">Places passagers</label><input id="e-places" type="number" min="1" max="12" value="' + (c.places || 4) + '"></div><div><label for="e-adapte">Véhicule adapté (fauteuil)</label><select id="e-adapte"><option value="0"' + (!c.adapte ? ' selected' : '') + '>Non</option><option value="1"' + (c.adapte ? ' selected' : '') + '>Oui</option></select></div>' +
      '<div><label for="e-actif">Accès</label><select id="e-actif"><option value="1"' + (c.actif ? ' selected' : '') + '>Actif</option><option value="0"' + (!c.actif ? ' selected' : '') + '>Suspendu</option></select></div></div>' +
      (conduit(c) ? '<div class="h2" style="font-size: 16px">Documents (date d’expiration)</div><div class="pile" style="gap: 8px">' + DOCS.map(function (t, i) { return '<div><label for="doc' + i + '">' + t + '</label><input id="doc' + i + '" type="date" value="' + (mes[t] || '') + '"></div>'; }).join('') + '</div>' : '') +
      '<div><label for="e-nip">Nouveau NIP (si oublié)</label><input id="e-nip" inputmode="numeric" maxlength="6" placeholder="Laisser vide pour ne pas changer"></div>' +
      '<div class="erreur-txt" id="e-err"></div><div class="grille2"><button class="btn btn-contour" id="e-ann">Annuler</button><button class="btn btn-plein" id="e-ok">Enregistrer</button></div>');
    $('#e-ann').onclick = fermer;
    $('#e-ok').onclick = async function () {
      var r = await sb.rpc('centrale_maj_profil', { p_id: c.id, p_role: $('#e-role').value, p_nom: $('#e-nom').value.trim(), p_voiture: $('#e-voit').value.trim() || null, p_vehicule: $('#e-veh').value.trim() || null, p_plaque: $('#e-pl').value.trim() || null, p_actif: $('#e-actif').value === '1' });
      if (r.error) { $('#e-err').textContent = r.error.message; return; }
      var rv = await sb.rpc('centrale_vehicule', { p_id: c.id, p_places: +$('#e-places').value || 4, p_adapte: $('#e-adapte').value === '1' });
      if (rv.error) { $('#e-err').textContent = rv.error.message; return; }
      if (conduit(c)) {
        var lignes = DOCS.map(function (t, i) { return { chauffeur_id: c.id, type: t, expire_le: $('#doc' + i).value || null, maj_le: new Date().toISOString() }; });
        var d = await sb.from('documents').upsert(lignes, { onConflict: 'chauffeur_id,type' });
        if (d.error) { $('#e-err').textContent = d.error.message; return; }
      }
      if ($('#e-nip').value.trim()) { try { await T.fonctionCompte({ action: 'changer_nip', id: c.id, nip: $('#e-nip').value.trim() }); } catch (e) { $('#e-err').textContent = T.erreurMsg(e); return; } }
      fermer(); T.toast('Enregistré'); chauffeurs();
    };
  }

  // ---------- Clients ----------
  var clientsL = [];
  async function clients() {
    var a = await sb.from('profils').select('*').eq('role', 'client').order('cree_le', { ascending: false }).limit(1000);
    clientsL = a.data || [];
    var b = await sb.from('courses').select('client_id').eq('statut', 'terminee').not('client_id', 'is', null).limit(10000);
    var n = {}; (b.data || []).forEach(function (c) { n[c.client_id] = (n[c.client_id] || 0) + 1; });
    clientsL.forEach(function (c) { c.n = n[c.id] || 0; });
    afficherClients();
  }
  function afficherClients() {
    var q = T.norm($('#cl-rech').value);
    var l = clientsL.filter(function (c) { return !q || T.norm(c.nom).indexOf(q) >= 0 || c.telephone.indexOf(q.replace(/\D/g, '') || '§') >= 0; });
    $('#t-cl').innerHTML = '<tr><th>Nom</th><th>Cellulaire</th><th>Inscrit le</th><th>Courses</th><th>Accès</th><th></th></tr>' + l.map(function (c) {
      return '<tr><td class="gras">' + esc(c.nom) + '</td><td>' + T.telJoli(c.telephone) + '</td><td>' + T.dateCourte(c.cree_le) + '</td><td>' + c.n + '</td><td>' + (c.actif ? '<span class="pastille p-dispo">Actif</span>' : '<span class="pastille p-hors">Suspendu</span>') + '</td><td><button class="btn btn-contour btn-p" data-cl="' + c.id + '">Gérer</button></td></tr>';
    }).join('') || '<tr><td colspan="6" class="vide">Aucun client</td></tr>';
    $$('[data-cl]').forEach(function (b) {
      b.onclick = function () {
        var c = clientsL.find(function (x) { return x.id === b.dataset.cl; });
        modal('<div class="h2">' + esc(c.nom) + '</div><div class="doux">' + T.telJoli(c.telephone) + '</div><div><label for="k-nip">Nouveau NIP (s’il l’a oublié)</label><input id="k-nip" inputmode="numeric" maxlength="6"></div><div class="erreur-txt" id="k-err"></div>' +
          '<div class="grille2"><button class="btn btn-contour" id="k-susp">' + (c.actif ? 'Suspendre' : 'Réactiver') + '</button><button class="btn btn-plein" id="k-ok">Changer le NIP</button></div><button class="btn btn-lien" id="k-x">Fermer</button>');
        $('#k-x').onclick = fermer;
        $('#k-susp').onclick = async function () { var r = await sb.rpc('centrale_maj_profil', { p_id: c.id, p_role: 'client', p_nom: c.nom, p_voiture: null, p_vehicule: null, p_plaque: null, p_actif: !c.actif }); if (r.error) { $('#k-err').textContent = r.error.message; return; } fermer(); clients(); };
        $('#k-ok').onclick = async function () { try { await T.fonctionCompte({ action: 'changer_nip', id: c.id, nip: $('#k-nip').value.trim() }); fermer(); T.toast('NIP changé : donne-le au client'); } catch (e) { $('#k-err').textContent = T.erreurMsg(e); } };
      };
    });
  }
  $('#cl-rech').oninput = afficherClients;

  // ---------- Tarifs ----------
  async function vueTarifs() {
    tarifs = await T.tarifs(true);
    $('#tarifs-cartes').innerHTML = ['NB', 'QC'].map(function (p) {
      var t = tarifs[p];
      return '<div class="carte pile col-g"><div class="entre"><div class="h2">' + (p === 'NB' ? 'Nouveau-Brunswick' : 'Québec') + '</div><span class="pastille ' + (p === 'NB' ? 'p-dispo' : 'p-course') + '">' + (p === 'NB' ? 'TVH 15 % incluse' : 'TPS + TVQ incluses') + '</span></div>' +
        '<div class="grille2"><div><label>Prise en charge ($)</label><input type="number" step="0.01" id="' + p + '-base" value="' + t.base + '"></div><div><label>Par kilomètre ($)</label><input type="number" step="0.01" id="' + p + '-km" value="' + t.km + '"></div><div><label>Par minute d’attente ($)</label><input type="number" step="0.01" id="' + p + '-minute" value="' + t.minute + '"></div><div><label>Majoration de nuit, 23 h à 5 h (%)</label><input type="number" step="1" id="' + p + '-nuit_pct" value="' + t.nuit_pct + '"></div><div><label>Redevance par course ($)</label><input type="number" step="0.01" id="' + p + '-redevance" value="' + t.redevance + '"></div><div><label>Prix minimum d’une course ($)</label><input type="number" step="0.01" id="' + p + '-minimum" value="' + (t.minimum || 0) + '"></div></div>' +
        '<div class="petit doux">' + (p === 'QC' ? 'Au Québec, la redevance de 1,05 $ est obligatoire. Tarifs fixés par la Commission des transports du Québec.' : 'Vérifie si ta municipalité fixe des tarifs (arrêtés municipaux).') + '</div>' +
        '<div class="petit doux" id="' + p + '-ex"></div><button class="btn btn-plein" style="align-self: flex-start" data-sauver="' + p + '">Enregistrer</button></div>';
    }).join('');
    ['NB', 'QC'].forEach(function (p) {
      function ex() { var t = {}; t[p] = { base: +$('#' + p + '-base').value, km: +$('#' + p + '-km').value, minute: +$('#' + p + '-minute').value, nuit_pct: +$('#' + p + '-nuit_pct').value, redevance: +$('#' + p + '-redevance').value, minimum: +$('#' + p + '-minimum').value }; var x = T.prix(t, p, 10, 120, new Date(2026, 0, 1, 12)); $('#' + p + '-ex').textContent = 'Exemple : 10 km et 2 min d’attente, de jour = ' + T.argent(x.total); }
      $$('#tarifs-cartes input[id^="' + p + '-"]').forEach(function (i) { i.oninput = ex; }); ex();
    });
    $$('[data-sauver]').forEach(function (b) {
      b.onclick = async function () {
        var p = b.dataset.sauver, v = {};
        ['base', 'km', 'minute', 'nuit_pct', 'redevance', 'minimum'].forEach(function (k) { v[k] = Number($('#' + p + '-' + k).value) || 0; });
        v.maj_le = new Date().toISOString();
        var r = await sb.from('tarifs').update(v).eq('province', p);
        if (r.error) T.toast(r.error.message, true); else { T.toast('Tarifs enregistrés'); tarifs = await T.tarifs(true); }
      };
    });
  }

  // ---------- Comptes ----------
  $('#b-compte').onclick = function () { $('#f-compte').classList.toggle('cache'); };
  $('#co-creer').onclick = async function () {
    if (!$('#co-nom').value.trim()) return;
    var r = await sb.from('comptes').insert({ nom: $('#co-nom').value.trim(), type: $('#co-type').value.trim() || null, contact: $('#co-contact').value.trim() || null, conditions: $('#co-cond').value.trim() || null });
    if (r.error) { T.toast(r.error.message, true); return; }
    ['#co-nom', '#co-type', '#co-contact'].forEach(function (s) { $(s).value = ''; }); $('#f-compte').classList.add('cache'); comptes();
  };
  async function comptes() {
    var a = await sb.from('comptes').select('*').order('nom');
    comptesL = a.data || [];
    var d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    var b = await sb.from('courses').select('*').not('compte_id', 'is', null).eq('statut', 'terminee').gte('fin_le', d.toISOString());
    var cs = b.data || [];
    $('#liste-comptes').innerHTML = comptesL.length ? comptesL.map(function (c) {
      var mes = cs.filter(function (x) { return x.compte_id === c.id; }), tot = mes.reduce(function (s, x) { return s + Number(x.total || 0); }, 0);
      return '<div class="carte entre" style="flex-wrap: wrap"><div><div class="gras" style="font-size: 16px">' + esc(c.nom) + (c.actif ? '' : ' <span class="pastille p-hors">Inactif</span>') + '</div><div class="petit doux">' + esc([c.type, c.contact, c.conditions].filter(Boolean).join(' · ')) + '</div></div><div class="ligne"><span class="gras">' + mes.length + ' courses ce mois · ' + T.argent(tot) + '</span><button class="btn btn-plein btn-p" data-fact="' + c.id + '">Facture du mois</button></div></div>';
    }).join('') : '<div class="carte vide">Aucun compte. Ajoute les cliniques, résidences ou entreprises qui paient une fois par mois.</div>';
    $$('[data-fact]').forEach(function (b) {
      b.onclick = function () {
        var c = comptesL.find(function (x) { return x.id === +b.dataset.fact; }), mes = cs.filter(function (x) { return x.compte_id === c.id; });
        var tot = mes.reduce(function (s, x) { return s + Number(x.total || 0); }, 0);
        modal('<div class="h2">Facture · ' + esc(c.nom) + '</div><div class="petit doux">' + esc(T.ENTREPRISE.nom) + ' · ' + new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }) + '<br>' + esc(c.contact || '') + '</div>' +
          '<div>' + (mes.map(function (x) { return '<div class="ligne-tab"><span>' + T.dateCourte(x.fin_le) + ' · ' + esc(x.client_nom || '') + ' · ' + esc(x.dep_ville || x.dep_adresse) + ' → ' + esc(x.dest_ville || x.dest_adresse) + '</span><span>' + T.argent(x.total) + '</span></div>'; }).join('') || '<div class="vide">Aucune course ce mois</div>') + '<div class="ligne-tab gras"><span>Total (taxes incluses)</span><span>' + T.argent(tot) + '</span></div></div>' +
          '<div class="petit doux">N° TPS/TVH : ' + esc(T.ENTREPRISE.tps) + ' · ' + esc(c.conditions || '') + '</div><div class="grille2 noimp"><button class="btn btn-contour" id="fx">Fermer</button><button class="btn btn-plein" id="fp">Imprimer / PDF</button></div>');
        $('#fx').onclick = fermer; $('#fp').onclick = function () { window.print(); };
      };
    });
  }

  // ---------- Modifier une course ----------
  function modifierCourse(c) {
    if (!c) return;
    var o = Object.assign({}, c.options || {});
    var local = function (d) { if (!d) return ''; d = new Date(d); return new Date(d - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16); };
    modal('<div class="h2">Modifier la course</div>' +
      '<div class="grille2"><div><label for="m-nom">Client</label><input id="m-nom" value="' + esc(c.client_nom || '') + '"></div><div><label for="m-tel">Téléphone</label><input id="m-tel" value="' + esc(c.client_tel || '') + '"></div></div>' +
      '<div class="champ-adresse"><label for="m-dep">Départ</label><input id="m-dep" autocomplete="off"><div id="m-dep-s" class="suggestions cache"></div></div>' +
      '<div class="champ-adresse"><label for="m-dest">Destination</label><input id="m-dest" autocomplete="off"><div id="m-dest-s" class="suggestions cache"></div></div>' +
      '<div class="grille2"><div><label for="m-pass">Passagers</label><input id="m-pass" type="number" min="1" max="12" value="' + c.passagers + '"></div><div><label for="m-quand">Heure prévue (vide = maintenant)</label><input id="m-quand" type="datetime-local" value="' + local(c.prevue_le) + '"></div></div>' +
      '<div class="puces" id="m-opts">' + [['adapte', 'Véhicule adapté'], ['siege', 'Siège d’enfant'], ['animal', 'Animal'], ['bagages', 'Bagages']].map(function (x) { return '<button class="puce' + (o[x[0]] ? ' choisie' : '') + '" data-o="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div><label for="m-note">Note au chauffeur</label><input id="m-note" value="' + esc(c.note || '') + '"></div>' +
      '<div><label for="m-int">Note interne (centrale seulement)</label><input id="m-int" value="' + esc(c.note_centrale || '') + '"></div>' +
      '<div class="erreur-txt" id="m-err"></div><div class="grille2"><button class="btn btn-contour" id="m-x">Fermer</button><button class="btn btn-plein" id="m-ok">Enregistrer</button></div>');
    var mDep = T.champAdresse($('#m-dep'), $('#m-dep-s'), function () {}), mDest = T.champAdresse($('#m-dest'), $('#m-dest-s'), function () {});
    var dep0 = { adresse: c.dep_adresse, ville: c.dep_ville, prov: c.dep_prov, lat: c.dep_lat, lng: c.dep_lng }, dest0 = { adresse: c.dest_adresse, ville: c.dest_ville, prov: c.dest_prov, lat: c.dest_lat, lng: c.dest_lng };
    mDep.definir(dep0); mDest.definir(dest0);
    $$('#m-opts .puce').forEach(function (b) { b.onclick = function () { o[b.dataset.o] = !o[b.dataset.o]; b.classList.toggle('choisie', o[b.dataset.o]); }; });
    $('#m-x').onclick = fermer;
    $('#m-ok').onclick = async function () {
      var a = mDep.valeur(), b = mDest.valeur();
      if (!a || !b) { $('#m-err').textContent = 'Choisis le départ et la destination dans la liste.'; return; }
      var p = { client_nom: $('#m-nom').value.trim(), client_tel: T.tel10($('#m-tel').value) || $('#m-tel').value.trim(), passagers: +$('#m-pass').value || 1, options: o,
        note: $('#m-note').value.trim(), note_centrale: $('#m-int').value.trim(), prevue_le: $('#m-quand').value ? new Date($('#m-quand').value).toISOString() : '',
        dep_adresse: a.adresse, dep_ville: a.ville, dep_prov: a.prov, dep_lat: a.lat, dep_lng: a.lng, dest_adresse: b.adresse, dest_ville: b.ville, dest_prov: b.prov, dest_lat: b.lat, dest_lng: b.lng };
      var r = await sb.rpc('modifier_course', { p_id: c.id, p: p });
      if (r.error) { $('#m-err').textContent = r.error.message; return; }
      fermer(); T.toast('Course modifiée'); charger();
    };
  }

  // ---------- Réglages ----------
  var modeOuv = '24h';
  $$('#r-mode button').forEach(function (b) { b.onclick = function () { modeOuv = b.dataset.m; $$('#r-mode button').forEach(function (x) { x.classList.toggle('choisi', x === b); }); $('#r-heures').classList.toggle('cache', modeOuv !== 'horaire'); }; });
  async function reglages() {
    var P = await T.parametres(true), e = P.entreprise || {}, o = P.ouverture || {}, z = P.zone || {}, rp = P.repartition || {};
    $('#r-nom').value = e.nom || ''; $('#r-tel').value = e.telephone || ''; $('#r-adr').value = e.adresse || ''; $('#r-cour').value = e.courriel || ''; $('#r-tps').value = e.tps || ''; $('#r-tvq').value = e.tvq || '';
    modeOuv = o.mode || '24h'; $$('#r-mode button').forEach(function (x) { x.classList.toggle('choisi', x.dataset.m === modeOuv); }); $('#r-heures').classList.toggle('cache', modeOuv !== 'horaire');
    $('#r-deb').value = o.debut || '06:00'; $('#r-fin').value = o.fin || '02:00'; $('#r-msg').value = o.message || '';
    $('#r-delai').value = rp.delai_offre_s || 20; $('#r-resa').value = rp.reservation_min || 15; $('#r-frais').value = rp.frais_annulation || 0; $('#r-gratuit').value = rp.annulation_gratuite_min || 2;
    $('#r-rayon').value = z.rayon_km || 160;
  }
  async function sauver(cle, v) { try { await T.sauverParametre(cle, v); T.toast('Réglages enregistrés'); } catch (x) { T.toast(T.erreurMsg(x), true); } }
  $('#r-s1').onclick = function () { sauver('entreprise', { nom: $('#r-nom').value.trim() || 'Taxi Restigouche', telephone: T.tel10($('#r-tel').value) || '', adresse: $('#r-adr').value.trim(), courriel: $('#r-cour').value.trim(), tps: $('#r-tps').value.trim(), tvq: $('#r-tvq').value.trim() }); };
  $('#r-s2').onclick = function () { sauver('ouverture', { mode: modeOuv, debut: $('#r-deb').value || '06:00', fin: $('#r-fin').value || '02:00', message: $('#r-msg').value.trim() || 'Nous sommes fermés pour le moment. Vous pouvez réserver pour plus tard.' }); };
  $('#r-s3').onclick = async function () {
    var P = await T.parametres(true), z = Object.assign({}, P.zone || {}, { rayon_km: Math.max(5, +$('#r-rayon').value || 160) });
    await sauver('repartition', { delai_offre_s: Math.min(120, Math.max(10, +$('#r-delai').value || 20)), reservation_min: Math.max(5, +$('#r-resa').value || 15), frais_annulation: Math.max(0, +$('#r-frais').value || 0), annulation_gratuite_min: Math.max(0, +$('#r-gratuit').value || 0) });
    await sauver('zone', z);
  };

  // ---------- Messages ----------
  var MODELES = ['Travaux sur le pont J.-C.-Van Horne, prévoyez 5 minutes de plus.', 'Tempête : prudence sur les routes, signalez-moi les routes fermées.', 'Besoin d’un chauffeur vers Bathurst. Qui est disponible ?'];
  $('#m-modeles').innerHTML = MODELES.map(function (m, i) { return '<button class="puce" data-m="' + i + '" style="font-weight: 600">' + esc(m.split(',')[0].split(':')[0].split('.')[0]) + '</button>'; }).join('');
  $$('[data-m]').forEach(function (b) { b.onclick = function () { $('#m-txt').value = MODELES[+b.dataset.m]; }; });
  $('#m-envoyer').onclick = async function () {
    var txt = $('#m-txt').value.trim(); if (!txt) return;
    var r = await sb.rpc('envoyer_message', { p_a: $('#m-a').value || null, p_cible: 'tous', p_texte: txt });
    if (r.error) { T.toast(r.error.message, true); return; }
    $('#m-txt').value = ''; T.toast('Message envoyé'); messages(true);
  };
  var dejaVus = {};
  async function messages(marquer) {
    if (!chauffeursL.length) { var a = await sb.from('profils').select('*').in('role', ['chauffeur', 'centrale']); chauffeursL = (a.data || []).filter(conduit); }
    var sel = $('#m-a'), v = sel.value;
    sel.innerHTML = '<option value="">Tous les chauffeurs</option>' + chauffeursL.filter(function (c) { return c.actif; }).map(function (c) { return '<option value="' + c.id + '">' + esc((c.voiture ? c.voiture + ' · ' : '') + c.nom) + '</option>'; }).join('');
    sel.value = v;
    var r = await sb.from('messages').select('*').order('cree_le', { ascending: false }).limit(80);
    var l = r.data || [];
    var nonLus = l.filter(function (m) { return m.de !== moi.id && m.cible === 'centrale' && (m.lu_par || []).indexOf(moi.id) < 0; });
    $('#nav-msg').textContent = nonLus.length ? 'Messages (' + nonLus.length + ')' : 'Messages';
    nonLus.forEach(function (m) { if (!dejaVus[m.id]) { dejaVus[m.id] = 1; if (vue !== 'messages') { T.avis('Message d’un chauffeur', m.texte); T.toast(nomCh(m.de) + ' : ' + m.texte); } } });
    if (vue === 'messages') {
      $('#m-fil').innerHTML = l.map(function (m) {
        var deMoi = m.de === moi.id;
        var qui = deMoi ? (m.a ? 'À ' + nomCh(m.a) : 'À tous les chauffeurs') : 'De ' + nomCh(m.de);
        var lus = deMoi && !m.a ? ' · lu par ' + (m.lu_par || []).length : deMoi && m.a ? ((m.lu_par || []).length ? ' · lu' : ' · non lu') : '';
        return '<div class="carte" style="padding: 10px 14px; background: ' + (deMoi ? 'var(--sauge-pale)' : 'var(--carte)') + '"><div class="entre petit doux gras"><span>' + esc(qui) + '</span><span>' + T.dateHeure(m.cree_le) + lus + '</span></div><div style="margin-top: 4px">' + esc(m.texte) + '</div></div>';
      }).join('') || '<div class="vide">Aucun message.</div>';
      if (marquer && nonLus.length) { await sb.rpc('marquer_lu', { p_ids: nonLus.map(function (m) { return m.id; }) }); $('#nav-msg').textContent = 'Messages'; }
    }
  }

  // ---------- Démarrage et direct ----------
  await charger();
  alertes(); messages(false);
  sb.channel('centrale')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, function (p) {
      if (p.eventType === 'INSERT' && p.new.statut !== 'reservee') T.bip();
      if (vue === 'repartition') charger();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profils' }, function () { if (vue === 'repartition') charger(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alertes' }, function () { alertes(); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, function () { messages(vue === 'messages'); })
    .subscribe();
  setInterval(async function () { await sb.rpc('verifier_offres'); if (vue === 'repartition') charger(); }, 5000);
  setInterval(function () { alertes(); messages(vue === 'messages'); }, 20000);
  T.demanderAvis();
})();
