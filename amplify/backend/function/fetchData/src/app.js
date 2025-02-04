/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/


const express = require("express")
const bodyParser = require("body-parser")
const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware")
// const cors = require("cors")
const aws = require("aws-sdk")

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

const dynamodb = new aws.DynamoDB.DocumentClient()


/**********************
 * Example get method *
 **********************/

app.get("/data/:col", async function(req, res) {
  let tables = {
    "users": "Users",
    "test-users": "TestUsers",
    "password-reset": "PasswordResetRequests"
  }

  const params = {
    TableName: ""
  }

  for (const tableName in tables) {
    if (req.params.col === tableName) params.TableName = tables[tableName]
  }

  try {
    const data = await dynamodb.scan(params).promise()

    console.log("Data retrieved successfully!\n", data.Items)
    res.status(200).json({
      statusCode: 200,
      body: JSON.stringify({
        message: "Items fetched successfully",
        items: data.Items
      })
    })

  } catch (error) {
    console.error("Error fetching data: ", error)
    res.status(500).json({ error: "Internal server error" })
  }
});

app.listen(3000, function () {
  console.log("App started")
})

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
