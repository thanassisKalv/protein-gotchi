import {
  getLocalItemStorage,
  cleanLocalStorage
} from "./util";

/**
 * NutriInfo class
 * @param {object} game Phaser.Game
 * @param {object} position
 * @param {object} properties
 * @constructor
 * @extends {Phaser.Sprite}
 */
let NutriInfo = function (game, position, confData, currentFoods) {
  Phaser.Sprite.call(this, game, position.x, position.y, confData.nutriInfo);

  //Location
  this.x = position.x;
  this.y = position.y;
  this.game = game;

  this.inputEnabled = true;
  this.scale.setTo(0.3);

  //Item properties
  this.confData = confData;

  this.currentFoods = currentFoods;
  //console.log(currentFoods);

  //this.game.modalHandler = new gameModal(game);
  this.modalContent = JSON.parse(this.game.cache.getText("modals_content"));
  this.emptyModalName = "noCurrentInfo";
  this.containsModalName = "currentFoodInfo";

  this.events.onInputDown.add(foodsModal, this);

  this.createModals();
  this.updateModal();

};
NutriInfo.prototype = Object.create(Phaser.Sprite.prototype);
NutriInfo.prototype.constructor = NutriInfo;

NutriInfo.prototype.createModals = function () {
  this.game.modalHandler.createModal({
    type: this.containsModalName,
    includeBackground: true,
    modalCloseOnInput: true,
    itemsArr: []
    });
}


NutriInfo.prototype.updateModal = function() {
  this.game.modalHandler.destroyModal(this.containsModalName);

  const startY= -200;
  const titleY = -240;
  var itemsArrNew = this.modalContent.nutriInfoTable;
  // iterate on current list of foods
  for(var i=0; i<this.currentFoods.length; i++){
    var currFood = this.currentFoods[i];
    itemsArrNew.push({
      type: "bitmapText",
      content: currFood[0],
      fontFamily: "LuckiestGuy",
      fontSize: 22,
      color: "0x44ff76",
      offsetY: startY+i*60,
      offsetX: -90
    })
    itemsArrNew.push({
      type: "bitmapText",
      content: currFood[1].protein.toString(),
      fontFamily: "LuckiestGuy",
      fontSize: 21,
      color: "0xfb387c",
      offsetY: startY+i*60,
      offsetX: -10
    })
    itemsArrNew.push({
      type: "bitmapText",
      content: currFood[1].carbs.toString(),
      fontFamily: "LuckiestGuy",
      fontSize: 21,
      color: "0xfb387c",
      offsetY: startY+i*60,
      offsetX: 50
    })
    itemsArrNew.push({
      type: "bitmapText",
      content: currFood[1].fat.toString(),
      fontFamily: "LuckiestGuy",
      fontSize: 21,
      color: "0xfb387c",
      offsetY: startY+i*60,
      offsetX: 110
    })
  }

  this.game.modalHandler.createModal({
      type: this.containsModalName,
      includeBackground: true,
      modalCloseOnInput: true,
      itemsArr: itemsArrNew
    });
}

NutriInfo.prototype.displayModal = function () {  

    this.game.modalHandler.showModal(this.containsModalName);
}


/**
 * Display a modal with the foods that Yammy has saved
 */
function foodsModal(){

  this.displayModal(true);

};


export default NutriInfo;
