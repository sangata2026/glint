/**
 * Discriminated union for form state machines.
 *
 * Every form in the app (create profile, tip, send XLM, edit profile) has
 * the same four basic states: idle, busy, success, error. This type lets
 * them share one shape.
 *
 * The `TSuccess` type parameter is the data returned on success. Pass
 * `undefined` (the default) if the form has no meaningful success payload.
 *
 * @example
 *   const [status, setStatus] = useState<FormStatus>({ kind: "idle" });
 *   const [status, setStatus] = useState<FormStatus<Creator>>({ kind: "idle" });
 */
export type FormStatus<TSuccess = undefined> =
  | { kind: "idle" }
  | { kind: "busy"; label?: string }
  | { kind: "success"; data: TSuccess }
  | { kind: "error"; message: string };

/** Returns true if the form is currently awaiting an async operation. */
export function isBusy<T>(
  status: FormStatus<T>,
): status is { kind: "busy"; label?: string } {
  return status.kind === "busy";
}

/** Returns true if the form is in idle, success, or error (not actively busy). */
export function isIdle<T>(status: FormStatus<T>): boolean {
  return !isBusy(status);
}

/**
 * Helper to create a busy status with a specific label (shown on buttons).
 */
export function busy(label?: string): FormStatus<never> {
  return { kind: "busy", label };
}
