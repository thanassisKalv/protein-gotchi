import {
  getLocalItemStorage,
  cleanLocalStorage
} from "./util";

/**
 * Calendar class
 * @param {object} game Phaser.Game
 * @param {object} position
 * @param {object} properties
 * @constructor
 * @extends {Phaser.BitmapText}
 */
let Calendar = function (game, position) {
  Phaser.BitmapText.call(this, game, position.x, position.y, "minecraftia", "Meal Calendar", 17);

  //Location
  this.x = position.x;
  this.y = position.y;
  this.game = game;
  this.anchor.setTo(0.5);
  this.tint = 0xfcb338;

  //this.scale.setTo(0.75);
  this.calendarButton = game.add.sprite(0, 35, "mealCalendar" );
  this.calendarButton.anchor.setTo(0.5);
  this.calendarButton.inputEnabled = true;
  this.inputEnabled = true;


  this.addChild(this.calendarButton);
  this.calendarButton.events.onInputDown.add(emptyModal, this);

  this.emptyModalName = "emptyCalendar";
  this.createModals();

};

Calendar.prototype = Object.create(Phaser.BitmapText.prototype);
Calendar.prototype.constructor = Calendar;


Calendar.prototype.createModals = function () {
  
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayType = ["introType1", "introType2", "introType3", "introType1", "introType2", "introType3", "introType1"];
  const meals = ["breakfast", "lunch", "dinner"];
  var itemsArrNew = [];
  const posY = [-200, -200, -200, -20, -20, -20, 160];
  const posX = [-120, 0, 120, -120, 0, 120, 0];
  var d = new Date();
  var today = days[d.getDay()];
  var mealNow = this.dayPeriod();

  for(var i=0; i<days.length; i++){
    itemsArrNew.push({
      type: "bitmapText",
      content: days[i],
      fontFamily: "LuckiestGuy",
      fontSize: 22,
      color: days[i]==today? "0x00cc00": "0x0077ff",
      offsetY: posY[i],
      offsetX: posX[i]
    })
    itemsArrNew.push({
      type: "image",
      content: dayType[i],
      contentScale: 0.15,
      offsetY: posY[i]-20,
      offsetX: posX[i]
      })
    for(var j=0; j<meals.length; j++){
      var nextMeal = (days[i]==today && mealNow==meals[j]);
      itemsArrNew.push({
        type: "bitmapText",
        content: nextMeal ? '-> '+meals[j] : meals[j],
        fontFamily: "LuckiestGuy",
        fontSize: 18,
        color: nextMeal?  "0x77ff33": "0xfb387c",
        offsetY: posY[i]+(j+1)*40,
        offsetX: posX[i]
      })
    }
  }

  this.game.modalHandler.createModal({
      type: this.emptyModalName,
      includeBackground: true,
      modalCloseOnInput: true,
      itemsArr: itemsArrNew
   });
}

Calendar.prototype.dayPeriod = function (){
  var today = new Date()
  var curHr = today.getHours()

  if (curHr < 12) {
    return "breakfast"
  } else if (curHr < 18) {
    return "lunch"
  } else {
    return "dinner"
  }
}


Calendar.prototype.displayModal = function () {
  console.log(this.emptyModalName);
  this.game.modalHandler.showModal(this.emptyModalName);
}

function emptyModal (){
    this.displayModal();
}


export default Calendar;