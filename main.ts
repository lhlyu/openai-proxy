import { serve } from 'https://deno.land/std@0.184.0/http/server.ts'

const API_HOST = Deno.env.get('API_HOST')
const API_KEY = Deno.env.get('API_KEY')
const CODES = Deno.env.get('CODES') || ''

const cache_key = "Tauri-ChatGPT"
const cache_expire = 10 * 60 * 1000
const cache = new Map<string, { data: string, timestamp: number }>()

function getFromCache(key: string): string | null {
    const item = cache.get(key)
    if (item && Date.now() - item.timestamp < cache_expire) {
        return item.data
    }
    cache.delete(key)
    return null
}

function setToCache(key: string, data: string): void {
    cache.set(key, { data, timestamp: Date.now() })
}


// 获取最新版本json
const getLastVersionJson = async ():Promise<string> => {
    const response = await fetch('https://api.github.com/repos/lhlyu/tauri-chatgpt/releases/latest')

    if (!response.ok) {
        console.error(`getLastVersionJson: ${response.status}`)
        return '{}'
    }

    const data = await response.json()
    let lastJsonUrl = ''

    data.assets.map(value => {
        if (value.name === 'latest.json') {
            lastJsonUrl = value.browser_download_url
        }
    })

    const resp = await fetch(lastJsonUrl)
    if (!resp.ok) {
        console.error(`getLastVersionJson.lastJsonUrl: ${resp.status}`)
        return '{}'
    }
    return JSON.stringify(await resp.json(), null, '    ')
}

// 请求openai
const requestOpenai = async (url: URL, request: Request):Promise<Response> => {
    const code = request.headers.get('AUTH_CODE')

    if (API_HOST) {
        url.host = API_HOST
    }

    if (code && API_KEY && code.length >= 12) {
        console.log('CODES:', CODES)
        console.log('code:', code, !CODES.includes(code))
        if (!CODES.includes(code)) {
            const msg = {
                error: {
                    message: "Auth Code Illegal"
                }
            }
            return new Response(JSON.stringify(msg), {
                status: 401
            })
        }
        request.headers.set('Authorization', 'Bearer ' + API_KEY)
    }

    return await fetch(url, request)
}


const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, AUTH_CODE",
});

serve(async (request: Request) => {
    const url = new URL(request.url)
    console.log(request.url, request.method)
    if (request.method === 'OPTIONS') {
        return new Response('ok', {
            headers
        })
    }

    if (url.pathname === '/') {
        return new Response('一切安好~')
    }

    if (url.pathname === '/favicon.ico') {
        return new Response()
    }

    if (url.pathname === '/tauri-chatgpt/latest') {
        let lastVersion = getFromCache(cache_key)
        if (lastVersion) {
            return new Response(lastVersion)
        }
        lastVersion = await getLastVersionJson()
        setToCache(cache_key, lastVersion)
        return new Response(lastVersion)
    }

    return requestOpenai(url, request)
})

