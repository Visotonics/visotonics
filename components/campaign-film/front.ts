/* ---------------------------------------------------------------------------
   Verbatim port of the source site's lib/front.ts. Only the import was
   repointed at this folder's own state.ts.
--------------------------------------------------------------------------- */
import { range, smooth, window01 } from "./state";

export const FRONT_CENTER: [number, number] = [0, 0];

export type Front = {
  radius: number;
  sweep: number;
  persist: number;
  ignite: number;
  amp: number;
};

export function conversionFront(p: number): Front {
  const radius = smooth(range(p, 0.38, 0.46)) * 85;
  const sweep = window01(p, 0.375, 0.46, 0.02);
  const persist = smooth(range(p, 0.4, 0.52));
  const ignite = window01(p, 0.375, 0.43, 0.02);
  const amp = Math.max(persist * 0.4, sweep);
  return { radius, sweep, persist, ignite, amp };
}
