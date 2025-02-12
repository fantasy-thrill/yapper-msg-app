const awsServerlessExpress = require('aws-serverless-express');
const app = require('./app');

/**
 * @type {import('http').Server}
 */
const server = awsServerlessExpress.createServer(app);

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event, context) => {
  console.log("EVENT:", JSON.stringify(event, null, 2));

  let requestBody;

  if (event.isBase64Encoded && event.headers["content-type"].includes("multipart/form-data")) {
      const buffer = Buffer.from(event.body, "base64");
      event.body = buffer; 
  }

  return awsServerlessExpress.proxy(server, event, context, "PROMISE").promise;
};
