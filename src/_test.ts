import axios from 'axios';
import * as oauth from './oauth'
import api from 'vihapi/Api';

const server = api(
    oauth.generateOauthHandlers({
        vk: {
            client_id: '51767664',
            client_secret: 'voLuEm6Z9QaHtJqBVmVl',
            redirect_uri: 'http://auth.localhost:8081/vk',
            oauth2_provider_url: 'https://oauth.vk.com',
            authByIdCallback: async (req, res, tokenData) => {
                console.log(tokenData.access_token);
                const id = (await axios.post('https://api.vk.com/method/users.get?v=5.131', '', {
                    headers: {
                        'Authorization': 'Bearer ' + tokenData.access_token
                    }
                }).catch(()=>{throw 'смерть'})).data.response;
                console.log(id);
                res.end(JSON.stringify(id[0].id));
            },
            handleErrorCallback: async (req, res, error) => {
                console.log(error);
                res.write('' + error);
            }
        }
    })
)
server.listen(8081)