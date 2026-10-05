---
title: Designer
translationOf: guide/07-designer.md
sourceHash: "f2598a908079"
order: 7
---
# Designer

Le [designer](../designer/index.html) est l'outil principal pour rédiger des schémas. C'est une application web autonome qui fonctionne hors ligne. Les outils d'édition sont à gauche et un aperçu en direct à droite ; faites glisser le séparateur entre les deux (ou donnez-lui le focus et utilisez les flèches) pour répartir la largeur, et **Masquer l'aperçu** pour donner toute la fenêtre à l'éditeur. Le navigateur mémorise la disposition. Vous pouvez préparer un scénario sans écrire de JSON, modifier directement le JSON, et exporter le résultat pour une page ou une présentation.

Les deux modes d'édition travaillent sur le même scénario. Les changements faits dans les formulaires guidés mettent à jour le JSON ; les modifications valides du JSON mettent à jour les formulaires. Le navigateur enregistre le brouillon localement et le restaure à votre retour.

## Commencer un scénario

Partez d'une installation vide, de l'un des exemples interactifs ou d'un modèle d'appareil ou de topologie. Vous pouvez aussi ouvrir un fichier `.json` existant, ou suivre l'icône au bout de la barre d'outils de n'importe quel schéma, qui ouvre ce schéma ici.

## Éditeur guidé

L'éditeur guidé suit la logique de travail enseignée dans les formations KNX : des panneaux avec une arborescence et une liste, un catalogue, des adresses de groupe reliées aux objets de groupe par glisser-déposer. L'aperçu à droite montre aussitôt le résultat.

### Panneaux

Deux panneaux sont superposés. Le sélecteur de la barre de titre de chaque panneau choisit son contenu : **Topologie**, **Adresses de groupe**, **Bâtiment**, **Catalogue** ou **Installation** (titre, description, horloge simulée, et un bouton qui ouvre le panneau Bâtiment). **+ Panneau** ouvre le second panneau, et **×** le ferme. Chaque panneau a une arborescence à gauche et une liste à droite ; les onglets en bas de la liste changent son contenu. Faites glisser les séparateurs (ou donnez-leur le focus et utilisez les flèches) pour redimensionner l'arborescence, la liste et les deux panneaux ; le navigateur mémorise les tailles.

Dans l'arborescence Topologie, une ligne avec un répéteur de ligne ou un coupleur de segment montre ses deux segments, et chaque appareil se trouve dans son segment. Une ligne sans extension montre directement ses appareils. Les appareils sont repliés : ouvrez-en un (▸) pour afficher ses objets de groupe dans l'arborescence. Le champ **Filtrer** au-dessus de chaque arborescence garde les nœuds dont l'adresse ou le nom contient le texte, avec leurs parents.

L'arborescence Bâtiment liste les pièces, chacune avec les appareils qui y sont placés et les sorties qui la chauffent ou la refroidissent, puis les appareils sans sorties qui ne sont dans aucune pièce. Ici, la pièce n'est pas qu'un rangement : les thermostats, sondes de température et contacts de fenêtre peuvent lire la pièce où ils se trouvent (une marque sur leur icône ; un thermostat peut utiliser une température externe à la place), et les radiateurs et ventilo-convecteurs chauffent ou refroidissent la pièce de leur sortie. Un appareil à sorties n'est pas placé dans une pièce ; ses sorties de chauffage et de refroidissement le sont, chacune dans la pièce qu'elle chauffe.

| Sélection dans l'arborescence | Onglets de la liste |
| --- | --- |
| Topologie (racine) | Vue d'ensemble : réseau IP, ligne de zone, lignes principales, zones et lignes avec leurs appareils, coupleurs et tables de filtrage. |
| Zone | Lignes de la zone ; nom de la zone ; **Ajouter une ligne**. |
| Ligne | Appareils de la ligne ; nom, alimentation et extension de ligne. |
| Appareil | **Objets de groupe** (numéro, nom, canal, fonction de l'objet, adresses de groupe avec l'adresse d'émission marquée **S**, longueur, DPT, indicateurs C, R, W, T, U et I) et **Paramètres** (voir plus bas). |
| Objet de groupe | **Associations** (adresses de groupe de l'objet ; **Définir comme émission** ; **Supprimer** ; **Lier à…**) et **Propriétés** (nom, indicateurs, priorité, DPT). |
| Adresses de groupe (racine), groupe principal, groupe médian | Groupes principaux, groupes médians ou adresses, avec **Ajouter un groupe principal**, **Ajouter un groupe médian** et **Ajouter une adresse de groupe** ; nommez les groupes. |
| Adresse de groupe | **Associations** (objets liés à l'adresse, avec celui qui émet ; leurs indicateurs C, R, W, T, U et I se modifient ici ; **Lier à…**) et **Propriétés** (adresse, nom, DPT et édition groupée des objets liés). |
| Bâtiment (racine) | Pièces avec leurs températures et leur contenu ; **Ajouter une pièce**. |
| Pièce | Nom, températures au départ et extérieure, fenêtre ouverte au départ ; ses appareils et sorties, avec l'effet de la pièce sur chacun ; **Supprimer la pièce** (refusé tant qu'une sortie la chauffe ou la refroidit encore ; les appareils placés dans la pièce et les autres charges qui la nomment perdent ce lien). |
| Catalogue | Les types d'appareils que le simulateur modélise, par catégorie, avec leur application et leurs objets de groupe ; **Nombre** … **sur la ligne** … **Ajouter** insère des appareils. |

Sélectionner un appareil sur le schéma l'affiche dans le panneau Topologie.

**Numéros des objets de groupe.** Comme dans la table des objets d'un produit KNX, chaque entrée d'une interface de boutons-poussoirs et chaque sortie d'un actionneur a un bloc de numéros de taille fixe : un par fonction de l'entrée ou de la sortie, dans l'ordre des fonctions de l'appareil (sept par entrée d'une interface de boutons-poussoirs ; pour un actionneur de commutation : commutation, état, scène, forçage, verrouillage, logique, puissance, énergie). Les objets de l'appareil entier suivent les blocs. Une entrée ou une sortie garde donc ses numéros quand une autre gagne ou perd des objets, et les places inutilisées laissent des trous. Ajouter ou supprimer une entrée ou une sortie renumérote les blocs qui la suivent. Les modifications guidées gardent les objets du scénario, et les lignes du schéma, dans l'ordre de leurs numéros ; pour un scénario écrit à la main, **Ordonner les objets de groupe par numéro** dans le menu contextuel de l'appareil s'en charge.

Un clic droit sur un nœud de l'arborescence ou une ligne de liste (ou la touche de menu contextuel, ou Maj+F10 dans une arborescence) ouvre les commandes de cet élément ; un même élément a les mêmes commandes partout où il apparaît, et une ligne de liste propose aussi **Ouvrir**. Un clic droit sur la partie vide d'une liste ouvre les commandes de l'élément qu'elle montre. Les commandes comprennent : ajouter une zone, une ligne, ou des appareils du catalogue ; ajouter ou retirer une extension de ligne ; ouvrir les objets de groupe ou les paramètres d'un appareil ; **Lier à…** ; **Renommer** ; délier toutes les adresses d'un objet ; ajouter ou supprimer des groupes et des adresses ; supprimer l'élément ; ajouter une entrée du catalogue sur une ligne.

**Renommez** une zone, une ligne, un appareil, un objet de groupe, un groupe ou une adresse de groupe en double-cliquant sur son nom (dans une arborescence ou une liste), avec **F2** dans une arborescence, ou avec **Renommer** dans le menu contextuel. **Entrée** valide, **Échap** annule.

### Paramètres de l'appareil

L'onglet **Paramètres** est organisé comme le dialogue de paramètres d'un produit KNX : une arborescence de pages à gauche, la page choisie à droite avec un paramètre par ligne, le libellé à gauche et la valeur à droite. Une page de paramètres n'affiche jamais d'adresse de groupe : trois niveaux restent séparés.

La liste des pages et la page choisie défilent indépendamment. Choisir une autre page ou un autre appareil ouvre sa page en haut.

1. **Paramètres de l'appareil.** **Général** donne le nom, la ligne et l'adresse individuelle. **Configuration** fixe le nombre de sorties (ou d'entrées) et les liste dans un tableau avec leurs charges raccordées et les fonctions qu'elles activent. Une nouvelle sortie reprend la précédente : ses réglages, sa charge et ses objets de groupe activés, qui n'ont pas encore d'adresse de groupe. La page **Scènes** d'une sortie est un tableau d'affectations de scène, comme dans les paramètres d'un actionneur : par ligne, si la sortie participe à la scène, son numéro (1–64), et l'état, le niveau ou la position qu'elle prend. Elle reçoit les scènes par son propre objet scène, ou par l'objet scène central activé sur la page **Scènes** de l'appareil. Chaque type d'appareil organise ses paramètres par fonction : pour un actionneur de commutation, une page pour le comptage et le délestage, puis pour chaque sortie un groupe (**+** / **−**) avec **Fonction**, **Temporisations**, **Minuterie**, **Forçage et verrouillage**, **Liaison logique**, **Scènes**, **Tension du bus**, **Comptage** et **Charges raccordées**. Les réglages dépendants n'apparaissent que lorsqu'ils s'appliquent : les options de la minuterie une fois une durée réglée, la fin du forçage une fois l'objet de forçage activé.
2. **Objets de groupe activés par les paramètres.** **Activer l'objet de groupe « … »** crée l'objet, comme le paramètre correspondant d'un produit ; décocher la case supprime l'objet. Les objets activés apparaissent dans l'onglet **Objets de groupe**, où on les relie aux adresses de groupe (ou par glisser-déposer, ou depuis une adresse de groupe avec **Lier à…**).
3. **Charges câblées sur les sorties**, qui relèvent de la simulation et non de la configuration de l'appareil. Une sortie est un relais ou un canal de l'actionneur : elle a ses propres réglages et objets de groupe, et se commande seule. La page **Charges raccordées** d'une sortie liste les charges qui y sont câblées, en parallèle : la sortie les commute toutes ensemble, et un actionneur avec mesure mesure la somme de leurs puissances. **Raccorder une charge…** en ajoute une ; chaque charge a un type, un nom facultatif affiché sur le schéma, ses paramètres et, pour un radiateur, sa pièce chauffée. Une sortie de volet commande un seul moteur.

Un appareil dont les fonctions appartiennent à des canaux sans commander de charge, comme les circuits mesurés d'un compteur d'énergie, a la même page Configuration (nombre de canaux) et un groupe par canal, sans charges raccordées. Une interface de boutons-poussoirs compte des **entrées** : chaque entrée a ses pages **Fonction**, **Verrouillage**, **LED** et **Tension du bus et émission cyclique**, puis **Bouton-poussoir raccordé**, qui donne le texte écrit sur le bouton-poussoir câblé à l'entrée, dessiné sur sa touche (l'entrée garde son nom).

**Pages de l'installation.** Ce qui appartient à l'installation simulée autour d'un appareil, et non à ses paramètres, est affiché dans l'orange du câblage 230 V, avec une icône de prise, sous un séparateur **Installation** dans l'arborescence des pages : les **Charges raccordées** d'une sortie, le **Bouton-poussoir raccordé** d'une entrée, les **Saisies dans le schéma** d'un appareil. Tout le reste se règle comme dans le dialogue de paramètres du produit. La fonction choisie dans la page **Fonction** crée ses objets de groupe, comme dans le dialogue de paramètres d'un produit : la commutation donne un objet de commutation, la variation un objet de commutation et un objet de variation, un store un objet montée/descente et un objet arrêt/pas ; choisir une autre fonction les remplace, et un objet conservé d'une fonction à l'autre garde ses adresses. Les objets de verrouillage et de LED s'activent dans leurs pages.

**Saisies dans le schéma**, autre niveau de la simulation, liste les objets de l'appareil pour lesquels le lecteur peut saisir une valeur sur le schéma : les mesures d'une station météo ou d'un capteur de qualité de l'air, la puissance d'un circuit mesuré, une valeur d'une passerelle. Cochez **Saisie**, puis donnez le libellé, le minimum, le maximum et le pas du champ ; la valeur est écrite dans l'objet et envoyée sur son adresse de groupe : l'objet en a donc besoin d'une.

Un clic droit sur une sortie ou une touche, dans l'arborescence des pages ou dans le tableau Configuration, ouvre ses commandes : réglages, charges raccordées, renommer, copier les réglages vers d'autres sorties, ajouter, supprimer. Un clic droit sur une charge la monte ou la descend, ou la débranche.

**Tableaux.** Cliquez sur l'en-tête d'une colonne pour trier selon cette colonne (une deuxième fois pour l'ordre décroissant, une troisième pour l'ordre d'origine) ; faites glisser le bord droit d'un en-tête pour redimensionner la colonne, et double-cliquez sur ce bord pour revenir aux largeurs automatiques. Le navigateur mémorise les largeurs. Le tableau Objets de groupe montre le canal de chaque objet : la sortie d'un actionneur ou la touche d'un bouton-poussoir.

### Gestes de programmation

- **Ajouter un appareil :** faites glisser une entrée du catalogue sur une ligne de l'arborescence Topologie ou sur la liste des appareils d'une ligne, double-cliquez sur l'entrée, ou utilisez **Ajouter** en bas du panneau Catalogue. L'appareil reçoit la première adresse individuelle libre de la ligne.
- **Relier une adresse de groupe et un objet de groupe :** faites glisser l'adresse du panneau Adresses de groupe sur un objet de groupe (dans l'arborescence, ou sur une ligne de l'onglet Objets de groupe ou Associations), ou faites glisser l'objet de groupe sur l'adresse. Quand un panneau montre une adresse de groupe, un objet de groupe, un groupe médian ou une ligne, toute la liste de ce panneau accepte le dépôt : inutile de viser une ligne. La première adresse d'un objet est son adresse d'émission ; les suivantes sont seulement écoutées. **Définir comme émission**, dans l'onglet Associations de l'objet, change l'adresse d'émission.
- **Activer un objet de groupe :** dans la page Réglages d'une sortie, cochez **Activer l'objet de groupe « … »** (Forçage, Retour d'état, …). L'objet apparaît dans l'arborescence et dans l'onglet Objets de groupe sans adresse, prêt à être glissé sur une adresse de groupe ; retirer sa dernière adresse le laisse activé. Décochez la case pour supprimer l'objet.
- **Nouvelle adresse pour un objet :** faites glisser un objet de groupe sur un groupe médian : une adresse de groupe y est créée et reliée à l'objet.
- **Déplacer un appareil :** faites-le glisser sur une autre ligne ; il reçoit une adresse libre de cette ligne et garde ses objets et ses liaisons.
- **Placer un appareil dans une pièce :** faites-le glisser depuis le panneau Topologie ou l'arborescence Bâtiment sur une pièce, ou sur **Hors pièce** pour l'en retirer. Faites glisser une sortie de l'arborescence Bâtiment sur une autre pièce pour chauffer ou refroidir cette pièce.

Pendant un glisser, la barre d'état en bas explique le geste (« Lier à 1 : Touche 1 »). Seuls des objets et des adresses de même taille de données peuvent être reliés : une cible incompatible s'affiche en rouge et le dépôt est refusé. Chaque geste, et le bouton équivalent, est une étape de l'historique d'annulation.

Dans l'onglet **Propriétés** d'une adresse de groupe, l'éditeur des objets associés regroupe les objets par appareil et permet d'ajouter ou de retirer une adresse de plusieurs objets à la fois. Avant d'appliquer le changement, il liste les effets sur les adresses d'émission et les liaisons des objets. L'opération entière s'annule en une étape.

**À propos**, dans la barre de titre, donne la version, la licence et l'adresse du code source. BusDiagram est un projet pédagogique indépendant, non affilié à KNX Association ; KNX et ETS sont des marques de KNX Association.

### Validation et annulation

Le designer ne propose, autant que possible, que des choix compatibles : par exemple, les adresses de groupe et les objets doivent avoir des tailles de DPT compatibles. Les modifications invalides sont refusées avec une explication, et le scénario garde sa valeur valide précédente. Les modifications destructrices demandent une confirmation. Les modifications guidées et JSON partagent un même historique d'annulation.

Les erreurs de validation sont listées sous l'éditeur. Sélectionnez une erreur pour ouvrir l'appareil ou le champ concerné.

## Éditeur JSON

L'onglet JSON modifie le scénario complet. Il propose des modèles d'insertion, la mise en forme et la conversion au format 2. La complétion suggère les champs, les ports des comportements, les DPT, les adresses de groupe déclarées, et les objets et canaux existants à la position du curseur. Les erreurs sont mises en évidence sur place. Tant que le JSON est invalide, l'aperçu continue d'afficher le dernier scénario valide.

## Aperçu et export

L'onglet **Simulation**, à côté de **Guidé** et **JSON**, affiche le schéma seul sur toute la largeur de la fenêtre, avec son moniteur ; les autres onglets ramènent les éditeurs.

L'aperçu peut afficher une barre d'outils complète ou compacte, masquer le moniteur ou la description, et adapter le schéma à une diapositive 16:9. L'export utilise les options d'affichage choisies.

| Export | Usage |
| --- | --- |
| Code à coller dans une page | Intégrer le schéma dans du HTML, une sortie Markdown ou une diapositive reveal.js. Le code vient en deux parties, chacune avec son bouton **Copier** : la bibliothèque (et les extensions) à coller une fois par page, puis le schéma à coller à l'emplacement de chacun, si bien qu'une page à plusieurs schémas ne charge la bibliothèque qu'une fois. La bibliothèque est une version publiée sur un CDN, figée par son empreinte d'intégrité ; voir [versions](versions.html). Voir [Intégration](embedding.html). |
| Page autonome (.html) | Un seul fichier hors ligne contenant la bibliothèque, le scénario et les extensions chargées. |
| Fichier JSON | Enregistrer le scénario pour la gestion de versions ou le charger avec `src`. |
| Lien de lecture | Mettre un scénario compressé dans le fragment d'une URL pour une iframe ou une autre visionneuse web. Voir [Visionneuse](viewer.html). |
| Bibliothèque | Télécharger `bus-diagram.js` pour l'héberger à côté de votre page. |

Pour préparer une variante d'un exemple, comme une adresse changée, un indicateur retiré ou un coupleur réglé pour bloquer, partez de cet exemple dans **Partir d'un modèle**, modifiez-le, puis partagez-le en lien de visionneuse ou en page autonome. Chaque copie s'exécute avec son propre état.

## Extensions

Le gestionnaire d'extensions charge, remplace et retire des fichiers `.js`. Une extension peut ajouter un comportement, des champs de formulaire et une vue personnalisée. Le designer mémorise les extensions chargées dans le navigateur.

Une mise à jour n'est acceptée que si toutes les extensions chargées, dépendances comprises, peuvent encore se charger ensemble. Le designer les vérifie dans un environnement isolé équivalent à la page autonome exportée. Si une mise à jour échoue, les définitions existantes et les sources enregistrées restent en place. Les scripts d'extension s'exécutent dans leurs propres portées de fonction : ils peuvent réutiliser des noms de variables internes.

Les paramètres obligatoires et les états initiaux se saisissent avant l'ajout d'un nouvel appareil d'extension. L'éditeur distingue une valeur omise, une chaîne vide et `null` là où le schéma les permet.

Ne chargez que des scripts de confiance : une extension s'exécute comme une partie de la page. Les pages autonomes incluent les extensions chargées. Les codes à coller référencent des fichiers d'extension que vous devez héberger à côté de la page ; les liens de lecture ne transportent pas le code des extensions.

## Langues

Le menu des langues fait passer le designer et l'aperçu de l'anglais au français. Les pages exportées et les liens de lecture conservent la langue choisie. Les titres, noms et descriptions des scénarios restent le texte de leur auteur. Voir [Langues](languages.html).
