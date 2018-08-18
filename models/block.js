
var blockList = [];
var nextBlockId = 0;

function Block(value) {
    this.id = nextBlockId;
    this.value = value;
    nextBlockId += 1;
    blockList.push(this);
}

module.exports = {
    Block: Block,
    blockList: blockList,
}

Block.prototype.getClientInfo = function() {
    return {
        id: this.id,
        value: this.value
    }
}


