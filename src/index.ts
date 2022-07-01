import express from 'express';
import { readdir } from 'node:fs/promises';
import { join } from 'path';
const app = express();

(async() => {
    const apiFolder = (await readdir(join(__dirname, 'routes', 'api'))).filter(file => file.endsWith('.js'));
    for (const file of apiFolder) {
        app.use('/api/v2/'+file.split('.')[0], require('./routes/api/'+file).default);
    }
    
    app.listen(8080, () => {
        console.log('🚀 Server is running on port 8080');
    })
})();