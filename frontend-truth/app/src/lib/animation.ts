export const ANIMATION = {
  duration: {
    fast: 0.15,
    normal: 0.2,
    slow: 0.3,
    chart: 1,
  },
  ease: {
    default: [0.4, 0, 0.2, 1] as [number, number, number, number],
    bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
    easeOut: [0, 0, 0.2, 1] as [number, number, number, number],
  },
  stagger: 0.05,
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: ANIMATION.duration.slow, ease: ANIMATION.ease.default },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: ANIMATION.duration.normal },
};

export const slideInLeft = {
  initial: { x: -72, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { duration: ANIMATION.duration.slow, ease: ANIMATION.ease.easeOut },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: ANIMATION.stagger,
    },
  },
};

export const cardHover = {
  scale: 1.01,
  boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
  transition: { duration: ANIMATION.duration.normal },
};
