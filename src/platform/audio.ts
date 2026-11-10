// Original synthesized workshop feedback. Recorded mechanical audio is a later asset milestone.
let context: AudioContext | undefined;
export function playSound(
  kind: "bolt" | "install" | "start",
  enabled: boolean,
) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const osc = context.createOscillator(),
      gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    osc.type = kind === "start" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(
      kind === "start" ? 45 : kind === "install" ? 660 : 260,
      context.currentTime,
    );
    osc.frequency.exponentialRampToValueAtTime(
      kind === "start" ? 90 : 100,
      context.currentTime + 0.16,
    );
    gain.gain.setValueAtTime(0.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + (kind === "start" ? 1.5 : 0.22),
    );
    osc.start();
    osc.stop(context.currentTime + (kind === "start" ? 1.5 : 0.23));
  } catch {
    /* Audio can be unavailable in embedded browsers. Gameplay remains usable. */
  }
}
