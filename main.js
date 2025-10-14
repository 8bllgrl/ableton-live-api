import { AbletonLive } from 'ableton-live';
import ws from 'ws';
import { printTrackAndDeviceDetails } from './output.js';

if (typeof global.WebSocket === 'undefined') {
    global.WebSocket = ws;
}

const live = new AbletonLive();

const getTrackDetailsAndFirstDevice = async () => {
    let cleanup = false;
    try {
        console.log('Connecting to Ableton Live...');
        await live.connect();
        cleanup = true;
        
        console.log('════════════════════════════════');
        console.log('Successfully connected to Ableton Live.');
        console.log('════════════════════════════════');
        console.log('✧･ﾟ: *✧･ﾟ:* Fetching Track Details *･ﾟ✧*:･ﾟ✧');

        const tracks = await live.song.children('tracks');
        if (tracks.length < 2) {
            console.log("Not enough tracks found. This script requires at least two tracks.");
            return;
        }

        const trackIndex = 1;
        const track = tracks[trackIndex];
        
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

        const trackDetails = {
            index: trackIndex,
            name: trackName,
            type: trackType,
            isArmed,
            isMuted,
            isSolo,
            isGrouped,
            volume: volume,
            panning: panning
        };

        let deviceDetails = null;
        const firstDevice = await track.child('devices', 0);
        
        if (firstDevice) {
            const deviceName = firstDevice.name;
            const deviceClass = firstDevice.classDisplayName; 
            const isActive = await firstDevice.get('is_active');

            const parameters = await firstDevice.children('parameters');
            let allParametersWithParamObject = [];

            for (const param of parameters) {
                const name = await param.get('name');
                const id = param.id;
                allParametersWithParamObject.push({ name, id, param });
            }
            
            const finalParameterDetails = [];

            for (const detail of allParametersWithParamObject) {
                
                const baseDetail = { id: detail.id, name: detail.name };

                const value = await detail.param.get('value');
                const displayValue = await detail.param.get('display_value'); 
                const valueItems = await detail.param.get('value_items'); 
                const isEnabled = await detail.param.get('is_enabled');

                let currentValueItem = null;
                if (valueItems && valueItems.length > 0 && typeof value === 'number') {
                    const currentIndex = Math.round(value);
                    if (currentIndex >= 0 && currentIndex < valueItems.length) {
                         currentValueItem = valueItems[currentIndex];
                    }
                }
                
                finalParameterDetails.push({
                    ...baseDetail,
                    rawValue: value,
                    displayValue,
                    enumOptions: valueItems,
                    currentValueItem,
                    isEnabled
                });
            }
            
            deviceDetails = {
                name: deviceName,
                class: deviceClass,
                isActive: isActive,
                allParameters: finalParameterDetails 
            };
        }
        
        printTrackAndDeviceDetails(trackDetails, deviceDetails);


        console.log('✧･ﾟ: *✧･ﾟ:*═════════════*･ﾟ✧*:･ﾟ✧');
    } catch (error) {
        console.error('\nAn error occurred. Double-check that LiveAPI.amxd is loaded on a track and Ableton Live is running.');
        console.error(error);
    } finally {
        if (cleanup && live.isConnected) {
            live.disconnect();
            console.log('\nDisconnected.');
        }
    }
};

getTrackDetailsAndFirstDevice();