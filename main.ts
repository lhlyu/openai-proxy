import { serve } from 'https://deno.land/std@0.184.0/http/server.ts';

const API_HOST = Deno.env.get('API_HOST')
const API_KEY = Deno.env.get('API_KEY')
const CODES = Deno.env.get('CODES') || ''

serve(async (request: Request) => {
    const url = new URL(request.url);

    if (url.pathname === '/') {
        return new Response('一切安好~')
    }

    const code = request.headers.get('AUTH_CODE')

    if (API_HOST) {
        url.host = API_HOST
    }

    if (code && API_KEY && code.length >= 12) {
        if (!CODES.includes(code)) {
            return new Response('auth code illegal', {
                status: 401
            })
        }
        request.headers.set('Authorization', 'Bearer ' + API_KEY)
    }

    return await fetch(url, request);
});