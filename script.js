const SECRET = "reg@@s";
let currentMode = "total";
let currentVariation = 0;
let selection = [];
let recap = "";

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

function noms() {
    return {
        f: $("team-fav").value.trim() || "Favori",
        o: $("team-out").value.trim() || "Faible"
    };
}

/* Issues = doubles chances calculées depuis les 3 codes */
function issues() {
    const { f, o } = noms();
    const a = num("cote-fav"), x = num("cote-nul"), b = num("cote-out");
    const dc = (p, q) => (isNaN(p) || isNaN(q) || p <= 1 || q <= 1) ? NaN : 1 / (1 / p + 1 / q);
    return {
        fn: { label: f + " ou nul",     cote: dc(a, x), couvre: ["fav", "nul"] },
        fo: { label: f + " ou " + o,    cote: dc(a, b), couvre: ["fav", "out"] },
        no: { label: "Nul ou " + o,     cote: dc(x, b), couvre: ["nul", "out"] }
    };
}

function majIssues() {
    const is = issues();
    ["fn", "fo", "no"].forEach(k => {
        $("lbl-" + k).textContent = is[k].label;
        $("d-" + k).textContent = isNaN(is[k].cote) ? "-" : "code " + is[k].cote.toFixed(2);
    });
}
document.addEventListener("input", (e) => {
    if (["team-fav", "team-out", "cote-fav", "cote-nul", "cote-out"].includes(e.target.id)) majIssues();
});

function toggleIssue(k) {
    const i = selection.indexOf(k);
    if (i >= 0) selection.splice(i, 1);
    else { selection.push(k); if (selection.length > 2) selection.shift(); }
    ["fn", "fo", "no"].forEach(key => $("issue-" + key).classList.toggle("selected", selection.includes(key)));
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
    recap = "";
    afficher('<div class="result fail"><div class="fail-title">❌ Ça ne passe pas</div><div class="muted">' + msg + '</div></div>');
}

function calculer() {
    if (selection.length !== 2) return echec("choisis exactement 2 issues.");
    const is = issues();
    const sel = selection.map(k => is[k]);
    if (sel.some(s => isNaN(s.cote))) return echec("entre les 3 codes (supérieurs à 1).");

    const d1 = sel[0].cote, d2 = sel[1].cote;
    const S = 1 / d1 + 1 / d2;
    if (S >= 1) return echec("avec ces codes, ces 2 issues ne permettent pas de récupérer la mise. Somme = " + S.toFixed(3) + " (doit être inférieure à 1).");

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
    const resultats = [
        { key: "fav", label: noms().f + " gagne" },
        { key: "nul", label: "Match nul" },
        { key: "out", label: noms().o + " gagne" }
    ];

    let best = null;
    for (let i = 0; i <= 300 && !best; i++) {
        const amp = currentVariation * (1 - i / 300);
        const m1 = r2((R / d1) * (1 + rnd(-amp, amp)));
        const m2 = r2((R / d2) * (1 + rnd(-amp, amp)));
        const tot = m1 + m2;
        const lignes = resultats.map(r => {
            let recu = 0;
            if (sel[0].couvre.includes(r.key)) recu += m1 * d1;
            if (sel[1].couvre.includes(r.key)) recu += m2 * d2;
            return { label: r.label, recu, net: recu - tot };
        });
        const gmin = Math.min(...lignes.map(l => l.net));
        if (gmin > 0 && gmin >= gainBas - 1e-9) best = { m1, m2, tot, lignes, gmin };
    }
    if (!best) return echec("pas de gain garanti avec cette variation, essaie une variation plus petite.");

    const rapport = [
        "REGIS-BET - RAPPORT",
        "",
        "MISES",
        sel[0].label + " (code " + d1.toFixed(2) + ") : " + fcfa(best.m1),
        sel[1].label + " (code " + d2.toFixed(2) + ") : " + fcfa(best.m2),
        "Total misé : " + fcfa(best.tot),
        "",
        "RÉSULTATS"
    ];
    best.lignes.forEach(l => rapport.push(l.label + " : reçu " + fcfa(l.recu) + " | gain " + signe(l.net)));
    rapport.push("", "Gain minimum garanti : " + signe(best.gmin));
    recap = rapport.join("\n");

    afficher(
        '<div class="result ok">' +
        '<div class="gain-label">Gain minimum garanti</div>' +
        '<div class="gain-value">' + signe(best.gmin) + '</div>' +
        '<div class="section-t">Mises</div>' +
        '<div class="row"><div><div>' + sel[0].label + '</div><div class="sub">code ' + d1.toFixed(2) + '</div></div><div class="amount">' + fcfa(best.m1) + '</div></div>' +
        '<div class="row"><div><div>' + sel[1].label + '</div><div class="sub">code ' + d2.toFixed(2) + '</div></div><div class="amount">' + fcfa(best.m2) + '</div></div>' +
        '<div class="row total"><div>Total misé</div><div class="amount">' + fcfa(best.tot) + '</div></div>' +
        '<div class="section-t">Si le résultat est…</div>' +
        best.lignes.map(l =>
            '<div class="row"><div><div>' + l.label + '</div><div class="sub">tu reçois ' + fcfa(l.recu) + '</div></div><div class="amount" style="color:var(--ok)">' + signe(l.net) + '</div></div>'
        ).join("") +
        '<button class="btn btn-copy" onclick="copierRecap(this)">Copier le rapport</button>' +
        '</div>'
    );
}

function copierRecap(btn) {
    if (!recap) return;
    const ok = () => {
        const old = btn.textContent;
        btn.textContent = "Copié ✓";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 1500);
    };
    const fb = () => {
        const ta = document.createElement("textarea");
        ta.value = recap; ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); ok(); } catch (e) { alert("Copie impossible."); }
        document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(recap).then(ok).catch(fb);
    else fb();
}
