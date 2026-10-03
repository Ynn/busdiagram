---
title: Chauffage et refroidissement
summary: "Basculement automatique ou par objet d'un thermostat d'ambiance, vanne à changement de mode et ventilo-convecteurs."
covers: "DPT 1.100 · DPT 5.001 · ventilo-convecteur · 2 tubes et 4 tubes"
translationOf: examples/09-heating-cooling.md
sourceHash: 499910764015
order: 9.35
---
# Chauffage et refroidissement

Deux pièces en été : 27 °C à l'intérieur, 30 °C à l'extérieur. Chaque thermostat a une consigne de chauffage de 21 °C et une consigne de refroidissement de 24 °C ; la zone neutre se trouve entre les deux.

- **Bureau, basculement automatique.** Au-dessus de 24 °C, le thermostat refroidit :
  - sa grandeur de refroidissement (3/0/2) ouvre la vanne à changement de mode de l'actionneur ;
  - cette vanne alimente le ventilo-convecteur 2 tubes en eau froide ;
  - l'état 3/4/3 (DPT 1.100) vaut 0.

  Abaissez la température extérieure dans le panneau **Pièces** : la pièce traverse la zone neutre, puis sous 21 °C le thermostat chauffe, et le même ventilo-convecteur reçoit maintenant de l'eau chaude.
- **Salle de réunion, basculement par objet.** Le thermostat démarre en chauffage : aussi chaude que soit la pièce, il ne demande rien, et la pièce continue de se réchauffer. Appuyez sur **Saison** (☀❄) : la touche écrit 0 (refroidissement) sur 3/1/0, DPT 1.100, comme le ferait un commutateur central été/hiver. La grandeur de refroidissement ouvre alors la vanne de la batterie froide, et la vanne du radiateur reste fermée. Dans un bâtiment, cet objet vient d'un basculement central, ou de la production qui fournit de l'eau chaude ou froide.

Les grandeurs de chauffage et de refroidissement de chaque thermostat vont à des objets distincts de l'actionneur. Sur une vanne à changement de mode, l'actionneur suit la grandeur qui n'est pas nulle : le 0 envoyé sur l'autre grandeur quand le thermostat bascule ne ferme donc pas la vanne.

```knx
scenario: heating-cooling
```
