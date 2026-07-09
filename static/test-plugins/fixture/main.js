import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div data-testid="rice-plugin-fixture" style="padding: 8px; pointer-events: auto;"> </div>`);

function FixtureThing($$anchor, $$props) {
	$.push($$props, true);

	let options = $.prop($$props, 'options', 19, () => ({}));
	const label = $.derived(() => options().label ?? 'none');
	var div = root();
	var text = $.child(div);

	$.reset(div);

	$.template_effect(() => {
		$.set_attribute(div, 'data-label', $.get(label));
		$.set_text(text, `fixture:${$.get(label) ?? ''}`);
	});

	$.append($$anchor, div);
	$.pop();
}
const plugin = {
    effectLayers: { fx: FixtureThing },
    columnKinds: { panel: { component: FixtureThing } },
    commands: {
        hello: () => {
            globalThis.__ricePluginFixtureHello = (globalThis.__ricePluginFixtureHello ?? 0) + 1;
        },
    },
};
export default plugin;
