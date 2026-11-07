const SECRET = "reg@@s";

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
        alert("Vous ne pouvez choisir que 2 conditions maximum.");
    }
}

function toggleInputs() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    document.getElementById("input-total").style.display = (mode === "total") ? "block" : "none";
    document.getElementById("input-gain").style.display = (mode === "gain") ? "block" : "none";
}

function calculer() {
    const chkForte = document.getElementById("chk-forte").checked;
    const chkFaible = document.getElementById("chk-faible").checked;
    const chkNul = document.getElementById("chk-nul").checked;

    const coteForte = parseFloat(document.getElementById("cote-forte").value);
    const coteFaible = parseFloat(document.getElementById("cote-faible").value);
    const coteNul = parseFloat(document.getElementById("cote-nul").value);

    let selected = [];
    if (chkForte) selected.push({ name: "Victoire Forte", cote: coteForte });
    if (chkFaible) selected.push({ name: "Victoire Faible", cote: coteFaible });
    if (chkNul) selected.push({ name: "Match Nul", cote: coteNul });

    if (selected.length !== 2) { alert("Veuillez cocher exactement 2 conditions."); return; }
    if (selected.some(c => isNaN(c.cote) || c.cote <= 1)) { alert("Veuillez entrer des cotes valides (supérieures à 1)."); return; }

    const c1 = selected[0].cote;
    const c2 = selected[1].cote;
    const marge = (1 / c1) + (1 / c2);

    if (marge >= 1) {
        document.getElementById("resultats").style.display = "block";
        document.getElementById("resultat-contenu").innerHTML = `
            <p class="danger"><strong>Impossible de garantir un gain !</strong></p>
            <p>La somme des probabilités (${marge.toFixed(4)}) est supérieure ou égale à 1.</p>
            <p>Les cotes ne permettent pas une répartition gagnante.</p>
        `;
        return;
    }

    const variation = parseFloat(document.querySelector('input[name="variation"]:checked').value);
    const mode = document.querySelector('input[name="mode"]:checked').value;
    let montantTotal, gainCible;

    if (mode === "total") {
        montantTotal = parseFloat(document.getElementById("montant-total").value);
        if (isNaN(montantTotal) || montantTotal <= 0) { alert("Montant total invalide."); return; }
    } else {
        const gainMin = parseFloat(document.getElementById("gain-min").value);
        const gainMax = parseFloat(document.getElementById("gain-max").value);
        if (isNaN(gainMin) || isNaN(gainMax) || gainMin <= 0 || gainMax < gainMin) { alert("Gains min/max invalides."); return; }
        gainCible = (gainMin + gainMax) / 2;
        montantTotal = gainCible * marge; 
    }

    let mise1 = (montantTotal * c2) / (c1 + c2);
    let mise2 = (montantTotal * c1) / (c1 + c2);

    if (variation > 0) {
        const bruit1 = 1 + (Math.random() * 2 - 1) * variation;
        const bruit2 = 1 + (Math.random() * 2 - 1) * variation;
        mise1 *= bruit1;
        mise2 *= bruit2;
    }

    mise1 = Math.round(mise1 * 100) / 100;
    mise2 = Math.round(mise2 * 100) / 100;
    const totalMise = mise1 + mise2;
    const gain1 = (mise1 * c1) - totalMise;
    const gain2 = (mise2 * c2) - totalMise;

    document.getElementById("resultats").style.display = "block";
    document.getElementById("resultat-contenu").innerHTML = `
        <div class="res-line"><span>Mise totale</span><span>${totalMise.toFixed(2)} FCFA</span></div>
        <div class="res-line"><span>Mise sur ${selected[0].name} (Cote ${c1})</span><span class="highlight">${mise1.toFixed(2)} FCFA</span></div>
        <div class="res-line"><span>Mise sur ${selected[1].name} (Cote ${c2})</span><span class="highlight">${mise2.toFixed(2)} FCFA</span></div>
        <div class="res-line"><span>Gain si ${selected[0].name}</span><span class="highlight">+${gain1.toFixed(2)} FCFA</span></div>
        <div class="res-line"><span>Gain si ${selected[1].name}</span><span class="highlight">+${gain2.toFixed(2)} FCFA</span></div>
        <div class="res-line"><span>Marge de sécurité</span><span>${((1 - marge) * 100).toFixed(2)}%</span></div>
    `;
}
