import { BasicVihapiHandler, VihapiHandler } from "vihapi/Api";

import * as http from 'http';
import { ServerResponse } from 'http'
import axios from 'axios';
import { IncomingMessage } from 'http';
const url = require('url');

function objectToUrlParams(obj: Record<string, any>): string {
    const params = new URLSearchParams();

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach((item) => params.append(key, item));
                } else {
                    params.append(key, value);
                }
            }
        }
    }

    return params.toString();
}

export function createOAuthHandler(
    description: {
        client_id: string,
        client_secret: string,
        redirect_uri: string,
        oauth2_provider_url: string,
        onokay?: (req: IncomingMessage, res: http.ServerResponse<http.IncomingMessage>, tokenData: any) => any,
        onfail?: (req: IncomingMessage, res: http.ServerResponse<http.IncomingMessage>, error: Error) => any
    }
): VihapiHandler['handler'] {
    return async (req: IncomingMessage, res: ServerResponse) => {
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
                try {
                    const response = await axios.post(`${description.oauth2_provider_url}/access_token?${objectToUrlParams(tokenRequestData)}`, tokenRequestData)
                    const tokenData = response.data;
                    if (description.onokay) await description.onokay(req, res, tokenData);
                } catch (e) {
                    if (description.onfail) await description.onfail(req, res, e as Error);
                }
            } catch (e) {
                console.warn('onfail callback exception', e);
            }
    } else {
        const authUrl = `${description.oauth2_provider_url}/authorize?client_id=${description.client_id}&redirect_uri=${description.redirect_uri}&response_type=code&scope=scope1 scope2`;
        res.writeHead(302, { 'Location': authUrl });
        res.end();
    }
};
}

type OAuthHandlerDescription = {
    client_id: string,
    client_secret: string,
    redirect_uri: string,
    oauth2_provider_url: string,
    authByIdCallback: (req: IncomingMessage, res: ServerResponse, tokenData: any) => any,
    handleErrorCallback: (req: IncomingMessage, res: ServerResponse, error: Error) => any
}

export function generateOauthHandlers<T extends Record<string, OAuthHandlerDescription>>(descriptions: T):
    Record<keyof typeof descriptions, BasicVihapiHandler> {
    let handlers: { [url: string]: VihapiHandler } = {};
    Object.entries(descriptions).forEach(([title, description]) => {
        handlers[title] = {
            handler: createOAuthHandler({
                client_id: description.client_id,
                client_secret: description.client_secret,
                redirect_uri: description.redirect_uri,
                oauth2_provider_url: description.oauth2_provider_url,
                onokay: description.authByIdCallback,
                onfail: description.handleErrorCallback
            })
        }
    });
    return handlers as any
}
