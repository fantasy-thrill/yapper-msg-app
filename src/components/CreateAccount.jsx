import React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import chat from "../chatdata"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft, faCheck, faXmark } from "@fortawesome/free-solid-svg-icons"

function CreateAccount() {
  const [usernameInput, setUsernameInput] = useState("")
  const [fullName, setFullName] = useState("")
  const [passwordInput, setPassowrdInput] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const navigate = useNavigate()
  
  const expressions = {
    username: "^[a-zA-Z0-9_.-]{8,}$",
    password: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}",
    validation: function(param, str) {
      if (param === "username") {
        return new RegExp(this.username).test(str)
      } else {
        return new RegExp(this.password).test(str)
      }
    }
  }

  async function submitAccountCreation(event) {
    event.preventDefault()
    try {
      const formData = new FormData(event.target)
      console.log(formData)
      const response = await fetch("https://fe4yhu7nf6.execute-api.us-east-2.amazonaws.com/dev/create-account", { 
        method: "POST",
        body: formData
      })
      
      const result = await response.json()
      if (result) {
        console.log(result)
        const { name, user_id } = result
        chat.createNewUser(name, user_id)
        setSubmitted(true)
      }
    } catch (error) {
      console.error(`Server error: "${error}"`)
    }
  }

  return (
    <div className="account-cases" style={{ height: "100vh" }}>
      <div className="back-nav" onClick={() => navigate("/login")}>
        <FontAwesomeIcon icon={faArrowLeft} />
        <span style={{ marginLeft: "0.5em" }}>Back to login</span>
      </div>
      {submitted ? (
        <h1 style={{ textAlign: "center" }}>
          You have successfully created your account! Click the link above to
          log in.
        </h1>
      ) : (
        <div>
          <h2 style={{ textAlign: "center" }}>Sign up for Yapper</h2>
          <form onSubmit={submitAccountCreation}>
            <div id="creation-form">
              <label htmlFor="name">Full display name: </label>
              <input
                type="text"
                name="name"
                id="name"
                minLength={4}
                maxLength={40}
                onChange={e => setFullName(e.target.value)}
                required
              />

              <label htmlFor="user-id">User ID: </label>
              <input
                type="text"
                name="user_id"
                id="user-id"
                pattern={expressions.username}
                onChange={e => setUsernameInput(e.target.value)}
                minLength={8}
                maxLength={30}
                required
              />

              <label htmlFor="email">E-mail: </label>
              <input type="email" name="email" id="email" />

              <label htmlFor="set-profile-pic">Profile picture: </label>
              <input
                type="file"
                name="profile_pic"
                id="set-profile-pic"
                accept="image/*,.jpg,.jpeg,.png"
              />

              <label htmlFor="create-password">Password: </label>
              <input
                type="password"
                name="password"
                id="create-password"
                minLength={8}
                pattern={expressions.password}
                onChange={e => setPassowrdInput(e.target.value)}
                required
              />
            </div>
            <div style={{ margin: "1.25em 0" }}>
              <p
                className="validation"
                style={{
                  color: fullName && !/[^a-zA-Z' ]/.test(fullName)
                    ? "#16912a"
                    : "#e31414",
                }}>
                <FontAwesomeIcon
                  icon={
                    fullName && !/[^a-zA-Z' ]/.test(fullName)
                      ? faCheck
                      : faXmark
                  }
                  style={{ marginRight: "1em" }}
                />
                Full screen name must contain only letters. No numbers or special characters, besides an apostrophe.
              </p>
              <p
                className="validation"
                style={{
                  color: expressions.validation("username", usernameInput)
                    ? "#16912a"
                    : "#e31414",
                }}>
                <FontAwesomeIcon
                  icon={
                    expressions.validation("username", usernameInput)
                      ? faCheck
                      : faXmark
                  }
                  style={{ marginRight: "1em" }}
                />
                Username must be at least 8 characters long and cannot contain
                any spaces or special characters other than dashes, periods, and
                underscores.
              </p>
              <p
                className="validation"
                style={{
                  color: expressions.validation("password", passwordInput)
                    ? "#16912a"
                    : "#e31414",
                }}>
                <FontAwesomeIcon
                  icon={
                    expressions.validation("password", passwordInput)
                      ? faCheck
                      : faXmark
                  }
                  style={{ marginRight: "1em" }}
                />
                Password must be at least 8 characters long and contain at least
                one number and one special character.
              </p>
            </div>

            <button type="submit" disabled={!fullName || !usernameInput || !passwordInput}>
              Create account
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default CreateAccount
