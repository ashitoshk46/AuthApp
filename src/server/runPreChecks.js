import { checkDbConnection, validate_db_schema } from "../db/db.js"



const makePreChecks = async () => {
    await checkDbConnection();
    await validate_db_schema();
}



export default makePreChecks;