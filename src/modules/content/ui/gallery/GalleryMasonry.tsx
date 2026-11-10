"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";
import type { GalleryPhoto } from "@/modules/content/domain/gallery";
import styles from "./GalleryView.module.css";

export function GalleryMasonry({
  photos,
  children,
}: {
  photos: readonly GalleryPhoto[];
  children: (photo: GalleryPhoto, index: number) => ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const grid = root.current?.firstElementChild;
    if (!(grid instanceof HTMLElement)) return;

    let cards: HTMLElement[] = [];
    let measuredWidth = 0;
    function pack() {
      if (!(grid instanceof HTMLElement)) return;
      const css = getComputedStyle(grid);
      const columns = Number(css.getPropertyValue("--gallery-columns"));
      const rowGap = Number.parseFloat(css.rowGap);
      const columnGap = Number.parseFloat(css.columnGap);
      measuredWidth = grid.getBoundingClientRect().width;
      if (!measuredWidth || !columns || !cards.length) return;
      const columnWidth = (measuredWidth - (columns - 1) * columnGap) / columns;
      const offsets = Array<number>(columns).fill(0);
      grid.dataset.packed = "true";
      // Measure after applying the responsive track width, before writing positions.
      const heights = cards.map((card) => card.getBoundingClientRect().height);
      for (const [index, card] of cards.entries()) {
        const column = offsets.indexOf(Math.min(...offsets));
        card.style.setProperty(
          "--gallery-x",
          `${column * (columnWidth + columnGap)}px`,
        );
        card.style.setProperty("--gallery-y", `${offsets[column]}px`);
        offsets[column] += heights[index] + rowGap;
      }
      grid.style.setProperty(
        "--gallery-height",
        `${Math.max(...offsets) - rowGap}px`,
      );
    }

    const resize = new ResizeObserver((entries) => {
      if (
        entries.some(({ target }) => target !== grid) ||
        grid.getBoundingClientRect().width !== measuredWidth
      )
        pack();
    });
    function observeCards() {
      if (!(grid instanceof HTMLElement)) return;
      resize.disconnect();
      cards = Array.from(grid.children).filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      );
      if (!cards.length) {
        delete grid.dataset.packed;
        grid.style.removeProperty("--gallery-height");
      }
      pack();
      resize.observe(grid);
      cards.forEach((card) => resize.observe(card));
    }
    // ProgressiveList only appends its next batch; no need to watch descendants or attributes.
    const mutations = new MutationObserver(observeCards);
    mutations.observe(grid, { childList: true });
    observeCards();
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, []);

  return (
    <div ref={root}>
      <ProgressiveList
        items={photos}
        className={`masonry-gallery ${styles.masonry}`}
      >
        {children}
      </ProgressiveList>
    </div>
  );
}
