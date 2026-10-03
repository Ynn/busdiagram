---
title: Générer avec un modèle de langage
translationOf: guide/07-language-models.md
sourceHash: 0fce7ec27554
order: 7.8
---
# Générer des schémas avec un modèle de langage

Un scénario est un document JSON déclaratif : appareils, objets de communication, adresses de groupe et charges. La disposition découle des adresses : aucune coordonnée n'est nécessaire. Le format se prête donc à la génération par un modèle de langage à partir d'une description textuelle, à condition de valider le résultat avant de l'utiliser.

Le [générateur de prompt](prompt-generator.html) rassemble en une seule requête tout ce dont un modèle a besoin et vérifie sa réponse ; le reste de cette page explique la méthode.

## Ce qui est fourni

| Ressource | Rôle |
| --- | --- |
| [`llms.txt`](../llms.txt) | Référence de rédaction écrite pour les modèles de langage : règles de sortie, un exemple minimal complet et des catalogues générés des comportements, ports, paramètres, types d'équipements et DPT. Elle est reconstruite avec la bibliothèque et correspond donc toujours à la version publiée. |
| [`schema/scenario-v2.schema.json`](../schema/scenario-v2.schema.json) | Schéma JSON du format 2, pour les outils qui gèrent la sortie structurée ou la validation par schéma. |
| [`scenarios/`](../examples/index.html) | Scénarios d'exemple complets au format 2, utiles comme points de départ. |
| Validateur | Le [designer](designer.html) valide pendant la saisie. Avec une copie du projet, `npm run validate -- fichier.json` valide des fichiers en ligne de commande. |
| Liens `#json=` | `designer/index.html#json=…` et `player.html#json=…` ouvrent un scénario passé dans le lien, sans compression. |

Le schéma JSON vérifie la structure du document. Le validateur vérifie aussi des règles qu'un schéma ne peut pas exprimer, comme les ports acceptés par un comportement, la compatibilité des DPT sur une adresse de groupe, les adresses réservées et les références entre objets, touches et canaux. Utilisez toujours le validateur comme vérification finale.

## Démarche

1. Donnez au modèle le contenu de `llms.txt` et, si possible, le scénario d'exemple le plus proche. Le [générateur de prompt](prompt-generator.html) le fait pour vous.
2. Décrivez l'installation : lignes, appareils, ce que fait chaque touche et quels retours d'état sont attendus. Demandez un seul objet JSON au format 2.
3. Validez le résultat. Chaque problème est signalé avec un chemin JSON, un code et un message :

      ```text
      $ npm run validate -- office.json
      office.json: 2 problem(s)
        devices[1].objects[0].dpt [dpt] DPT 5.001 incompatible with port “switch” (expected: 1.001)
        devices[1].objects[0].dpt [association] 1/1/1 is associated with objects of different sizes: 5.001 here, groupAddresses (1.001) elsewhere
      ```

4. Renvoyez les problèmes signalés au modèle et demandez une version corrigée. Recommencez jusqu'à ce que le scénario soit valide.
5. Ouvrez le scénario dans le designer pour examiner le schéma et ajuster les noms et les choix liés à la disposition, comme l'ordre des appareils sur une ligne.

`npm run validate -- --json -` lit un scénario sur l'entrée standard et affiche un résultat JSON par fichier, ce qui convient aux boucles automatiques de génération et de validation. Le code de sortie vaut 1 quand un scénario est invalide.

## Exemple de requête

```text
En utilisant la référence BusDiagram ci-dessous, écris un scénario au format 2.
Installation : une ligne 1.1 nommée « Bureau ». Un bouton-poussoir à deux touches (1.1.1) :
la touche 1 allume et éteint le plafonnier, la touche 2 le fait varier par un appui long.
Un actionneur de variation (1.1.2) commande le plafonnier et renvoie son état
de commutation et son niveau. Nomme chaque adresse de groupe et donne-lui un DPT.
Réponds uniquement avec l'objet JSON.

<contenu de llms.txt>
```

## Ouvrir un scénario généré depuis un lien

Un lien peut porter le scénario directement dans le fragment après `#`, qui n'est pas envoyé au serveur :

```text
designer/index.html#json=%7B%22formatVersion%22%3A2%2C...%7D
player.html#json=%7B%22formatVersion%22%3A2%2C...%7D
```

Encodez tout le texte JSON en pourcentage, par exemple avec `encodeURIComponent(JSON.stringify(scenario))`. Le designer charge le texte même s'il est invalide et affiche les erreurs dans son éditeur JSON. Pour des liens partagés avec des lecteurs, préférez **Exporter → Lien de lecture** dans le designer, qui produit un lien compressé plus court.

## Limites

- La validation confirme qu'un scénario est cohérent, pas qu'il correspond à l'installation voulue. Vérifiez les adresses de groupe, les indicateurs et les fonctions des touches sur le schéma.
- Les modèles peuvent utiliser des comportements, des ports ou des DPT qui n'existent pas. Le validateur les signale ; ne contournez pas une erreur en supprimant l'objet concerné sans vérifier l'intention.
- Les longs scénarios peuvent dépasser la longueur pratique d'un lien. Enregistrez-les plutôt dans des fichiers et ouvrez-les dans le designer.
