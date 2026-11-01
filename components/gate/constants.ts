export const CARD_W = 3.2, CARD_H = (3.2 * 480) / 984, CARD_T = 0.014, CARD_R = 0.11;
export const READER_W = 3.36, READER_H = 1.08, READER_D = 0.72, READER_TILT = 0.22;
export const OM = { hoverY: 0.9, readerY: -1.2, slotY: -1.05, traverseSpan: 2.6, respawnMs: 50, fadeInS: 0.45 };
export const SLOT_HALF = 3.2; // |x| < this counts as "over the reader"
export const SLOT_TOP = OM.slotY + CARD_H / 2; // card centre y when seated (≈ -0.27)
export const zOnTilt = (y: number) => (y - OM.readerY) * Math.tan(READER_TILT);
export const pxPerUnit = (w: number, h: number) => Math.min(132, Math.max(55, Math.min(w / 6.0, h / 6.6)));
/** Shared, mutable camera-rig numbers (written by CameraRig, read in frames). */
export const rig = { px: 132, visibleH: 6.8, camY: -0.19 };
