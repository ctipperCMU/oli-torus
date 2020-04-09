import * as Immutable from 'immutable';
import React, { useState, useReducer } from 'react';
import { ResourceContent, ResourceType } from 'data/content/resource';
import { Objective } from 'data/content/objective';
import { ActivityEditorMap } from 'data/content/editors';
import { useLock } from '../utils/useLock';
import { useDeferredPersistence } from '../utils/useDeferredPersistence';
import { Editors } from './Editors';
import { Outline } from './Outline';
import { TitleBar } from './TitleBar';
import { ProjectSlug, ResourceSlug } from 'data/types';
import { makeRequest } from 'data/persistence/common';
import { undoReducer, undo, redo, update, UndoState } from './undo';

export type ResourceEditorProps = {
  resourceType: ResourceType,     // Page or assessment?
  authorEmail: string,            // The current author
  projectSlug: ProjectSlug,         // The current project
  resourceSlug: ResourceSlug,       // The current resource
  title: string,                  // The title of the resource
  content: ResourceContent[],     // Content of the resource
  objectives: Objective[],        // Attached objectives
  allObjectives: Objective[],     // All objectives
  editorMap: ActivityEditorMap,   // Map of activity types to activity elements
};

function issueSaveRequest(project: ProjectSlug, resource: ResourceSlug, body: any) {
  const params = {
    method: 'PUT',
    body: JSON.stringify({ update: body }),
    url: `/project/${project}/${resource}/edit`,
  };

  return makeRequest(params);
}

// The resource editor
export const ResourceEditor = (props: ResourceEditorProps) => {

  const { projectSlug, resourceSlug, editorMap } = props;

  const [title, setTitle] = useState(props.title);
  const lock = useLock(props.projectSlug, props.resourceSlug);

  const [state, dispatch] = useReducer(undoReducer, {
    current: Immutable.List<ResourceContent>(props.content),
    undoStack: Immutable.Stack<Immutable.List<ResourceContent>>(),
    redoStack: Immutable.Stack<Immutable.List<ResourceContent>>(),
  } as UndoState);

  const status = useDeferredPersistence(
    issueSaveRequest.bind(undefined, projectSlug, resourceSlug), state.current);

  const onEdit = (content: Immutable.List<ResourceContent>) => {
    dispatch(update(content));
  };

  const onTitleEdit = (title: string) => {
    setTitle(title);
    issueSaveRequest(projectSlug, resourceSlug, { title });
  };

  const onAddItem = (c : ResourceContent) => dispatch(update(state.current.push(c)));

  return (
    <div>
      <TitleBar
        onUndo={() => dispatch(undo())}
        onRedo={() => dispatch(redo())}
        canUndo={state.undoStack.size > 0}
        canRedo={state.redoStack.size > 0}
        title={title}
        onTitleEdit={onTitleEdit}
        onAddItem={onAddItem}
        editMode={lock.editMode}
        editorMap={editorMap}/>

      <div className="d-flex flex-row align-items-baseline">
        {
        // We only show the outline if there is more than one content element in the resource
        state.current.size > 0
          ? <Outline {...props} editMode={lock.editMode}
          onEdit={c => onEdit(c)} content={state.current}/>
          : null
        }
        <Editors {...props} editMode={lock.editMode}
          onEdit={c => onEdit(c)} content={state.current}/>
      </div>
    </div>
  );

};
