---
title: Générateur de prompt
translationOf: guide/07-prompt-generator.md
sourceHash: "a88fcd0aee8b"
order: 7.9
scripts: assets/llm-reference.js, assets/prompt-generator.js
---
# Générateur de prompt

Cette page prépare une requête complète pour un modèle de langage : votre description de l'installation, les règles du format de scénario, les catalogues des comportements et des DPT, et en option un exemple de départ. Collez le texte généré dans l'assistant de votre choix, puis collez sa réponse ci-dessous pour la vérifier. Rien n'est envoyé depuis cette page ; tout s'exécute dans le navigateur. Voir [générer avec un modèle de langage](language-models.html) pour la méthode et ses limites.

<div id="pg" class="pg">

## 1. Décrire l'installation

<div class="pg-field"><label for="pg-description">Installation</label>
<textarea id="pg-description" rows="7" placeholder="Exemple : une ligne 1.1 nommée Bureau. Un bouton-poussoir à quatre touches (1.1.1) : les touches 1 et 2 commutent les plafonniers L1 et L2 ; les touches 3 et 4 montent et descendent le volet (un appui long déplace, un appui court arrête). Un actionneur de commutation à quatre sorties (1.1.2) avec retour d'état et un actionneur de volets (1.1.3) avec retour de position."></textarea></div>

<div class="pg-row">
<div class="pg-field"><label for="pg-example">Partir d'un exemple</label>
<select id="pg-example"><option value="">Aucun</option></select></div>
<div class="pg-field"><label for="pg-names">Textes affichés</label>
<select id="pg-names">
<option value="en">Anglais</option>
<option value="fr" selected>Français</option>
<option value="same">Langue de la requête</option>
</select></div>
<div class="pg-check"><input type="checkbox" id="pg-catalogs" checked><label for="pg-catalogs">Inclure les catalogues des comportements, des équipements et des DPT</label></div>
</div>

## 2. Copier la requête

<div class="pg-field"><label for="pg-prompt">Requête générée</label>
<textarea id="pg-prompt" class="pg-out" rows="12" readonly></textarea></div>
<div class="pg-actions"><button type="button" class="pg-btn primary" id="pg-copy" data-label="Copier la requête">Copier la requête</button> <span id="pg-size" class="pg-size"></span></div>

## 3. Vérifier la réponse

<div class="pg-field"><label for="pg-answer">Réponse du modèle (JSON, avec ou sans bloc de code)</label>
<textarea id="pg-answer" rows="8" spellcheck="false"></textarea></div>
<div class="pg-actions"><button type="button" class="pg-btn" id="pg-check">Vérifier</button> <a id="pg-open" class="pg-btn" hidden target="_blank" rel="noopener">Ouvrir dans le designer</a></div>
<div id="pg-result" class="pg-result" aria-live="polite"></div>
<div id="pg-correction-box" hidden>
<div class="pg-field"><label for="pg-correction">Requête de correction</label>
<textarea id="pg-correction" class="pg-out" rows="6" readonly></textarea></div>
<div class="pg-actions"><button type="button" class="pg-btn" id="pg-copy-correction" data-label="Copier la requête de correction">Copier la requête de correction</button></div>
</div>

</div>

Répétez les étapes 2 et 3 avec la requête de correction jusqu'à ce que le scénario soit valide, puis ouvrez-le dans le designer pour examiner le schéma. La validation confirme que le scénario est cohérent ; elle ne confirme pas qu'il correspond à l'installation voulue.
