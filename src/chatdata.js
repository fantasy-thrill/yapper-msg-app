import { CometChat } from "@cometchat-pro/chat";

export default class CCManager {
  static LISTENER_KEY_MESSAGE = "msglistener";
  static LISTENER_KEY_ACTIVITY = "actvylistener";
  static LISTENER_KEY_CONVERSATION = "convolistener";
  static LISTENER_KEY_TYPING = "typinglistener";
  static LISTENER_KEY_GROUP = "grouplistener";
  static init() {
    const appSetting = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion("US")
      .build();
    return CometChat.init(import.meta.env.VITE_APP_ID, appSetting);
  }
  static createNewUser(name, uid) {
    const user = new CometChat.User(uid)
    user.setName(name)

    CometChat.createUser(user, import.meta.env.VITE_API_KEY)
      .then(
        user => {
          console.log("User created\n", user);
        }, error => {
          console.log("User creation failed:\n", error);
        }
      )
  }
  static getTextMessage(UID, text, msgType) {
    if (msgType === "user") {
      return new CometChat.TextMessage(
        UID,
        text,
        CometChat.RECEIVER_TYPE.USER
      );
    } else {
      return new CometChat.TextMessage(
        UID,
        text,
        CometChat.RECEIVER_TYPE.GROUP
      );
    }
  }
  static getLoggedinUser() {
    return CometChat.getLoggedinUser();
  }
  static login(token) {
    return CometChat.login(token);
  }
  static getGroupMessages(GUID, callback, limit = 30) {
    const messagesRequest = new CometChat.MessagesRequestBuilder()
      .setGUID(GUID)
      .setLimit(limit)
      .build();
    callback();
    return messagesRequest.fetchPrevious();
  }
  static usersRequest() {
    const usersRequest = new CometChat.UsersRequestBuilder()
      .setLimit(10)
      .build()
    return usersRequest.fetchNext()
  }
  static testUsersRequest() {
    const testUsersRequest = new CometChat.UsersRequestBuilder()
      .setLimit(10)
      .setSearchKeyword("super")
      .build()
    return testUsersRequest.fetchNext()
  }
  static messagesRequest(UID, limit) {
    const messagesRequest = new CometChat.MessagesRequestBuilder()
      .setUID(UID)
      .setTimestamp(1680321600000)
      .setLimit(limit)
      .build();
    return messagesRequest.fetchPrevious()
  }
  static conversationsRequest() {
    return new CometChat.ConversationsRequestBuilder()
      .setLimit(30)
      .setConversationType("user")
      .build()
  }
  static sendIndividualMessage(UID, message) {
    const textMessage = this.getTextMessage(UID, message, "user");
    return CometChat.sendMessage(textMessage);
  }
  static sendGroupMessage(GUID, message) {
    const textMessage = this.getTextMessage(GUID, message, "group");
    return CometChat.sendMessage(textMessage);
  }
  static joinGroup(GUID) {
    return CometChat.joinGroup(GUID, CometChat.GROUP_TYPE.PUBLIC, "");
  }
  static getGroupMembers(GUID) {
    return new CometChat.GroupMembersRequestBuilder(GUID).setLimit(100).build()
  }
  static addConvoUpdateListener(callback) {
    CometChat.addMessageListener(
      this.LISTENER_KEY_CONVERSATION,
      new CometChat.MessageListener({
        onTextMessageReceived: textMessage => {
          callback(textMessage);
        }
      })
    );
  }
  static addMessageListener(callback) {
    CometChat.addMessageListener(
      this.LISTENER_KEY_MESSAGE,
      new CometChat.MessageListener({
        onTextMessageReceived: textMessage => {
          callback(textMessage);
        }
      })
    );
  }
  static addTypingListener(stateFunction) {
    CometChat.addMessageListener(
      this.LISTENER_KEY_TYPING,
      new CometChat.MessageListener({
        onTypingStarted: typingIndicator => stateFunction(true),
        onTypingEnded: typingIndicator => stateFunction(false)
      })
    );
  }
  static addActivityListener(firstCallback, secondCallback) {
    CometChat.addMessageListener(
      this.LISTENER_KEY_ACTIVITY,
      new CometChat.MessageListener({
        onMessagesDelivered: messageReceipt => {
          firstCallback(messageReceipt)
        },
        onMessagesRead: messageReceipt => {
          secondCallback(messageReceipt)
        }
      })
    )
  }
  static removeListener() {
    const listenerIDs = [...arguments]
    listenerIDs.forEach(listener => {
      CometChat.removeMessageListener(listener)
    })
  }
  static typingStarted(receiver, type) {
    const typingNotification = new CometChat.TypingIndicator(receiver, type)
    CometChat.startTyping(typingNotification)
    console.log("I'm typing right now")
  }
  static typingStopped(receiver, type) {
    const typingNotification = new CometChat.TypingIndicator(receiver, type)
    CometChat.endTyping(typingNotification)
    console.log("I've stopped typing")
  }
  static eventReceipts(messageID) {
    CometChat.getMessageReceipts(messageID)
      .then(
        receipts => {
          console.log("Message details fetched:", receipts);
        },
        error => {
          console.log("Error in getting message details:", error);
        }
      )
  }
  static markAsDelivered(message) {
    CometChat.markAsDelivered(message)
      .then(
        () => {
          console.log("Message delivered");
        },
        (error) => {
          console.log("Message not delivered: " + error);
        }
      )
  }
  static markAsRead(message) {
    CometChat.markAsRead(message)
      .then(
        () => {
          console.log("Message read");
        },
        (error) => {
          console.log("Message not read: " + error);
        }
      )
  }
  static deleteMessage(messageID) {
    CometChat.deleteMessage(messageID)
      .then(
        message => console.log("Message deleted: ", message),
        error => console.log("Error: Message not deleted: ", error)
      )
  }

  // Function probably no longer needed
  static deleteForMe(UID, messageID) {
    for (const user in deleteMessages) {
      if (UID === user) {
        deleteMessages[user].push(messageID)
        console.log(deleteMessages[user])
      }
    }
  }
  static logout() {
    CometChat.logout()
      .then(() => { console.log("Logout successful") })
      .catch(error => { console.log("Logout failed with error:", error) })
  }
}