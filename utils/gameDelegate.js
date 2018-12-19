
var tempResource = require("ostracod-multiplayer");
var ostracodMultiplayer = tempResource.ostracodMultiplayer;
var gameUtils = tempResource.gameUtils;

function GameDelegate() {
    this.blockAmount = 30;
    this.isFinishingRound = false;
}

var gameDelegate = new GameDelegate();

module.exports = gameDelegate;

var entityList = require("models/entity").entityList;
var PlayerEntity = require("models/player").PlayerEntity;

var tempResource = require("models/block");
var Block = tempResource.Block;
var blockList = tempResource.blockList;

var classUtils = require("utils/class");

GameDelegate.prototype.getPlayerEntityByUsername = function(username) {
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, PlayerEntity)) {
            if (tempEntity.username == username) {
                return tempEntity;
            }
        }
        index += 1;
    }
    return null;
}

GameDelegate.prototype.getPlayerEntityByPlayer = function(player) {
    return this.getPlayerEntityByUsername(player.username);
}

gameUtils.addCommandListener("getAvatarColor", true, performGetBlocksCommand);
gameUtils.addCommandListener("getBlocks", true, performGetBlocksCommand);
gameUtils.addCommandListener("setArmPos", true, performSetArmPosCommand);
gameUtils.addCommandListener("getEntities", true, performGetEntitiesCommand);
gameUtils.addCommandListener("getStats", true, performGetStatsCommand);
gameUtils.addCommandListener("swapBlocks", true, performSwapBlocksCommand);
gameUtils.addCommandListener("setAvatarColor", true, performSetAvatarColorCommand);

function addSetAvatarColorCommand(avatarColor, commandList) {
    commandList.push({
        commandName: "setAvatarColor",
        avatarColor: avatarColor,
    });
}

function addSetWorldInfoCommand(commandList) {
    commandList.push({
        commandName: "setWorldInfo",
        blockAmount: gameDelegate.blockAmount
    });
}

function addSetBlocksCommand(commandList) {
    var tempBlockInfoList = [];
    var index = 0;
    while (index < blockList.length) {
        tempBlockInfoList.push(blockList[index].getClientInfo());
        index += 1;
    }
    commandList.push({
        commandName: "setBlocks",
        blocks: tempBlockInfoList
    });
}

function addSetEntitiesCommand(player, commandList) {
    var tempPlayerEntity = gameDelegate.getPlayerEntityByPlayer(player);
    var tempEntityInfoList = [];
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (tempEntity !== tempPlayerEntity) {
            tempEntityInfoList.push(tempEntity.getClientInfo());
        }
        index += 1;
    }
    commandList.push({
        commandName: "setEntities",
        entities: tempEntityInfoList
    });
}

function addSetStatsCommand(player, commandList) {
    commandList.push({
        commandName: "setStats",
        score: player.score
    });
}

function performGetWorldInfoCommand(command, player, commandList) {
    addSetWorldInfoCommand(commandList);
}

function performGetBlocksCommand(command, player, commandList) {
    addSetBlocksCommand(commandList);
}

function performSetArmPosCommand(command, player, commandList) {
    var tempPlayerEntity = gameDelegate.getPlayerEntityByPlayer(player);
    tempPlayerEntity.armPos1 = command.armPos1;
    tempPlayerEntity.armPos2 = command.armPos2;
}

function performGetEntitiesCommand(command, player, commandList) {
    addSetEntitiesCommand(player, commandList);
}

function performGetStatsCommand(command, player, commandList) {
    addSetStatsCommand(player, commandList);
}

function performSwapBlocksCommand(command, player, commandList) {
    gameDelegate.swapBlocksByIndexAndId(
        player,
        command.index1,
        command.id1,
        command.index2,
        command.id2
    );
}

function performSetAvatarColorCommand(command, player, commandList) {
    var tempPlayerEntity = gameDelegate.getPlayerEntityByPlayer(player);
    player.avatarColor = command.avatarColor;
}

GameDelegate.prototype.assignCorrectBlockPos = function(sortedBlockList, block) {
    var tempStartCorrectPos = sortedBlockList.length;
    var tempEndCorrectPos = -1;
    var index = 0;
    while (index < sortedBlockList.length) {
        var tempBlock = sortedBlockList[index];
        if (tempBlock.value == block.value) {
            if (index < tempStartCorrectPos) {
                tempStartCorrectPos = index;
            }
            if (index > tempEndCorrectPos) {
                tempEndCorrectPos = index;
            }
        }
        index += 1
    }
    block.startCorrectPos = tempStartCorrectPos;
    block.endCorrectPos = tempEndCorrectPos;
}

GameDelegate.prototype.generateBlocks = function() {
    blockList.length = 0;
    while (blockList.length < this.blockAmount) {
        new Block(Math.floor(Math.random() * 50));
    }
    var tempSortedBlockList = blockList.slice();
    tempSortedBlockList.sort(function(block1, block2) {
        if (block1.value < block2.value) {
            return -1;
        }
        if (block1.value > block2.value) {
            return 1;
        }
        return 0;
    });
    var index = 0;
    while (index < tempSortedBlockList.length) {
        var tempBlock = tempSortedBlockList[index];
        this.assignCorrectBlockPos(tempSortedBlockList, tempBlock);
        index += 1;
    }
    var index = 0;
    while (index < blockList.length) {
        var tempBlock = blockList[index];
        tempBlock.closestDistanceToCorrectPos = this.getBlockDistanceToCorrectPos(index);
        index += 1;
    }
}

GameDelegate.prototype.blockListIsSorted = function() {
    var index = 1;
    while (index < blockList.length) {
        var tempBlock1 = blockList[index - 1];
        var tempBlock2 = blockList[index];
        if (tempBlock1.value > tempBlock2.value) {
            return false;
        }
        index += 1;
    }
    return true;
}

GameDelegate.prototype.getBlockDistanceToCorrectPos = function(index) {
    var tempBlock = blockList[index];
    if (index < tempBlock.startCorrectPos) {
        return tempBlock.startCorrectPos - index;
    } else if (index > tempBlock.endCorrectPos) {
        return index - tempBlock.endCorrectPos;
    } else {
        return 0
    }
}

GameDelegate.prototype.updateBlockClosestDistance = function(index) {
    var tempBlock = blockList[index];
    var tempDistance = this.getBlockDistanceToCorrectPos(index);
    if (tempDistance < tempBlock.closestDistanceToCorrectPos) {
        var tempOffset = tempBlock.closestDistanceToCorrectPos - tempDistance;
        tempBlock.closestDistanceToCorrectPos = tempDistance;
        return tempOffset;
    } else {
        return 0;
    }
}

GameDelegate.prototype.swapBlocksByIndexAndId = function(player, index1, id1, index2, id2) {
    var tempPlayerEntity = gameDelegate.getPlayerEntityByPlayer(player);
    var tempBlock1 = blockList[index1];
    var tempBlock2 = blockList[index2];
    if (tempBlock1.id != id1 || tempBlock2.id != id2) {
        return;
    }
    blockList[index1] = tempBlock2;
    blockList[index2] = tempBlock1;
    var tempResult1 = this.updateBlockClosestDistance(index1);
    var tempResult2 = this.updateBlockClosestDistance(index2);
    var tempPointCount = tempResult1 + tempResult2;
    tempPlayerEntity.pendingPoints += tempPointCount;
    if (this.blockListIsSorted()) {
        this.finishRound();
    }
}

function pluralize(word, amount) {
    if (amount == 1) {
        return word;
    } else {
        return word + "s";
    }
}

GameDelegate.prototype.finishRound = function() {
    if (this.isFinishingRound) {
        return;
    }
    var self = this;
    this.isFinishingRound = true;
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, PlayerEntity)) {
            var tempPlayerEntity = tempEntity;
            var tempPointCount = tempPlayerEntity.pendingPoints;
            var tempPlayer = gameUtils.getPlayerByUsername(tempPlayerEntity.username);
            announceMessageInChat(tempPlayer.username + " gained " + tempPointCount + " " + pluralize("point", tempPointCount) + ".");
            tempPlayer.score += tempPointCount;
            tempPlayerEntity.pendingPoints = 0;
        }
        index += 1;
    }
    setTimeout(function () {
        self.isFinishingRound = false;
        self.generateBlocks();
    }, 2000);
}

GameDelegate.prototype.playerEnterEvent = function(player) {
    // TODO: Implement.
    
}

GameDelegate.prototype.playerLeaveEvent = function(player) {
    // TODO: Implement.
    
}

GameDelegate.prototype.persistEvent = function(done) {
    // TODO: Implement.
    
    done();
}


gameDelegate.generateBlocks();


