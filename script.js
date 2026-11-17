const SECRET = "reg@@s";
let currentMode = "total";
let currentVariation = 0;
let choix = null;
let recap = "";

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat(String($(id).value).replace(/\s/g, "").replace(",", "."));
const rnd = (a, b) => Math.random() * (b - a) + a;
const r2 = (x) => Math.round(x * 100) / 100;
const fcfa = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " F";
const signe = (n) => (n >= 0 ? "+" : "") + fcfa(n);

const ISSUES = {
    fn: { couvre: ["fav", "nul"], reste: "out" },
    fo: { couvre: ["fav", "out"], reste: "nul" },
    no: { couvre: ["nul", "out"], reste: "fav" }
};

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

function labelIssue(k) {
    const { f, o } = noms();
    if (k === "fn") return f + " ou nul";
    if (k === "fo") return f + " ou " + o;
    return "Nul ou " + o;
}

function labelResultat(key) {
    const { f, o } = noms();
    if (key === "fav") return f + " gagne";
    if (key === "out") return o + " gagne";
    return "Match nul";
}

function majLabels() {
    ["fn", "fo", "no"].forEach(k => { $("lbl-" + k).textContent = labelIssue(k); });
    if (choix) {
        $("lbl-c1").textContent = "Code : " + labelIssue(choix);
        $("lbl-c2").textContent = "Code : " + labelResultat(ISSUES[choix].reste);
    } else {
        $("lbl-c1").textContent = "Issue choisie";
        $("lbl-c2").textContent = "Résultat restant";
    }
}
document.addEventListener("input", (e) => {
    if (["team-fav", "team-out"].includes(e.target.id)) majLabels();
});

function choisir(k) {
    choix = k;
    ["fn", "fo", "no"].forEach(key => $("issue-" + key).classList.toggle("selected", key === k));
    majLabels();
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

/* Montant total minimum (francs entiers) pour garder au moins +1 F sur les 3 résultats */
function miseMin(sel, d1, d2) {
    const S = 1 / d1 + 1 / d2;
    for (let T = 1; T <= 1000000; T++) {
        const R = T / S;
        const m1 = Math.round(R / d1), m2 = Math.round(R / d2);
        if (m1 < 1 || m2 < 1) continue;
        const tot = m1 + m2;
        const nets = ["fav", "nul", "out"].map(k => {
            let r = 0;
            if (sel[0].couvre.includes(k)) r += m1 * d1;
            if (sel[1].couvre.includes(k)) r += m2 * d2;
            return r - tot;
        });
        if (Math.min(...nets) >= 1) return tot;
    }
    return null;
}

function calculer() {
    if (!choix) return echec("choisis une issue (étape 2).");
    const d1 = num("code-1"), d2 = num("code-2");
    if (isNaN(d1) || isNaN(d2) || d1 <= 1 || d2 <= 1) return echec("entre les 2 codes (supérieurs à 1).");

    const reste = ISSUES[choix].reste;
    const sel = [
        { label: labelIssue(choix), cote: d1, couvre: ISSUES[choix].couvre },
        { label: labelResultat(reste), cote: d2, couvre: [reste] }
    ];

    const S = 1 / d1 + 1 / d2;
    if (S >= 1) {
        const perte = (1 - 1 / S) * 100;
        return echec("avec ces codes, aucun montant ne peut être gagnant : même en misant beaucoup, tu perds environ " + perte.toFixed(1) + " % de ta mise. Ne mise pas.");
    }

    const mm = miseMin(sel, d1, d2);
    if (!mm) return echec("les codes sont trop proches : il faudrait miser plus de 1 000 000 F. Ne mise pas.");

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

    let faible = false;
    if (T < mm) { T = mm; faible = true; gainBas = 0; }

    const R = T / S;
    const resultats = ["fav", "nul", "out"].map(k => ({ key: k, label: labelResultat(k) }));

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

    const mmTxt = "Mise minimum pour être gagnant : " + mm.toLocaleString("fr-FR") + " F (francs entiers)";
    const alerte = faible
        ? "⚠️ Répartition possible, mais ton montant est trop faible. Misez au minimum " + mm.toLocaleString("fr-FR") + " F. Le calcul ci-dessous est fait pour ce minimum."
        : "";

    const rapport = [
        "REGIS-BET - RAPPORT",
        ""
    ];
    if (faible) rapport.push(alerte, "");
    rapport.push(
        "MISES",
        sel[0].label + " (code " + d1.toFixed(2) + ") : " + fcfa(best.m1),
        sel[1].label + " (code " + d2.toFixed(2) + ") : " + fcfa(best.m2),
        "Total misé : " + fcfa(best.tot),
        "",
        "RÉSULTATS"
    );
    best.lignes.forEach(l => rapport.push(l.label + " : reçu " + fcfa(l.recu) + " | gain " + signe(l.net)));
    rapport.push("", "Gain minimum garanti : " + signe(best.gmin), mmTxt);
    recap = rapport.join("\n");

    afficher(
        '<div class="result ok">' +
        (alerte ? '<div class="fail-title" style="font-size:15px">' + alerte + '</div>' : '') +
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
        '<div class="section-t">' + mmTxt + '</div>' +
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
