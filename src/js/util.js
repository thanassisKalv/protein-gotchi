
/**
 * @author       @jvalen <javiervalenciaromero@gmail.com>
 * @copyright    2015 Javier Valencia Romero
 */

/**
 * Find a child in a Sprite (phaserjs)
 * @param {Phaser.Sprite} parentSprite
 * @param {string} key
 */
export function findChild(parentSprite, key) {
  for (var i = 0; i < parentSprite.children.length; i++) {
    var currentChild = parentSprite.children[i];
    if (currentChild.key === key) {
      return currentChild;
    }
  }
  return null;
}

/**
 * Disable move to a sprite children (phaserjs)
 * @param {Phaser.Sprite} parentSprite
 */
export function disableMoveChildren(parentSprite) {
  for (var i = 0; i < parentSprite.children.length; i++) {
    if (parentSprite.children[i].hasOwnProperty("body")) {
      parentSprite.children[i].body.moves = false;
    }
  }
}

/**
 * Get a random number within a range
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


/**
 * Custom tweening of color-tint
 * @param {Phaser.game} game
 * @param {Phaser.Sprite} spriteToTween
 */
export function tweenTint(game, spriteToTween, startColor, endColor, duration) {
  var colorBlend = {step: 0};

  spriteToTween.colorTweening = game.add.tween(colorBlend).to({step: 100}, duration, Phaser.Easing.Default, false).loop(true).yoyo(true, 600);
  spriteToTween.colorTweening.onUpdateCallback(() => {
          spriteToTween.tint = Phaser.Color.interpolateColor(startColor, endColor, 100, colorBlend.step, 1);
          spriteToTween.colorTween = true;
      })
  spriteToTween.colorTweening.start();
  
};

/**
 * Private handler to save Item in LocalStorage
 * @param {string} key
 * @param {string|Array|Object} data
 */
export function saveLocalItem(key, data) {
  var prefix = "vjcare_";

  if (typeof data === "string") {
    localStorage.setItem(prefix + key, data);
  } else {
    localStorage.setItem(prefix + key, JSON.stringify(data));
  }
}

/**
 * Private handler to save Item in LocalStorage
 * @param {string} key
 * @param {string|Array|Object} data
 */
 export function saveLocalStorage(key, data) {
  var prefix = "vjcare_storage_";

  if (typeof data === "string") {
    localStorage.setItem(prefix + key, data);
  } else {
    localStorage.setItem(prefix + key, JSON.stringify(data));
  }
}

/**
 * Private handler to save each day meal-status in LocalStorage
 * @param {string} currentDay
 * @param {string} currentMeal
 * @param {string|Array|Object} data
 */
export function saveMealStatus(currentDay, currentMeal, status){
  var key = "vjcare_meals_status";

  var data = localStorage.getItem(key);
  console.log(data);

  if(data == null) {
    data = {};
  }else{
    data = JSON.parse(data);
  }
  
  data[currentDay+"_"+currentMeal] = status;

  localStorage.setItem(key, JSON.stringify(data));

}

export function loadMealStatus(){
  var key = "vjcare_meals_status";
  var data = localStorage.getItem(key);

  if(data == null) 
    data = {};
  else
    data = JSON.parse(data);
  
  return data;
}


export function cleanLocalStorage(key){
  var prefix = "vjcare_storage_";
  localStorage.removeItem(prefix+key); 
}

/**
 * Private handler to load Items saved in LocalStorage
 * @param {string} key
 * @param {string|Array|Object} data
 */
 export function getLocalItemStorage(key) {
  var prefix = "vjcare_storage_";
  var data = localStorage.getItem(prefix + key);

  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
}


/**
 * Private handler to get Item from LocalStorage
 * @param {string} key
 * @returns {Array|Object}
 */
export function getLocalItem(key) {
  var prefix = "vjcare_",
    data = localStorage.getItem(prefix + key);

  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
}

/**
 * Fisher-Yates (aka Knuth) Shuffle
 * @param {Array} array
 * @returns {Array}
 */
export function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


