---
title: Fit the diagram
group: Integration
summary: "Keep a large diagram inside a fixed frame."
covers: "fit=\"contain\""
order: 11
---

# Fit the diagram

With `fit="contain"`, the entire diagram scales to fit the component's fixed height of 460 px. This is useful for slides. Without it, a large diagram scrolls horizontally so its labels remain legible.

```knx
scenario: full-topology
attrs: fit="contain" toolbar="compact" monitor="false" description="false"
style: height:460px
```
