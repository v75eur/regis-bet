const SECRET = "reg@@s";
let currentMode = "total";
let currentVariation = 0;

function checkPassword() {
    const pwd = document.getElementById("password-input").value;
    if (pwd === SECRET) {
        document.getElementById("login-screen").classList.remove("active");
        document.getElementById("main-screen").classList.add("active");
    } else {
        document.getElementById("error-msg").textContent = "Mot de passe incorrect.";
    }
}

function limitCheckboxes(selectedId) {
    const chks = ['chk-forte', 'chk-faible', 'chk-nul'];
    let count = chks.filter(id => document.getElementById(id).checked).length;
    if (count > 2) {
        document.getElementById(selectedId).checked = false;
        alert("Choisissez 2 conditions maximum.");
    }
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById("btn-mode-total").classList.toggle("active", mode === "total");
    document.getElementById("btn-mode-gain").classList.toggle("active", mode === "gain");
    document.getElementById("input-total").style.display = (mode === "total") ? "block" : "none";
    document.getElementById("input-gain").style.display = (mode === "gain") ? "block" : "none";
}

function setVariation(val, btn) {
    currentVariation = val;
    document.querySelectorAll(".variation-switch button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

function calculer() {
    const chkForte = document.getElementById("chk-forte").checked;
    const chkFaible = document.getElementById("chk-faible").checked;
    const chkNul = document.getElementById("chk-nul").checked;

    const coteForte = parseFloat(document.getElementById("cote-forte").value);
    const coteFaible = parseFloat(document.getElementById("cote-faible").value);
    const coteNul = parseFloat(document.getElementById("cote-nul").value);

    let selected = [];
    if (chkForte) selected.push({ name: "Forte", cote: coteForte });
    if (chkFaible) selected.push({ name: "Faible", cote: coteFaible });
    if (chkNul) selected.push({ name: "Nul", cote: coteNul });

    const resDiv = document.getElementById("resultats");
    const resContent = document.getElementById("resultat-contenu");
    
    resDiv.style.display = "none"; // On cache avant de calculer

    if (selected.length !== 2) { alert("Cochez exactement 2 conditions."); return; }
    if (selected.some(c => isNaN(c.cote) || c.cote <= 1)) { alert("Entrez des cotes valides (> 1)."); return; }

    const c1 = selected[0].cote;
    const c2 = selected[1].cote;
    const marge = (1 / c1) + (1 / c2);

    if (marge >= 1) {
        resDiv.style.display = "block";
        resContent.innerHTML = `<p class="danger"><strong>Impossible de garantir un gain !</strong><br>Marge bookmaker trop élevée (${(marge*100).toFixed(1)}%).</p>`;
        return;
    }

    let montantTotal;
    if (currentMode === "total") {
        montantTotal = parseFloat(document.getElementById("montant-total").value);
        if (isNaN(montantTotal) || montantTotal <= 0) { alert("Montant invalide."); return; }
    } else {
        const gainMin = parseFloat(document.getElementById("gain-min").value);
        const gainMax = parseFloat(document.getElementById("gain-max").value);
        if (isNaN(gainMin) || isNaN(gainMax) || gainMin <= 0 || gainMax < gainMin) { alert("Gains invalides."); return; }
        const gainCible = (gainMin + gainMax) / 2;
        montantTotal = gainCible * marge;
    }

    let mise1 = (montantTotal * c2) / (c1 + c2);
    let mise2 = (montantTotal * c1) / (c1 + c2);

    if (currentVariation > 0) {
        mise1 *= (1 + (Math.random() * 2 - 1) * currentVariation);
        mise2 *= (1 + (Math.random() * 2 - 1) * currentVariation);
    }

    mise1 = Math.round(mise1 * 100) / 100;
    mise2 = Math.round(mise2 * 100) / 100;
    const totalMise = mise1 + mise2;
    const gain1 = (mise1 * c1) - totalMise;
    const gain2 = (mise2 * c2) - totalMise;

    resDiv.style.display = "block";
    resContent.innerHTML = `
        <div class="res-line"><span>Total misé</span><span>${totalMise.toFixed(2)} F</span></div>
        <div class="res-line"><span>Mise sur ${selected[0].name} (${c1})</span><span class="highlight">${mise1.toFixed(2)} F</span></div>
        <div class="res-line"><span>Mise sur ${selected[1].name} (${c2})</span><span class="highlight">${mise2.toFixed(2)} F</span></div>
        <div class="res-line"><span>Gain net si ${selected[0].name}</span><span class="highlight">+${gain1.toFixed(2)} F</span></div>
        <div class="res-line"><span>Gain net si ${selected[1].name}</span><span class="highlight">+${gain2.toFixed(2)} F</span></div>
    `;
}
