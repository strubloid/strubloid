'use client';

import styles from './LoadingSkeleton.module.scss';

export function ChatSkeleton() {
  return (
    <div className={styles.chatSkeleton}>
      <div className={styles.chatHeader}>
        <div className={`${styles.skeleton} ${styles.headerLine}`} />
      </div>
      <div className={styles.chatMessages}>
        <div className={`${styles.skeleton} ${styles.messageBubble} ${styles.right}`} />
        <div className={`${styles.skeleton} ${styles.messageBubble} ${styles.left}`} style={{ width: '45%' }} />
        <div className={`${styles.skeleton} ${styles.messageBubble} ${styles.right}`} style={{ width: '50%' }} />
        <div className={`${styles.skeleton} ${styles.messageBubble} ${styles.left}`} style={{ width: '55%' }} />
        <div className={`${styles.skeleton} ${styles.messageBubble} ${styles.right}`} style={{ width: '35%' }} />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.listSkeleton}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${styles.skeleton} ${styles.cardSkeleton}`} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className={styles.pageSkeleton}>
      <div className={styles.skeleton} style={{ height: 28, width: 200 }} />
      <div className={styles.skeleton} style={{ height: 16, width: 300 }} />
      <div style={{ height: 24 }} />
      <div className={`${styles.skeleton} ${styles.cardSkeleton}`} />
      <div className={`${styles.skeleton} ${styles.cardSkeleton}`} />
      <div className={`${styles.skeleton} ${styles.cardSkeleton}`} />
    </div>
  );
}
