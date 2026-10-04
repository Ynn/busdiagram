---
title: Passerelle DALI
summary: "Une passerelle KNX/DALI traduit les télégrammes en commandes pour deux groupes DALI et signale les défauts de ballasts."
covers: "DPT 3.007 · groupes DALI · interrogation des défauts"
translationOf: examples/09-dali.md
sourceHash: "b00e6c2ebcb9"
order: 9.2
---
# Passerelle KNX/DALI

Une interface de boutons-poussoirs à quatre touches commande deux groupes DALI. Un appui court allume ou éteint un groupe ; un appui long envoie des commandes de variation relative DPT 3.007 jusqu'au relâchement. La passerelle traduit les télégrammes KNX en commandes DALI comme `RECALL MAX LEVEL`, `DAPC`, `UP`, `DOWN` et `OFF`. Utilisez le mode pas à pas pour suivre cette séquence. Les groupes sont déjà configurés : l'adressage et la mise en service de la ligne DALI ne sont pas simulés.

- Maintenez la touche 1 pour éclaircir le groupe du bureau (ballasts A0–A3). Les télégrammes d'état sur 1/5/1 renvoient le niveau obtenu.
- Cliquez sur un luminaire pour simuler un défaut de ballast. À sa prochaine interrogation, la passerelle signale un défaut de groupe sur 1/7/x et un défaut général sur 1/7/0.
- Utilisez le panneau de l'interface USB pour écrire l'adresse de groupe 1/1/0 ou lire les adresses d'état et de défaut. 1/1/0 est une adresse de groupe KNX ordinaire ; l'objet de la passerelle qui lui est associé envoie une commande de diffusion générale sur la ligne DALI. L'adresse de diffusion générale KNX est 0/0/0, qui n'est pas utilisée pour la communication de groupe.

```knx
scenario: dali-gateway
```
