/**
 * Cross-component event for tip lifecycle. Used so TipWall can refetch
 * messages after TipForm completes a tip, without lifting state to the
 * server component that renders them as siblings.
 */

export const TIP_SENT_EVENT = "glint:tip-sent";

export type TipSentDetail = { slug: string };

export function dispatchTipSent(slug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TipSentDetail>(TIP_SENT_EVENT, { detail: { slug } }),
  );
}
