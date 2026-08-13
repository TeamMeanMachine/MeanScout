import { createContext, type Component } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { writable } from "svelte/store";

// Beta

export namespace Dialog {
  export type Exports = {
    onformsubmit?: () => void | Promise<void>;
  };

  export type Content = Component<any, Exports>;
  export type Props = { [key: string]: any };
}

let stack = new SvelteMap<Dialog.Content, Dialog.Props | undefined>();

function open(Content: Component<{}, Dialog.Exports>): void;
function open<Props extends Dialog.Props>(Content: Component<Props, Dialog.Exports>, props: Props): void;

function open<Props extends Dialog.Props>(Content: Component<Props, Dialog.Exports>, props?: Props) {
  stack.set(Content, props);
}

const [getContext, setContext] = createContext<{ close: () => void }>();

export const Dialog = { stack, open, getContext, setContext };

// Legacy

export type DialogExports = {
  onopen?(open: () => void): void | Promise<void>;
  onconfirm?(): void | Promise<void>;
};

export type DialogState = {
  component: Component<any, DialogExports>;
  props: Record<string, any>;
};

const dialogStack = writable<DialogState[]>([]);

export function subscribeDialog(subscriber: (state: DialogState[]) => void) {
  dialogStack.subscribe(subscriber);
}

export function openDialog<Props extends Record<string, any>>(
  component: Component<Props, DialogExports>,
  props: Props,
) {
  dialogStack.update((stack) => {
    stack.push({ component, props });
    return stack;
  });
}

export function closeDialog() {
  dialogStack.update((stack) => {
    stack.pop();
    return stack;
  });
}

export function closeAllDialogs() {
  dialogStack.set([]);
}
