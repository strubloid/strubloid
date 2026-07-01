export interface CircularWallSlot<T> {
  item: T;
  index: number;
  depthIndex: number;
}

export function visibleWallCount(totalPages: number): number {
  return Math.min(3, Math.max(0, totalPages));
}

export function wrapWallIndex(index: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return ((index % totalPages) + totalPages) % totalPages;
}

export function circularWallWindow<T>(items: T[], activeIndex: number): CircularWallSlot<T>[] {
  const visibleCount = visibleWallCount(items.length);
  const startIndex = wrapWallIndex(activeIndex, items.length);

  return Array.from({ length: visibleCount }, (_, depthIndex) => {
    const index = wrapWallIndex(startIndex + depthIndex, items.length);
    return {
      item: items[index],
      index,
      depthIndex
    };
  });
}
