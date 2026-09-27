---
title: Status feedback
group: Installations
summary: "Two toggle keys on the same output, with and without status feedback."
covers: "Toggle · status object · keys out of sync"
order: 2
---

# Status feedback

Key 1 and Key 3 toggle L1; Key 2 toggles the L1–L4 group. Key 1 listens only to 1/1/1. After Key 2 changes L1, Key 1 is out of sync and its next press may appear to do nothing. Key 3 also listens to status feedback on 1/4/1, so its state stays synchronized. Channel 2 listens to that feedback as well: a status message is an ordinary bus telegram that other objects can use.

```knx
scenario: status-feedback
```
