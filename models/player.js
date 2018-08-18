
var classUtils = require("utils/class");

var tempResource = require("models/entity");
var Entity = tempResource.Entity;
var entityList = tempResource.entityList;

var tempResource = require("models/chatMessage");
var announceMessageInChat = tempResource.announceMessageInChat;
var getNextChatMessageId = tempResource.getNextChatMessageId;

function Player(account) {
    Entity.call(this);
    this.username = account.username;
    this.score = account.score
    this.avatarColor = account.avatarColor;
    this.armPos1 = 0;
    this.armPos2 = 0;
    var tempDate = new Date();
    this.lastActivityTime = tempDate.getTime();
    this.lastChatMessageId = getNextChatMessageId() - 10;
    announceMessageInChat(this.username + " has joined the game.");
}
classUtils.setParentClass(Player, Entity);

module.exports = {
    Player: Player
}

var accountUtils = require("utils/account");
var gameUtils = require("utils/game");

Player.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    var tempDate = new Date();
    var tempTime = tempDate.getTime();
    if (tempTime > this.lastActivityTime + 10 * 1000) {
        announceMessageInChat(this.username + " has left the game.");
        this.remove();
        return;
    }
}

Player.prototype.remove = function() {
    Entity.prototype.remove.call(this);
    this.persist(function() {});
}

Player.prototype.persist = function(done) {
    var self = this;
    accountUtils.acquireLock(function() {
        accountUtils.getAccountByUsername(self.username, function(error, account) {
            if (error) {
                accountUtils.releaseLock();
                console.log(error);
                return;
            }
            var tempValueSet = {
                score: self.score,
                avatarColor: self.avatarColor
            };
            accountUtils.updateAccount(account.uid, tempValueSet, function(error) {
                accountUtils.releaseLock();
                if (error) {
                    console.log(error);
                    return;
                }
                done();
            });
        });
    });
}

Player.prototype.getClientInfo = function() {
    return {
        className: "Player",
        id: this.id,
        username: this.username,
        avatarColor: this.avatarColor,
        score: this.score,
        armPos1: this.armPos1,
        armPos2: this.armPos2
    }
}


