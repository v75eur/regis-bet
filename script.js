const SECRET = "reg@@s";
let currentMode = "total";
let currentVariation = 0;
let dernierRecapTexte = "";

/* ================= UTILITAIRES ================= */
function formatFCFA(n) {
    if (isNaN(n)) return "0 F";
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " F";
}
function formatPct(n) {
    return (n * 100).toFixed(1) + "%";
}
function rnd(min, max) {
    return Math.random() * (max - min) + min;
}

/* ================= LOGIN ================= */
function checkPassword() {
    const pwd = document.getElementById("password-input").value;
    if (pwd === SECRET) {
        document.getElementById("login-screen").classList.remove("active");
        document.getElementById("main-screen").classList.add("active");
    } else {
        document.getElementById("error-msg").textContent = "Mot de passe incorrect.";
    }
}

/* ================= SELECTION ISSUES ================= */
function limitCheckboxes(selectedId) {
    const chks = ['chk-forte', 'chk-faible', 'chk-nul'];
    const count = chks.filter(id => document.getElementById(id).checked).length;
    if (count > 2) {
        document.getElementById(selectedId).checked = false;
        alert("Choisissez 2 conditions maximum.");
    }
}

/* ================= MODE ================= */
function setMode(mode) {
    currentMode = mode;
    document.getElementById("btn-mode-total").classList.toggle("active", mode === "total");
    document.getElementById("btn-mode-gain").classList.toggle("active", mode === "gain");
    document.getElementById("input-total").style.display = (mode === "total") ? "block" : "none";
    document.getElementById("input-gain").style.display = (mode === "gain") ? "block" : "none";
}

/* ================= VARIATION ================= */
function setVariation(val, btn) {
    currentVariation = val;
    document.querySelectorAll(".variation-switch button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

/* ================= CALCUL PRINCIPAL ================= */
function calculer() {
    const teamFav = document.getElementById("team-fav").value.trim() || "Equipe Favorite";
    const teamOut = document.getElementById("team-out").value.trim() || "Equipe Perdante";

    const chkForte  = document.getElementById("chk-forte").checked;
    const chkFaible = document.getElementById("chk-faible").checked;
    const chkNul    = document.getElementById("chk-nul").checked;

    const coteForte  = parseFloat(document.getElementById("cote-forte").value);
    const coteFaible = parseFloat(document.getElementById("cote-faible").value);
    const coteNul    = parseFloat(document.getElementById("cote-nul").value);

    const selected = [];
    if (chkForte)  selected.push({ name: "Victoire Forte",  cote: coteForte,  team: teamFav });
    if (chkFaible) selected.push({ name: "Victoire Faible", cote: coteFaible, team: teamOut });
    if (chkNul)    selected.push({ name: "Match Nul",       cote: coteNul,    team: "Match Nul" });

    const resDiv = document.getElementById("resultats");
    const resContent = document.getElementById("resultat-contenu");
    resDiv.style.display = "none";

    if (selected.length !== 2) { alert("Cochez exactement 2 conditions."); return; }
    if (selected.some(c => isNaN(c.cote) || c.cote <= 1)) { alert("Entrez des cotes valides (> 1)."); return; }

    const c1 = selected[0].cote;
    const c2 = selected[1].cote;
    const marge = (1 / c1) + (1 / c2);

    if (marge >= 1) {
        resDiv.style.display = "block";
        resContent.innerHTML = '<p class="danger"><strong>Impossible de garantir un gain !</strong><br>Marge bookmaker trop elevee (' + formatPct(marge) + '). Il faut une marge < 100%.</p>';
        dernierRecapTexte = "Calcul impossible : marge trop elevee (" + formatPct(marge) + ")";
        return;
    }

    /* --- Montant total --- */
    let montantTotal, gainCibleMoyen;
    if (currentMode === "total") {
        montantTotal = parseFloat(document.getElementById("montant-total").value);
        if (isNaN(montantTotal) || montantTotal <= 0) { alert("Montant invalide."); return; }
        gainCibleMoyen = montantTotal * (1 - marge);
    } else {
        const gainMin = parseFloat(document.getElementById("gain-min").value);
        const gainMax = parseFloat(document.getElementById("gain-max").value);
        if (isNaN(gainMin) || isNaN(gainMax) || gainMin <= 0 || gainMax < gainMin) {
            alert("Gains invalides."); return;
        }
        gainCibleMoyen = (gainMin + gainMax) / 2;
        montantTotal = gainCibleMoyen / (1 - marge);
    }

    /* --- Mises theoriques --- */
    let mise1Base = (montantTotal * c2) / (c1 + c2);
    let mise2Base = (montantTotal * c1) / (c1 + c2);

    /* --- Variation anti-bot SAFE --- */
    let mise1 = mise1Base, mise2 = mise2Base;
    let variation1 = 0, variation2 = 0;

    if (currentVariation > 0) {
        let ok = false;
        for (let i = 0; i < 30; i++) {
            const v1 = rnd(-currentVariation, currentVariation);
            const v2 = rnd(-currentVariation, currentVariation);
            const m1 = mise1Base * (1 + v1);
            const m2 = mise2Base * (1 + v2);
            const totalV = m1 + m2;
            const g1 = m1 * c1 - totalV;
            const g2 = m2 * c2 - totalV;
            if (g1 > 0 && g2 > 0) {
                mise1 = m1; mise2 = m2;
                variation1 = v1; variation2 = v2;
                ok = true;
                break;
            }
        }
        if (!ok) {
            const v = rnd(-currentVariation, currentVariation);
            mise1 = mise1Base * (1 + v);
            mise2 = mise2Base * (1 + v);
            variation1 = v; variation2 = v;
        }
    }

    /* --- Arrondis --- */
    mise1 = Math.round(mise1 * 100) / 100;
    mise2 = Math.round(mise2 * 100) / 100;
    const totalMise = mise1 + mise2;

    const retour1 = mise1 * c1;
    const retour2 = mise2 * c2;
    const gainNet1 = retour1 - totalMise;
    const gainNet2 = retour2 - totalMise;
    const gainMinReel = Math.min(gainNet1, gainNet2);
    const gainMaxReel = Math.max(gainNet1, gainNet2);

    /* --- Affichage HTML --- */
    const html = [
        // equipes
        '<div class="section-title">Equipes</div>',
        '<div class="res-line"><span>Equipe Favorite</span><span>' + teamFav + '</span></div>',
        '<div class="res-line"><span>Equipe Perdante</span><span>' + teamOut + '</span></div>',

        // mises
        '<div class="section-title">Mises a placer</div>',
        '<div class="res-line"><span>Mise ' + selected[0].name + ' (' + selected[0].team + ') - cote ' + c1 + '</span><span class="highlight">' + formatFCFA(mise1) + '</span></div>',
        '<div class="res-line"><span>Mise ' + selected[1].name + ' (' + selected[1].team + ') - cote ' + c2 + '</span><span class="highlight">' + formatFCFA(mise2) + '</span></div>',
        '<div class="res-line total"><span>Total mise</span><span>' + formatFCFA(totalMise) + '</span></div>',

        // variation
        '<div class="section-title">Variation Anti-Bot appliquee</div>',
        '<div class="res-line"><span>Sur ' + selected[0].name + '</span><span class="' + (variation1 >= 0 ? 'up' : 'down') + '">' + (variation1 >= 0 ? '+' : '') + (variation1*100).toFixed(2) + '%</span></div>',
        '<div class="res-line"><span>Sur ' + selected[1].name + '</span><span class="' + (variation2 >= 0 ? 'up' : 'down') + '">' + (variation2 >= 0 ? '+' : '') + (variation2*100).toFixed(2) + '%</span></div>',

        // retour / gain
        '<div class="section-title">Gains si l issue passe</div>',
        '<div class="res-line"><span>Retour si ' + selected[0].name + ' (' + selected[0].team + ')</span><span>' + formatFCFA(retour1) + '</span></div>',
        '<div class="res-line"><span>Gain net si ' + selected[0].name + ' (' + selected[0].team + ')</span><span class="highlight">+' + formatFCFA(gainNet1) + '</span></div>',
        '<div class="res-line"><span>Retour si ' + selected[1].name + ' (' + selected[1].team + ')</span><span>' + formatFCFA(retour2) + '</span></div>',
        '<div class="res-line"><span>Gain net si ' + selected[1].name + ' (' + selected[1].team + ')</span><span class="highlight">+' + formatFCFA(gainNet2) + '</span></div>',

        // recap
        '<div class="section-title">Recapitulatif</div>',
        '<div class="res-line"><span>Marge bookmaker</span><span>' + formatPct(marge) + '</span></div>',
        '<div class="res-line"><span>Gain net garanti (min)</span><span class="highlight">+' + formatFCFA(gainMinReel) + '</span></div>',
        '<div class="res-line"><span>Gain net max</span><span class="highlight">+' + formatFCFA(gainMaxReel) + '</span></div>',
        '<div class="res-line total"><span>Total gagne (si une issue passe)</span><span>' + formatFCFA(totalMise + gainMinReel) + ' a ' + formatFCFA(totalMise + gainMaxReel) + '</span></div>'
    ].join('');

    resContent.innerHTML = html;
    resDiv.style.display = "block";

    /* --- Recap TEXTE pour presse-papier --- */
    const sep = "================================";
    const lines = [
        sep,
        "   REGIS-BET - RECAPITULATIF",
        sep,
        "Equipe Favorite : " + teamFav,
        "Equipe Perdante : " + teamOut,
        "",
        "-- MISES --",
        selected[0].name + " (" + selected[0].team + ") | cote " + c1 + " | " + formatFCFA(mise1),
        selected[1].name + " (" + selected[1].team + ") | cote " + c2 + " | " + formatFCFA(mise2),
        "TOTAL MISE : " + formatFCFA(totalMise),
        "",
        "-- VARIATION --",
        selected[0].name + " : " + (variation1 >= 0 ? '+' : '') + (variation1*100).toFixed(2) + "%",
        selected[1].name + " : " + (variation2 >= 0 ? '+' : '') + (variation2*100).toFixed(2) + "%",
        "",
        "-- GAINS --",
        "Si " + selected[0].name + " : retour " + formatFCFA(retour1) + " | gain net +" + formatFCFA(gainNet1),
        "Si " + selected[1].name + " : retour " + formatFCFA(retour2) + " | gain net +" + formatFCFA(gainNet2),
        "",
        "-- RECAP --",
        "Marge bookmaker : " + formatPct(marge),
        "Gain garanti min : +" + formatFCFA(gainMinReel),
        "Gain max : +" + formatFCFA(gainMaxReel),
        "Total gagne : " + formatFCFA(totalMise + gainMinReel) + " a " + formatFCFA(totalMise + gainMaxReel),
        sep
    ];
    dernierRecapTexte = lines.join('\n');
}

/* ================= COPIE PRESSE-PAPIER ================= */
function copierRecap() {
    if (!dernierRecapTexte) { alert("Calcule d'abord une repartition."); return; }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dernierRecapTexte).then(() => {
            flashCopie("Copie !");
        }).catch(() => fallbackCopie());
    } else {
        fallbackCopie();
    }
}

function fallbackCopie() {
    const ta = document.createElement("textarea");
    ta.value = dernierRecapTexte;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); flashCopie("Copie !"); }
    catch (e) { alert("Copie impossible sur ce navigateur."); }
    document.body.removeChild(ta);
}

function flashCopie(msg) {
    const btn = document.getElementById("btn-copy");
    const old = btn.textContent;
    btn.textContent = msg;
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 1500);
}
