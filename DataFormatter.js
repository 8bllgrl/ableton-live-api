// DataFormatter.js
import { ParameterProcessor } from './ParameterProcessor.js';

export class DataFormatter {
    /**
     * Converts a string to snake_case.
     * @param {string} str - The input string.
     * @returns {string} The snake_cased string.
     */
    toSnakeCase(str) {
        return str
            .replace(/[\s\/\-\.]/g, '_')
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .toLowerCase()
            .replace(/_{2,}|(^_|_$)/g, '');
    }

    /**
     * Structures the track's static properties.
     * @param {object} trackDetails - The raw track details.
     * @returns {object} The structured track properties.
     */
    buildTrackProperties(trackDetails) {
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
    }

    /**
     * Determines component prefixes for filtering.
     * @private
     */
    _getComponentPrefixes(component, num) {
        if (component === 'F') return [`FEG${num}`];
        if (component === 'AMP') return [`AEG${num}`, `A${num}`];
        if (component === 'OSC') return [`PEG${num}`, `O${num}`];
        return [];
    }

    /**
     * Finds all relevant prefixes for a given switch name.
     * @private
     */
    _getMatchPrefixes(switchName) {
        let basePrefix = switchName.replace(' On/Off', '').trim();
        let prefixes = [basePrefix];

        const num = basePrefix.slice(-1);
        const component = basePrefix.slice(0, -1);

        if (num === '1' || num === '2') {
            prefixes.push(...this._getComponentPrefixes(component, num));
        }

        return prefixes;
    }

    /**
     * Determines if a parameter should be included in the final output based on its governing switch.
     * @param {boolean} isVerbose - Whether to include all parameters.
     * @param {object} structuredDetail - The structured parameter detail.
     * @param {Map<string, object>} componentStatusMap - Map of all On/Off switches.
     * @returns {boolean} True if the parameter should be included.
     */
    shouldIncludeParameter(isVerbose, structuredDetail, componentStatusMap) {
        const paramName = structuredDetail.name;
        if (isVerbose || paramName === 'Device On') return true;

        const governingSwitchDetail = Array.from(componentStatusMap.entries()).find(([switchName, switchDetail]) => {
            if (switchName === 'Device On') return false;

            const prefixes = this._getMatchPrefixes(switchName);
            return prefixes.some(prefix => paramName.startsWith(prefix) && paramName !== switchName);
        });

        if (governingSwitchDetail) {
            const [, switchDetail] = governingSwitchDetail;
            return switchDetail.status !== 'Off';
        }
        return true;
    }

    /**
     * Filters the parameters and maps them to a snake_case keyed object.
     * @param {Array<object>} allStructuredDetails - All structured parameter details.
     * @param {Map<string, object>} componentStatusMap - Map of all On/Off switches.
     * @param {boolean} isVerbose - Whether to apply the filter.
     * @returns {object} The filtered parameters map.
     */
    filterAndMapParameters(allStructuredDetails, componentStatusMap, isVerbose) {
        const parametersMap = {};
        const processor = new ParameterProcessor(); // Temporary instantiation to use isOnOffSwitch

        allStructuredDetails
            .filter(detail => !processor.isOnOffSwitch(detail))
            .filter(detail => this.shouldIncludeParameter(isVerbose, detail, componentStatusMap))
            .forEach(detail => {
                parametersMap[this.toSnakeCase(detail.name)] = detail;
            });

        return parametersMap;
    }

    /**
     * Calculates the count of displayed and hidden parameters.
     */
    calculateFilterSummary(totalParameters, onOffSwitches, parameters) {
        const displayedCount = Object.keys(parameters).length;
        const totalSwitches = Object.keys(onOffSwitches).length;
        const totalParamsExcludingSwitches = totalParameters - totalSwitches;
        const hiddenCount = totalParamsExcludingSwitches - displayedCount;

        return { displayedCount, hiddenCount };
    }

    /**
     * Logs the structured data to the console.
     */
    logOutput(trackData, deviceData, isVerbose) {
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
                console.log(`- ${this.toSnakeCase(sw.name)} (${sw.name}): **${sw.status}**`);
            });

            const { displayedCount, hiddenCount } = this.calculateFilterSummary(
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
    }

    /**
     * Main entry point to process track and device details.
     * @param {object} trackDetails - Raw track details.
     * @param {object | null} deviceDetails - Raw device details.
     * @param {boolean} isVerbose - Flag for verbose mode.
     * @returns {object} The final structured data.
     */
    process(trackDetails, deviceDetails, isVerbose = false) {
        const trackData = this.buildTrackProperties(trackDetails);
        let deviceData = null;

        if (deviceDetails) {
            const processor = new ParameterProcessor();
            const { allStructuredDetails, onOffSwitches, componentStatusMap } = processor.structureParameters(
                deviceDetails.allParameters
            );

            const parametersMap = this.filterAndMapParameters(allStructuredDetails, componentStatusMap, isVerbose);

            deviceData = {
                name: deviceDetails.name,
                class: deviceDetails.class,
                isActive: deviceDetails.isActive,
                totalParameters: deviceDetails.allParameters.length,
                onOffSwitches,
                parameters: parametersMap
            };
        }

        this.logOutput(trackData, deviceData, isVerbose);

        return { track: trackData, device: deviceData };
    }
}