import { AbletonLive } from 'ableton-live';
import ws from 'ws';
if (typeof global.WebSocket === 'undefined') {
    global.WebSocket = ws;
}

const live = new AbletonLive();

const getTrackDetailsAndFirstDevice = async () => {
    try {
        console.log('Connecting to Ableton Live...');
        await live.connect();
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
        const trackType = await track.type; // e.g., 'audio', 'midi', 'return', or 'master'
        
        const isArmed = await track.get('arm');
        const isMuted = await track.get('mute');
        const isSolo = await track.get('solo');
        const isGrouped = await track.get('is_grouped');
        
        const volumeParam = await track.volume();
        const panningParam = await track.panning();

        const volume = await volumeParam.get('value');
        const panning = await panningParam.get('value');
        
        console.log(`\n--- TRACK DETAILS (Index ${trackIndex}) ---`);
        console.log(`Track Name: ${trackName}`);
        console.log(`Track Type: ${trackType}`);
        console.log(`Armed for Recording: ${isArmed}`);
        console.log(`Muted: ${isMuted}`);
        console.log(`Soloed: ${isSolo}`);
        console.log(`Part of a Group: ${isGrouped}`);
        console.log(`Volume (Raw Value): ${volume.toFixed(4)}`);
        console.log(`Panning (Raw Value): ${panning.toFixed(4)}`);

        const firstDevice = await track.child('devices', 0);
        
        if (firstDevice) {
            const deviceName = firstDevice.name;
            const deviceClass = firstDevice.classDisplayName; 
            const isActive = await firstDevice.get('is_active');

            const parameters = await firstDevice.children('parameters');
            const parameterCount = parameters.length;
            
            const parameterDetails = [];

            for (const param of parameters) {
                const name = await param.get('name');
                const id = param.id; 
                parameterDetails.push({ name, id, param });
            }

            console.log(`\n--- FIRST DEVICE DETAILS ---`);
            console.log(`Device Name: ${deviceName}`);
            console.log(`Device Class: ${deviceClass}`);
            console.log(`Is Device Active: ${isActive}`);
            console.log(`Total Parameters: ${parameterCount}`);
            
            if (parameterCount > 0) {
                console.log(`\n--- ALL DEVICE PARAMETER NAMES AND IDS ---`);
                parameterDetails.forEach(detail => {
                    console.log(`ID: ${detail.id} | Name: ${detail.name}`);
                });
            }

            const targetNames = ['OSC1 Shape', 'OSC2 Shape'];
            const targetParameters = parameterDetails.filter(d => targetNames.includes(d.name));

            if (targetParameters.length > 0) {
                console.log(`\n--- SPECIFIC PARAMETER VALUES & ENUMS (${deviceClass}) ---`);
                for (const detail of targetParameters) {
                    const value = await detail.param.get('value');
                    const displayValue = await detail.param.get('display_value'); 
                    const valueItems = await detail.param.get('value_items');

                    console.log(`Name: ${detail.name}`);
                    console.log(`  > ID: ${detail.id}`);
                    console.log(`  > Raw Value: ${value.toFixed(4)}`);
                    console.log(`  > Current Display Value: ${displayValue}`);
                    
                    if (valueItems && valueItems.length > 0) {
                        console.log(`  > Enum Options: [${valueItems.join(', ')}]`);
                        const currentIndex = Math.round(value);
                        if (currentIndex >= 0 && currentIndex < valueItems.length) {
                             console.log(`  > Current Value (index ${currentIndex}) is: ${valueItems[currentIndex]}`);
                        }
                    }
                }
            }


        } else {
            console.log(`\nNo device found at index 0 on track: ${trackName}`);
        }

        console.log('✧･ﾟ: *✧･ﾟ:*═════════════*･ﾟ✧*:･ﾟ✧');
    } catch (error) {
        console.error('\nAn error occurred. Double-check that LiveAPI.amxd is loaded on a track and Ableton Live is running.');
        console.error(error);
    } finally {
        if (live.isConnected) {
            live.disconnect();
            console.log('\nDisconnected.');
        }
    }
};

getTrackDetailsAndFirstDevice();
