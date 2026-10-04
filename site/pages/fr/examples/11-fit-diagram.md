---
title: Ajuster le schéma
summary: "Garder un grand schéma dans un cadre fixe."
covers: "fit=\"contain\""
translationOf: examples/11-fit-diagram.md
sourceHash: "3d9c7f79e7fc"
order: 11
---
# Ajuster le schéma

Avec `fit="contain"`, tout le schéma se met à l'échelle de la hauteur fixe de 460 px du composant. C'est utile pour les diapositives. Sans cette option, un grand schéma défile horizontalement pour que ses libellés restent lisibles.

```knx
scenario: full-topology
attrs: fit="contain" toolbar="compact" monitor="false" description="false"
style: height:460px
```
