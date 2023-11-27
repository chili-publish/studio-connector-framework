import { errorNoColor, info, warn } from "./logger";
import { LocalStorage } from "./localstorage";

// local user datastore backed store for access token
export class DataStore {
    static storage: LocalStorage = new LocalStorage();

    static get accessToken() : RegisteredAccessToken | null {
        return JSON.parse(DataStore.storage.getItem('access_token'));
    }
    static set accessToken(value : RegisteredAccessToken) {
        DataStore.storage.setItem('access_token', JSON.stringify(value));
    }
    static async isAuthenticated() {
        // if no access token, return false
        if (!DataStore.accessToken) {
            warn('No access token found.');
            return false;
        }

        const expiryDate = addSecondsToDate(DataStore.accessToken.createdAt, DataStore.accessToken.token.expires_in);
        // if access token is expired, return false
        if (!expiryDate || expiryDate < new Date()) {
            warn('Access token expired.');
            return false;
        }

        // try to get the user info
        var userInfo = await fetch(this.baseAuthUrl + '/userinfo', {
            headers: {
                Authorization: `Bearer ${DataStore.accessToken.token.access_token}`,
            },
        });

        // if user info fails, return false
        if (userInfo.status !== 200) {
            warn('Failed to get user info.');
            return false;
        }

        info('User is authenticated => ' + (await userInfo.json()).name);

        return true;
    }
    static baseAuthUrl = 'https://login.chiligrafx-dev.com/oauth';
    static clientId = 'jNa0TUPJNNT41w1afppqLHzBbTZAAv4s';
    static scope = 'openid profile';
    static audience = 'https://chiligrafx.com';
}

function addSecondsToDate(date : Date, seconds : Seconds) : Date | undefined {
    try {
        // ensure we have a date
        date = new Date(date);
        const result = new Date(date.setSeconds(date.getSeconds() + seconds));
        return result;
    }
    catch (error) {
        errorNoColor('Failed to add seconds to date: ' + error);
        return undefined;
    }
}

export type RegisteredAccessToken = {
    token: AccessToken,
    createdAt: Date,
};

export type AccessToken = {
    access_token: string,
    id_token: string,
    scope: string,
    expires_in: Seconds,
    token_type: 'Bearer'
};

export type Seconds = number;