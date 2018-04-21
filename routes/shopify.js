var express = require('express');
var router = express.Router();

const crypto = require('crypto');
const cookie = require('cookie');
const querystring = require('querystring');
const request = require('request-promise');
const nonce = require('nonce')();

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products,read_orders,write_orders';
const forwardingAddress = process.env.NGROK;

/* Shopify permissions */
router.get('/', function(req, res, next) {
    const shop = req.query.shop;
    if (shop) {
        const state = nonce();
        const redirectUri = forwardingAddress + '/shopify/callback';
        const installUrl = 'https://' + shop +
        '/admin/oauth/authorize?client_id=' + apiKey +
        '&scope=' + scopes +
        '&state=' + state +
        '&redirect_uri=' + redirectUri;

        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
});

/* Shopify callback */
router.get('/callback', function(req, res, next) {
    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;
  
    if (state !== stateCookie) {
      return res.status(403).send('Request origin cannot be verified');
    }
  
    if (shop && hmac && code) {
        // DONE: Validate request is from Shopify
        const map = Object.assign({}, req.query);
        delete map['signature'];
        delete map['hmac'];
        const message = querystring.stringify(map);
        const generatedHash = crypto
          .createHmac('sha256', apiSecret)
          .update(message)
          .digest('hex');
        
        if (generatedHash !== hmac) {
          return res.status(400).send('HMAC validation failed');
        }
        
        accessToken(shop, code, req, res);
    } else {
      res.status(400).send('Required parameters missing');
    }
});

function accessToken(shop, code, req, res) {
    const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
    const accessTokenPayload = {
        client_id: apiKey,
        client_secret: apiSecret,
        code,
        };

    request.post(accessTokenRequestUrl, { json: accessTokenPayload }).then((accessTokenResponse) => {
        const redirectUrl = '/orders?token=' + accessTokenResponse.access_token + '&shop=' + shop;

        storeInSession(req.session, accessTokenResponse.access_token, shop);
        console.log('redirecting to: ' + redirectUrl);
        res.redirect(307, redirectUrl);
    })
    .catch((error) => {
        res.status(error.statusCode).send(error.error);
    });
}

function storeInSession(reqSession, accessToken, shop) {
    console.log('storing session: token: ' + accessToken, ' for shop: ' + shop);
    
    reqSession.accessToken = accessToken;
    reqSession.shop = shop;
}

module.exports = router;
