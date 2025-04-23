import React, { useCallback, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  ref,
  onValue,
  update as firebaseUpdate,
  get,
  set,
} from "firebase/database";
import { firebaseDatabase } from "../firebase/firebase";
import CanvasContext from "./CanvasContext";

import { MOVE_DIRECTIONS, MAP_DIMENSIONS, TILE_SIZE } from "./mapConstants";
import { MY_CHARACTER_INIT_CONFIG } from "./characterConstants";
import { checkMapCollision } from "./utils";
import { update as reduxUpdate } from "./slices/allCharactersSlice";

// Firebase Character Initialization Utility
const initializeCharacterInFirebase = async (
  characterId = MY_CHARACTER_INIT_CONFIG.id,
  initialPosition = MY_CHARACTER_INIT_CONFIG.position
) => {
  try {
    const characterRef = ref(firebaseDatabase, `characters/${characterId}`);

    // Check if character data already exists
    const snapshot = await get(characterRef);

    if (!snapshot.exists()) {
      // If no existing data, set initial character data
      await set(characterRef, {
        id: characterId,
        position: initialPosition,
        createdAt: new Date().toISOString(),
        name: MY_CHARACTER_INIT_CONFIG.name || "Player",
        characterClass: MY_CHARACTER_INIT_CONFIG.characterClass,
      });
      // console.log(`Initialized character ${characterId} in Firebase`);
    } else {
      // console.log(`Character ${characterId} already exists in Firebase`);
    }
  } catch (error) {
    console.error("Error initializing character in Firebase:", error);
  }
};

const GameLoop = ({ children, allCharactersData, reduxUpdate }) => {
  const canvasRef = useRef(null);
  const [context, setContext] = useState(null);

  // Firebase reference for characters
  const charactersRef = useRef(ref(firebaseDatabase, "characters"));

  useEffect(() => {
    // Initialize character in Firebase
    initializeCharacterInFirebase();

    // Setup Firebase listener for character updates
    const unsubscribe = onValue(charactersRef.current, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Update Redux store when Firebase data changes
        // console.log("Firebase data received:", data);
        reduxUpdate(data);
      }
    });

    // Initial context setup
    if (canvasRef.current) {
      setContext({
        canvas: canvasRef.current.getContext("2d"),
        frameCount: 0,
      });
    }

    // Cleanup subscription and remove character from Firebase
    return () => {
      unsubscribe();
      // Remove character from Firebase when component unmounts
      const characterRef = ref(
        firebaseDatabase,
        `characters/${MY_CHARACTER_INIT_CONFIG.id}`
      );
      set(characterRef, null).catch(console.error);
    };
  }, [reduxUpdate]);

  const moveMyCharacter = useCallback(
    (e) => {
      const mycharacterData = allCharactersData[MY_CHARACTER_INIT_CONFIG.id];

      // Check if character data exists
      if (!mycharacterData || !mycharacterData.position) {
        console.warn("Character data not found, initializing...");
        initializeCharacterInFirebase();
        return;
      }

      const currentPosition = mycharacterData.position;
      const key = e.key;

      if (MOVE_DIRECTIONS[key]) {
        // Calculate the new position based on the direction
        const direction = MOVE_DIRECTIONS[key];
        const newX = currentPosition.x + direction[0];
        const newY = currentPosition.y + direction[1];

        // Check if the new position is valid (not colliding with map boundaries or obstacles)
        if (!checkMapCollision(newX, newY)) {
          // Prepare updated character data
          const updatedCharacterData = {
            ...mycharacterData,
            position: { x: newX, y: newY },
          };

          // Update Firebase first
          const updatePayload = {
            [MY_CHARACTER_INIT_CONFIG.id]: updatedCharacterData,
          };

          firebaseUpdate(charactersRef.current, updatePayload);
        }
      }
    },
    [allCharactersData]
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

  const loopRef = useRef();
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
        className="main-canvas"
      />
      {children}
    </CanvasContext.Provider>
  );
};

const mapStateToProps = (state) => {
  return { allCharactersData: state.allCharacters.users };
};

export default connect(mapStateToProps, { reduxUpdate })(GameLoop);
