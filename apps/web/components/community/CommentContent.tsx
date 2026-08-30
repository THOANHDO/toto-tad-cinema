"use client";

import React from "react";

interface CommentContentProps {
  content: string;
  className?: string;
}

export default function CommentContent({ content, className = "" }: CommentContentProps) {
  // Regex to match @mentions (e.g. @thoanhdo01)
  const parts = content.split(/(@[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]+)/g);

  return (
    <p className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith("@")) {
          return (
            <span
              key={index}
              className="rounded bg-primary/15 px-1 py-0.5 text-xs font-semibold text-primary"
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
}
