import { create } from "zustand";
import { persist } from "zustand/middleware";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useReviewStore = create(
  persist(
    (set) => ({
      events: [],
      addEvent: (evt) =>
        set((s) => ({ events: [...s.events, { id: uid(), createdAt: Date.now(), ...evt }] })),
    }),
    { name: "review-events" }
  )
);
