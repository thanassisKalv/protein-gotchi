/**
 * @author       @jvalen <javiervalenciaromero@gmail.com>
 * @copyright    2015 Javier Valencia Romero
 */

/**
 * Character class
 * @param {object} game Phaser.Game
 * @param {object} position
 * @param {object} properties
 * @constructor
 * @extends {Phaser.Sprite}
 */

import { disableMoveChildren, findChild } from "./util";
let Character = function (game, position, properties) {
  Phaser.Sprite.call(this, game, position.x, position.y, properties.spriteName);
  this.scale.setTo(0.8);

  //Location
  this.x = game.world.centerX;
  this.y = game.world.height;
  this.anchor.setTo(0.5);
  this.cgame = game;

  //Character properties
  this.customParams = properties.initialStats;
  this.walkSpeed = 300;

  //Head (child)
  this.head = game.add.sprite(0, -75, "headHero");
  this.head.anchor.setTo(0.5);

  //Init spritesheet frame
  this.frame = properties.frame.body;       //body frame
  this.head.frame = properties.frame.head;  //head frame

  //Animations info
  this._animationsInfo = properties.animations;

  //Name-clothing relationship
  this.nameRelation = properties.nameRelation;

  //Keep track of the clothing type
  this.clothingType = {
    body: { type: 0, name: this.nameRelation.body[0] },
    head: { type: 0, name: this.nameRelation.head[0] },
  };
  this.firstHeadSpritePositionArray = properties.headSpritePosition;
  this.firstBodySpritePositionArray = properties.bodySpritePosition;

  //Particle system setup
  this.emitterGroup = {
    aura: game.add.emitter(0, 0 + 30, 12),
  };

  this.emitterGroup.aura.makeParticles("auraParticle");
  this.initEmiter();

  //Sounds
  this.sounds = {
    aura: game.add.audio("aura"),
    explosion: game.add.audio("explosion"),
  };

  //Initialize animations
  for (var bodyPart in this._animationsInfo) {
    if (this._animationsInfo.hasOwnProperty(bodyPart)) {
      for (var animationInfo in this._animationsInfo[bodyPart].animations) {
        if (bodyPart !== "body") {
          this[bodyPart].animations.add(
            animationInfo,
            this._animationsInfo[bodyPart].animations[animationInfo].frameSecuence,
            this._animationsInfo[bodyPart].animations[animationInfo].frameRate,
            this._animationsInfo[bodyPart].animations[animationInfo].loop
          );
        } else {
          this.animations.add(
            animationInfo,
            this._animationsInfo.body.animations[animationInfo].frameSecuence,
            this._animationsInfo.body.animations[animationInfo].frameRate,
            this._animationsInfo.body.animations[animationInfo].loop
          );
        }
      }
    }
  }

  //Attach to body parts
  this.addChild(this.head);
  this.addChild(this.emitterGroup.aura);

  //Physics
  game.physics.enable(this, Phaser.Physics.ARCADE);
  this.body.collideWorldBounds = true;
  this.body.gravity.y = properties.gravity;
  this.body.maxVelocity.y = properties.maxSpeedY;

  //Events
  this.inputEnabled = true;
  this.events.onInputDown.add(this.annoyed, this);
  this.jumpingAway = false;
  this.jumpingRope = false;
  
  this.jumpRopeAnim = this.animations.getAnimation("ropejump");
  this.jumpRopeAnim.onComplete.add(function () {
    //Stop animation and set stopped frame
    //console.log("JumpRope finished!");
    this.jumpingRope = false;
  }, this);

  this.jumpAnim = this.animations.getAnimation("jump");
  this.jumpAnim.onComplete.add(function () {
    //Stop animation and set stopped frame
    this.jumpingAway = false;
  }, this);

  /* 	@require util.js
		Set that physics don't affect to character children
    */
  disableMoveChildren(this);
};
Character.prototype = Object.create(Phaser.Sprite.prototype);
Character.prototype.constructor = Character;

/**
 * Play "annoyed" animation
 */
Character.prototype.annoyed = function () {
  if (this.inputEnabled) {
    var head = findChild(this, "headHero");
    head.animations.play("annoyed");
  }
};

/**
 * Enable click
 */
Character.prototype.enableClick = function () {
  this.inputEnabled = true;
};

/**
 * Disable click
 */
Character.prototype.disableClick = function () {
  this.inputEnabled = false;
};

Character.prototype.jumpAway = function(foodItem){
  this.annoyed();
  this.jumpingAway = true;
  this.animations.stop();
  if (typeof this.characterMov !== 'undefined')
    if (this.characterMov.isRunning){
      this.characterMov.pause();
      this.characterMov.stop();
    }

  if (foodItem.x<this.x){
    this.animations.play("jump");
    this.body.velocity.y = -250;
    this.body.velocity.x = 250;
  }
  else{
    this.animations.play("jump");
    this.body.velocity.y = -250;
    this.body.velocity.x = -250
  }

}

Character.prototype.jumpRope = function(){
  this.annoyed();
  this.jumpingRope = true;
  this.animations.stop();
  if (typeof this.characterMov !== 'undefined')
    if (this.characterMov.isRunning){
      this.characterMov.pause();
      this.characterMov.stop();
    }

  this.animations.play("ropejump");
  this.body.velocity.y = -350;

}


  /**
   * Character moves to a touched position
   * @param {Phaser.Sprite} sprite
   * @param {object} pointer
   * @param {object} targetPosition
   */
  Character.prototype.walkingTo = function(sprite, pointer, targetPosition) {
    if(this.jumpingAway || this.jumpingRope)
      return;
    var head = findChild(this, "headHero");
    var x, y;

    if (!!targetPosition) {
      //Walk to an item
      x = targetPosition.x;
      y = targetPosition.y;
    } else {
      //Walk to touch position
      x = pointer.x;
      y = pointer.y;
    }

    if (x < this.x) {
      //Go left
      this.scale.x = 0.75;
      head.scale.x = -1;
    } else {
      //Go right
      this.scale.x = - 0.75;
      head.scale.x = -1;
    }

    //Character animation
    this.animations.play("walk");

    //Move the character towards the cursor
    this.characterMov = this.cgame.add.tween(this);
    this.characterMov.to({ x: x }, this.walkSpeed);
    this.characterMov.onComplete.add(function () {
      //Stop animation and set stopped frame
      this.animations.stop();
      this.restartAnimation("walk");
    }, this);

    this.characterMov.start();
  }


/**
 * Restart aura emitter
 */
Character.prototype.initEmiter = function () {
  this.emitterGroup.aura.setRotation(0, 0);
  this.emitterGroup.aura.setAlpha(1, 1);
  this.emitterGroup.aura.setScale(1, 1);
  this.emitterGroup.aura.gravity = -600;
  this.emitterGroup.aura.width = Math.abs(this.width);
  this.emitterGroup.aura.forEach(function (particle) {
    //Tint every particle with a random color
    particle.tint = Phaser.Color.getRandomColor(0, 255, 255);
  });
  this.emitterGroup.aura.minParticleScale = 0.5;
  this.emitterGroup.aura.maxParticleScale = 1.5;
  this.emitterGroup.aura.bounce.setTo(0.5, 0.5);
  this.emitterGroup.aura.angularDrag = 90;
  this.emitterGroup.aura.setXSpeed(-40, 40);
  this.emitterGroup.aura.setYSpeed(-40, 40);
  this.emitterGroup.aura.frequency = 100;
};

/**
 * Return clothing type
 * @param {boolean} bodypart
 * @return {number}
 */
Character.prototype.giveMeType = function (bodyPart) {
  if (bodyPart === "body") {
    return this.clothingType.body.type;
  } else {
    return this.clothingType.head.type;
  }
};

/**
 * Return name related to clothing
 * @param {boolean} bodypart
 * @return {number}
 */
Character.prototype.giveMeName = function () {
  return this.clothingType.head.name + this.clothingType.body.name + "Bot";
};

/**
 * Show character aura
 * @param {function} callback
 * @param {object} elem Type of clothing and body part
 */
Character.prototype.showAura = function (callback, elem) {
  var auraTween = this.game.add
    .tween(this.emitterGroup.aura)
    .to({ frequency: 10 }, 3500, Phaser.Easing.Linear.None, true);

  auraTween.onComplete.add(function () {
    this.emitterGroup.aura.setXSpeed(-650, 650);
    this.emitterGroup.aura.setYSpeed(-650, 650);
    this.sounds.aura.stop();
    this.emitterGroup.aura.on = false;
    this.sounds.explosion.play("", 0, 1, false);
    this.emitterGroup.aura.explode(600, 12);

    this.initEmiter();
    if (typeof callback === "function") {
      callback(elem);
    }
  }, this);

  this.emitterGroup.aura.start(false, 800, 12);
  auraTween.start();
  this.sounds.aura.play("", 0, 0.5, true);
};

/**
 * Update clothing
 * @param {string} bodyPartName
 * @param {number} clothingType
 */
Character.prototype.updateClothing = function (bodyPartName, clothingType) {
  var firstHeadFrameCurrentType,
    firstBodyFrameCurrentType,
    self = this;

  function updateAnimationFrames(bodyPart, type, animationsInfo) {
    var animationManager = bodyPart === "body" ? self.animations : self[bodyPart].animations;

    for (var currentAnimation in animationManager._anims) {
      if (animationsInfo.hasOwnProperty(currentAnimation)) {
        //Copy frames array
        var auxFramesData = animationsInfo[
          currentAnimation
        ].frameSecuence.slice();

        for (var i = 0; i < auxFramesData.length; i++) {
          auxFramesData[i] = auxFramesData[i] + type;
        }
        animationManager.add(
          currentAnimation,
          auxFramesData,
          animationsInfo[currentAnimation].frameRate,
          animationsInfo[currentAnimation].loop
        );
      }
    }
  }

  switch (bodyPartName) {
    case "body":
      this.clothingType.body.type = clothingType;
      this.clothingType.body.name = this.nameRelation.body[clothingType];
      firstBodyFrameCurrentType = this.firstBodySpritePositionArray[
        clothingType
      ];

      updateAnimationFrames( bodyPartName, firstBodyFrameCurrentType, this._animationsInfo[bodyPartName].animations );

      this.frame = firstBodyFrameCurrentType + this._animationsInfo.body.animations.walk.frameSecuence.length;
      break;
    case "head":
      this.clothingType.head.type = clothingType;
      this.clothingType.head.name = this.nameRelation.head[clothingType];
      firstHeadFrameCurrentType = this.firstHeadSpritePositionArray[ clothingType ];

      updateAnimationFrames( bodyPartName, firstHeadFrameCurrentType, this._animationsInfo[bodyPartName].animations );

      this.head.frame = firstHeadFrameCurrentType;
      break;
  }
};

/**
 * Restart the proper animation
 * @param {string} name
 */
Character.prototype.restartAnimation = function (name) {
  var firstBodyFrameCurrentType = this.firstBodySpritePositionArray[
    this.clothingType.body.type
  ];

  switch (name) {
    case "walk":
      this.frame = firstBodyFrameCurrentType + this._animationsInfo.body.animations.walk.frameSecuence.length;
      break;
  }
};

/**
 * Restart the proper animation
 * @return {object} Returns the current character clothing and position info
 */
Character.prototype.shareCharacterInfo = function () {
  return {
    head: {
      spriteName: "headHero",
      position: {
        x: this.head.x,
        y: this.head.y,
      },
      //Get the annoyed face
      spriteFrame: 3  //Math.floor(this.head.frame / 4) * 4 + 3,
    },
    body: {
      spriteName: "bodyHero",
      position: {
        x: this.x,
        y: this.y,
      },
      spriteFrame: this.frame,
    },
  };
};

/**
 * Stops character related sounds
 */
Character.prototype.stopSounds = function () {
  this.sounds.aura.stop();
  this.sounds.explosion.stop();
};

export default Character;
