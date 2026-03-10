import { Slot } from "@radix-ui/react-slot";
import { EllipsisVertical } from "lucide-react";
import React, { type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* NODE HEADER -------------------------------------------------------------- */

export type NodeHeaderProps = React.HTMLAttributes<HTMLElement>;

export const NodeHeader = React.forwardRef<HTMLElement, NodeHeaderProps>(
	({ className, ...props }, ref) => {
		return (
			<header
				ref={ref}
				{...props}
				className={cn(
					"mb-4 flex items-center justify-between gap-2 px-3 py-2",
					"-mx-5 -mt-5",
					className,
				)}
			/>
		);
	},
);

NodeHeader.displayName = "NodeHeader";

/* NODE HEADER TITLE -------------------------------------------------------- */

export interface NodeHeaderTitleProps
	extends React.HTMLAttributes<HTMLHeadingElement> {
	asChild?: boolean;
}

export const NodeHeaderTitle = React.forwardRef<
	HTMLHeadingElement,
	NodeHeaderTitleProps
>(({ className, asChild, ...props }, ref) => {
	const Comp = asChild ? Slot : "h3";

	return (
		<Comp
			ref={ref}
			{...props}
			className={cn(className, "user-select-none flex-1 font-semibold")}
		/>
	);
});

NodeHeaderTitle.displayName = "NodeHeaderTitle";

/* NODE HEADER ICON --------------------------------------------------------- */

export type NodeHeaderIconProps = React.HTMLAttributes<HTMLSpanElement>;

export const NodeHeaderIcon = React.forwardRef<
	HTMLSpanElement,
	NodeHeaderIconProps
>(({ className, ...props }, ref) => {
	return (
		<span ref={ref} {...props} className={cn(className, "[&>*]:size-5")} />
	);
});

NodeHeaderIcon.displayName = "NodeHeaderIcon";

/* NODE HEADER ACTIONS ------------------------------------------------------ */

export type NodeHeaderActionsProps = React.HTMLAttributes<HTMLDivElement>;

export const NodeHeaderActions = React.forwardRef<
	HTMLDivElement,
	NodeHeaderActionsProps
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			{...props}
			className={cn(
				"ml-auto flex items-center gap-1 justify-self-end",
				className,
			)}
		/>
	);
});

NodeHeaderActions.displayName = "NodeHeaderActions";

/* NODE HEADER ACTION ------------------------------------------------------- */

export interface NodeHeaderActionProps extends ComponentProps<typeof Button> {
	label: string;
}

export const NodeHeaderAction = React.forwardRef<
	HTMLButtonElement,
	NodeHeaderActionProps
>(({ className, label, title, ...props }, ref) => {
	return (
		<Button
			ref={ref}
			variant="ghost"
			aria-label={label}
			title={title ?? label}
			className={cn(className, "nodrag size-6 p-1")}
			{...props}
		/>
	);
});

NodeHeaderAction.displayName = "NodeHeaderAction";

export type NodeHeaderMenuActionProps = Omit<
	NodeHeaderActionProps,
	"onClick"
> & {
	trigger?: React.ReactNode;
};

export const NodeHeaderMenuAction = React.forwardRef<
	HTMLButtonElement,
	NodeHeaderMenuActionProps
>(({ trigger, children, ...props }, ref) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<NodeHeaderAction ref={ref} {...props}>
					{trigger ?? <EllipsisVertical />}
				</NodeHeaderAction>
			</DropdownMenuTrigger>
			<DropdownMenuContent>{children}</DropdownMenuContent>
		</DropdownMenu>
	);
});

NodeHeaderMenuAction.displayName = "NodeHeaderMenuAction";
