
var gameUtils = require("ostracod-multiplayer").gameUtils;
var classUtils = require("utils/class");

var tempResource = require("models/entity");
var Entity = tempResource.Entity;
var entityList = tempResource.entityList;

function PlayerEntity(username) {
    Entity.call(this);
    this.username = username;
    this.armPos1 = 0;
    this.armPos2 = 0;
    this.pendingPoints = 0;
}
classUtils.setParentClass(PlayerEntity, Entity);

module.exports = {
    PlayerEntity: PlayerEntity
}

PlayerEntity.prototype.getClientInfo = function() {
    var tempPlayer = gameUtils.getPlayerByUsername(this.username);
    return {
        className: "Player",
        id: this.id,
        username: tempPlayer.username,
        avatarColor: tempPlayer.extraFields.avatarColor,
        score: tempPlayer.score,
        armPos1: this.armPos1,
        armPos2: this.armPos2
    }
}


