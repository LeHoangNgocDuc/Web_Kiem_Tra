import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    MathJax: any;
  }
}

interface MathTextProps {
  content: string;
  className?: string;
  block?: boolean;
}

const MathText: React.FC<MathTextProps> = ({ content, className = '', block = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fix TypeScript error by checking window.MathJax exists which is now typed
    if (containerRef.current && window.MathJax) {
      // Clean previous typesetting if necessary, though simpler to just queue new typeset
      containerRef.current.innerHTML = content;
      window.MathJax.typesetPromise?.([containerRef.current]).catch((err: any) => console.log('MathJax error:', err));
    }
  }, [content]);

  const Tag = block ? 'div' : 'span';

  return <Tag ref={containerRef} className={`math-content ${className}`} />;
};

export default MathText;