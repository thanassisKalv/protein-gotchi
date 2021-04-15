

/**
 * MealView class
 * @param {object} game Phaser.Game
 * @param {object} position
 * @param {object} properties
 * @constructor
 * @extends {Phaser.BitmapText}
 */
let MealView = function (game, position, mealOverview) {
  Phaser.BitmapText.call(this, game, position.x, position.y, "minecraftia", "Meal Goals", 23);

  //Location
  this.x = position.x;
  this.y = position.y;
  this.game = game;
  this.anchor.setTo(0.5);
  this.tint = 0x4400ff;
  this.mealOverview = mealOverview;
  this.inputEnabled = true;

  this.events.onInputDown.add(emptyModal, this);

  //this.modalContent = JSON.parse(this.game.cache.getText("modals_content"));

  this.mealSummaryModal = "mealSummary";
  this.createModals();

};

MealView.prototype = Object.create(Phaser.BitmapText.prototype);
MealView.prototype.constructor = MealView;

MealView.prototype.createModals = function () {
  var itemsArrNew = [];

  itemsArrNew.push({
    type: "bitmapText",
    content: this.mealOverview.title,
    fontFamily: "LuckiestGuy",
    fontSize: 32,
    color: "0x44ff76",
    offsetY: -200,
    offsetX: 0,
    graphicWidth: 280,
    textAlign: "center"
  })
  itemsArrNew.push({
    type: "bitmapText",
    content: this.mealOverview.main,
    fontFamily: "LuckiestGuy",
    fontSize: 25,
    color: "0x003877",
    offsetY: -100,
    offsetX: 0,
    graphicWidth: 250
  })

  const startY = 0;
  for(var i=0; i<this.mealOverview.ingredients.length; i++){
    itemsArrNew.push({
      type: "bitmapText",
      content: "-"+this.mealOverview.ingredients[i],
      fontFamily: "LuckiestGuy",
      fontSize: 18,
      color: "0xff3877",
      offsetY: startY+i*70,
      offsetX: 0,
      graphicWidth: 320
    })
  }

  this.game.modalHandler.createModal({
    type: this.mealSummaryModal,
    includeBackground: true,
    modalCloseOnInput: true,
    itemsArr: itemsArrNew
  });

}

MealView.prototype.displayModal = function () {
  this.game.modalHandler.showModal(this.mealSummaryModal);
}

function emptyModal (){
    this.displayModal();
}


export default MealView;