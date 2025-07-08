import {
  type Component,
  createContext,
  createSignal,
  Show,
  useContext,
} from "solid-js";

interface TitleBarContextValue {
  title: () => string;
  setTitle: (title: string) => void;
}

const TitleBarContext = createContext<TitleBarContextValue>();

export const TitleBarProvider: Component<{ children: any }> = (props) => {
  const [title, setTitle] = createSignal("새 대화");

  return (
    <TitleBarContext.Provider value={{ title, setTitle }}>
      {props.children}
    </TitleBarContext.Provider>
  );
};

export const useTitleBar = () => {
  const context = useContext(TitleBarContext);
  if (!context) {
    throw new Error("useTitleBar must be used within TitleBarProvider");
  }
  return context;
};

export const TitleBar: Component = () => {
  const { title } = useTitleBar();

  return (
    <Show when={title() !== ""}>
      <header class="h-14 border-b border-border flex items-center px-6 flex-shrink-0 mt-0.5">
        <h2 class="text-lg font-semibold ml-10">{title()}</h2>
      </header>
    </Show>
  );
};
