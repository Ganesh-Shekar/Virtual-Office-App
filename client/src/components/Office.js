import React, {useContext, useEffect } from 'react';
import { connect } from 'react-redux';
import Grid from './Grid';
import ImagesBuffer from './ImagesBuffer';
import Map from './Map';
import CanvasContext from './CanvasContext';
import MyCharacter from './MyCharacter';
import {MAP_DIMENSIONS, TILE_SIZE, MAP_TILE_IMAGES} from './mapConstants';

const Office = ({mapImagesLoaded, gameStatus, webrtcSocket}) => {
    const width = MAP_DIMENSIONS.COLS * TILE_SIZE;
    const height = MAP_DIMENSIONS.ROWS * TILE_SIZE;
    const context = useContext(CanvasContext);

    useEffect(() => {
        return () => {
            context && context.canvas.clearRect(0, 0, context.canvas.width, context.canvas.height);
        }
    }, [context])

    return (
        <>
            <ImagesBuffer />
            {Object.keys(mapImagesLoaded).length === Object.keys(MAP_TILE_IMAGES).length &&
                <>
                    <Grid width={width} height={height}>
                        <Map />                
                    </Grid>
                </>
            }
            {gameStatus.mapLoaded && <MyCharacter webrtcSocket={webrtcSocket}/>}
        </>
    );
};

const mapStateToProps = ({mapImagesLoaded, gameStatus}) => ({mapImagesLoaded, gameStatus});

export default connect(mapStateToProps)(Office);