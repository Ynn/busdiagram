---
title: DPT
order: 5
---

# Supported DPTs

A telegram does **not** transmit its DPT. Each receiving object interprets the payload using its own DPT. Object state stores the decoded value: for DPT 5.001, an entered value of 50% encodes as byte `0x80` and decodes to about 50.196%. The diagram rounds it while the inspector shows more precision.

{{dpts}}

One- and two-bit values occupy the low bits of the APCI byte. One-byte values use an additional payload byte.
