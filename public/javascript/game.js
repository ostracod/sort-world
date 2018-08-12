
var canvas;
var context;
var canvasWidth = 1600;
var canvasHeight = 1000;
var framesPerSecond = 16;
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
var blockAmount = 30; // Should be populated from the server.
var blockMargin = 20;
var blockWidth = (canvasWidth - blockMargin * 2) / blockAmount;
var blockPosY = 700;

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
            if (tempCommand.commandName == "addChatMessage") {
                performAddChatMessageCommand(tempCommand);
            }
            if (tempCommand.commandName == "removeAllOnlinePlayers") {
                performRemoveAllOnlinePlayersCommand(tempCommand);
            }
            if (tempCommand.commandName == "addOnlinePlayer") {
                performAddOnlinePlayerCommand(tempCommand);
            }
            index += 1;
        }
        // Repeat unprocessed client-side commands.
        var index = 0;
        while (index < gameUpdateCommandList.length) {
            var tempCommand = gameUpdateCommandList[index];
            // TODO: Parse command here.
            
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

function performSetLocalPlayerInfoCommand(command) {
    localPlayer.username = command.username;
    localPlayer.avatarColor = command.avatarColor;
    localPlayer.score = command.score;
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

function Player(id, username, avatarColor, score) {
    Entity.call(this, id);
    this.username = username;
    this.avatarColor = avatarColor;
    this.score = score;
    this.leftArmPos = 0;
    this.rightArmPos = 5;
}
setParentClass(Player, Entity);

Player.prototype.strokeArm = function(bodyPos, armPos, radiusOffset) {
    context.beginPath();
    context.moveTo(bodyPos.x, bodyPos.y);
    context.lineTo(armPos.x, armPos.y);
    context.stroke();
    var tempRadius = Math.floor(blockWidth / 2) + radiusOffset;
    var tempOffset = 6;
    context.beginPath();
    context.arc(armPos.x, armPos.y - tempOffset, tempRadius, 0, Math.PI);
    context.fill();
    if (radiusOffset > 0) {
        context.fillRect(armPos.x - tempRadius, armPos.y - tempOffset - radiusOffset, tempRadius * 2, radiusOffset, radiusOffset);
    }
}

Player.prototype.draw = function() {
    if (this.username === null) {
        return;
    }
    Entity.prototype.draw.call(this);
    var tempColor = colorSet[this.avatarColor];
    var tempLeftArmPos = new Pos(convertBlockPosToScreenPos(this.leftArmPos), blockPosY);
    var tempRightArmPos = new Pos(convertBlockPosToScreenPos(this.rightArmPos), blockPosY);
    var tempDelta = Math.abs(tempLeftArmPos.x - tempRightArmPos.x);
    var tempOffsetY = 230 - tempDelta / 14;
    var tempBodyPos = new Pos(Math.floor((tempLeftArmPos.x + tempRightArmPos.x) / 2), blockPosY + tempOffsetY);
    context.lineCap = "round";
    context.fillStyle = "#000000";
    context.strokeStyle = "#000000";
    context.beginPath();
    context.arc(tempBodyPos.x, tempBodyPos.y, 56, 0, 2 * Math.PI);
    context.fill();
    context.lineWidth = 22;
    this.strokeArm(tempBodyPos, tempLeftArmPos, 6);
    this.strokeArm(tempBodyPos, tempRightArmPos, 6);
    context.fillStyle = tempColor.toString();
    context.strokeStyle = tempColor.toString();
    context.beginPath();
    context.arc(tempBodyPos.x, tempBodyPos.y, 50, 0, 2 * Math.PI);
    context.fill();
    context.lineWidth = 10;
    this.strokeArm(tempBodyPos, tempLeftArmPos, 0);
    this.strokeArm(tempBodyPos, tempRightArmPos, 0);
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
    
    //drawCenteredText(tempPos, this.username);
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

function drawCenteredText(pos, text) {
    context.font = "bold 30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#000000";
    context.fillText(text, Math.floor(pos.x), Math.floor(pos.y));
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
            if (localPlayer.leftArmPos > 0) {
                localPlayer.leftArmPos -= 1;
            }
        }
        if (keyCode == 68) {
            if (localPlayer.leftArmPos < blockAmount - 1) {
                localPlayer.leftArmPos += 1;
            }
        }
        if (keyCode == 74) {
            if (localPlayer.rightArmPos > 0) {
                localPlayer.rightArmPos -= 1;
            }
        }
        if (keyCode == 76) {
            if (localPlayer.rightArmPos < blockAmount - 1) {
                localPlayer.rightArmPos += 1;
            }
        }
        if (keyCode == 32) {
            
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
    // TODO: Process key releases.
    
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
            performGameUpdateRequest();
        }
    }
    
    var index = entityList.length - 1;
    while (index >= 0) {
        var tempEntity = entityList[index];
        tempEntity.tick();
        index -= 1;
    }
    
    clearCanvas();
    // TODO: Draw blocks.
    
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        tempEntity.draw();
        index += 1;
    }
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

