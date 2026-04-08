import express from 'express';
import cors from 'cors'
import 'dotenv/config';
import connectDB from './configs/db.js';
import {clerkMiddleware} from '@clerk/express'
import {serve} from 'inngest/express'
import { functions, inngest } from './inngest/index.js';
import showRouter from './routes/showRoute.js';
import bookingRouter from './routes/bookingRoute.js';
import adminRouter from './routes/adminRoute.js';
import userRouter from './routes/userRoute.js';


const app = express();
const port = 3000;
app.use(clerkMiddleware())


//middleware 
app.use(express.json());
app.use(cors());

await connectDB()

app.get('/', (req,res)=> res.send('Server is Live!'));
app.use('/api/inngest', serve({client: inngest, functions}))
app.use('/api/show', showRouter)
app.use('/api/booking', bookingRouter)
app.use('/api/admin',adminRouter)
app.use('/api/user', userRouter)


app.listen(port, ()=> console.log(`Server listening at Port:${port}`) )