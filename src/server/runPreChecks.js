import { validateSchema, checkDbConnection } from '../db/dbPreCheck.js';
import { runEmailConfCheck } from '../utils/emailChecks.js';



const makePreChecks = async () => {
    runEmailConfCheck();
    await checkDbConnection();
    let tries = 3;
    while (tries) {
        const reCheck = await validateSchema(tries < 3);
        if (!reCheck) break;
        tries -= 1;
    }
}



export default makePreChecks;