// src/redis/redis.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Command } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = process.env.REDIS_HOST || '0.0.0.0';
    const port = Number(process.env.REDIS_PORT || 63790);
    // const password = this.configService.get('REDIS_PASSWORD', '');

    this.client = new Redis({
      tls: {
        host,
        port,
      },
      // password,
    });

    this.client.on('connect', () => console.log('Redis connected'));
    this.client.on('error', (err) => console.error('Redis error:', err));
  }

  onModuleDestroy() {
    this.client.quit();
  }

  // -------- Standard Redis Functions --------
  async set(key: string, value: string, ttlSeconds?: number) {
    key = this.addBackendEnv(key);
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string) {
    key = this.addBackendEnv(key);
    return await this.client.get(key);
  }

  async del(key: string) {
    key = this.addBackendEnv(key);
    return await this.client.del(key);
  }

  async exists(key: string) {
    key = this.addBackendEnv(key);
    return await this.client.exists(key);
  }

  async incr(key: string) {
    key = this.addBackendEnv(key);
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number) {
    key = this.addBackendEnv(key);
    return await this.client.expire(key, seconds);
  }

  // -------- RedisJSON Functions (Redis Stack) --------
  async jsonSet(key: string, path: string, json: any): Promise<string> {
    key = this.addBackendEnv(key);
    const command = new Command('JSON.SET', [key, path, JSON.stringify(json)]);
    return (await this.client.sendCommand(command)) as Promise<string>;
  }

  async jsonGet(key: string, path = '$'): Promise<any | null> {
    key = this.addBackendEnv(key);
    const command = new Command('JSON.GET', [key, path]);
    return await this.client.sendCommand(command);
  }

  async jsonDel(key: string, path = '$') {
    key = this.addBackendEnv(key);
    const command = new Command('JSON.DEL', [key, path]);
    const result = await this.client.sendCommand(command);
    return Number(result);
  }

  async jsonMget(path = '.', ...keys: string[]): Promise<(any | null)[]> {
    keys = keys.map((val) => this.addBackendEnv(val));
    const args = ['JSON.MGET', ...keys, path];
    const command = new Command(args[0], args.slice(1));
    const result: any = await this.client.sendCommand(command);
    return result;
  }
  private addBackendEnv(key: String) {
    return (process.env.BACKEND || 'gtm') + key;
  }
}
