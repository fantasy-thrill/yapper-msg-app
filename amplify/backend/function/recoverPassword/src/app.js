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
const mailer = require("nodemailer")

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
    serverEmail: "",
    serverEmailPassword: ""
  }

  const newClient = new SSMClient()

  const command = new GetParametersCommand({
    Names: [
      "/amplify/d12tjfcvziujwh/dev/AMPLIFY_createAccount_SERVER_EMAIL", 
      "/amplify/d12tjfcvziujwh/dev/AMPLIFY_createAccount_SERVER_EMAIL_PASSWORD"
    ],
    WithDecryption: true
  })

  try {
    const response = await newClient.send(command)
    console.log("Secrets retrieved successfully")
    secretsObj.serverEmail = response.Parameters[0].Value
    secretsObj.serverEmailPassword = response.Parameters[1].Value

  } catch (error) {
    console.error("Error retrieving secrets:", error)
  }
  
  return secretsObj
}

/****************************
* Example post method *
****************************/

app.post("/password-recovery", async function(req, res) {
  const { email } = req.body
  let userID;
  const secrets = await fetchSecrets()
  
  try {
    const params = {
      TableName: "Users",
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email
      }
    }

    const data = await dynamodb.scan(params).promise()
    const matchedUser = data.Items[0]
    if (matchedUser) userID = matchedUser.uid

    const recoveryStatus = {
      TableName: "PasswordResetRequests",
      Item: {
        code: "",
        requestedBy: userID,
        requestTime: new Date().getTime()
      }
    }

    const numbers = "1234567890"
    for (let i = 0; i < 12; i++) {
      recoveryStatus.Item.code += numbers.charAt(Math.floor(Math.random() * numbers.length))
    }

    const transporter = mailer.createTransport({
      service: "gmail",
      auth: {
        user: secrets.serverEmail,
        pass: secrets.serverEmailPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    const mailOptions = {
      from: secrets.serverEmail,
      to: email,
      subject: "Reset your password",
      html: `
      <h1>Password Recovery</h1>

      <p>
        Username: <b>${userID}</b>
        <br>
        Please click the following link to reset your password.
      </p>

      <a href="https://localhost:5173/reset-password/${userID}/${recoveryStatus.Item.code}">
        https://localhost:5173/reset-password/${userID}/${recoveryStatus.Item.code}
      </a>
    `,
    }

    const result = await dynamodb.put(recoveryStatus).promise()
    const info = await transporter.sendMail(mailOptions)
    console.log("E-mail sent: ", info.response)
    return res.status(200).json({ message: "E-mail sent to recover password", info: info.response })

  } catch (error) {
    console.error("Error sending e-mail: ", error)
    return res.status(500).json({ message: "Recovery e-mail was not sent.", error: error })
  }
})

app.put("/update-password/:userID", async function(req, res) {
  const { new_password } = req.body

  try {
    const userParams = {
      TableName: "Users",
      FilterExpression: "uid = :uid",
      ExpressionAttributeValues: {
        ":uid": req.params.userID
      }
    }

    const passwordParams = {
      TableName: "PasswordResetRequests",
      FilterExpression: "requestedBy = :uid",
      ExpressionAttributeValues: {
        ":uid": req.params.userID
      }
    }

    const data = await dynamodb.scan(userParams).promise()
    const matchedUser = data.Items[0]
    const newHashedPassword = await bcrypt.hash(new_password, 10)

    const requests = await dynamodb.scan(passwordParams).promise()
    const matchedRequest = requests.Items[0]

    const updateParams = {
      TableName: "Users",
      Key: { ID: matchedUser.ID },
      UpdateExpression: "SET password = :password",
      ExpressionAttributeValues: {
        ":password": newHashedPassword
      },
      ReturnValues: "UPDATED_NEW"
    }

    const deleteParams = {
      TableName: "PasswordResetRequests",
      Key: { code: matchedRequest.code }
    }

    const firstResult = await dynamodb.update(updateParams).promise()
    const secondResult = await dynamodb.delete(deleteParams).promise()
    console.log("User password successfully changed")
    return res.status(200).json({ message: "User password successfully changed", details: firstResult.Attributes })
    
  } catch (error) {
    console.log("User password could not be changed\n", error)
    return res.status(500).json({ message: "User password could not be changed", details: error })
  }
})

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app