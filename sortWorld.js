require("rootpath")();
var ostracodMultiplayer = require("ostracod-multiplayer").ostracodMultiplayer;
var gameDelegate = require("utils/gameDelegate");

console.log("Starting OstracodMultiplayer...");

var tempResult = ostracodMultiplayer.initializeServer(__dirname, gameDelegate, []);

if (!tempResult) {
    process.exit(1);
}


