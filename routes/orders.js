var express = require('express');
var router = express.Router();

const request = require('request-promise');

router.get('/', function(req, res, next) {
  const { shop, token } = req.query;
  orders(token, shop, res);
});

router.get("/:orderId(\\d+)", function(req, res, next) {
  res.status(200).send(req.params);
});

function orders(accessToken, shop, res) {
  const shopRequestUrl = 'https://' + shop + '/admin/orders.json';
  const shopRequestHeaders = {
    'X-Shopify-Access-Token': accessToken,
  };
  
  console.log(accessToken);
  request.get(shopRequestUrl, { headers: shopRequestHeaders })
  .then((shopResponse) => {
    res.render('orders', { orderData: JSON.parse(shopResponse) })
  })
  .catch((error) => {
    res.status(error.statusCode).send(error.error.error_description);
  });
}

module.exports = router;