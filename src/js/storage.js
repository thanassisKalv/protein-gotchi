import {
  getLocalItemStorage,
  cleanLocalStorage
} from "./util";

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

  //Item properties
  this.confData = confData;

  this.storedFoods = [];

  this.unstoreButton.events.onInputDown.add(foodsModal, this);
  this.events.onInputDown.add(this.storeNewFood, this);

  //this.game.modalHandler = new gameModal(game);
  this.modalContent = JSON.parse(this.game.cache.getText("modals_content"));
  this.emptyModalName = "emptyfoodStorage";
  this.containsModalName = "foodStorage";

  this.createModals();
  this.checkExistingStorage();

};
Storage.prototype = Object.create(Phaser.Sprite.prototype);
Storage.prototype.constructor = Storage;

// Load previously saved items
Storage.prototype.checkExistingStorage = function () {

  this.storedFoods = getLocalItemStorage("foods");
  //console.log(this.storedFoods);
  if (this.storedFoods==null)
    this.storedFoods = [];
  this.updateModal();
}

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
      // this.character.head.animations.play("eat");  <-- make an item-saving animation?
      //this.clearSelection();
      //this.uiBlocked = false;
    }
  });
}

Storage.prototype.emptyStorage = function(){
  //console.log(this.context);
  this.context.storedFoods = [];
  this.context.game.modalHandler.hideModal(this.context.containsModalName);
  this.context.updateModal();
  this.context.game.modalHandler.showModal(this.context.emptyModalName);
  cleanLocalStorage("foods");
}

Storage.prototype.updateModal = function() {
  this.game.modalHandler.destroyModal(this.containsModalName);

  const startY= -220;
  var itemsArrNew = [];
  for(var i=0; i<this.storedFoods.length; i++){
    itemsArrNew.push({
      type: "bitmapText",
      content: this.storedFoods[i].name,
      fontFamily: "LuckiestGuy",
      fontSize: 22,
      color: "0xfb387c",
      offsetY: startY+i*60,
      offsetX: -50
    })
    itemsArrNew.push({
      type: "sprite",
      atlasParent: this.storedFoods[i].key,
      content: this.storedFoods[i].frame,
      offsetY: startY+i*60,
      offsetX: 50,
      graphicWidth: 200
    })
  }

  itemsArrNew.push({
    type: "sprite",
    atlasParent: "discardButton",
    offsetY: 150,
    offsetX: 160,
    graphicWidth: 200,
    contentScale: 0.5,
    context: this,
    callback: this.emptyStorage
  })

  //console.log(itemsArrNew);

  this.game.modalHandler.createModal({
      type: this.containsModalName,
      includeBackground: true,
      modalCloseOnInput: true,
      itemsArr: itemsArrNew
    });
}


Storage.prototype.createModals = function () {

  this.game.modalHandler.createModal({
    type: this.emptyModalName,
    includeBackground: true,
    modalCloseOnInput: true,
    itemsArr: this.modalContent.emptyStorage
    });

    this.game.modalHandler.createModal({
      type: this.containsModalName,
      includeBackground: true,
      modalCloseOnInput: true,
      itemsArr: [
          ]
      });
}

Storage.prototype.displayModal = function (empty) {  
  if(empty)
    this.game.modalHandler.showModal(this.emptyModalName);
  else
    this.game.modalHandler.showModal(this.containsModalName);
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
