// output.js
import { ParameterProcessor } from './ParameterProcessor.js';
import { DataFormatter } from './DataFormatter.js';

/**
 * Processes and structures track and device details for output.
 * @param {object} trackDetails - The raw track details.
 * @param {object | null} deviceDetails - The raw first device details.
 * @param {boolean} isVerbose - Whether to include all parameters in the output.
 * @returns {object} The final structured data.
 */
export const processTrackAndDeviceDetails = (trackDetails, deviceDetails, isVerbose = false) => {
    const dataFormatter = new DataFormatter();
    return dataFormatter.process(trackDetails, deviceDetails, isVerbose);
};