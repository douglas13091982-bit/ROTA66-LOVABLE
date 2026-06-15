import { useState, useEffect } from "react";

export function useMobilePortraitOnly() {
  const [isMobile, setIsMobile] = useState(true);
  const [isPortrait, setIsPortrait] = useState(true);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      // Considera mobile até ~768px (tablets pequenos em retrato contam)
      setIsMobile(width <= 768);

      const orientation = (screen.orientation as any)?.type;
      if (orientation) {
        setIsPortrait(orientation.startsWith("portrait"));
      } else {
        // Fallback para navegadores que não suportam screen.orientation
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    };

    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return { isMobile, isPortrait };
}
