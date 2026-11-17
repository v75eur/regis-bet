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

/* cote d'une issue double = 1 / (1/p + 1/q) */
const dc = (p, q) => (isNaN(p) || isNaN(q) || p <= 1 || q <= 1) ? NaN : 1 / (1 / p + 1 / q);

function lireCotes() {
    return { fav: num("cote-fav"), nul: num("cote-nul"), out: num("cote-out") };
}

function labelResultat(key) {
    const { f, o } = noms();
    if (key === "fav") return f + " gagne";
    if (key === "out") return o + " gagne";
    return "Match nul";
}

function issues() {
    const { f, o } = noms();
    const c = lireCotes();
    return {
        fn: { label: f + " ou nul",  cote: dc(c.fav, c.nul), couvre: ["fav", "nul"], reste: "out" },
        fo: { label: f + " ou " + o, cote: dc(c.fav, c.out), couvre: ["fav", "out"], reste: "nul" },
        no: { label: "Nul ou " + o,  cote: dc(c.nul, c.out), couvre: ["nul", "out"], reste: "fav" }
    };
}

function majIssues() {
    const is = issues();
    ["fn", "fo", "no"].forEach(k => {
        $("lbl-" + k).textContent = is[k].label;
        $("d-" + k).textContent = isNaN(is[k].cote) ? "-" : "cote " + is[k].cote.toFixed(2);
    });
}
document.addEventListener("input", (e) => {
    if (["team-fav", "team-out", "cote-fav", "cote-nul", "cote-out"].includes(e.target.id)) majIssues();
});

function choisir(k) {
    choix = k;
    ["fn", "fo", "no"].forEach(key => $("issue-" + key).classList.toggle("selected", key === k));
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
    const c = lireCotes();
    if ([c.fav, c.nul, c.out].some(v => isNaN(v) || v <= 1)) return echec("entre les 3 cotes (favori, nul, faible), supérieures à 1.");

    const is = issues();
    const issue = is[choix];
    const sel = [
        { label: issue.label, cote: issue.cote, couvre: issue.couvre },
        { label: labelResultat(issue.reste), cote: c[issue.reste], couvre: [issue.reste] }
    ];

    const d1 = sel[0].cote, d2 = sel[1].cote;
    const S = 1 / d1 + 1 / d2;
    if (S >= 1) {
        return echec("avec ces cotes, le total 1÷cote favori + 1÷cote nul + 1÷cote faible = " + S.toFixed(3) + ". Il doit être inférieur à 1 pour gagner à coup sûr. Là tu perds environ " + ((1 - 1 / S) * 100).toFixed(1) + " % de ta mise. Ne mise pas.");
    }

    const mm = miseMin(sel, d1, d2);
    if (!mm) return echec("les cotes sont trop proches : il faudrait miser plus de 1 000 000 F. Ne mise pas.");

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

    const rapport = ["REGIS-BET - RAPPORT", ""];
    if (faible) rapport.push(alerte, "");
    rapport.push(
        "MISES",
        "Compte 1 - " + sel[0].label + " (cote " + d1.toFixed(2) + ") : " + fcfa(best.m1),
        "Compte 2 - " + sel[1].label + " (cote " + d2.toFixed(2) + ") : " + fcfa(best.m2),
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
        '<div class="row"><div><div>Compte 1 : ' + sel[0].label + '</div><div class="sub">cote ' + d1.toFixed(2) + '</div></div><div class="amount">' + fcfa(best.m1) + '</div></div>' +
        '<div class="row"><div><div>Compte 2 : ' + sel[1].label + '</div><div class="sub">cote ' + d2.toFixed(2) + '</div></div><div class="amount">' + fcfa(best.m2) + '</div></div>' +
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
