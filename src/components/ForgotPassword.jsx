import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"


function ForgotPassword() {
  const [emailInput, setEmailInput] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  const navigate = useNavigate()

  async function sendEmail(address) {
    try {
      const response = await fetch("https://fe4yhu7nf6.execute-api.us-east-2.amazonaws.com/dev/data/users")
      const data = await response.json()
      if (data) {
        const matchedUser = data.find(user => user.email === address)

        if (matchedUser) {
          const response = await fetch(
            "https://fe4yhu7nf6.execute-api.us-east-2.amazonaws.com/dev/password-recovery",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: address
              })
            }
          )

          if (response.status === 200) setEmailSent(true)
        }
      }
      
    } catch (error) {
      console.error("Could not send e-mail: \n", error)
    }
  }
  
  function handleSubmit(event) {
    event.preventDefault()
    sendEmail(emailInput)
  }

  return (
    <div className="account-cases" style={{ height: "75vh" }}>
      <div className="back-nav" onClick={() => navigate("/login")}>
        <FontAwesomeIcon icon={faArrowLeft} />
        <span style={{ marginLeft: "0.5em" }}>Back to login</span>
      </div>
      <div>
        <h2>Forgot your password?</h2>
        <p>Enter the e-mail address associated with your account below.</p>
        <div id="email-input">
          <input
            type="email"
            name="email"
            id="email-input"
            onChange={e => setEmailInput(e.target.value)}
            required
          />
          <button type="submit" onClick={e => handleSubmit(e)}>
            Submit
          </button>
          {emailSent ? (
            <p>A link to reset your password has been sent to your e-mail.</p>
          ) : ""}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword