---
title: Extensions
translationOf: guide/12-extensions.md
sourceHash: 96e78eee9b86
order: 12
---
# Extensions

Une extension peut ajouter un comportement, un modèle d'équipement ou une vue sans modifier le fichier de la bibliothèque. Chargez son script après `bus-diagram.js`, puis utilisez l'identifiant enregistré dans un scénario. Voir l'[exemple complet](../examples/extension.html).

## Enregistrer un comportement

L'exemple [`site/samples/extensions/delayed-switch.ts`](../examples/extension.html) définit une commutation temporisée :

```ts
{{include:site/samples/extensions/delayed-switch.ts#behavior}}

registerBehavior("delayedSwitch/v1", delayedSwitch);
```

Un comportement peut mettre en œuvre ces points d'entrée :

| Point d'entrée | Appelé quand |
| --- | --- |
| `onInit(ctx)` | Un appareil est créé ; initialiser les sorties sans émettre. |
| `onInput(ctx, input)` | Une action locale `press`, `short`, `long`, `release` ou `value` se produit ; pour un comportement avec `contactInputs`, les fronts `down` et `up` de la touche d'un canal. |
| `onObjectWrite(ctx, event)` | Une écriture reçue est acceptée par un objet ayant l'indicateur W, même si la valeur n'a pas changé. |
| `onTimer(ctx, key, payload)` | Un événement programmé avec `ctx.schedule` arrive à échéance. |
| `onTick(ctx, dtMs)` | Le temps de simulation avance ; appelé toutes les 20 ms s'il est mis en œuvre. |
| `onRoomChange(ctx, room)` | La température ou l'état de la fenêtre de la pièce de l'appareil change. |
| `onClockChange(ctx)` | L'[horloge simulée](time.html#simulated-clock) est réglée sur une autre heure ; reprogrammer les échéances liées à l'horloge. |
| `onBusFailure(ctx)` | La tension bus du segment de l'appareil est coupée ; fixer les sorties, puis l'appareil s'arrête (ses temporisations sont annulées). |
| `onBusRecovery(ctx)` | La tension bus revient ; l'appareil redémarre avec son état. |
| `channelState(state, channel)` | L'état d'un canal est demandé par l'inspecteur ou par `getState()`. |
| `deviceState(state)` | L'état de l'appareil est demandé, comme l'afficheur d'un thermostat. |

Le contexte `ctx` expose `t` pour les messages traduits, `timeMs`, `device`, `state`, `getObject`, `setObject`, `transmit`, `setOutput`, `getOutput`, `readEquipment`, `readPower`, `readRoom`, `setOutsideTemperature`, `clock`, `schedule`, `cancel` et `note`. `setObject` change une valeur locale sans émettre. `transmit` vérifie l'indicateur T et l'adresse d'émission. `readEquipment(channel, index)` renvoie l'état d'une charge d'un canal : la première par défaut, ou une autre quand plusieurs charges sont câblées sur la sortie (`ctx.device.channels[i].loads` liste leurs types). `readPower` renvoie la puissance consommée par un canal, en W : la somme de celles de ses charges qui la modélisent. `clock()` renvoie l'horloge simulée (`nowMs`, `speed`), ou `null` s'il n'y en a pas ; divisez un délai d'horloge par `speed` pour le programmer en temps de simulation. `note` ajoute une explication au journal des événements.

Les modèles d'équipement peuvent définir `heatOutput(state, parameters)` pour chauffer ou refroidir une pièce et `checkParameters(parameters, t)` pour valider des paramètres liés. Une vue peut définir `interact(state, action, parameters, equipment)` pour répondre à une action de l'utilisateur. Utilisez le temps de simulation et `ctx.schedule` pour un comportement temporisé ; les minuteries du navigateur comme `setTimeout` ne suivent pas le temps de simulation.

Avec `contactInputs: true`, chaque canal d'un appareil est dessiné comme une touche qui signale ses fronts, et le comportement mesure les appuis avec `ctx.schedule` ; `contactKey(channel, objects)` peut choisir l'icône de la touche et l'objet affiché par sa LED. Un port avec `direction: "both"` émet et écoute : le designer active donc ses indicateurs W et T. `channelObjects: { parameter, values }` liste, pour chaque valeur d'un paramètre de canal, les ports (et DPT) des objets que le canal possède : le designer les crée et les supprime quand le paramètre change, comme le dialogue de paramètres d'un produit pour une fonction.

Un comportement peut vérifier sa propre configuration au chargement d'un scénario :

| Règle | Rôle |
| --- | --- |
| `validate(device, t)` | Renvoie des erreurs bloquantes `{ path, code, message }` ; le chemin est relatif à l'appareil (`channels[2].scenes.17`) et le scénario est refusé. |
| `normalize(device)` | Renvoie des données déduites de la configuration : `tableGroupAddresses`, adresses de groupe de l'appareil que les tables de filtrage des coupleurs gardent sans objet. |
| `warnings(device, t)` | Renvoie des avertissements de configuration `{ code, channelId?, message }` : la simulation fonctionne, et les avertissements s'affichent au-dessus du schéma. |

`presentation(device)` indique au schéma et au designer comment dessiner un appareil du comportement, d'après son `kind`, ses objets et ses canaux : `screen` (objets face à un écran en tête de la plaque), `supervisor` (valeurs écrites sous les noms des objets), `busInterface` (panneau qui écrit et lit n'importe quelle adresse de groupe), `remoteSystem` (le champ `system` de son état affiché à côté de son adresse), `receiver` (colonne des adresses de groupe à gauche ; par défaut pour un appareil avec des canaux et sans touches) et `metered` (canaux dont les charges affichent leur puissance mesurée).

L'appareil passé à ces règles est l'appareil normalisé, avec les paramètres de ses canaux et de leurs charges (`channels[i].equipmentConfigs`). Avec `representsAnyDpt: true`, les objets du comportement peuvent porter un DPT standard affiché mais non simulé, comme pour une visualisation.

Un port déclare ce que signifient ses objets ; un nom de port ne signifie rien par lui-même :

| Champ du port | Effet |
| --- | --- |
| `defaultFlags: { R, U }` | Indicateurs R et U de ses objets quand le scénario ne les écrit pas ; false sinon. Un objet d'état a généralement `R: true`, un afficheur `U: true`. |
| `telegram: "state"` | Ses télégrammes sont des comptes rendus d'état, présentés comme tels dans le moniteur ; `"command"` par défaut. |
| `drivesLoad: true` | Le schéma relie ses objets aux charges de leur canal, comme la commande d'une sortie. |
| `initialUnknown: true` | Ses objets démarrent avec une valeur inconnue jusqu'à ce qu'un télégramme en donne une, comme un afficheur. |
| `description` | Rôle du port, affiché dans la référence et le schéma. |

Une exception dans un comportement met en pause ce seul schéma et signale une `extension-error`. Une exception dans une vue remplace cette vue par un cadre d'erreur et signale `view-error` dans `getState()`.

### Vérification des définitions

`registerBehavior` valide les ports, les DPT pris en charge, les types de sortie et les valeurs par défaut des paramètres. Les schémas de paramètres utilisent un sous-ensemble plat de JSON Schema : propriétés scalaires `integer`, `number`, `boolean`, `string` et `null`, avec des bornes, `enum`, `enumTitles`, `default` et `description`. Les objets imbriqués et les tableaux ne sont pas pris en charge. Une définition enregistrée est copiée et figée.

### Libellés pour l'édition guidée

Des métadonnées facultatives rendent une extension utilisable dans le [designer guidé](designer.html) :

| Champ | Effet |
| --- | --- |
| `title` d'un paramètre | Libellé affiché à la place du nom de la propriété. |
| `unit: "ms"` ou `"%"` d'un paramètre | Afficher des secondes pour des valeurs en millisecondes, ou un signe pour cent. |
| `expert: true` d'un paramètre | Placer la commande dans les réglages avancés. |
| `enumTitles` d'un paramètre | Libellés des valeurs `enum`, dans le même ordre. |
| `nullTitle` d'un paramètre | Libellé de `null` ; sinon le designer affiche « aucun ». |
| `title` d'un port | Nom affiché pour l'objet de communication. |
| `direction: "in"` ou `"out"` d'un port | Choisir l'indicateur W ou T par défaut. |
| `title` d'un équipement | Nom de la charge raccordée. |

### Pages de paramètres

Le designer affiche les paramètres d'un appareil sous forme de pages, comme un dialogue de paramètres : les pages de l'appareil, puis un groupe de pages pour chaque canal. `parameterLayout` les déclare ; sans lui, le designer fait une page de paramètres de l'appareil et une page de réglages du canal. Tout paramètre ou port qu'aucune page ne nomme est quand même affiché, sur une page automatique.

```js
parameterLayout: {
  device: [
    { id: "general", title: "General", items: [
      { parameter: "delayMs" },
      { groupObject: "alarm" },
      { when: { groupObject: "alarm" }, items: [{ parameter: "alarmDelayMs" }] }
    ] }
  ],
  channel: [
    { id: "function", title: "Function", items: [
      { groupObject: "switch" },
      { parameter: "mode" },
      { when: { parameter: "mode", is: ["timed"] }, items: [{ parameter: "durationMs" }] },
      { heading: "Status" },
      { groupObject: "status" },
      { note: "The status follows the relay." }
    ] }
  ]
}
```

| Élément | Ligne |
| --- | --- |
| `{ parameter }` | Un paramètre de l'appareil (pages de l'appareil) ou du canal (pages du canal). |
| `{ initialState }` | Un état initial du canal (pages du canal). |
| `{ groupObject }` | La case qui active l'objet de groupe d'un port ; les adresses de groupe se relient dans l'onglet Objets de groupe, jamais sur une page de paramètres. |
| `{ heading }`, `{ note }` | Un titre, ou un encadré d'information. |
| `{ scenes: true }` | Les scènes d'un canal. |
| `{ when, items }` | Éléments affichés seulement quand un paramètre a (`is`) ou n'a pas (`not`) l'une des valeurs données, sa valeur par défaut comptant s'il est absent, ou quand l'objet de groupe d'un port est activé (`{ groupObject }`). |

`registerBehavior` vérifie les noms utilisés par les pages. Les titres, en-têtes et notes sont traduits comme les titres des paramètres.

Utilisez `ctx.t` pour les messages dans la langue choisie pour le schéma. Fournissez les traductions d'une extension avec `BusDiagram.registerMessages(language, messages)` ; voir [Langues](languages.html#messages-in-an-extension).

## Enregistrer une vue

```js
BusDiagram.registerEquipmentView("ledStrip", {
  size: { width: 84, height: 30 },
  render: ({ state, label, box }) => BusDiagram.html`
    <div style="position:absolute;left:${box.x}px;top:${box.y}px">${state.on ? "●" : "○"} ${label}</div>`,
});
```

Un scénario peut choisir cette vue avec `"equipment": { "type": "lamp", "view": "ledStrip" }`. Le modèle de lampe sous-jacent et son état `{ on }` restent les mêmes.

## Charger les scripts

```html
<script defer src="bus-diagram.js"></script>
<script defer src="extensions/delayed-switch.js"></script>
```

Les composants attendent le chargement de ces scripts. Les extensions partagent les définitions enregistrées par `BusDiagram` ; elles ne doivent pas compter sur les variables globales d'une autre extension. Le designer et l'export autonome enveloppent chaque extension dans sa propre portée de fonction. Pour charger des fichiers bruts avec `<script src>`, compilez chaque extension en IIFE pour éviter les collisions de noms globaux. `npm run build` compile `site/samples/extensions/*.ts` en scripts classiques.

## Livrer un participant avec la bibliothèque

Un participant livré avec BusDiagram vit dans son propre dossier, `src/participants/<nom>/`, et utilise le même contrat qu'une extension. Ses fichiers :

| Fichier | Contenu |
| --- | --- |
| `behavior.ts` | La définition du comportement : paramètres, ports et leur sens, état, réactions, présentation. |
| `layout.ts` | Ses pages de paramètres (`parameterLayout`). |
| `rules.ts` | Ses règles `validate`, `normalize` et `warnings`, s'il en a. |
| `messages.fr.ts` | Les traductions de ses textes (paramètres, pages, messages du journal) ; un fichier par langue. |
| `model.ts` | Son entrée du modèle : comportements et catalogues, `{ behaviors, messages }`. |
| `designer.ts` | Son entrée du designer : catégorie du catalogue, modèles, type affiché, catalogues du designer. |
| `designer.fr.ts` | Les traductions de ses textes du designer. |

Deux listes composent les participants livrés : `src/standard-model.ts` (entrées du modèle, installées par le registre) et `site/designer/standard-designer.ts` (entrées du designer). Ajouter un participant consiste à ajouter son dossier et une ligne à chaque liste ; le moteur, le schéma et le designer ne connaissent les participants que par ces déclarations. Le code partagé volontairement par plusieurs participants se trouve dans `src/participants/shared/`. Un équipement livré suit la même organisation dans `src/equipment/<nom>/` : `equipment.ts` (modèle physique), `size.ts` (taille de ses vues, lue par la disposition), `view.ts`, `messages.fr.ts` et `model.ts`, dont l'entrée donne aussi les tailles de ses vues (`viewSizes`).

Les tests vérifient cette organisation : un participant ne dépend ni du registre ni d'un autre participant, son entrée du modèle n'atteint jamais le designer, les modules partagés ne nomment aucun comportement, et ses textes sont dans ses propres catalogues.
