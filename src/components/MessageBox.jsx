import React from "react"
import { useState, useRef } from "react"
import chat from "../chatdata.js"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFaceSmile } from "@fortawesome/free-solid-svg-icons"
import "@cometchat/uikit-elements"

function MessageBox({ receiver, setTextConversation }) {
  const [messageText, setMessageText] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const emojiKeyboardRef = useRef(null)

  const emojiKeyboardStyle = {
    height: "250px",
    display: "none",
  }

  function handleSubmit(event) {
    event.preventDefault()
    sendTextMessage(receiver)
    event.target.reset()
  }

  function handleChange(event) {
    setMessageText(event.target.value)
    const emojiKeyboard = emojiKeyboardRef.current
    emojiKeyboard.addEventListener("cc-emoji-clicked", e => {
      setMessageText(event.target.value + e.detail.id)
    })
  }

  function handleTypingStatus(event) {
    if (event.key !== "Backspace" && !isTyping) {
      chat.typingStarted(receiver, "user")
      setIsTyping(true)
    } else if (event.key === "Backspace" && isTyping) {
      chat.typingStopped(receiver, "user")
      setIsTyping(false)
    }
  }

  function displayEmojiKeyboard() {
    const keyboard = emojiKeyboardRef.current
    keyboard.classList.toggle("displayed")
  }

  function sendTextMessage(receipient) {
    chat.sendIndividualMessage(receipient, messageText).then(
      message => {
        console.log("Message sent successfully:", message)
        setTextConversation(prevState => [...prevState, message])
        setMessageText("")
      },
      error => {
        if (error.code === "ERR_NOT_A_MEMBER") {
          chat.joinGroup(GUID).then(response => {
            sendMessage()
          })
        } else {
          console.log("Message not sent. Button doesn't work.\n" + error.code)
        }
      }
    )
  }

  return (
    <div className="chatInputWrapper">
      <cometchat-emoji-keyboard
        style={emojiKeyboardStyle}
        ref={emojiKeyboardRef}></cometchat-emoji-keyboard>
      <form onSubmit={handleSubmit}>
        <FontAwesomeIcon
          icon={faFaceSmile}
          size="xl"
          style={{ margin: "auto 0.75em", color: "#187dbc" }}
          onClick={displayEmojiKeyboard}
        />
        <input
          className="textarea input"
          type="text"
          placeholder="Enter your message..."
          value={messageText}
          onChange={handleChange}
          onKeyDown={handleTypingStatus}
        />
        <button type="submit" id="sendButton">
          Send
        </button>
      </form>
    </div>
  )
}

export default MessageBox