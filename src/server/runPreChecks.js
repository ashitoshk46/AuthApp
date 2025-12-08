import { validateSchema, checkDbConnection } from '../db/dbPreCheck.js';
import { emailService } from '../utils/emailService.js';



const makePreChecks = async () => {
    await emailService.preCheck({ providerKey: 'primary', retries: 1, silent: false });
    await checkDbConnection();
    let tries = 3;
    while (tries) {
        const reCheck = await validateSchema(tries < 3);
        if (!reCheck) break;
        tries -= 1;
    }
}



export default makePreChecks;