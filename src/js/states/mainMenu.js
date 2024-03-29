/**
 * @author       @jvalen <javiervalenciaromero@gmail.com>
 * @copyright    2015 Javier Valencia Romero
 */

import Phaser from "phaser";

export default class extends Phaser.State {
  init() {
    this.titleTxt = null;
    this.startTxt = null;
    this.reasonTxt = null;
  }

  preload() {
    //Get config data
    this.confData = JSON.parse(this.game.cache.getText("conf"));
    this.locale = "en";

    //Turn on music
    this.mainMenuMusic = this.game.add.audio("mainMenuMusic");
    this.mainMenuMusic.play("", 0, 1, true);
    this.mainMenuMusic.volume -= 0.1;
    this.mainMenuMusic.volume -= 0.1;

  }
  init(messages) {
    this.messages = messages;
  }
  create() {
    var x = this.game.width / 2,
      y = this.game.height / 2;

    this.game.stage.backgroundColor = "#94cb24";

    //Title screen text
    this.titleTxt = this.add.bitmapText( x, 60, "minecraftia", this.confData.mainMenu.title, 36 );
    this.titleTxt.align = "center";
    this.titleTxt.x = this.game.width / 2 - this.titleTxt.textWidth / 2;

    y = this.titleTxt.y + this.titleTxt.height + 50;

    //Help me message text
    this.helpmeMessage = this.add.bitmapText( this.game.width, this.game.height/2, "minecraftia", this.confData.text[this.locale].helpMessage, 20 );
    this.helpmeMessage.align = "left";
    this.helpmeMessage.tint = 0xee649c;
    var helpmeMessageTween = this.game.add.tween(this.helpmeMessage);
    helpmeMessageTween.to( { x: -this.helpmeMessage.width }, this.confData.mainMenu.helpmeSpeed );

    //Parallax and intro setup
    this.levelFarSpeed = this.confData.mainMenu.levelFarSpeed;
    this.introFar = this.add.tileSprite( 0, this.game.height - 250, this.game.world.width, 256, "introFar" );
    this.introFar.autoScroll(-this.levelFarSpeed, 0);

    this.levelMidSpeed = this.confData.mainMenu.levelMidSpeed;
    this.introMid = this.add.tileSprite( 0,  this.game.height - 256, this.game.world.width, 256, "introMid" );
    this.introMid.autoScroll(-this.levelMidSpeed, 0);

    this.levelCloseSpeed = this.confData.mainMenu.levelCloseSpeed;
    this.introClose = this.game.add.sprite( 0, this.game.height - 256, "introClose");

    var groundIntroTween = this.game.add.tween(this.introClose);
    groundIntroTween.to({ x: -100 }, this.levelCloseSpeed);
    groundIntroTween.start();

    //Credits
    this.creditsTxt = this.add.bitmapText(x, 5,"minecraftia", "By @protein.eu", 10 );
    this.creditsTxt.align = "left";
    this.creditsTxt.tint = 0x0077ff;
    this.creditsTxt.x = this.game.width - this.creditsTxt.textWidth - 10;
    this.creditsTxt.inputEnabled = true;
    var credUrl = "https://protein-h2020.eu/";
    this.creditsTxt.events.onInputDown.add(function () { window.open(credUrl, "_blank"); }, this);

    // Sammy's options for nutrition-activity type
    this.type1 = this.game.add.sprite( this.game.width/2-70, this.game.height/2-70, "introType1");
    this.type1.anchor.setTo(0.5);
    this.type1.scale.setTo(0.35);
    this.type1.inputEnabled = true;
    this.type2 = this.game.add.sprite( this.game.width/2+70, this.game.height/2-70, "introType2");
    this.type2.anchor.setTo(0.5);
    this.type2.scale.setTo(0.4);
    this.type2.inputEnabled = true;

    groundIntroTween.onComplete.add(function () {
      //Stop animation and set stopped frame
      helpmeMessageTween.start();
      this.startTxt = this.add.bitmapText(x, y-25, "minecraftia", "| " + this.confData.text[this.locale].touchScreen.toUpperCase() + " |", 14 );
      this.startTxt.align = "center";
      this.startTxt.tint = 0x007eff;
      this.startTxt.x = this.game.width / 2 - this.startTxt.textWidth / 2;

      this.timerBlickTitle = this.game.time.create(false);
      this.timerBlickTitle.loop(500, this.updateBlinkTitleCounter, this);
      this.timerBlickTitle.start();

      //this.input.onDown.add(this.onDown, this);
      this.type1.events.onInputDown.add( this.onDown, {game:this.game, mainMenuMusic:this.mainMenuMusic, dietType:"cardio"});
      this.type2.events.onInputDown.add( this.onDown, {game:this.game, mainMenuMusic:this.mainMenuMusic, dietType:"weightLift"});
    }, this);
  }
  /**
   * Blinking text effect
   */
  updateBlinkTitleCounter() {
    if (this.startTxt.exists) {
      this.startTxt.kill();
    } else {
      this.startTxt.revive();
    }
  }
  update() {}
  /**
   * Behaviour when there is input done
   */
  onDown() {
    this.mainMenuMusic.stop();
    console.log(this.dietType);
    this.game.state.start("Game", true, false, this.dietType );
  }
}
