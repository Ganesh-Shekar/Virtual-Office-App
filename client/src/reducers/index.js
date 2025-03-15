import {combineReducers} from 'redux';
import characterImagesReducer from '../components/slices/characterImagesSlice';
import mapImagesReducer from '../components/slices/mapImagesSlice';
import statusReducer from '../components/slices/statusSlice';
import allCharactersReducer from '../components/slices/allCharactersSlice';

export default combineReducers({
    mapImagesLoaded: mapImagesReducer,
    gameStatus: statusReducer,
    characterImagesLoaded: characterImagesReducer,
    allCharacters: allCharactersReducer,
});