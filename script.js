const SECRET = "reg@@s";
let currentMode = "total";
let currentVariation = 0;

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat(String($(id).value).replace(/\s/g, "").replace(",", "."));
const rnd = (a, b) => Math.random() * (b - a) + a;
const r2 = (x) => Math.round(x * 100) / 100;
const fcfa = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " F";
const signe = (n) => (n >= 0 ? "+" : "") + fcfa(n);

/* Les 3 options : 2 résultats misés (un par compte), le 3e est le risque */
const PAIRES = [["fav", "nul"], ["out", "nul"], ["fav", "out"]];

function checkPassword() {
    if ($("password-input").value === SECRET) {
        $("login-screen").classList.remove("active");
        $("main-screen").classList.add("active");
    } else {
        $("error-msg").textContent = "Mot de passe incorrect.";
    }
}

function noms() {
    return {
        f: $("team-fav").value.trim() || "Favori",
        o: $("team-out").value.trim() || "Faible"
    };
}
function pari(key) {
    const { f, o } = noms();
    return key === "fav" ? f : key === "out" ? o : "Nul";
}
function cond(key) {
    const { f, o } = noms();
    return key === "fav" ? f + " gagne" : key === "out" ? o + " gagne" : "le match est nul";
}
function troisieme(p) {
    return ["fav", "nul", "out"].find(k => !p.includes(k));
}

function setMode(mode) {
    currentMode = mode;
    $("btn-mode-total").classList.toggle("active", mode === "total");
    $("btn-mode-gain").classList.toggle("active", mode === "gain");
    $("input-total").classList.toggle("hidden", mode !== "total");
    $("input-gain").classList.toggle("hidden", mode !== "gain");
}

function setVariation(val, btn) {
    currentVariation = val;
    document.querySelectorAll("#variation-chips .chip").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

function afficher(html) {
    const box = $("resultats");
    box.innerHTML = html;
    box.classList.remove("hidden");
    if (box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "start" });
}
function echec(msg) {
    afficher('<div class="result fail"><div class="fail-title">❌ Ça ne passe pas</div><div class="muted">' + msg + '</div></div>');
}

/* Montant total minimum (francs entiers) pour garder au moins +1 F sur les 2 paris */
function miseMin(o1, o2) {
    const S = 1 / o1 + 1 / o2;
    for (let T = 1; T <= 1000000; T++) {
        const R = T / S;
        const m1 = Math.round(R / o1), m2 = Math.round(R / o2);
        if (m1 < 1 || m2 < 1) continue;
        const tot = m1 + m2;
        if (Math.min(m1 * o1 - tot, m2 * o2 - tot) >= 1) return tot;
    }
    return null;
}

function calcPaire(p, cotes, total, gMin, gMoy) {
    const o1 = cotes[p[0]], o2 = cotes[p[1]];
    const S = 1 / o1 + 1 / o2;
    const base = { p, o1, o2, S, tr: troisieme(p) };
    if (S >= 1) return { ...base, ok: false, raison: "total 1÷cote + 1÷cote = " + S.toFixed(3) + " (doit être inférieur à 1)" };
    const mm = miseMin(o1, o2);
    if (!mm) return { ...base, ok: false, raison: "cotes trop proches (plus de 1 000 000 F nécessaires)" };

    let T, gainBas = 0;
    if (total !== null) T = total;
    else { T = gMoy / (1 / S - 1); gainBas = gMin; }
    let faible = false;
    if (T < mm) { T = mm; faible = true; gainBas = 0; }

    const R = T / S;
    let best = null;
    for (let i = 0; i <= 300 && !best; i++) {
        const amp = currentVariation * (1 - i / 300);
        const m1 = r2((R / o1) * (1 + rnd(-amp, amp)));
        const m2 = r2((R / o2) * (1 + rnd(-amp, amp)));
        const tot = m1 + m2;
        const g1 = m1 * o1 - tot, g2 = m2 * o2 - tot;
        const gmin = Math.min(g1, g2);
        if (gmin > 0 && gmin >= gainBas - 1e-9) best = { m1, m2, tot, g1, g2, gmin };
    }
    if (!best) return { ...base, ok: false, raison: "pas de gain avec cette variation, essaie une variation plus petite" };
    return { ...base, ok: true, mm, faible, ...best };
}

function carte(n, r) {
    const titre = "Option " + n + " : " + pari(r.p[0]) + " + " + pari(r.p[1]);
    if (!r.ok) {
        return '<div class="result fail" style="margin-bottom:12px"><div class="fail-title" style="font-size:16px">' + titre + '</div><div class="muted">❌ Ne passe pas : ' + r.raison + '</div></div>';
    }
    const alerte = r.faible
        ? '<div class="muted" style="color:var(--bad);font-weight:700;margin-bottom:8px">⚠️ Montant trop faible. Misez au minimum ' + r.mm.toLocaleString("fr-FR") + ' F. Calcul fait pour ce minimum.</div>'
        : "";
    return '<div class="result ok" style="margin-bottom:12px">' +
        '<div class="fail-title" style="color:var(--text);font-size:16px">' + titre + '</div>' +
        alerte +
        '<div class="row"><div><div>Compte 1 : miser sur ' + pari(r.p[0]) + '</div><div class="sub">cote ' + r.o1.toFixed(2) + '</div></div><div class="amount">' + fcfa(r.m1) + '</div></div>' +
        '<div class="row"><div><div>Compte 2 : miser sur ' + pari(r.p[1]) + '</div><div class="sub">cote ' + r.o2.toFixed(2) + '</div></div><div class="amount">' + fcfa(r.m2) + '</div></div>' +
        '<div class="row total"><div>Total misé</div><div class="amount">' + fcfa(r.tot) + '</div></div>' +
        '<div class="row"><div><div>Si ' + cond(r.p[0]) + '</div><div class="sub">tu reçois ' + fcfa(r.m1 * r.o1) + '</div></div><div class="amount" style="color:var(--ok)">' + signe(r.g1) + '</div></div>' +
        '<div class="row"><div><div>Si ' + cond(r.p[1]) + '</div><div class="sub">tu reçois ' + fcfa(r.m2 * r.o2) + '</div></div><div class="amount" style="color:var(--ok)">' + signe(r.g2) + '</div></div>' +
        '<div class="row"><div><div>Si ' + cond(r.tr) + '</div><div class="sub">tu perds tout</div></div><div class="amount" style="color:var(--bad)">' + signe(-r.tot) + '</div></div>' +
        '<div class="sub">Mise minimum pour être gagnant : ' + r.mm.toLocaleString("fr-FR") + ' F</div>' +
        '</div>';
}

function calculer() {
    const cotes = { fav: num("cote-fav"), nul: num("cote-nul"), out: num("cote-out") };
    if ([cotes.fav, cotes.nul, cotes.out].some(v => isNaN(v) || v <= 1)) return echec("entre les 3 cotes du match (supérieures à 1).");

    let total = null, gMin = 0, gMoy = 0;
    if (currentMode === "total") {
        total = num("montant-total");
        if (isNaN(total) || total <= 0) return echec("montant invalide.");
    } else {
        gMin = num("gain-min");
        const gMax = num("gain-max");
        if (isNaN(gMin) || isNaN(gMax) || gMin <= 0 || gMax < gMin) return echec("gains invalides.");
        gMoy = (gMin + gMax) / 2;
    }

    const rs = PAIRES.map(p => calcPaire(p, cotes, total, gMin, gMoy));
    afficher(
        '<div class="muted" style="margin-bottom:10px;font-weight:600">⚠️ Tu récupères ta mise seulement si l\'un de tes 2 paris passe. Si le 3e résultat arrive, tu perds tout.</div>' +
        rs.map((r, i) => carte(i + 1, r)).join("")
    );
}
