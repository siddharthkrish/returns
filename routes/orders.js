var express = require('express');
var router = express.Router();

const request = require('request-promise');

router.get('/', function(req, res, next) {
    console.log('getting order listing');

    getShopVars(req, function(vars) {
        var shop = vars.shop;
        var shopToken = vars.accessToken;
        setSessionVars(req.session, shopToken, shop);

        console.log('shop: ' + shop + ', token: ' + shopToken);
        orders(shopToken, shop, res);
    });    
});

router.get("/:orderId(\\d+)", function(req, res, next) {
    getShopVars(req, function(vars) {
        const shop = vars.shop;
        const accessToken = vars.accessToken;
        const url = 'https://' + shop + '/admin/orders/' + req.params.orderId + '.json'
        console.log('details for OrderId: ' + req.params.orderId);

        makeShopifyCall(url, accessToken, res, function(shopResponse) {
            res.status(200).json(JSON.parse(shopResponse));
        });
    });
});

function orders(accessToken, shop, res) {
    const shopRequestUrl = 'https://' + shop + '/admin/orders.json?' +
        'fields=created_at,id,billing_address,total-price,financial_status'; // only retreive these fields

    makeShopifyCall(shopRequestUrl, accessToken, res, function(shopResponse) {
        res.render('orders', {
            orderData: JSON.parse(shopResponse)
        })
    });
}

function makeShopifyCall(url, accessToken, res, cb) {
    const shopRequestHeaders = {
        'X-Shopify-Access-Token': accessToken,
    };

    console.log('making shopify call: ' + url);
    request.get(url, {
            headers: shopRequestHeaders
        })
        .then((shopResponse) => {
            console.log('response: ' + shopResponse);
            cb(shopResponse);
        })
        .catch((error) => {
            console.log(error.statusCode);
            console.log(error.error);
            res.status(500).send("something went wrong, check server logs");
        });
}

function getShopVars(req, cb) {
    var vars = {};

    if (req.query.shop !== null ) {
        vars.shop = req.query.shop;
    } else {
        vars.shop = req.session.shop;
    }

    if (req.query.token !== null ) {
        vars.accessToken = req.query.token;
    } else {
        vars.accessToken = req.session.accessToken;
    }
    cb(vars);
}

function setSessionVars(reqSession, token, shop) {
    reqSession.accessToken = token;
    reqSession.shop = shop;
}

module.exports = router;