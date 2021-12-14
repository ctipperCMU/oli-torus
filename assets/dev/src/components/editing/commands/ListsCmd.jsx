import { Transforms, Editor as SlateEditor, Element } from 'slate';
import { isActiveList, isActive, isTopLevel } from 'components/editing/utils';
import guid from 'utils/guid';
const listCommandMaker = (listType) => {
    return {
        execute: (context, editor) => {
            SlateEditor.withoutNormalizing(editor, () => {
                const active = isActiveList(editor);
                // Not a list, create one
                if (!active) {
                    Transforms.setNodes(editor, { type: 'li' });
                    Transforms.wrapNodes(editor, { type: listType, id: guid(), children: [] });
                    return;
                }
                // Wrong type of list, toggle
                if (!isActive(editor, [listType])) {
                    Transforms.setNodes(editor, { type: listType }, {
                        match: (n) => Element.isElement(n) && n.type === (listType === 'ol' ? 'ul' : 'ol'),
                        mode: 'all',
                    });
                    return;
                }
                // Is a list, unwrap it
                Transforms.unwrapNodes(editor, {
                    match: (n) => Element.isElement(n) && (n.type === 'ul' || n.type === 'ol'),
                    split: true,
                    mode: 'all',
                });
                Transforms.setNodes(editor, { type: 'p' });
            });
        },
        precondition: (editor) => {
            return (isTopLevel(editor) && isActive(editor, ['p'])) || isActiveList(editor);
        },
    };
};
export const ulCommandDesc = {
    type: 'CommandDesc',
    icon: () => 'format_list_bulleted',
    description: () => 'Unordered List (* )',
    command: listCommandMaker('ul'),
    active: (editor) => isActive(editor, ['ul']),
};
export const olCommandDesc = {
    type: 'CommandDesc',
    icon: () => 'format_list_numbered',
    description: () => 'Ordered List (1. )',
    command: listCommandMaker('ol'),
    active: (editor) => isActive(editor, ['ol']),
};
//# sourceMappingURL=ListsCmd.jsx.map