---
title: Versions et publications
translationOf: guide/11-versions.md
sourceHash: "d1bbfc673c02"
order: 11.5
---
# Versions et publications

BusDiagram suit le [versionnage sémantique](https://semver.org/lang/fr/). Un numéro de version `MAJEUR.MINEUR.CORRECTIF` indique ce qu'une mise à jour peut changer pour les pages qui utilisent déjà la bibliothèque. Les changements de chaque version sont listés dans `CHANGELOG.md`.

## Trouver la version

- Dans une page : `BusDiagram.version`, par exemple `"{{version}}"`.
- Dans un fichier : la première ligne de `bus-diagram.js` et de `bus-diagram.esm.js` est une bannière comme `/*! BusDiagram v{{version}} | AGPL-3.0-only … */`. Les pages autonomes exportées par le designer intègrent la bibliothèque avec cette bannière.
- Dans la documentation : le pied de chaque page indique la version qu'elle décrit. La documentation, le designer et le lecteur publiés correspondent toujours à la dernière version publiée.

## Ce que couvre la version

L'interface publique est ce que documente la [référence](../reference/index.html) :

- les fonctions globales `BusDiagram` et l'élément `<bus-diagram>` : attributs, propriétés, méthodes et événements `bd-*` ;
- le format de scénario (`formatVersion` 2) et son schéma JSON ;
- les identifiants des comportements et des équipements, leurs ports, paramètres et états initiaux ;
- les contrats d'extension : `registerBehavior`, `registerEquipment`, `registerEquipmentView` et `registerMessages`.

La structure interne du composant (shadow DOM, classes CSS), le dessin exact et les messages du journal des événements ne font pas partie de l'interface publique ; ils peuvent changer dans n'importe quelle version.

| Changement | À partir de 1.0.0 | Avant 1.0.0 |
| --- | --- | --- |
| Changement incompatible de l'interface publique | Nouvelle version majeure (2.0.0) | Nouvelle version mineure (0.2.0) |
| Nouvelle fonction compatible, comme un champ, un port ou un comportement facultatif | Nouvelle version mineure (1.1.0) | Nouvelle version mineure (0.2.0) |
| Correction sans changement d'interface | Nouvelle version corrective (1.0.1) | Nouvelle version corrective (0.1.1) |

Les identifiants des comportements portent leur propre version (`switchActuator/v1`). Un changement incompatible d'un comportement introduit un nouvel identifiant (`switchActuator/v2`) au lieu de changer le sens d'un identifiant existant. Le format de scénario a son propre numéro (`formatVersion`, actuellement 2), indépendant de la version de la bibliothèque ; chaque scénario le déclare.

## Figer une version

Une page doit charger une version connue de la bibliothèque :

- **Fichier hébergé chez vous :** gardez `bus-diagram.js` à côté de vos pages et remplacez-le volontairement lors d'une mise à jour. Consultez sa bannière pour savoir de quelle version il s'agit.
- **CDN :** utilisez une URL qui contient le numéro de version complet. Une URL sans version, une plage de versions comme `@0` ou `@0.1`, ou une étiquette mouvante comme `latest` peut changer le comportement d'une page existante à la publication d'une nouvelle version. Pour la version {{version}} :

    ```html
    {{cdn-tag}}
    ```

  L'attribut `integrity` contient l'empreinte SHA-384 du fichier publié (Subresource Integrity). Gardez-le en copiant la balise ; en changeant de version, prenez la nouvelle balise sur la [page d'installation](installation.html) ou dans le designer, car l'empreinte diffère pour chaque version.
- **Page autonome :** une page exportée par le designer intègre la bibliothèque. Elle garde sa version et fonctionne hors ligne.
- **Code du designer :** **Exporter → Code à coller dans une page** charge depuis le CDN la version du designer qui l'a produit, avec son empreinte d'intégrité. Un schéma conçu aujourd'hui continue de fonctionner avec la bibliothèque avec laquelle il a été vérifié. Un build de développement du designer (construit depuis les sources, non publié) n'a pas de fichier publié à lui : son code charge la dernière version publiée, enregistrée avec son empreinte dans `site/release.json`, tandis que son aperçu et ses pages autonomes utilisent la bibliothèque avec laquelle il a été construit.

Avant une mise à jour qui change de version majeure (ou de version mineure avant 1.0.0), lisez la section correspondante de `CHANGELOG.md` et validez vos scénarios avec le [designer](../designer/index.html) ou `npm run validate`.
