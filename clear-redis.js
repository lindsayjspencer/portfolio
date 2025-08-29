import { env } from './src/env.js';
import Redis from 'ioredis';

const redis = new Redis(env.REDIS_URL);

async function clearRedis() {
	try {
		console.log('Clearing Redis database...');
		const result = await redis.flushall();
		console.log('Redis FLUSHALL result:', result);
		console.log('✅ Redis database cleared successfully!');
	} catch (error) {
		console.error('❌ Failed to clear Redis database:', error);
	} finally {
		await redis.quit();
	}
}

clearRedis();
