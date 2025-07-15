import express, { Request, Response } from 'express';
import { runRpa } from './rpaEngine';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req: Request, res: Response) => {
  res.send('✅ RPA Bot is running');
});

app.post('/run-rpa', async (_req: Request, res: Response) => {
  try {
    console.log('[SERVER] RPA trigger received.');
    await runRpa();  // this executes your full bot
    res.send('✅ RPA executed successfully');
  } catch (err: any) {
    console.error('[SERVER] RPA failed:', err.message);
    res.status(500).send('❌ RPA failed');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server started at http://localhost:${PORT}/`);
});