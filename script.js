const SECRET = "reg@@s";
let currentMode = "total";
let currentVariation = 0;
let selection = [];
let dernierRecapTexte = "";

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat(String($(id).value).replace(/\s/g, "").replace(",", "."));
const rnd = (a, b) => Math.random() * (b - a) + a;
const r2 = (x) => Math.round(x * 100) / 100;
const fcfa = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " F";
const signe = (n) => (n >= 0 ? "+" : "") + fcfa(n);

function checkPassword() {
    if ($("password-input").value === SECRET) {
        $("login-screen").classList.remove("active");
        $("main-screen").classList.add("active");
    } else {
        $("error-msg").textContent = "Mot de passe incorrect.";
    }
}

function toggleIssue(key) {
    const i = selection.indexOf(key);
    if (i >= 0) selection.splice(i, 1);
    else {
        selection.push(key);
        if (selection.length > 2) selection.shift();
    }
    ["forte", "faible", "nul"].forEach(k =>
        $("issue-" + k).classList.toggle("selected", selection.includes(k)));
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
    box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function echec(msg) {
    dernierRecapTexte = "";
    afficher('<div class="result fail"><div class="fail-title">❌ Ça ne passe pas</div><div class="muted">' + msg + '</div></div>');
}

function calculer() {
    const teamFav = $("team-fav").value.trim() || "Favorite";
    const teamOut = $("team-out").value.trim() || "Adversaire";
    const defs = {
        forte:  { name: "Favori gagne",  team: teamFav },
        faible: { name: "Adversaire gagne", team: teamOut },
        nul:    { name: "Match nul",       team: "Nul" }
    };

    if (selection.length !== 2) return echec("choisis exactement 2 issues.");
    const sel = selection.map(k => ({ ...defs[k], cote: num("cote-" + k) }));
    if (sel.some(s => isNaN(s.cote) || s.cote <= 1)) return echec("cotes invalides (doivent être supérieures à 1).");

    const c1 = sel[0].cote, c2 = sel[1].cote;
    const S = 1 / c1 + 1 / c2;
    if (S >= 1) return echec("avec ces cotes, impossible de gagner à coup sûr.");

    let T, gainBas = 0;
    if (currentMode === "total") {
        T = num("montant-total");
        if (isNaN(T) || T <= 0) return echec("montant invalide.");
    } else {
        const gMin = num("gain-min"), gMax = num("gain-max");
        if (isNaN(gMin) || isNaN(gMax) || gMin <= 0 || gMax < gMin) return echec("gains invalides.");
        T = ((gMin + gMax) / 2) / (1 / S - 1);
        gainBas = gMin;
    }

    const R = T / S;
    const m1Base = R / c1, m2Base = R / c2;

    let best = null;
    for (let i = 0; i <= 300 && !best; i++) {
        const amp = currentVariation * (1 - i / 300);
        const m1 = r2(m1Base * (1 + rnd(-amp, amp)));
        const m2 = r2(m2Base * (1 + rnd(-amp, amp)));
        const tot = m1 + m2;
        const g1 = m1 * c1 - tot, g2 = m2 * c2 - tot;
        if (Math.min(g1, g2) >= gainBas - 1e-9) best = { m1, m2, tot, g: Math.min(g1, g2) };
    }
    if (!best) return echec("pas de gain garanti avec ces cotes.");

    const ligne = (s, m, extra) =>
        '<div class="row"><div><div>' + s.name + '</div><div class="sub">' + s.team + ' · cote ' + s.cote + '</div></div><div class="amount">' + fcfa(m) + '</div></div>';

    afficher(
        '<div class="result ok">' +
            '<div class="gain-label">Gain net garanti</div>' +
            '<div class="gain-value">' + signe(best.g) + '</div>' +
            ligne(sel[0], best.m1) +
            ligne(sel[1], best.m2) +
            '<div class="row total"><div>Total misé</div><div class="amount">' + fcfa(best.tot) + '</div></div>' +
            '<div class="muted" style="margin-top:10px">⚠️ Si le 3e résultat arrive, la mise est perdue.</div><button id="btn-copy" class="btn btn-copy" onclick="copierRecap()">Copier le rapport</button>' +
        '</div>'
    );

    dernierRecapTexte = [
        "REGIS-BET",
        sel[0].name + " (" + sel[0].team + ") @" + c1 + " : " + fcfa(best.m1),
        sel[1].name + " (" + sel[1].team + ") @" + c2 + " : " + fcfa(best.m2),
        "Total misé : " + fcfa(best.tot),
        "Gain net garanti : " + signe(best.g)
    ].join("\n");
}

function copierRecap() {
    if (!dernierRecapTexte) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dernierRecapTexte).then(flashCopie).catch(fallbackCopie);
    } else {
        fallbackCopie();
    }
}
function fallbackCopie() {
    const ta = document.createElement("textarea");
    ta.value = dernierRecapTexte;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); flashCopie(); }
    catch (e) { alert("Copie impossible sur ce navigateur."); }
    document.body.removeChild(ta);
}
function flashCopie() {
    const btn = $("btn-copy");
    const old = btn.textContent;
    btn.textContent = "Copié ✓";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 1500);
}
