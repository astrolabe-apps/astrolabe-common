import { Button } from "./Button";
import {
	Control,
	useComputed,
	useControlEffect,
} from "@react-typed-forms/core";

export function Pagination({
	total,
	page,
	perPage,
}: {
	total: Control<number>;
	perPage: Control<number>;
	page: Control<number>;
}) {
	const totalPages = useComputed(() => {
		return Math.floor((total.value - 1) / perPage.value) + 1;
	});

	useControlEffect(
		() => [totalPages.value, page.value] as const,
		([total, current]) => {
			if (total > 0 && total < current + 1) {
				page.value = current < 0 ? 0 : current - 1;
			}
		},
	);

	return (
		<div className="mt-2 flex flex-col items-end">
			<span className="text-surface-700 dark:text-surface-400 text-sm">
				Showing page {numText(page.value + 1)} of {numText(totalPages.value)}
			</span>
			<div className="xs:mt-0 mt-2 inline-flex gap-2">
				<Button
					className="inline-flex items-center"
					disabled={page.value <= 0}
					onClick={() => {
						page.value = page.value - 1;
					}}
				>
					<i aria-hidden className="fa fa-arrow-left mr-1 w-5" />
					Previous
				</Button>
				<Button
					className="inline-flex items-center"
					disabled={page.value >= totalPages.value - 1}
					onClick={() => {
						page.value = page.value + 1;
					}}
				>
					Next
					<i aria-hidden className="fa fa-arrow-right ml-1 w-5" />
				</Button>
			</div>
		</div>
	);

	function numText(value: number) {
		return (
			<span className="text-surface-900 font-semibold dark:text-white">
				{value}
			</span>
		);
	}
}
