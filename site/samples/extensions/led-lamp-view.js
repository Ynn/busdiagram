(function(bus_diagram) {
	//#region site/samples/extensions/led-lamp-view.ts
	(0, bus_diagram.registerEquipmentView)("ledStrip", {
		size: {
			width: 84,
			height: 30
		},
		render: ({ state, label, box }) => {
			const on = state.on === true;
			const dots = Array.from({ length: 6 }, (_, i) => i);
			return bus_diagram.html`<div
      style="position:absolute;left:${box.x}px;top:${box.y}px;display:flex;align-items:center;gap:6px"
      title="LED strip ${on ? "on" : "off"}"
    >
      <div
        style="display:flex;gap:3px;padding:4px 5px;border-radius:6px;border:1.5px solid ${on ? "#d99a00" : "#b8b4a7"};background:${on ? "#fff4cc" : "#f1efe8"}"
      >
        ${dots.map(() => bus_diagram.html`<span
              style="width:6px;height:6px;border-radius:3px;background:${on ? "#ffb400" : "#d6d2c6"};box-shadow:${on ? "0 0 6px 1px #ffb400" : "none"}"
            ></span>`)}
      </div>
      <span style="font-size:13px;font-weight:600">${label}</span>
    </div>`;
		}
	});
	//#endregion
})(BusDiagram);
