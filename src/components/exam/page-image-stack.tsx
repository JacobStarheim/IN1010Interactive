/* eslint-disable @next/next/no-img-element */

import styles from "@/components/exam/page-image-stack.module.css";
import { getPageCrop } from "@/lib/page-crops";

type Props = {
  pages: string[];
  label: string;
};

export function PageImageStack({ pages, label }: Props) {
  return (
    <div className={styles.stack} aria-label={label}>
      {pages.map((page, index) => (
        <figure key={page} className={styles.figure}>
          {(() => {
            const crop = getPageCrop(page);
            return (
              <div
                className={styles.cropFrame}
                style={{
                  aspectRatio: `${crop.width} / ${crop.height * crop.bottom}`,
                }}
              >
                <img
                  src={page}
                  alt={`${label} side ${index + 1}`}
                  className={styles.image}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
            );
          })()}
        </figure>
      ))}
    </div>
  );
}
