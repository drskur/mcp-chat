import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type {
  SliderFillProps,
  SliderRootProps,
  SliderThumbProps,
  SliderTrackProps,
} from "@kobalte/core/slider";
import { Slider as SliderPrimitive } from "@kobalte/core/slider";
import type { ParentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type sliderRootProps<T extends ValidComponent = "div"> = SliderRootProps<T> & {
  class?: string;
};

export const Slider = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, sliderRootProps<T>>,
) => {
  const [local, rest] = splitProps(props as sliderRootProps, ["class"]);

  return (
    <SliderPrimitive
      class={cn(
        "relative flex w-full touch-none select-none items-center",
        local.class,
      )}
      {...rest}
    />
  );
};

type sliderTrackProps<T extends ValidComponent = "div"> =
  SliderTrackProps<T> & {
    class?: string;
  };

export const SliderTrack = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, sliderTrackProps<T>>,
) => {
  const [local, rest] = splitProps(props as sliderTrackProps, ["class"]);

  return (
    <SliderPrimitive.Track
      class={cn(
        "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20",
        local.class,
      )}
      {...rest}
    />
  );
};

type sliderFillProps<T extends ValidComponent = "div"> = SliderFillProps<T> & {
  class?: string;
};

export const SliderFill = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, sliderFillProps<T>>,
) => {
  const [local, rest] = splitProps(props as sliderFillProps, ["class"]);

  return (
    <SliderPrimitive.Fill
      class={cn("absolute h-full bg-primary", local.class)}
      {...rest}
    />
  );
};

type sliderThumbProps<T extends ValidComponent = "span"> = ParentProps<
  SliderThumbProps<T> & { class?: string }
>;

export const SliderThumb = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, sliderThumbProps<T>>,
) => {
  const [local, rest] = splitProps(props as sliderThumbProps, [
    "class",
    "children",
  ]);

  return (
    <SliderPrimitive.Thumb
      class={cn(
        "block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        local.class,
      )}
      {...rest}
    >
      {local.children}
      <SliderPrimitive.Input />
    </SliderPrimitive.Thumb>
  );
};
