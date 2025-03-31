import React, { useContext, useEffect } from 'react';
import { connect } from 'react-redux';
import CanvasContext from './CanvasContext';
import { CHARACTER_IMAGE_SIZE, CHARACTER_CLASSES_MAP } from './characterConstants';
import { TILE_SIZE } from './mapConstants';
import { MY_CHARACTER_INIT_CONFIG } from './characterConstants';

function OtherCharacter({ allCharactersData }) {
  const context = useContext(CanvasContext);

  useEffect(() => {
    if (!context || !allCharactersData) return;

    // Clear previous positions
    context.canvas.clearRect(0, 0, context.canvas.width, context.canvas.height);

    // Draw all other characters
    Object.entries(allCharactersData).forEach(([id, character]) => {
      if (id === MY_CHARACTER_INIT_CONFIG.id) return;

      if (character.position && character.characterClass) {
        const characterImg = document.querySelector(
          `#character-sprite-img-${character.characterClass}`
        );
        
        if (characterImg) {
          const { sx, sy } = CHARACTER_CLASSES_MAP[character.characterClass]?.icon || { sx: 0, sy: 0 };
          
          context.canvas.drawImage(
            characterImg,
            sx,
            sy,
            CHARACTER_IMAGE_SIZE - 5,
            CHARACTER_IMAGE_SIZE - 5,
            character.position.x * TILE_SIZE,
            character.position.y * TILE_SIZE,
            CHARACTER_IMAGE_SIZE,
            CHARACTER_IMAGE_SIZE
          );
        }
      }
    });
  }, [context, allCharactersData]);

  return null;
}

const mapStateToProps = (state) => {
  const { [MY_CHARACTER_INIT_CONFIG.id]: currentUser, ...otherUsers } = state.allCharacters.users;
  return { allCharactersData: otherUsers };
};

export default connect(mapStateToProps)(OtherCharacter);