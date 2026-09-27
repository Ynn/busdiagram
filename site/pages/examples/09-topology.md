---
title: Full topology
group: Systems and mechanisms
summary: "Two areas coupled by KNXnet/IP routers, with line couplers, a line extension, and a supervisor."
covers: "Filtering · routing counter · KNXnet/IP"
order: 9
---

# Full topology

Two areas connect through an IP network. KNXnet/IP routers 1.0.0 and 2.0.0 act as area couplers; the installation also contains four lines, a switchable line extension, and an IP supervisor. Compare a local Key 3 command from 1.1.10, which is filtered by the line coupler, with a shutter command on 2/1/1, which crosses the IP network. Follow the routing counter as it changes from 6 to 1. Switch the extension to segment-coupler mode and inspect each coupler's filter table.

```knx
scenario: full-topology
```
