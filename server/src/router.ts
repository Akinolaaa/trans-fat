import express from 'express'
import authRouter from './domains/auth/auth.routes'
import uploadRouter from './domains/uploads/uploads.routes'


const appRouter = express.Router()


appRouter.use('/api/auth', authRouter)
appRouter.use('/api/upload', uploadRouter)

export default appRouter