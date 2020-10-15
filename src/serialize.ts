import { LxNodeJSON, LxNodeType } from "./types";

export const serialize = (nodes: LxNodeJSON[]): string => {
    let xml = "";
    if (!nodes || !nodes.length) {
        return xml;
    }
    nodes.forEach((node) => {
        if (node.type === LxNodeType.text) {
            xml += node.content;
            return;
        }
        if (node.type === LxNodeType.cdata) {
            xml += `<![CDATA[${node.content}${node.notClose ? "" : "]]>"}`;
            return;
        }
        if (node.type === LxNodeType.comment) {
            xml += `<!--${node.content}${node.notClose ? "" : "-->"}`;
            return;
        }
        if (node.type === LxNodeType.processingInstruction) {
            xml += `<?${node.name}${
                node.attrs ? " " + serialize(node.attrs).trim() : ""
            }?>`;
            return;
        }
        if (node.type === LxNodeType.attr) {
            let equal = "";
            for (let i = 0; i < (node.equalCount || 0); i++) {
                equal += "=";
            }
            xml += `${node.name || ""}${equal}${node.boundaryChar || ""}${
                node.content || ""
            }${node.boundaryChar || ""} `;
            return;
        }
        if (node.type === LxNodeType.element) {
            xml += `<${node.name || ""}${
                node.attrs ? " " + serialize(node.attrs).trim() : ""
            }${node.selfcloseing && !node.children ? " />" : ">"}${serialize(
                node.children
            )}${!node.selfcloseing ? "</" + node.name + ">" : ""}`;
            return;
        }
    });
    return xml;
};
