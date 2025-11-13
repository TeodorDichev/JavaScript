export class State {
  constructor(level, actors, status) {
    this.level = level;
    this.actors = actors;
    this.status = status;
  }

  static start(level) {
    return new State(level, level.startActors, "playing");
  }

  get player() {
    return this.actors.find((a) => a.type === "player");
  }

  update(time, keys) {
    let actors = this.actors.map((a) => a.update(time, this, keys));
    let newState = new State(this.level, actors, this.status);

    const player = newState.player;
    if (this.level.touches(player.pos, player.size, "lava")) {
      newState.status = "lost";
    }

    for (let actor of actors) {
      if (actor !== player && overlap(actor, player)) {
        const result = actor.collide(newState);
        if (result.actors) newState.actors = result.actors;
        if (result.status) newState.status = result.status;
      }
    }

    return newState;
  }
}

function overlap(a1, a2) {
  return (
    a1.pos.x + a1.size.x > a2.pos.x &&
    a1.pos.x < a2.pos.x + a2.size.x &&
    a1.pos.y + a1.size.y > a2.pos.y &&
    a1.pos.y < a2.pos.y + a2.size.y
  );
}
