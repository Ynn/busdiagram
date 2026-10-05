---
title: Scènes avec apprentissage
group: Installations
summary: "Cinq touches : L1, L2 et le volet à la main ; deux touches de scène qui rappellent par appui court et mémorisent par appui long (DPT 18.001)."
covers: "DPT 18.001 bit d'apprentissage · objets scène central et par sortie · retour d'état"
order: 4.5
translationOf: examples/04-scene-learning.md
sourceHash: "90c07bb8e5c1"
---

# Scènes avec apprentissage

L'interface de boutons-poussoirs a cinq touches. Les touches 1 à 3 commandent L1, L2 et le volet à la main. Les touches 4 et 5 sont des touches de scène : un appui court rappelle la scène 1 ou 2, un appui long la mémorise. Elles envoient un télégramme de commande de scène (DPT 18.001) sur 3/0/1 : le numéro de scène moins un, plus 128 pour mémoriser.

| Touche | Fonction de l'entrée | Adresse envoyée | Reçue par |
| --- | --- | --- | --- |
| L1 | Commutation (télérupteur), écoute l'état 1/1/1 | 1/0/1 | Sortie L1 |
| L2 | Commutation (télérupteur), écoute l'état 1/1/2 | 1/0/2 | Sortie L2 |
| Volet | Store sur une touche : appui long pour déplacer, appui court pour arrêter | 2/0/1, 2/0/2 | Sortie du volet |
| Scène 1 | Scène 1, mémorisation par appui long, objet DPT 18.001 | 3/0/1 | Objet scène central de l'actionneur de commutation, objet scène de la sortie du volet |
| Scène 2 | Scène 2, mémorisation par appui long, objet DPT 18.001 | 3/0/1 | Idem |

Chaque sortie affecte les scènes 1 et 2 sur sa page **Scènes**, avec la mémorisation autorisée ; une sortie n'apprend que les scènes qui lui sont affectées.

Essayez cette séquence :

1. Appuyez sur **Scène 1** : L1 et L2 s'allument et le volet s'ouvre, comme configuré.
2. Modifiez la pièce à la main : éteignez L1 avec la touche 1, descendez le volet par un appui long sur la touche 3, et arrêtez-le à mi-course par un appui court.
3. Maintenez **Scène 1** : chaque sortie mémorise son état actuel comme valeur de la scène 1. Le journal indique « scène 1 mémorisée » pour L1, L2 et le volet.
4. Appuyez sur **Scène 2**, puis de nouveau sur **Scène 1** : L1 reste éteinte, L2 s'allume, et le volet revient à la position mémorisée.

Deux façons de recevoir les scènes sont montrées :

- L'actionneur de commutation a un **objet scène central** pour ses deux sorties : une seule association à 3/0/1, et chaque sortie prend l'état de sa propre affectation.
- L'actionneur de volets a un **objet scène sur sa sortie**. Avec plusieurs sorties, chacune peut écouter sa propre adresse de scène, ou ne participer à aucune scène.

Les touches de L1 et L2 écoutent aussi le retour d'état de leur sortie (1/1/1 et 1/1/2). Sans lui, après qu'une scène a allumé L1, l'appui suivant sur la touche 1 renverrait 1 au lieu de l'éteindre.

Dans le designer, la page **Scènes** d'une sortie présente ses affectations de scène sous forme de tableau : si la sortie participe à une scène, le numéro de scène, et l'état, le niveau ou la position qu'elle prend. Une scène mémorisée remplace la valeur configurée jusqu'au redémarrage de la simulation.

```knx
scenario: scene-learning
```
