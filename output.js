/**
 * Creates a structured object from track details.
 * @param {object} trackDetails
 * @returns {object}
 */
const buildTrackProperties = (trackDetails) => {
    return {
        index: trackDetails.index,
        name: trackDetails.name,
        type: trackDetails.type,
        isArmed: trackDetails.isArmed,
        isMuted: trackDetails.isMuted,
        isSolo: trackDetails.isSolo,
        isGrouped: trackDetails.isGrouped,
        volume: trackDetails.volume,
        panning: trackDetails.panning
    };
};

/**
 * Creates a structured object for an OSC Shape parameter.
 * @param {object} detail
 * @returns {object}
 */
const buildTargetedOscShapeDetails = (detail) => {
    let currentShapeName = 'N/A';
    let currentIndex = -1;

    if (Array.isArray(detail.enumOptions) && detail.rawValue !== undefined && detail.rawValue !== null) {
        currentIndex = Math.round(detail.rawValue);
        if (currentIndex >= 0 && currentIndex < detail.enumOptions.length) {
            currentShapeName = detail.enumOptions[currentIndex];
        }
    } else {
        currentShapeName = detail.displayValue || 'N/A';
    }

    return {
        id: detail.id,
        name: detail.name,
        isModifiable: detail.isEnabled,
        rawValue: detail.rawValue,
        displayValue: detail.displayValue,
        possibleShapes: detail.enumOptions || [],
        currentIndex: currentIndex,
        currentShapeName: currentShapeName
    };
};

/**
 * Creates a structured object for a standard parameter.
 * @param {object} detail
 * @returns {object}
 */
const buildStandardParameterDetails = (detail) => {
    const result = {
        id: detail.id,
        name: detail.name,
        isModifiable: detail.isEnabled,
        rawValue: detail.rawValue,
        displayValue: detail.displayValue
    };

    if (detail.enumOptions && detail.enumOptions.length > 0) {
        result.enumOptions = detail.enumOptions;
        result.currentValueItem = detail.currentValueItem;
    }

    return result;
};

/**
 * Main function to structure and print the output.
 * @param {object} trackDetails
 * @param {object} deviceDetails
 * @returns {{track: object, device: object|null}} Structured data.
 */
export const processTrackAndDeviceDetails = (trackDetails, deviceDetails) => {
    
    //BUILD TRACK DATA ---
    const trackData = buildTrackProperties(trackDetails);
    //BUILD DEVICE DATA ---
    let deviceData = null;

    if (deviceDetails) {
        
        const allParametersData = [];
        const targetParameters = ['OSC1 Shape', 'OSC2 Shape', 'Osc 1 Shape', 'Osc 2 Shape'];

        for (const detail of deviceDetails.allParameters) {
            
            const isOscShape = targetParameters.includes(detail.name);
            
            if (isOscShape) {
                allParametersData.push(buildTargetedOscShapeDetails(detail));
            } else {
                allParametersData.push(buildStandardParameterDetails(detail));
            }
        }

        deviceData = {
            name: deviceDetails.name,
            class: deviceDetails.class,
            isActive: deviceDetails.isActive,
            totalParameters: deviceDetails.allParameters.length,
            parameters: allParametersData
        };
    }

    console.log(`\n--- TRACK DETAILS (Index ${trackData.index}) ---`);
    console.log(`Track Name: ${trackData.name}`);
    console.log(`Track Type: ${trackData.type}`);
    console.log(`Armed for Recording: ${trackData.isArmed}`);
    console.log(`Muted: ${trackData.isMuted}`);
    console.log(`Soloed: ${trackData.isSolo}`);
    console.log(`Part of a Group: ${trackData.isGrouped}`);
    console.log(`Volume (Raw Value): ${trackData.volume.toFixed(4)}`);
    console.log(`Panning (Raw Value): ${trackData.panning.toFixed(4)}`);
    
    if (deviceData) {
        console.log(`\n--- FIRST DEVICE DETAILS ---`);
        console.log(`Device Name: ${deviceData.name}`);
        console.log(`Device Class: ${deviceData.class}`);
        console.log(`Is Device Active: ${deviceData.isActive}`);
        console.log(`Total Parameters: ${deviceData.totalParameters}`);
        console.log(`\n(Full parameter details included in the JSON output.)`);
    } else {
        console.log(`\nNo device found at index 0 on track: ${trackDetails.name}`);
    }
    
    // RETURN STRUCTURED DATA ---
    return {
        track: trackData,
        device: deviceData
    };
};