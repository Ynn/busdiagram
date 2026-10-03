---
title: Alarmes intrusion et incendie
summary: "Mémoriser les alarmes intrusion et incendie jusqu'à leur réinitialisation ; faire clignoter un éclairage ou le forcer en marche."
covers: "Module d'alarme · déclencheur, alarme mémorisée, réinitialisation · intrusion et incendie sur un actionneur"
translationOf: examples/09-alarms.md
sourceHash: f09a879fa418
order: 9.65
---
# Alarmes intrusion et incendie

Le module d'alarme mémorise les alarmes d'une zone. L'interface de boutons-poussoirs tient lieu de contact de porte (entrée 1), de détecteur de fumée (entrée 2) et de touches de réinitialisation (entrées 3 et 4).

- Maintenez **Porte** : l'alarme intrusion est déclenchée et mémorisée. L'éclairage du hall clignote et ignore **Éclairage du hall** ; la sirène, commutée par l'alarme intrusion mémorisée, sonne au plus 3 minutes ; l'éclairage du bureau n'est pas concerné.
- Relâchez **Porte** : l'alarme reste mémorisée. Appuyez sur **Réinitialiser l'intrusion** : l'alarme prend fin, et l'éclairage du hall prend la dernière commande reçue pendant l'alarme.
- Maintenez **Fumée** : l'alarme incendie force les deux éclairages en marche, sans clignotement, même pendant que l'alarme intrusion fait clignoter l'éclairage du hall : l'incendie est prioritaire. **Réinitialiser l'incendie** est refusé tant que **Fumée** est maintenu : le journal explique pourquoi.

```knx
scenario: alarms
```
