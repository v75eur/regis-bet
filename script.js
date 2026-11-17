const SECRET = "reg@@s";
let currentMode = "total";
let currentVariation = 0;
let currentBonusCible = "none";
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

/* ================= BONUS ================= */
function setBonusCible(val) {
    currentBonusCible = val;
    document.getElementById("btn-bonus-none").classList.toggle("active", val === "none");
    document.getElementById("btn-bonus-1").classList.toggle("active", val === "1");
    document.getElementById("btn-bonus-2").classList.toggle("active", val === "2");
    document.getElementById("bonus-montant-container").style.display = (val === "none") ? "none" : "block";
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

    /* --- Bonus --- */
    let bonusMontant = 0;
    if (currentBonusCible !== "none") {
        bonusMontant = parseFloat(document.getElementById("bonus-montant").value);
        if (isNaN(bonusMontant) || bonusMontant <= 0) { alert("Montant bonus invalide."); return; }
    }

    /* --- Mises theoriques --- */
    let mise1Base = (montantTotal * c2) / (c1 + c2);
    let mise2Base = (montantTotal * c1) / (c1 + c2);

    /* --- Variation anti-bot --- */
    let mise1 = mise1Base, mise2 = mise2Base;
    let variation1 = 0, variation2 = 0;
    if (currentVariation > 0) {
        const v1 = rnd(-currentVariation, currentVariation);
        const v2 = rnd(-currentVariation, currentVariation);
        mise1 = mise1Base * (1 + v1);
        mise2 = mise2Base * (1 + v2);
        variation1 = v1; variation2 = v2;
    }

    mise1 = Math.round(mise1 * 100) / 100;
    mise2 = Math.round(mise2 * 100) / 100;

    /* --- Bonus applique --- */
    let mise1Bonus = 0, mise2Bonus = 0;
    if (currentBonusCible === "1") mise1Bonus = bonusMontant;
    if (currentBonusCible === "2") mise2Bonus = bonusMontant;

    const totalMiseReelle = mise1 + mise2;
    const totalMiseAvecBonus = totalMiseReelle + mise1Bonus + mise2Bonus;

    /* --- Retours et gains --- */
    const retour1 = (mise1 + mise1Bonus) * c1;
    const retour2 = (mise2 + mise2Bonus) * c2;
    const gainNet1 = retour1 - totalMiseReelle;
    const gainNet2 = retour2 - totalMiseReelle;
    const gainMinReel = Math.min(gainNet1, gainNet2);
    const gainMaxReel = Math.max(gainNet1, gainNet2);
    const arbitrable = marge < 1;

    /* --- HTML --- */
    const bonusLine = (currentBonusCible !== "none")
        ? '<div class="res-line"><span>Bonus applique sur ' + (currentBonusCible === "1" ? selected[0].name : selected[1].name) + '</span><span class="highlight">' + formatFCFA(bonusMontant) + '</span></div>'
        : '';

    const margeLine = arbitrable
        ? '<div class="res-line"><span>Marge bookmaker</span><span class="up">' + formatPct(marge) + ' (arbitrage OK)</span></div>'
        : '<div class="res-line"><span>Marge bookmaker</span><span class="down">' + formatPct(marge) + ' (defavorable)</span></div>';

    const html = [
        '<div class="section-title">Equipes</div>',
        '<div class="res-line"><span>Equipe Favorite</span><span>' + teamFav + '</span></div>',
        '<div class="res-line"><span>Equipe Perdante</span><span>' + teamOut + '</span></div>',

        '<div class="section-title">Mises a placer</div>',
        '<div class="res-line"><span>Mise ' + selected[0].name + ' (' + selected[0].team + ') - cote ' + c1 + '</span><span class="highlight">' + formatFCFA(mise1) + '</span></div>',
        '<div class="res-line"><span>Mise ' + selected[1].name + ' (' + selected[1].team + ') - cote ' + c2 + '</span><span class="highlight">' + formatFCFA(mise2) + '</span></div>',
        bonusLine,
        '<div class="res-line total"><span>Total sorti de ta poche</span><span>' + formatFCFA(totalMiseReelle) + '</span></div>',
        (currentBonusCible !== "none"
            ? '<div class="res-line"><span>Total place (avec bonus)</span><span>' + formatFCFA(totalMiseAvecBonus) + '</span></div>'
            : ''),

        '<div class="section-title">Variation Anti-Bot appliquee</div>',
        '<div class="res-line"><span>Sur ' + selected[0].name + '</span><span class="' + (variation1 >= 0 ? 'up' : 'down') + '">' + (variation1 >= 0 ? '+' : '') + (variation1*100).toFixed(2) + '%</span></div>',
        '<div class="res-line"><span>Sur ' + selected[1].name + '</span><span class="' + (variation2 >= 0 ? 'up' : 'down') + '">' + (variation2 >= 0 ? '+' : '') + (variation2*100).toFixed(2) + '%</span></div>',

        '<div class="section-title">Resultat si une issue passe</div>',
        '<div class="res-line"><span>Retour si ' + selected[0].name + ' (' + selected[0].team + ')</span><span>' + formatFCFA(retour1) + '</span></div>',
        '<div class="res-line"><span>Gain net si ' + selected[0].name + ' (' + selected[0].team + ')</span><span class="' + (gainNet1 >= 0 ? 'up' : 'down') + '">' + (gainNet1 >= 0 ? '+' : '') + formatFCFA(gainNet1) + '</span></div>',
        '<div class="res-line"><span>Retour si ' + selected[1].name + ' (' + selected[1].team + ')</span><span>' + formatFCFA(retour2) + '</span></div>',
        '<div class="res-line"><span>Gain net si ' + selected[1].name + ' (' + selected[1].team + ')</span><span class="' + (gainNet2 >= 0 ? 'up' : 'down') + '">' + (gainNet2 >= 0 ? '+' : '') + formatFCFA(gainNet2) + '</span></div>',

        '<div class="section-title">Recapitulatif</div>',
        margeLine,
        '<div class="res-line"><span>Gain net garanti (min)</span><span class="' + (gainMinReel >= 0 ? 'up' : 'down') + '">' + (gainMinReel >= 0 ? '+' : '') + formatFCFA(gainMinReel) + '</span></div>',
        '<div class="res-line"><span>Gain net max</span><span class="' + (gainMaxReel >= 0 ? 'up' : 'down') + '">' + (gainMaxReel >= 0 ? '+' : '') + formatFCFA(gainMaxReel) + '</span></div>'
    ].join('');

    resContent.innerHTML = html;
    resDiv.style.display = "block";

    /* --- Texte pour presse-papier --- */
    const sep = "================================";
    const lines = [
        sep,
        "   REGIS-BET - RECAPITULATIF",
        sep,
        "Equipe Favorite : " + teamFav,
        "Equipe Perdante : " + teamOut,
        "",
        "-- MISES --",
        selected[0].name + " (" + selected[0].team + ") | cote " + c1 + " | " + formatFCFA(mise1) + (mise1Bonus > 0 ? " + bonus " + formatFCFA(mise1Bonus) : ""),
        selected[1].name + " (" + selected[1].team + ") | cote " + c2 + " | " + formatFCFA(mise2) + (mise2Bonus > 0 ? " + bonus " + formatFCFA(mise2Bonus) : ""),
        "TOTAL SORTI DE TA POCHE : " + formatFCFA(totalMiseReelle),
        "",
        "-- VARIATION --",
        selected[0].name + " : " + (variation1 >= 0 ? '+' : '') + (variation1*100).toFixed(2) + "%",
        selected[1].name + " : " + (variation2 >= 0 ? '+' : '') + (variation2*100).toFixed(2) + "%",
        "",
        "-- RESULTATS --",
        "Si " + selected[0].name + " : retour " + formatFCFA(retour1) + " | gain net " + (gainNet1 >= 0 ? '+' : '') + formatFCFA(gainNet1),
        "Si " + selected[1].name + " : retour " + formatFCFA(retour2) + " | gain net " + (gainNet2 >= 0 ? '+' : '') + formatFCFA(gainNet2),
        "",
        "-- RECAP --",
        "Marge bookmaker : " + formatPct(marge) + (arbitrable ? " (arbitrage OK)" : " (defavorable)"),
        "Gain net garanti (min) : " + (gainMinReel >= 0 ? '+' : '') + formatFCFA(gainMinReel),
        "Gain net max : " + (gainMaxReel >= 0 ? '+' : '') + formatFCFA(gainMaxReel),
        sep
    ];
    dernierRecapTexte = lines.join('\n');
}

/* ================= COPIE ================= */
function copierRecap() {
    if (!dernierRecapTexte) { alert("Calcule d'abord une repartition."); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dernierRecapTexte).then(() => flashCopie("Copie !")).catch(() => fallbackCopie());
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
