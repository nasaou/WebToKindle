import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import send from './email';

type Payload = {
	url: string;
	email: string;
};

export class Workflow extends WorkflowEntrypoint<Env, Params> {
	async run(event: WorkflowEvent<Payload>, step: WorkflowStep) {
		const { url, email } = event.payload;

		const isArticleCached = await step.do('check for article in cache', async () => {
			console.log('Checking cache for URL:', url);
			const cache = await this.env.ARTICLE_CACHE.list({ prefix: url });
			console.log('Cache result:', cache.keys.length, 'keys found');
			if (cache.keys.length > 0) return true;
			return false;
		});

		console.log('Article cached?', isArticleCached);

		if (!isArticleCached) {
			console.log('Article not cached, starting PDF generation...');
			await step.do('render article and cache', async () => {
				const id = this.env.BROWSER_CONTROLLER.idFromName('rendering_browser');
				const obj = this.env.BROWSER_CONTROLLER.get(id);
				console.log('Calling renderAndCache on browser controller...');
				try {
					await obj.renderAndCache(url);
					console.log('PDF generation completed');
				} finally {
					// Dispose the stub to avoid RPC warnings
					if (typeof (obj as any).dispose === 'function') {
						(obj as any).dispose();
					}
				}
			});
		} else {
			console.log('Article already cached, skipping	 PDF generation');
		}

		const emailStatus = await step.do('send article to user', async () => {
			const article = await this.env.ARTICLE_CACHE.get(url, { type: 'arrayBuffer' });
			console.log(`Article for ${url} would be sent to ${email}`);
			return await send(this.env, email, article!, url);
		});

		return { success: true, message: 'Article processed successfully' };
	}
}
