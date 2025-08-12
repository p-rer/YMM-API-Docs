import { visit } from "unist-util-visit";
import type { Plugin } from "unified";

/**
 * remark plugin: Removes the first h1 heading (depth === 1) from the Markdown AST.
 */
const remarkRemoveFirstH1: Plugin = () => {
  return (tree: any) => {
    let firstH1Index: number | null = null;
    // Find index of the first h1
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === "heading" && node.depth === 1) {
        firstH1Index = i;
        break;
      }
    }
    // Remove it if found
    if (firstH1Index !== null) {
      tree.children.splice(firstH1Index, 1);
    }
  };
};

export default remarkRemoveFirstH1;