import { AbletonLive } from 'ableton-live';
import ws from 'ws';

// 2. [FIXED POLYFILL] Assign the imported 'ws' module to global.WebSocket
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

        // You set this to tracks[1], which is the SECOND track (index starts at 0).
        const trackIndex = 1;
        const track = tracks[trackIndex];

        // --- TRACK PROPERTIES ---
        const trackName = await track.name;
        const trackType = await track.type; // e.g., 'audio', 'midi', 'return', or 'master'
        
        // Use the generic 'get' method for basic properties
        const isArmed = await track.get('arm');
        const isMuted = await track.get('mute');
        const isSolo = await track.get('solo');
        const isGrouped = await track.get('is_grouped');
        
        // Use dedicated methods for Mixer Parameters, which return a DeviceParameter object
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
        // Volume and Panning are raw values, typically from 0.0 to 1.0 (or similar ranges)
        console.log(`Volume (Raw Value): ${volume.toFixed(4)}`);
        console.log(`Panning (Raw Value): ${panning.toFixed(4)}`);

        // --- FIRST DEVICE DETAILS ---
        // Get the first device (index 0) on this track
        const firstDevice = await track.child('devices', 0);
        
        if (firstDevice) {
            // Get device properties
            const deviceName = firstDevice.name;
            const deviceClass = firstDevice.classDisplayName; 
            const isActive = await firstDevice.get('is_active');

            // NEW: Get the list of all parameters for the device
            const parameters = await firstDevice.children('parameters');
            const parameterCount = parameters.length;
            
            // Prepare a list to hold objects with name, ID, and the parameter object
            const parameterDetails = [];

            // Iterate over all parameters to fetch their names and IDs
            for (const param of parameters) {
                const name = await param.get('name');
                const id = param.id; // ID is an accessor property, no await needed for .id
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

            // --- FETCH SPECIFIC PARAMETER VALUES AND ENUMS ---
            // Targeting 'OSC1 Shape' and 'OSC2 Shape' for their enum list
            const targetNames = ['OSC1 Shape', 'OSC2 Shape'];
            const targetParameters = parameterDetails.filter(d => targetNames.includes(d.name));

            if (targetParameters.length > 0) {
                console.log(`\n--- SPECIFIC PARAMETER VALUES & ENUMS (${deviceClass}) ---`);
                for (const detail of targetParameters) {
                    // Get the raw value (number)
                    const value = await detail.param.get('value');
                    // Get the displayed value (the current enum name, e.g., "Sine")
                    const displayValue = await detail.param.get('display_value'); 
                    // NEW: Get the list of possible enum values (if available)
                    const valueItems = await detail.param.get('value_items');

                    console.log(`Name: ${detail.name}`);
                    console.log(`  > ID: ${detail.id}`);
                    console.log(`  > Raw Value: ${value.toFixed(4)}`);
                    console.log(`  > Current Display Value: ${displayValue}`);
                    
                    if (valueItems && valueItems.length > 0) {
                        // valueItems will be an array of strings like ["Sine", "Sawtooth", "Square", ...]
                        console.log(`  > Enum Options: [${valueItems.join(', ')}]`);
                        // Optional: Show which index the current value corresponds to
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
