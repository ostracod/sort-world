
var entityList = [];
var nextEntityId = 0;

function Entity() {
    this.id = nextEntityId;
    nextEntityId += 1;
    entityList.push(this);
}

module.exports = {
    Entity: Entity,
    entityList: entityList,
}

Entity.prototype.tick = function() {
    // Do nothing.
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

Entity.prototype.getClientInfo = function() {
    return {
        className: "Entity"
    }
}


