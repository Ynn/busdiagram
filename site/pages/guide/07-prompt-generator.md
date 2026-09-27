---
title: Prompt generator
group: Tools
order: 7.9
scripts: assets/llm-reference.js, assets/prompt-generator.js
---

# Prompt generator

This page prepares a complete request for a language model: your description of the installation, the rules of the scenario format, the catalogs of behaviors and DPTs, and optionally an example to start from. Paste the generated text into the assistant of your choice, then paste its answer below to check it. Nothing is sent from this page; everything runs in the browser. See [generate with a language model](language-models.html) for the method and its limits.

<div id="pg" class="pg">

## 1. Describe the installation

<div class="pg-field"><label for="pg-description">Installation</label>
<textarea id="pg-description" rows="7" placeholder="Example: one line 1.1 named Office. A four-key push-button (1.1.1): keys 1 and 2 switch the ceiling lights L1 and L2; keys 3 and 4 raise and lower the shutter (long press moves, short press stops). A four-output switching actuator (1.1.2) with status feedback and a shutter actuator (1.1.3) with position feedback."></textarea></div>

<div class="pg-row">
<div class="pg-field"><label for="pg-example">Start from an example</label>
<select id="pg-example"><option value="">None</option></select></div>
<div class="pg-field"><label for="pg-names">Display text</label>
<select id="pg-names">
<option value="en">English</option>
<option value="fr">French</option>
<option value="same">Language of the request</option>
</select></div>
<div class="pg-check"><input type="checkbox" id="pg-catalogs" checked><label for="pg-catalogs">Include the catalogs of behaviors, equipment, and DPTs</label></div>
</div>

## 2. Copy the request

<div class="pg-field"><label for="pg-prompt">Generated request</label>
<textarea id="pg-prompt" class="pg-out" rows="12" readonly></textarea></div>
<div class="pg-actions"><button type="button" class="pg-btn primary" id="pg-copy" data-label="Copy the request">Copy the request</button> <span id="pg-size" class="pg-size"></span></div>

## 3. Check the answer

<div class="pg-field"><label for="pg-answer">Answer of the model (JSON, with or without a code block)</label>
<textarea id="pg-answer" rows="8" spellcheck="false"></textarea></div>
<div class="pg-actions"><button type="button" class="pg-btn" id="pg-check">Check</button> <a id="pg-open" class="pg-btn" hidden target="_blank" rel="noopener">Open in the designer</a></div>
<div id="pg-result" class="pg-result" aria-live="polite"></div>
<div id="pg-correction-box" hidden>
<div class="pg-field"><label for="pg-correction">Correction request</label>
<textarea id="pg-correction" class="pg-out" rows="6" readonly></textarea></div>
<div class="pg-actions"><button type="button" class="pg-btn" id="pg-copy-correction" data-label="Copy the correction request">Copy the correction request</button></div>
</div>

</div>

Repeat steps 2 and 3 with the correction request until the scenario is valid, then open it in the designer to review the diagram. Validation confirms that the scenario is consistent; it does not confirm that it matches the intended installation.
