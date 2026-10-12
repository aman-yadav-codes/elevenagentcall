---
name: performance-optimization
description: >-
  Provides strict performance engineering rules, React 19 memory leak prevention,
  GPU-accelerated 60fps micro-animations, WebSocket audio lifecycle management,
  and connection pooling standards for ultra-fast, snappy web applications.
---

# Performance Engineering & Anti-Glitch Skill for Antigravity

This skill enforces zero-leak, high-performance architecture across Next.js, React 19, MongoDB Atlas, and real-time audio WebRTC streams.

## 1. Memory Leak & Event Lifecycle Rules

### A. Polling & Timers
- **Visibility-Aware Polling**: Never poll in the background if the user switches tabs. Check `document.visibilityState === "visible"`.
- **AbortController on Fetch**: Every `useEffect` fetch MUST use an `AbortController` to cancel pending HTTP requests when the component unmounts.
- **Strict Cleanup**: Every `setInterval`, `setTimeout`, or audio stream MUST be cleanly cleared in the return function of `useEffect`.

```typescript
useEffect(() => {
  let isMounted = true;
  const controller = new AbortController();

  const poll = async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch("/api/data", { signal: controller.signal });
      if (res.ok && isMounted) {
        const data = await res.json();
        setData(data);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") console.error(e);
    }
  };

  const id = setInterval(poll, 5000);
  return () => {
    isMounted = false;
    controller.abort();
    clearInterval(id);
  };
}, []);
```

### B. Audio Streams & Microphone Lifecycles
- Explicitly call `track.stop()` on every `MediaStreamTrack` when a voice session ends to release the OS microphone hardware lock and prevent battery drain.
- Avoid recreating WebRTC connections or audio contexts on every re-render; keep state minimal and decoupled.

---

## 2. 60 FPS GPU Rendering & Zero-Jitter UI

### A. Compositor-Only Animations
- Only animate `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` as they trigger expensive layout reflows.
- Use CSS keyframes with CSS variables and `will-change: transform` instead of JavaScript `Math.random()` loops on every frame.

### B. Bounded Memory Queues
- Event feeds, logs, and live transcripts must be bounded (e.g., `.slice(-50)` or max 100 items). An unbounded array causes memory bloat and garbage collection pauses over long sessions.

---

## 3. Database Connection Pooling (MongoDB Atlas)
- Always cache the `MongoClient` instance in `globalThis` in development mode to prevent connection exhaustion during Next.js Hot Module Replacement (HMR).
- Use lean projection queries (`.find({}, { projection: ... })`) to avoid pulling unneeded database fields across the wire.
- Keep indexes synchronized on searched text and lookup fields.
