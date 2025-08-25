import puppeteer from '@cloudflare/puppeteer';
import { clickCmp } from 'puppeteer-cmp-clicker';
import { DurableObject } from 'cloudflare:workers';

const ALIVE_TIME = 60 * 10;

export class BrowserController extends DurableObject {
	env: Env;
	storage: any;
	browser: any;
	timer: number;
	constructor(ctx: any, env: any) {
		super(ctx, env);
		this.ctx = ctx;
		this.env = env;
		this.timer = 0;
		this.browser = null;
		this.storage = this.ctx.storage;
	}
	async renderAndCache(url: string) {
		this.timer = 0;
		if (!this.browser || !this.browser.isConnected()) {
			try {
				this.browser = await puppeteer.launch(this.env.BROWSER, { keep_alive: 60 * 10 * 100 });
			} catch (e) {
				console.error('Failed to launch browser:', e);
				throw new Error(`Browser launch failed: ${e}`);
			}
		}

		const page = await this.browser.newPage();
		// we wait until there are no more than 2 active network connections for at least 500ms
		await page.goto(url, { waitUntil: 'networkidle2' });
		
		try {
			// Skip CMP clicking if $x is not available in @cloudflare/puppeteer
			if (typeof (page as any).$x === 'function') {
				await clickCmp({ page });
			} else {
				console.log('CMP click skipped: page.$x is not available in this runtime');
			}
		} catch (cmpError: any) {
			console.log('CMP clicking failed (this is okay):', cmpError.message);
		}

		const pdf = await page.pdf({ printBackground: true });
		await page.close();

		await this.env.ARTICLE_CACHE.put(url, pdf, { expirationTtl: 60 * 60 * 24 * 3 });
		this.timer = 0;

		if ((await this.storage.getAlarm()) == null) {
			console.log(`setting new alarm`);
			await this.storage.setAlarm(Date.now() + 10 * 1000);
		}
	}
	async alarm() {
		this.timer += 10;
		if (this.timer < ALIVE_TIME) {
			console.log(`alive for ${this.timer} seconds, extending`);
			await this.storage.setAlarm(Date.now() + 10 * 1000);
		} else {
			console.log(`alive for ${this.timer} seconds, closing browser`);
			if (this.browser) {
				try {
					await this.browser.close();
					this.browser = null;
				} catch (error) {
					console.error('Error closing browser:', error);
				}
			}
		}
	}
}
