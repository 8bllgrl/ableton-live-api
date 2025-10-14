const printTrackProperties = (trackDetails) => {
    console.log(`\n--- TRACK DETAILS (Index ${trackDetails.index}) ---`);
    console.log(`Track Name: ${trackDetails.name}`);
    console.log(`Track Type: ${trackDetails.type}`);
    console.log(`Armed for Recording: ${trackDetails.isArmed}`);
    console.log(`Muted: ${trackDetails.isMuted}`);
    console.log(`Soloed: ${trackDetails.isSolo}`);
    console.log(`Part of a Group: ${trackDetails.isGrouped}`);
    console.log(`Volume (Raw Value): ${trackDetails.volume.toFixed(4)}`);
    console.log(`Panning (Raw Value): ${trackDetails.panning.toFixed(4)}`);
};

const printTargetedOscShapeDetails = (detail) => {
    let rawValueStr = 'N/A';
    if (detail.rawValue !== undefined && detail.rawValue !== null) {
        rawValueStr = typeof detail.rawValue === 'number' ? detail.rawValue.toFixed(4) : String(detail.rawValue);
    }
    
    let currentShapeName = 'N/A';
    let currentIndex = -1;
    
    if (Array.isArray(detail.enumOptions) && detail.rawValue !== undefined && detail.rawValue !== null) {
        currentIndex = Math.round(detail.rawValue);
        if (currentIndex >= 0 && currentIndex < detail.enumOptions.length) {
            currentShapeName = detail.enumOptions[currentIndex];
        }
    } else {
        currentShapeName = detail.displayValue || 'N/A';
    }
    
    console.log(`\n*** TARGETED OSC SHAPE: ${detail.name} ***`);
    
    console.log(`Name: ${detail.name}`);
    console.log(`    > ID: ${detail.id}`);
    console.log(`    > Raw Value: ${rawValueStr}`);
    console.log(`    > Display Value: ${detail.displayValue || 'N/A'}`);
    
    console.log(`    > Is Modifiable (is_enabled): ${detail.isEnabled ? 'Yes' : 'No'}`);

    if (detail.enumOptions && detail.enumOptions.length > 0) {
        console.log(`    > Possible Shapes (Enum Options):`);
        detail.enumOptions.forEach((item, index) => {
            console.log(`      [${index}]: ${item}`);
        });
        
        if (currentIndex !== -1) {
            console.log(`\n    > Current Shape is (Index ${currentIndex}): **${currentShapeName}**`);
        } else {
            console.log(`\n    > Current Shape is: **${currentShapeName}**`);
        }
    } else {
        console.log(`    > Note: 'value_items' property (enum list) not available for this parameter.`);
    }

    console.log(`*** END TARGETED OUTPUT ***`);

    console.log(`    ---------------------------------------`);
};

const printStandardParameterDetails = (detail) => {
    console.log(`Name: ${detail.name}`);
    console.log(`    > ID: ${detail.id}`);

    if (detail.isEnabled !== undefined) {
        console.log(`    > Is Modifiable (is_enabled): ${detail.isEnabled ? 'Yes' : 'No'}`);
    }

    if (detail.rawValue !== undefined && detail.rawValue !== null) {
        const rawValueStr = typeof detail.rawValue === 'number' ? detail.rawValue.toFixed(4) : String(detail.rawValue);
        console.log(`    > Raw Value: ${rawValueStr}`);
    }
    
    if (detail.displayValue !== undefined) {
        console.log(`    > Current Display Value: ${detail.displayValue}`);
    }

    if (detail.enumOptions && detail.enumOptions.length > 0) {
        console.log(`    > Enum Options: [${detail.enumOptions.join(', ')}]`);
        if (detail.currentValueItem) {
            console.log(`    > Current Value is: ${detail.currentValueItem}`);
        }
    }
    
    console.log(`    ---------------------------------------`);
};

export const printTrackAndDeviceDetails = (trackDetails, deviceDetails) => {
    
    printTrackProperties(trackDetails);

    if (deviceDetails) {
        console.log(`\n--- FIRST DEVICE DETAILS ---`);
        console.log(`Device Name: ${deviceDetails.name}`);
        console.log(`Device Class: ${deviceDetails.class}`);
        console.log(`Is Device Active: ${deviceDetails.isActive}`);
        console.log(`Total Parameters: ${deviceDetails.allParameters.length}`);
        
        if (deviceDetails.allParameters.length > 0) {
            console.log(`\n--- ALL DEVICE PARAMETER FULL DETAILS & ENUMS (${deviceDetails.class}) ---`);
            
            const targetParameters = ['OSC1 Shape', 'OSC2 Shape', 'Osc 1 Shape', 'Osc 2 Shape'];

            for (const detail of deviceDetails.allParameters) {
                
                const isOscShape = targetParameters.includes(detail.name);
                
                if (isOscShape) {
                    printTargetedOscShapeDetails(detail);
                } else {
                    printStandardParameterDetails(detail);
                }
            }
        }
    } else {
        console.log(`\nNo device found at index 0 on track: ${trackDetails.name}`);
    }
};