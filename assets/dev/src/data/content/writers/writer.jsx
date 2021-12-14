import React from 'react';
import { Text } from 'slate';
export function isContentItem(value) {
    return value && value.type === 'content' && value.children !== undefined;
}
export class ContentWriter {
    render(context, content, impl) {
        if (Array.isArray(content)) {
            return (<>
          {content.map((item, i) => (<React.Fragment key={item.type + String(i)}>
              {this.render(context, item, impl)}
            </React.Fragment>))}
        </>);
        }
        if (isContentItem(content)) {
            return (<>
          {content.children.map((child) => (<React.Fragment key={child.id}>{this.render(context, child, impl)}</React.Fragment>))}
        </>);
        }
        if (Text.isText(content)) {
            return impl.text(context, content);
        }
        const next = () => this.render(context, content.children, impl);
        switch (content.type) {
            case 'p':
                return impl.p(context, next, content);
            case 'h1':
                return impl.h1(context, next, content);
            case 'h2':
                return impl.h2(context, next, content);
            case 'h3':
                return impl.h3(context, next, content);
            case 'h4':
                return impl.h4(context, next, content);
            case 'h5':
                return impl.h5(context, next, content);
            case 'h6':
                return impl.h6(context, next, content);
            case 'img':
                return impl.img(context, next, content);
            case 'youtube':
                return impl.youtube(context, next, content);
            case 'iframe':
                return impl.iframe(context, next, content);
            case 'audio':
                return impl.audio(context, next, content);
            case 'table':
                return impl.table(context, next, content);
            case 'tr':
                return impl.tr(context, next, content);
            case 'th':
                return impl.th(context, next, content);
            case 'td':
                return impl.td(context, next, content);
            case 'ol':
                return impl.ol(context, next, content);
            case 'ul':
                return impl.ul(context, next, content);
            case 'li':
                return impl.li(context, next, content);
            case 'math':
                return impl.math(context, next, content);
            case 'math_line':
                return impl.mathLine(context, next, content);
            case 'code':
                return impl.code(context, next, content);
            case 'code_line':
                return impl.codeLine(context, next, content);
            case 'blockquote':
                return impl.blockquote(context, next, content);
            case 'a':
                return impl.a(context, next, content);
            case 'input_ref':
                return impl.inputRef(context, next, content);
            case 'popup':
                return impl.popup(context, next, () => this.render(context, content.content, impl), content);
            default:
                return impl.unsupported(context, content);
        }
    }
}
//# sourceMappingURL=writer.jsx.map