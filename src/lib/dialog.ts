import type { Component } from "svelte";
import { writable } from "svelte/store";

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
