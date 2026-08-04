"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShareNetwork } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const HIDE_INVITE_KEY = "q3js-hide-invite-prompt";

export function InviteFriendsDialog() {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const resetTimer = useRef<number>(undefined);

  useEffect(() => {
    const showTimer = window.setTimeout(() => {
      try {
        const hidden = window.localStorage.getItem(HIDE_INVITE_KEY) === "1";
        if (hidden) return;
      } catch {
        // Storage can be unavailable in strict privacy modes; the prompt can
        // still work for the current page view.
      }
      setOpen(true);
    }, 900);

    return () => {
      window.clearTimeout(showTimer);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function inviteFriends() {
    const url = window.location.origin;
    const shareData = {
      title: "Play Quake III in your browser — Q3JS",
      text: "Play Quake III with me on Q3JS:",
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      resetTimer.current = window.setTimeout(() => setShared(false), 2500);
    } catch {
      window.prompt("Copy this link and send it to a friend:", url);
    }
  }

  function neverShowAgain() {
    try {
      window.localStorage.setItem(HIDE_INVITE_KEY, "1");
    } catch {
      // Closing the prompt still works when storage is unavailable.
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="normal-case tracking-normal sm:whitespace-nowrap">Quake is more fun with friends</DialogTitle>
          <DialogDescription>
            Share Q3JS and join the same server. No install needed.
          </DialogDescription>
        </DialogHeader>

        <Button type="button" size="lg" onClick={() => void inviteFriends()} className="w-full normal-case tracking-normal">
          {shared ? <Check weight="bold" /> : <ShareNetwork weight="bold" />}
          {shared ? "Link copied" : "Share link"}
        </Button>

        <button
          type="button"
          onClick={neverShowAgain}
          className="mx-auto block text-xs text-muted-foreground hover:text-foreground"
        >
          Do not show again
        </button>
      </DialogContent>
    </Dialog>
  );
}
