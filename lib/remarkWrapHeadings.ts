import { visit } from "unist-util-visit";
import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type { Plugin } from "unified";

/**
 * remark plugin: Wraps heading sections (from heading to next same-level heading) in a div with an id.
 * - Wraps h2/h3 (and deeper).
 * - The id is generated from the heading text (GitHub slug).
 * - Handles nesting: lower-level headings become nested divs.
 * - The div includes the heading node itself and all following nodes until the next heading of the same or higher level or end of document.
 */
const remarkWrapHeadings: Plugin = () => {
  return (tree: any) => {
    const slugger = new GithubSlugger();

    /**
     * Recursively process nodes to build nested sections.
     * @param nodes The flat list of nodes.
     * @param currentLevel The heading level to group (e.g. 2 for h2).
     * @returns Array of nodes, with heading sections wrapped.
     */
    function wrapSections(nodes: any[], currentLevel: number): any[] {
      const result: any[] = [];
      let i = 0;
      while (i < nodes.length) {
        const node = nodes[i];
        if (node.type === "heading" && node.depth >= currentLevel) {
          const headingLevel = node.depth;
          const headingText = toString(node);
          const id = slugger.slug(headingText);

          // Find all nodes until next heading of same or higher level
          const sectionNodes: any[] = [node];
          let j = i + 1;
          while (
            j < nodes.length &&
            !(nodes[j].type === "heading" && nodes[j].depth <= headingLevel)
          ) {
            sectionNodes.push(nodes[j]);
            j++;
          }

          // Recursively process lower-level headings inside this section
          const children = wrapSections(sectionNodes.slice(1), headingLevel + 1);

          // Wrap in a div (custom mdast node)
          result.push({
            type: "section",
            data: { hProperties: { id } },
            children: [node, ...children],
          });

          i = j;
        } else {
          result.push(node);
          i++;
        }
      }
      return result;
    }

    // Process all nodes starting from top-level (usually h2 or h3)
    tree.children = wrapSections(tree.children, 2);
  };
};

export default remarkWrapHeadings;