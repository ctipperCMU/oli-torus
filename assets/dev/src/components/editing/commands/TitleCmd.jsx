import { Element, Transforms } from 'slate';
import { getNearestBlock, isActive, isTopLevel } from '../utils';
const parentTextTypes = {
    p: true,
    h1: true,
    // h2 through h6 are for legacy support
    h2: true,
    h3: true,
    h4: true,
    h5: true,
    h6: true,
};
const selectedType = (editor) => getNearestBlock(editor).caseOf({
    just: (n) => (Element.isElement(n) && parentTextTypes[n.type] ? n.type : 'p'),
    nothing: () => 'p',
});
const command = {
    execute: (context, editor) => {
        const nextType = ((selected) => {
            switch (selected) {
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    return 'p';
                case 'h1':
                    return 'h2';
                default:
                    return 'h1';
            }
        })(selectedType(editor));
        Transforms.setNodes(editor, { type: nextType }, { match: (n) => Element.isElement(n) && parentTextTypes[n.type] });
    },
    precondition: (editor) => {
        return isTopLevel(editor) && isActive(editor, Object.keys(parentTextTypes));
    },
};
const icon = (editor) => {
    const type = selectedType(editor);
    switch (type) {
        case 'h1':
            return 'title';
        case 'h2':
            return 'text_fields';
        default:
            return 'title';
    }
};
export const commandDesc = {
    type: 'CommandDesc',
    icon,
    description: () => 'Title (# or ##)',
    command,
    active: (editor) => isActive(editor, ['h1', 'h2']),
};
//# sourceMappingURL=TitleCmd.jsx.map