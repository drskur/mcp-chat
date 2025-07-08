import {
  createContext,
  createSignal,
  onMount,
  type ParentComponent,
  useContext,
} from "solid-js";
import { isServer } from "solid-js/web";
import type { Theme } from "@/types/config";

interface ThemeContextType {
  theme: () => Theme;
  saveTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>();

export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setTheme] = createSignal<Theme>("light");

  // 테마를 HTML 요소에 적용
  const applyTheme = (appliedTheme: Theme) => {
    if (!isServer) {
      const root = document.documentElement;
      if (appliedTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const saveTheme = (theme: Theme) => {
    if (!isServer) {
      localStorage.setItem("theme", theme);
      setTheme(theme);
      applyTheme(theme);
    }
  };

  onMount(async () => {
    if (!isServer) {
      const savedTheme = (localStorage.getItem("theme") as Theme) ?? "light";
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  });

  const value: ThemeContextType = {
    theme,
    saveTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
