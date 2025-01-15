/*
Use the following code to retrieve configured secrets from SSM:

;

const { Parameters } = new aws.SSM()
  .getParameters({
    Names: ["CONNECTION_STRING","DB_NAME","DB_USER_COLLECTION"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/



const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const { MongoClient } = require("mongodb")
const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm")
// const cors = require("cors")
// const aws = require('aws-sdk')
require("dotenv").config()

const newClient = new SSMClient();

const command = new GetParametersCommand({
  Names: ["CONNECTION_STRING", "DB_NAME", "DB_USER_COLLECTION"].map(
    (secretName) => process.env[secretName]
  ),
  WithDecryption: true,
});

let mongoURI = ""
let dbName = ""
let db;

newClient
  .send(command)
  .then(response => {
    console.log("Secrets retrieved successfully:", response.InvalidParameters)
    mongoURI = response.InvalidParameters[0]
    dbName = response.InvalidParameters[1]

    const client = new MongoClient(mongoURI)
    client.connect()
    console.log("Connected to MongoDB Atlas")
    db = client.db(dbName)
  })
  .catch(error => {
    console.error("Error retrieving secrets:", error)
  })

console.log(mongoURI)

// declare a new express app
const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())
// app.use(cors())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
});

/**********************
 * Example get method *
 **********************/

app.get('/data/:col', function(req, res) {
  const collections = {
    "users": process.env.DB_USER_COLLECTION,
    "test": process.env.DB_TEST_COLLECTION,
    "password-resets": process.env.PASSWORD_RESETS
  }

  try {
    let collectionName;
    for (const param in collections) {
      if (req.params.col === param) collectionName = collections[param]
    }

    const result = db
      .collection(collectionName)
      .find()
      .toArray()
    
    res.json(result)
    res.json({ success: 'get call succeed!', url: req.url })

  } catch (error) {
    console.error("Error executing query: ", error)
    res.status(500).json({ error: "Internal server error" })
  }
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
