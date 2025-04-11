import { v4 as uuid } from "uuid";

// Retrieve the character ID from localStorage, if available.
let myCharacterId = localStorage.getItem("myCharacterId");

// If no ID exists, generate a new one and save it to localStorage.
if (!myCharacterId) {
  myCharacterId = uuid();
  localStorage.setItem("myCharacterId", myCharacterId);
}

export const CHARACTER_IMAGE_SIZE = 32;

export const CHARACTER_CLASSES_MAP = {
  ENGINEER: {
    icon: { sx: 0, sy: 0 },
    portrait: { sx: 0, sy: 240 },
    className: "ENGINEER",
    spriteImage: "assets/characters/characters.png",
  },
};

export const MY_CHARACTER_INIT_CONFIG = {
  name: "Amanda",
  id: myCharacterId,
  position: { x: 12, y: 12 },
  characterClass: "ENGINEER",
};
