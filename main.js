const fs = require('fs');
const munkres = require('./munkres');

function countVowels(str) {
    return (str.match(/[aeiou]/gi) || []).length;
}

function countConsonants(str) {
    return (str.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
}

function getCommonFactors(n1, n2) {
    let factors = [];
    let min = Math.min(n1, n2);
    for(let i = 2; i <= min; i++){
        if(n1 % i === 0 && n2 % i === 0){
            factors.push(i);
        }
    }
    return factors;
}

function calculateSuitability(driver, shipment) {
    let baseScore = 0;
    let driverNameLength = driver.length;
    let streetNameLength = shipment.length;

    if (streetNameLength % 2 === 0) {
        baseScore = countVowels(driver) * 1.5;
    } else {
        baseScore = countConsonants(driver);
    }

    if (getCommonFactors(driverNameLength, streetNameLength).length > 0) {
        baseScore *= 1.5;
    }

    return baseScore;
}

function assignShipments(driverFile, shipmentFile) {
    let drivers = fs.readFileSync(driverFile, 'utf8').toLowerCase().split('\n').map(driver => driver.replace(/\r/g, ''));
    let shipments = fs.readFileSync(shipmentFile, 'utf8').toLowerCase().split('\n').map(shipment => shipment.replace(/\r/g, ''));
    console.log(shipments)
    let matrix = [];
    for(let i = 0; i < drivers.length; i++) {
        let row = [];
        for(let j = 0; j < shipments.length; j++) {
            row.push(-1 * calculateSuitability(drivers[i], shipments[j]));
        }
        matrix.push(row);
    }

    let indices = munkres(matrix);
    console.log("indices", indices)
    let totalScore = 0;
    for(let i = 0; i < indices.length; i++) {
        let driver = drivers[indices[i][0]];
        let shipment = shipments[indices[i][1]];
        let score = -1 * matrix[indices[i][0]][indices[i][1]];
        console.log("driver:", driver)
        console.log("Shipment:", shipment)
        console.log("Score", score)
        totalScore += score;
    }

    console.log('Total Suitability Score: ' + totalScore);
}

// Test the function
assignShipments('drivers.txt', 'shipments.txt');
