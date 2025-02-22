import { saveActivity } from 'apps/authoring/store/activities/actions/saveActivity';
import {
  selectCopiedPart,
  selectPartComponentTypes,
  selectPaths,
  setCopiedPart,
  setRightPanelActiveTab,
} from 'apps/authoring/store/app/slice';
import { addPart } from 'apps/authoring/store/parts/actions/addPart';
import { setCurrentSelection } from 'apps/authoring/store/parts/slice';
import { findInSequenceByResourceId } from 'apps/delivery/store/features/groups/actions/sequence';
import {
  selectCurrentActivityTree,
  selectSequence,
} from 'apps/delivery/store/features/groups/selectors/deck';
import React, { Fragment, useCallback, useState } from 'react';
import { ListGroup, Overlay, OverlayTrigger, Popover, Tooltip } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { clone } from 'utils/common';
import guid from 'utils/guid';
import { RightPanelTabs } from '../RightMenu/RightMenu';

const AddComponentToolbar: React.FC = () => {
  const dispatch = useDispatch();
  const paths = useSelector(selectPaths);
  const imgsPath = paths?.images || '';

  const [showPartsMenu, setShowPartsMenu] = useState(false);
  const [partsMenuTarget, setPartsMenuTarget] = useState(null);

  const availablePartComponents = useSelector(selectPartComponentTypes);
  const currentActivityTree = useSelector(selectCurrentActivityTree);
  const currentSequence = useSelector(selectSequence);
  const copiedPart = useSelector(selectCopiedPart);
  // console.log('AVAILABLE PART COMPONENTS', availablePartComponents);

  const addPartToCurrentScreen = (newPartData: any) => {
    if (currentActivityTree) {
      const [currentActivity] = currentActivityTree.slice(-1);
      dispatch(addPart({ activityId: currentActivity.id, newPartData }));
    }
  };

  const handleAddComponent = useCallback(
    (partComponentType: string) => {
      setShowPartsMenu(false);
      if (!availablePartComponents) {
        return;
      }
      const partComponent = availablePartComponents.find((p) => p.slug === partComponentType);
      if (!partComponent) {
        console.warn(`No part ${partComponentType} found in registry!`, {
          availablePartComponents,
        });
        return;
      }
      const PartClass = customElements.get(partComponent.authoring_element);
      if (PartClass) {
        // only ever add to the current activity, not a layer

        const part = new PartClass() as any;
        const newPartData = {
          id: `${partComponentType}-${guid()}`,
          type: partComponent.delivery_element,
          custom: {
            x: 10,
            y: 10,
            z: 0,
            width: 100,
            height: 100,
          },
        };
        const creationContext = { transform: { ...newPartData.custom } };
        if (part.createSchema) {
          newPartData.custom = { ...newPartData.custom, ...part.createSchema(creationContext) };
        }
        addPartToCurrentScreen(newPartData);
      }
    },
    [availablePartComponents, currentActivityTree, currentSequence],
  );

  // TODO: allow dynamic altering of "frequently used" per user?
  // and/or split based on media query available size?
  // and/or split by other groups?
  const frequentlyUsed = [
    'janus_text_flow',
    'janus_image',
    'janus_mcq',
    'janus_video',
    'janus_input_text',
    'janus_capi_iframe',
  ];

  const handlePartMenuButtonClick = (event: any) => {
    setShowPartsMenu(!showPartsMenu);
    setPartsMenuTarget(event.target);
  };
  const handlePartPasteClick = (event: any) => {
    const newPartData = {
      id: `${copiedPart.type}-${guid()}`,
      type: copiedPart.type,
      custom: copiedPart.custom,
    };
    addPartToCurrentScreen(newPartData);
    dispatch(setCurrentSelection({ selection: newPartData.id }));

    dispatch(setRightPanelActiveTab({ rightPanelActiveTab: RightPanelTabs.COMPONENT }));
  };
  return (
    <Fragment>
      <div className="btn-group align-items-center" role="group">
        {availablePartComponents
          .filter((part) => frequentlyUsed.includes(part.slug))
          .sort((a, b) => {
            const aIndex = frequentlyUsed.indexOf(a.slug);
            const bIndex = frequentlyUsed.indexOf(b.slug);
            return aIndex - bIndex;
          })
          .map((part) => (
            <OverlayTrigger
              key={part.slug}
              placement="bottom"
              delay={{ show: 150, hide: 150 }}
              overlay={
                <Tooltip id="button-tooltip" style={{ fontSize: '12px' }}>
                  <strong>{part.title}</strong>
                  <br />
                  <em>{part.description}</em>
                </Tooltip>
              }
            >
              <span>
                <button className="px-2 btn btn-link" onClick={() => handleAddComponent(part.slug)}>
                  <img src={`${imgsPath}/icons/${part.icon}`}></img>
                </button>
              </span>
            </OverlayTrigger>
          ))}
      </div>
      <div className="btn-group pl-3 ml-3 border-left align-items-center" role="group">
        {copiedPart ? (
          <OverlayTrigger
            placement="bottom"
            delay={{ show: 150, hide: 150 }}
            overlay={
              <Tooltip id="button-tooltip" style={{ fontSize: '12px' }}>
                Paste Component
              </Tooltip>
            }
          >
            <span>
              <button className="px-2 btn btn-link" onClick={handlePartPasteClick}>
                <img src={`${imgsPath}/icons/icon-paste.svg`} width="30px"></img>
              </button>
            </span>
          </OverlayTrigger>
        ) : null}
        <OverlayTrigger
          placement="bottom"
          delay={{ show: 150, hide: 150 }}
          overlay={
            <Tooltip id="button-tooltip" style={{ fontSize: '12px' }}>
              More Components
            </Tooltip>
          }
        >
          <span>
            <button className="px-2 btn btn-link" onClick={handlePartMenuButtonClick}>
              <img src={`${imgsPath}/icons/icon-componentList.svg`}></img>
            </button>
          </span>
        </OverlayTrigger>
        <Overlay
          show={showPartsMenu}
          target={partsMenuTarget}
          placement="bottom"
          container={document.getElementById('advanced-authoring')}
          containerPadding={20}
          rootClose={true}
          onHide={() => setShowPartsMenu(false)}
        >
          <Popover id="moreComponents-popover">
            <Popover.Title as="h3">More Components</Popover.Title>
            <Popover.Content>
              <ListGroup className="aa-parts-list">
                {availablePartComponents
                  .filter((part) => !frequentlyUsed.includes(part.slug))
                  .map((part) => (
                    <ListGroup.Item
                      action
                      onClick={() => handleAddComponent(part.slug)}
                      key={part.slug}
                      className="d-flex align-items-center"
                    >
                      <div className="text-center mr-1 d-inline-block" style={{ minWidth: '36px' }}>
                        <img title={part.description} src={`${imgsPath}/icons/${part.icon}`} />
                      </div>
                      <span className="mr-3">{part.title}</span>
                    </ListGroup.Item>
                  ))}
              </ListGroup>
            </Popover.Content>
          </Popover>
        </Overlay>
      </div>
    </Fragment>
  );
};

export default AddComponentToolbar;
