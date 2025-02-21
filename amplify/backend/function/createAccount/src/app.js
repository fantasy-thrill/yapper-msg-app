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

const dynamodb = new aws.DynamoDB.DocumentClient()
const s3 = new S3Client()

async function getItemCount() {
  const countRequest = {
    TableName: "Users",
    Select: "COUNT"
  }

  try {
    const data = await dynamodb.scan(countRequest).promise()
    console.log("Total number of users:", data.Count)
    return data.Count

  } catch (error) {
    console.error("Error fetching count:", error)
  }
}

const storage = multer.memoryStorage()

const upload = multer({ 
  storage: storage
})


/****************************
* Example post method *
****************************/

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
      const totalUsers = await getItemCount()
  
      const newUser = {
        TableName: "Users",
        Item: {
          name: name,
          ID: totalUsers + 1,
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
            Dear ${name} (${user_id}),
        
            Welcome to Yapper! We're thrilled to have you join our community.
        
            As a new member, you now have access to a world of possibilities for connecting with friends, family, and colleagues. Whether you're looking to stay in touch with loved ones, collaborate with teammates, or meet new people, Yapper is here to make communication easy and enjoyable for you.
        
            We're committed to providing you with the best messaging experience possible, and we're continuously working to improve and enhance our app based on your feedback.
        
            If you have any questions, feedback, or suggestions, please don't hesitate to reach out to us. We're here to help and ensure that your experience with Yapper is seamless and enjoyable.
        
            Once again, welcome to Yapper! We look forward to helping you stay connected with the people who matter most to you.
        
            Best regards,
            <b>Yapper Support Team</b>
          </p>
        </div>
        `
      }
  
      await dynamodb.put(newUser).promise()
      const info = await transporter.sendMail(mailOptions)
      console.log("User account created successfully!\nEmail sent:", info.response)
      res.status(200).json({ 
        message: "User account created successfully!",
        user: newUser.Item 
      })
    
    } catch (error) {
      res.status(400).json({ message: "No account created" })
      console.log("No account created:", error)
    }
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
