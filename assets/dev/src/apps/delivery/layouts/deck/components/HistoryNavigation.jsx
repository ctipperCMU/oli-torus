/* eslint-disable react/prop-types */
import React, { Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { defaultGlobalEnv, getEnvState } from '../../../../../adaptivity/scripting';
import { selectCurrentActivityId } from '../../../store/features/activities/slice';
import { setHistoryNavigationTriggered, setRestartLesson, } from '../../../store/features/adaptivity/slice';
import { navigateToActivity } from '../../../store/features/groups/actions/deck';
import { selectSequence } from '../../../store/features/groups/selectors/deck';
import { selectEnableHistory, selectShowHistory, setShowHistory, } from '../../../store/features/page/slice';
import HistoryPanel from './HistoryPanel';
const HistoryNavigation = () => {
    var _a;
    const currentActivityId = useSelector(selectCurrentActivityId);
    const enableHistory = useSelector(selectEnableHistory);
    const showHistory = useSelector(selectShowHistory);
    const sequences = useSelector(selectSequence);
    const dispatch = useDispatch();
    const restartHandler = () => {
        dispatch(setRestartLesson({ restartLesson: true }));
    };
    const minimizeHandler = () => {
        dispatch(setShowHistory({ show: !showHistory }));
    };
    const snapshot = getEnvState(defaultGlobalEnv);
    // Get the activities student visited
    const globalSnapshot = (_a = Object.keys(snapshot)
        .filter((key) => key.indexOf('session.visitTimestamps.') === 0)) === null || _a === void 0 ? void 0 : _a.reverse().map((entry) => entry.split('.')[2]);
    // Get the activity names and ids to be displayed in the history panel
    const historyItems = globalSnapshot === null || globalSnapshot === void 0 ? void 0 : globalSnapshot.map((activityId) => {
        var _a, _b, _c;
        const foundSequence = sequences.filter((sequence) => { var _a; return ((_a = sequence.custom) === null || _a === void 0 ? void 0 : _a.sequenceId) === activityId; })[0];
        return {
            id: (_a = foundSequence.custom) === null || _a === void 0 ? void 0 : _a.sequenceId,
            name: ((_b = foundSequence.custom) === null || _b === void 0 ? void 0 : _b.sequenceName) || foundSequence.id,
            timestamp: snapshot[`session.visitTimestamps.${(_c = foundSequence.custom) === null || _c === void 0 ? void 0 : _c.sequenceId}`],
        };
    });
    const currentHistoryActivityIndex = historyItems.findIndex((item) => item.id === currentActivityId);
    const isFirst = currentHistoryActivityIndex === historyItems.length - 1;
    const isLast = currentHistoryActivityIndex === 0;
    const nextHandler = () => {
        const prevActivity = historyItems[currentHistoryActivityIndex - 1];
        dispatch(navigateToActivity(prevActivity.id));
        const nextHistoryActivityIndex = historyItems.findIndex((item) => item.id === prevActivity.id);
        dispatch(setHistoryNavigationTriggered({
            historyModeNavigation: nextHistoryActivityIndex !== 0,
        }));
    };
    const prevHandler = () => {
        const prevActivity = historyItems[currentHistoryActivityIndex + 1];
        dispatch(navigateToActivity(prevActivity.id));
        dispatch(setHistoryNavigationTriggered({
            historyModeNavigation: true,
        }));
    };
    return (<Fragment>
      {enableHistory ? (<div className="historyStepView pullLeftInCheckContainer">
          <div className="historyStepContainer">
            <button onClick={prevHandler} className="backBtn historyStepButton" aria-label="Previous screen" disabled={isFirst}>
              <span className="icon-chevron-left"/>
            </button>
            <button onClick={nextHandler} className="nextBtn historyStepButton" aria-label="Next screen" disabled={isLast}>
              <span className="icon-chevron-right"/>
            </button>
          </div>
        </div>) : null}
      <div className={[
            'navigationContainer',
            enableHistory ? undefined : 'pullLeftInCheckContainer',
        ].join(' ')}>
        <aside className={`ui-resizable ${showHistory ? undefined : 'minimized'}`}>
          {enableHistory ? (<Fragment>
              <button onClick={minimizeHandler} className="navigationToggle" aria-label="Show lesson history" aria-haspopup="true" aria-controls="theme-history-panel" aria-pressed="false"/>

              <HistoryPanel items={historyItems} onMinimize={minimizeHandler} onRestart={restartHandler}/>
            </Fragment>) : (<button onClick={restartHandler} className="theme-no-history-restart">
              <span>
                <div className="theme-no-history-restart__icon"/>
                <span className="theme-no-history-restart__label">Restart Lesson</span>
              </span>
            </button>)}
        </aside>
      </div>
    </Fragment>);
};
export default HistoryNavigation;
//# sourceMappingURL=HistoryNavigation.jsx.map