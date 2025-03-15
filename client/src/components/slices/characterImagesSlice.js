import {createSlice} from '@reduxjs/toolkit';
const characterImagesSlice = createSlice({
    name: 'characterImages',
    initialState: {},
    reducers: {
        bufferImage(state, action) {
            const path = action.payload;
            if (path) {
                state[path] = 1;
            }            
        },
    }
});
export const { bufferImage } = characterImagesSlice.actions;
export default characterImagesSlice.reducer;