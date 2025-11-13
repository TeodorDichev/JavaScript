import { Vec } from "./vector.js";
import { State } from "./state.js";

export class Player {
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
  }
  get type() {
    return "player";
  }
  static create(pos) {
    return new Player(pos.plus(new Vec(0, -0.5)), new Vec(0, 0));
  }
}

Player.prototype.size = new Vec(0.8, 1.5);

export class Lava {
  constructor(pos, speed, reset) {
    this.pos = pos;
    this.speed = speed;
    this.reset = reset;
  }
  get type() {
    return "lava";
  }
  static create(pos, ch) {
    if (ch == "=") return new Lava(pos, new Vec(2, 0));
    if (ch == "|") return new Lava(pos, new Vec(0, 2));
    if (ch == "v") return new Lava(pos, new Vec(0, 3), pos);
  }
}

Lava.prototype.size = new Vec(1, 1);

export class Coin {
  constructor(pos, basePos, wobble) {
    this.pos = pos;
    this.basePos = basePos;
    this.wobble = wobble;
  }
  get type() {
    return "coin";
  }
  static create(pos) {
    let basePos = pos.plus(new Vec(0.2, 0.1));
    return new Coin(basePos, basePos, Math.random() * Math.PI * 2);
  }
}

Coin.prototype.size = new Vec(0.6, 0.6);

const monsterSpeed = 4;
class Monster {
  constructor(pos) {
    this.pos = pos;
  }

  get type() { return "monster"; }

  static create(pos) {
    return new Monster(pos.plus(new Vec(0, -1)));
  }

  update(time, state) {
    let player = state.player;
    let dx = (player.pos.x < this.pos.x ? -1 : 1) * monsterSpeed * time;
    let newPos = new Vec(this.pos.x + dx, this.pos.y);
    if (state.level.touches(newPos, this.size, "wall")) return this;
    return new Monster(newPos);
  }

  collide(state) {
    let player = state.player;
    // If player is above monster, "kill" monster
    if (player.pos.y + player.size.y < this.pos.y + 0.5) {
      let filtered = state.actors.filter(a => a !== this);
      return new State(state.level, filtered, state.status);
    } else {
      return new State(state.level, state.actors, "lost");
    }
  }
}

Monster.prototype.size = new Vec(1.2, 2);

export const levelChars = {
  ".": "empty",
  "#": "wall",
  "+": "lava",
  "@": Player,
  o: Coin,
  "=": Lava,
  "|": Lava,
  v: Lava,
 "M": Monster
};

// Physics constants
export const playerXSpeed = 7,
  gravity = 30,
  jumpSpeed = 17,
  wobbleSpeed = 8,
  wobbleDist = 0.07;

// Actor updates
Player.prototype.update = function (time, state, keys) {
  let xSpeed = 0;
  if (keys.ArrowLeft) xSpeed -= playerXSpeed;
  if (keys.ArrowRight) xSpeed += playerXSpeed;
  let pos = this.pos;
  let movedX = pos.plus(new Vec(xSpeed * time, 0));
  if (!state.level.touches(movedX, this.size, "wall")) pos = movedX;

  let ySpeed = this.speed.y + time * gravity;
  let movedY = pos.plus(new Vec(0, ySpeed * time));
  if (!state.level.touches(movedY, this.size, "wall")) pos = movedY;
  else if (keys.ArrowUp && ySpeed > 0) ySpeed = -jumpSpeed;
  else ySpeed = 0;

  return new Player(pos, new Vec(xSpeed, ySpeed));
};

Lava.prototype.update = function (time, state) {
  let newPos = this.pos.plus(this.speed.times(time));
  if (!state.level.touches(newPos, this.size, "wall"))
    return new Lava(newPos, this.speed, this.reset);
  else if (this.reset) return new Lava(this.reset, this.speed, this.reset);
  else return new Lava(this.pos, this.speed.times(-1));
};

Lava.prototype.collide = function (state) {
  return { actors: state.actors, status: "lost" };
};

Coin.prototype.update = function (time) {
  let wobble = this.wobble + time * wobbleSpeed;
  let wobblePos = Math.sin(wobble) * wobbleDist;
  return new Coin(
    this.basePos.plus(new Vec(0, wobblePos)),
    this.basePos,
    wobble
  );
};

Coin.prototype.collide = function (state) {
  let filtered = state.actors.filter((a) => a !== this);
  let status = state.status;
  if (!filtered.some((a) => a.type === "coin")) status = "won";
  return { actors: filtered, status };
};
