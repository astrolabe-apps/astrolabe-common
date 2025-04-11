import React, {
	FC,
	HTMLAttributes,
	ReactElement,
	ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { FocusTrap } from "focus-trap-react";
import {
	Control,
	useControl,
	useControlEffect,
	useTrackedComponent,
} from "@react-typed-forms/core";
import { CloseButton } from "./CloseButton";
import { Button, ButtonProps } from "./Button";

type CssClasses = string;
type DialogClasses = {
	buttonVariant: ButtonProps["variant"];
	/**
	 * Provide classes to style the dialog background.
	 * @default "bg-white"
	 */
	background: CssClasses;
	/**
	 * Provide classes to style the dialog width.
	 * @default "max-w-2xl w-full"
	 */
	width: CssClasses;
	/**
	 * Provide classes to style the dialog height.
	 * @default "h-auto"
	 */
	height: CssClasses;
	/**
	 * Provide classes to style the dialog padding.
	 * @default "p-4"
	 */
	padding: CssClasses;
	/**
	 * Provide classes to style the dialog spacing.
	 * @default "space-y-4"
	 */
	spacing: CssClasses;
	/**
	 * Provide classes to style the dialog rounded corners.
	 * @default "rounded-lg"
	 */
	rounded: CssClasses;
	/**
	 * Provide classes to style the dialog shadow.
	 * @default "shadow-xl"
	 */
	shadow: CssClasses;
	/**
	 * Provide classes to style the dialog z-index.
	 * @default "z-50"
	 */
	zIndex: CssClasses;
	/**
	 * Provide classes to style the dialog backdrop.
	 * @default "bg-black bg-opacity-50"
	 */
	regionBackdrop: CssClasses;
	/**
	 * Provide classes to style the dialog header region.
	 * @default "text-2xl font-bold mb-4"
	 */
	regionHeader: CssClasses;
	/**
	 * Provide classes to style the dialog body region.
	 * @default "max-h-[200px] overflow-hidden mb-4"
	 */
	regionBody: CssClasses;
	/**
	 * Provide classes to style the dialog footer region.
	 * @default "flex justify-end space-x-2"
	 */
	regionFooter: CssClasses;
	/** Provide classes for neutral buttons, such as Cancel.
	 * @default
	 */
	buttonNeutral: CssClasses;
	/** Provide classes for positive actions, such as Confirm or Submit. */
	buttonPositive: CssClasses;
};
type DialogProps = {
	/**
	 * The id(s) of the element(s) that describe the dialog.
	 */
	"aria-describedby"?: string;
	/**
	 * The id(s) of the element(s) that label the dialog.
	 */
	"aria-labelledby"?: string;
	/**
	 * Dialog children, usually the included sub-components.
	 */
	children?: React.ReactNode;
	/**
	 * Override or extend the styles applied to the component.
	 */
	classes?: Partial<DialogClasses>;
	/**
	 * Callback fired when the component requests to be closed.
	 *
	 * @param {object} event The event source of the callback.
	 * @param {string} reason Can be: `"escapeKeyDown"`, `"backdropClick"`.
	 */
	onClose?: (event: {}, reason: "backdropClick" | "escapeKeyDown") => void;
	/**
	 * If `true`, the component is shown.
	 */
	open: boolean;
};

export type SimpleDialogProps = HTMLAttributes<HTMLDivElement> & {
	/** The title that is positioned at the top of the dialog. */
	title: ReactNode;
	// A callback function that runs when the dialog is open.
	whenOpen?: () => void;
	/** A callback function that runs when the dialog is canceled. */
	onCancel?: () => void;
	/** Disable the cancel button.
	 * @warn This is not recommended for accessibility - @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
	 */
	disableCancel?: boolean;
	displayX?: boolean;
	children: ReactNode;
	actions: ReactNode;
	cancelLabel?: string;
	/* Whether to prevent elements underneath the dialog from scrolling */
	preventParentScrolling?: boolean;
} & Omit<DialogProps, "open" | "onClose">;

export function useDialog(
	openControl?: Control<boolean>,
): [(open: boolean) => void, FC<SimpleDialogProps>] {
	const openNode = openControl ?? useControl(false);
	return [
		(b) => {
			openNode.value = b;
		},
		useTrackedComponent(SDialog, []),
	];

	function SDialog({
		title,
		disableCancel,
		children,
		onCancel,
		whenOpen,
		actions,
		cancelLabel,
		displayX,
		classes,
		preventParentScrolling,
		...props
	}: SimpleDialogProps) {
		const isOpen = openNode.value;
		const dialogRef = useRef<HTMLDivElement>(null);
		let registeredInteractionWithBackdrop = false;
		const {
			background = "bg-white",
			width = "lg:max-w-4xl md:max-w-3xl w-full",
			height = "h-auto",
			padding = "p-4",
			spacing = "space-y-4",
			rounded = "rounded-lg",
			shadow = "shadow-xl",
			zIndex = "z-[99]",
			regionBackdrop = "bg-black bg-opacity-50",
			regionHeader = "text-2xl font-bold py-2",
			regionBody = "max-h-[75vh] overflow-auto mb-4 min-h-[5rem]",
			regionFooter = "flex justify-end space-x-2",
		} = classes ?? {};
		useEffect(() => dialogRef?.current?.focus(), []);
		async function doClose() {
			openNode.value = false;
			onCancel?.();
		}

		useControlEffect(
			() => isOpen,
			(v) => {
				if (!v) return;
				whenOpen?.();
			},
			true,
		);

		// Prevent parent scrolling
		useControlEffect(
			() => isOpen,
			(v) => {
				if (!preventParentScrolling) return;
				const body = document.querySelector<HTMLBodyElement>(
					'body[data-cy="scroll-lock"]',
				);
				if (!body) return;

				if (v) {
					body.style.overflowY = "hidden";
				} else {
					body.style.removeProperty("overflow-y");
				}
			},
		);

		function classIncludesDialog(classList: DOMTokenList) {
			return (
				classList.contains("dialog-backdrop") ||
				classList.contains("dialog-transition")
			);
		}

		function onBackdropInteractionBegin(
			event: React.MouseEvent | React.TouchEvent,
		): void {
			if (!(event.target instanceof Element)) return;
			if (classIncludesDialog(event.target.classList))
				registeredInteractionWithBackdrop = true;
		}
		function onBackdropInteractionEnd(
			event: React.MouseEvent | React.TouchEvent,
		): void {
			if (!(event.target instanceof Element)) return;
			if (
				classIncludesDialog(event.target.classList) &&
				registeredInteractionWithBackdrop
			) {
				doClose();
			}
			registeredInteractionWithBackdrop = false;
		}

		function onKeyDown(event: React.KeyboardEvent) {
			if (event.key === "Escape") {
				doClose();
			}
		}

		return isOpen ? (
			<FocusTrap key="focus-trap">
				<div
					onMouseDown={onBackdropInteractionBegin}
					onMouseUp={onBackdropInteractionEnd}
					onTouchStart={onBackdropInteractionBegin}
					onTouchEnd={onBackdropInteractionEnd}
					onClick={() => {}}
					onKeyDown={onKeyDown}
					role="dialog"
					aria-modal="true"
					tabIndex={-1}
					aria-labelledby="modal-heading"
					// aria-label={title}
					ref={dialogRef}
					className={`dialog-backdrop pointer-events-auto fixed inset-0  ${regionBackdrop} ${zIndex}`}
					{...props}
				>
					<div className="dialog-transition mx-2 flex h-full items-center justify-center md:mx-4 lg:mx-0">
						<div
							className={`${background} ${width} ${height} ${padding} ${spacing} ${rounded} ${shadow}`}
							data-cy={"dialog-container"}
						>
							<header className="relative flex justify-between">
								<h2 id="modal-heading" className={regionHeader}>
									{title}
								</h2>
								{displayX && (
									<CloseButton
										className="sticky right-0 top-0"
										onClick={() => (openNode.value = false)}
									/>
								)}
							</header>
							<div className={regionBody}>{children}</div>
							<div className={regionFooter}>
								{actions}
								{!disableCancel && (
									<Button variant="outline" onClick={doClose}>
										{cancelLabel || "Cancel"}
									</Button>
								)}
							</div>
						</div>
					</div>
				</div>
			</FocusTrap>
		) : null;
	}
}

interface ConfirmData extends Omit<SimpleDialogProps, "actions"> {
	action: () => void;
	actionLabel?: string;
}
export type ConfirmFunction = (props: ConfirmData) => void;
export function useConfirmDialog(): [ConfirmFunction, ReactElement] {
	const [openDialog, Dialog] = useDialog();
	const [confirmData] = useState(useControl<ConfirmData | undefined>());
	const makeConfirm: ConfirmFunction = ({
		action = () => {},
		children = <></>,
		title = "Please confirm",
		actionLabel = "Confirm",
		cancelLabel = "Cancel",
		onCancel = () => {},
		whenOpen,
		disableCancel = false,
		classes,
	}) => {
		confirmData.value = {
			action,
			title,
			children,
			actionLabel,
			cancelLabel,
			onCancel,
			whenOpen,
			disableCancel,
			classes,
		};
		openDialog(true);
	};

	function ConfirmDialog() {
		const data = confirmData.value;
		if (!data) return <></>;
		return (
			<Dialog
				title={data.title}
				cancelLabel={data.cancelLabel}
				classes={data.classes}
				disableCancel={data.disableCancel}
				onCancel={() => {
					openDialog(false);
					data.onCancel?.();
				}}
				whenOpen={() => {
					data?.whenOpen?.();
				}}
				actions={
					<Button
						variant={data.classes?.buttonVariant ?? "primary"}
						onClick={() => {
							openDialog(false);
							data.action();
						}}
					>
						{data.actionLabel}
					</Button>
				}
			>
				{data.children}
			</Dialog>
		);
	}

	const RenderedDialog = useCallback(ConfirmDialog, [confirmData]);
	const Element = RenderedDialog();
	return [makeConfirm, Element];
}
