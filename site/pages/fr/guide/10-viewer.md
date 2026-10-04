---
title: Page autonome et lien
translationOf: guide/10-viewer.md
sourceHash: "9eac7e1c2d2f"
order: 10
---
# Page autonome et lien de lecture

## Export autonome

La commande **Exporter → Page autonome (.html)** du designer crée un seul fichier HTML contenant la bibliothèque et le scénario. Ouvrez-le dans un navigateur, sans serveur ni connexion réseau.

## Lien de lecture et iframe

**Exporter → Lien de lecture** crée une URL comme celle-ci :

```text
https://example.org/docs/player.html#d=compressed-scenario
```

Le fragment après `#` contient le scénario compressé et les options d'affichage. Le serveur ne reçoit pas ce fragment. Le lien fonctionne partout où `player.html` est disponible, y compris sur un site de documentation publié. Le lecteur occupe toute la fenêtre et adapte le schéma à son cadre.

Pour intégrer le lecteur dans une autre page :

```html
<iframe src="https://example.org/docs/player.html#d=compressed-scenario" style="width:100%;aspect-ratio:16/9;border:0"></iframe>
```

Une forme non compressée, `player.html#json=<JSON encodé en pourcentage>`, est aussi acceptée ; elle est destinée aux liens produits par des scripts ou des [modèles de langage](language-models.html). Le designer accepte le même fragment `#json=`.

Le lecteur peut aussi charger un fichier JSON par HTTP : `player.html?src=scenarios/status-feedback.json`. Les scénarios d'exemple publiés se trouvent dans `docs/scenarios/`.
