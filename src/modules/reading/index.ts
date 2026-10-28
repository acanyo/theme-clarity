import { mountCodeBlocks } from "./code-blocks";
import { mountTables } from "./tables";
import { mountDiagrams } from "./diagrams";

let cleanup: (() => void) | undefined;

export function initReading() {
  cleanup?.();
  const cleanups = [mountDiagrams(document), mountCodeBlocks(document), mountTables(document)];
  cleanup = () => cleanups.forEach((destroy) => destroy());
}
