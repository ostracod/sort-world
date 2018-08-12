
var app = require("sortWorld");

function GameUtils() {
    this.framesPerSecond = 16;
    this.hasStopped = false;
    this.maximumPlayerCount = 15;
    this.persistDelay = 60 * this.framesPerSecond;
    this.isPersistingEverything = false;
    var mode = app.get("env");
    this.isInDevelopmentMode = (mode == "development");
}

var gameUtils = new GameUtils();

module.exports = gameUtils;

var tempResource = require("models/chatMessage");
var ChatMessage = tempResource.ChatMessage;
var chatMessageList = tempResource.chatMessageList;

var entityList = require("models/entity").entityList;
var Player = require("models/player").Player;

var classUtils = require("utils/class.js");
var accountUtils = require("utils/account.js");

GameUtils.prototype.getPlayerByUsername = function(username) {
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, Player)) {
            if (tempEntity.username == username) {
                return tempEntity;
            }
        }
        index += 1;
    }
    return null;
}

GameUtils.prototype.getEntityCountByClass = function(entityClass) {
    var output = 0;
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, entityClass)) {
            output += 1;
        }
        index += 1;
    }
    return output;
}

GameUtils.prototype.performUpdate = function(username, commandList, done) {
    function errorHandler(message) {
        done({
            success: false,
            message: message
        });
    }
    if (this.hasStopped) {
        errorHandler("The server is scheduled to shut down. Please come back later.");
        return;
    }
    var tempPlayer;
    var tempCommandList;
    var index = 0;
    function startProcessingCommands() {
        var tempDate = new Date();
        tempPlayer.lastActivityTime = tempDate.getTime();
        tempCommandList = [];
        index = 0;
        processNextCommand();
    }
    var self = this;
    function processNextCommand() {
        if (self.isPersistingEverything) {
            setTimeout(processNextCommand, 100);
            return;
        }
        while (true) {
            if (index >= commandList.length) {
                done({
                    success: true,
                    commandList: tempCommandList
                });
                return;
            }
            var tempCommand = commandList[index];
            index += 1;
            if (tempCommand.commandName == "startPlaying") {
                performStartPlayingCommand(tempCommand, tempPlayer, tempCommandList, processNextCommand, errorHandler);
                return;
            }
            if (tempCommand.commandName == "addChatMessage") {
                performAddChatMessageCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getChatMessages") {
                performGetChatMessagesCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getOnlinePlayers") {
                performGetOnlinePlayersCommand(tempCommand, tempPlayer, tempCommandList);
            }
        }
    }
    tempPlayer = gameUtils.getPlayerByUsername(username);
    if (tempPlayer === null) {
        var tempCount = this.getEntityCountByClass(Player);
        if (tempCount >= this.maximumPlayerCount) {
            errorHandler("The server has reached maximum player capacity. Please come back later.");
            return;
        }
        accountUtils.acquireLock(function() {
            accountUtils.getAccountByUsername(username, function(error, result) {
                accountUtils.releaseLock();
                if (error) {
                    errorHandler("There was a database error. Please try again later.");
                    return;
                }
                tempPlayer = new Player(result);
                startProcessingCommands();
            });
        });
    } else {
        startProcessingCommands();
    }
}

function addSetLocalPlayerInfoCommand(account, player, commandList) {
    commandList.push({
        commandName: "setLocalPlayerInfo",
        username: account.username,
        avatarColor: account.avatarColor,
        score: account.score
    });
}

function addAddChatMessageCommand(chatMessage, commandList) {
    commandList.push({
        commandName: "addChatMessage",
        username: chatMessage.username,
        text: chatMessage.text
    });
}

function addRemoveAllOnlinePlayersCommand(commandList) {
    commandList.push({
        commandName: "removeAllOnlinePlayers"
    });
}

function addAddOnlinePlayerCommand(username, commandList) {
    commandList.push({
        commandName: "addOnlinePlayer",
        username: username
    });
}

function performStartPlayingCommand(command, player, commandList, done, errorHandler) {
    accountUtils.acquireLock(function() {
        accountUtils.getAccountByUsername(player.username, function(error, result) {
            accountUtils.releaseLock();
            if (error) {
                errorHandler(error);
                return;
            }
            addSetLocalPlayerInfoCommand(result, player, commandList);
            done();
        });
    });
}

function performAddChatMessageCommand(command, player, commandList) {
    new ChatMessage(player.username, command.text);
}

function performGetChatMessagesCommand(command, player, commandList) {
    var tempHighestId = -1;
    var index = 0;
    while (index < chatMessageList.length) {
        var tempChatMessage = chatMessageList[index];
        if (tempChatMessage.id > player.lastChatMessageId) {
            addAddChatMessageCommand(tempChatMessage, commandList);
        }
        if (tempChatMessage.id > tempHighestId) {
            tempHighestId = tempChatMessage.id;
        }
        index += 1;
    }
    player.lastChatMessageId = tempHighestId;
}

function performGetOnlinePlayersCommand(command, player, commandList) {
    addRemoveAllOnlinePlayersCommand(commandList);
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, Player)) {
            addAddOnlinePlayerCommand(tempEntity.username, commandList);
        }
        index += 1;
    }
}

GameUtils.prototype.persistEverything = function(done) {
    if (this.isPersistingEverything) {
        done();
        return;
    }
    if (this.isInDevelopmentMode) {
        console.log("Saving world state...");
    }
    this.isPersistingEverything = true;
    var self = this;
    var index = 0;
    function persistNextEntity() {
        while (true) {
            if (index >= entityList.length) {
                self.isPersistingEverything = false;
                if (self.isInDevelopmentMode) {
                    console.log("Saved world state.");
                }
                done();
                return;
            }
            var tempEntity = entityList[index];
            index += 1;
            if (classUtils.isInstanceOf(tempEntity, Player)) {
                tempEntity.persist(persistNextEntity);
                return;
            }
        }
    }
    persistNextEntity();
}

function exitEvent() {
    gameUtils.persistEverything(function() {
        process.exit();
    })
}

process.on("SIGINT", exitEvent);
process.on("SIGUSR1", exitEvent);
process.on("SIGUSR2", exitEvent);

GameUtils.prototype.stopGame = function(done) {
    this.hasStopped = true;
    this.persistEverything(done);
}

GameUtils.prototype.gameTimerEvent = function() {
    if (this.hasStopped || this.isPersistingEverything) {
        return;
    }
    
    var index = entityList.length - 1;
    while (index >= 0) {
        var tempEntity = entityList[index];
        tempEntity.tick();
        index -= 1;
    }
    this.persistDelay -= 1;
    if (this.persistDelay <= 0) {
        this.persistDelay = 60 * this.framesPerSecond;
        gameUtils.persistEverything(function() {
            // Do nothing.
        });
    }
}

setInterval(function() {
    gameUtils.gameTimerEvent();
}, 1000 / gameUtils.framesPerSecond);


