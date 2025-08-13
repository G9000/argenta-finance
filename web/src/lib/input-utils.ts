import { KeyboardEvent, ClipboardEvent } from "react";

const ALLOWED_KEYS = [
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "Home",
  "End",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
];

const ALLOWED_CTRL_KEYS = ["a", "c", "v", "x", "z"];

export function handleNumericKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  currentValue: string
) {
  // Allow navigation and control keys
  if (
    ALLOWED_KEYS.includes(e.key) ||
    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
    (e.ctrlKey && ALLOWED_CTRL_KEYS.includes(e.key))
  ) {
    return;
  }

  // Allow decimal point (only one)
  if (e.key === "." && !currentValue.includes(".")) {
    return;
  }

  // Allow numbers 0-9
  if (e.key >= "0" && e.key <= "9") {
    return;
  }

  e.preventDefault();
}

export function handleNumericPaste(
  e: ClipboardEvent<HTMLInputElement>,
  currentValue: string
) {
  const paste = e.clipboardData.getData("text");

  // Check if pasted content is a valid decimal number
  if (!/^\d*\.?\d*$/.test(paste)) {
    e.preventDefault();
    return;
  }

  // Check if it would create multiple decimal points
  if (paste.includes(".") && currentValue.includes(".")) {
    e.preventDefault();
    return;
  }
}
