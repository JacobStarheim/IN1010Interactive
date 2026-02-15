/* eslint-disable @next/next/no-img-element */

import styles from "@/components/exam/page-image-stack.module.css";

type Props = {
  pages: string[];
  label: string;
};

export function PageImageStack({ pages, label }: Props) {
  return (
    <div className={styles.stack} aria-label={label}>
      {pages.map((page, index) => (
        <figure key={page} className={styles.figure}>
          <img
            src={page}
            alt={`${label} side ${index + 1}`}
            className={styles.image}
            loading={index === 0 ? "eager" : "lazy"}
          />
        </figure>
      ))}
    </div>
  );
}
