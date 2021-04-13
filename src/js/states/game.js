/**
 * @author       @jvalen <javiervalenciaromero@gmail.com>
 * @copyright    2015 Javier Valencia Romero
 */

import Phaser from "phaser";
import {
  getLocalItem,
  saveLocalItem,
  saveLocalStorage,
  saveMealStatus,
  shuffle,
  getRandomInt,
  tweenTint,
  findChild,
} from "../util";
import Character from "../character";
import Item from "../item";
import Storage from "../storage";
import NutriInfo from "../nutriInfo"
import Calendar from "../calendar";
import StatsUpdateItem from "../statsUpdateItem";
import Phasetips from "../Phasetips"
import { TileSprite, Timer } from "phaser-ce";

const TAGS = {
  SAVE: "save",
  EAT: "eat"
}
const mealsOrder = [ "breakfast", "lunch", "dinner"]

export default class extends Phaser.State {

  init(dietType, mealHour){
    console.log("Load stage for..." + dietType + ' - ' + mealHour);
    this.dietType = dietType;
    this.mealHour = mealHour;
    this.mealOrder = mealsOrder.indexOf(mealHour);
  }
  preload(){

    this.dayMeals = JSON.parse(this.game.cache.getText(this.dietType));
    this.sceneries = JSON.parse(this.game.cache.getText("scenes"));
    this.confData = JSON.parse(this.game.cache.getText("conf"));
    this.expertMeals = JSON.parse(this.game.cache.getText("expert_meals"));
    this.currentMeal = this.dayMeals.mealNames[this.mealOrder];
  }

  create() {
    
    this.game.time.events = new Timer(this);
    this.game.time.events.start();
    console.log(this.game.time.events.running);

    //Setup data
    //this.confData = JSON.parse(this.game.cache.getText("conf"));
    this.ITEM_WIDTH = this.confData.items.width;
    this.locale = "en";
    //this.mealOrder = this.dayMeals.mealNames.indexOf(this.currentMeal);
    //this.mealOrder = this.mealOrder>-1? this.mealOrder : 0;
    this.currentGoals = this.dayMeals.mealGoals[this.mealOrder];
    this.mealFoodWarnings = this.dayMeals.foodWarnings;
    this.upperLimit = this.dayMeals.gameoverLimits[this.mealOrder];
    this.finishWarnPositive = [];
    this.finishWarnNegative = [];

    //For debugging purpose
    //this.game.time.advancedTiming = true;

    //General resets
    this.gameOverFlag = false;
    this.uiBlocked = false;
    this.jumpTimer = 0;
    this.decreaseStatAmount = this.confData.decreaseStatAmount;

    //Game physics
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.physics.arcade.gravity.y = this.confData.physics.gravity;

    if (this.game.world.bounds.height === this.game.height) {
      this.newWorldBoundaries = {
        width: this.game.world.bounds.width,
        height: this.game.world.bounds.height - this.game.world.bounds.height / 5,
      };

      //Reduce world y axis boundaries
      this.game.world.setBounds( 0, 0, this.newWorldBoundaries.width, this.newWorldBoundaries.height);
    }

    //Background
    this.background = this.game.add.sprite(0, 0, "");
    this.background.inputEnabled = true;
    this.background.alpha = 0.75;

    this.game.modalHandler = new gameModal(game);

    //Calendar item
    this.uiButtons = this.game.add.group();
    this.calendar = new Calendar(this.game, {x: 5*this.game.width/6, y: 15}, this.mealHour);
    this.uiButtons.add(this.calendar);

    //Time counter
    this.timeCounter = this.game.add.text(265, 32, "0", {font: "12px Arial", fill: "#ffffff",align: "center",});
    this.timeCounter.anchor.setTo(0.5, 0.5);
    this.timeCounter.count = this.dayMeals.nextMealTime.shift();
    this.timeCounter.visible = false;


    //Time highscore
    var highscoreData = getLocalItem("highscore");
    if (!highscoreData) {
      highscoreData = 0;
      saveLocalItem("highscore", 0);
    }
    // this.highscore = this.game.add.text(85, 32, "0", { font: "12px Arial", fill: "#ffffff", align: "center", });
    // this.highscore.anchor.setTo(0.5, 0.5);
    // this.highscore.setText(highscoreData);

    //Sounds
    this.sounds = {
      kidLevelMusic: this.game.add.audio("kidLevelMusic"),
      winner: this.game.add.audio("aura"),
      errorAction: this.game.add.audio("incorrect"),
      pickupAction: this.game.add.audio("pick-up"),
      gameover: this.game.add.audio("gameover"),
    };

    //Characters
    this.characters = this.game.add.group();
    this.character = new Character( this.game, { x: 0, y: 0, }, this.confData.character );
    this.characters.add(this.character);
    this.character.enableClick();
    this.newWorldBoundaries["floorHeight"] = this.newWorldBoundaries.height - this.character.height;

    this.background.events.onInputDown.add(this.character.walkingTo, this.character);

    this.sceneItems = [];
    //Create button items
    //this.buttons = [];
    
    //Item pool
    this.itemsGroup = this.add.group();
    this.itemsGroup.enableBody = true;
    this.game.itemsGroup = this.itemsGroup;

    // UI-elements group so we can get them "in-front" with a single call
    this.createNavigationButtons();
    this.createActionButtons();

    //Create UI
    this.createUi(this.currentMeal);

    this.mealPlace = this.expertMeals.meals[this.currentMeal].place;
    // load scenery background and items and play initial dialog
    this.loadScenery(this.mealPlace);

    this.game.momInfoButton = this.game.add.sprite( this.game.width-50, this.game.height/4, "momInfo");
    this.game.momInfoButton.anchor.setTo(0.5);
    this.game.momInfoButton.scale.setTo(0.75);
    this.game.momInfoButton.alpha = 0.85;

    //console.log(this.expertMeals.meals[this.currentMeal].momIntro);
    this.tooltipsDialog( this.game.momInfoButton, this.expertMeals.meals[this.currentMeal].momIntro, "left", true);

    this.timerTimeUpdate = this.game.time.create(false);
    this.timerTimeUpdate.loop( Phaser.Timer.SECOND, this.updateTimeCounter, this);
    this.timerTimeUpdate.start();

    //Throw Rocks Timer
    this.rockIntervalTime = Phaser.Timer.SECOND * this.confData.timers.rockInterval;
    this.timerThrowPill = this.game.time.events.loop( this.rockIntervalTime, this.throwPill, this );
    //this.timerThrowPill.timer.start();

    //Load cloth changing events
    this.clothChangeTimeArray = this.confData.timers.clothChangeArray;
    this.costumeAvailableArray = this.confData.costumes.availabilityArray;
    this.totalHeadCostumes = this.confData.costumes.headAmount;
    this.totalBodyCostumes = this.confData.costumes.bodyAmount;
    //this.costumeAvailableArray = shuffle(this.costumeAvailableArray);
    this.costumeAvailableArray = [];

  }

  update() {
    //Check for collisions between items and character
    this.itemsGroup.forEachAlive(function (item) {
        if(item.body.enable == false){
          this.clearSelection();
          this.uiBlocked = false;
        }
        else
          this.game.physics.arcade.overlap(
            this.character,
            item,
            function () {
              //console.log(item);
              //Update stats and kill the item
              if(item.toDo == TAGS.SAVE){
                this.sounds.errorAction.play("", 0, 1, false);
                if(this.character.jumpingAway==false){
                  this.mommyDialogs = ["Hey better save this for later!"];
                  this.mommyWarns();
                }
                this.character.jumpAway(item);
                //console.log(item.key);
              }
              else if (item.key != "items-pill-texture") {
                //Regular item
                this.showStatsUpdateInfo({x:item.x, y:item.y}, item.amount+' gr', true);
                item.kill();
                this.character.head.animations.play("eat");
                this.sounds.pickupAction.play("", 0, 1, false);
                this.clearSelection();
                this.uiBlocked = false;

                this.refreshStats(item.customParams, item.amount/100.0);
              } else {
                //Rock item
                item.kill(true);
                this.character.head.animations.play("annoyed");
                this.refreshStats(item.customParams, 1.0);
              }
              //this.refreshStats(item.customParams);
            },
            null,
            this
          );
    }, this);
  }

  /**
   * Update time counter
   */
  updateTimeCounter() {
    this.timeCounter.count--;
    this.timeCounter.setText(this.timeCounter.count);
    if(this.timeCounter.count==0)
    {
      this.currentMeal = this.dayMeals.mealNames.shift();
      this.currentGoals = this.dayMeals.mealGoals.shift();
      this.createUi(this.currentMeal);
      this.character.showAura({}, {});

      this.timeCounter.count = this.dayMeals.nextMealTime.shift();
      this.timeCounter.setText(this.timeCounter.count);
    }
  }

  toolTipEvent(targetSprite, dialog, pos){
    var msgDelay = 2500;
    var tmpTip = new Phasetips(this.game, {
      targetObject: targetSprite,
      context: dialog,
      fontSize: 14, fontFill: "blue",
      backgroundColor: 0xff9d5c, roundedCornersRadius: 10,
      strokeColor: 0xfec72c, position: pos, animationDelay: 100, 
      animation: "grow", animationSpeedShow:200, animationSpeedHide:100
    });
    tmpTip.showTooltip();
    this.game.world.bringToTop(tmpTip);
    this.game.time.events.add(msgDelay, function(){tmpTip.destroy()}, this);
  }

  /**
   * A series of tooltip message upon a target-sprite
   * @param {Phaser.Sprite} targetSprite
   * @param {Array} dialogContent
   * @param {String} pos
   */
  tooltipsDialog(targetSprite, dialogContent, pos, starting){
    //console.log(dialogContent);
    var msgDelay = 3000;
    var _this = this;

    dialogContent.forEach(function(dialog, index){
      _this.game.time.events.add(msgDelay * (index+1), function(){
          //console.log(dialog);
          _this.toolTipEvent(targetSprite, dialog, pos);
        }, _this);
    })

    // in case this is the scene's start, throw the basic food-options
    if(starting){
      var momItem = {contains: "meal_basic", key:"Mommy"}
      this.game.time.events.add(msgDelay*dialogContent.length+1000, _this.loadOptions, {context:_this, item:momItem, itemSprite:_this.game.momInfoButton, game: _this.game});

    }
  }

  /**
   * Throw item from the top
   * @param {number} spriteType
   * @param {object} currentProperties
   * @param {object} spritesheet
   */
  throwItem(name, spriteType, currentProperties, spritesheet, toDo, amount) {
    var item = this.itemsGroup.getFirstExists(false);
    var positionY = -this.ITEM_WIDTH;
    var randomXposition = getRandomInt( this.ITEM_WIDTH, this.game.world.width - this.ITEM_WIDTH );
    if(toDo==TAGS.SAVE)
      randomXposition = getRandomInt( this.ITEM_WIDTH*3, this.game.world.width - this.ITEM_WIDTH*3 );

    var properties = {
        gravity: this.confData.items.gravity,
        maxSpeed: this.confData.items.maxVelocity,
        statsImpact: currentProperties,
        spriteType: spriteType,
        spritesheet: spritesheet,
        amount: amount,
        toDo: toDo,
        name: name
      };
    
    //console.log(name,properties);
    this.checkFoodWarnings(name);
      
    //Item pool: create an item if there are no dead items to reuse
    if (!item) {
      item = new Item( this.game, {x: randomXposition, y: positionY }, properties);
      this.itemsGroup.add(item);
    } else {
      //reset position
      item.reset({x: randomXposition, y: positionY,}, properties);
    }
    //this.character.walkingTo(this.background, null, { x: randomXposition, y: positionY });
    this.game.world.bringToTop(this.itemsGroup);
  }

  /* Yummy does some quick exercise */
  doesRopeJumping(){
    if(this.character.jumpingRope==false){
      this.character.jumpRope();
      this.reduceProperties();
    }
  }

  /**
   * Throw dangerous item
   */
   throwPill() {
     return;
    var item = this.itemsGroup.getFirstExists(false),
      positionX = Math.random() < 0.5 ? this.ITEM_WIDTH : this.newWorldBoundaries.width - this.ITEM_WIDTH + 1;
    var randomYposition = getRandomInt( this.ITEM_WIDTH, this.game.world.height / 2 ),
      currentProperties = {
        protein: getRandomInt( this.confData.items.rock.impact.min, this.confData.items.rock.impact.max ),
        carbs: getRandomInt( this.confData.items.rock.impact.min, this.confData.items.rock.impact.max),
        fat: getRandomInt( this.confData.items.rock.impact.min, this.confData.items.rock.impact.max),
      },
      spriteType = this.confData.items.rock.rockItemId,
      velocity = {
        x: positionX === this.ITEM_WIDTH ? this.confData.items.rock.velocity.x.min : this.confData.items.rock.velocity.x.max,
        y: this.confData.items.rock.velocity.y.min,
      },
      properties = {
        gravity: this.confData.items.gravity,
        maxSpeed: this.confData.items.maxVelocity,
        statsImpact: currentProperties,
        spriteType: spriteType,
        spritesheet: this.confData.items.rock.texture,
      };

    if (!item) {
      item = new Item( this.game, {x: positionX, y: randomYposition }, properties);
      this.itemsGroup.add(item);
    } else {
      //reset position
      item.reset( { x: positionX, y: randomYposition, }, properties );
    }

    item.setThrowProperties(velocity);
  }
  /**
   * Create an StatsUpdateItem object
   * @param {object} position
   * @param {number} amount
   * @param {boolean} positive
   */
  showStatsUpdateInfo(position, amount, positive) {
    var statsUpdateItem = this.statsUpdateInfoGroup.getFirstExists(false);

    //statsUpdateItem pool: create an StatsUpdateItem if there are no dead items to reuse
    if (!statsUpdateItem) {
      statsUpdateItem = new StatsUpdateItem( this.game, { x: position.x, y: position.y }, amount, positive );
      this.statsUpdateInfoGroup.add(statsUpdateItem);
    } else {
      //reset position
      statsUpdateItem.reset({ x: position.x, y: position.y }, amount, positive);
    }
  }
  /**
   * Play level music
   * @param {object} position
   * @param {number} amount
   * @param {boolean} positive
   */
  playLevelMusic() {
    //this.sounds.kidLevelMusic.play("", 0, 1, true);
  }

  createActionButtons(){
    this.storeButton = new Storage(this.game, {x: -2, y: this.game.height/2-100}, this.confData);
    //this.storeButton.createModals();
    this.uiButtons.add(this.storeButton);
  }

  createNavigationButtons(){
    this.exerciseButton = this.game.add.sprite( this.game.width-15, this.game.height/6, "jumpRope");
    this.exerciseButton.anchor.setTo(0.5);
    this.exerciseButton.scale.setTo(0.4);
    //this.exerciseButton.alpha = 0.5;
    this.exerciseButton.inputEnabled = true;
    this.exerciseButton.events.onInputDown.add(this.doesRopeJumping, this);

    this.uiButtons.add(this.exerciseButton);
  }

  /**
   * Create UI
   */
  createUi(mealName) {
    var buttonsData = this.confData.buttons;

    console.log(mealName);
    var buttonsCollection = this.expertMeals.meals[mealName].meal_basic;

    // Nothing is selected
    this.selectedItem = null;

    //Stat fields
    var labelCount = 3;
    var labelPortion = this.world.width / (labelCount*2);
    var position1 = 0 + labelPortion / 2;
    var position2 = labelPortion + labelPortion / 2;
    var position3 = labelPortion * 2 + labelPortion / 2;

    this.scoreBoard = this.game.add.sprite(position2, 80, "scoreBoard");
    this.scoreBoard.alpha = 0.7;
    this.scoreBoard.anchor.setTo(0.5);
    this.scoreBoard.scale.setTo(1.08);
    this.mealGoalsLabel = this.game.add.bitmapText( 70, 15, "minecraftia", this.confData.text[this.locale].mealGoals, 23 );
    this.mealGoalsLabel.tint = 0x4400ff;
    this.mealGoalsLabel.anchor.setTo(0.5);

    //Labels of property counters - [PROTEIN - CARBS - FAT]
    this.healthLabel = this.game.add.bitmapText( position1, 40, "minecraftia", this.confData.text[this.locale].protein, 16 );
    this.healthLabel.position.x = this.healthLabel.position.x - this.healthLabel.textWidth / 2;

    this.funLabel = this.game.add.bitmapText( position1, 70, "minecraftia", this.confData.text[this.locale].carbs, 16 );
    this.funLabel.position.x = this.funLabel.position.x - this.funLabel.textWidth / 2;

    this.nutritionLabel = this.game.add.bitmapText( position1, 100, "minecraftia", this.confData.text[this.locale].fat, 16 );
    this.nutritionLabel.position.x = this.nutritionLabel.position.x - this.nutritionLabel.textWidth / 2;

    //Character property counters - [PROTEIN - CARBS - FAT]
    if (typeof this.proteinCounter !== 'undefined') this.proteinCounter.destroy()
    this.proteinCounter = this.game.add.bitmapText( position2, 40, "minecraftia", "00", 22);
    this.proteinCounter.position.x = this.proteinCounter.position.x - this.proteinCounter.textWidth / 2;

    if (typeof this.carbsCounter !== 'undefined') this.carbsCounter.destroy();
    this.carbsCounter = this.game.add.bitmapText( position2, 70, "minecraftia", "00", 22 );
    this.carbsCounter.position.x = this.carbsCounter.position.x - this.carbsCounter.textWidth / 2;

    if (typeof this.fatCounter !== 'undefined') this.fatCounter.destroy();
    this.fatCounter = this.game.add.bitmapText( position2, 100, "minecraftia", "00", 22);
    this.fatCounter.position.x = this.fatCounter.position.x - this.fatCounter.textWidth / 2;

    //statUpdateItem pool
    this.statsUpdateInfoGroup = this.add.group();

    this.refreshStats();

    this.game.world.bringToTop(this.character);
    this.game.world.bringToTop(this.uiButtons);
  }
  /**
   * Release the action of the button clicked and freeze it
   * @param {Phaser.Sprite} sprite
   * @param {object} event
   */
  selectOption(sprite, event) {
    
    if (!this.uiBlocked && sprite.customParams.available>0) {
      this.uiBlocked = true;

      //Set the button active
      this.clearSelection();
      sprite.alpha = 0.6;
      sprite.y += 5;
      sprite.clicked = true;
      //console.log(sprite);
      sprite.customParams.available--;

      this.selectedItem = sprite;

      //Action depends of the button touched
      switch (sprite.type) {
        case 0:
        case 1:
        case 2:
        case 3:
          this.throwItem(sprite.name, sprite.type, this.selectedItem.customParams, sprite.key, sprite.toDo, sprite.amount);
          break;

      }
    }
  }

  discardOptions(){
    var _buttons = this.buttons;
    var _nutriInfo = this.nutriInfo;
    if( this.buttons.length < 1)
      return;

    for(var i=0; i<this.buttons.length; i++)
    {
      var itemDiscard = this.game.add.tween( this.buttons[i] );
      itemDiscard.to({ y:this.buttons[i].y+300}, 300).start()
      var itemScaleDown = this.game.add.tween( this.buttons[i].scale );
      itemScaleDown.to({ x: 0.2, y: 0.2}, 300).start()

      itemDiscard.onComplete.add(function () {
        for(var i=0; i<_buttons.length; i++)
          _buttons[i].destroy();
        _nutriInfo.destroy();
      });
    }
    this.enableNextItem();
  }

  enableNextItem(){
    this.buttons = [];
    var noItem = true;
    for(var i=0; i<this.sceneItems.length; i++){
      if (this.sceneItems[i].contains && this.sceneItems[i].opened==false){
        tweenTint(this.game, this.sceneItems[i], 0xfffff,  0xdd0000, 700);
        this.sceneItems[i].inputEnabled = true;
        this.sceneItems[i].opened = true;
        noItem = false;
        break;
      }
    }
    if (noItem){  // move to the next room  || or || the game is over
      var messages = { reason: "", tryAgain: "" };
      messages.reason = this.confData.text[this.locale].foodOver.toUpperCase();
      this.gameOver(messages, false);
      // this.kitchenButton.alpha = 1.0;
      // if(this.kitchenButton.colorTween != true){
      //   tweenTint(this.game, this.kitchenButton, 0xfffff,  0xdd0000, 700);
      //   this.kitchenButton.inputEnabled = true;
      //   this.kitchenButton.scale.setTo(0.65);
      //   this.kitchenButton.events.onInputDown.add(this.goToKitchen, this);
      // }
    }
  }

  /**
   * Yammy changes scene
   */
  goToKitchen(sprite, event){
    //console.log(event);
    this.loadScenery("kitchen");
    this.game.world.bringToTop(this.uiButtons);
    sprite.inputEnabled = false;
    sprite.alpha = 0.5;
    sprite.colorTweening.pause();
    sprite.tint = 0xffffff;
    sprite.scale.setTo(0.35);
  }
  goToRoom(sprite, event){
    this.loadScenery("bedroom");
    this.game.world.bringToTop(this.uiButtons);
    sprite.inputEnabled = false;
    sprite.alpha = 0.5;
    sprite.colorTweening.pause();
    sprite.tint = 0xffffff;
    sprite.scale.setTo(0.3);
  }
  goToPicnic(sprite, event){
    this.loadScenery("picnic");
    this.game.world.bringToTop(this.uiButtons);
    sprite.inputEnabled = false;
    sprite.alpha = 0.5;
    sprite.colorTweening.pause();
    sprite.tint = 0xffffff;
    sprite.scale.setTo(0.3);
  }

  /**
  * Check if this food choice requires a warning
  */
 checkFoodWarnings(foodName){
  for(var i=0; i<this.mealFoodWarnings.length; i++){
    var foodWrn = this.mealFoodWarnings[i];
    if(foodWrn.includes.indexOf(foodName) >= 0 ){
      if(foodWrn.immediate)
        this.tooltipsDialog(this.game.momInfoButton, [foodWrn.text], "left", false);
      else if(foodWrn.positive)
        this.finishWarnPositive.push(foodWrn.text);
      else
        this.finishWarnNegative.push(foodWrn.text);
      //console.log(foodWrn.text);
    }
  }
}

  /**
  * Check events according to scenery-defined limtes
  */
 checkEventsLimits(){
    const limits = { "tooMuchSugar": 245};

    if (this.character.customParams.carbs > limits.tooMuchSugar) {
      this.kitchenButton.alpha = 1.0;
      if(this.kitchenButton.colorTween != true){
        tweenTint(this.game, this.kitchenButton, 0xfffff,  0xdd0000, 700);
        this.kitchenButton.inputEnabled = true;
        this.kitchenButton.scale.setTo(0.65);
        this.kitchenButton.events.onInputDown.add(this.goToKitchen, this);
      }
    }
  }
  
  loadScenery(sceneName){
    //console.log(sceneName);
    this.background.loadTexture(this.sceneries[sceneName].background);
    this.background.width = this.game.width;
    this.background.height = this.game.height;

    for (var i=0; i<this.sceneItems.length; i++)
      this.sceneItems[i].destroy();

    this.sceneItems = [];

    var newSceneItems = this.sceneries[sceneName].items;
    // Put the "container-items" into screen (if they contain foods, attach onClick loading)
    for (var i=0; i<newSceneItems.length; i++){
      var item = newSceneItems[i];
      var itemTmp = this.game.add.sprite( item.x, item.y, item.key );
      itemTmp.anchor.setTo(0.5);
      
      if (typeof item.contains !== 'undefined'){
        itemTmp.inputEnabled = false;
        itemTmp.events.onInputDown.add( this.loadOptions, {context:this, item:item, itemSprite:itemTmp, game: this.game});
        itemTmp.contains = true;
        itemTmp.opened = false;
      }
      else
        itemTmp.contains = false;

      this.sceneItems.push(itemTmp);
    }

    // just an intro dialog of Mommy with Yammy (scenery-based, can be funny, irrelevant)
    //if(this.sceneries[sceneName].mommyWarns.length>0){
    //  this.mommyDialogs = this.sceneries[sceneName].mommyWarns;
    //  this.game.time.events.add(Phaser.Timer.SECOND * 12, this.mommyWarns, this);
    //}

    if(typeof this.buttons !== 'undefined' && this.buttons.length==0)
      this.enableNextItem();

    this.game.world.bringToTop(this.characters);
  }
  
  loadOptions(){
    this.context.buttons = [];
    
    if(this.item.key!="Mommy"){
      this.itemSprite.inputEnabled = false;
      this.itemSprite.colorTweening.pause();
    }
    this.itemSprite.tint = 0xffffff;

    //console.log("Loading items from... ", this.item.key);
    var mealName = this.context.currentMeal;
    var buttonsCollection = this.context.expertMeals.meals[mealName][this.item.contains];
    var screenButtonSize = this.game.width / buttonsCollection.length;

    this.game.mommyDialogsIfo = this.context.expertMeals.meals[mealName].instructions.shift();
    //this.game.time.events.add(Phaser.Timer.SECOND * 1, this.context.mommyInforms, this.context);
    this.context.tooltipsDialog(this.game.momInfoButton, this.game.mommyDialogsIfo, "left", false)

    this.context.uiBlocked = true;
    var buttonArrayInfo = [];
    var foodArrayInfo = [];
    var currentButton;

    // Setup buttons
    for (var i = 0; i < buttonsCollection.length; i++) {
      //Main properties
      currentButton = {
        name: buttonsCollection[i].name,
        spritesheet: buttonsCollection[i].spritesheet,
        y: this.game.height + buttonsCollection[i].offsetY-20,
        frame: buttonsCollection[i].frame,
        type: buttonsCollection[i].type,
        toDo: buttonsCollection[i].toDo,
        customParams: buttonsCollection[i].customParams,
        gram: buttonsCollection[i].gram,
        step: buttonsCollection[i].step,
      };

      // Calculate Button X-position
      if (buttonsCollection[i].order === 1) 
        currentButton["x"] = screenButtonSize / 2;
      else if (buttonsCollection[i].order === buttonsCollection[i].length) 
        currentButton["x"] = this.game.width - screenButtonSize / 2;
      else 
        currentButton["x"] = screenButtonSize * buttonsCollection[i].order - screenButtonSize / 2;
      
      buttonArrayInfo.push(currentButton);
    }

    var delayButtons = this.game.mommyDialogsIfo.length*3000 + 4000;
    this.game.time.events.add(delayButtons, function(){ 
      this.context.uiBlocked=false; 
      this.context.clearSelection(); 
    }, this);

    // reset the existing (if any) buttons
    for (var i=0; i<this.context.buttons.length; i++)
      this.context.buttons[i].destroy();

    for (var i = 0; i < buttonArrayInfo.length; i++) {
      var currentItem = buttonArrayInfo[i];

      this[currentItem.name] = this.game.add.sprite( this.itemSprite.x, this.itemSprite.y, currentItem.spritesheet );
      this[currentItem.name].name = currentItem.name;
      this[currentItem.name].frame = currentItem.frame;
      this[currentItem.name].type = currentItem.type;
      this[currentItem.name].anchor.setTo(0.5);
      this[currentItem.name].scale.setTo(0.3);
      this[currentItem.name].inputEnabled = true;
      this[currentItem.name].toDo = currentItem.toDo;
      this[currentItem.name].customParams = currentItem.customParams;
      this[currentItem.name].alpha = 0.6;
      this[currentItem.name].y += 5;
      this[currentItem.name].clicked = true;
      this[currentItem.name].events.onInputDown.add(this.context.selectOption, this.context);
      if (typeof currentItem.gram !== 'undefined'){
        this[currentItem.name].amount = currentItem.gram;
        this[currentItem.name].amountTxt = this.game.add.text(25, 10, currentItem.gram+"gr", { font: "12px Consolas", fill: "#ffda66", align: "center", });
        if (currentItem.step > 0){
          this[currentItem.name].step = currentItem.step;
          this[currentItem.name].plus = this.game.add.button( -20, 45, "plusButton", this.context.plusClicked, this[currentItem.name]);
          this[currentItem.name].plus.scale.setTo(0.24);
          this[currentItem.name].plus.anchor.setTo(0.5);
          this[currentItem.name].minus = this.game.add.button( 20, 45, "minusButton", this.context.minusClicked, this[currentItem.name]);
          this[currentItem.name].minus.scale.setTo(0.24);
          this[currentItem.name].minus.anchor.setTo(0.5);
          this[currentItem.name].addChild(this[currentItem.name].plus);
          this[currentItem.name].addChild(this[currentItem.name].minus);
        }
        this[currentItem.name].addChild(this[currentItem.name].amountTxt);
      }

      foodArrayInfo.push([currentItem.name, currentItem.customParams])

      var itemMov = this.game.add.tween(this[currentItem.name]);
      itemMov.to({ x: currentItem.x, y:currentItem.y}, 300).delay(i*100).start();
      var itemScale = this.game.add.tween(this[currentItem.name].scale);
      itemScale.to({ x: 1, y: 1}, 300).delay(i*100).start()

      this.context.buttons.push(this[currentItem.name]);

      if (i==0 && typeof this.context.discardButton === 'undefined'){
        this.context.discardButton = this.game.add.sprite( currentItem.x-60, currentItem.y+60, this.context.confData.discardButton );
        this.context.discardButton.events.onInputDown.add(this.context.discardOptions, this.context);
        this.context.discardButton.scale.setTo(0.7);
        this.context.discardButton.inputEnabled = true;
      }
      if (i==buttonArrayInfo.length-1){
        //var x = this.context.storeButton.x, y = this.context.storeButton.y+55;
        var x = this.game.width-40, y = this.game.height-50;
        this.context.nutriInfo = new NutriInfo(this.game, {x, y}, this.context.confData, foodArrayInfo);

        this.context.uiButtons.add(this.context.nutriInfo);
      }
    }
  }
  
  plusClicked(){
    if(this.clicked) return;
    this.amount = this.amount + this.step;
    if(this.amount >200)
      this.amount = 200;
    this.amountTxt.setText(this.amount+"gr");
  }
  minusClicked(){
    if(this.clicked) return;
    //console.log("Minus clicked!");
    if(this.amount - this.step>0)
      this.amount = this.amount - this.step;
    this.amountTxt.setText(this.amount+"gr");
  }

  mommyWarns(){
    this.game.momInfoButton.loadTexture("momInfoWarn");
    var warnTip = new Phasetips(this.game, {
      targetObject: this.game.momInfoButton,
      context: this.mommyDialogs[0],
      fontSize: 14, fontFill: "red",
      backgroundColor: 0xff9d5c, roundedCornersRadius: 10,
      strokeColor: 0xfec72c, position: "left", animationDelay: 100, 
      animation: "grow", animationSpeedShow:200, animationSpeedHide:100
    });
    warnTip.showTooltip();
    var momInfoButton = this.game.momInfoButton;
    this.game.time.events.add(Phaser.Timer.SECOND * 3.5, function(){
        warnTip.destroy(); 
        momInfoButton.loadTexture("momInfo");
      }, this);
  }


  mommyInforms(){
    this.game.momInfoButton.loadTexture("momInfoWarn");
    var warnTip = new Phasetips(this.game, {
      targetObject: this.game.momInfoButton,
      context: this.game.mommyDialogsIfo,
      fontSize: 14, fontFill: "red",
      backgroundColor: 0xff9d5c, roundedCornersRadius: 10,
      strokeColor: 0xfec72c, position: "left", animationDelay: 100, 
      animation: "grow", animationSpeedShow:200, animationSpeedHide:100
    });
    warnTip.showTooltip();
    var momInfoButton = this.game.momInfoButton;
    this.game.time.events.add(Phaser.Timer.SECOND * 6, function(){
        warnTip.destroy(); 
        momInfoButton.loadTexture("momInfo");
      }, this);
  }


  /**
   * Reduce stats by fixed value
   */
  reduceProperties() {
    this.character.customParams.protein -= 1;
    this.character.customParams.carbs -= 2;
    this.character.customParams.fat -= 0.5;
    this.refreshStats();
  }
  /**
   * Release the button touched
   */
  clearSelection() {

    if (typeof this.buttons !== 'undefined')
      this.buttons.forEach(function (element) {
        if (element.clicked && element.customParams.available>0) {
          element.alpha = 1;
          element.y -= 5;
          element.clicked = false;
        }
      });

    this.selectedItem = null;
  }
  /**
   * Update stats on screen
   * @param {object} properties
   */
  refreshStats(properties, amount) {
    if (!!properties) {
      var characterProperty;

      //Update character properties
      for (characterProperty in properties) {
        if (properties.hasOwnProperty(characterProperty)) {
          var x = 0, y = 20;
          properties[characterProperty] = properties[characterProperty] * amount;
          this.character.customParams[characterProperty] += properties[characterProperty];

          switch (characterProperty) {
            case "protein":
              x = this.proteinCounter.x + this.proteinCounter.width / 2;
              y += this.proteinCounter.y + this.proteinCounter.height;
              break;
            case "carbs":
              x = this.carbsCounter.x + this.carbsCounter.width / 2;
              y += this.carbsCounter.y + this.carbsCounter.height;
              break;
            case "fat":
              x = this.fatCounter.x + this.fatCounter.width / 2;
              y += this.fatCounter.y + this.fatCounter.height;
              break;
            default:
          }

          this.showStatsUpdateInfo(
            { x: x, y: y },
            properties[characterProperty].toFixed(),
            properties[characterProperty] > 0
          );
        }
      }
    }

    this.checkEventsLimits();
    var messages = { reason: "", tryAgain: "" };

    if ( this.character.customParams.protein <= 0 || this.character.customParams.protein > this.upperLimit.protein ||
          this.character.customParams.carbs <= 0 || this.character.customParams.carbs > this.upperLimit.carbs ||
          this.character.customParams.fat <= 0  || this.character.customParams.fat > this.upperLimit.fat )
    {
      // -- GAMEOVER --
      if (this.character.customParams.protein <= 0) {
        this.character.customParams.protein = 0;
        messages.reason = this.confData.text[this.locale].lowProtein;
      }
      if (this.character.customParams.carbs <= 0) {
        this.character.customParams.carbs = 0;
        messages.reason = this.confData.text[this.locale].lowCarbs;
      }
      if (this.character.customParams.fat <= 0) {
        this.character.customParams.fat = 0;
        messages.reason = this.confData.text[this.locale].lowFat;
      }
      if (this.character.customParams.protein > this.upperLimit.protein) 
        messages.reason = this.confData.text[this.locale].highProtein;
      if (this.character.customParams.carbs > this.upperLimit.carbs) 
        messages.reason = this.confData.text[this.locale].highCarbs;
      if (this.character.customParams.fat > this.upperLimit.fat) 
        messages.reason = this.confData.text[this.locale].highFat;
      

      messages.tryAgain = this.confData.text[ this.locale ].tryAgain.toUpperCase();

      //Update highscore if necessary
      if (this.timeCounter.count > getLocalItem("highscore")) {
        saveLocalItem("highscore", this.timeCounter.count);
      }

      saveLocalStorage("foods", this.storeButton.storedFoods);
      //save next_meal's name
      saveLocalItem("next_meal", this.dayMeals.mealNames[0]);
      //this.game.state.start('mainMenu', true, false, messages);
      this.gameOver(messages, false);
    } 
    // this.currentGoals.protein
    else if ( this.character.customParams.protein <= this.currentGoals.protein+5 &&  this.character.customParams.protein > this.currentGoals.protein-5 &&
      this.character.customParams.carbs <= this.currentGoals.carbs+5 && this.character.customParams.carbs >  this.currentGoals.carbs-5 &&
      this.character.customParams.fat <= this.currentGoals.fat+5  && this.character.customParams.fat > this.currentGoals.fat-5 )
    {
       // --- MEAL IS READY ---
      messages.tryAgain = this.confData.text[ this.locale ].tryAgain.toUpperCase();
      messages.reason = this.confData.text[this.locale].mealReady.toUpperCase();
      //save next_meal's name
      saveLocalItem("next_meal", this.dayMeals.mealNames[0]);
      //save any food that has been stored for later
      saveLocalStorage("foods", this.storeButton.storedFoods);
      this.gameOver(messages, true);
    }
    else {
      //Set counter boundaries
      for (var currentPropertyReset in this.character.customParams) {
        if (this.character.customParams[currentPropertyReset] > 100) {
          this.character.customParams[currentPropertyReset] = 100;
        }
      }

      // Alert color codes
      for (var currentProperty in this.character.customParams) {
        if (this.character.customParams.hasOwnProperty(currentProperty)) {
          var tintColor = 0xffffff;
          if ( this.character.customParams[currentProperty] < this.confData.redAlertLimit ) {
            tintColor = 0xff0000;
          }
          else if ( this.character.customParams[currentProperty] <= this.currentGoals[currentProperty]+5 &&
              this.character.customParams[currentProperty] > this.currentGoals[currentProperty]-5) 
            tintColor = 0x00ff00;

          switch (currentProperty) {
            case "protein":
              this.proteinCounter.tint = tintColor;
              break;
            case "carbs":
              this.carbsCounter.tint = tintColor;
              break;
            case "fat":
              this.fatCounter.tint = tintColor;
              break;
          }
        }
      }
    }

    //Update stats
    this.proteinCounter.setText(this.character.customParams.protein.toFixed(1).toString() + "/" + this.currentGoals.protein+" gr.") ;
    this.carbsCounter.setText(this.character.customParams.carbs.toFixed(1).toString() + "/" + this.currentGoals.carbs+" gr.") ;
    this.fatCounter.setText( this.character.customParams.fat.toFixed(1).toString() + "/" + this.currentGoals.fat+" gr.") ;
  }



  nextMeal(){
    var today = new Date();
    var curHr = today.getHours();
    var curMin = today.getMinutes();
    var nxMeal = "";
    var nxTime = 0;

    if (curHr < 12) {
      nxMeal = "lunch";
      nxTime = (12-curHr>2) ? 12 - curHr: 2;
    } else if (curHr < 18) {
      nxMeal = "dinner";
      nxTime = (18-curHr>2) ? 18 - curHr: 2;
    } else {
      nxMeal = "breakfast";
      nxTime = (31-curHr);
    }

    return [nxMeal, nxTime];
  }

  currentDay(){
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var nowDate = new Date();
    return days[nowDate.getDay()];
  }
  
  /**
   * The game ends and show game over screen
   * @param {object} messages
   */
  gameOver(messages, winner) {
    if (!this.gameOverFlag) {

      saveMealStatus(this.currentDay(), this.mealHour, winner);

      var gameOverPanelTween;

      //Resets
      this.gameOverFlag = true;
      //this.statsDecreaser.stop();
      this.timerTimeUpdate.stop();
      this.timerThrowPill.timer.stop();
      this.character.stopSounds();

      //Game over background layer
      this.bgLayer = this.add.bitmapData(this.game.width, this.game.height);
      this.bgLayer.ctx.fillStyle = "#000";
      this.bgLayer.ctx.fillRect(0, 0, this.game.width, this.game.height);

      //sprite for bgLayer
      this.gameOverPanel = this.add.sprite(0, 0, this.bgLayer);
      this.gameOverPanel.alpha = 0;

      gameOverPanelTween = this.game.add.tween(this.gameOverPanel).to({ alpha: 0.8 }, 300, Phaser.Easing.Linear.None, true);

      gameOverPanelTween.onComplete.add(function () {
        var highscoreData = getLocalItem("highscore"),
          halfWidth = this.game.width / 2,
          halfHeight = this.game.height / 2,
          gameOverText,
          reasonText,
          creditsText,
          nextMealButton,
          nextMealText,
          notifyButton,
          gameOverGroup = this.game.add.group(),
          characterInfo = this.character.shareCharacterInfo(),
          sharedHeadSprite,
          sharedBodySprite;

        gameOverGroup.add(this.game.momInfoButton);
        //Kill character
        this.character.kill();
        //Draw shared type character body
        sharedBodySprite = this.game.add.sprite( halfWidth / 2, 280+70, characterInfo.body.spriteName );
        sharedBodySprite.anchor.setTo(0.5);
        sharedBodySprite.frame = winner? 2: characterInfo.body.spriteFrame;


        //Draw shared type character head
        sharedHeadSprite = this.game.add.sprite( 0, -75, characterInfo.head.spriteName );
        sharedHeadSprite.anchor.setTo(0.5);
        sharedHeadSprite.frame = winner? 2: characterInfo.head.spriteFrame;

        sharedBodySprite.addChild(sharedHeadSprite);

        function getNextMealNotification(){
          var nxMeal = this.nextMeal();
          // ---- inform server about finishing this meal ----
          checkNextMeal(nxMeal[0], nxMeal[1]);

          this.game.add.tween(notifyButton).to({ x: notifyButton.x+300, y:notifyButton.y}, 300).start()
          this.game.add.tween(gameOverText).to({ x: gameOverText.x+300, y:gameOverText.y}, 300).start()
        }

        //Result texts
        notifyButton = this.game.add.button( halfWidth, 50, "notifyButton", getNextMealNotification, this);
        notifyButton.anchor.setTo(0.5);
        gameOverGroup.y = this.game.height;
        gameOverText = this.add.bitmapText( halfWidth, 50, "minecraftia", this.confData.text[this.locale].gameOver.toUpperCase()+"!", 18);
        gameOverText.anchor.setTo(0.5);
        gameOverText.maxWidth = 250;

        reasonText = this.add.bitmapText( halfWidth, 140, "minecraftia", messages.reason, 30 );
        reasonText.anchor.setTo(0.5);
        reasonText.maxWidth = 290;

        var startingWarnings = 220;
        var _game = this.game;
        this.finishWarnPositive.forEach( function(warnText, index){
          var warnBitText = _game.add.bitmapText( halfWidth-40 , startingWarnings+index*60, "minecraftia", "+ "+warnText.toUpperCase(), 16);
          warnBitText.tint = 0x000cc00;
          warnBitText.maxWidth = 220;
          gameOverGroup.add(warnBitText);
        });
        var offset = this.finishWarnPositive.length*60;
        this.finishWarnNegative.forEach( function(warnText, index){
          var warnBitText = _game.add.bitmapText( halfWidth-40 , startingWarnings+offset+index*60, "minecraftia", "- "+warnText.toUpperCase(), 16);
          warnBitText.tint = 0xcc0000;
          warnBitText.maxWidth = 220;
          gameOverGroup.add(warnBitText);
        });

        this.game.world.bringToTop(this.game.momInfoButton);

        nextMealButton = this.game.add.button( halfWidth, 470+30, "button-next", this.restart, this, 0, 0, 1, 0 );
        nextMealButton.anchor.setTo(0.5);
        nextMealText = this.add.bitmapText( nextMealButton.x, nextMealButton.y, "minecraftia", this.confData.text[this.locale].nextMealButton, 22 );
        nextMealText.anchor.setTo(0.5);

        //Credits
        creditsText = this.add.bitmapText( 0, this.game.height - 20, "minecraftia", "By protein.eu", 10 );
        creditsText.align = "left";
        creditsText.x = this.game.width - creditsText.textWidth - 10;
        creditsText.inputEnabled = true;
        creditsText.events.onInputDown.add(function () {
          var url = "https://protein-h2020.eu/";
          window.open(url, "_blank");
        }, this);

        gameOverGroup.add(notifyButton);
        gameOverGroup.add(gameOverText);
        gameOverGroup.add(reasonText);
        gameOverGroup.add(nextMealButton);
        gameOverGroup.add(nextMealText);
        gameOverGroup.add(sharedBodySprite);
        gameOverGroup.add(creditsText);
        this.game.momInfoButton.loadTexture("momInfo");

        this.game.add.tween(gameOverGroup.position).to({ y: 0 }, 1000, Phaser.Easing.Back.InOut, true);
        
      }, this);

      //Stop music
      this.sounds.kidLevelMusic.stop();
      if(winner)
        this.sounds.winner.play("", 0, 1, false);
      else
        this.sounds.gameover.play("", 0, 1, false);

      gameOverPanelTween.start();
    }
  }
  /**
   * Restart game properties
   */
  restart() {
    //console.log(this.buttons);
    //Reset and restart the game
    this.timerTimeUpdate.stop();
    this.uiBlocked = false;
    this.clearSelection();
    delete this.buttons;
    delete this.discardButton;
    delete this.game.momInfoButton;
    delete this.game.mommyDialogsIfo;

    this.game.time.events.destroy();

    var nextMeal = this.mealOrder+1;
    if ( nextMeal%3==0){
      this.game.state.start("MainMenu");
    }
    else
      this.game.state.start("Game", true, false, this.dietType, mealsOrder[nextMeal] );  // (...) todo: add arguments for next meal
  }

  render() {
    //Render FPS for debugging
    //this.game.debug.text(this.game.game.time.fps || '--', 5, 20, "#00ff00");
  }
}
