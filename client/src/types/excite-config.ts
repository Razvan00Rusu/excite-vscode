import {z} from 'zod';

export const EXCITE_CONFIG = z.object({
    "entry": z.string(),
    "serverIP": z.string(),    
});