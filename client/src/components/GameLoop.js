import React, { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import CanvasContext from "./CanvasContext";

import { MOVE_DIRECTIONS, MAP_DIMENSIONS, TILE_SIZE } from "./mapConstants";
import { MY_CHARACTER_INIT_CONFIG } from "./characterConstants";
import { checkMapCollision } from "./utils";
import { update } from "./slices/allCharactersSlice";

const GameLoop = ({ children, allCharactersData, update }) => {
  const canvasRef = useRef(null);
  const [context, setContext] = useState(null);
  useEffect(() => {
    // frameCount used for re-rendering child components
    console.log("initial setContext");
    setContext({ canvas: canvasRef.current.getContext("2d"), frameCount: 0 });
  }, [setContext]);

  // keeps the reference to the main rendering loop
  const loopRef = useRef();
  const mycharacterData = allCharactersData[MY_CHARACTER_INIT_CONFIG.id];

  const moveMyCharacter = useCallback(
    (e) => {
      var currentPosition = mycharacterData.position;
      const key = e.key;
      if (MOVE_DIRECTIONS[key]) {
        // Calculate the new position based on the direction
        const direction = MOVE_DIRECTIONS[key];
        const newX = currentPosition.x + direction[0];
        const newY = currentPosition.y + direction[1];

        // Check if the new position is valid (not colliding with map boundaries or obstacles)
        if (!checkMapCollision(newX, newY)) {
          // Update the character's position in the Redux store
          const updatedUsers = { ...allCharactersData };
          updatedUsers[MY_CHARACTER_INIT_CONFIG.id] = {
            ...mycharacterData,
            position: { x: newX, y: newY },
          };

          // Update the character's position
          update(updatedUsers);
        }
      }
    },
    [mycharacterData, allCharactersData, update]
  );

  const tick = useCallback(() => {
    if (context != null) {
      setContext({
        canvas: context.canvas,
        frameCount: (context.frameCount + 1) % 60,
      });
    }
    loopRef.current = requestAnimationFrame(tick);
  }, [context]);

  useEffect(() => {
    loopRef.current = requestAnimationFrame(tick);
    return () => {
      loopRef.current && cancelAnimationFrame(loopRef.current);
    };
  }, [loopRef, tick]);

  useEffect(() => {
    document.addEventListener("keypress", moveMyCharacter);
    return () => {
      document.removeEventListener("keypress", moveMyCharacter);
    };
  }, [moveMyCharacter]);

  return (
    <CanvasContext.Provider value={context}>
      <canvas
        ref={canvasRef}
        width={TILE_SIZE * MAP_DIMENSIONS.COLS}
        height={TILE_SIZE * MAP_DIMENSIONS.ROWS}
        class="main-canvas"
      />
      {children}
    </CanvasContext.Provider>
  );
};

const mapStateToProps = (state) => {
  return { allCharactersData: state.allCharacters.users };
};

export default connect(mapStateToProps, { update })(GameLoop);
