// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('./manifest.json');
import register from '../customElementWrapper';
import { customEvents as apiCustomEvents, observedAttributes as apiObservedAttributes, } from '../partsApi';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
const observedAttributes = [...apiObservedAttributes];
const customEvents = Object.assign({}, apiCustomEvents);
register(MultipleChoiceQuestion, manifest.delivery.element, observedAttributes, {
    customEvents,
    shadow: false,
});
//# sourceMappingURL=delivery-entry.js.map