import React from 'react';
import { connect } from 'react-redux';
import {MAP_TILE_IMAGES} from './mapConstants';
import {CHARACTER_CLASSES_MAP} from './characterConstants';
import {bufferImage} from './slices/mapImagesSlice';
import { bufferImage as bufferCharacterImage } from './slices/characterImagesSlice';
const mapDispatch = { bufferImage };

const ImagesBuffer = ({ bufferImage }) => {
    return (
        <div className="images-buffer">
        {
            Object.keys(MAP_TILE_IMAGES).map(key => {
                return (
                    <img
                        key={`map-tile-img-${key}`} 
                        id={`map-tile-img-${key}`} 
                        src={`${MAP_TILE_IMAGES[key]}`}
                        alt={`map-tile-${key}`}
                        onLoad={() => {      
                            bufferImage(MAP_TILE_IMAGES[key]);
                        }}
                    />
                );
            })
        }
        {
            Object.keys(CHARACTER_CLASSES_MAP).map(key => {
                var characterInfo = CHARACTER_CLASSES_MAP[key];
                return (
                    <img
                        key={`character-sprite-img-${characterInfo['className']}`} 
                        id={`character-sprite-img-${characterInfo['className']}`} 
                        src={`${characterInfo['spriteImage']}`}
                        alt={`character-sprite-${characterInfo['className']}`}
                        onLoad={() => {      
                            bufferCharacterImage(characterInfo['spriteImage']);
                        }}
                    />
                );
            })
        }
        </div>
    )
}
export default connect(null, mapDispatch)(ImagesBuffer);