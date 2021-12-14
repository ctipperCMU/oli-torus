import React from 'react';
import { HtmlContentModelRenderer } from 'data/content/writers/renderer';
import { Card } from 'components/misc/Card';
export const HintsDelivery = ({ isEvaluated, hints, hasMoreHints, context, onClick, shouldShow = true, }) => {
    if (!shouldShow) {
        return null;
    }
    // Display nothing if the question has no hints, meaning no hints have been requested so far
    // and there are no more available to be requested
    const noHintsRequested = hints.length === 0;
    if (noHintsRequested && !hasMoreHints) {
        return null;
    }
    return (<Card.Card className="hints">
      <Card.Title>Hints</Card.Title>
      <Card.Content>
        {hints.map((hint, index) => (<div aria-label={`hint ${index + 1}`} key={hint.id} className="d-flex align-items-center mb-2">
            <span className="mr-2">{index + 1}.</span>
            <HtmlContentModelRenderer content={hint.content} context={context}/>
          </div>))}
        {hasMoreHints && (<button aria-label="request hint" onClick={onClick} disabled={isEvaluated || !hasMoreHints} className="btn btn-sm btn-link" style={{ padding: 0 }}>
            Request Hint
          </button>)}
      </Card.Content>
    </Card.Card>);
};
//# sourceMappingURL=HintsDelivery.jsx.map