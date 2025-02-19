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
const aws = require("aws-sdk")
const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm")
const bcrypt = require("bcryptjs")

// declare a new express app
const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
})

const dynamodb = new aws.DynamoDB.DocumentClient()

async function fetchSecrets() {
  let secretsObj = {
    appID: "",
    apiKey: ""
  }

  const newClient = new SSMClient()
  
  const command = new GetParametersCommand({
    Names: [
      "/amplify/d12tjfcvziujwh/dev/AMPLIFY_userLogin_APP_ID", 
      "/amplify/d12tjfcvziujwh/dev/AMPLIFY_userLogin_API_KEY"
    ],
    WithDecryption: true
  })

  try {
    const response = await newClient.send(command)
    console.log("Secrets retrieved successfully")
    secretsObj.appID = response.Parameters[1].Value
    secretsObj.apiKey = response.Parameters[0].Value

  } catch (error) {
    console.error("Error retrieving secrets:", error)
  }
  
  return secretsObj
}

async function generateAuthToken(userID, appID, apiKey) {
  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      apikey: apiKey
    }
  }

  try {
    const response = await fetch(
      `https://${appID}.api-us.cometchat.io/v3/users/${userID}/auth_tokens`, 
      options
    )
    const result = await response.json()
    if (result) return result.data.authToken 

  } catch (error) {
    console.error("Could not generate token:", error)
    return null
  }
}

/****************************
* Example post method *
****************************/

app.post("/login", async function(req, res) {
  try {
    const { user_id, password } = req.body
    const secrets = await fetchSecrets()

    const params = {
      TableName: "Users",
      FilterExpression: "uid = :uid",
      ExpressionAttributeValues: {
        ":uid": user_id
      }
    }

    const data = await dynamodb.scan(params).promise()
    const matchedUser = data.Items[0]
    if (!matchedUser) return res.status(401).json({ error: "User not found" })

    const passwordMatch = await bcrypt.compare(password, matchedUser.password)
    if (passwordMatch) {
      if (!matchedUser.authToken) {
        const newToken = await generateAuthToken(matchedUser.uid, secrets.appID, secrets.apiKey)
        const params = {
          TableName: "Users",
          Key: { ID: matchedUser.ID },
          UpdateExpression: `SET authToken = :token`,
          ExpressionAttributeValues: {
            ":token": newToken
          },
          ReturnValues: "UPDATED_NEW"
        }
  
        await dynamodb.update(params).promise()
        return res.status(200).json({ ...matchedUser, authToken: newToken })
      }
      return res.status(200).json({ message: "Login successful", user: matchedUser })
    } else {
      return res.status(401).json({ error: "Invalid password" })
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Internal server error" })
  }
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
