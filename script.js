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

/* ================= SÉLECTION ISSUES ================= */
function limitCheckboxes(selectedId) {
    const chks = ["chk-forte", "chk-faible", "chk-nul"];
    const count = chks.filter(id => document.getElementById(id).checked).length;
    if (count > 2) {
        document.getElementById(selectedId).checked = false;
        alert("Choisissez 2 issues maximum.");
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
    const teamFav = document.getElementById("team-fav").value.trim() || "Équipe favorite";
    const teamOut = document.getElementById("team-out").value.trim() || "Équipe perdante";
    const resDiv = document.getElementById("resultats");
    const resContent = document.getElementById("resultat-contenu");
    const btnCopy = document.getElementById("btn-copy");

    const echec = (msg) => {
        resContent.innerHTML = '<div class="res-line"><span class="down">❌ Ça ne passe pas : ' + msg + '</span></div>';
        btnCopy.style.display = "none";
        resDiv.style.display = "block";
        dernierRecapTexte = "";
    };
    btnCopy.style.display = "";
    resDiv.style.display = "none";

    const selected = [];
    if (document.getElementById("chk-forte").checked)  selected.push({ name: "Victoire Forte",  cote: parseFloat(document.getElementById("cote-forte").value),  team: teamFav });
    if (document.getElementById("chk-faible").checked) selected.push({ name: "Victoire Faible", cote: parseFloat(document.getElementById("cote-faible").value), team: teamOut });
    if (document.getElementById("chk-nul").checked)    selected.push({ name: "Match Nul",       cote: parseFloat(document.getElementById("cote-nul").value),    team: "Match Nul" });

    if (selected.length !== 2) return echec("cochez exactement 2 issues.");
    if (selected.some(c => isNaN(c.cote) || c.cote <= 1)) return echec("cotes invalides (> 1).");

    const c1 = selected[0].cote, c2 = selected[1].cote;
    const S = 1 / c1 + 1 / c2;

    // Bonus (free bet : mise non rendue, on touche bonus x (cote-1))
    let B1 = 0, B2 = 0;
    if (currentBonusCible !== "none") {
        const b = parseFloat(document.getElementById("bonus-montant").value);
        if (isNaN(b) || b <= 0) return echec("montant du bonus invalide.");
        if (currentBonusCible === "1") B1 = b; else B2 = b;
    }
    const k1 = B1 * (c1 - 1) / c1, k2 = B2 * (c2 - 1) / c2;
    const k = k1 + k2;

    // Montant total + gain minimum exigé
    let T, gainBas;
    if (currentMode === "total") {
        T = parseFloat(document.getElementById("montant-total").value);
        if (isNaN(T) || T <= 0) return echec("montant invalide.");
        gainBas = 0;
    } else {
        const gMin = parseFloat(document.getElementById("gain-min").value);
        const gMax = parseFloat(document.getElementById("gain-max").value);
        if (isNaN(gMin) || isNaN(gMax) || gMin <= 0 || gMax < gMin) return echec("gains invalides.");
        const G = (gMin + gMax) / 2;
        T = (G - k / S) / (1 / S - 1);
        if (!isFinite(T) || T <= 0) return echec("ce gain n'est pas atteignable avec ces cotes.");
        gainBas = gMin;
    }

    // Mises qui égalisent le retour des 2 issues
    const R = (T + k) / S;
    const m1Base = R / c1 - k1;
    const m2Base = R / c2 - k2;
    if (m1Base < 0 || m2Base < 0) return echec("le bonus est trop élevé pour ce montant.");

    const calc = (m1, m2) => {
        const tot = m1 + m2;
        return { m1, m2, tot, g1: m1 * c1 + B1 * (c1 - 1) - tot, g2: m2 * c2 + B2 * (c2 - 1) - tot };
    };
    const r2 = (x) => Math.round(x * 100) / 100;

    // Variation anti-bot : on ne garde que les tirages où les 2 issues restent gagnantes
    let best = null;
    for (let i = 0; i <= 300 && !best; i++) {
        const amp = currentVariation * (1 - i / 300);
        const v1 = rnd(-amp, amp), v2 = rnd(-amp, amp);
        const r = calc(r2(m1Base * (1 + v1)), r2(m2Base * (1 + v2)));
        if (Math.min(r.g1, r.g2) >= gainBas - 1e-9) { best = r; best.v1 = v1; best.v2 = v2; }
    }
    if (!best) return echec("pas de gain garanti avec ces cotes" + (B1 + B2 ? " et ce bonus." : "."));

    const gMin = Math.min(best.g1, best.g2);
    const sg = (x) => (x >= 0 ? "+" : "") + formatFCFA(x);
    const bon1 = B1 ? " (+ bonus " + formatFCFA(B1) + ")" : "";
    const bon2 = B2 ? " (+ bonus " + formatFCFA(B2) + ")" : "";

    resContent.innerHTML = [
        '<div class="res-line"><span>' + selected[0].name + ' (' + selected[0].team + ') @' + c1 + '</span><span class="highlight">' + formatFCFA(best.m1) + bon1 + '</span></div>',
        '<div class="res-line"><span>' + selected[1].name + ' (' + selected[1].team + ') @' + c2 + '</span><span class="highlight">' + formatFCFA(best.m2) + bon2 + '</span></div>',
        '<div class="res-line total"><span>Total sorti de ta poche</span><span>' + formatFCFA(best.tot) + '</span></div>',
        '<div class="res-line"><span>Gain net garanti</span><span class="up">' + sg(gMin) + '</span></div>'
    ].join("");
    btnCopy.style.display = "";
    resDiv.style.display = "block";

    dernierRecapTexte = [
        "REGIS-BET",
        selected[0].name + " (" + selected[0].team + ") @" + c1 + " : " + formatFCFA(best.m1) + bon1,
        selected[1].name + " (" + selected[1].team + ") @" + c2 + " : " + formatFCFA(best.m2) + bon2,
        "Total sorti de ta poche : " + formatFCFA(best.tot),
        "Gain net garanti : " + sg(gMin)
    ].join("\n");
}

/* ================= COPIE ================= */
function copierRecap() {
    if (!dernierRecapTexte) { alert("Calcule d'abord une répartition."); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dernierRecapTexte).then(() => flashCopie("Copié !")).catch(() => fallbackCopie());
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
    try { document.execCommand("copy"); flashCopie("Copié !"); }
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
