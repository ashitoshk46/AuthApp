const generaicError = (app) => {
    app.use((err, req, res, next) => {
        console.error("Error : ", err.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    })
}


export default generaicError;