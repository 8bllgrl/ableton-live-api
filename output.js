import { ParameterProcessor } from './ParameterProcessor.js';
import { DataFormatter } from './DataFormatter.js';

export const processTrackAndDeviceDetails = (trackDetails, deviceDetails, isVerbose = false) => {
    const dataFormatter = new DataFormatter();
    return dataFormatter.process(trackDetails, deviceDetails, isVerbose);
};