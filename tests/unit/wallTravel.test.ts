import { describe, expect, it } from 'vitest';
import { circularWallWindow, visibleWallCount, wrapWallIndex } from '@/lib/hallway/wallTravel';

describe('hallway circular wall travel', () => {
  it('shows up to three wall panels without hiding the third panel', () => {
    expect(visibleWallCount(0)).toBe(0);
    expect(visibleWallCount(1)).toBe(1);
    expect(visibleWallCount(2)).toBe(2);
    expect(visibleWallCount(3)).toBe(3);
    expect(visibleWallCount(8)).toBe(3);
  });

  it('wraps active wall indexes in both directions', () => {
    expect(wrapWallIndex(5, 5)).toBe(0);
    expect(wrapWallIndex(6, 5)).toBe(1);
    expect(wrapWallIndex(-1, 5)).toBe(4);
    expect(wrapWallIndex(-6, 5)).toBe(4);
  });

  it('cycles five wall panels through a three-panel tunnel window', () => {
    const pages = ['1', '2', '3', '4', '5'];

    expect(circularWallWindow(pages, 0).map((slot) => slot.item)).toEqual(['1', '2', '3']);
    expect(circularWallWindow(pages, 1).map((slot) => slot.item)).toEqual(['2', '3', '4']);
    expect(circularWallWindow(pages, 2).map((slot) => slot.item)).toEqual(['3', '4', '5']);
    expect(circularWallWindow(pages, 3).map((slot) => slot.item)).toEqual(['4', '5', '1']);
    expect(circularWallWindow(pages, 4).map((slot) => slot.item)).toEqual(['5', '1', '2']);
    expect(circularWallWindow(pages, 5).map((slot) => slot.item)).toEqual(['1', '2', '3']);
  });

  it('returns original indexes for wrapped panels so labels stay truthful', () => {
    const window = circularWallWindow(['1', '2', '3', '4', '5'], 3);

    expect(window.map((slot) => slot.index)).toEqual([3, 4, 0]);
    expect(window.map((slot) => slot.depthIndex)).toEqual([0, 1, 2]);
  });
});
