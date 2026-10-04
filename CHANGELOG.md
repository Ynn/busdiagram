# Changelog

All notable changes to BusDiagram are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the library follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The versioning policy is described in the guide page “Versions and releases”.

## [Unreleased]

### Added

- Heating and cooling, following the KNX application descriptions of HVAC valve actuators and room controllers:
  - **Room thermostat, automatic change-over** (`changeover: "automatic"`). It cools above the cooling setpoint and heats below the heating setpoint. In the dead zone between them it keeps its mode; PI control keeps its integral term while the mode does not change, so a demand can persist past the setpoint, then decreases to 0, which is sent. By default (`"object"`), the `heatCool` object (DPT 1.100) still selects heating or cooling.
  - **Heating actuator, valve function per output** (`valveMode`): heating, cooling, or change-over, with the cooling control values `coolingValue` and `coolingSwitch`. A change-over valve on a 2-pipe system receives both control values of the thermostat and follows the one that is not zero.
  - **Fan coil load** (`fanCoil`): a 2-pipe change-over coil, or the heating or cooling coil of a 4-pipe unit, behind a thermoelectric valve, with a fan that runs while water flows (`fanPowerW`).
  - **Configuration warnings:** `config-valve-mode` for a control value that an output ignores, `config-emitter` for an emitter that does not suit its valve.
  - **New example:** “Heating and cooling”.
- Extensions: the `switch` output command can carry the water of a valve (`medium`: heating or cooling).
- Room thermostat, operating modes: 1-bit mode objects (`comfortMode`, `nightMode`, `protectionMode`) besides the 1-byte preselection, the one received last deciding (before any telegram, the 1-bit objects when one of them starts at 1); a forced mode (`forcedMode`, DPT 20.102) over every other input, the window included, until 0 (auto).
- Room thermostat: common control value of the active mode (`controlValue`, `controlSwitch`) for a 2-pipe system. Heating actuator: heating/cooling object on a change-over output (`heatCool`), which gives the water while the last control value received applies (until a telegram, the value it starts with, otherwise hot water); example “Heating and cooling” with a third room.
- Timeline (`timeline` option, hidden by default): up to four traces on the axis of simulated time, named `device/object`, `device:channel`, or `@room`. Object values and on/off states are drawn as steps, room temperatures, openings, and levels as curves, and the telegrams of a traced object as marks; every event is recorded at its own time, also in step mode. A menu adds or removes traces. The heating example uses it.
- Diagram: a click on a group address in a device (any of its addresses, also with the keyboard), or on the destination of the telegram card, outlines every object linked to it. A badge tells whether the object sends on it (C, T, sending address) or is written by it (C, W); Escape clears it.
- Telegram details: each coupler crossed shows why it forwarded or filtered the telegram (filter table, routing mode, routing counter, bus voltage).
- Switch actuator: release time of forcing (`forcedReleaseMs`). The forcing ends by itself that long after its last forcing telegram, as if a release telegram had arrived.

### Changed

- Read on initialisation (flag I): the objects also read their value when the simulation starts, as when a device starts again after a bus voltage failure.
- Radiator: it only heats; its `emitter` parameter is removed. Cooling uses a `fanCoil` load.
- Room thermostat: the dead zone between the heating and cooling setpoints (`deadZoneK`) is no longer an expert parameter.
- Telegram card: the **Details** button stands out from the octets (coloured, with a magnifier icon).
- Presence detector, slave: it has its own hold time (`holdMs`), restarted by each detection. It sends 1 at the first detection, then every `slaveCyclicMs` while its hold time runs, so the master switches off one hold time after the last 1. It used to send 1 once per detection.

### Fixed

- Designer: with **16:9 slide**, the diagram in the preview became a thin strip. The preview now lays the diagram out on a 1280 × 720 slide, scaled to the width of the preview, as it will look in a presentation.
- French documentation: in the side menu, **Tous les exemples** and **Vue d'ensemble** led to the English pages.
- French documentation: a page whose source hash has only digits was always marked as an outdated translation, the YAML front matter reading it as a number (or, for some hashes, as an octal or scientific number). The hashes are now written between quotes, by `npm run docs:translations -- --stamp` too.
- Room thermostat: a `heatCool` object without a value started at 0, which means cooling, so the thermostat started in cooling mode; it now starts in heating mode until the object receives a value.

## [0.4.0] - 2026-10-03

### Added

- Telegram details: the octets of the telegram card are clickable, and **Details** opens the frame in four views kept in step: the fields and the meaning of each bit of an octet, all the octets bit by bit, the TP1 signal (serial characters with start bit, data least significant first, even parity, and stop bit, logical bits, schematic bus voltage, time ruler, and the acknowledgement drawn for illustration), and the calculation of the check octet (odd parity in each column of bits, and the equivalent XOR then NOT). For a telegram that crosses couplers, the frame of each segment shows its routing counter and check octet.
- Diagram: an icon at the end of the toolbar (full or compact) opens the diagram in the designer, in a new tab, with its scenario compressed in the link after `#` (not sent to a server). The `designer` option (attribute `designer`) gives the address of the designer, the published one by default, or `none` to hide the icon; the diagrams of the documentation and the player open the designer of the site, which also works offline. The designer opens links `#d=…`, in the language of the diagram when no language was chosen before.
- DPT 2.008 (direction control) for the forcing object of shutter actuators, and DPT 1.022 (scene A/B) for the objects that recall stored positions, as in the KNX application description of shutter actuators; 2.001 and 1.001 remain accepted.
- Push-button interface: contact of the wired push-button (`keyContact` on the channel: normally open or closed) and contact expected by the input when actuated (`actuatedContact`), with a configuration warning when they disagree.
- Weather station: rain alarm with set and reset delays (`rainOnDelayMs`, `rainOffDelayMs`), frost alarm on the outdoor temperature (`frostThresholdC`, `frostHysteresisK`), and cyclic sending of the alarms (`alarmCyclicMs`) for the actuators that monitor them.
- Logic module: inversion of each input (`invertInput1` … `invertInput8`) and of the result (`invertOutput`: NAND, NOR, XNOR); polarity of the enable object (`enablePolarity`) and its state before a first telegram (`enableAtStart`).
- French documentation under `docs/fr/`, complete: guide, examples, and reference. The English pages remain the reference; each French page records the English version it translates (`translationOf`, `sourceHash`) and shows a notice when that page has changed since. A page not translated would open in English, marked “EN” in the navigation. A language link in the header switches between the versions of a page and keeps the section: a French page takes the anchors of its English page. The diagrams of the French pages show their texts in French, from the dictionary `site/i18n/fr/scenarios.json`, and the generated reference tables come from `site/i18n/fr/reference.json`; the prompt generator shows the examples under their French titles and gives them in French when the display text is to be French. `npm run docs:translations` lists the pages and dictionary entries to update.
- Loads: hot water cylinder (`waterHeater`: element with its own thermostat, standing losses, draw-off by a click), heat pump (`heatPump`: heats or cools its room, electrical power and coefficient of performance, minimum off time of the compressor), and alarm sounder (`siren`: ringing time limit). See the example “Heat pump and hot water”; the alarms example has a sounder.
- Alarm module `alarmModule/v1`: for each zone, an intrusion and a fire alarm set by a trigger, stored until a reset (DPT 1.015, added), which is refused while the trigger is still active; the alarms are kept through a bus voltage failure. See the example “Intrusion and fire alarms”.
- Switch actuator: intrusion and fire alarm objects; intrusion makes the output blink (`blinkMs`, at least 1 s), fire forces it on, with priority over intrusion, forcing, and the lock; `afterAlarm` sets the state when they end.
- Shutter actuator: rain and frost alarms besides wind, each with its reaction, an order of priority (`alarmPriority`), cyclic monitoring of the alarm objects (`alarmMonitoringMs`), and a reaction after the alarms; forcing (2.008 or 2.001); four stored positions recalled and stored by objects; upper and lower end-position objects. The order of the weather alarms, the lock, and forcing is configurable (`safetyPriority`; alarms, lock, forcing by default).
- Presence detector: lock object (`lock`), with the telegram sent when the lock starts and ends (`lockStart`, `lockEnd`: none, off, on).
- Weekly time switch: override until the next switching point, timed override (`overrideDurationMin`), and permanent override (program suspended).
- Room thermostat: presence button (`presenceType: "button"`): each 1 on the presence object extends the comfort mode for `comfortExtensionMs`.
- Room thermostat: sensor fault object and control value on sensor fault (`sensorFaultValuePct`).
- Shutter actuator: lock object per output (`lock`), with reactions when locked (`lockStart`: up, down, stop, or position `lockPositionPct`) and unlocked (`afterLock`: up, down, or back to the position before the lock); by default the weather alarms keep priority over the lock, and the lock over forcing (`safetyPriority`). Behavior on bus voltage failure (`busFailure`: stop, up, down) and recovery (`busRecovery`: none, up, down, position `busRecoveryPositionPct`), with the position sent again.
- Dimmer actuator and KNX/DALI gateway: behavior on bus voltage failure (`busFailure`: unchanged, off, fixed level `busFailureLevelPct`) and recovery (`busRecovery`: level before the failure, off, on), with the status sent again.
- Presence detector: master/slave operation. A slave detector (`slave: true`) sends 1 on each detection; the `slaveTrigger` object of the master counts it as its own detection, and the master keeps the hold time, the brightness threshold, and the final 0.
- Languages: a participant can bring texts in any language in its entries; the designer shows each language under its own name, including a language brought by an extension as soon as it is loaded.
- Designer: the pages that describe the installation simulated around a device (connected loads, wired push-button, inputs in the diagram) are set apart from its parameters: orange of the 230 V wiring, plug icon, and an **Installation** divider in the tree of pages. Example devices of the push-button interface are named “Push-button interface”.
- Designer: a **Simulation** tab shows the diagram alone over the whole width.
- Push-button interface: `ledShown` (off by default) gives a key its LED; `keyLabel` is the text written on the push-button wired to an input, drawn on its key, while the input keeps its name (`label`). In the designer, the text of the key is on its own **Wired push-button** page.
- Group object flags C (communication: off, the object neither sends nor handles messages) and I (read on initialisation: the object reads its value when its device starts again after a bus voltage failure), editable in the designer; transmission priority of each object (`priority`: low, normal, urgent), written in the control field of the frame.
- Configuration warning `config-no-power-supply`: a TP line or segment without a bus power supply. The examples declare their supplies, and the lines added in the designer get one.
- Designer: a link that puts DPTs of the same size but different meaning on one address (5.001 and 5.010) is pointed out at once.
- Configuration warning `config-value-range`: a value of a push-button interface input outside the range of its object's DPT.
- Diagram: a countdown on the load of an output shows a running staircase timer or a switch-on or switch-off delay: a clock, the state that will be reached (I or O), and the time left; the inspector shows the delay too.
- Push-button interface `buttonInterface/v1`: each channel is a contact input with a function (switching on edges or on short and long presses, one-key or two-key dimming, one-key or two-key blind, value, scene recall and storing); the diagram measures the long press against the long-press time of each input. Lock, bus voltage recovery reaction, cyclic sending, and LED per input. In the designer catalog, with pages per input; see the example “Push-button interface”.
- Bus voltage failure and recovery: a click on the power supply of a line or segment cuts or restores its bus voltage (`setBusVoltage()` in the API, `unpoweredSegments` in `getState()`). Devices run their failure and recovery behavior, then neither receive nor send; couplers do not forward telegrams to the segment. Behaviors can define `onBusFailure` and `onBusRecovery`.
- Switch actuator: lock object (`lockStart`, `afterLock`; forcing keeps priority), switch-on and switch-off delays (`onDelayMs`, `offDelayMs`), logic link (`logic` object, AND or OR), behavior on bus voltage failure and recovery (`busFailure`, `busRecovery`). See the example “Bus voltage failure”.
- DPT 18.001 (scene control): the switch, dimming, DALI and shutter actuators store their current state as a scene when they receive the learn bit (`sceneLearning`).
- Shutter actuator: by default, the motors stop when the bus voltage fails (see `busFailure` for the other reactions).
- Behavior definitions: `contactInputs` and `contactKey` for contact inputs, port direction `"both"`.
- Behavior definitions: `presentation(device)` declares how the diagram and the designer draw a device (`screen`, `supervisor`, `busInterface`, `remoteSystem`, `receiver`, `metered`).
- Behavior definitions: rules on their own configuration, `validate` (blocking errors), `normalize` (derived data, such as the group addresses kept by the filter tables) and `warnings` (configuration warnings); `representsAnyDpt` lets the objects of a behavior carry a DPT that is shown but not simulated. The rules of the delivered participants (DALI limits, addresses of the USB interface, valve, motor wiring, window contact, values of the push-button interface) use them.
- Designer: the guided editor follows the working logic taught in KNX courses:
  - two stacked panels, each showing the Topology, the Group addresses, the Catalog, or the Installation, with a tree on the left and a list with tabs at its bottom;
  - Topology tree of areas, lines, and devices, which open to show their group objects; a device has Group objects and Parameters tabs, a group object has Associations and Properties tabs;
  - Group addresses tree of main groups, middle groups, and addresses, with names for the groups (new optional root field `groupRanges`) and commands to add them;
  - Catalog of the device types the simulator models, added by drag and drop onto a line, by double-click, or with Items … Add;
  - drag and drop of a group address onto a group object or of a group object onto an address (or onto a middle group, which creates an address); the whole list of a panel that shows an address, an object, a middle group, or a line accepts the drop; the first address is the sending one, changed with Set as sending; objects of different data sizes cannot be linked;
  - the flags of the objects linked to a group address can be changed in its Associations tab;
  - drag and drop of a device onto another line to move it;
  - a group object can be activated without group address from its key or output page, then linked by drag and drop;
  - context menus (right-click, context-menu key, or Shift+F10) on every tree node and list row, with the same commands for an element wherever it appears;
  - renaming in place by double-click, F2, or Rename in the context menu;
  - a filter above each tree;
  - stable numbers of group objects: a fixed block per key and per output, in the order of the keys and outputs, so that a key keeps its numbers when another key changes its gestures; guided edits keep the objects in that order, and Order group objects by number reorders a scenario written by hand;
  - the segments of a line with a line repeater or segment coupler appear in the Topology tree;
  - resizable trees, lists, and panels, alternating row colors, and a visible hover row;
  - a resizable separator between the editor and the preview, and a button to hide the preview.

- Scenario format: `channels[].equipment` can be a list of loads wired in parallel on the output; each receives its commands, and a metering actuator measures the sum of their powers. A load can have a `name`, shown in the diagram. A shutter output drives one motor. `ChannelInfo.loads` lists the types of the loads; `equipmentState` and `equipmentAction` take the index of a load.
- Behaviors: `parameterLayout` declares the pages of parameters shown by the designer (pages of the device, pages repeated for each channel, with parameters, initial states, boxes that enable group objects, headings, notes, and conditional items); `registerBehavior` checks it. The switch, shutter, dimming, DALI, and heating actuators and the room thermostat declare pages by function.
- Designer: device parameters organized as the parameter dialogs of KNX products: Configuration page with the number of outputs or keys, a group per output with the pages of its behavior and its Connected loads, “Enable group object” boxes, and no group address on parameter pages (addresses are linked in the Group objects tab); context menus on outputs, keys, and loads.
- Designer: tables sortable by a click on a header and resizable by dragging its edge or with the arrow keys; a Channel column in the Group objects table.
- Designer: an Inputs in the diagram page sets the values that the reader types in the diagram (measurements, powers, values of a gateway), which could only be written in JSON before.
- Configuration warning `config-segment-size`: more than 64 connections on one TP1 segment (line, main line, backbone, or segment behind an extension): devices, and couplers, routers, or line extensions, which count on each TP segment they are connected to.
- Designer: devices whose functions belong to channels without loads (the circuits of an energy meter) have a Configuration page and a group of pages per channel.
- Designer: one catalog entry per type (Push-button, Switch actuator); their number of keys or outputs is set on the Configuration page, and new devices are named without a count.
- Designer: an About box with the version, the license, the address of the source code, and a notice of independence from KNX Association; the documentation footer and the README carry the same notice.

### Changed

- R flag by default, as on the corresponding products: time and date of the clock master, output of the time switch, measured temperature, setpoint, mode, heating/cooling and control values of the room thermostat, measured values of the air quality and temperature sensors. Scenarios that wrote `"R": true` on these objects can leave it out.
- `kind` no longer changes the topology: a device on the IP network writes `"medium": "IP"` (a supervisor used to default to IP). The drawing of a device comes from its behavior (`presentation`): thermostat screen, supervisor values, USB interface panel, system of a gateway, metered outputs, receiver column. `kind` remains a description; display/v1 documents its `"supervisor"` value.
- Behavior definitions: a port declares what its objects mean, instead of the engine guessing it from the port name. `defaultFlags` gives the default R and U flags; `telegram: "state"` marks state reports in the monitor; `drivesLoad` links the objects to the loads of their channel in the diagram; `initialUnknown` makes them start without a value. An undeclared port is neutral (R and U off, command telegrams). Extensions that relied on the names `status`, `positionStatus`, `display`… must declare these fields; the sample extension does. Every port of the delivered behaviors has its own description, used by the reference and the schema.
- Source organization: a participant gathers its code in its own folder (`src/participants/<name>/`): behavior, parameter pages, a model entry for the library, a designer entry (catalog entry, template, displayed type), and its own translations. Every delivered participant has its folder; code shared explicitly by several of them is in `src/participants/shared/` (dimming, clock, typed values). The registry installs the delivered participants from one composition (`src/standard-model.ts`), and the designer catalog, templates and device types come from the designer entries (`site/designer/standard-designer.ts`). In the list of templates of the JSON tab, the templates follow the order of the catalog. This reorganization keeps the public identifiers and the diagrams; the changes of behavior and format of this version are listed separately.
- Push-button interface in the designer: the function of an input creates its group objects (switching; switching and dimming; up/down and stop/step; value or scene) and replaces them when another function is chosen; no box enables them any more. The operation is chosen as one key or two keys. Behavior definitions can declare such objects with `channelObjects`.
- When a device sends, its other objects on the same group address take the value whatever their W flag, as the KNX Application Layer specifies; W (U for a response) only decides whether the device reacts.
- DPTs shown without simulation must be identifiers of the standard catalog (KNX Datapoint Types of KNX Standard v3.0.0), with sub-numbers of up to five digits (`1.1200`); their size now counts in the check of objects of different sizes on one address.
- **Breaking:** the push-button behavior `pushButton/v1` is removed; push-buttons are modeled by the push-button interface `buttonInterface/v1`. A scenario that uses it is refused (error `unknown-behavior`). All the examples, the guide, and the designer catalog use the push-button interface; the numeric fields of the examples (level, position, colour temperature) are on a visualization panel.
- Push-button interface: the diagram measures the long press, as for the other keys, against the long-press time of each input, and shows the hold bar; the input receives the edges `down`, `hold`, and `up`. The gestures `press`, `short`, `long`, and `release` sent by the API to an input are played as edges. Shift+Enter is a long press.
- Device without logic (`passive/v1`): values typed in the diagram are sent, as from a visualization panel; it takes no keys.
- Designer: device templates no longer create group addresses: their objects are linked to addresses in the group address view, as in a project. A key or a numeric input can exist without a group address, and a key object can lose its last address.
- Switch actuator: the `lock` and `logic` ports join each output's block of group objects, so the object numbers of the following outputs move by two. The end-of-forcing choices read On and Off.
- Group reads: a device sends a single response, from its first object that has the R flag and a known value, as the KNX Application Layer specifies; previously each such object of the device answered.

- Room thermostat: presence no longer ends a building protection mode selected by `hvacMode` (absence, holidays); it still extends comfort from the standby and economy modes.
- Behaviors: `ctx.readEquipment(channel, index)` reads any load of a channel; `readPower` returns the sum of its loads.
- Builds that are not made from a release tag carry a development identifier (`<version>+dev.<commit>`) in their banner, in the asset URLs of the site, in standalone pages, and in the About box, with the address of their actual source code, instead of the identifier and tag of the last release.

- `bus-diagram.js` and `bus-diagram.esm.js` start with the license notices of the third-party components they include and the address of the source code of their version, so that every copy (CDN, download from the designer, standalone page) carries them. A standalone page exported by the designer also names its version, license, and source.

### Removed

- Scenario format 1: a scenario must declare `"formatVersion": 2`; a file without it is refused with the error `required` (`version` for another value). The conversion of format 1 is gone with it: the **→ Format 2** button of the designer, the guide page “Format 1 and conversion”, and the error `removed`. `toV2()` remains, to write a scenario as minimal JSON.

### Fixed

- Telegram card: a read was said to be answered by each associated object with the R flag; each device answers once, from its first such object with a known value.
- French messages: “line 1.2” and “main line 1.0” in the event log and the diagram stayed in English outside the designer.
- npm package: the type declarations failed to type-check in TypeScript projects that resolve modules as Node does (`moduleResolution` `node16` or `nodenext`), their relative imports lacking an extension; they now carry it, and the build checks both this resolution and a bundler one.
- Dimmer actuator and DALI gateway: a brightness value above 0 but below `minLevelPct` now gives the minimum level, as in the state machine of the KNX Dimming Actuator Basic; while dimming, a new relative step counts from the level being reached, not from the current one.
- Shutter actuator: a forcing telegram in the other direction while forcing holds the output (3 then 2) now moves the shutter to the new end position.
- Clock master: periodic broadcasts fall at second 30 of the minute, as the KNX system clock requires so that receivers do not see the time jump; the default period is 10 minutes, its standard heartbeat.
- DPT 1.018 is named “Occupancy”, as in the KNX catalog.
- Guide: the routing counter value 7 has no special meaning in the current routing rules; the default value 6 is a parameter of each device; TP1 bridges, which do not change the counter, are not modeled. KNX scenes 1–16 mapped to DALI scenes 0–15 is presented as a simplification of the model.
- A payload that the DPT of a receiving object declares invalid (0x7FFF in DPT 9.xxx, sent by an object of another DPT on the same address) stopped the simulation with an exception; the receiver now ignores it, keeps its value, and the event log says why.
- Individual and group addresses with a leading zero (`01.1.1`, `01/1/1`) were accepted as addresses different from `1.1.1` and `1/1/1`, although they encode the same two bytes; they are refused, as in the JSON Schema.
- A telegram already on its way crossed a segment whose bus voltage was cut before it got there; couplers now check the voltage on both sides when the telegram reaches them, and nothing behind is reached (log and animation included).
- Bus voltage return: periodic tasks and pending deadlines stopped with the voltage did not start again. The heating actuator takes up its PWM, the energy meter, the clock master, and the weather station resume their sending, the time switch applies a switching point passed during the failure, the presence detector and the comfort extension of the room thermostat run a whole period again, the window contact sends its contact again, a ventilation step waiting for its minimum time is checked again, the intrusion alarm of a switch actuator blinks again and load shedding retries, and a shutter held by a weather alarm, a forcing, or a lock moves again to its position.
- Room thermostat: an external temperature that never arrived within `externalTempTimeoutMs` raised no sensor fault; the fault and `sensorFaultValuePct` now also apply without a former measurement. A value entered on the device renews the external temperature as a telegram does.
- Weather station, air quality sensor, and power limit of the switch actuator: with no hysteresis, a constant value at the threshold set and reset the output in turn. An output is now reset only strictly below threshold − hysteresis (above threshold + hysteresis for frost), as the descriptions say.
- Time switch: setting the clock during a timed override sent the program value; the override now holds until its end in clock time, and an override until the next switching point ends if the clock passes that point.
- Time switch: a day range such as `Mon-Fri-Sun` was read as `Mon-Fri`, and a program value outside the DPT of the output was converted silently; both are ignored and reported by the configuration warning `config-program`.
- Weather station and logic module: with several objects on an output port, only the first one was updated; all are. Ports that read a single value (measurements, `time`, `enable`, `externalTemp`) refuse a second object.
- Shutter actuator: the port descriptions said that weather alarms (and forcing, for the lock) always keep priority; this is the default order of `safetyPriority`, in which the lock comes before forcing.
- Guide: the explanation of the internal associations of a device contradicted the update of their values described just above it.
- Logic module: an enable object that had not received a telegram yet blocked the output; the output is now enabled until a first telegram, unless `enableAtStart` is “blocked”.
- Designer: the **Simulation** tab showed nothing when the preview was hidden beside the guided or JSON editor.
- KNX/DALI gateway: after a bus voltage failure, the ballasts were no longer polled, so a later fault was not reported.
- Dimmer actuator and DALI gateway: switching on (fixed or last level) now stays within `minLevelPct` and `maxLevelPct`, as a brightness value already did.
- English messages: the range of a parameter out of bounds read “≥ 0.1 et ≤ 5”; the JSON error of a component mixed English and French. Both follow the language of the messages.
- Designer: an extension refused while loading leaves none of its translations behind (only its definitions were cancelled).
- Diagram: on a narrow key, the icon (I/O) wrapped onto several lines and touched the edge; keys keep a margin, the icon stays on one line and the label is shortened with an ellipsis. The key plate is a little wider.
- Site: the asset URLs of a development build now change with each modification (`?v=…` with a fingerprint of the local changes), so that a browser does not keep running an older designer or library; documentation pages used the package version only.
- Designer: changing the function of a push-button interface input left the objects of the former function in place.
- Designer: a parameter set back to its default value by typing it or choosing it is stored as absent, so that the ↺ button disappears as after a click on it.
- Diagram: the timer of an output was given as a note under the load name, cut off for lack of room.
- KNX/DALI gateway: the faults of every DALI load of a group are reported, not only those of the first one.
- Shutter actuator: the slat status objects hold the initial slat angle from the start, as the position status objects do.
- Designer: changing a radiator into another load no longer keeps its heated room, which then could not be deleted.
- Designer: parameter pages of an extension cannot collide with the pages added by the designer, and a malformed display condition is refused when the behavior is registered instead of breaking the page.

## [0.3.1] - 2026-09-29

### Changed

- Diagram: the value boxes of objects and telegrams show the unit of every physical quantity (°C, K, lx, m/s, km/h, %, ppm, W, kW, Wh, kWh), as the monitor and the inspector do, with k and M prefixes for large values.

### Fixed

- Documentation site: scripts and style sheets are referenced with the version (`?v=X.Y.Z`), so that after a release a browser does not run a new page with a cached older library, which reported fields of the new version as unknown.

## [0.3.0] - 2026-09-29

### Added

- DPT 5.004 (percentage 0–255 %), 9.024 (power in kW), 9.028 (wind speed in km/h), and 13.013 (active energy in kWh).
- Ports that accept several units of one quantity, converted by the behavior: relative humidity in 9.007 or 5.001; wind speed in 9.005 or 9.028 (thresholds stay in m/s); actuator power in 14.056 or 9.024 and energy in 13.010 or 13.013.
- Dimming actuator: `valueSwitchesOn` and `valueSwitchesOff` allow or forbid switching on and off by a brightness value, as in product manuals (both allowed by default).
- Shutters: separate upward travel times, `estimatedTravelTimeUpMs` on the actuator channel and `actualTravelTimeUpMs` on the shutter.
- Configuration warning `config-datatype`: a group address links DPTs of the same size but different meaning, such as a scene number and a percentage.
- Line power supplies: `lines[].powerSupply` and `extension.powerSupply` show a supply and its rated current on the diagram; the designer sets them per line.
- `systemGateway/v1`: gateway to another building system (Modbus, BACnet, M-Bus); only its KNX side is modeled.
- `energyMeter/v1`: independent energy meter for circuits it does not switch, with power and integrated energy per circuit.
- Presence detector: `brightness` output (DPT 9.004) entered by the reader, optional switch-on threshold `brightnessThresholdLux`, and presence in DPT 1.018.
- Passive and display devices can show standard DPTs that are not simulated (for example 12.001, 229.001, 235.001) as raw bytes, with their size checked.
- Example “Heat pump behind a gateway”; designer templates for the energy meter and the gateway.

### Changed

- Numeric inputs may target any object that the device sends, not only its `input` objects.

## [0.2.0] - 2026-09-28

### Changed

These corrections change simulation results for some existing scenarios; they follow the KNX training documentation and product manuals.

- Couplers: in filter mode, a group telegram crosses a coupler only when its address is in the coupler's filter table (addresses used on both sides), in both directions. Previously an address used only on the destination side also crossed, so a tool or visualisation outside the filter tables could reach devices behind a coupler.
- Group reads: an object with the R flag answers a read received on any of its group addresses, and sends the response on its sending address. Previously only a read on the sending address was answered.
- Shutter actuator: a stop/step command at rest no longer moves a roller shutter without slats by default (`stepPct` now defaults to 0); set `stepPct` to model actuators that do.
- Validation: a line repeater or segment coupler cannot use the line coupler address (`A.L.0`); lines 0.1 to 0.15 are reported as not supported by BusDiagram rather than invalid; a device address `A.0.0` is reported as reserved for the area (backbone) coupler.
- Documentation: KNX group addresses and DALI broadcast are no longer confused in the DALI example; filter tables are described as in current commissioning software, where manual entries are deprecated.

### Added

- Designer: communication objects can be renamed in the device view (section “Communication objects: names and flags”).
- USB interface: a `groupAddresses` parameter assigns group addresses to the interface, which then enter the coupler filter tables, as for a bus interface modeled in a project.

## [0.1.2] - 2026-09-28

### Added

- Documentation: links to the source repository and the list of changes in the header and footer.

### Changed

- Documentation: complete review against the code. The DPT reference is sorted by number and shows the size and bytes of 3- and 4-byte values correctly, with the decoded value a receiver displays; the guide covers every optional root field, the clock and room assignment of temperature sensors, the clock hooks available to extensions, and the current HVAC limits.
- Documentation: command and status objects explained against product manuals (dimming example, R and U flags), and the two ways of driving a push-button indicator from the actual state of the load.
- Behaviors: every parameter and initial state has a description in the reference and the designer.
- Documentation: the home page shows how to load the library from the CDN, pinned to the documented version, as well as from a local copy.

## [0.1.1] - 2026-09-28

### Changed

- Designer: the code to paste into a page loads the library from jsDelivr at the designer's exact version, with a Subresource Integrity hash, instead of a local `bus-diagram.js` file.
- The documentation site, designer, and player are published with each release, so they always correspond to a version available on npm. The installation and versions guides show the pinned CDN tag of that version.

### Fixed

- Designer: a guided form field no longer loses text being typed when the page re-renders before the edit is confirmed (for example when an extension finishes loading).

## [0.1.0] - 2026-09-28

First public version.

### Added

- `<bus-diagram>` web component and `BusDiagram` global API, distributed as a classic script (`bus-diagram.js`) and an ES module (`bus-diagram.esm.js`), with TypeScript declarations.
- Scenario format 2 (JSON) with generated JSON Schema, validation with located error messages, and conversion from format 1.
- Diagram layout derived from individual addresses: lines, main lines, backbone, line and area couplers, KNXnet/IP routers, line repeaters, and segment couplers.
- Behaviors: push-button, switching actuator (timer, scenes, priority, normally closed relay, power and energy metering, load shedding), shutter actuator (venetian blind slats, wind alarm), dimming actuator (tunable white), KNX/DALI gateway, presence detector, room thermostat, heating actuator, window contact, temperature sensor, air quality sensor, weather station, logic module, clock master, weekly time switch, display, USB interface, and passive device.
- Simulation layer: telegram propagation, coupler filtering and routing counter, object flags, group reads and responses, step mode, simulated clock, room thermal model, and configuration warnings.
- Designer with guided forms, JSON editor, templates, extensions, and exports; standalone player; offline documentation site; prompt generator and authoring reference for language models; English and French interfaces.
