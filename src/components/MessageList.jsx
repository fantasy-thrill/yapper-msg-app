import React from "react"
import { useState, useEffect, useRef } from "react"
import chat from "../chatdata.js"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFaceSmile, faCircleCheck } from "@fortawesome/free-solid-svg-icons"
import { faCircle } from "@fortawesome/free-regular-svg-icons"
import {
  displayDateOrTime,
  darkenBackground,
  lightenBackground,
  displayDeleteMenu
} from "../smalleffects.js"
import "@cometchat/uikit-elements"
import MessageBox from "./MessageBox.jsx"

function MessageList({ user, receiver, members, deletedList }) {
  const [receiverID, setReceiverID] = useState(receiver)
  const [textConversation, setTextConversation] = useState([])
  const [contextMenuDisplay, setContextMenuDisplay] = useState("none")
  const [menuCoordinates, setMenuCoordinates] = useState({ x: 0, y: 0 })
  const [selected, setSelected] = useState([])
  const [selectingMultiple, setSelectingMultiple] = useState(false)
  const [iconStates, setIconStates] = useState({})
  const [recTyping, setRecTyping] = useState(false)

  const para = useRef(null)

  const contextMenuStyle = {
    display: contextMenuDisplay,
    backgroundColor: "white",
    width: "150px",
    border: "1px solid gray",
    position: "absolute",
    zIndex: 100,
    top: `${menuCoordinates.y}px`,
    left: `${menuCoordinates.x}px`,
  }

  const msgWrapperStyle = {
    display: "flex",
    alignItems: selectingMultiple ? "center" : ""
  }

  function getConversation() {
    chat.messagesRequest(receiverID, 100).then(
      messages => {
        const cleanList = messages.filter(
          message =>
            !message.hasOwnProperty("action") &&
            !message.hasOwnProperty("deletedAt") &&
            !deletedList.includes(message["id"])
        )
        setTextConversation(cleanList)
        console.log(cleanList)
      },
      error => console.log("Could not load messages: " + error)
    )
  }

  function scrollToBottom() {
    const chatList = document.getElementById("chatList")
    const lastMessage = chatList.lastElementChild
    if (lastMessage) lastMessage.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }

  function handleActivityReceived(msgReceipt, error) {
    if (error) return console.log(`error: ${error}`)
    para.current.style.fontSize = "0.75em"
    para.current.textContent = "Delivered"
    console.log(msgReceipt)

    console.log("listener working")
  }

  function handleActivityRead(msgReceipt, error) {
    if (error) return console.log(`error: ${error}`)
    para.current.style.fontSize = "0.75em"
    para.current.textContent = `Read ${displayDateOrTime(msgReceipt.readAt)}`
    console.log(msgReceipt)
  }

  function handleChatActivity(message, error) {
    if (error) return console.log(`error: ${error}`)
    setTextConversation(prevState => [...prevState, message])
    setRecTyping(false)
    if (message.sender.uid !== user.uid) {
      chat.markAsDelivered(message)
      chat.markAsRead(message)
    }
    console.log("Message received: " + message)
    // scrollToBottom()
  }

  function messageListener() {
    chat.addMessageListener(handleChatActivity)
  }

  function activityListener() {
    chat.addActivityListener(handleActivityReceived, handleActivityRead)
  }

  function typingListener() {
    chat.addTypingListener(setRecTyping)
  }

  function displayReceipt() {
    const lastMessage = textConversation[textConversation.length - 1]
    const hasBeenDelivered = lastMessage.hasOwnProperty("deliveredAt")
    const hasBeenRead = lastMessage.hasOwnProperty("readAt")

    if (lastMessage.sender.uid === user.uid) {
      if (hasBeenDelivered && !hasBeenRead) {
        para.current.textContent = "Delivered"
        para.current.style.fontSize = "0.75em"

      } else if (hasBeenDelivered && hasBeenRead) {
        para.current.textContent =
          "Read " + displayDateOrTime(lastMessage.readAt)
        para.current.style.fontSize = "0.75em"
      }
    }

    console.log("receipt working")
  }

  function displayContextMenu(event, messageID) {
    const parentElement = event.target.closest(".msg")
    setSelected([messageID])

    if (parentElement) {
      event.preventDefault()
      const { clientX, clientY } = event
      darkenBackground(parentElement)
      parentElement.classList.add("selected")
      const spaceOnRight = window.innerWidth - clientX
      const spaceOnLeft = clientX - 150

      setMenuCoordinates({
        x: spaceOnRight < 150 ? spaceOnLeft : clientX,
        y: clientY,
      })
      setContextMenuDisplay("block")
    }
  }

  function removeContextMenu(event) {
    const messages = document.querySelectorAll(".msg")
    for (const message of messages) {
      if (message.classList.contains("selected")) {
        lightenBackground(message)
        message.classList.remove("selected")
      }
    }
    setContextMenuDisplay("none")
  }

  async function updateData() {
    try {
      const response = await fetch(
        `http://localhost:5174/update/${user.uid}/${user.authToken}/${selected}`,
        { method: "PUT" }
      )
      const resDetails = await response.json()
      console.log(resDetails)
      if (resDetails["acknowledged"]) console.log("Deleted messages updated successfully")
    } catch (error) {
      console.error(`No update was made: \"${error}\"`)
    }
  }

  function deleteMessage(forEveryone) {
    const messageToDelete = textConversation.find(message => message.id === selected)
    const updatedConvo = textConversation.toSpliced(textConversation.indexOf(messageToDelete), 1)
    forEveryone ? chat.deleteMessage(selected) : updateData()
    setTextConversation(updatedConvo)
  }

  function toggleIcons(msgid) {
    setIconStates(prevState => ({
      ...prevState,
      [msgid]: prevState[msgid] === faCircle ? faCircleCheck : faCircle
    }))
    console.log("clicked, ", iconStates[msgid])
  }

  useEffect(() => {
    if (user && receiverID) {
      getConversation()
    }
  }, [user, receiverID])

  useEffect(() => {
    if (user) {
      messageListener()
      activityListener()
      typingListener()
    }
  }, [user])

  useEffect(() => {
    if (textConversation.length > 0) {
      scrollToBottom()
      displayReceipt()
      textConversation.forEach(msg => {
        setIconStates(prevState => ({ ...prevState, [msg.id]: faCircle }))
      })
    }
  }, [textConversation])

  return (
    <div className="chatWindow" onClick={removeContextMenu}>
      <div id="receiverSelection">
        <label htmlFor="members">Send to: </label>
        <select
          name="members"
          id="members"
          value={receiverID}
          onChange={event => {
            setReceiverID(event.target.value)
          }}>
          <option value="">Select receipient</option>
          {members.map(member => (
            <option value={member.name} key={member.key}>
              {member.name}
            </option>
          ))}
        </select>
      </div>
      <button 
        id="cancel-deletion"
        style={{ display: selectingMultiple ? "block" : "none" }}
        onClick={() => setSelectingMultiple(false)}>
          Cancel
      </button>
      <ul className="chat" id="chatList">
        {textConversation.map(message => {
          let icon = iconStates[message.id] || faCircle

          return user.uid === message.sender.uid ? (
            <div 
              key={message.id} 
              id={message.id}
              style={{ 
                ...msgWrapperStyle, 
                justifyContent: selectingMultiple ? "space-between" : "end" 
              }}>

              <FontAwesomeIcon
                icon={icon}
                style={{ 
                  display: selectingMultiple ? "block" : "none", 
                  color: "#187dbc" 
                }}
                size="sm"
                onClick={() => {
                  toggleIcons(message.id)
                  setSelected(prevState => {
                    if (prevState.includes(message.id)) return prevState.filter(msgid => msgid !== message.id)
                    else return [...prevState, message.id]
                  })
                }}
              />
              <li className="self">
                <div
                  className="msg"
                  onContextMenu={event =>
                    displayContextMenu(event, message.id)
                  }>
                  <div className="message">{message.text}</div>
                </div>
                {textConversation.indexOf(message) ===
                textConversation.length - 1 ? (
                  <p ref={para}></p>
                ) : (
                  ""
                )}
              </li>
            </div>
          ) : (
            <div 
              key={message.id} 
              id={message.id}
              style={{ 
                ...msgWrapperStyle, 
                // justifyContent: selectingMultiple ? "start" : "" 
              }}>

              <FontAwesomeIcon
                icon={icon}
                style={{ display: selectingMultiple ? "block" : "none" }}
                size="sm"
                onClick={() => {
                  toggleIcons(message.id)
                  setSelected(prevState => ([...prevState, message.id]))
                }}
              />
              <li className="other">
                <div
                  className="msg"
                  onContextMenu={event =>
                    displayContextMenu(event, message.id)
                  }>
                  <div className="message">{message.text}</div>
                </div>
              </li>
            </div>
          )
        })}
      </ul>
      {recTyping && <p>{receiverID} is typing...</p>}
      <MessageBox receiver={receiverID} setTextConversation={setTextConversation} />
      {contextMenuDisplay === "block" && (
        <div id="context-menu" style={contextMenuStyle}>
          <div
            className="menu-choice"
            onClick={() => {
              const messageToDelete = textConversation.find(
                message => message.id === selected[0]
              )
              if (messageToDelete.sender.uid !== user.uid) {
                deleteMessage(false)
              } else {
                displayDeleteMenu("block")
              }
            }}>
            Delete message
          </div>
          <div 
            className="menu-choice" 
            onClick={() => { 
              setSelectingMultiple(true)
            }}> 
            Delete multiple
          </div>
        </div>
      )}
      <div id="delete-menu">
        Do you want to delete messages only for you or for everyone in the
        conversation?
        <div
          className="d-menu-choice"
          onClick={() => {
            deleteMessage(false)
            displayDeleteMenu("none")
          }}>
          Delete for me
        </div>
        <div
          className="d-menu-choice"
          onClick={() => {
            deleteMessage(true)
            displayDeleteMenu("none")
          }}>
          Delete for everyone
        </div>
        <div
          className="d-menu-choice"
          onClick={() => displayDeleteMenu("none")}>
          Cancel
        </div>
      </div>
    </div>
  )
}

export default MessageList
