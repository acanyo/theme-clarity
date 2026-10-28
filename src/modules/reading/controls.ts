export function readingButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "reading-action";
  button.textContent = label;
  return button;
}
