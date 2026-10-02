// Pages of parameters of the push-button interface in the designer: the function of an
// input on its first page, then its lock, LED, bus voltage, and cyclic sending.
import type { ParameterLayout } from "../../knx/contracts";

/** Push-button interface: one input per channel; the function decides the rest. */
export const buttonInterfaceLayout: ParameterLayout = {
  channel: [
    {
      id: "function",
      title: "Function",
      items: [
        { parameter: "function" },
        {
          note: "The group objects of the function are created with it; link them in the Group objects tab.",
        },
        {
          when: { parameter: "function", is: ["switch"] },
          items: [
            { parameter: "switchLongPress" },
            {
              when: { parameter: "switchLongPress", not: [true] },
              items: [{ parameter: "onPress" }, { parameter: "onRelease" }],
            },
            {
              when: { parameter: "switchLongPress", is: [true] },
              items: [
                { parameter: "onShort" },
                { parameter: "onLong" },
                { parameter: "longPressMs" },
              ],
            },
          ],
        },
        {
          when: { parameter: "function", is: ["dim"] },
          items: [
            { parameter: "dimMode" },
            { parameter: "dimStep" },
            { parameter: "longPressMs" },
          ],
        },
        {
          when: { parameter: "function", is: ["blind"] },
          items: [
            { parameter: "blindMode" },
            { parameter: "stopOnRelease" },
            { parameter: "longPressMs" },
          ],
        },
        {
          when: { parameter: "function", is: ["value"] },
          items: [
            { parameter: "shortValue" },
            { parameter: "longValue" },
            {
              when: { parameter: "longValue", not: [null] },
              items: [{ parameter: "longPressMs" }],
            },
          ],
        },
        {
          when: { parameter: "function", is: ["scene"] },
          items: [
            { parameter: "sceneNumber" },
            { parameter: "sceneStore" },
            {
              when: { parameter: "sceneStore", is: [true] },
              items: [
                { parameter: "longPressMs" },
                {
                  note: "Storing needs a scene control object (DPT 18.001); a scene number object (17.001) only recalls.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "lock",
      title: "Lock",
      items: [
        { groupObject: "lock" },
        {
          when: { groupObject: "lock" },
          items: [
            {
              when: { parameter: "function", is: ["switch", "dim"] },
              items: [{ parameter: "lockStart" }, { parameter: "lockEnd" }],
            },
            {
              when: { parameter: "function", is: ["blind"] },
              items: [
                { parameter: "blindLockStart" },
                { parameter: "blindLockEnd" },
              ],
            },
            { note: "While the input is locked, its presses are ignored." },
          ],
        },
      ],
    },
    {
      id: "led",
      title: "LED",
      items: [
        { parameter: "ledShown" },
        {
          when: { parameter: "ledShown", is: [true] },
          items: [
            { groupObject: "led" },
            { parameter: "ledInverted" },
            {
              note: "Without an LED object, the LED of a switching or dimming input shows its switching object.",
            },
          ],
        },
      ],
    },
    {
      id: "operation",
      title: "Bus voltage and cyclic sending",
      items: [
        { heading: "Bus voltage recovery" },
        {
          when: { parameter: "function", is: ["switch", "dim"] },
          items: [{ parameter: "busRecovery" }],
        },
        {
          when: { parameter: "function", is: ["blind"] },
          items: [{ parameter: "blindBusRecovery" }],
        },
        {
          when: { parameter: "function", is: ["switch", "dim", "blind"] },
          items: [{ parameter: "busRecoveryDelayMs" }],
        },
        {
          when: { parameter: "function", is: ["value", "scene"] },
          items: [{ note: "No reaction for this function." }],
        },
        { heading: "Cyclic sending" },
        {
          when: { parameter: "function", is: ["switch"] },
          items: [
            { parameter: "cyclicMs" },
            {
              when: { parameter: "cyclicMs", not: [null] },
              items: [{ parameter: "cyclicWhen" }],
            },
          ],
        },
        {
          when: { parameter: "function", not: ["switch"] },
          items: [
            { note: "Cyclic sending applies to the switching function." },
          ],
        },
      ],
    },
  ],
};
