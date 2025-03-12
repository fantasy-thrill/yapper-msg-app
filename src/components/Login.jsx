import React from "react"
import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import chat from "../chatdata"
import logo from "../logo.svg"
import { testUserRegex } from "../smalleffects"

function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [developerLogin, setDeveloperLogin] = useState(false)
  const [authKey, setAuthKey] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const navigate = useNavigate()

  async function fetchTestUserData() {
    try {
      const response = await fetch(
        "https://ngraqslff8.execute-api.us-east-2.amazonaws.com/dev/data/test-users/" + username
      )
      const data = await response.json()
      if (data) {
        console.log("Information retrieved successfully")
        return data.item
      }
    } catch (error) {
      console.error("User information not fetched:\n", error)
      return null
    }
  }


  function onSubmit(e) {
    e.preventDefault()

    if (developerLogin) {
      if (testUserRegex.test(username) && authKey === import.meta.env.VITE_AUTH_KEY) login(e)
      else setErrorMessage("Invalid test user credentials")

    } else {
      login(e)
    }
  }


  async function login(event) {
    toggleIsSubmitting()

    try {
      let token = ""

      if (developerLogin) {
        const matchedUser = await fetchTestUserData()
        if (matchedUser) token = matchedUser.authToken
        
      } else {
        const response = await fetch("https://ngraqslff8.execute-api.us-east-2.amazonaws.com/dev/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: username,
            password: password
          })
        })
        
        const data = await response.json()
        token = data.user.authToken
      }

      const user = await chat.login(token)
      setUser(user)
      setIsAuthenticated(true)
      localStorage.setItem("user", JSON.stringify(user))

    } catch (error) {
      setErrorMessage("Login failed. Please try again")
      console.error(error)
      console.log(token)

    } finally {
      toggleIsSubmitting()
    }
  }


  function toggleIsSubmitting() {
    setIsSubmitting(prevState => !prevState)
  }


  if (isAuthenticated) {
    return (
      <Navigate
        to={{
          pathname: "/recentmsgs",
          state: { user: user },
        }}
        replace
      />
    )
  }
  

  return (
    <div className="App" style={{ height: "75vh" }}>
      <h1 style={{ margin: "0.25em 0" }}>YAPPER</h1>
      <p style={{ width: "100%" }}>
        Log in to your account below or create a new account. If you're a developer, log in using a test user ID and a provided authorization key. 
      </p>
      {developerLogin ? (
        <>
          <form className="login-form" onSubmit={onSubmit}>
            <label htmlFor="uid-login">Test user ID</label>
            <input
              onChange={e => setUsername(e.target.value)}
              type="text"
              id="uid-login"
            />

            <label htmlFor="authkey-input">Authentication Key</label>
            <input
              onChange={e => setAuthKey(e.target.value)}
              type="text"
              id="authkey-input"
            />

            <span className="error">{errorMessage}</span>
            {isSubmitting ? (
              <img src={logo} alt="Spinner component" className="App-logo" />
            ) : (
              <button type="submit" disabled={!username || !authKey} value="LOGIN">
                LOGIN
              </button>
            )}
          </form>
          <span className="other-cases" onClick={() => navigate("/register")}>
            Create an account
          </span>
          <span
            className="other-cases"
            onClick={() => setDeveloperLogin(false)}>
            Login as regular user
          </span>
        </>
      ) : (
        <>
          <form className="login-form" onSubmit={onSubmit}>
            <label htmlFor="uid-login">User ID</label>
            <input
              onChange={e => setUsername(e.target.value)}
              type="text"
              name="user_id"
              id="uid-login"
            />

            <label htmlFor="pwd-login">Password</label>
            <input onChange={e => setPassword(e.target.value)} type="password" name="password" id="pwd-login" />

            <span className="error">{errorMessage}</span>
            {isSubmitting ? (
              <img src={logo} alt="Spinner component" className="App-logo" />
            ) : (
              <button type="submit" disabled={!username || !password} value="LOGIN">
                LOGIN
              </button>
            )}
          </form>
          <span className="other-cases" onClick={() => navigate("/register")}>
            Create an account
          </span>
          <span className="other-cases" onClick={() => navigate("/forgot-password")}>
            Forgot password
          </span>
          <span
            className="other-cases"
            onClick={() => setDeveloperLogin(true)}>
            Login with a test user (developers only)
          </span>
        </>
      )}
    </div>
  )
}

export default Login
