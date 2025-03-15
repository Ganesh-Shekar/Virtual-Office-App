import {useContext, useEffect} from 'react';
import CanvasContext from './CanvasContext';
import {TILE_SIZE} from './mapConstants';

const Grid = ({width, height, children}) => {
    const context = useContext(CanvasContext);
    useEffect(() => {
        for(let i = 0; i < height; i++) {    
            const y = i * TILE_SIZE;         
            context.canvas.beginPath();
            context.canvas.moveTo(0, y);
            context.canvas.lineTo(width, y);
            context.canvas.stroke();
        }
        for(let j = 0; j < width; j++) {
            const x = j * TILE_SIZE;
            context.canvas.beginPath();
            context.canvas.moveTo(x, 0);
            context.canvas.lineTo(x, height);
            context.canvas.stroke();
        } 
    }, [context, height, width]);
    return children;
}
export default Grid;