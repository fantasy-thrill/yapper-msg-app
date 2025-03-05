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
const aws = require("aws-sdk")
const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm")
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
const bcrypt = require("bcryptjs")
const multer = require("multer")
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
});


async function fetchSecrets() {
  let secretsObj = {
    appID: "",
    apiKey: "",
    serverEmail: "",
    serverEmailPassword: ""
  }

  const newClient = new SSMClient()

  const command = new GetParametersCommand({
    Names: [
      "/amplify/d12tjfcvziujwh/dev/AMPLIFY_userLogin_APP_ID", 
      "/amplify/d12tjfcvziujwh/dev/AMPLIFY_userLogin_API_KEY",
      "/amplify/d12tjfcvziujwh/dev/AMPLIFY_createAccount_SERVER_EMAIL", 
      "/amplify/d12tjfcvziujwh/dev/AMPLIFY_createAccount_SERVER_EMAIL_PASSWORD"
    ],
    WithDecryption: true
  })

  try {
    const response = await newClient.send(command)
    console.log("Secrets retrieved successfully")
    secretsObj.apiKey = response.Parameters[2].Value
    secretsObj.appID = response.Parameters[3].Value
    secretsObj.serverEmail = response.Parameters[0].Value
    secretsObj.serverEmailPassword = response.Parameters[1].Value

  } catch (error) {
    console.error("Error retrieving secrets:", error)
  }
  
  return secretsObj
}


const dynamodb = new aws.DynamoDB.DocumentClient()
const s3 = new S3Client()


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


const storage = multer.memoryStorage()

const upload = multer({ 
  storage: storage
})


app.post("/create-account", upload.single("profile_pic"), async function(req, res) {
  const secretValues = await fetchSecrets()

  const transporter = mailer.createTransport({
    service: "gmail",
    auth: {
      user: secretValues.serverEmail,
      pass: secretValues.serverEmailPassword
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  try {
      const { name, user_id, email, password } = req.body
      const hashedPassword = await bcrypt.hash(password, 10)
  
      const newUser = {
        TableName: "Users",
        Item: {
          name: name,
          uid: user_id,
          email: email,
          profilePic: "",
          password: hashedPassword
        }
      }

      const uploadParams = {
        Bucket: "amplify-yappermsgapp-dev-5071b-deployment",
        Key: `user_uploads/${Date.now()}_${req.file.originalname}`,
        Body: req.file.buffer, 
        ContentType: req.file.mimetype,
        ACL: "public-read"
      }

      const command = new PutObjectCommand(uploadParams);
      await s3.send(command)
      newUser.Item.profilePic = `https://${uploadParams.Bucket}.s3.us-east-2.amazonaws.com/${uploadParams.Key}`
  
      const mailOptions = {
        from: secretValues.serverEmail,
        to: email,
        subject: "Account creation successful",
        html: `
        <div style="font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; margin-left: 2.5em; max-width: 1000px">
          <h1>Welcome to Yapper!</h1>
        
          <p style="white-space: pre-wrap">
            Dear ${name} (${user_id}),\n\n
        
            Welcome to Yapper! We're thrilled to have you join our community.\n\n
        
            As a new member, you now have access to a world of possibilities for connecting with friends, family, and colleagues. Whether you're looking to stay in touch with loved ones, collaborate with teammates, or meet new people, Yapper is here to make communication easy and enjoyable for you.\n\n
        
            We're committed to providing you with the best messaging experience possible, and we're continuously working to improve and enhance our app based on your feedback.\n\n
        
            If you have any questions, feedback, or suggestions, please don't hesitate to reach out to us. We're here to help and ensure that your experience with Yapper is seamless and enjoyable.\n\n
        
            Once again, welcome to Yapper! We look forward to helping you stay connected with the people who matter most to you.\n\n
        
            Best regards,\n
            <b>Yapper Support Team</b>
          </p>
        </div>
        `
      }
  
      await dynamodb.put(newUser).promise()
      const info = await transporter.sendMail(mailOptions)
      console.log("User account created successfully!\nEmail sent:", info.response)
      return res.status(200).json({ 
        message: "User account created successfully!",
        user: newUser.Item 
      })
    
    } catch (error) {
      console.log("No account created:", error)
      return res.status(400).json({ message: "No account created" })
    }
})


app.post("/login", async function(req, res) {
  try {
    const { user_id, password } = req.body
    const secrets = await fetchSecrets()

    const params = {
      TableName: "Users",
      Key: {
        uid: user_id
      }
    }

    const data = await dynamodb.get(params).promise()
    const matchedUser = data.Item
    if (!matchedUser) return res.status(401).json({ error: "User not found" })

    const passwordMatch = await bcrypt.compare(password, matchedUser.password)
    if (passwordMatch) {
      if (!matchedUser.authToken) {
        const newToken = await generateAuthToken(matchedUser.uid, secrets.appID, secrets.apiKey)
        const params = {
          TableName: "Users",
          Key: { uid: matchedUser.uid },
          UpdateExpression: `SET authToken = :token`,
          ExpressionAttributeValues: {
            ":token": newToken
          },
          ReturnValues: "UPDATED_NEW"
        }
  
        await dynamodb.update(params).promise()
        return res.status(200).json({ message: "Login successful", user: { ...matchedUser, authToken: newToken } })
      }
      return res.status(200).json({ message: "Login successful", user: matchedUser })
    } else {
      return res.status(401).json({ error: "Invalid password" })
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Internal server error" })
  }
})


app.post("/password-recovery", async function(req, res) {
  const { user_id, email } = req.body
  const secrets = await fetchSecrets()
  
  try {
    const recoveryStatus = {
      TableName: "PasswordResetRequests",
      Item: {
        code: "",
        requestedBy: user_id,
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
        rejectUnauthorized: false
      }
    })

    const mailOptions = {
      from: secrets.serverEmail,
      to: email,
      subject: "Reset your password",
      html: `
      <h1>Password Recovery</h1>

      <p>
        Username: <b>${user_id}</b>
        <br>
        Please click the following link to reset your password.
      </p>

      <a href="https://localhost:5173/reset-password/${user_id}/${recoveryStatus.Item.code}">
        https://localhost:5173/reset-password/${user_id}/${recoveryStatus.Item.code}
      </a>
    `
    }

    await dynamodb.put(recoveryStatus).promise()
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
      Key: {
        uid: req.params.userID
      }
    }

    const passwordParams = {
      TableName: "PasswordResetRequests",
      FilterExpression: "requestedBy = :uid",
      ExpressionAttributeValues: {
        ":uid": req.params.userID
      }
    }

    const data = await dynamodb.get(userParams).promise()
    const matchedUser = data.Item
    const newHashedPassword = await bcrypt.hash(new_password, 10)

    const requests = await dynamodb.scan(passwordParams).promise()
    const matchedRequest = requests.Items[0]

    const updateParams = {
      TableName: "Users",
      Key: { uid: matchedUser.uid },
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
    await dynamodb.delete(deleteParams).promise()
    console.log("User password successfully changed")
    return res.status(200).json({ 
      message: "User password successfully changed", 
      details: firstResult.Attributes 
    })
    
  } catch (error) {
    console.log("User password could not be changed\n", error)
    return res.status(500).json({ message: "User password could not be changed", details: error })
  }
})


app.get("/data/:table/:key", async function(req, res) {
  let tables = {
    "users": "Users",
    "test-users": "TestUsers",
    "password-reset": "PasswordResetRequests"
  }

  const enteredKey = req.params.table === "password-reset" ? {
    code: req.params.key
  } : {
    uid: req.params.key
  }

  const params = {
    TableName: "",
    Key: enteredKey
  }

  for (const tableName in tables) {
    if (req.params.table === tableName) params.TableName = tables[tableName]
  }

  try {
    const data = await dynamodb.get(params).promise()
    if (!data.Item) return res.status(400).json({ error: "User not found" })

    console.log("User data retrieved successfully!\n", data.Item)
    return res.status(200).json({
      statusCode: 200,
      message: "Item fetched successfully",
      item: data.Item
    })

  } catch (error) {
    console.error("Error fetching data: ", error)
    res.status(500).json({ error: "Internal server error" })
  }
})


app.listen(3000, function() {
  console.log("App started")
})

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
