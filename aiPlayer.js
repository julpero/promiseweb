module.exports = {
    getRandomAiPlayers: function(numberOfAiPlayers) {
        let aiPlayerArr = [];
        for (let i = 0; i < 9; i++) {
            aiPlayerArr.push(getAiPlayer(i));
        }
        let shuffledAiPlayerArr = knuthShuffle(aiPlayerArr);
        let retAiPlayerArr = [];
        for (let i = 0; i < numberOfAiPlayers; i++) {
            retAiPlayerArr.push(aiPlayerToPlayer(shuffledAiPlayerArr[i]));
        }
        return retAiPlayerArr;
    }
};

function aiPlayerToPlayer(aiPlayer) {
    return {
        name: aiPlayer.AiName,
        playerId: uuidv4(),
        type: 'ai',
        playerAi: aiPlayer,
    }
}

function getRandomNumber(minimum, maximum)
{
    return Math.random() * (maximum - minimum) + minimum;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function playerRandInt(mean, variance = 2)
{
    if (variance <= 0) return mean;
    let randInt = getRandomInt(mean - variance, mean + variance + 1);
    if (randInt > 100) return 100;
    if (randInt < 0) return 0;
    return randInt;
}

function playerRandDouble(mean, variance = 0.05)
{
    if (variance <= 0) return mean;
    let randDouble = getRandomNumber(mean - variance, mean + variance);
    if (randDouble > 1) return 1.0;
    if (randDouble < 0) return 0.0;
    return randDouble;
}

function getAiPlayer(playerId) {

    // this is playerId: 0
    let AiName = "Jaska";

    let DodgeBase = playerRandInt(57);
    let DodgeSure = 100; // this is a fact
    let DodgeSmallestValuesInSuit = playerRandInt(90);
    let DodgeSmallestValuesInSuitNOT = playerRandInt(76);
    let DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(23);
    let DodgeBiggestValuesInSuit = playerRandInt(14);
    let DodgeBiggestValuesInSuitNOT = playerRandInt(15);
    let DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(19);
    let DodgeInChargeAverageCount = playerRandDouble(0.94);
    
    // BigValuesInSuit
    let BigValuesInSuit = playerRandInt(10, 1);

    // SmallValuesInSuit
    let SmallValuesInSuit = playerRandInt(3, 1);

    // MakePromise
    let PromiseMultiplierBase1 = playerRandDouble(0.54);
    let PromiseMultiplierChange1A = playerRandDouble(0.01);
    let PromiseMultiplierChange1B = playerRandDouble(0.03);
    let PromiseMultiplierChange1C = playerRandDouble(0.21);
    let MiniRisk = playerRandInt(53);

    if (playerId == 1)
    {
        AiName = "Pera";
        // 113fd6f9-85a8-4b22-889d-7c94d1e23b7a

        DodgeBase = playerRandInt(94);
        DodgeSure = 100; // this is a fact
        DodgeSmallestValuesInSuit = playerRandInt(92);
        DodgeSmallestValuesInSuitNOT = playerRandInt(64);
        DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(44);
        DodgeBiggestValuesInSuit = playerRandInt(36);
        DodgeBiggestValuesInSuitNOT = playerRandInt(79);
        DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(83);
        DodgeInChargeAverageCount = playerRandDouble(0.97);
        
        // BigValuesInSuit
        BigValuesInSuit = playerRandInt(11, 1);

        // SmallValuesInSuit
        SmallValuesInSuit = playerRandInt(4, 1);

        // MakePromise
        PromiseMultiplierBase1 = playerRandDouble(0.17);
        PromiseMultiplierChange1A = playerRandDouble(0.81);
        PromiseMultiplierChange1B = playerRandDouble(0.48);
        PromiseMultiplierChange1C = playerRandDouble(0.46);
        MiniRisk = playerRandInt(32);
    }

    if (playerId == 2)
    {
        AiName = "Lissu";
        // a9b3534b-377b-4a35-98f9-e6ec9cb478df

        DodgeBase = playerRandInt(79);
        DodgeSure = 100; // this is a fact
        DodgeSmallestValuesInSuit = playerRandInt(17);
        DodgeSmallestValuesInSuitNOT = playerRandInt(2);
        DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(28);
        DodgeBiggestValuesInSuit = playerRandInt(75);
        DodgeBiggestValuesInSuitNOT = playerRandInt(66);
        DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(27);
        DodgeInChargeAverageCount = playerRandDouble(0.18);
        
        // BigValuesInSuit
        BigValuesInSuit = playerRandInt(12, 1);

        // SmallValuesInSuit
        SmallValuesInSuit = playerRandInt(6, 1);

        // MakePromise
        PromiseMultiplierBase1 = playerRandDouble(0.48);
        PromiseMultiplierChange1A = playerRandDouble(0.37);
        PromiseMultiplierChange1B = playerRandDouble(0.64);
        PromiseMultiplierChange1C = playerRandDouble(0.15);
        MiniRisk = playerRandInt(69);
    }

    if (playerId == 3)
    {
        AiName = "Repa";
        // ccb01d20-562c-4803-bd3f-c1e8449a3dda

        DodgeBase = playerRandInt(79);
        DodgeSure = 100; // this is a fact
        DodgeSmallestValuesInSuit = playerRandInt(17);
        DodgeSmallestValuesInSuitNOT = playerRandInt(42);
        DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(28);
        DodgeBiggestValuesInSuit = playerRandInt(1);
        DodgeBiggestValuesInSuitNOT = playerRandInt(63);
        DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(46);
        DodgeInChargeAverageCount = playerRandDouble(0.18);
        
        // BigValuesInSuit
        BigValuesInSuit = randomAi.Next(13, 15);

        // SmallValuesInSuit
        SmallValuesInSuit = playerRandInt(5, 1);

        // MakePromise
        PromiseMultiplierBase1 = playerRandDouble(0.48);
        PromiseMultiplierChange1A = playerRandDouble(0.37);
        PromiseMultiplierChange1B = playerRandDouble(0.64);
        PromiseMultiplierChange1C = playerRandDouble(0.15);
        MiniRisk = playerRandInt(69);
    }

    if (playerId == 4)
    {
        AiName = "Arska";
        // 2d4ef7b5-1cbe-4de3-9c6c-c6092352894e

        DodgeBase = playerRandInt(20);
        DodgeSure = 100; // this is a fact
        DodgeSmallestValuesInSuit = playerRandInt(9);
        DodgeSmallestValuesInSuitNOT = playerRandInt(2);
        DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(61);
        DodgeBiggestValuesInSuit = playerRandInt(1);
        DodgeBiggestValuesInSuitNOT = playerRandInt(80);
        DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(22);
        DodgeInChargeAverageCount = playerRandDouble(0.42);
        
        // BigValuesInSuit
        BigValuesInSuit = playerRandInt(12, 1);

        // SmallValuesInSuit
        SmallValuesInSuit = randomAi.Next(2, 4);

        // MakePromise
        PromiseMultiplierBase1 = playerRandDouble(0.64);
        PromiseMultiplierChange1A = playerRandDouble(0.08);
        PromiseMultiplierChange1B = playerRandDouble(0.01);
        PromiseMultiplierChange1C = playerRandDouble(0.01);
        MiniRisk = playerRandInt(75);
    }

    if (playerId == 5)
    {
        AiName = "Jossu";
        // 51180a82-4342-4b33-977a-a3ad71e1e04e

        DodgeBase = playerRandInt(69);
        DodgeSure = 100; // this is a fact
        DodgeSmallestValuesInSuit = playerRandInt(81);
        DodgeSmallestValuesInSuitNOT = playerRandInt(95);
        DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(61);
        DodgeBiggestValuesInSuit = playerRandInt(94);
        DodgeBiggestValuesInSuitNOT = playerRandInt(57);
        DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(85);
        DodgeInChargeAverageCount = playerRandDouble(0.42);
        
        // BigValuesInSuit
        BigValuesInSuit = playerRandInt(9, 1);

        // SmallValuesInSuit
        SmallValuesInSuit = playerRandInt(6, 1);

        // MakePromise
        PromiseMultiplierBase1 = playerRandDouble(0.10);
        PromiseMultiplierChange1A = playerRandDouble(0.14);
        PromiseMultiplierChange1B = playerRandDouble(0.41);
        PromiseMultiplierChange1C = playerRandDouble(0.05);
        MiniRisk = playerRandInt(97);
    }

    if (playerId == 6)
    {
        AiName = "Sussu";
        // 33347887-2f78-4caa-9acb-29f344b425d7

        DodgeBase = playerRandInt(82);
        DodgeSure = 100; // this is a fact
        DodgeSmallestValuesInSuit = playerRandInt(62);
        DodgeSmallestValuesInSuitNOT = playerRandInt(7);
        DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(81);
        DodgeBiggestValuesInSuit = playerRandInt(11);
        DodgeBiggestValuesInSuitNOT = playerRandInt(37);
        DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(82);
        DodgeInChargeAverageCount = playerRandDouble(0.23);
        
        // BigValuesInSuit
        BigValuesInSuit = playerRandInt(10, 1);

        // SmallValuesInSuit
        SmallValuesInSuit = playerRandInt(5, 1);

        // MakePromise
        PromiseMultiplierBase1 = playerRandDouble(0.31);
        PromiseMultiplierChange1A = playerRandDouble(0.08);
        PromiseMultiplierChange1B = playerRandDouble(0.05);
        PromiseMultiplierChange1C = playerRandDouble(0.13);
        MiniRisk = playerRandInt(78);
    }

    if (playerId == 7)
    {
        AiName = "Kake";
        // 64f323b4-0c22-46bd-80f3-779b219d6e8d

        DodgeBase = playerRandInt(17);
        DodgeSure = 100; // this is a fact
        DodgeSmallestValuesInSuit = playerRandInt(48);
        DodgeSmallestValuesInSuitNOT = playerRandInt(87);
        DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(23);
        DodgeBiggestValuesInSuit = playerRandInt(57);
        DodgeBiggestValuesInSuitNOT = playerRandInt(43);
        DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(6);
        DodgeInChargeAverageCount = playerRandDouble(0.28);
        
        // BigValuesInSuit
        BigValuesInSuit = playerRandInt(10, 1);

        // SmallValuesInSuit
        SmallValuesInSuit = playerRandInt(6, 1);

        // MakePromise
        PromiseMultiplierBase1 = playerRandDouble(0.09);
        PromiseMultiplierChange1A = playerRandDouble(0.85);
        PromiseMultiplierChange1B = playerRandDouble(0.80);
        PromiseMultiplierChange1C = playerRandDouble(0.08);
        MiniRisk = playerRandInt(2);
    }

    if (playerId == 8)
    {
        AiName = "Late";
        // 3e2d5eca-45b3-438e-8256-3d8a6c3ab2d1

        DodgeBase = playerRandInt(89);
        DodgeSure = 100; // this is a fact
        DodgeSmallestValuesInSuit = playerRandInt(34);
        DodgeSmallestValuesInSuitNOT = playerRandInt(58);
        DodgeCardCountAvgOtherPlayersCount1 = playerRandInt(65);
        DodgeBiggestValuesInSuit = playerRandInt(15);
        DodgeBiggestValuesInSuitNOT = playerRandInt(95);
        DodgeCardCountAvgOtherPlayersCount2 = playerRandInt(63);
        DodgeInChargeAverageCount = playerRandDouble(0.02);
        
        // BigValuesInSuit
        BigValuesInSuit = playerRandInt(13, 1);

        // SmallValuesInSuit
        SmallValuesInSuit = playerRandInt(7, 1);

        // MakePromise
        PromiseMultiplierBase1 = playerRandDouble(0.09);
        PromiseMultiplierChange1A = playerRandDouble(0.38);
        PromiseMultiplierChange1B = playerRandDouble(0.17);
        PromiseMultiplierChange1C = playerRandDouble(0.13);
        MiniRisk = playerRandInt(20);
    }

}

function knuthShuffle(arr) {
    let rand, temp, i;
 
    for (i = arr.length - 1; i > 0; i -= 1) {
        rand = Math.floor((i + 1) * Math.random()); //get random between zero and i (inclusive)
        temp = arr[rand]; //swap i and the zero-indexed number
        arr[rand] = arr[i];
        arr[i] = temp;
    }
    return arr;
}


function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
