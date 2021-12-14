import Form from '@rjsf/bootstrap-4';
import { diff } from 'deep-object-diff';
import { at } from 'lodash';
import React, { Fragment, useEffect, useState } from 'react';
import ColorPickerWidget from './custom/ColorPickerWidget';
import CustomCheckbox from './custom/CustomCheckbox';
import ScreenDropdownTemplate from './custom/ScreenDropdownTemplate';
const widgets = {
    ColorPicker: ColorPickerWidget,
    CheckboxWidget: CustomCheckbox,
    ScreenDropdownTemplate: ScreenDropdownTemplate,
};
const PropertyEditor = ({ schema, uiSchema, value, onChangeHandler, triggerOnChange = false, }) => {
    const [formData, setFormData] = useState(value);
    const findDiffType = (changedProp) => {
        const diffType = Object.values(changedProp);
        if (typeof diffType[0] === 'object') {
            return findDiffType(diffType[0]);
        }
        return typeof diffType[0];
    };
    useEffect(() => {
        setFormData(value);
    }, [value]);
    return (<Form schema={schema} formData={formData} onChange={(e) => {
            const updatedData = e.formData;
            const changedProp = diff(formData, updatedData);
            const changedPropType = findDiffType(changedProp);
            setFormData(updatedData);
            if (triggerOnChange || changedPropType === 'boolean') {
                // because 'id' is used to maintain selection, it MUST be onBlur or else bad things happen
                if (updatedData.id === formData.id) {
                    /* console.log('ONCHANGE P EDITOR TRIGGERED', {
                      e,
                      updatedData,
                      changedProp,
                      changedPropType,
                      triggerOnChange,
                    }); */
                    onChangeHandler(updatedData);
                }
            }
        }} onBlur={(key, changed) => {
            // key will look like root_Position_x
            // changed will be the new value
            // formData will be the current state of the form
            const dotPath = key.replace(/_/g, '.').replace('root.', '');
            const [newValue] = at(value, dotPath);
            // console.log('ONBLUR', { key, changed, formData, value, dotPath, newValue });
            // specifically using != instead of !== because `changed` is always a string
            // and the stakes here are not that high, we are just trying to avoid saving so many times
            if (newValue != changed) {
                // console.log('ONBLUR TRIGGER SAVE');
                onChangeHandler(formData);
            }
        }} uiSchema={uiSchema} widgets={widgets}>
      <Fragment />
      {/*  this one is to remove the submit button */}
    </Form>);
};
export default PropertyEditor;
//# sourceMappingURL=PropertyEditor.jsx.map