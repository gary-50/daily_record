const { google } = require('googleapis');
const { BrowserWindow } = require('electron');
const path = require('path');

class GoogleAuth {
    constructor() {
        this.oauth2Client = null;
        this.isAuthenticated = false;
        this.userInfo = null;
    }

    initialize(clientId, clientSecret, redirectUri = 'http://localhost') {
        // 从环境变量或参数获取凭据
        const finalClientId = clientId || process.env.GOOGLE_CLIENT_ID;
        const finalClientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET;

        if (!finalClientId || !finalClientSecret) {
            throw new Error('Google OAuth 凭据未配置。请在 .env 文件中设置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET');
        }

        this.oauth2Client = new google.auth.OAuth2(
            finalClientId,
            finalClientSecret,
            redirectUri
        );
    }

    async authenticate() {
        return new Promise((resolve, reject) => {
            const authUrl = this.oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'https://www.googleapis.com/auth/drive.appdata',
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/userinfo.profile'
                ],
                prompt: 'consent'
            });

            const authWindow = new BrowserWindow({
                width: 600,
                height: 700,
                show: true,
                modal: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            authWindow.loadURL(authUrl);

            const handleCallback = async (url) => {
                try {
                    const urlParams = new URL(url);
                    const code = urlParams.searchParams.get('code');
                    const error = urlParams.searchParams.get('error');

                    if (error) {
                        reject(new Error(`认证失败: ${error}`));
                        authWindow.close();
                        return;
                    }

                    if (code) {
                        try {
                            const { tokens } = await this.oauth2Client.getToken(code);
                            this.oauth2Client.setCredentials(tokens);
                            this.isAuthenticated = true;
                            
                            await this.getUserInfo();
                            
                            authWindow.close();
                            resolve({
                                success: true,
                                tokens,
                                userInfo: this.userInfo
                            });
                        } catch (err) {
                            console.error('Token交换失败:', err.message);
                            reject(err);
                            authWindow.close();
                        }
                    }
                } catch (parseError) {
                    console.error('URL解析失败:', parseError);
                }
            };

            // 监听导航事件
            authWindow.webContents.on('will-navigate', (event, url) => {
                if (url.startsWith('http://localhost')) {
                    event.preventDefault();
                    handleCallback(url);
                }
            });

            authWindow.webContents.on('will-redirect', (event, url) => {
                if (url.startsWith('http://localhost')) {
                    event.preventDefault();
                    handleCallback(url);
                }
            });

            authWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
                if (newUrl.startsWith('http://localhost')) {
                    handleCallback(newUrl);
                }
            });

            // 监听所有导航尝试（最关键的事件，用于捕获localhost重定向）
            authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
                if (validatedURL.startsWith('http://localhost')) {
                    handleCallback(validatedURL);
                }
            });

            authWindow.on('closed', () => {
                if (!this.isAuthenticated) {
                    reject(new Error('用户关闭了认证窗口'));
                }
            });
        });
    }

    async getUserInfo() {
        try {
            const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
            const { data } = await oauth2.userinfo.get();
            this.userInfo = {
                id: data.id,
                email: data.email,
                name: data.name,
                picture: data.picture
            };
            return this.userInfo;
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return null;
        }
    }

    setCredentials(tokens) {
        if (this.oauth2Client) {
            this.oauth2Client.setCredentials(tokens);
            this.isAuthenticated = true;
        }
    }

    async refreshAccessToken() {
        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);
            return credentials;
        } catch (error) {
            console.error('刷新 Token 失败:', error);
            this.isAuthenticated = false;
            throw error;
        }
    }

    getClient() {
        return this.oauth2Client;
    }

    getTokens() {
        return this.oauth2Client.credentials;
    }

    logout() {
        this.oauth2Client = null;
        this.isAuthenticated = false;
        this.userInfo = null;
    }

    isTokenExpired() {
        const tokens = this.oauth2Client?.credentials;
        if (!tokens || !tokens.expiry_date) {
            return true;
        }
        return Date.now() >= tokens.expiry_date;
    }

    async ensureValidToken() {
        if (this.isTokenExpired()) {
            await this.refreshAccessToken();
        }
    }
}

module.exports = GoogleAuth;
