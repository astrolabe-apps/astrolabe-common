"use client";

// The race needs this route's RSC response to take longer than the 200ms sync
// debounce, so throttle the network (DevTools, ~500ms latency) to reproduce it.
// A slow server component isn't enough: the response starts streaming at once
// and the transition renders the layout before the debounce fires.
export default function SyncRaceTargetPage() {
  return <h1>Target page reached.</h1>;
}
