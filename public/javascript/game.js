
var entityList = [];
var localPlayer;
var colorSet;
var avatarColorButtonList = [];
var blockAmount = null;
var blockMargin = 20;
var blockWidth;
var blockPosY = 700;
var blockList = [];
var shouldDrawGridLines = true;

function addGetWorldInfoCommand() {
    gameUpdateCommandList.push({
        commandName: "getWorldInfo"
    });
}

function addGetBlocksCommand() {
    gameUpdateCommandList.push({
        commandName: "getBlocks"
    });
}

function addSetArmPosCommand() {
    gameUpdateCommandList.push({
        commandName: "setArmPos",
        armPos1: localPlayer.arm1.pos,
        armPos2: localPlayer.arm2.pos
    });
}

function addGetEntitiesCommand() {
    gameUpdateCommandList.push({
        commandName: "getEntities"
    });
}

function addGetStatsCommand() {
    gameUpdateCommandList.push({
        commandName: "getStats"
    });
}

function addSwapBlocksCommand(index1, id1, index2, id2) {
    gameUpdateCommandList.push({
        commandName: "swapBlocks",
        index1: index1,
        id1: id1,
        index2: index2,
        id2: id2
    });
}

function addSetAvatarColorCommand() {
    gameUpdateCommandList.push({
        commandName: "setAvatarColor",
        avatarColor: localPlayer.avatarColor,
    });
}

addCommandListener("setAvatarColor", function(command) {
    localPlayer.avatarColor = command.avatarColor;
    updateAvatarColorButtons();
});

addCommandListener("setWorldInfo", function(command) {
    blockAmount = command.blockAmount;
    blockWidth = (canvasWidth - blockMargin * 2) / blockAmount;
});


addCommandListener("setBlocks", function(command) {
    blockList = [];
    var index = 0;
    while (index < command.blocks.length) {
        var tempBlockInfo = command.blocks[index];
        new Block(tempBlockInfo.id, tempBlockInfo.value);
        index += 1;
    }
});

addCommandListener("setEntities", function(command) {
    entityList = [];
    var index = 0;
    while (index < command.entities.length) {
        var tempEntityInfo = command.entities[index];
        if (tempEntityInfo.className == "Player") {
            var tempPlayer = new Player(
                tempEntityInfo.id,
                tempEntityInfo.username,
                tempEntityInfo.avatarColor,
                tempEntityInfo.score
            );
            tempPlayer.arm1.pos = tempEntityInfo.armPos1;
            tempPlayer.arm2.pos = tempEntityInfo.armPos2;
        }
        index += 1;
    }
    entityList.push(localPlayer);
});

addCommandListener("setStats", function(command) {
        localPlayer.score = command.score;
});

addCommandRepeater("swapBlocks", function(command) {
    swapBlocksByIndexAndId(
        command.index1,
        command.id1,
        command.index2,
        command.id2
    );
});

function Entity(id) {
    this.id = id;
    entityList.push(this);
}

Entity.prototype.remove = function() {
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (this == tempEntity) {
            entityList.splice(index, 1);
            break;
        }
        index += 1;
    }
}

Entity.prototype.tick = function() {
    // Do nothing.
}

Entity.prototype.draw = function() {
    // Do nothing.
}

function convertBlockPosToScreenPos(blockPos) {
    return Math.floor(blockMargin + blockPos * (canvasWidth - blockMargin * 2) / blockAmount + blockWidth / 2);
}

function PlayerArm(pos) {
    this.pos = pos;
    this.moveDirection = 0;
    this.moveDelay = 0;
}

PlayerArm.prototype.move = function(direction) {
    if (blockAmount === null) {
        return;
    }
    if (direction < 0 && this.pos > 0) {
        this.pos -= 1;
    }
    if (direction > 0 && this.pos < blockAmount - 1) {
        this.pos += 1;
    }
}

PlayerArm.prototype.startMoving = function(direction) {
    if (Math.sign(this.moveDirection) == Math.sign(direction)) {
        return;
    }
    this.move(direction);
    this.moveDirection = direction;
    this.moveDelay = 0;
}

PlayerArm.prototype.stopMoving = function(direction) {
    if (Math.sign(this.moveDirection) != Math.sign(direction)) {
        return;
    }
    this.moveDirection = 0;
}

PlayerArm.prototype.tick = function() {
    if (this.moveDirection != 0) {
        this.moveDelay += 1;
        if (this.moveDelay > 10) {
            this.move(this.moveDirection);
        }
    }
}

function Player(id, username, avatarColor, score) {
    Entity.call(this, id);
    this.username = username;
    this.avatarColor = avatarColor;
    this.score = score;
    this.arm1 = new PlayerArm(0);
    this.arm2 = new PlayerArm(5);
}
setParentClass(Player, Entity);

Player.prototype.strokeArm = function(bodyPos, armPos, radiusOffset) {
    context.beginPath();
    context.moveTo(bodyPos.x, bodyPos.y);
    context.lineTo(armPos.x, armPos.y);
    context.stroke();
    var tempRadius = Math.floor(blockWidth / 2) - 3 + radiusOffset;
    var tempOffset = 6;
    context.beginPath();
    context.arc(armPos.x, armPos.y - tempOffset, tempRadius, 0, Math.PI);
    context.fill();
    if (radiusOffset > 0) {
        context.fillRect(armPos.x - tempRadius, armPos.y - tempOffset - radiusOffset, tempRadius * 2, radiusOffset, radiusOffset);
    }
}

Player.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    this.arm1.tick();
    this.arm2.tick();
}

Player.prototype.draw = function() {
    if (this.username === null) {
        return;
    }
    Entity.prototype.draw.call(this);
    var tempColor = colorSet[this.avatarColor];
    var tempArmPos1 = new Pos(convertBlockPosToScreenPos(this.arm1.pos), blockPosY);
    var tempArmPos2 = new Pos(convertBlockPosToScreenPos(this.arm2.pos), blockPosY);
    var tempDelta = Math.abs(tempArmPos1.x - tempArmPos2.x);
    var tempOffsetY = 230 - tempDelta / 14;
    var tempBodyPos = new Pos(Math.floor((tempArmPos1.x + tempArmPos2.x) / 2), blockPosY + tempOffsetY);
    context.lineCap = "round";
    context.fillStyle = "#000000";
    context.strokeStyle = "#000000";
    context.beginPath();
    context.arc(tempBodyPos.x, tempBodyPos.y, 56, 0, 2 * Math.PI);
    context.fill();
    context.lineWidth = 22;
    this.strokeArm(tempBodyPos, tempArmPos1, 6);
    this.strokeArm(tempBodyPos, tempArmPos2, 6);
    context.fillStyle = tempColor.toString();
    context.strokeStyle = tempColor.toString();
    context.beginPath();
    context.arc(tempBodyPos.x, tempBodyPos.y, 50, 0, 2 * Math.PI);
    context.fill();
    context.lineWidth = 10;
    this.strokeArm(tempBodyPos, tempArmPos1, 0);
    this.strokeArm(tempBodyPos, tempArmPos2, 0);
    context.fillStyle = "#FFFFFF";
    context.strokeStyle = "#FFFFFF";
    context.lineWidth = 10;
    context.beginPath();
    context.arc(tempBodyPos.x - 20, tempBodyPos.y - 14, 10, 0, 2 * Math.PI);
    context.fill();
    context.beginPath();
    context.arc(tempBodyPos.x + 20, tempBodyPos.y - 14, 10, 0, 2 * Math.PI);
    context.fill();
    context.beginPath();
    context.moveTo(tempBodyPos.x - 20, tempBodyPos.y + 14);
    context.bezierCurveTo(tempBodyPos.x - 16, tempBodyPos.y + 34, tempBodyPos.x + 16, tempBodyPos.y + 34, tempBodyPos.x + 20, tempBodyPos.y + 14);
    context.stroke();
    context.font = "bold 30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#000000";
    context.fillText(this.username, Math.floor(tempBodyPos.x), Math.floor(tempBodyPos.y - 90));
}

function swapBlocksByIndexAndId(index1, id1, index2, id2) {
    var tempBlock1 = blockList[index1];
    var tempBlock2 = blockList[index2];
    if (tempBlock1.id != id1 || tempBlock2.id != id2) {
        return;
    }
    blockList[index1] = tempBlock2;
    blockList[index2] = tempBlock1;
}

Player.prototype.swapBlocks = function() {
    if (blockAmount === null) {
        return;
    }
    var tempId1 = blockList[this.arm1.pos].id;
    var tempId2 = blockList[this.arm2.pos].id;
    swapBlocksByIndexAndId(this.arm1.pos, tempId1, this.arm2.pos, tempId2);
    addSwapBlocksCommand(this.arm1.pos, tempId1, this.arm2.pos, tempId2);
}

function Block(id, value) {
    this.id = id;
    this.value = value;
    this.color = new Color(Math.floor(200 - this.value * 3), 64, Math.floor(50 + this.value * 3));
    this.height = 48 + value * 12;
    blockList.push(this);
}

Block.prototype.draw = function(posX) {
    var tempPosX = convertBlockPosToScreenPos(posX);
    var tempPosY = blockPosY - 12;
    context.fillStyle = "#000000";
    context.fillRect(tempPosX - Math.floor(blockWidth / 2 + 3), tempPosY - this.height - 6, blockWidth + 6, this.height + 12);
    context.fillStyle = this.color.toString();
    context.fillRect(tempPosX - Math.floor(blockWidth / 2 - 3), tempPosY - this.height, blockWidth - 6, this.height);
    context.font = "bold 30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#FFFFFF";
    context.fillText(this.value, Math.floor(tempPosX), Math.floor(tempPosY) - 20);
}

colorSet = [
    // Avatar colors.
    new Color(255, 64, 64),
    new Color(255, 128, 0),
    new Color(192, 192, 64),
    new Color(0, 192, 0),
    new Color(0, 192, 192),
    new Color(64, 64, 255),
    new Color(192, 0, 192),
    new Color(128, 128, 128)
];

function updateAvatarColorButtons() {
    var index = 0;
    while (index < avatarColorButtonList.length) {
        var tempTag = avatarColorButtonList[index];
        if (index == localPlayer.avatarColor) {
            tempTag.style.border = "3px #000000 solid";
        } else {
            tempTag.style.border = "3px #FFFFFF solid";
        }
        index += 1;
    }
}

function drawGridLines() {
    var tempSpacing = 162;
    var tempPosY = blockPosY - 6;
    while (tempPosY > 0) {
        context.fillStyle = "#CCCCCC";
        context.fillRect(0, tempPosY - tempSpacing, canvasWidth, tempSpacing);
        context.fillRect(0, tempPosY - tempSpacing * 3 / 2 - 3, canvasWidth, 6);
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, tempPosY - tempSpacing / 2 - 3, canvasWidth, 6);
        tempPosY -= tempSpacing * 2;
    }
    context.fillStyle = "#888888";
    context.fillRect(convertBlockPosToScreenPos(localPlayer.arm1.pos) - 3, 0, 6, blockPosY);
    context.fillRect(convertBlockPosToScreenPos(localPlayer.arm2.pos) - 3, 0, 6, blockPosY);
}

function updateShouldDrawGridLines() {
    var tempTag = document.getElementById("shouldDrawGridLines");
    shouldDrawGridLines = !!tempTag.checked;
}

function ClientDelegate() {
    
}

ClientDelegate.prototype.initialize = function() {
    var tempContainer = document.getElementById("avatarColorButtons");
    var index = 0;
    while (index < colorSet.length) {
        var tempColor = colorSet[index];
        var tempTag = document.createElement("div");
        tempTag.className = "avatarColorButton";
        tempTag.style.background = tempColor.toString();
        (function() {
            var tempIndex = index;
            tempTag.onclick = function() {
                localPlayer.avatarColor = tempIndex;
                updateAvatarColorButtons();
                addSetAvatarColorCommand();
            }
        })();
        tempContainer.appendChild(tempTag);
        avatarColorButtonList.push(tempTag);
        index += 1;
    }
    
    localPlayer = new Player(-1, null, null, null);
    addGetWorldInfoCommand();
    addGetAvatarColorCommand();
}

ClientDelegate.prototype.setLocalPlayerInfo = function(command) {
    localPlayer.username = command.username;
    localPlayer.score = command.score;
}

ClientDelegate.prototype.timerEvent = function() {
    if (blockAmount === null) {
        return;
    }
    
    var index = entityList.length - 1;
    while (index >= 0) {
        var tempEntity = entityList[index];
        tempEntity.tick();
        index -= 1;
    }
    
    clearCanvas();
    if (shouldDrawGridLines) {
        drawGridLines();
    }
    var index = 0;
    while (index < blockList.length) {
        var tempBlock = blockList[index];
        tempBlock.draw(index);
        index += 1;
    }
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        tempEntity.draw();
        index += 1;
    }
    document.getElementById("score").innerHTML = localPlayer.score;
}

ClientDelegate.prototype.addCommandsBeforeUpdateRequest = function() {
    addGetBlocksCommand();
    addSetArmPosCommand();
    addGetEntitiesCommand();
    addGetStatsCommand();
}

ClientDelegate.prototype.keyDownEvent = function(keyCode) {
    if (focusedTextInput === null) {
        if (keyCode == 65) {
            localPlayer.arm1.startMoving(-1);
        }
        if (keyCode == 68) {
            localPlayer.arm1.startMoving(1);
        }
        if (keyCode == 74) {
            localPlayer.arm2.startMoving(-1);
        }
        if (keyCode == 76) {
            localPlayer.arm2.startMoving(1);
        }
        if (keyCode == 32) {
            localPlayer.swapBlocks();
            return false;
        }
    }
    return true;
}

ClientDelegate.prototype.keyUpEvent = function(keyCode) {
    if (keyCode == 65) {
        localPlayer.arm1.stopMoving(-1);
    }
    if (keyCode == 68) {
        localPlayer.arm1.stopMoving(1);
    }
    if (keyCode == 74) {
        localPlayer.arm2.stopMoving(-1);
    }
    if (keyCode == 76) {
        localPlayer.arm2.stopMoving(1);
    }
    return true;
}

clientDelegate = new ClientDelegate();


