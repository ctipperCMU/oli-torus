import { ReactEditor } from 'slate-react';
import { Editor, Element, Range, Text } from 'slate';
import {
  getHighestTopLevel,
  getNearestBlock,
  isActive,
  isTopLevel,
} from 'components/editing/utils';

export function inEmptyLine(editor: Editor) {
  const { selection } = editor;
  if (!selection) return false;
  const selectionCollapsed = ReactEditor.isFocused(editor) && Range.isCollapsed(selection);

  console.log('focused', ReactEditor.isFocused(editor), 'collapsed', Range.isCollapsed(selection));

  const inParagraph =
    [
      ...Editor.nodes(editor, {
        match: (n) => {
          if (!Element.isElement(n) || n.type !== 'p') return false;
          return Text.isText(n.children[0]) && n.children[0].text === '';
        },
      }),
    ].length > 0;

  const inTopLevelOrTable =
    isTopLevel(editor) ||
    getHighestTopLevel(editor).caseOf({
      just: (n) => Element.isElement(n) && n.type === 'table',
      nothing: () => false,
    });

  const parentIsValid = inParagraph && inTopLevelOrTable;

  return selectionCollapsed && parentIsValid;
}

export function positionInsertion(el: HTMLElement, editor: Editor) {
  getNearestBlock(editor).lift((block) => {
    el.style.position = 'absolute';
    el.style.opacity = '1';
    const blockNode = $(ReactEditor.toDOMNode(editor, block));

    el.style.top = blockNode.position().top + 'px';

    // There may be a better way to do this, but for now we're special-casing tables
    getHighestTopLevel(editor).lift((topLevel) => {
      const topLevelNode = $(ReactEditor.toDOMNode(editor, topLevel));
      el.style.left = topLevelNode.position().left - 10 + 'px';
      if (isActive(editor, ['table'])) {
        const [match] = Editor.nodes(editor, {
          match: (n) => Element.isElement(n) && n.type === 'tr',
        });
        if (!match) {
          return;
        }
        const [tr] = match;
        el.style.top =
          blockNode.position().top +
          topLevelNode.position().top +
          $(ReactEditor.toDOMNode(editor, tr)).position().top +
          2 +
          'px';
      }
    });
  });
}
