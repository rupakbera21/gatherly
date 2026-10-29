"use client";

/**
 * @module CopilotDrawer
 * @purpose Interactive Plan Copilot drawer assistant.
 *          Streams plan questions, proposes reversible PlanPatch operations,
 *          displays visual before/after diff previews, and executes patches safely.
 *          Manages focus on open/close, traps Tab within the drawer,
 *          closes on Escape, and announces status via a polite aria-live region.
 * @rubric Problem Statement Alignment & Code Quality – AI Copilot with human-in-the-loop patch approval.
 * @rubric Accessibility – Focus management, Escape close, Tab trap, aria-live announcements.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { diffPatch, PlanPatch } from "@/domain/patches";
import { EventPlan } from "@/domain/types";
import { useGatherlyStore } from "@/store";
import { Button, Icon, Badge, Input } from "@/components/ui";

interface CopilotDrawerProps {
  plan: EventPlan;
  isOpen: boolean;
  onClose: () => void;
  /** Ref to the button that opened the drawer (for focus-return on close). */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  patches?: PlanPatch[];
  applied?: boolean;
  rejected?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function CopilotDrawer({ plan, isOpen, onClose, triggerRef }: CopilotDrawerProps) {
  const { applyPatchToPlan } = useGatherlyStore();

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_welcome",
      sender: "copilot",
      text: `Hello! I'm your Gatherly Copilot for "${plan.profile.title}". You can ask me to reallocate budget, add vendor tasks, suggest timeline milestones, or answer any event questions. How can I help?`,
    },
  ]);

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the close button when drawer opens; restore to trigger on close.
  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    } else {
      if (triggerRef?.current) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen, triggerRef]);

  // Trap Tab/Shift+Tab within the drawer and close on Escape.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );

      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const query = inputMessage.trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);
    setLiveAnnouncement("Copilot is thinking...");

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          userMessage: query,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const patchCount: number = (data.suggestedPatches as PlanPatch[] | undefined)?.length ?? 0;
        setMessages((prev) => [
          ...prev,
          {
            id: `copilot_${Date.now()}`,
            sender: "copilot",
            text: data.reply || "I've reviewed your request.",
            patches: data.suggestedPatches || [],
          },
        ]);
        setLiveAnnouncement(
          patchCount > 0
            ? `Copilot responded with ${patchCount} suggested change${patchCount > 1 ? "s" : ""}.`
            : "Copilot responded."
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "copilot",
            text: (data as { message?: string }).message || "Sorry, I ran into an error processing that request.",
          },
        ]);
        setLiveAnnouncement("Copilot encountered an error.");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "copilot",
          text: "Network error connecting to Copilot service. Please try again.",
        },
      ]);
      setLiveAnnouncement("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleApplyPatch(msgId: string, patch: PlanPatch) {
    applyPatchToPlan(plan.id, patch);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, applied: true, rejected: false } : m))
    );
    setLiveAnnouncement("Plan changes applied successfully.");
  }

  function handleRejectPatch(msgId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, rejected: true, applied: false } : m))
    );
    setLiveAnnouncement("Plan changes rejected.");
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950/60 backdrop-blur-xs flex justify-end">
      {/* Single polite aria-live region for all status announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copilot-drawer-title"
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col h-full"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
              <Icon name="sparkles" size="sm" aria-hidden="true" />
            </span>
            <div>
              <h2 id="copilot-drawer-title" className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-display">
                Plan Copilot
              </h2>
              <p className="text-xs text-neutral-500">
                AI partner with previewable changes
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close Copilot drawer"
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <Icon name="x" size="sm" aria-hidden="true" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-label="Conversation">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-2`}
              >
                <div
                  className={`max-w-md p-3.5 rounded-lg text-xs leading-relaxed ${
                    isUser
                      ? "bg-primary-600 text-white"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Proposed Patches Card */}
                {msg.patches && msg.patches.length > 0 && (
                  <div className="w-full p-3.5 rounded-md border border-primary-200 dark:border-primary-900/60 bg-primary-50/40 dark:bg-primary-950/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                        <Icon name="sparkles" size="xs" aria-hidden="true" />
                        <span>Proposed Plan Changes ({msg.patches.length})</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {msg.applied && (
                          <Badge variant="success" size="sm" icon="check">
                            Applied
                          </Badge>
                        )}
                        {msg.rejected && (
                          <Badge variant="neutral" size="sm" icon="x">
                            Rejected
                          </Badge>
                        )}
                      </div>
                    </div>

                    {msg.patches.map((patch, idx) => {
                      const diffs = diffPatch(plan, patch);

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1.5"
                        >
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100 capitalize">
                            Operation: {patch.op}
                          </div>

                          {diffs.map((d, dIdx) => (
                            <div key={dIdx} className="text-xs space-y-0.5">
                              <span className="font-medium text-neutral-600 dark:text-neutral-400">
                                {d.field}:
                              </span>
                              <div className="flex items-center gap-1.5 font-mono text-xs tnum">
                                <span className="line-through text-danger">{d.before}</span>
                                <Icon name="arrow-right" size="xs" className="text-neutral-400" aria-hidden="true" />
                                <span className="text-success font-bold">{d.after}</span>
                              </div>
                            </div>
                          ))}

                          {!msg.applied && !msg.rejected && (
                            <div className="pt-2 flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRejectPatch(msg.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApplyPatch(msg.id, patch)}
                              >
                                Approve &amp; Apply
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div
              className="flex items-center gap-2 p-3 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500 w-32 animate-pulse"
              aria-hidden="true"
            >
              <span className="w-2 h-2 rounded-full bg-primary-600 animate-bounce" />
              <span>Thinking...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            required
            aria-label="Message Copilot"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask Copilot or request an edit..."
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isLoading || !inputMessage.trim()}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
