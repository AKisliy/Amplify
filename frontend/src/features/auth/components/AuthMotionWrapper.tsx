"use client";

import { motion } from "framer-motion";

interface AuthMotionWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthMotionWrapper = ({ children, className = "" }: AuthMotionWrapperProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`w-full flex justify-center ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const FadeInStagger = ({ children }: { children: React.ReactNode[] }) => {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className="space-y-4"
    >
      {children.map((child, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0 },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};
