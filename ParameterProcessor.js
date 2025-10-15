export class ParameterProcessor {
    static TARGET_OSC_SHAPE_PARAM_NAMES = [
        'OSC1 Shape', 
        'OSC2 Shape', 
        'Osc 1 Shape', 
        'Osc 2 Shape'
    ];

    /**
     * Checks if a parameter detail represents a simple 'On/Off' switch.
     */
    isOnOffSwitch(detail) {
        const options = detail.enumOptions || detail.possibleShapes;
        return Array.isArray(options) && 
               options.length === 2 && 
               options.includes("Off") && 
               options.includes("On");
    }

    /**
     * Structures details for parameters identified as OSC Shape selectors.
     */
    processOscShapeDetails(detail) {
        const options = detail.enumOptions;
        const raw = detail.rawValue;
        const isValidRaw = Array.isArray(options) && raw != null;
        const currentIndex = isValidRaw ? Math.round(raw) : -1;

        const currentShapeName =
            isValidRaw && currentIndex >= 0 && currentIndex < options.length
                ? options[currentIndex]
                : detail.displayValue || 'N/A';

        return {
            id: detail.id,
            name: detail.name,
            isModifiable: detail.isEnabled,
            rawValue: raw,
            displayValue: detail.displayValue,
            minValue: detail.minValue,
            maxValue: detail.maxValue,
            possibleShapes: options || [],
            currentIndex,
            currentShapeName,
        };
    }

    /**
     * Structures details for standard parameters.
     */
    processStandardDetails(detail) {
        return {
            id: detail.id,
            name: detail.name,
            isModifiable: detail.isEnabled,
            rawValue: detail.rawValue,
            displayValue: detail.displayValue,
            minValue: detail.minValue,
            maxValue: detail.maxValue,
            ...(detail.enumOptions?.length > 0
                ? {
                    enumOptions: detail.enumOptions,
                    currentValueItem: detail.currentValueItem,
                  }
                : {}),
        };
    }

    /**
     * Maps and structures all device parameters, separating switches from others.
     */
    structureParameters(allParameters) {
        const allStructuredDetails = allParameters.map(detail => {
            const isOscShape = ParameterProcessor.TARGET_OSC_SHAPE_PARAM_NAMES.includes(detail.name);
            return isOscShape ? this.processOscShapeDetails(detail) : this.processStandardDetails(detail);
        });

        const componentStatusMap = new Map();
        const onOffSwitches = {};

        const toSnakeCasePlaceholder = (str) => 
            str.toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, '');


        allStructuredDetails
            .filter(this.isOnOffSwitch)
            .forEach(detail => {
                const switchInfo = {
                    id: detail.id,
                    name: detail.name,
                    status: detail.currentValueItem || detail.currentShapeName,
                    rawValue: detail.rawValue
                };

                const snakeCaseName = toSnakeCasePlaceholder(detail.name);
                onOffSwitches[snakeCaseName] = switchInfo;
                componentStatusMap.set(detail.name, switchInfo);
            });

        return { allStructuredDetails, onOffSwitches, componentStatusMap };
    }
}