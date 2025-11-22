
import express from 'express';

const router = express.Router();

router.get('/email-verified', async (req, res) => {
    console.log("verifie!")
    res.status(200).json({ message: 'User verified!' });
})

export default router;
    
    
    