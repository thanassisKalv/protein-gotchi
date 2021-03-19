

/**
 * Storage class
 * @param {object} game Phaser.Game
 * @param {object} position
 * @param {object} properties
 * @constructor
 * @extends {Phaser.Sprite}
 */
let Storage = function (game, position, confData) {
  Phaser.Sprite.call(this, game, position.x, position.y, "store-button");

  //Location
  this.x = position.x;
  this.y = position.y;
  this.game = game;

  //this.scale.setTo(0.75);
  this.unstoreButton = game.add.sprite(0,-50, "unstore-button");
  this.unstoreButton.inputEnabled = true;
  this.inputEnabled = true;

  this.addChild(this.unstoreButton);

  //this.unstoreButton.events.onInputOver.add(changeAlpha, this);

  //Item properties
  this.confData = confData;
  console.log(this.confData);
  //console.log(this);

  this.storedFoods = [];

  this.unstoreButton.events.onInputDown.add(foodsModal, this);
  this.events.onInputDown.add(this.storeNewFood, this);

  this.modalHandler = new gameModal(game);
  this.emptyModalName = "emptyfoodStorage";
  this.containsModalName = "foodStorage";

};
Storage.prototype = Object.create(Phaser.Sprite.prototype);
Storage.prototype.constructor = Storage;

// Store a regular item
Storage.prototype.storeNewFood = function () {
  var _this = this;
  this.game.itemsGroup.forEachAlive(function (item) {
    if (item.key != "items-pill-texture") {
      item.body.velocity.y = _this.confData.physics.jump.velocity.y;
      console.log(item.key, item.frame);

      _this.storedFoods.push({"key":item.key, "frame":item.frame, "name":item.name, "contains":item.tags});
      item.body.enable = false;
      _this.updateModal();

      var itemSave = _this.game.add.tween( item );
      itemSave.to({x: _this.x, y:_this.y}, 300).start()
      var itemScaleDown = _this.game.add.tween( item.scale );
      itemScaleDown.to({ x: 0.1, y: 0.1}, 300).start()

      itemSave.onComplete.add(function () {
        item.kill();
        item.destroy();
      });
      // this.character.head.animations.play("eat");  <-- make an animation?
      //this.clearSelection();
      //this.uiBlocked = false;
    }
  });
}


Storage.prototype.updateModal = function() {
  this.modalHandler.destroyModal(this.containsModalName);
  console.log(this.storedFoods);

  const startY= -220;
  var itemsArrNew = [];
  for(var i=0; i<this.storedFoods.length; i++){
    itemsArrNew.push({
      type: "text",
      content: this.storedFoods[i].name,
      fontFamily: "Luckiest Guy",
      fontSize: 22,
      color: "0xfb387c",
      offsetY: startY+i*55,
      offsetX: -50,
      graphicWidth: 200
    })
    itemsArrNew.push({
      type: "sprite",
      atlasParent: this.storedFoods[i].key,
      content: this.storedFoods[i].frame,
      offsetY: startY+i*45,
      offsetX: 50,
      graphicWidth: 200
    })
  }

  console.log(itemsArrNew);

  this.modalHandler.createModal({
      type: this.containsModalName,
      includeBackground: true,
      modalCloseOnInput: true,
      itemsArr: itemsArrNew
    });
}


Storage.prototype.createModals = function () {

  this.modalHandler.createModal({
    type: this.emptyModalName,
    includeBackground: true,
    modalCloseOnInput: true,
    itemsArr: [
          {
            type: "text",
            content: "Your storage is empty!",
            fontFamily: "Luckiest Guy",
            fontSize: 22,
            color: "0xfb387c",
            offsetY: -80,
            graphicWidth: 200
          },
          {
            type: "text",
            content: "Keep preparing your meal...",
            fontFamily: "Luckiest Guy",
            fontSize: 22,
            color: "0x00bb00",
            offsetY: 40,
            graphicWidth: 200
          }
        ]
    });

    this.modalHandler.createModal({
      type: this.containsModalName,
      includeBackground: true,
      modalCloseOnInput: true,
      itemsArr: [
            {
              type: "text",
              content: "Item X (sample banana)",
              fontFamily: "Luckiest Guy",
              fontSize: 22,
              color: "0xfb387c",
              offsetY: -100,
              offsetX: -50,
              graphicWidth: 200
            },
            {
              type: "sprite",
              atlasParent: "items-breakfast",
              content: 3,
              fontFamily: "Luckiest Guy",
              fontSize: 22,
              color: "0x00bb00",
              offsetY: -100,
              offsetX: 50,
              graphicWidth: 200
            }
          ]
      });
}

Storage.prototype.displayModal = function (empty) {  
  if(empty)
    this.modalHandler.showModal(this.emptyModalName);
  else
    this.modalHandler.showModal(this.containsModalName);
}


/**
 * Display a modal with the foods that Yammy has saved
 */
function foodsModal(){

  if (this.storedFoods.length==0){
    //console.log("we're here");
    this.displayModal(true);
  }
  else
    this.displayModal(false);

};


export default Storage;
