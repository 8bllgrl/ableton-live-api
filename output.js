const TARGET_OSC_SHAPE_PARAM_NAMES = [
  'OSC1 Shape', 
  'OSC2 Shape', 
  'Osc 1 Shape', 
  'Osc 2 Shape'
];

const toSnakeCase = (str) =>
  str
    .replace(/[\s\/\-\.]/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/_{2,}|(^_|_$)/g, '');

const isOnOffSwitch = (detail) => {
  const options = detail.enumOptions || detail.possibleShapes;
  return Array.isArray(options) && options.length === 2 && options.includes("Off") && options.includes("On");
};

const buildTrackProperties = (trackDetails) => ({
    index: trackDetails.index,
    name: trackDetails.name,
    type: trackDetails.type,
    isArmed: trackDetails.isArmed,
    isMuted: trackDetails.isMuted,
    isSolo: trackDetails.isSolo,
    isGrouped: trackDetails.isGrouped,
    volume: trackDetails.volume,
    panning: trackDetails.panning
});

const buildTargetedOscShapeDetails = (detail) => {
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
};

const buildStandardParameterDetails = (detail) => ({
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
});

const getComponentPrefixes = (component, num) => {
    if (component === 'F') return [`FEG${num}`];
    if (component === 'AMP') return [`AEG${num}`, `A${num}`];
    if (component === 'OSC') return [`PEG${num}`, `O${num}`];
    return [];
};

const getMatchPrefixes = (switchName) => {
    let basePrefix = switchName.replace(' On/Off', '').trim();
    let prefixes = [basePrefix];

    const num = basePrefix.slice(-1);
    const component = basePrefix.slice(0, -1);

    if (num === '1' || num === '2') {
        prefixes.push(...getComponentPrefixes(component, num));
    }

    return prefixes;
};

const shouldIncludeParameterProgrammatic = (isVerbose, structuredDetail, componentStatusMap) => {
    const paramName = structuredDetail.name;
    if (isVerbose || paramName === 'Device On') return true;

    const governingSwitchDetail = Array.from(componentStatusMap.entries()).find(([switchName, switchDetail]) => {
        if (switchName === 'Device On') return false;

        const prefixes = getMatchPrefixes(switchName);
        return prefixes.some(prefix => paramName.startsWith(prefix) && paramName !== switchName);
    });

    if (governingSwitchDetail) {
        const [, switchDetail] = governingSwitchDetail;
        return switchDetail.status !== 'Off';
    }
    return true;
};

const generateComponentMaps = (allParametersData) => {
  const componentStatusMap = new Map();
  const onOffSwitches = {};

  allParametersData
    .filter(isOnOffSwitch)
    .forEach(detail => {
      const switchInfo = {
        id: detail.id,
        name: detail.name,
        status: detail.currentValueItem || detail.currentShapeName,
        rawValue: detail.rawValue
      };

      const snakeCaseName = toSnakeCase(detail.name);
      onOffSwitches[snakeCaseName] = switchInfo;
      componentStatusMap.set(detail.name, switchInfo);
    });

  return { componentStatusMap, onOffSwitches };
};

const filterAndMapParameters = (allStructuredDetails, componentStatusMap, isVerbose) => {
    const parametersMap = {};

    allStructuredDetails
        .filter(detail => !isOnOffSwitch(detail))
        .filter(detail => shouldIncludeParameterProgrammatic(isVerbose, detail, componentStatusMap))
        .forEach(detail => {
            parametersMap[toSnakeCase(detail.name)] = detail;
        });

    return parametersMap;
};

const structureDeviceParameters = (allParameters, isVerbose) => {

    const allStructuredDetails = allParameters.map(detail => {
        const isOscShape = TARGET_OSC_SHAPE_PARAM_NAMES.includes(detail.name);
        return isOscShape ? buildTargetedOscShapeDetails(detail) : buildStandardParameterDetails(detail);
    });

    const { componentStatusMap, onOffSwitches } = generateComponentMaps(allStructuredDetails);

    const parametersMap = filterAndMapParameters(allStructuredDetails, componentStatusMap, isVerbose);

    return { componentStatusMap, onOffSwitches, parametersMap };
};

const calculateFilterSummary = (totalParameters, onOffSwitches, parameters) => {
    const displayedCount = Object.keys(parameters).length;
    const totalSwitches = Object.keys(onOffSwitches).length;
    const totalParamsExcludingSwitches = totalParameters - totalSwitches;
    const hiddenCount = totalParamsExcludingSwitches - displayedCount;

    return { displayedCount, hiddenCount };
};

const logOutput = (trackData, deviceData, isVerbose) => {

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
        const { onOffSwitches, totalParameters, parameters } = deviceData;

        console.log(`\n--- FIRST DEVICE DETAILS ---`);
        console.log(`Device Name: ${deviceData.name}`);
        console.log(`Device Class: ${deviceData.class}`);
        console.log(`Is Device Active: ${deviceData.isActive}`);
        console.log(`Total Parameters: ${totalParameters}`);

        console.log(`\n--- ON/OFF SWITCHES STATUS ---`);
        Object.values(onOffSwitches).forEach(sw => {
            console.log(`- ${toSnakeCase(sw.name)} (${sw.name}): **${sw.status}**`);
        });

        const { displayedCount, hiddenCount } = calculateFilterSummary(
            totalParameters, 
            onOffSwitches, 
            parameters
        );

        const mode = isVerbose ? 
            `VERBOSE MODE: All shown` : 
            `STANDARD MODE: Hiding ${hiddenCount} 'Off' component parameters`;

        console.log(`\nRemaining Parameters Displayed: ${displayedCount} (${mode})`);
        console.log(`(Filtered parameter details included in the JSON output, keyed by snake_case name.)`);
    } else {
        console.log(`\nNo device found on track: ${trackData.name}`);
    }
};

export const processTrackAndDeviceDetails = (trackDetails, deviceDetails, isVerbose = false) => {
    const trackData = buildTrackProperties(trackDetails);
    let deviceData = null;

    if (deviceDetails) {
        const { onOffSwitches, parametersMap } = structureDeviceParameters(
            deviceDetails.allParameters, 
            isVerbose
        );

        deviceData = {
            name: deviceDetails.name,
            class: deviceDetails.class,
            isActive: deviceDetails.isActive,
            totalParameters: deviceDetails.allParameters.length,
            onOffSwitches,
            parameters: parametersMap
        };
    }

    logOutput(trackData, deviceData, isVerbose);

    return { track: trackData, device: deviceData };
};