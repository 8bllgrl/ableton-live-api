const toSnakeCase = (str) => {
    return str
        .replace(/[\s\/\-\.]/g, '_')
        .replace(/([A-Z])/g, (match) => '_' + match.toLowerCase())
        .toLowerCase()
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
};

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

const isOnOffSwitch = (detail) => {
    const options = detail.enumOptions || detail.possibleShapes; 
    if (Array.isArray(options) && options.length === 2) {
        const hasOff = options.includes("Off");
        const hasOn = options.includes("On");
        return hasOff && hasOn;
    }
    return false;
};

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

const generateComponentMaps = (allParametersData) => {
    const componentStatusMap = new Map();
    const onOffSwitches = {};
    for (const detail of allParametersData) {
        if (isOnOffSwitch(detail)) {
            const switchInfo = {
                id: detail.id,
                name: detail.name,
                status: detail.currentValueItem || detail.currentShapeName,
                rawValue: detail.rawValue
            };
            const snakeCaseName = toSnakeCase(detail.name);
            onOffSwitches[snakeCaseName] = switchInfo;
            componentStatusMap.set(detail.name, switchInfo);
        }
    }
    return { componentStatusMap, onOffSwitches };
};

const shouldIncludeParameterProgrammatic = (isVerbose, structuredDetail, componentStatusMap) => {
    const paramName = structuredDetail.name;
    if (isVerbose || paramName === 'Device On') return true;

    let governingSwitchStatus = null;
    let foundGoverningSwitch = false;
    for (const [switchName, switchDetail] of componentStatusMap.entries()) {
        if (switchName === 'Device On') continue;
        let basePrefix = switchName.replace(' On/Off', '').trim();
        let prefixesToCheck = [basePrefix];
        if (basePrefix.endsWith('1') || basePrefix.endsWith('2')) {
            const num = basePrefix.slice(-1);
            const component = basePrefix.slice(0, -1);
            if (component === 'F') {
                prefixesToCheck.push(`FEG${num}`);
            } else if (component === 'AMP') {
                prefixesToCheck.push(`AEG${num}`);
                prefixesToCheck.push(`A${num}`);
            } else if (component === 'OSC') {
                prefixesToCheck.push(`PEG${num}`);
                prefixesToCheck.push(`O${num}`);
            }
        }
        const isMatch = prefixesToCheck.some(prefix => paramName.startsWith(prefix) && paramName !== switchName);
        if (isMatch) {
            foundGoverningSwitch = true;
            governingSwitchStatus = switchDetail.status;
            break;
        }
    }
    if (foundGoverningSwitch && governingSwitchStatus === 'Off') return false;
    return true;
};

export const processTrackAndDeviceDetails = (trackDetails, deviceDetails, isVerbose = false) => {
    const trackData = buildTrackProperties(trackDetails);
    let deviceData = null;
    if (deviceDetails) {
        const allStructuredDetails = [];
        const targetOscShapeParams = ['OSC1 Shape', 'OSC2 Shape', 'Osc 1 Shape', 'Osc 2 Shape'];
        for (const detail of deviceDetails.allParameters) {
            const isOscShape = targetOscShapeParams.includes(detail.name);
            allStructuredDetails.push(isOscShape ? buildTargetedOscShapeDetails(detail) : buildStandardParameterDetails(detail));
        }
        const { componentStatusMap, onOffSwitches } = generateComponentMaps(allStructuredDetails);
        const parametersMap = {};
        const filteredParametersData = allStructuredDetails
            .filter(detail => !isOnOffSwitch(detail))
            .filter(detail => shouldIncludeParameterProgrammatic(isVerbose, detail, componentStatusMap));
        filteredParametersData.forEach(detail => {
            const snakeCaseName = toSnakeCase(detail.name);
            parametersMap[snakeCaseName] = detail;
        });
        deviceData = {
            name: deviceDetails.name,
            class: deviceDetails.class,
            isActive: deviceDetails.isActive,
            totalParameters: deviceDetails.allParameters.length,
            onOffSwitches: onOffSwitches,
            parameters: parametersMap
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
        console.log(`\n--- ON/OFF SWITCHES STATUS ---`);
        Object.keys(deviceData.onOffSwitches).forEach(key => {
            const sw = deviceData.onOffSwitches[key];
            console.log(`- ${key} (${sw.name}): **${sw.status}**`);
        });
        const displayedCount = Object.keys(deviceData.parameters).length;
        const totalParamsExcludingSwitches = deviceData.totalParameters - Object.keys(deviceData.onOffSwitches).length;
        const hiddenCount = totalParamsExcludingSwitches - displayedCount;
        if (isVerbose) {
            console.log(`\nRemaining Parameters Displayed: ${displayedCount} (VERBOSE MODE: All shown)`);
        } else {
            console.log(`\nRemaining Parameters Displayed: ${displayedCount} (STANDARD MODE: Hiding ${hiddenCount} 'Off' component parameters)`);
        }
        console.log(`(Filtered parameter details included in the JSON output, keyed by snake_case name.)`);
    } else {
        console.log(`\nNo device found at index 0 on track: ${trackDetails.name}`);
    }
    return { track: trackData, device: deviceData };
};
