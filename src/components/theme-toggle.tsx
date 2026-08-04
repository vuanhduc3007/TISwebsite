"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  return "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("tis-theme") as Theme | null;
    const activeTheme = storedTheme ?? getPreferredTheme();
    setTheme(activeTheme);
    document.documentElement.dataset.theme = activeTheme;
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("tis-theme", nextTheme);
  }

  const label = theme === "light" ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng";

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={label} title={label}>
      {theme === "light" ? <IconMoon size={18} strokeWidth={1.8} /> : <IconSun size={18} strokeWidth={1.8} />}
    </button>
  );
}
