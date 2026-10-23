/* Taxi Restigouche — outils communs (connexion, adresses, cartes, prix) */
(function () {
  var SB_URL = 'https://ykrsxjvqtrdxpdzxtgiz.supabase.co';
  var SB_CLE = 'sb_publishable_UyV3tpbE7x0N6vUQ-g5mEQ_zvdEzWTL';
  var sb = window.supabase.createClient(SB_URL, SB_CLE, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'taxi-session' } });

  // Renseignements de l'entreprise (à compléter quand ils existeront)
  var ENTREPRISE = {
    nom: 'Taxi Restigouche',
    adresse: '[Adresse de l’entreprise]',
    telephone: '',            // ex. '5065550100' : bouton « Appeler la centrale »
    tps: '[à venir]', tvq: '[à venir]'
  };

  // Région desservie (environ 2 h autour de Campbellton)
  var BBOX = [-68.4, 47.0, -64.9, 48.75];
  var VILLES = [
    ['Campbellton', 'NB', 48.005, -66.673], ['Atholville', 'NB', 47.991, -66.712], ['Tide Head', 'NB', 47.983, -66.772],
    ['Dalhousie', 'NB', 48.062, -66.374], ['Eel River Crossing', 'NB', 48.019, -66.421], ['Charlo', 'NB', 47.990, -66.273],
    ['Belledune', 'NB', 47.903, -65.846], ['Bathurst', 'NB', 47.618, -65.651], ['Kedgwick', 'NB', 47.646, -67.344],
    ['Saint-Quentin', 'NB', 47.512, -67.392], ['Balmoral', 'NB', 47.967, -66.452], ['Val-d’Amours', 'NB', 47.978, -66.618],
    ['Listuguj', 'QC', 48.022, -66.700], ['Pointe-à-la-Croix', 'QC', 48.018, -66.684], ['Matapédia', 'QC', 47.973, -67.031],
    ['Escuminac', 'QC', 48.090, -66.480], ['Nouvelle', 'QC', 48.135, -66.318], ['Carleton-sur-Mer', 'QC', 48.104, -66.128],
    ['Maria', 'QC', 48.177, -65.987], ['New Richmond', 'QC', 48.164, -65.861], ['Causapscal', 'QC', 48.355, -67.229], ['Amqui', 'QC', 48.464, -67.432]
  ];

  function courrielDe(tel) { return 't' + tel + '@telephone.taxirestigouche.ca'; }
  function mdpDe(tel, nip) { return 'TxR-' + nip + '-' + tel; }
  function tel10(v) { var d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? d : null; }
  function telJoli(t) { t = String(t || ''); return t.length === 10 ? t.slice(0, 3) + ' ' + t.slice(3, 6) + '-' + t.slice(6) : t; }

  async function connexion(tel, nip) {
    var t = tel10(tel);
    if (!t) throw new Error('Numéro de cellulaire invalide (10 chiffres).');
    var r = await sb.auth.signInWithPassword({ email: courrielDe(t), password: mdpDe(t, nip) });
    if (r.error) throw new Error('Numéro ou NIP incorrect.');
    return r.data;
  }
  async function fonctionCompte(corps) {
    var s = (await sb.auth.getSession()).data.session;
    var rep = await fetch(SB_URL + '/functions/v1/compte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_CLE, Authorization: 'Bearer ' + (s ? s.access_token : SB_CLE) },
      body: JSON.stringify(corps)
    });
    var j = {};
    try { j = await rep.json(); } catch (e) {}
    if (!rep.ok || j.erreur) throw new Error(j.erreur || 'Erreur du serveur');
    return j;
  }
  async function inscription(tel, nip, nom) {
    await fonctionCompte({ action: 'inscription', telephone: tel, nip: nip, nom: nom });
    return connexion(tel, nip);
  }
  async function changerMonNip(tel, nip) {
    if (!/^\d{4,6}$/.test(nip)) throw new Error('Le NIP doit avoir de 4 à 6 chiffres.');
    var r = await sb.auth.updateUser({ password: mdpDe(tel, nip) });
    if (r.error) throw new Error(r.error.message);
  }
  async function monProfil() {
    var u = (await sb.auth.getUser()).data.user;
    if (!u) return null;
    var r = await sb.from('profils').select('*').eq('id', u.id).maybeSingle();
    return r.data || null;
  }
  async function exigerRole(roles) {
    var p = await monProfil();
    if (!p || !p.actif || roles.indexOf(p.role) === -1) { location.replace('index.html'); return null; }
    return p;
  }
  async function deconnexion() { await sb.auth.signOut(); location.replace('index.html'); }

  // ---------- Petits utilitaires ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function argent(x) { return (Math.round((Number(x) || 0) * 100) / 100).toFixed(2).replace('.', ',') + ' $'; }
  function km(x) { return (Number(x) || 0).toFixed(1).replace('.', ',') + ' km'; }
  function heure(d) { return new Date(d).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h '); }
  function dateCourte(d) { return new Date(d).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' }); }
  function dateHeure(d) { return dateCourte(d) + ', ' + heure(d); }
  var toastT;
  function toast(msg, erreur) {
    var el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
    el.className = 'toast' + (erreur ? ' erreur' : ''); el.textContent = msg; el.classList.remove('cache');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.add('cache'); }, 3800);
  }
  function erreurMsg(e) { return (e && (e.message || e.error_description)) || 'Une erreur est survenue'; }
  function bip() {
    try {
      var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.15; o.start();
      setTimeout(function () { o.frequency.value = 1175; }, 180); setTimeout(function () { o.stop(); c.close(); }, 420);
    } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  function avis(titre, corps) {
    bip();
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        navigator.serviceWorker && navigator.serviceWorker.ready.then(function (r) { r.showNotification(titre, { body: corps, icon: 'icones/icone-192.png', badge: 'icones/icone-192.png' }); });
      }
    } catch (e) {}
  }
  function demanderAvis() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} }

  // ---------- Distances, villes, prix ----------
  function distance(a, b, c, d) {
    if (a == null || c == null) return null;
    var R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function villeProche(lat, lng) {
    var best = null, bd = 1e9;
    VILLES.forEach(function (v) { var d = distance(lat, lng, v[2], v[3]); if (d < bd) { bd = d; best = v; } });
    return best;
  }
  function provinceDe(etat, lat, lng) {
    var s = String(etat || '').toLowerCase();
    if (s.indexOf('qu') === 0 || s.indexOf('québec') >= 0 || s.indexOf('quebec') >= 0) return 'QC';
    if (s.indexOf('brunswick') >= 0) return 'NB';
    if (lat != null) return villeProche(lat, lng)[1];
    return 'NB';
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  // Recherche d'adresses (OpenStreetMap / Photon) avec repli sur la liste des villes
  var cacheRech = {};
  async function chercherAdresses(q, pres) {
    q = String(q || '').trim();
    if (q.length < 3) return [];
    var cle = q.toLowerCase();
    if (cacheRech[cle]) return cacheRech[cle];
    var res = [];
    try {
      var url = 'https://photon.komoot.io/api/?limit=7&lang=fr&q=' + encodeURIComponent(q) + '&bbox=' + BBOX.join(',');
      if (pres) url += '&lat=' + pres.lat + '&lon=' + pres.lng;
      var rep = await fetch(url);
      var j = await rep.json();
      (j.features || []).forEach(function (f) {
        var p = f.properties || {}, c = f.geometry.coordinates;
        if (p.country && !/canada/i.test(p.country)) return;
        var rue = [p.housenumber, p.street].filter(Boolean).join(' ');
        var titre = p.name && p.name !== p.street ? (rue ? p.name + ', ' + rue : p.name) : (rue || p.name || '');
        var ville = p.city || p.town || p.village || p.locality || p.district || p.county || villeProche(c[1], c[0])[0];
        if (!titre) titre = ville;
        res.push({ adresse: titre, ville: ville, prov: provinceDe(p.state, c[1], c[0]), lat: c[1], lng: c[0] });
      });
    } catch (e) {}
    // Adresses saisies à la main : on propose l'adresse avec les villes correspondantes
    var nq = norm(q), nommees = VILLES.filter(function (v) { return nq.indexOf(norm(v[0])) >= 0; });
    var rue = q.replace(/,.*$/, '').trim();
    rue = rue.charAt(0).toUpperCase() + rue.slice(1);
    var bassin = nommees.length ? nommees : VILLES.filter(function (v) { return norm(v[0]).indexOf(nq) === 0; });
    if (!bassin.length && res.length < 3) bassin = VILLES.slice(0, 5);
    bassin.forEach(function (v) {
      var titre = norm(rue) === norm(v[0]) ? 'Centre-ville' : rue;
      res.push({ adresse: titre, ville: v[0], prov: v[1], lat: v[2], lng: v[3], approx: true });
    });
    var vus = {};
    res = res.filter(function (r) { var k = norm(r.adresse + '|' + r.ville); if (vus[k]) return false; vus[k] = 1; return true; }).slice(0, 7);
    cacheRech[cle] = res;
    return res;
  }
  async function adresseDePosition(lat, lng) {
    try {
      var j = await (await fetch('https://photon.komoot.io/reverse?lang=fr&lon=' + lng + '&lat=' + lat)).json();
      var p = (j.features && j.features[0] && j.features[0].properties) || {};
      var rue = [p.housenumber, p.street].filter(Boolean).join(' ');
      var v = villeProche(lat, lng);
      return { adresse: rue || p.name || 'Ma position', ville: p.city || p.town || p.village || v[0], prov: provinceDe(p.state, lat, lng), lat: lat, lng: lng };
    } catch (e) {
      var w = villeProche(lat, lng);
      return { adresse: 'Ma position', ville: w[0], prov: w[1], lat: lat, lng: lng };
    }
  }
  // Distance et durée par la route (OSRM), sinon à vol d'oiseau x 1,3
  async function trajet(a, b) {
    var vol = distance(a.lat, a.lng, b.lat, b.lng);
    try {
      var j = await (await fetch('https://router.project-osrm.org/route/v1/driving/' + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=false')).json();
      if (j.routes && j.routes[0]) return { km: j.routes[0].distance / 1000, min: j.routes[0].duration / 60 };
    } catch (e) {}
    var k = (vol || 0) * 1.3;
    return { km: k, min: k / 70 * 60 + 2 };
  }
  var tarifsCache = null;
  async function tarifs(force) {
    if (tarifsCache && !force) return tarifsCache;
    var r = await sb.from('tarifs').select('*');
    tarifsCache = {}; (r.data || []).forEach(function (t) { tarifsCache[t.province] = t; });
    return tarifsCache;
  }
  function prix(t, prov, kms, attenteS, moment) {
    var tf = t[prov] || t.NB;
    var brut = Number(tf.base) + Number(tf.km) * Math.max(0, kms) + Number(tf.minute) * Math.max(0, attenteS) / 60;
    var h = (moment || new Date()).getHours(), nuit = (h >= 23 || h < 5) ? Math.round(brut * Number(tf.nuit_pct)) / 100 : 0;
    return { compteur: brut + nuit, nuit: nuit, redevance: Number(tf.redevance), total: brut + nuit + Number(tf.redevance) };
  }
  // Détail des taxes (le compteur inclut les taxes)
  function taxes(prov, compteur, redevance) {
    if (prov === 'QC') {
      var tot = compteur + redevance, base = tot / 1.14975;
      return [['TPS 5 % (incluse)', base * 0.05], ['TVQ 9,975 % (incluse)', base * 0.09975]];
    }
    return [['TVH 15 % (incluse)', compteur - compteur / 1.15]];
  }

  // ---------- Carte (Leaflet + OpenStreetMap) ----------
  function carte(el, centre, zoom) {
    var m = L.map(el, { zoomControl: false, attributionControl: true }).setView(centre || [48.005, -66.673], zoom || 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    return m;
  }
  function marqueur(m, lat, lng, html, classe) {
    var ic = L.divIcon({ className: '', html: '<div class="' + (classe || 'marq') + '">' + (html || '') + '</div>', iconSize: [0, 0] });
    return L.marker([lat, lng], { icon: ic }).addTo(m);
  }
  function lienNavigation(lat, lng, texte) {
    if (lat != null) return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving';
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(texte) + '&travelmode=driving';
  }

  // Appli installable
  if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); }); }

  // Champ d'adresse avec suggestions
  function champAdresse(input, boite, surChoix, getPres) {
    var minuterie = null, choisi = null;
    input.addEventListener('input', function () {
      choisi = null; surChoix(null);
      clearTimeout(minuterie);
      var q = input.value;
      if (q.trim().length < 3) { boite.innerHTML = ''; boite.classList.add('cache'); return; }
      minuterie = setTimeout(async function () {
        var res = await chercherAdresses(q, getPres ? getPres() : null);
        if (input.value !== q) return;
        boite.innerHTML = res.map(function (r, i) {
          return '<button type="button" data-i="' + i + '"><span><div class="s1">' + esc(r.adresse) + '</div><div class="s2">' + esc(r.ville) + ', ' + (r.prov === 'QC' ? 'Qc' : 'N.-B.') + (r.approx ? ' · adresse saisie' : '') + '</div></span><span class="pastille ' + (r.prov === 'QC' ? 'p-course' : 'p-dispo') + '">' + r.prov + '</span></button>';
        }).join('') || '<div class="vide">Aucune adresse trouvée</div>';
        boite.classList.remove('cache');
        $$('button', boite).forEach(function (b) {
          b.onclick = function () { choisi = res[+b.dataset.i]; input.value = choisi.adresse + ', ' + choisi.ville; boite.classList.add('cache'); surChoix(choisi); };
        });
      }, 300);
    });
    return { definir: function (a) { choisi = a; input.value = a ? (a.adresse + (a.ville && a.adresse.indexOf(a.ville) < 0 ? ', ' + a.ville : '')) : ''; boite.classList.add('cache'); surChoix(a); }, valeur: function () { return choisi; } };
  }

  window.Taxi = {
    sb: sb, ENTREPRISE: ENTREPRISE, VILLES: VILLES,
    connexion: connexion, inscription: inscription, fonctionCompte: fonctionCompte, changerMonNip: changerMonNip,
    monProfil: monProfil, exigerRole: exigerRole, deconnexion: deconnexion, tel10: tel10, telJoli: telJoli,
    $: $, $$: $$, esc: esc, argent: argent, km: km, heure: heure, dateCourte: dateCourte, dateHeure: dateHeure,
    toast: toast, erreurMsg: erreurMsg, bip: bip, avis: avis, demanderAvis: demanderAvis,
    distance: distance, villeProche: villeProche, chercherAdresses: chercherAdresses, adresseDePosition: adresseDePosition,
    trajet: trajet, tarifs: tarifs, prix: prix, taxes: taxes, carte: carte, marqueur: marqueur, lienNavigation: lienNavigation,
    champAdresse: champAdresse, norm: norm
  };
})();
