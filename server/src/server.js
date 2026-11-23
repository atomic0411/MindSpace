import mongoose from 'mongoose';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 4000);

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  await mongoose.connect(uri);
  const app = createApp();
  app.listen(port, () => console.info(`Mindspace API listening on port ${port}`));
}

start().catch(error => {
  console.error('Failed to start Mindspace API:', error.message);
  process.exit(1);
});
