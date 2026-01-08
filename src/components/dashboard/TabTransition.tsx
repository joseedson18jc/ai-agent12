import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

interface TabTransitionProps {
  children: ReactNode;
  tabKey: string;
}

const tabVariants: Variants = {
  initial: {
    opacity: 0,
    y: 40,
    scale: 0.98,
    filter: 'blur(8px)'
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 150,
      mass: 0.8,
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.98,
    filter: 'blur(6px)',
    transition: {
      duration: 0.25,
      ease: 'easeInOut'
    }
  }
};

export const itemVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 120
    }
  }
};

export const TabTransition = ({ children, tabKey }: TabTransitionProps) => {
  return (
    <motion.div
      key={tabKey}
      variants={tabVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

// Staggered container for multiple items
export const StaggerContainer = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      variants={{
        animate: {
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1
          }
        }
      }}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Animated item for use within containers
export const AnimatedItem = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
};
