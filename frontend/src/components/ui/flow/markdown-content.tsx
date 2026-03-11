"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
	content: string;
	className?: string;
}

export const MarkdownContent = memo(({ content, className }: MarkdownContentProps) => {
	return (
		<div className={cn("prose prose-sm dark:prose-invert max-w-none break-words", className)}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>
				{content || ""}
			</ReactMarkdown>
		</div>
	);
});

MarkdownContent.displayName = "MarkdownContent";
