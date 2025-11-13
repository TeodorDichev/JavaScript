import { Level } from "./level.js";
import { State } from "./state.js";

function trackKeys(keys) {
  let down = Object.create(null);
  function track(event) {
    if (keys.includes(event.key)) {
      down[event.key] = event.type == "keydown";
      event.preventDefault();
    }
  }
  window.addEventListener("keydown", track);
  window.addEventListener("keyup", track);
  down.unregister = () => {
    window.removeEventListener("keydown", track);
    window.removeEventListener("keyup", track);
  };
  return down;
}

export async function runLevel(level, Display) {
  let display = new Display(document.body, level);
  let state = State.start(level);
  let ending = 1;
  let running = "yes";

  const keys = trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp"]);

  return new Promise((resolve) => {
    function escHandler(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (running === "no") {
        running = "yes";
        runAnimation(frame);
      } else if (running === "yes") {
        running = "pausing";
      } else if (running === "pausing") {
        running = "yes";
      }
    }

    window.addEventListener("keydown", escHandler);

    function frame(time) {
      if (running === "pausing") {
        running = "no";
        return false;
      }

      state = state.update(time, keys);
      display.syncState(state);

      if (state.status === "playing") return true;
      else if (ending > 0) {
        ending -= time;
        return true;
      } else {
        display.clear();
        keys.unregister();
        window.removeEventListener("keydown", escHandler);
        resolve(state.status);
        return false;
      }
    }

    runAnimation(frame);
  });
}

export async function runGame(plans, Display) {
  let lives = 3;

  for (let level = 0; level < plans.length && lives > 0; ) {
    console.log(`Level ${level + 1}, lives: ${lives}`);
    let status = await runLevel(new Level(plans[level]), Display);
    if (status === "won") level++;
    else lives--;
  }

  if (lives > 0) {
    console.log("You've won!");
  } else {
    console.log("Game over");
  }
}

export function runAnimation(frameFunc) {
  let lastTime = null;
  function frame(time) {
    if (lastTime !== null) {
      let timeStep = Math.min(time - lastTime, 100) / 1000;
      if (frameFunc(timeStep) === false) return;
    }
    lastTime = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
