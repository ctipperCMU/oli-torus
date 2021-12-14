import React from 'react';
import { ArrowContainer, Popover } from 'react-tiny-popover';
import { useSlate } from 'slate-react';
export const HoveringToolbar = React.memo((props) => {
    var _a;
    const editor = useSlate();
    const arrowSize = 8;
    const content = (<div className="hovering-toolbar" onMouseDown={(e) => e.preventDefault()}>
      <div className="btn-group btn-group-sm" role="group">
        {props.children}
      </div>
    </div>);
    const target = props.target || <span style={{ userSelect: 'none', display: 'none' }}></span>;
    if (!props.isOpen(editor)) {
        return target;
    }
    return (<Popover isOpen={props.isOpen(editor)} align={'center'} padding={5} parentElement={((_a = props.parentRef) === null || _a === void 0 ? void 0 : _a.current) || undefined} content={({ childRect, popoverRect }) => {
            if (props.showArrow) {
                return (<ArrowContainer position={'top'} childRect={childRect} popoverRect={popoverRect} arrowSize={arrowSize} arrowColor="rgb(38,38,37)" 
                // Position the arrow in the middle of the popover
                arrowStyle={{ left: popoverRect.width / 2 - arrowSize }}>
              {content}
            </ArrowContainer>);
            }
            return content;
        }} contentLocation={props.contentLocation
            ? props.contentLocation
            : ({ popoverRect }) => {
                // Position the popover above the center of the selection
                const native = window.getSelection();
                if (!native)
                    return { top: 0, left: 0 };
                const range = native.getRangeAt(0);
                const selectionRect = range.getBoundingClientRect();
                return {
                    top: selectionRect.top + window.pageYOffset - 56,
                    left: selectionRect.left +
                        window.pageXOffset +
                        selectionRect.width / 2 -
                        popoverRect.width / 2,
                };
            }}>
      {target}
    </Popover>);
});
HoveringToolbar.displayName = 'HoveringToolbar';
//# sourceMappingURL=HoveringToolbar.jsx.map