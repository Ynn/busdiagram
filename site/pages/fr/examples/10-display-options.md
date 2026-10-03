---
title: Options d'affichage
summary: "Barre d'outils compacte, moniteur et description masqués, et simulation ralentie."
covers: "Attributs HTML"
translationOf: examples/10-display-options.md
sourceHash: a42ca952150e
order: 10
---
# Options d'affichage

Cette intégration utilise une barre d'outils compacte, masque le moniteur et la description, et ralentit la simulation. Ces réglages conviennent à une page qui apporte sa propre explication. Voir la [référence des options d'affichage](../reference/options.html).

```knx
scenario: status-feedback
attrs: toolbar="compact" monitor="false" description="false" speed="0.35"
```
