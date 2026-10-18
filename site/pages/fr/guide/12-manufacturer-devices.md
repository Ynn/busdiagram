---
title: Écrire un participant de fabricant
translationOf: guide/12-manufacturer-devices.md
sourceHash: "660eccbcde35"
order: 12.5
---

# Écrire un participant de fabricant

Un participant de fabricant est simulé comme ETS voit le vrai : il a le programme d'application du catalogue du fabricant, ETS le télécharge, et la simulation exécute ce que sa mémoire contient alors. BusDiagram ne livre aucun participant de ce genre. Il livre le toolkit pour les écrire, et le designer les importe depuis un **paquet de participants** (`.bdpkg`, voir [extensions](extensions.html#deliver-manufacturers-devices-in-a-package)).

Ce guide en écrit un, pas à pas, avec les produits d'un fabricant imaginaire, **Example Electric** (code fabricant FEh), qu'utilisent les tests de BusDiagram : `tests/knx/fixtures/sample-devices`. Son **SA 2** est un actionneur de commutation à deux sorties sur un BCU1 (masque 0012h), programme `M-00FE_A-0001-10`. Sa base de produit est écrite à la main : le dossier ne contient aucune donnée de fabricant.

Un participant a quatre parties :

| Partie | Ce que c'est | D'où elle vient |
| --- | --- | --- |
| Base de produit | Ce qu'ETS montre, et ce que les paramètres et les tables occupent en mémoire | Générée depuis le catalogue du fabricant |
| Modèle | L'identité du produit, ses canaux, ses objets de groupe | Écrit d'après la base et le manuel du produit |
| Firmware | Ce que fait le participant de sa mémoire et de ses objets | Écrit d'après le manuel du produit |
| Paquet | Les modèles compilés en un script, les bases, des exemples | Construit par l'auteur du paquet |

Le catalogue et le manuel appartiennent au fabricant : gardez les paquets que vous en faites, et leurs sources, hors des dépôts publics, sauf accord du fabricant.

## Ce qu'il faut

- Le **catalogue de produits** du fabricant (`.knxprod`), tel qu'ETS l'importe, et le manuel du produit.
- **ETS**, pour comparer les pages, télécharger le participant et vérifier ce qu'il fait (voir [relier à ETS](ets.html)).
- Un clone de **BusDiagram** à côté du dossier du paquet, avec Node.js : les tests du paquet s'exécutent sur ses sources.

## Choisir le programme et son masque

Dans le catalogue, un produit exécute un programme d'application (`ApplicationProgram`), nommé `M-<fabricant>_A-<numéro>-<version>-<hash>`. Le toolkit exécute les programmes de trois familles de masques (son `MaskVersion`) :

| Masque | Famille | Comment ETS le télécharge |
| --- | --- | --- |
| 0010h–0012h | BCU1 | Écritures en mémoire, chacune vérifiée par une lecture |
| 0700h–0705h | BIM M112 (System 7) | Machines d'état de chargement, après vérification de l'identifiant d'application |
| 07B0h | System B | Machines d'état de chargement ; le participant place lui-même des segments relatifs |

Les programmes KNX Secure ne sont pas simulés. Un programme partagé par une gamme (plusieurs produits, un paramètre pour le type de module) se génère pour un produit à la fois, avec les valeurs que ce produit fixe.

## Générer la base de produit

Depuis le clone de BusDiagram, avec l'identifiant du programme dans le catalogue :

```sh
npm run product -- <catalogue.knxprod> M-00FE_A-0001-10-0000 ../mon-paquet/src/sa-2/database.json
```

Un programme partagé par une gamme prend en dernier argument les valeurs que le produit fixe, par référence de paramètre : `'{"P-57_R-57":"8"}'`. Seules leurs branches sont gardées.

La base garde ce qu'ETS montre et ce que contient la mémoire, sans le code de l'application :

- les segments de mémoire, avec les octets de leur image par défaut dont le participant a besoin ;
- les types de paramètres, les paramètres et leur place en mémoire (`memory` : segment, décalage, décalage de bits), leurs références (`parameterRefs`, avec leur ordre d'affichage) ;
- le dialogue des paramètres (`dynamic`) : pages, branches, séparateurs, dans l'ordre d'ETS ;
- les objets de groupe et leurs références, les tables (adresses, associations, objets) ;
- les calculs par lesquels ETS règle des paramètres cachés, et les textes dans toutes les langues du catalogue ;
- pour un programme converti depuis ETS3 (`preEts4Style`), la règle que suit ETS pour ses pages : chaque paramètre sur la page que donne son ordre d'affichage.

Le designer en tire les pages d'ETS, et calcule la mémoire qu'écrit un téléchargement complet.

## Trouver où sont les paramètres

Le firmware lit ses paramètres dans la mémoire, là où ETS les écrit. Un paramètre de la base dit où :

```json
{
  "id": "P-1",
  "text": "Contact",
  "type": "PT-Contact",
  "value": "0",
  "memory": { "segment": "AS-0100", "offset": 100, "bitOffset": 0 }
}
```

Le segment `AS-0100` commence à 100h : le paramètre est à 100h + 100 = 164h, son décalage de bits compté depuis le bit de poids fort, sur la taille de son type (1 bit pour `PT-Contact`). Pour le SA 2 :

| Paramètre | Adresse | Bits | Valeurs |
| --- | --- | --- | --- |
| Contact de la sortie A | 164h | décalage 0, 1 bit | 0 normalement ouvert, 1 normalement fermé |
| État au retour de la tension de A | 164h | décalage 6, 2 bits | 0 inchangé, 1 éteint, 2 allumé |
| Contact de la sortie B | 165h | décalage 0, 1 bit | comme A |
| État au retour de la tension de B | 165h | décalage 6, 2 bits | comme A |

Ses objets de groupe sont numérotés comme dans ETS : objet 0 pour la sortie A, objet 1 pour la sortie B, tous deux de commutation (DPT 1.001).

## Écrire le modèle

`defineProduct` fait du produit un participant de la simulation :

```ts
import { defineProduct } from "bus-diagram";
import type { ProductObject } from "bus-diagram";
import { sa2Firmware, OUTPUTS } from "./firmware";

export const sa2Model = defineProduct({
  id: "example/sa-2",
  behavior: "example.sa2/v1",
  kind: "switchActuator",
  manufacturer: "Example Electric",
  manufacturerId: 0xfe,
  // Ce que contient le participant livré : son code fabricant à 104h, qu'ETS vérifie.
  delivered: [[0x104, [0xfe]]],
  name: "SA 2",
  description: "Example Electric SA 2: switch actuator, 2 outputs.",
  programs: ["M-00FE_A-0001-10"],
  masks: [0x0012],
  // Où sont ses paramètres : les pages du designer règlent ces octets.
  parameterMemory: [[0x100 + 100, 2]],
  channels: OUTPUTS.map((c) => ({ id: c, label: c.toUpperCase() })),
  output: "switch",
  // Les objets de groupe de son application (fonction de la mémoire quand ils dépendent
  // de paramètres).
  objects: (): ProductObject[] =>
    OUTPUTS.map((ch, n) => ({ number: n, channel: ch, dpt: "1.001" })),
  firmware: sa2Firmware,
});
```

| Champ | Ce qu'il dit |
| --- | --- |
| `id`, `behavior` | Le produit dans sa gamme, et le comportement par lequel un scénario le nomme (`"example.sa2/v1"`) |
| `kind` | Comment le schéma le dessine : `switchActuator`, `shutterActuator`, `buttonInterface`… |
| `manufacturerId`, `delivered` | Ce qu'ETS lit avant de charger : le code fabricant, et ce que contient le participant livré |
| `programs`, `masks` | Les programmes qu'il exécute (sans leur hash) et les masques de son coupleur |
| `parameterMemory` | Les octets de ses paramètres (`[adresse, longueur]`) |
| `channels`, `output`, `contactInputs` | Son matériel : sorties qui pilotent des charges (`switch`, `motor`, `dimmer`…), ou entrées de contact pour des boutons-poussoirs raccordés |
| `objects(memory)` | Les objets de groupe de son application avec cette mémoire |
| `firmware` | Son application (section suivante) |

Un BIM M112 (070xh) dit aussi où son application a sa table des objets de groupe (`objectTable`), l'identifiant d'application avec lequel il est livré (`applicationId`, qu'ETS compare), et les propriétés qu'écrit son programme (`properties`). Le second produit du dossier, **BE 1**, une interface de boutons-poussoirs sur un BIM M112, les montre.

Le libellé d'un canal le nomme dans l'arbre des pages du designer : un canal libellé `A`, `C1` ou `Output 1` reçoit ses charges avec les pages ETS dont le titre le nomme.

## Écrire le firmware

Le firmware est fait des hooks d'un comportement (`createState`, `onInit`, `onObjectWrite`…, voir [extensions](extensions.html#register-a-behavior)). Il lit ses paramètres dans la mémoire du participant chaque fois qu'il s'en sert, plutôt qu'une seule fois : un téléchargement depuis ETS change cette mémoire, puis le participant redémarre et son hook `onInit` s'exécute à nouveau.

```ts
import { bits, objectId } from "bus-diagram";
import type { BehaviorContext, Firmware } from "bus-diagram";

export const OUTPUTS = ["a", "b"] as const;
interface State {
  on: Record<string, boolean>;
}

// Les paramètres d'une sortie, dans son octet (164h pour A, 165h pour B).
const parametersOf = (ctx: BehaviorContext<State>, n: number) => ({
  normallyClosed: bits(ctx, 0x164 + n, 0, 1) === 1,
  recovery: bits(ctx, 0x164 + n, 6, 2),
});

// Le relais d'une sortie : un contact normalement fermé laisse passer le courant quand
// le relais est relâché.
const relay = (ctx: BehaviorContext<State>, n: number) => {
  const ch = OUTPUTS[n]!;
  ctx.setOutput(ch, {
    type: "switch",
    on: ctx.state.on[ch] !== parametersOf(ctx, n).normallyClosed,
  });
};

export const sa2Firmware: Firmware<State> = {
  createState: () => ({ on: { a: false, b: false } }),
  // Au démarrage, et après un téléchargement : l'état au retour de la tension.
  onInit(ctx) {
    OUTPUTS.forEach((ch, n) => {
      const { recovery } = parametersOf(ctx, n);
      if (recovery === 1 || recovery === 2) ctx.state.on[ch] = recovery === 2;
      relay(ctx, n);
    });
  },
  // Un télégramme sur l'objet d'une sortie.
  onObjectWrite(ctx, e) {
    const n = OUTPUTS.findIndex((_, i) => e.objectId === objectId(i));
    if (n < 0) return;
    ctx.state.on[OUTPUTS[n]!] = e.newValue !== 0;
    relay(ctx, n);
  },
  channelState: (s, ch) => ({ on: s.on[ch] ?? false }),
};
```

Les helpers du toolkit :

| Helper | Ce qu'il fait |
| --- | --- |
| `bits(ctx, adresse, décalage, nombre)` | Des bits de la mémoire, poids fort en premier |
| `readUnsigned(memoryOf(ctx), adresse, octets, littleEndian)` | Une valeur de plusieurs octets, dans l'ordre des octets du programme |
| `objectId(n)`, `numberOf(id)` | L'identifiant de l'objet de groupe `n` dans le scénario (`"o0"`), et l'inverse |
| `send(ctx, n, valeur)` | Écrit l'objet `n` et le transmet ; rien quand l'application ne l'a pas activé |
| `valueOf(ctx, n)` | La valeur de l'objet `n`, ou null |

Un firmware n'exécute que ce que contient sa mémoire : un participant qui contient un autre programme, ou un téléchargement interrompu, n'exécute rien, et le journal dit quel programme il a reçu.

## Dire ce qui n'est pas simulé

Un produit fait plus que ce que simule son firmware. `limits` le dit, pour que le designer marque les paramètres qui activent ces fonctions et les liste sur une page **Limites de la simulation** :

```ts
limits: [
  {
    text: "Delay before switching on is not simulated.",
    parameters: ["P-9"],
  },
  {
    text: "Feedback object: only on change, not cyclically.",
    partial: true,
    parameters: ["P-10"],
    values: ["1"],
  },
],
```

`parameters` nomme des paramètres de la base (quelle que soit leur référence), et `values` les valeurs qui activent la fonction (par défaut, toutes sauf celle du programme).

## Textes et langues

Les textes de la base (pages, paramètres, objets de groupe) viennent avec leurs traductions du catalogue. Ceux du modèle (description, libellés des canaux, limites) s'écrivent en anglais, et se traduisent par des messages qu'apporte le modèle :

```ts
export const sa2 = {
  ...sa2Model,
  messages: {
    fr: {
      "Example Electric SA 2: switch actuator, 2 outputs.":
        "Example Electric SA 2 : actionneur de commutation, 2 sorties.",
    },
  },
};
```

## Construire le paquet

Le script du paquet enregistre les modèles auprès de la bibliothèque de la page, `window.BusDiagram`. Compilez-le en script classique (IIFE) où `bus-diagram` est ce global, par exemple avec Vite :

```js
// vite.config.js du paquet
export default {
  build: {
    lib: { entry: "src/devices.ts", name: "Devices", formats: ["iife"] },
    rollupOptions: {
      external: ["bus-diagram"],
      output: { globals: { "bus-diagram": "BusDiagram" } },
    },
  },
};
```

Son premier module vérifie le contrat avec BusDiagram, avant que les modèles soient définis :

```ts
import * as BusDiagram from "bus-diagram";
import { sa2 } from "./sa-2/model";

// Un BusDiagram d'un contrat plus ancien ne peut pas exécuter ces participants.
if (!((BusDiagram.PACKAGE_API ?? 0) >= 1))
  throw new Error("these devices need BusDiagram 0.8 or later");

BusDiagram.registerParticipant(sa2);
```

Le paquet est un zip de ce script, des bases et d'un manifeste :

```json
{
  "format": "bdpkg/1",
  "name": "example-devices",
  "version": "1.0.0",
  "busdiagram": "0.8.0",
  "api": 1,
  "products": [
    {
      "behavior": "example.sa2/v1",
      "manufacturer": "Example Electric",
      "name": "SA 2",
      "database": "databases/example.sa2-v1.json"
    }
  ],
  "scenarios": []
}
```

Le [guide des extensions](extensions.html#deliver-manufacturers-devices-in-a-package) liste tous les fichiers d'un paquet : un script par produit, pour qu'une page exportée n'embarque que les produits qu'utilise son scénario, et des exemples proposés avec les modèles.

## Le tester

Les tests d'un paquet s'exécutent sur les sources du clone de BusDiagram placé à côté. Dans Vitest, `bus-diagram` est son entry point sans DOM, et ses sources s'atteignent par un alias :

```ts
// vitest.config.ts du paquet
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const busdiagram = resolve(import.meta.dirname, "../busdiagram");
export default defineConfig({
  resolve: {
    alias: [
      { find: /^bus-diagram$/, replacement: resolve(busdiagram, "src/core.ts") },
      { find: /^@busdiagram\/(.*)$/, replacement: `${busdiagram}/$1` },
    ],
  },
  test: { environment: "node", setupFiles: ["tests/setup.ts"] },
});
```

Un setup (`setupFiles`) enregistre les modèles et installe les bases, comme le fait l'import du paquet ; un test insère ensuite le produit comme le designer, règle ses paramètres ETS, et lance la simulation :

```ts
import { createSimulator, registerParticipant } from "bus-diagram";
import { captureRegistry } from "@busdiagram/src/knx/registry";
import { installPackage } from "@busdiagram/site/designer/packages";
import {
  addProductDevice,
  setEtsParameter,
} from "@busdiagram/site/designer/ets-device";
import { programOfProduct } from "@busdiagram/site/designer/manufacturers";
import { expect, it } from "vitest";
import { sa2 } from "../src/sa-2/model";
import database from "../src/sa-2/database.json";

registerParticipant(sa2);
installPackage({
  manifest: { format: "bdpkg/1", name: "example-devices", version: "test", products: [] },
  script: "",
  databases: new Map([["example.sa2/v1", database]]),
  scenarios: [],
});

it("a normally closed output is on while its object is off", () => {
  const doc = {
    formatVersion: 2,
    lines: [{ address: "1.1", powerSupply: { currentMa: 640 } }],
    devices: [],
    groupAddresses: [],
  };
  const id = addProductDevice(doc, "example.sa2/v1", captureRegistry(), "1.1");
  const app = programOfProduct("example.sa2/v1")!;
  setEtsParameter(doc, id, app, captureRegistry(), "P-1_R-1", "1");
  const sim = createSimulator(doc);
  sim.advance(100);
  expect(sim.output(id, "a")).toMatchObject({ on: true });
});
```

À tester pour chaque produit :

- chaque paramètre que lit le firmware, à sa valeur par défaut et aux autres ;
- les objets de groupe qu'active la mémoire, avec plusieurs configurations ;
- la mémoire relue après un téléchargement (`readBack`, dans `src/knxprod/readback.ts`) : les paramètres retrouvés réécrivent les mêmes octets ;
- un téléchargement enregistré depuis ETS, gardé comme fixture, rejoué.

## Le vérifier avec ETS

1. Construisez le paquet, et importez-le dans le designer (**Importer des participants…** du panneau Catalogue ; l'importer à nouveau le remplace).
2. Insérez le produit, et comparez ses pages à celles d'ETS pour le même produit, pris dans le catalogue du fabricant : mêmes pages, mêmes paramètres, même ordre.
3. Activez **Simuler la mise en service**, reliez le schéma à ETS, programmez l'adresse individuelle, puis téléchargez l'application (voir [relier à ETS](ets.html#downloading-an-application-from-ets)).
4. Changez des paramètres dans ETS, téléchargez à nouveau, et vérifiez ce que fait le participant dans le schéma ; le designer écrit alors dans le projet ce que contient la mémoire.
