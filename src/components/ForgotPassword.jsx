import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"


function ForgotPassword() {
  const [userIDInput, setUserIDInput] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  const navigate = useNavigate()

  async function sendEmail(userID) {
    try {
      const response = await fetch(
        `https://ngraqslff8.execute-api.us-east-2.amazonaws.com/dev/data/users/${userID}`
      )
      const data = await response.json()
      const matchedUser = data.item

      if (matchedUser) {
        const response = await fetch(
          "https://ngraqslff8.execute-api.us-east-2.amazonaws.com/dev/password-recovery/",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: matchedUser.uid,
              email: matchedUser.email
            })
          }
        )

        if (response.status === 200) setEmailSent(true)
      }
    } catch (error) {
      console.error("Could not send e-mail:\n", error)
    }
  }
  
  function handleSubmit(event) {
    event.preventDefault()
    sendEmail(userIDInput)
  }

  return (
    <div className="account-cases" style={{ height: "75vh" }}>
      <div className="back-nav" onClick={() => navigate("/login")}>
        <FontAwesomeIcon icon={faArrowLeft} />
        <span style={{ marginLeft: "0.5em" }}>Back to login</span>
      </div>
      <div>
        <h2>Forgot your password?</h2>
        <p>Enter the username of your account below.</p>
        <div id="user-id-input-section">
          <input
            type="text"
            name="user_id"
            id="user-id-input"
            onChange={e => setUserIDInput(e.target.value)}
            required
          />
          <button type="submit" onClick={e => handleSubmit(e)}>
            Submit
          </button>
          {emailSent ? (
            <p>A link to reset your password has been sent to the e-mail associated with your account.</p>
          ) : ""}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword