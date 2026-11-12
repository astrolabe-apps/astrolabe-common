// Sample for trying the formatter: reformat this file in the IDE.
let
	$count := $count(items[$i => $i > 0]), // trailing comment stays after the comma
	/* block comment */ $total := $sum(items.price) +
		$sum(items.tax) +
		$sum(items.shipping) +
		$sum(items.discount),

	// a blank line above is kept (only one)
	$label := $count = 0
		? "none"
		: $count = 1 ? "one"
		: $count < 10 ? "a few"
		: $count < 100 ? "many"
		: "lots",
	$nested := $a ? ($b ? 1 : 2) : 3,
	$rate := $which($region,
		"north", 0.1,
		"south", 0.15,

		"east", 0.2,
		// a comment above a row stays above it, and the row joins up
		"west", 0.25,
		0.3
	),
	$short := $which($size, "s", 1, "m", 2),
	$text := `Total of {$count} items: {$total > 1000 ? "large order with free shipping" : "standard order"}`
in {
	"label": $label,
	"rate": $rate,
	"compact": { "a": 1, "b": 2 },
	"expanded": {
		"a": 1
	},
	"flags": [true, false, null],
	"ok": ($total >= 0 and $count >= 0) ?? false
	//"debug": $nested
}
