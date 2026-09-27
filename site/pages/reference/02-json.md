---
title: JSON scenario
order: 2
---

# JSON scenario (format 2)

This reference is generated from the authoring schema at `schema/scenario-v2.schema.json`. The component additionally validates references between objects, channels, addresses, and behavior ports. See [error codes](errors.html).

## Root

{{json:root}}

## Line

{{json:line}}

## Room

{{json:room}}

See the [HVAC guide](../guide/hvac.html) for the thermal model and examples.

## Group address

{{json:groupAddress}}

## Device

{{json:device}}

Behavior-specific parameters appear in the [behavior reference](behaviors.html).

## Communication object

{{json:object}}

## Button

{{json:button}}

A button action (`press`, `short`, or `long`) names an object and gives it a number or `"toggle"`, for example `{ "object": "key1", "value": 1 }`.

## Numeric or digital input

{{json:input}}

## Channel

{{json:channel}}

## Equipment

{{json:equipment}}
