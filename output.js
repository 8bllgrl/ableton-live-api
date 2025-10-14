/**
 * Formats and prints the details of a track and its first device to the console.
 * @param {object} trackDetails - The fetched details for the track.
 * @param {object | null} deviceDetails - The fetched details for the first device, or null if none was found.
 */
export const printTrackAndDeviceDetails = (trackDetails, deviceDetails) => {
    
    // --- TRACK DETAILS ---
    console.log(`\n--- TRACK DETAILS (Index ${trackDetails.index}) ---`);
    console.log(`Track Name: ${trackDetails.name}`);
    console.log(`Track Type: ${trackDetails.type}`);
    console.log(`Armed for Recording: ${trackDetails.isArmed}`);
    console.log(`Muted: ${trackDetails.isMuted}`);
    console.log(`Soloed: ${trackDetails.isSolo}`);
    console.log(`Part of a Group: ${trackDetails.isGrouped}`);
    console.log(`Volume (Raw Value): ${trackDetails.volume.toFixed(4)}`);
    console.log(`Panning (Raw Value): ${trackDetails.panning.toFixed(4)}`);

    // --- DEVICE DETAILS ---
    if (deviceDetails) {
        console.log(`\n--- FIRST DEVICE DETAILS ---`);
        console.log(`Device Name: ${deviceDetails.name}`);
        console.log(`Device Class: ${deviceDetails.class}`);
        console.log(`Is Device Active: ${deviceDetails.isActive}`);
        console.log(`Total Parameters: ${deviceDetails.allParameters.length}`);
        
        // --- ALL DEVICE PARAMETERS FULL DETAILS ---
        if (deviceDetails.allParameters.length > 0) {
            console.log(`\n--- ALL DEVICE PARAMETER FULL DETAILS & ENUMS (${deviceDetails.class}) ---`);
            
            // Define the target parameters for special logging
            const targetParameters = ['OSC1 Shape', 'OSC2 Shape', 'Osc 1 Shape', 'Osc 2 Shape'];

            for (const detail of deviceDetails.allParameters) {
                
                // --- CUSTOM LOGIC: TARGET OSC SHAPE 1 & 2 ---
                const isOscShape = targetParameters.includes(detail.name);
                
                if (isOscShape) {
                    let rawValueStr = 'N/A';
                    if (detail.rawValue !== undefined && detail.rawValue !== null) {
                        rawValueStr = typeof detail.rawValue === 'number' ? detail.rawValue.toFixed(4) : String(detail.rawValue);
                    }
                    
                    // Initialize variables for the specific output
                    let currentShapeName = 'N/A';
                    let currentIndex = -1;
                    
                    // New logic to calculate shapeName and index, matching main2.js
                    if (Array.isArray(detail.enumOptions) && detail.rawValue !== undefined && detail.rawValue !== null) {
                        currentIndex = Math.round(detail.rawValue);
                        if (currentIndex >= 0 && currentIndex < detail.enumOptions.length) {
                            currentShapeName = detail.enumOptions[currentIndex];
                        }
                    } else {
                        // Fallback to displayValue if enum lookup fails
                        currentShapeName = detail.displayValue || 'N/A';
                    }
                    
                    console.log(`\n*** TARGETED OSC SHAPE: ${detail.name} ***`);
                    
                    // Print the properties as requested
                    console.log(`Name: ${detail.name}`);
                    console.log(`    > ID: ${detail.id}`);
                    console.log(`    > Raw Value: ${rawValueStr}`);
                    console.log(`    > Display Value: ${detail.displayValue || 'N/A'}`);

                    // Print Enum Options in the requested indexed format
                    if (detail.enumOptions && detail.enumOptions.length > 0) {
                        console.log(`    > Possible Shapes (Enum Options):`);
                        detail.enumOptions.forEach((item, index) => {
                            console.log(`      [${index}]: ${item}`);
                        });
                        
                        // Explicitly state which shape it is (using the calculated value)
                        if (currentIndex !== -1) {
                            console.log(`\n    > Current Shape is (Index ${currentIndex}): **${currentShapeName}**`);
                        } else {
                            console.log(`\n    > Current Shape is: **${currentShapeName}**`);
                        }
                    } else {
                        console.log(`    > Note: 'value_items' property (enum list) not available for this parameter.`);
                    }

                    console.log(`*** END TARGETED OUTPUT ***`);

                    // Use 'continue' to skip the default logging for this parameter
                    console.log(`    ---------------------------------------`);
                    continue; 
                }
                // --- END CUSTOM LOGIC ---
                
                // --- DEFAULT PARAMETER LOGGING (Runs for all other parameters) ---
                console.log(`Name: ${detail.name}`);
                console.log(`    > ID: ${detail.id}`);

                // Check for and display Raw Value, safely using toFixed(4) only on numbers
                if (detail.rawValue !== undefined && detail.rawValue !== null) {
                    const rawValueStr = typeof detail.rawValue === 'number' ? detail.rawValue.toFixed(4) : String(detail.rawValue);
                    console.log(`    > Raw Value: ${rawValueStr}`);
                }
                
                // Check for and display Display Value
                if (detail.displayValue !== undefined) {
                    console.log(`    > Current Display Value: ${detail.displayValue}`);
                }

                // Check for and display Enum Options and the current enum value
                if (detail.enumOptions && detail.enumOptions.length > 0) {
                    console.log(`    > Enum Options: [${detail.enumOptions.join(', ')}]`);
                    if (detail.currentValueItem) {
                        console.log(`    > Current Value is: ${detail.currentValueItem}`);
                    }
                }
                
                console.log(`    ---------------------------------------`);
            }
        }
    } else {
        console.log(`\nNo device found at index 0 on track: ${trackDetails.name}`);
    }
};