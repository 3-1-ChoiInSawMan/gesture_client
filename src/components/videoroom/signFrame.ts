export type Landmark = { x: number; y: number; z?: number; visibility?: number };
export type SignResults = {
  leftHandLandmarks?: Landmark[];
  rightHandLandmarks?: Landmark[];
  poseLandmarks?: Landmark[];
};

/** Slots follow image-space position, independently of the mirrored self preview. */
export function createSignFrame(results: SignResults): number[] {
  const valid = (point: Landmark) => Number.isFinite(point.x) && Number.isFinite(point.y);
  const hands = [results.leftHandLandmarks, results.rightHandLandmarks]
    .filter((hand): hand is Landmark[] => !!hand && hand.length === 21 && hand.every(valid))
    .map((hand) => ({ hand, x: hand.reduce((sum, point) => sum + point.x, 0) / 21 }))
    .sort((a, b) => a.x - b.x);
  const left = results.poseLandmarks?.[11];
  const right = results.poseLandmarks?.[12];
  const shoulders = left && right && valid(left) && valid(right) ? [left, right] : null;
  const slots = [new Array<number>(42).fill(0), new Array<number>(42).fill(0)];
  if (hands.length === 2) {
    hands.forEach(({ hand }, index) => { slots[index] = hand.flatMap(({ x, y }) => [x, y]); });
  } else if (hands.length === 1 && shoulders) {
    const center = (shoulders[0].x + shoulders[1].x) / 2;
    slots[hands[0].x < center ? 0 : 1] = hands[0].hand.flatMap(({ x, y }) => [x, y]);
  }
  // Without shoulders a single hand cannot be assigned by the training rule.
  return [...slots[0], ...slots[1], ...(shoulders ? shoulders.flatMap(({ x, y }) => [x, y]) : [0, 0, 0, 0])];
}

export function captionDebug(event: string, details: object) {
  if (typeof window !== "undefined" && window.localStorage.getItem("gesture:caption-debug") === "1") {
    console.debug(`[Caption] ${event}`, details);
  }
}
