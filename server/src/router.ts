import express from 'express'
import authRouter from './domains/auth/auth.routes'


const appRouter = express.Router()


appRouter.use('/api/auth', authRouter)

export default appRouter