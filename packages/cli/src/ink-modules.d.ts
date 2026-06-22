declare module 'ink' {
  import type { ReactNode, FC } from 'react';

  export interface Key {
    upArrow?: boolean;
    downArrow?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
    return?: boolean;
    escape?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    tab?: boolean;
    backspace?: boolean;
    delete?: boolean;
  }

  export const Box: FC<Record<string, unknown>>;
  export const Text: FC<{ color?: string; bold?: boolean; dimColor?: boolean; wrap?: string; children?: ReactNode }>;
  export function render(tree: ReactNode): { waitUntilExit: () => Promise<void>; unmount: () => void };
  export function useApp(): { exit: (error?: Error) => void };
  export function useInput(handler: (input: string, key: Key) => void): void;
}

declare module 'ink-text-input' {
  import type { ComponentType } from 'react';
  interface Props {
    value: string;
    placeholder?: string;
    focus?: boolean;
    mask?: string;
    onChange: (value: string) => void;
    onSubmit?: (value: string) => void;
  }
  const TextInput: ComponentType<Props>;
  export default TextInput;
}

declare module 'ink-spinner' {
  import type { ComponentType } from 'react';
  interface Props {
    type?: string;
  }
  const Spinner: ComponentType<Props>;
  export default Spinner;
}
