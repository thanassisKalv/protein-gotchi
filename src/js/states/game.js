/**
 * @author       @jvalen <javiervalenciaromero@gmail.com>
 * @copyright    2015 Javier Valencia Romero
 */

import Phaser from "phaser";
import {
  getLocalItem,
  saveLocalItem,
  shuffle,
  getRandomInt,
  tweenTint,
  findChild,
} from "../util";
import Character from "../character";
import Item from "../item";
import Storage from "../storage";
import StatsUpdateItem from "../statsUpdateItem";
import Phasetips from "../Phasetips"
import { TileSprite } from "phaser-ce";

export default class extends Phaser.State {

  init(dietType){
    console.log("Load stage for..." + dietType);
    this.dietType = dietType;

  }
  preload(){

    this.dayMeals = JSON.parse(this.game.cache.getText(this.dietType));
    this.sceneries = JSON.parse(this.game.cache.getText("scenes"));
    this.confData = JSON.parse(this.game.cache.getText("conf"));
  }

  create() {
    
    //Setup data
    //this.confData = JSON.parse(this.game.cache.getText("conf"));
    this.ITEM_WIDTH = this.confData.items.width;
    this.locale = "en";
    this.currentMeal = this.dayMeals.mealNames.shift();
    this.currentMealGoals = this.dayMeals.mealGoals.shift();
    this.mealFoodWarnings = this.dayMeals.foodWarnings;
    this.upperLimit = this.dayMeals.gameoverLimits.shift();
    this.sessionWarningsGood = [], this.sessionWarningsBad = [];

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
        height: this.game.world.bounds.height - this.game.world.bounds.height / 4,
      };

      //Reduce world y axis boundaries
      this.game.world.setBounds( 0, 0, this.newWorldBoundaries.width, this.newWorldBoundaries.height);
    }

    //Background
    this.background = this.game.add.sprite(0, 0, "");
    this.background.inputEnabled = true;

    //Panel Image
    this.panelTimeImage = this.game.add.sprite(0, 0, "panelTime");

    //Time counter
    this.timeCounter = this.game.add.text(265, 32, "0", {font: "12px Arial", fill: "#ffffff",align: "center",});
    this.timeCounter.anchor.setTo(0.5, 0.5);
    this.timeCounter.count = this.dayMeals.nextMealTime.shift();


    //Time highscore
    var highscoreData = getLocalItem("highscore");
    if (!highscoreData) {
      highscoreData = 0;
      saveLocalItem("highscore", 0);
    }
    // this.highscore = this.game.add.text(85, 32, "0", { font: "12px Arial", fill: "#ffffff", align: "center", });
    // this.highscore.anchor.setTo(0.5, 0.5);
    // this.highscore.setText(highscoreData);
    this.time2go = this.game.add.text(85, 32, "Time till next meal", { font: "15px Consolas", fill: "#ffda66", align: "center", });
    this.time2go.anchor.setTo(0.5, 0.5);

    //Sounds
    this.sounds = {
      kidLevelMusic: this.game.add.audio("kidLevelMusic"),
      winner: this.game.add.audio("aura"),
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
    this.buttons = [];
    
    //Item pool
    this.itemsGroup = this.add.group();
    this.itemsGroup.enableBody = true;
    this.game.itemsGroup = this.itemsGroup;

    // UI-elements group so we can get them "in-front" with a single call
    this.uiButtons = this.game.add.group();
    this.createNavigationButtons();
    this.createActionButtons();

    //Create UI
    this.createUi(this.currentMeal);

    // load scenery background and items and play initial dialog
    this.loadScenery("bedroom")

    this.momInfoButton = this.game.add.sprite( this.game.width-50, this.game.height/4, "momInfo");
    this.momInfoButton.anchor.setTo(0.5);
    this.momInfoButton.scale.setTo(0.75);
    this.momInfoButton.alpha = 0.75;

    this.tooltipsDialog( this.momInfoButton, this.dayMeals.momIntro, "left");

    //Init music
    //this.sounds.kidLevelMusic.play("", 0, 0.2, true);

    //Decrease the stats every n seconds
    this.statsDecreaser = this.game.time.create(false);
    this.statsDecreaser.loop( 10*Phaser.Timer.SECOND, this.reduceProperties, this);
    this.statsDecreaser.start();

    this.timerTimeUpdate = this.game.time.create(false);
    this.timerTimeUpdate.loop( Phaser.Timer.SECOND, this.updateTimeCounter, this);
    this.timerTimeUpdate.start();

    //Throw Rocks Timer
    this.rockIntervalTime = Phaser.Timer.SECOND * this.confData.timers.rockInterval;
    this.timerThrowPill = this.game.time.events.loop( this.rockIntervalTime, this.throwPill, this );
    this.timerThrowPill.timer.start();

    //Load cloth changing events
    this.clothChangeTimeArray = this.confData.timers.clothChangeArray;
    this.costumeAvailableArray = this.confData.costumes.availabilityArray;
    this.totalHeadCostumes = this.confData.costumes.headAmount;
    this.totalBodyCostumes = this.confData.costumes.bodyAmount;
    //this.costumeAvailableArray = shuffle(this.costumeAvailableArray);
    this.costumeAvailableArray = [];

    //Create last stage events
    this.timerTimeUpdate.add(
      Phaser.Timer.SECOND * this.clothChangeTimeArray[this.clothChangeTimeArray.length - 1],
      function () {
        var self = this,
          callback = function (e) {
            self.character.updateClothing(e.part, e.id);
          };
        this.character.showAura(callback, { part: "body", id: this.totalBodyCostumes, });
        this.character.showAura(callback, { part: "head", id: this.totalHeadCostumes, });
      },
      this
    );
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
              //Update stats and kill the item
              if (item.key != "items-pill-texture") {
                //Regular item
                this.showStatsUpdateInfo({x:item.x, y:item.y}, '100 gr', true);
                item.kill();
                this.character.head.animations.play("eat");
                this.clearSelection();
                this.uiBlocked = false;
              } else {
                //Rock item
                item.kill(true);
                this.character.head.animations.play("annoyed");
              }
              this.refreshStats(item.customParams);
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
      this.currentMealGoals = this.dayMeals.mealGoals.shift();
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
   */
  tooltipsDialog(targetSprite, dialogContent, pos){
    console.log(dialogContent);
    var msgDelay = 3000;
    var _this = this;

    dialogContent.forEach(function(dialog, index){
      _this.game.time.events.add(msgDelay * (index+1), function(){
          console.log(dialog);
          _this.toolTipEvent(targetSprite, dialog, pos);
        }, _this);    
    })
  }

  /**
   * Throw item from the top
   * @param {number} spriteType
   * @param {object} currentProperties
   * @param {object} spritesheet
   */
  throwItem(name, spriteType, currentProperties, spritesheet) {
    var item = this.itemsGroup.getFirstExists(false),
      positionY = -this.ITEM_WIDTH,
      randomXposition = getRandomInt( this.ITEM_WIDTH, this.game.world.width - this.ITEM_WIDTH );

    var properties = {
        gravity: this.confData.items.gravity,
        maxSpeed: this.confData.items.maxVelocity,
        statsImpact: currentProperties,
        spriteType: spriteType,
        spritesheet: spritesheet,
        name: name
      };
    
    console.log(name,properties);
    //console.log(name);
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

  /**
   * Throw dangerous item
   */
   throwPill() {
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
    var storeButton = new Storage(this.game, {x: -2, y: this.game.height/2-100}, this.confData);
    storeButton.createModals();
    this.uiButtons.add(storeButton);
  }

  createNavigationButtons(){
    this.kitchenButton = this.game.add.sprite( this.game.width-15, 3*this.game.height/4 + 10, "kitchenButton");
    this.kitchenButton.anchor.setTo(0.5);
    this.kitchenButton.scale.setTo(0.35);
    this.kitchenButton.alpha = 0.5;
    new Phasetips(this.game, {
      targetObject: this.kitchenButton,
      context: "to kitchen",
      fontSize: 13, fontFill: "blue",
      backgroundColor: 0x59d66b, roundedCornersRadius: 10,
      strokeColor: 0xfec72c, position: "left", animationDelay: 100, 
      animation: "grow", animationSpeedShow:200, animationSpeedHide:100
    });
    this.roomButton = this.game.add.sprite( this.game.width-15, 3*this.game.height/4 + 35, "roomButton");
    this.roomButton.anchor.setTo(0.5);
    this.roomButton.scale.setTo(0.3);
    this.roomButton.alpha = 0.5;
    new Phasetips(this.game, {
      targetObject: this.roomButton,
      context: "to bedroom",
      fontSize: 13, fontFill: "blue",
      backgroundColor: 0x59d66b, roundedCornersRadius: 10,
      strokeColor: 0xfec72c, position: "left", animationDelay: 100, 
      animation: "grow", animationSpeedShow:200, animationSpeedHide:100
    });
    this.picnicButton = this.game.add.sprite( this.game.width-15, 3*this.game.height/4 + 60, "picnicButton");
    this.picnicButton.anchor.setTo(0.5);
    this.picnicButton.scale.setTo(0.3);
    this.picnicButton.alpha = 0.5;
    new Phasetips(this.game, {
      targetObject: this.picnicButton,
      context: "go picnic",
      fontSize: 13, fontFill: "blue",
      backgroundColor: 0x59d66b, roundedCornersRadius: 10,
      strokeColor: 0xfec72c, position: "left", animationDelay: 100, 
      animation: "grow", animationSpeedShow:200, animationSpeedHide:100
    });

    this.uiButtons.add(this.kitchenButton);
    this.uiButtons.add(this.roomButton);
    this.uiButtons.add(this.picnicButton);
  }

  /**
   * Create UI
   */
  createUi(meal_id) {
    var buttonsData = this.confData.buttons,
      screenButtonSize = this.game.width / buttonsData.sizeDivisor,
      //buttonsCollection = buttonsData.info.collection,
      buttonsCollection = this.confData.dayMeals[meal_id].badMealOptions,
      mealParts = this.confData.dayMeals[meal_id].mealParts,
      buttonArrayInfo = [],
      currentButton,
      currentXpos;

    // Setup buttons
    for (var i = 0; i < buttonsCollection.length; i++) {
      //Main properties
      currentButton = {
        name: buttonsCollection[i].name,
        spritesheet: buttonsCollection[i].spritesheet,
        y: this.game.height + buttonsCollection[i].offsetY,
        frame: buttonsCollection[i].frame,
        type: buttonsCollection[i].type,
        customParams: buttonsCollection[i].customParams,
      };

      // Calculate Button X-position
      if (buttonsCollection[i].order === 1) {
        currentButton["x"] = screenButtonSize / 2;
      } else if (buttonsCollection[i].order === buttonsCollection[i].length) {
        currentButton["x"] = this.game.width - screenButtonSize / 2;
      } else {
        currentButton["x"] =
          screenButtonSize * buttonsCollection[i].order - screenButtonSize / 2;
      }
      buttonArrayInfo.push(currentButton);
    }

    // reset buttons
    for (var i=0; i<this.buttons.length; i++)
      this.buttons[i].destroy();

    for (var i = 0; i < buttonArrayInfo.length; i++) {
      var currentItem = buttonArrayInfo[i];

      this[currentItem.name] = this.game.add.sprite( currentItem.x, currentItem.y, currentItem.spritesheet );
      this[currentItem.name].name = currentItem.name;
      this[currentItem.name].frame = currentItem.frame;
      this[currentItem.name].type = currentItem.type;
      this[currentItem.name].spritesheet = currentItem.spritesheet 
      this[currentItem.name].anchor.setTo(0.5);
      this[currentItem.name].inputEnabled = true;
      this[currentItem.name].customParams = currentItem.customParams;
      this[currentItem.name].events.onInputDown.add(this.selectOption, this);
      this.buttons.push(this[currentItem.name]);

      if (i==0){
        this.discardButton = this.game.add.sprite( currentItem.x-40, currentItem.y-60, this.confData.discardButton );
        this.discardButton.events.onInputDown.add(this.discardOptions, this);
        this.discardButton.scale.setTo(0.6);
        this.discardButton.inputEnabled = true;
      }
    }

    // Nothing is selected
    this.selectedItem = null;

    //Stat fields
    var labelCount = 3;
    var labelPortion = this.world.width / (labelCount*2);
    var position1 = 0 + labelPortion / 2;
    var position2 = labelPortion + labelPortion / 2;
    var position3 = labelPortion * 2 + labelPortion / 2;

    //Labels of property counters - [PROTEIN - CARBS - FAT]
    this.healthLabel = this.game.add.bitmapText( position1, 50, "minecraftia", this.confData.text[this.locale].protein, 13 );
    this.healthLabel.position.x = this.healthLabel.position.x - this.healthLabel.textWidth / 2;

    this.funLabel = this.game.add.bitmapText( position1, 80, "minecraftia", this.confData.text[this.locale].carbs, 13 );
    this.funLabel.position.x = this.funLabel.position.x - this.funLabel.textWidth / 2;

    this.nutritionLabel = this.game.add.bitmapText( position1, 110, "minecraftia", this.confData.text[this.locale].fat, 13 );
    this.nutritionLabel.position.x = this.nutritionLabel.position.x - this.nutritionLabel.textWidth / 2;

    //Character property counters - [PROTEIN - CARBS - FAT]
    if (typeof this.proteinCounter !== 'undefined') this.proteinCounter.destroy()
    this.proteinCounter = this.game.add.bitmapText( position2, 50, "minecraftia", "00", 18);
    this.proteinCounter.position.x = this.proteinCounter.position.x - this.proteinCounter.textWidth / 2;

    if (typeof this.carbsCounter !== 'undefined') this.carbsCounter.destroy();
    this.carbsCounter = this.game.add.bitmapText( position2, 80, "minecraftia", "00", 18 );
    this.carbsCounter.position.x = this.carbsCounter.position.x - this.carbsCounter.textWidth / 2;

    if (typeof this.fatCounter !== 'undefined') this.fatCounter.destroy();
    this.fatCounter = this.game.add.bitmapText( position2, 110, "minecraftia", "00", 18);
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
          this.throwItem(sprite.name, sprite.type, this.selectedItem.customParams, sprite.key);
          break;
          // this.character.animations.play("jump");
          // this.character.body.velocity.y = this.confData.physics.jump.velocity.y;
          // this.jumping = true;
          // this.refreshStats(this.selectedItem.customParams);
          // break;
      }
    }
  }

  discardOptions(){
    var _buttons = this.buttons;
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
    if (noItem){  // move to the next room
      this.kitchenButton.alpha = 1.0;
      if(this.kitchenButton.colorTween != true){
        tweenTint(this.game, this.kitchenButton, 0xfffff,  0xdd0000, 700);
        this.kitchenButton.inputEnabled = true;
        this.kitchenButton.scale.setTo(0.65);
        this.kitchenButton.events.onInputDown.add(this.goToKitchen, this);
      }
    }
  }

  /**
   * Sammy changes scene
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
        this.tooltipsDialog(this.momInfoButton, [foodWrn.text], "left");
      else if(foodWrn.positive)
        this.sessionWarningsGood.push(foodWrn.text);
      else
        this.sessionWarningsBad.push(foodWrn.text);
      console.log(foodWrn.text);
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

    this.background.loadTexture(this.sceneries[sceneName].background);
    for (var i=0; i<this.sceneItems.length; i++)
      this.sceneItems[i].destroy();

    this.sceneItems = [];

    var newSceneItems = this.sceneries[sceneName].items;
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

    // just an intro dialog of Mommy with Sammy (can be funny, irrelevant)
    if(this.sceneries[sceneName].mommyWarns.length>0){
      this.mommyDialogs = this.sceneries[sceneName].mommyWarns;
      this.game.time.events.add(Phaser.Timer.SECOND * 12, this.mommyWarns, this);
    }

    if(this.buttons.length==0)
      this.enableNextItem();

    this.game.world.bringToTop(this.characters);
  }
  
  loadOptions(){
    this.itemSprite.inputEnabled = false;
    //console.log(this.itemSprite);
    this.itemSprite.colorTweening.pause();
    this.itemSprite.tint = 0xffffff;

    console.log("Loading items from... ", this.item.key);
    var meal_id = this.context.currentMeal;
    var buttonsData = this.context.confData.buttons;
    var screenButtonSize = this.game.width / buttonsData.sizeDivisor;
    var buttonsCollection = this.context.confData.dayMeals[meal_id][this.item.contains];

    if (typeof this.item.mommyWarns !== 'undefined'){
      this.context.mommyDialogsIfo = this.item.mommyWarns;
      this.game.time.events.add(Phaser.Timer.SECOND * 1, this.context.mommyInforms, this.context);
    }

    var buttonArrayInfo = [];
    var currentButton;

    // Setup buttons
    for (var i = 0; i < buttonsCollection.length; i++) {
      //Main properties
      currentButton = {
        name: buttonsCollection[i].name,
        spritesheet: buttonsCollection[i].spritesheet,
        y: this.game.height + buttonsCollection[i].offsetY,
        frame: buttonsCollection[i].frame,
        type: buttonsCollection[i].type,
        customParams: buttonsCollection[i].customParams,
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

    // reset existing (if any) buttons
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
      this[currentItem.name].customParams = currentItem.customParams;
      this[currentItem.name].events.onInputDown.add(this.context.selectOption, this.context);
      var itemMov = this.game.add.tween(this[currentItem.name]);
      itemMov.to({ x: currentItem.x, y:currentItem.y}, 300).delay(i*100).start()
      var itemScale = this.game.add.tween(this[currentItem.name].scale);
      itemScale.to({ x: 1, y: 1}, 300).delay(i*100).start()

      this.context.buttons.push(this[currentItem.name]);
    }

  }
  

  mommyWarns(){
    this.momInfoButton.loadTexture("momInfoWarn");
    var warnTip = new Phasetips(this.game, {
      targetObject: this.momInfoButton,
      context: this.mommyDialogs[0],
      fontSize: 14, fontFill: "red",
      backgroundColor: 0xff9d5c, roundedCornersRadius: 10,
      strokeColor: 0xfec72c, position: "left", animationDelay: 100, 
      animation: "grow", animationSpeedShow:200, animationSpeedHide:100
    });
    warnTip.showTooltip();
    var momInfoButton = this.momInfoButton;
    this.game.time.events.add(Phaser.Timer.SECOND * 3.5, function(){
        warnTip.destroy(); 
        momInfoButton.loadTexture("momInfo");
      }, this);
  }


  mommyInforms(){
    this.momInfoButton.loadTexture("momInfoWarn");
    var warnTip = new Phasetips(this.game, {
      targetObject: this.momInfoButton,
      context: this.mommyDialogsIfo[0],
      fontSize: 14, fontFill: "red",
      backgroundColor: 0xff9d5c, roundedCornersRadius: 10,
      strokeColor: 0xfec72c, position: "left", animationDelay: 100, 
      animation: "grow", animationSpeedShow:200, animationSpeedHide:100
    });
    warnTip.showTooltip();
    var momInfoButton = this.momInfoButton;
    this.game.time.events.add(Phaser.Timer.SECOND * 3.5, function(){
        warnTip.destroy(); 
        momInfoButton.loadTexture("momInfo");
      }, this);
  }


  /**
   * Reduce stats by fixed value
   */
  reduceProperties() {
    this.character.customParams.protein -= this.decreaseStatAmount;
    this.character.customParams.carbs -= this.decreaseStatAmount;
    this.character.customParams.fat -= this.decreaseStatAmount;
    this.refreshStats();
  }
  /**
   * Release the button touched
   */
  clearSelection() {
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
  refreshStats(properties) {
    if (!!properties) {
      var characterProperty;

      //Update character properties
      for (characterProperty in properties) {
        if (properties.hasOwnProperty(characterProperty)) {
          var x = 0, y = 20;
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
            properties[characterProperty],
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

      //this.game.state.start('mainMenu', true, false, messages);
      this.gameOver(messages, false);
    } 
    // this.currentMealGoals.protein
    else if ( this.character.customParams.protein <= this.currentMealGoals.protein+5 &&  this.character.customParams.protein > this.currentMealGoals.protein-5 &&
      this.character.customParams.carbs <= this.currentMealGoals.carbs+5 && this.character.customParams.carbs >  this.currentMealGoals.carbs-5 &&
      this.character.customParams.fat <= this.currentMealGoals.fat+5  && this.character.customParams.fat > this.currentMealGoals.fat-5 )
    {
       // --- MEAL IS READY ---
      messages.tryAgain = this.confData.text[ this.locale ].tryAgain.toUpperCase();
      messages.reason = this.confData.text[this.locale].mealReady.toUpperCase();
      this.gameOver(messages, true);
    }
    else {
      //Set counter boundaries
      for (var currentPropertyReset in this.character.customParams) {
        if (this.character.customParams[currentPropertyReset] > 100) {
          this.character.customParams[currentPropertyReset] = 100;
        }
      }

      //Alerts
      for (var currentProperty in this.character.customParams) {
        if (this.character.customParams.hasOwnProperty(currentProperty)) {
          var tintColor = 0xffffff;
          if ( this.character.customParams[currentProperty] < this.confData.redAlertLimit ) {
            tintColor = 0xff0000;
          }
          else if ( this.character.customParams[currentProperty] <= this.currentMealGoals[currentProperty]+5 &&
              this.character.customParams[currentProperty] > this.currentMealGoals[currentProperty]-5) 
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
    this.proteinCounter.setText(this.character.customParams.protein.toFixed(1).toString() + "/" + this.currentMealGoals.protein+"g") ;
    this.carbsCounter.setText(this.character.customParams.carbs.toFixed(1).toString() + "/" + this.currentMealGoals.carbs+"g") ;
    this.fatCounter.setText( this.character.customParams.fat.toFixed(1).toString() + "/" + this.currentMealGoals.fat+"g") ;
  }


  /**
   * The game ends and show game over screen
   * @param {object} messages
   */
  gameOver(messages, winner) {
    if (!this.gameOverFlag) {
      var gameOverPanelTween;

      //Resets
      this.gameOverFlag = true;
      this.statsDecreaser.stop();
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
          highscore = !!highscoreData ? highscoreData : "0",
          halfWidth = this.game.width / 2,
          halfHeight = this.game.height / 2,
          gameOverText,
          reasonText,
          creditsText,
          retryButton,
          notifyButton,
          gameOverGroup = this.game.add.group(),
          characterInfo = this.character.shareCharacterInfo(),
          sharedHeadSprite,
          sharedBodySprite;

        //Kill character
        this.character.kill();
        //Draw shared type character body
        sharedBodySprite = this.game.add.sprite( halfWidth / 2, 280+40, characterInfo.body.spriteName );
        sharedBodySprite.anchor.setTo(0.5);
        sharedBodySprite.frame = characterInfo.body.spriteFrame;

        if(winner)
          characterInfo.head.spriteName = 2;
        //Draw shared type character head
        sharedHeadSprite = this.game.add.sprite( 0, -75, characterInfo.head.spriteName );
        sharedHeadSprite.anchor.setTo(0.5);
        sharedHeadSprite.frame = characterInfo.head.spriteFrame;

        sharedBodySprite.addChild(sharedHeadSprite);

        function getNextMealNotification(){
          // ---- inform server about finishing this meal ----
          checkNextMeal(this.dayMeals.mealNames[0]);
          //notifyButton.visible = false;
          //gameOverText.visible = false;
          this.game.add.tween(notifyButton).to({ x: notifyButton.x+300, y:notifyButton.y}, 300).start()
          this.game.add.tween(gameOverText).to({ x: gameOverText.x+300, y:gameOverText.y}, 300).start()
        }

        //Result texts
        notifyButton = this.game.add.button( halfWidth, 50, "button-notify", getNextMealNotification, this);
        notifyButton.anchor.setTo(0.5);
        gameOverGroup.y = this.game.height;
        gameOverText = this.add.bitmapText( halfWidth, 50, "minecraftia", this.confData.text[this.locale].gameOver.toUpperCase()+"! ("+this.dayMeals.mealNames[0].toUpperCase()+")", 18);
        gameOverText.anchor.setTo(0.5);
        gameOverText.maxWidth = 250;

        reasonText = this.add.bitmapText( halfWidth, 120, "minecraftia", messages.reason, 30 );
        reasonText.anchor.setTo(0.5);
        reasonText.maxWidth = 290;

        var startingWarnings = 220;
        var _game = this.game;
        this.sessionWarningsGood.forEach( function(warnText, index){
          console.log(warnText, index);
          var warnBitText = _game.add.bitmapText( halfWidth-40 , startingWarnings+index*60, "minecraftia", (index+1)+". "+warnText.toUpperCase(), 12);
          warnBitText.tint = 0x000cc00;
          warnBitText.maxWidth = 220;
          gameOverGroup.add(warnBitText);
        });
        var offset = this.sessionWarningsGood.length*60;
        this.sessionWarningsBad.forEach( function(warnText, index){
          console.log(warnText, index);
          var warnBitText = _game.add.bitmapText( halfWidth-40 , startingWarnings+offset+index*60, "minecraftia", (index+1)+". "+warnText.toUpperCase(), 12);
          warnBitText.tint = 0xcc0000;
          warnBitText.maxWidth = 220;
          gameOverGroup.add(warnBitText);
        });

        this.game.world.bringToTop(this.momInfoButton);

        //clothCombinationLabel = this.add.bitmapText( halfWidth, 355+30, "minecraftia", this.confData.text[this.locale].youHaveGot, 15 );
        //clothCombinationLabel.anchor.setTo(0.5);

        //clothCombinationText = this.add.bitmapText( halfWidth, 385+30, "minecraftia", combinationName, 20 );
        //clothCombinationText.anchor.setTo(0.5);
        //clothCombinationText.tint = 0x6785bc;

        retryButton = this.game.add.button( halfWidth, 470+30, "button-retry", this.restart, this, 0, 0, 1, 0 );
        retryButton.anchor.setTo(0.5);

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
        // gameOverGroup.add(scoreLabel);
        // gameOverGroup.add(scoreCounter);
        // gameOverGroup.add(topLabel);
        // gameOverGroup.add(topCounter);
        gameOverGroup.add(this.momInfoButton);
        // gameOverGroup.add(clothCombinationLabel);
        // gameOverGroup.add(clothCombinationText);
        gameOverGroup.add(retryButton);
        gameOverGroup.add(sharedBodySprite);
        gameOverGroup.add(creditsText);
        this.momInfoButton.loadTexture("momInfo");

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
    //Reset and restart the game
    this.timerTimeUpdate.stop();
    this.uiBlocked = false;
    this.clearSelection();

    this.game.state.start("MainMenu");
  }

  render() {
    //Render FPS for debugging
    //this.game.debug.text(this.game.time.fps || '--', 5, 20, "#00ff00");
  }
}
