"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

/**
 * 合格時の上品な演出。派手にせず、カーキと白基調で低密度・短時間に抑える。
 */
export function PassEffect() {
  useEffect(() => {
    const colors = ["#6b6d46", "#9a9c76", "#ffffff"];
    const duration = 1400;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.3 },
        colors,
        scalar: 0.7,
        gravity: 0.9,
        ticks: 200,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.3 },
        colors,
        scalar: 0.7,
        gravity: 0.9,
        ticks: 200,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return null;
}
