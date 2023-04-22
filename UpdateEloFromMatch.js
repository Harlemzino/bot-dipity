function onFormSubmit(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== 'matches') return;
  
  var data = e.range.getValues()[0];
  var timestamp = data[0];
  var tournamentId = data[1];
  var roundId = data[2];
  var playerAName = data[3];
  var playerBName = data[4];
  var scoreA = data[5];
  var scoreB = data[6];
  
  var playerASheet = SpreadsheetApp.getActive().getSheetByName(playerAName);
  var playerBSheet = SpreadsheetApp.getActive().getSheetByName(playerBName);
  
  var playerAData = playerASheet.getDataRange().getValues();
  var playerBData = playerBSheet.getDataRange().getValues();
  
  var timestamp = new Date();
  var timestampNum = timestamp.getTime();
  var playerAMatchId = tournamentId + '_' + roundId + '_' + timestampNum;
  var playerBMatchId = tournamentId + '_' + roundId + '_' + timestampNum;
  
  var playerAStartingElo = playerAData.length > 1 && playerAData[playerAData.length-1][7] ? playerAData[playerAData.length-1][7] : 1500;
  var playerBStartingElo = playerBData.length > 1 && playerBData[playerBData.length-1][7] ? playerBData[playerBData.length-1][7] : 1500;
  
  var playerAExpectedResult = calculateExpectedResult(playerAStartingElo, playerBStartingElo);
  var playerBExpectedResult = calculateExpectedResult(playerBStartingElo, playerAStartingElo);
  
  var playerAResult = scoreA > scoreB ? 1 : 0;
  var playerBResult = scoreB > scoreA ? 1 : 0;

  var playerAEloChange = calculateEloChange(playerAStartingElo, playerAExpectedResult, playerAResult, playerBStartingElo, roundId, scoreA, scoreB);
  var playerBEloChange = calculateEloChange(playerBStartingElo, playerBExpectedResult, playerBResult, playerAStartingElo, roundId, scoreB, scoreA);

  
  var playerAMatchRow = [playerAMatchId, playerAStartingElo, playerBName, playerBStartingElo, scoreA, scoreB, playerAEloChange, playerAStartingElo + playerAEloChange];
  var playerBMatchRow = [playerBMatchId, playerBStartingElo, playerAName, playerAStartingElo, scoreB, scoreA, playerBEloChange, playerBStartingElo + playerBEloChange];
  
  playerASheet.appendRow(playerAMatchRow);
  playerBSheet.appendRow(playerBMatchRow);

  updateRankings();

  updateUserIds();

}

function getKFactor(playerAElo, playerBElo, roundId, isWinner) {
  var eloDifference = Math.abs(playerAElo - playerBElo);
  
  // Calculate kFactor based on eloDifference
  var kFactor = Math.min(32 + Math.floor(eloDifference / 5), 128);

  // Apply round weighting only if isWinner is true
  if (isWinner) {
    if (roundId === 1) {
      kFactor *= 1; // Reduce K-factor by 10% for round 1
    } else if (roundId === 2) {
      kFactor *= 1.3; // Increase K-factor by 30% for round 2
    } else if (roundId === 3) {
      kFactor *= 1.6; // Increase K-factor by 60% for round 3
    } else if (roundId === 4) {
      kFactor *= 1.9; // Increase K-factor by 90% for round 4
    } else if (roundId === 5) {
      kFactor *= 2.2; // Increase K-factor by 120% for round 5
    } else if (roundId === 6) {
      kFactor *= 2.5; // Increase K-factor by 150% for round 6
    } else if (roundId === 7) {
      kFactor *= 2.8; // Increase K-factor by 180% for round 7
    } else if (roundId === 8) {
      kFactor *= 3.1; // Increase K-factor by 210% for round 8
    }
  }

  return kFactor;
}


// Calculates the expected result for player A
function calculateExpectedResult(playerAElo, playerBElo) {
  return 1 / (1 + Math.pow(10, (playerBElo - playerAElo) / 400));
}

// Calculates the Elo change for both players
function calculateEloChange(playerAElo, expectedResult, actualResult, playerBElo, roundId, scoreA, scoreB) {
  var isWinner = actualResult === 1;
  var kFactor = getKFactor(playerAElo, playerBElo, roundId, isWinner);
  var binaryEloChange = Math.round(kFactor * (actualResult - expectedResult));

  var totalRounds = scoreA + scoreB;
  var winnerRounds = Math.max(scoreA, scoreB);
  var roundPercentage = winnerRounds / totalRounds;

  var binaryEloWeight = 0.5;
  var scoreEloWeight = 1 - binaryEloWeight;

  var scoreBasedEloChange = binaryEloChange * roundPercentage;
  var totalEloChange = binaryEloChange * binaryEloWeight + scoreBasedEloChange * scoreEloWeight;

  return Math.round(totalEloChange);
}
function updateRankings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rankingSheet = ss.getSheetByName("ranking");
  
  // Clear the current rankings
  rankingSheet.getDataRange().clearContent();
  
  // Get all player sheets
  var playerSheets = ss.getSheets().filter(function(sheet) {
    return sheet.getName() !== 'matches' && sheet.getName() !== 'ranking';
  });
  
  // Create an array to store player data
  var playerData = [];
  
  // Iterate through each player sheet
  playerSheets.forEach(function(sheet) {
    var playerName = sheet.getName();
    var playerDataRange = sheet.getDataRange().getValues();
    var lastRow = playerDataRange.length - 1;
    var latestElo = playerDataRange[lastRow][7];
    playerData.push([playerName, latestElo]);
  });
  
  // Sort the player data by elo
  playerData.sort(function(a, b) {
    return b[1] - a[1];
  });
  
  // Add the player data to the ranking sheet
  rankingSheet.getRange(1, 1, playerData.length, 2).setValues(playerData);
}

function updateUserIds() {
  var rankingSheet = SpreadsheetApp.getActive().getSheetByName('ranking');
  var userIdSheet = SpreadsheetApp.getActive().getSheetByName('user_id');

  var lastRow = rankingSheet.getLastRow();
  var playerNames = rankingSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var userIds = [];

  // Loop through each player name and look up their user ID in the user ID sheet
  for (var i = 0; i < playerNames.length; i++) {
    var playerName = playerNames[i][0];
    var userId = '';

    // Search for the player name in the user ID sheet and get their user ID
    var userIdData = userIdSheet.getDataRange().getValues();
    for (var j = 0; j < userIdData.length; j++) {
      if (userIdData[j][0] === playerName) {
        userId = userIdData[j][1];
        break;
      }
    }

    // Add the user ID to the array of user IDs
    userIds.push([userId]);
  }

  // Update the ranking sheet with the user IDs
  rankingSheet.getRange(2, 3, lastRow - 1, 1).setValues(userIds);
}



