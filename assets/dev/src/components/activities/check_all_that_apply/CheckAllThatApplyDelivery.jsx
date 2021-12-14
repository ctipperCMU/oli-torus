import { Checkbox } from 'components/misc/icons/checkbox/Checkbox';
import { initialPartInputs, isCorrect } from 'data/activities/utils';
import { initializeState, isEvaluated, setSelection, activityDeliverySlice, resetAction, } from 'data/activities/DeliveryState';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { configureStore } from 'state/store';
import { DeliveryElement, DeliveryElementProvider, useDeliveryElementContext, } from '../DeliveryElement';
import { ResetButtonConnected } from 'components/activities/common/delivery/reset_button/ResetButtonConnected';
import { SubmitButtonConnected } from 'components/activities/common/delivery/submit_button/SubmitButtonConnected';
import { HintsDeliveryConnected } from 'components/activities/common/hints/delivery/HintsDeliveryConnected';
import { EvaluationConnected } from 'components/activities/common/delivery/evaluation/EvaluationConnected';
import { GradedPointsConnected } from 'components/activities/common/delivery/graded_points/GradedPointsConnected';
import { StemDeliveryConnected } from 'components/activities/common/stem/delivery/StemDelivery';
import { ChoicesDeliveryConnected } from 'components/activities/common/choices/delivery/ChoicesDeliveryConnected';
import { DEFAULT_PART_ID } from 'components/activities/common/utils';
export const CheckAllThatApplyComponent = () => {
    const { state: activityState, onResetActivity, onSaveActivity, } = useDeliveryElementContext();
    const uiState = useSelector((state) => state);
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(initializeState(activityState, initialPartInputs(activityState)));
    }, []);
    // First render initializes state
    if (!uiState.partState) {
        return null;
    }
    return (<div className={`activity cata-activity ${isEvaluated(uiState) ? 'evaluated' : ''}`}>
      <div className="activity-content">
        <StemDeliveryConnected />
        <GradedPointsConnected />
        <ChoicesDeliveryConnected partId={DEFAULT_PART_ID} unselectedIcon={<Checkbox.Unchecked disabled={isEvaluated(uiState)}/>} selectedIcon={!isEvaluated(uiState) ? (<Checkbox.Checked />) : isCorrect(uiState.attemptState) ? (<Checkbox.Correct />) : (<Checkbox.Incorrect />)} onSelect={(id) => dispatch(setSelection(DEFAULT_PART_ID, id, onSaveActivity, 'multiple'))}/>
        <ResetButtonConnected onReset={() => dispatch(resetAction(onResetActivity, { [DEFAULT_PART_ID]: [] }))}/>
        <SubmitButtonConnected />
        <HintsDeliveryConnected partId={DEFAULT_PART_ID}/>
        <EvaluationConnected />
      </div>
    </div>);
};
// Defines the web component, a simple wrapper over our React component above
export class CheckAllThatApplyDelivery extends DeliveryElement {
    render(mountPoint, props) {
        const store = configureStore({}, activityDeliverySlice.reducer);
        ReactDOM.render(<Provider store={store}>
        <DeliveryElementProvider {...props}>
          <CheckAllThatApplyComponent />
        </DeliveryElementProvider>
      </Provider>, mountPoint);
    }
}
// Register the web component:
// eslint-disable-next-line
const manifest = require('./manifest.json');
window.customElements.define(manifest.delivery.element, CheckAllThatApplyDelivery);
//# sourceMappingURL=CheckAllThatApplyDelivery.jsx.map