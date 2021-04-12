/**
 * @author       @jvalen <javiervalenciaromero@gmail.com>
 * @copyright    2015 Javier Valencia Romero
 */

import Phaser from "phaser";

export default class extends Phaser.State {
  init() {
    this.asset = null;
    this.ready = false;
  }

  preload() {
    var stamp = "?" + new Date().getTime();

    this.asset = this.add.sprite( this.game.world.bounds.width / 2, this.game.world.bounds.height / 2, "preloader");
    this.asset.anchor.setTo(0.5, 0.5);
    this.asset.scale.setTo(1.5);

    this.load.onLoadComplete.addOnce(this.onLoadComplete, this);
    this.load.setPreloadSprite(this.asset);

    this.load.image("introFar", "./assets/images/intro_far.png");
    this.load.image("introMid", "./assets/images/intro_mid_3.png");
    this.load.image("introClose", "./assets/images/intro_close.png");
    this.load.image("introJFace", "./assets/images/intro_jFace.png");

    this.load.image("auraParticle", "./assets/images/aura-particle.png");

    this.load.image("introType1", "./assets/sprites/type/cardio.png");
    this.load.image("introType2", "./assets/sprites/type/weight-lifter.png");
    this.load.image("introType3", "./assets/sprites/type/office-day.png");

    this.load.spritesheet("headHero", "./assets/sprites/head-sprite-v2.png", 80, 80 );
    this.load.spritesheet("bodyHero", "./assets/sprites/body-sprite.png", 80,80 );
    this.load.spritesheet("items-breakfast-bad", "./assets/sprites/items/items-breakfast.png", 50, 50);
    this.load.spritesheet("items-breakfast", "./assets/sprites/items/items-breakfast.png", 50, 50);
    this.load.spritesheet("items-breakfast-bag", "./assets/sprites/items/items-breakfast-bag.png", 50, 50);
    this.load.spritesheet("items-breakfast-desk", "./assets/sprites/items/items-breakfast-desk.png", 50, 50);
    this.load.spritesheet("items-kitchen-cabinet", "./assets/sprites/items/items-kitchen-cabinet.png", 50, 50);
    this.load.spritesheet("items-kitchen-fridge", "./assets/sprites/items/items-kitchen-fridge.png", 50, 50);
    this.load.spritesheet("items-muesli-yogurt", "./assets/sprites/items/items-muesli-yogur-peach.png", 90, 90);
    this.load.spritesheet("items-salad-lunch", "./assets/sprites/items/items-salad-lunch.png", 90, 90);
    this.load.spritesheet("items-main-lunch", "./assets/sprites/items/items-main-lunch.png", 90, 90);
    this.load.spritesheet("items-dinner-veggies", "./assets/sprites/items/items-dinner-veggies.png", 90, 90);
    this.load.spritesheet("items-breakfast-carbs", "./assets/sprites/items/items-breakfast-carbs.png", 90, 90);
    
    this.load.spritesheet("items-pill-texture", "./assets/sprites/pill-texture.png", 50, 50);

    this.load.spritesheet("buttons", "./assets/sprites/buttons-alt.png", 70, 70);
    this.load.spritesheet("breakfast", "./assets/sprites/meal-breakfast-start.png", 70, 70);
    this.load.spritesheet("breakfast-bad", "./assets/sprites/meal-breakfast-start.png", 70, 70);
    this.load.spritesheet("breakfast-desk", "./assets/sprites/breakfast-desk.png", 70, 70);
    this.load.spritesheet("breakfast-bag", "./assets/sprites/breakfast-bag.png", 70, 70);
    this.load.spritesheet("kitchen-fridge", "./assets/sprites/kitchen-fridge.png", 70, 70);
    this.load.spritesheet("kitchen-cabinet", "./assets/sprites/kitchen-cabinet.png", 70, 70);

    this.load.spritesheet("breakfast-carbs", "./assets/sprites/experts/breakfast-carbs.png", 70, 70);
    this.load.spritesheet("dinner-veggies", "./assets/sprites/experts/dinner_vegs.png", 70, 70);
    this.load.spritesheet("muesli-yogurt", "./assets/sprites/experts/yogurt_muesli.png", 70, 70);
    this.load.spritesheet("salad-lunch", "./assets/sprites/experts/lunch-salad.png", 70, 70);
    this.load.spritesheet("main-lunch", "./assets/sprites/experts/lunch-main.png", 70, 70);

    this.load.spritesheet("button-retry", "./assets/sprites/button-retry.png", 225, 112);
    this.load.spritesheet("button-next", "./assets/sprites/button-next.png", 225, 112);
    this.load.image("instructions", "./assets/images/roll-icon.png");
    this.load.image("notifyButton", "./assets/sprites/button-notify.png");
    this.load.image("discardButton", "./assets/sprites/discardButton.png")
    this.load.image("plusButton", "./assets/sprites/plusButton.png")
    this.load.image("minusButton", "./assets/sprites/minusButton.png")
    this.load.image("plusMinusInfo", "./assets/sprites/plusMinusInfo.png")
    
    
    this.load.image("momInfo", "./assets/sprites/mom-button-calm.gif");
    this.load.image("momInfoWarn", "./assets/sprites/mom-button-warn.gif");

    this.load.image("roomKid", "./assets/images/rooms/simplyRoom-pix.png");
    this.load.image("roomKitchen", "./assets/images/rooms/kitchen-pix.png");
    this.load.image("roomKitchenOpen", "./assets/images/rooms/kitchen-open-pix.png");
    this.load.image("picnic", "./assets/images/rooms/picnic-pix.png");
    this.load.image("nutriInfo", "./assets/images/nutInfoPix.gif");

    this.load.image("panelTime", "./assets/images/panel-right.png");
    this.load.image("mealCalendar", "./assets/images/meal-calendar.png");
    this.load.image("kitchenButton", "./assets/images/kichenButton.png");
    this.load.image("picnicButton", "./assets/images/picnicButton.png");
    this.load.image("roomButton", "./assets/images/roomButton.png");
    this.load.image("store-button", "./assets/images/store-button.png");
    this.load.image("unstore-button", "./assets/images/unstore-button.png");
    this.load.image("jumpRope", "./assets/images/jumpRope.png");

    
    this.load.image("roomCabinet", "./assets/images/room-items/roomCabinet.png");
    this.load.image("roomDesk", "./assets/images/room-items/desk.png");
    this.load.image("schoolbag", "./assets/images/room-items/schoolbag.png");
    this.load.image("kitchenFridge", "./assets/images/room-items/kitchenFridge.png");
    this.load.image("kitchenCabinet",  "./assets/images/room-items/bread-items.png");
    this.load.image("picnicBag", "./assets/images/room-items/picnicBagPix.png");
    this.load.image("picnicTable", "./assets/images/room-items/picnictable-pixel.png");

    // Phaser-Modal demo assets...
    //this.load.image("twitter","https://s3-us-west-2.amazonaws.com/s.cdpn.io/1581715/twitter_zpsyadnfz48.png");
    //this.load.image("facebook","https://s3-us-west-2.amazonaws.com/s.cdpn.io/1581715/facebook_zpsxiqll8e0.png");
    this.game.load.audio('incorrect', ['./assets/sounds/incorrect-sound.mp3']);
    this.game.load.audio('pick-up', ['./assets/sounds/pick-up-sound.mp3']);


    this.game.load.audio("kidLevelMusic", [
      "./assets/sounds/kidLevel.ogg",
      "./assets/sounds/kidLevel.mp3",
    ]);
    this.game.load.audio("mainMenuMusic", [
      "./assets/sounds/kidLevel.ogg",
      "./assets/sounds/kidLevel.mp3",
    ]);
    this.game.load.audio("aura", [
      "./assets/sounds/aura.ogg",
      "./assets/sounds/aura.mp3",
    ]);
    this.game.load.audio("gameover", [
      "./assets/sounds/gameover.ogg",
      "./assets/sounds/gameover.mp3",
    ]);
    this.game.load.audio("explosion", [
      "./assets/sounds/explosion.ogg",
      "./assets/sounds/explosion.mp3",
    ]);
    this.game.load.audio("hit", [
      "./assets/sounds/hit.ogg",
      "./assets/sounds/hit.mp3",
    ]);

    // //load level data
    this.load.text("conf", "./assets/data/conf.json" );
    this.load.text("cardio", "./assets/data/cardio.json" );
    this.load.text("weightLift", "./assets/data/weightlift.json" );
    this.load.text("officeWork", "./assets/data/office.json" );
    this.load.text("scenes", "./assets/data/scenery.json" );
    this.load.text("expert_meals", "./assets/data/meals.json" );
    this.load.text("modals_content", "./assets/data/modals.json" );

    //Load font
    this.load.bitmapFont( "minecraftia", "./assets/fonts/lucky_0.png", "./assets/fonts/lucky_0.xml" );
    this.load.bitmapFont( "LuckiestGuy",  "./assets/fonts/lucky_0.png", "./assets/fonts/lucky_0.xml" );
  }

  create() {
    this.asset.cropEnabled = false;
  }

  update() {
    if (
      !!this.ready &&
      this.cache.isSoundDecoded("kidLevelMusic") &&
      this.cache.isSoundDecoded("mainMenuMusic") &&
      this.cache.isSoundDecoded("aura") &&
      this.cache.isSoundDecoded("gameover") &&
      this.cache.isSoundDecoded("hit") &&
      this.cache.isSoundDecoded("explosion")
    ) {
      //We need to be sure that all the audio is decoded before go farther
      this.game.state.start("MainMenu");
    }
  }

  onLoadComplete() {
    this.ready = true;
  }
}
