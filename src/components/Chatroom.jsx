import React from "react"
import { useState, useEffect, useMemo } from "react"
import { Navigate, useNavigate, useLocation } from "react-router-dom"
import chat from "../chatdata.js"
import { testUserRegex } from "../smalleffects.js"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faArrowLeft,
  faRightToBracket,
} from "@fortawesome/free-solid-svg-icons"
import "@cometchat/uikit-elements"
import MessageList from "./MessageList.jsx"

function useQuery() {
  const { search } = useLocation()
  return React.useMemo(() => new URLSearchParams(search), [search])
}

function Chatroom() {
  const query = useQuery()

  const [memberList, setMemberList] = useState([])
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [deletedMessages, setDeletedMessages] = useState([])

  let receiverID = useState(query.get("receipient") ?? "")[0]
  const navigate = useNavigate()

  // Unused function
  function sendMessageToGroup() {
    chat.sendGroupMessage(GUID, messageText).then(
      message => {
        console.log("Message sent successfully:", message)
        setMessageText("")
      },
      error => {
        if (error.code === "ERR_NOT_A_MEMBER") {
          chat.joinGroup(GUID).then(response => {
            sendMessage()
          })
        } else {
          console.log("Message not sent. Button doesn't work. " + error.code)
        }
      }
    )
  }

  function getUser() {
    chat
      .getLoggedinUser()
      .then(user => {
        console.log("user details:", { user })
        setUser(user)
      })
      .catch(({ error }) => {
        if (error.code === "USER_NOT_LOGGED_IN") {
          setIsAuthenticated(false)
        }
      })
  }

  function getUserList() {
    let request = testUserRegex.test(user.uid)
      ? chat.testUsersRequest()
      : chat.usersRequest()

    request.then(
      groupMembers => {
        const userFilter = member => {
          const firstFilter = !testUserRegex.test(member["uid"])
          const secondFilter = member["uid"] !== user["uid"]
          return testUserRegex.test(user.uid) 
            ? secondFilter
            : firstFilter && secondFilter 
        }
        const groupMemberNames = groupMembers
          .map((member, index) => ({
            name: member["uid"],
            key: "00" + (index + 1),
          }))
          .filter(userFilter)
        setMemberList(groupMemberNames)
        console.log(groupMemberNames)
        console.log(user["uid"])
      },
      error => {
        console.log("Error fetching group members:", error)
      }
    )
  }

  function backToConversationList() {
    navigate("/recentmsgs")
    chat.removeListener(
      chat.LISTENER_KEY_MESSAGE,
      chat.LISTENER_KEY_ACTIVITY,
      chat.LISTENER_KEY_TYPING
    )
  }

  function logout() {
    chat.logout()
    localStorage.removeItem("user")
    chat.removeListener(
      chat.LISTENER_KEY_MESSAGE,
      chat.LISTENER_KEY_ACTIVITY,
      chat.LISTENER_KEY_TYPING
    )
    navigate("/login")
  }

  useEffect(() => {
    getUser()
    // chat.joinGroup(GUID)
  }, [])

  useEffect(() => {
    if (user) {
      async function fetchData() {
        try {
          const url = testUserRegex.test(user.uid) ? 
            "https://localhost:5174/data/test" : 
            "https://localhost:5174/data/users"
            
          const response = await fetch(url)
          const userInfo = await response.json()
          if (userInfo) {
            const currentUser = userInfo.find(u => u.uid === user.uid)
            if (currentUser && currentUser.deletedMsgs) { 
              setDeletedMessages(currentUser.deletedMsgs)
            }
          }
        } catch (error) {
          console.error("Data not fetched: " + error)
        }
      }
      fetchData()
      getUserList()
    }
  }, [user])

  useEffect(() => {
    if (deletedMessages) console.log(deletedMessages)
  }, [deletedMessages])

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div id="page">
      <div id="overlay"></div>
      <div className="navigation-chat">
        <button className="nav-btn" onClick={backToConversationList}>
          <FontAwesomeIcon
            icon={faArrowLeft}
            size="lg"
            className="icon-spacing"
          />
          Back
        </button>
        <button className="nav-btn" onClick={logout}>
          <FontAwesomeIcon
            icon={faRightToBracket}
            size="lg"
            className="icon-spacing"
          />
          Logout
        </button>
      </div>
      <MessageList
        user={user}
        receiver={receiverID}
        members={memberList}
        deletedList={deletedMessages}
      />
    </div>
  )
}

export default Chatroom
