
var canvas;
var context;
var canvasWidth = 1600;
var canvasHeight = 1000;
var framesPerSecond = 25;
var canvasIsFocused = true;
var shiftKeyIsHeld = false;
var chatInputIsFocused = false;
var chatInput;
var chatOutput;
var chatMessageTagList = [];
var maximumChatMessageCount = 100;
var overlayChatInputIsFocused = false;
var overlayChatInput;
var overlayChatOutput;
var overlayChatMessageList = [];
var overlayChatInputIsVisible = false;
var gameUpdateCommandList = []
var gameUpdateRequestDelay = 0;
var lastGameUpdateFrameNumber = null;
var isRequestingGameUpdate = false;
var hasStopped = false;
var lastActivityTime = 0;
var entityList = [];
var localPlayer;
var gameUpdateSocket;
var gameUpdateStartTimestamp;
var moduleList = [];
var colorSet;
var avatarColorButtonList = [];
var blockAmount = null;
var blockMargin = 20;
var blockWidth;
var blockPosY = 700;
var blockList = [];

// Thanks to CatTail for this snippet of code.
var encodeHtmlEntity = function(str) {
    var buf = [];
    for (var i=str.length-1;i>=0;i--) {
        buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    }
    return buf.join("");
};

function betterModulus(number1, number2) {
    if (number1 >= 0) {
        return number1 % number2;
    } else {
        return (number1 + Math.floor((-number1) / number2 + 1) * number2) % number2; 
    }
}

function performGameUpdateRequest() {
    isRequestingGameUpdate = true;
    gameUpdateStartTimestamp = Date.now() / 1000;
    gameUpdateSocket.send(JSON.stringify(gameUpdateCommandList));
    gameUpdateCommandList = [];
}

function handleGameUpdateRequest(data) {
    var tempTimestamp = Date.now() / 1000;
    document.getElementById("pingTime").innerHTML = Math.floor((tempTimestamp - gameUpdateStartTimestamp) * 1000);
    if (data.success) {
        var tempCommandList = data.commandList;
        var index = 0;
        while (index < tempCommandList.length) {
            var tempCommand = tempCommandList[index];
            if (tempCommand.commandName == "setLocalPlayerInfo") {
                performSetLocalPlayerInfoCommand(tempCommand);
            }
            if (tempCommand.commandName == "setWorldInfo") {
                performSetWorldInfoCommand(tempCommand);
            }
            if (tempCommand.commandName == "addChatMessage") {
                performAddChatMessageCommand(tempCommand);
            }
            if (tempCommand.commandName == "removeAllOnlinePlayers") {
                performRemoveAllOnlinePlayersCommand(tempCommand);
            }
            if (tempCommand.commandName == "addOnlinePlayer") {
                performAddOnlinePlayerCommand(tempCommand);
            }
            if (tempCommand.commandName == "setBlocks") {
                performSetBlocksCommand(tempCommand);
            }
            if (tempCommand.commandName == "setEntities") {
                performSetEntitiesCommand(tempCommand);
            }
            if (tempCommand.commandName == "setStats") {
                performSetStatsCommand(tempCommand);
            }
            index += 1;
        }
        // Repeat unprocessed client-side commands.
        var index = 0;
        while (index < gameUpdateCommandList.length) {
            var tempCommand = gameUpdateCommandList[index];
            if (tempCommand.commandName == "swapBlocks") {
                swapBlocksByIndexAndId(
                    tempCommand.index1,
                    tempCommand.id1,
                    tempCommand.index2,
                    tempCommand.id2
                );
            }
            index += 1;
        }
    } else {
        alert(data.message);
        hasStopped = true;
        window.location = "menu";
    }
    //gameUpdateRequestDelay = 0.25 * framesPerSecond;
    gameUpdateRequestDelay = 0;
    isRequestingGameUpdate = false;
}

function addStartPlayingCommand() {
    gameUpdateCommandList.push({
        commandName: "startPlaying"
    });
}

function addAddChatMessageCommand(text) {
    gameUpdateCommandList.push({
        commandName: "addChatMessage",
        text: text
    });
}

function addGetChatMessagesCommand() {
    gameUpdateCommandList.push({
        commandName: "getChatMessages"
    });
}

function addGetOnlinePlayersCommand() {
    gameUpdateCommandList.push({
        commandName: "getOnlinePlayers"
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

function performSetLocalPlayerInfoCommand(command) {
    localPlayer.username = command.username;
    localPlayer.avatarColor = command.avatarColor;
    localPlayer.score = command.score;
    updateAvatarColorButtons();
}

function performSetWorldInfoCommand(command) {
    blockAmount = command.blockAmount;
    blockWidth = (canvasWidth - blockMargin * 2) / blockAmount;
}

function performAddChatMessageCommand(command) {
    var tempPlayerName;
    if (command.username === null) {
        tempPlayerName = null;
    } else {
        tempPlayerName = encodeHtmlEntity(command.username);
    }
    var tempText = encodeHtmlEntity(command.text);
    var tempIsAtBottom = (chatOutput.scrollTop + 150 > chatOutput.scrollHeight - 30);
    var tempTag = document.createElement("div");
    if (tempPlayerName === null) {
        tempTag.innerHTML = tempText;
    } else {
        tempTag.innerHTML = "<strong>" + tempPlayerName + ":</strong> " + tempText;
    }
    chatOutput.appendChild(tempTag);
    chatMessageTagList.push(tempTag);
    while (chatMessageTagList.length > maximumChatMessageCount) {
        var tempTag = chatMessageTagList[0];
        chatOutput.removeChild(tempTag);
        chatMessageTagList.splice(0, 1);
    }
    if (tempIsAtBottom) {
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }
    new OverlayChatMessage(tempPlayerName, tempText);
}

function performRemoveAllOnlinePlayersCommand(command) {
    var tempTag = document.getElementById("onlinePlayersDiv");
    tempTag.innerHTML = "";
}

function performAddOnlinePlayerCommand(command) {
    var tempTag = document.getElementById("onlinePlayersDiv");
    tempTag.innerHTML += "<strong>" + encodeHtmlEntity(command.username) + "</strong><br />";
}

function performSetBlocksCommand(command) {
    blockList = [];
    var index = 0;
    while (index < command.blocks.length) {
        var tempBlockInfo = command.blocks[index];
        new Block(tempBlockInfo.id, tempBlockInfo.value);
        index += 1;
    }
}

function performSetEntitiesCommand(command) {
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
}

function performSetStatsCommand(command) {
    localPlayer.score = command.score;
}

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
    this.color = new Color(Math.floor(200 - this.value * 1.5), 64, Math.floor(50 + this.value * 1.5));
    this.height = 50 + value * 6;
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

function Color(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.string = null;
}

Color.prototype.copy = function() {
    return new Color(this.r, this.g, this.b);
}

Color.prototype.scale = function(number) {
    this.r = Math.floor(this.r * number);
    this.g = Math.floor(this.g * number);
    this.b = Math.floor(this.b * number);
    if (this.r > 255) {
        this.r = 255;
    }
    if (this.g > 255) {
        this.g = 255;
    }
    if (this.b > 255) {
        this.b = 255;
    }
}

Color.prototype.addScalarIfZero = function(number) {
    if (this.r == 0) {
        this.r += number;
    }
    if (this.g == 0) {
        this.g += number;
    }
    if (this.b == 0) {
        this.b += number;
    }
    if (this.r > 255) {
        this.r = 255;
    }
    if (this.g > 255) {
        this.g = 255;
    }
    if (this.b > 255) {
        this.b = 255;
    }
}

Color.prototype.equals = function(color) {
    return (this.r == color.r && this.g == color.g && this.b == color.b);
}

Color.prototype.toString = function() {
    if (this.string === null) {
        this.string = "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
    }
    return this.string;
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

function OverlayChatMessage(playerName, text) {
    this.tag = document.createElement("div");
    if (playerName === null) {
        this.tag.innerHTML = text;
    } else {
        this.tag.innerHTML = "<strong>" + playerName + ":</strong> " + text;
    }
    overlayChatOutput.appendChild(this.tag);
    this.delay = 8 * framesPerSecond;
    overlayChatMessageList.push(this);
    while (overlayChatMessageList.length > 3) {
        var tempMessage = overlayChatMessageList[0];
        tempMessage.removeTag();
        overlayChatMessageList.splice(0, 1);
    }
}

OverlayChatMessage.prototype.removeTag = function() {
    overlayChatOutput.removeChild(this.tag);
}

OverlayChatMessage.prototype.getIsVisible = function() {
    var tempValue = document.getElementById("showOverlay").checked
    return ((this.delay > 0 && tempValue) || overlayChatInputIsFocused);
}

OverlayChatMessage.prototype.tick = function() {
    if (overlayChatInputIsFocused) {
        this.tag.style.color = "#FFFFFF";
        this.tag.style.display = "block";
    } else {
        var tempFadeDelay = 2 * framesPerSecond;
        if (this.delay < tempFadeDelay) {
            var tempColorValue = Math.floor(255 * this.delay / tempFadeDelay);
            this.tag.style.color = "rgb(" + tempColorValue + ", " + tempColorValue + ", " + tempColorValue + ")";
        } else {
            this.tag.style.color = "#FFFFFF";
        }
        if (this.delay <= 0) {
            this.tag.style.display = "none";
        } else {
            this.tag.style.display = "block";
            this.delay -= 1;
        }
    }
}

function Module(name) {
    this.name = name;
    this.tag = document.getElementById(name + "Module");
    this.buttonTag = document.getElementById(name + "Button");
    this.isVisible = false;
    this.hide();
    moduleList.push(this);
}

Module.prototype.showOrHide = function() {
    if (this.isVisible) {
        this.hide();
    } else {
        this.show();
    }
}

Module.prototype.updateButtonClass = function() {
    if (this.isVisible) {
        this.buttonTag.className = "moduleButtonOpen";
    } else {
        this.buttonTag.className = "moduleButton";
    }
}

Module.prototype.show = function() {
    this.isVisible = true;
    this.tag.style.display = "block";
    this.updateButtonClass();
}

Module.prototype.hide = function() {
    this.isVisible = false;
    this.tag.style.display = "none";
    this.updateButtonClass();
}

function getModuleByName(name) {
    var index = 0;
    while (index < moduleList.length) {
        var tempModule = moduleList[index];
        if (tempModule.name == name) {
            return tempModule;
        }
        index += 1;
    }
    return null;
}

function showOrHideModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.showOrHide();
}

function showModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.show();
}

function hideModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.hide();
}

function setAllInputIsFocusedAsFalse() {
    canvasIsFocused = false;
    chatInputIsFocused = false;
    overlayChatInputIsFocused = false;
    textToPlaceInputIsFocused = false;
    guidelinePosInputIsFocused = false;
}

function clearCanvas() {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvasWidth, canvasHeight);
}

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

function keyDownEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = true;
    }
    if (chatInputIsFocused) {
        if (keyCode == 13) {
            var tempText = chatInput.value;
            if (tempText.length > 0) {
                addAddChatMessageCommand(tempText);
                chatInput.value = "";
            }
        }
    } else if (overlayChatInputIsFocused) {
        if (keyCode == 13) {
            var tempText = overlayChatInput.value;
            if (tempText.length > 0) {
                addAddChatMessageCommand(tempText);
                overlayChatInput.value = "";
            }
            overlayChatInput.style.display = "none";
            overlayChatInputIsVisible = false;
            overlayChatInput.blur();
            setAllInputIsFocusedAsFalse();
            canvasIsFocused = true;
        }
    } else if (canvasIsFocused) {
        if (keyCode == 13) {
            document.getElementById("overlayChat").style.display = "block";
            overlayChatInput.style.display = "block";
            overlayChatInputIsVisible = true;
            setAllInputIsFocusedAsFalse();
            overlayChatInput.focus();
            overlayChatInputIsFocused = true;
        }
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
}

function keyUpEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = false;
    }
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
}

function timerEvent() {
    
    if (hasStopped) {
        return;
    }
    
    var tempTag = document.getElementById("overlayChat");
    var tempHasFoundVisibleMessage = false;
    var index = 0;
    while (index < overlayChatMessageList.length) {
        var tempMessage = overlayChatMessageList[index];
        if (tempMessage.getIsVisible()) {
            tempHasFoundVisibleMessage = true;
            break;
        }
        index += 1;
    }
    if (tempHasFoundVisibleMessage || overlayChatInputIsVisible) {
        tempTag.style.display = "block";
    } else {
        tempTag.style.display = "none";
    }
    
    var index = overlayChatMessageList.length - 1;
    while (index >= 0) {
        var tempMessage = overlayChatMessageList[index];
        tempMessage.tick();
        index -= 1;
    }
    
    lastActivityTime += 1;
    if (lastActivityTime > 10 * 60 * framesPerSecond) {
        alert("You have been kicked due to inactivity.");
        hasStopped = true;
        window.location = "menu";
    }
    
    if (!isRequestingGameUpdate) {
        gameUpdateRequestDelay -= 1;
        if (gameUpdateRequestDelay <= 0) {
            addGetChatMessagesCommand();
            addGetOnlinePlayersCommand();
            addGetBlocksCommand();
            addSetArmPosCommand();
            addGetEntitiesCommand();
            addGetStatsCommand();
            performGameUpdateRequest();
        }
    }
    
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

function initializeGame() {
    
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = canvasWidth / 2;
    canvas.style.height = canvasHeight / 2;
    canvas.style.border = "3px #000000 solid";
    
    canvas.onclick = function(event) {
        overlayChatInput.style.display = "none";
        overlayChatInputIsVisible = false;
        setAllInputIsFocusedAsFalse();
        canvasIsFocused = true;
    }
    
    chatInput = document.getElementById("chatInput");
    chatOutput = document.getElementById("chatOutput");
    overlayChatInput = document.getElementById("overlayChatInput");
    overlayChatOutput = document.getElementById("overlayChatOutput");
    
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
    
    var tempModule = new Module("stats");
    tempModule.show();
    var tempModule = new Module("chat");
    var tempModule = new Module("onlinePlayers");
    
    window.onkeydown = keyDownEvent;
    window.onkeyup = keyUpEvent;
    
    localPlayer = new Player(-1, null, null, null);
    addStartPlayingCommand();
    
    var tempProtocol;
    if (window.location.protocol == "http:") {
        tempProtocol = "ws:";
    } else {
        tempProtocol = "wss:";
    }
    var tempAddress = tempProtocol + "//" + window.location.hostname + ":" + window.location.port + "/gameUpdate";
    gameUpdateSocket = new WebSocket(tempAddress);
    gameUpdateSocket.onopen = function(event) {
        setInterval(timerEvent, Math.floor(1000 / framesPerSecond));
    };
    gameUpdateSocket.onmessage = function(event) {
        handleGameUpdateRequest(JSON.parse(event.data));
    };
}


