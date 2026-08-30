"use client";

import { useEffect, useRef, useState } from "react";
import { Smile, Send, X, User } from "lucide-react";
import type { CommunityAccount } from "@/app/bang-xep-hang/actions";

interface MentionTextareaProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  isPending?: boolean;
  accounts?: CommunityAccount[];
  rows?: number;
  autoFocus?: boolean;
}

const QUICK_EMOJIS = ["❤️", "🔥", "🤣", "🍿", "👏", "😭", "👍", "✨"];

export default function MentionTextarea({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Viết bình luận...",
  submitLabel = "Bình luận",
  isPending = false,
  accounts = [],
  rows = 3,
  autoFocus = false,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      if (charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(" ")) {
          setMentionQuery(query.toLowerCase());
          setMentionIndex(lastAtIndex);
          setSelectedIndex(0);
          return;
        }
      }
    }

    setMentionQuery(null);
  };

  const filteredAccounts = mentionQuery !== null
    ? accounts.filter((acc) =>
        acc.display_name.toLowerCase().includes(mentionQuery)
      )
    : [];

  const handleSelectAccount = (displayName: string) => {
    if (mentionIndex === -1 || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const beforeMention = value.slice(0, mentionIndex);
    const afterMention = value.slice(cursorPos);

    const newText = `${beforeMention}@${displayName} ${afterMention}`;
    onChange(newText);
    setMentionQuery(null);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = mentionIndex + displayName.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredAccounts.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredAccounts.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredAccounts.length) % filteredAccounts.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectAccount(filteredAccounts[selectedIndex].display_name);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim() && !isPending) {
        onSubmit();
      }
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onChange(value + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="relative space-y-2.5">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          maxLength={500}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white placeholder-white/35 backdrop-blur-sm transition-all focus:border-primary/60 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-primary/60"
        />

        {/* Mention Auto-Suggest Dropdown */}
        {mentionQuery !== null && filteredAccounts.length > 0 && (
          <div className="absolute left-2 bottom-full mb-1.5 z-50 w-56 overflow-hidden rounded-xl border border-white/15 bg-[#12141a]/95 p-1.5 shadow-2xl backdrop-blur-md">
            <div className="px-2 py-1 text-[11px] font-semibold text-foreground-muted">
              Gợi ý thành viên (@)
            </div>
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {filteredAccounts.map((acc, idx) => (
                <button
                  key={acc.user_id}
                  type="button"
                  onClick={() => handleSelectAccount(acc.display_name)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                    idx === selectedIndex
                      ? "bg-primary text-white font-medium"
                      : "text-foreground-secondary hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">
                    {acc.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{acc.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Emoji & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="flex items-center gap-1 text-[11px] text-foreground-muted mr-1">
            <Smile className="h-3 w-3" />
          </span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-xs transition-transform hover:bg-white/15 hover:scale-110 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="button-ghost min-h-8 px-2.5 text-xs text-foreground-muted hover:text-white"
            >
              Hủy
            </button>
          )}

          <button
            type="button"
            disabled={isPending || !value.trim()}
            onClick={onSubmit}
            className="button-primary min-h-8 gap-1.5 px-3.5 text-xs font-semibold disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {isPending ? "Đang gửi..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
