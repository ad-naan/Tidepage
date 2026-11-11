"use client";
import { useEffect, useRef, useState } from "react";

/** Coalesce incoming tokens into one React update per animation frame. */
export function useStreamText() {
  const [text, setText] = useState("");
  const value = useRef("");
  const frame = useRef(0);
  function flush() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    setText(value.current);
  }
  function append(delta: string) {
    value.current += delta;
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  }
  function reset() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    value.current = "";
    setText("");
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { text, append, flush, reset };
}
