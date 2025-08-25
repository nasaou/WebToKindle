import z from 'zod';
export { Workflow } from './workflow';
export { BrowserController } from './browser';

const Data = z.object({
	url: z.url(),
	email: z.email(),
});

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (new URL(request.url).pathname !== '/send' || request.method !== 'POST') {
			return new Response('invalid request', { status: 400 });
		}
		const { success, data, error } = Data.safeParse(await request.json());
		if (!success) {
			console.error(error);
			return new Response(error.issues[0].message, { status: 400 });
		}
		const { url, email } = data;

		try {
			const workflow = await env.WORKFLOW.create({ params: { url, email } });

			return Response.json({
				id: workflow.id,
				details: await workflow.status(),
			});
		} catch (error) {
			console.error('Workflow creation error:', error);
			return new Response(`Workflow error: ${error}`, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
