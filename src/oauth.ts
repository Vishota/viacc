import { ServerResponse } from 'http'
import axios from 'axios';
import { IncomingMessage } from 'http';
const url = require('url');

type Handler<Req, Res> = (req: Req, res: Res) => Promise<string | false> | string | false;

function objectToUrlParams(obj: Record<string, any>): string {
    const params = new URLSearchParams();

    for (const key in obj) {
        const value = obj[key];
        if (value !== undefined) {
            if (Array.isArray(value)) {
                value.forEach((item) => params.append(key, item));
            } else {
                params.append(key, value);
            }
        }
    }

    return params.toString();
}

type OauthId = string | false;

export function createOAuthHandler<
    Req extends IncomingMessage,
    Res extends ServerResponse
>(
    description: {
        client_id: string,
        client_secret: string,
        redirect_uri: string,
        oauth2_provider_url: string,
        onokay?: (req: Req, res: Res, tokenData: any) => Promise<OauthId> | OauthId,
        onfail?: (req: Req, res: Res, error: Error) => Promise<OauthId> | OauthId
    }
): Handler<Req, Res> {
    // default onfail just returns "false"
    description = {
        onfail: () => false,
        ...description
    }

    return async (req: Req, res: Res) => {
        const queryData = url.parse(req.url, true).query;

        if (queryData.code) {
            const authCode = queryData.code;

            const tokenRequestData = {
                code: authCode,
                client_id: description.client_id,
                client_secret: description.client_secret,
                redirect_uri: description.redirect_uri,
                grant_type: 'authorization_code',
            };


            try {
                const response = await axios.post(`${description.oauth2_provider_url}/access_token?${objectToUrlParams(tokenRequestData)}`, tokenRequestData)
                const tokenData = response.data;
                if (description.onokay) return description.onokay(req, res, tokenData);
            } catch (e) {
                if (description.onfail) return description.onfail(req, res, e as Error);
                const authUrl = `${description.oauth2_provider_url}/authorize?client_id=${description.client_id}&redirect_uri=${description.redirect_uri}&response_type=code&scope=scope1 scope2`;
                res.writeHead(302, { 'Location': authUrl });
                throw e;
            }
        } else {
            const authUrl = `${description.oauth2_provider_url}/authorize?client_id=${description.client_id}&redirect_uri=${description.redirect_uri}&response_type=code&scope=scope1 scope2`;
            res.writeHead(302, { 'Location': authUrl });
            res.end();
        }
        return false
    };
}

export function generateOauthHandlers<
    Req extends IncomingMessage,
    Res extends ServerResponse,
    const T extends {
        [title: string]: Parameters<typeof createOAuthHandler<Req, Res>>[0]
    } = {
        [title: string]: Parameters<typeof createOAuthHandler<Req, Res>>[0]
    }
>(
    description: T
): {
        [K in keyof typeof description]: Handler<
            Req,
            Res
        >
    } {
    return 0 as any;
}

// generateOauthHandlers({
//     'a': {
//         'client_id': '',
//         'client_secret': '',
//         'oauth2_provider_url': '',
//         onokay: () => 'id',
//         'redirect_uri': ''
//     }
// })