import type React from "react";

type WiredBase = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  elevation?: number | string;
  disabled?: boolean;
  fill?: string;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "wired-card": WiredBase;
      "wired-button": WiredBase;
      "wired-input": WiredBase & {
        placeholder?: string;
        type?: string;
        value?: string;
      };
      "wired-checkbox": WiredBase & { checked?: boolean };
      "wired-radio": WiredBase & { checked?: boolean; name?: string };
      "wired-slider": WiredBase & {
        value?: number | string;
        min?: number | string;
        max?: number | string;
      };
      "wired-tabs": WiredBase & { selected?: string };
      "wired-tab": WiredBase & { name?: string; label?: string };
    }
  }
}

export {};
