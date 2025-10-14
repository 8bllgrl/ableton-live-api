import { AbletonLive } from 'ableton-live';
import ws from 'ws';
import { processTrackAndDeviceDetails } from './output.js'; 
import fs from 'fs';
import path from 'path';

if (typeof global.WebSocket === 'undefined') {
    global.WebSocket = ws;
}

const live = new AbletonLive();

const isVerboseMode = () => {
    return process.argv.includes('--verbose');
};

const writeToJsonFile = (data, isVerbose = false) => {
    const filename = `track_device_details${isVerbose ? '-verbose' : ''}.json`;
    try {
        fs.writeFileSync(path.join(process.cwd(), filename), JSON.stringify(data, null, 4));
        console.log(`\n✅ Wrote data to ${filename}`);
    } catch (e) {
        console.error(`\n❌ Error writing ${filename}:`, e);
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
        console.error('\nAn error occurred during connection. Double-check that LiveAPI.amxd is loaded on a track and Ableton Live is running.');
        console.error(error);
        return false;
    }
};

const getTargetObjects = async () => {
    console.log('✧･ﾟ: *✧･ﾟ:* Fetching Track and Device Objects *･ﾟ✧*:･ﾟ✧');

    const tracks = await live.song.children('tracks');
    if (tracks.length < 2) {
        console.log("Not enough tracks found. This script requires at least two tracks (index 1).");
        return { track: null, firstDevice: null };
    }

    const trackIndex = 1;
    const track = tracks[trackIndex];
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
    
    const volumeParam = await track.volume();
    const panningParam = await track.panning();
    const volume = await volumeParam.get('value');
    const panning = await panningParam.get('value');

    return {
        index: index,
        name: trackName,
        type: trackType,
        isArmed,
        isMuted,
        isSolo,
        isGrouped,
        volume: volume,
        panning: panning
    };
};

const getDeviceAndParameterDetails = async (firstDevice) => {
    if (!firstDevice) {
        return null;
    }

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
        
        finalParameterDetails.push({
            id: id, 
            name: name,
            rawValue: value,
            displayValue,
            enumOptions: valueItems,
            currentValueItem,
            isEnabled
        });
    }
    
    return {
        name: deviceName,
        class: deviceClass,
        isActive: isActive,
        allParameters: finalParameterDetails 
    };
};

const getTrackDetailsAndFirstDevice = async () => {
    const isVerbose = isVerboseMode();
    console.log(`Mode: **${isVerbose ? 'VERBOSE' : 'STANDARD'}**`);

    let cleanup = false;
    try {
        if (!await connectToLive()) {
            return; 
        }
        cleanup = true;

        const { track, firstDevice } = await getTargetObjects();
        if (!track) {
            return;
        }

        const trackDetails = await getTrackDetails(track, 1); 
        const deviceDetails = await getDeviceAndParameterDetails(firstDevice);
        const structuredData = processTrackAndDeviceDetails(trackDetails, deviceDetails, isVerbose);
        writeToJsonFile(structuredData, isVerbose);

        console.log('✧･ﾟ: *✧･ﾟ:*═════════════*･ﾟ✧*:･ﾟ✧');

    } catch (error) {
        console.error('\nAn unexpected error occurred:');
        console.error(error);
    } finally {
        if (cleanup && live.isConnected) {
            live.disconnect();
            console.log('\nDisconnected.');
        }
    }
};

getTrackDetailsAndFirstDevice();
