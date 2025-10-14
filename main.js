import { AbletonLive } from 'ableton-live';
import ws from 'ws';
import { processTrackAndDeviceDetails } from './output.js'; 
import fs from 'fs';
import path from 'path';

if (typeof global.WebSocket === 'undefined') {
    global.WebSocket = ws;
}

const live = new AbletonLive();

const isVerboseMode = () => process.argv.includes('--verbose');

const writeToJsonFile = (data) => {
    const filename = 'track_device_details.json';
    const filePath = path.join(process.cwd(), filename);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        console.log(`\n✅ Successfully wrote data to **${filename}** at ${filePath}`);
    } catch (error) {
        console.error(`\n❌ Error writing to JSON file ${filename}:`, error);
    }
};

const connectToLive = async () => {
    try {
        console.log('Connecting to Ableton Live...');
        await live.connect();
        console.log('════════════════════════════════');
        console.log('Successfully connected to Ableton Live.');
        console.log('════════════════════════════════');
        return true;
    } catch (error) {
        console.error('\nConnection error. Ensure LiveAPI.amxd is loaded and Ableton Live is running.', error);
        return false;
    }
};

const getTargetObjects = async () => {
    console.log('✧･ﾟ: *✧･ﾟ:* Fetching Track and Device Objects *･ﾟ✧*:･ﾟ✧');
    const tracks = await live.song.children('tracks');
    if (tracks.length < 2) return { track: null, firstDevice: null };
    const track = tracks[1];
    const firstDevice = await track.child('devices', 0);
    return { track, firstDevice };
};

const getTrackDetails = async (track, index) => {
    const trackName = await track.name;
    const trackType = await track.type;
    const isArmed = await track.get('arm');
    const isMuted = await track.get('mute');
    const isSolo = await track.get('solo');
    const isGrouped = await track.get('is_grouped');
    const volume = await (await track.volume()).get('value');
    const panning = await (await track.panning()).get('value');

    return { index, name: trackName, type: trackType, isArmed, isMuted, isSolo, isGrouped, volume, panning };
};

const getDeviceAndParameterDetails = async (firstDevice) => {
    if (!firstDevice) return null;
    const deviceName = firstDevice.name;
    const deviceClass = firstDevice.classDisplayName;
    const isActive = await firstDevice.get('is_active');
    const parameters = await firstDevice.children('parameters');
    const finalParameterDetails = [];

    for (const param of parameters) {
        const name = await param.get('name');
        const id = param.id;
        const value = await param.get('value');
        const displayValue = await param.get('display_value');
        const valueItems = await param.get('value_items');
        const isEnabled = await param.get('is_enabled');

        let currentValueItem = null;
        if (valueItems && valueItems.length > 0 && typeof value === 'number') {
            const currentIndex = Math.round(value);
            if (currentIndex >= 0 && currentIndex < valueItems.length) {
                currentValueItem = valueItems[currentIndex];
            }
        }
        finalParameterDetails.push({ id, name, rawValue: value, displayValue, enumOptions: valueItems, currentValueItem, isEnabled });
    }

    return { name: deviceName, class: deviceClass, isActive, allParameters: finalParameterDetails };
};

const getTrackDetailsAndFirstDevice = async () => {
    const isVerbose = isVerboseMode();
    console.log(`Mode: **${isVerbose ? 'VERBOSE' : 'STANDARD'}**`);
    let cleanup = false;

    try {
        if (!await connectToLive()) return;
        cleanup = true;

        const { track, firstDevice } = await getTargetObjects();
        if (!track) return;

        const trackDetails = await getTrackDetails(track, 1); 
        const deviceDetails = await getDeviceAndParameterDetails(firstDevice);
        const structuredData = processTrackAndDeviceDetails(trackDetails, deviceDetails, isVerbose);
        writeToJsonFile(structuredData);

        console.log('✧･ﾟ: *✧･ﾟ:*═════════════*･ﾟ✧*:･ﾟ✧');

    } catch (error) {
        console.error('\nAn unexpected error occurred:', error);
    } finally {
        if (cleanup && live.isConnected) {
            live.disconnect();
            console.log('\nDisconnected.');
        }
    }
};

getTrackDetailsAndFirstDevice();
