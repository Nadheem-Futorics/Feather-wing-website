"use client";

import { framePath } from "@/data/clips";

/**
 * Frame-sequence loader for the hero canvas scrub.
 * - Loads a scene's frames in priority order (spread pattern first for
 *   instant scrubbability, then fill).
 * - Keeps a sliding window of scenes in memory; evicts distant ones.
 * - Reports global progress so the branded loader can show real numbers.
 */

export interface SceneFrames {
  base: string;
  count: number;
  images: (HTMLImageElement | null)[];
  loaded: number;
  loading: boolean;
  onProgress?: () => void;
}

export class FrameStore {
  private scenes = new Map<string, SceneFrames>();
  private inflight = 0;
  private maxParallel = 8;
  private queue: { scene: SceneFrames; idx: number }[] = [];

  register(base: string, count: number): SceneFrames {
    let s = this.scenes.get(base);
    if (!s) {
      s = { base, count, images: new Array(count).fill(null), loaded: 0, loading: false };
      this.scenes.set(base, s);
    }
    return s;
  }

  get(base: string): SceneFrames | undefined {
    return this.scenes.get(base);
  }

  /** best available frame at or near index (falls back to nearest loaded) */
  frameAt(base: string, idx: number): HTMLImageElement | null {
    const s = this.scenes.get(base);
    if (!s || s.count === 0) return null;
    const i = Math.max(0, Math.min(s.count - 1, idx));
    if (s.images[i]) return s.images[i];
    for (let d = 1; d < s.count; d++) {
      if (s.images[i - d]) return s.images[i - d];
      if (s.images[i + d]) return s.images[i + d];
    }
    return null;
  }

  /** queue a scene's frames; spread-first order for early scrubbability */
  load(base: string, onProgress?: () => void) {
    const s = this.scenes.get(base);
    if (!s || s.loading || s.loaded === s.count) return;
    s.loading = true;
    if (onProgress) s.onProgress = onProgress;

    const order: number[] = [];
    // coarse spread: every 8th frame, then every 4th, 2nd, then all
    for (const step of [8, 4, 2, 1]) {
      for (let i = 0; i < s.count; i += step) {
        if (!order.includes(i)) order.push(i);
      }
    }
    for (const idx of order) {
      if (!s.images[idx]) this.queue.push({ scene: s, idx });
    }
    this.pump();
  }

  private pump() {
    while (this.inflight < this.maxParallel && this.queue.length) {
      const job = this.queue.shift()!;
      const { scene, idx } = job;
      if (scene.images[idx]) continue;
      this.inflight++;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        scene.images[idx] = img;
        scene.loaded++;
        this.inflight--;
        scene.onProgress?.();
        this.pump();
      };
      img.onerror = () => {
        this.inflight--;
        this.pump();
      };
      img.src = framePath(scene.base, idx);
    }
  }

  /** drop frames of scenes not in the keep list (memory management) */
  evictExcept(keep: Set<string>) {
    for (const [base, s] of this.scenes) {
      if (keep.has(base) || s.loaded === 0) continue;
      s.images.fill(null);
      s.loaded = 0;
      s.loading = false;
      // remove any queued jobs for this scene
      this.queue = this.queue.filter((j) => j.scene.base !== base);
    }
  }

  progressOf(bases: string[]): { loaded: number; total: number } {
    let loaded = 0;
    let total = 0;
    for (const b of bases) {
      const s = this.scenes.get(b);
      if (!s) continue;
      loaded += s.loaded;
      total += s.count;
    }
    return { loaded, total };
  }
}

export const frameStore = new FrameStore();
